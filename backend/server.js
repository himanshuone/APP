const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const csv = require('csv-parser');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const morgan = require('morgan');
const { body, validationResult } = require('express-validator');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8001;

// Middleware
app.use(helmet());
app.use(compression());
app.use(morgan('combined'));
app.use(cors({
  origin: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : '*',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// MongoDB connection
const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017/gate_exam';
const DB_NAME = process.env.DB_NAME || 'gate_exam';

mongoose.connect(MONGO_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  dbName: DB_NAME
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB');
});

// Enums
const QuestionType = {
  MCQ: 'MCQ',
  MSQ: 'MSQ',
  NAT: 'NAT'
};

const UserRole = {
  STUDENT: 'student',
  ADMIN: 'admin'
};

const QuestionStatus = {
  NOT_VISITED: 'not_visited',
  NOT_ANSWERED: 'not_answered',
  ANSWERED: 'answered',
  MARKED: 'marked',
  MARKED_ANSWERED: 'marked_answered'
};

// Mongoose Schemas
const userSchema = new mongoose.Schema({
  id: { type: String, default: () => require('crypto').randomUUID() },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  full_name: { type: String, required: true },
  role: { type: String, enum: Object.values(UserRole), default: UserRole.STUDENT },
  created_at: { type: Date, default: Date.now },
  is_active: { type: Boolean, default: true }
});

const questionOptionSchema = new mongoose.Schema({
  id: { type: String, default: () => require('crypto').randomUUID() },
  text: { type: String, required: true },
  is_correct: { type: Boolean, default: false }
});

const questionSchema = new mongoose.Schema({
  id: { type: String, default: () => require('crypto').randomUUID() },
  question_text: { type: String, required: true },
  question_type: { type: String, enum: Object.values(QuestionType), required: true },
  subject: { type: String, required: true },
  topic: { type: String, required: true },
  difficulty: { type: String, default: 'medium' },
  marks: { type: Number, default: 1.0 },
  negative_marks: { type: Number, default: 0.33 },
  options: [questionOptionSchema],
  correct_answer: mongoose.Schema.Types.Mixed,
  explanation: String,
  created_at: { type: Date, default: Date.now },
  created_by: { type: String, required: true }
});

const examConfigSchema = new mongoose.Schema({
  id: { type: String, default: () => require('crypto').randomUUID() },
  name: { type: String, required: true },
  description: { type: String, required: true },
  duration_minutes: { type: Number, default: 180 },
  total_questions: { type: Number, required: true },
  subjects: [String],
  randomize_questions: { type: Boolean, default: true },
  created_by: { type: String, required: true },
  created_at: { type: Date, default: Date.now }
});

const examSessionSchema = new mongoose.Schema({
  id: { type: String, default: () => require('crypto').randomUUID() },
  user_id: { type: String, required: true },
  exam_config_id: { type: String, required: true },
  questions: [String],
  answers: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} },
  question_status: { type: Map, of: String, default: {} },
  start_time: { type: Date, default: Date.now },
  end_time: Date,
  submitted: { type: Boolean, default: false },
  current_question: { type: Number, default: 0 }
});

const examResultSchema = new mongoose.Schema({
  id: { type: String, default: () => require('crypto').randomUUID() },
  user_id: { type: String, required: true },
  exam_session_id: { type: String, required: true },
  total_questions: { type: Number, required: true },
  attempted: { type: Number, required: true },
  correct: { type: Number, required: true },
  incorrect: { type: Number, required: true },
  score: { type: Number, required: true },
  percentage: { type: Number, required: true },
  subject_wise_score: { type: Map, of: mongoose.Schema.Types.Mixed },
  time_taken_minutes: { type: Number, required: true },
  submitted_at: { type: Date, default: Date.now }
});

// Models
const User = mongoose.model('User', userSchema);
const Question = mongoose.model('Question', questionSchema);
const ExamConfig = mongoose.model('ExamConfig', examConfigSchema);
const ExamSession = mongoose.model('ExamSession', examSessionSchema);
const ExamResult = mongoose.model('ExamResult', examResultSchema);

// JWT configuration
const SECRET_KEY = process.env.SECRET_KEY || 'your-secret-key-change-this';
const ACCESS_TOKEN_EXPIRE_MINUTES = 30;

// Helper functions
const hashPassword = async (password) => {
  return await bcrypt.hash(password, 12);
};

const verifyPassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

const createAccessToken = (data) => {
  return jwt.sign(data, SECRET_KEY, { 
    expiresIn: `${ACCESS_TOKEN_EXPIRE_MINUTES}m` 
  });
};

// Authentication middleware
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ detail: 'Could not validate credentials' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, SECRET_KEY);
    
    const user = await User.findOne({ email: decoded.sub });
    if (!user) {
      return res.status(401).json({ detail: 'Could not validate credentials' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ detail: 'Could not validate credentials' });
  }
};

// Admin middleware
const requireAdmin = (req, res, next) => {
  if (req.user.role !== UserRole.ADMIN) {
    return res.status(403).json({ detail: 'Not enough permissions' });
  }
  next();
};

// File upload configuration
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ detail: errors.array()[0].msg });
  }
  next();
};

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'GATE Exam Simulator API - Node.js/Express' });
});

// Auth Routes
app.post('/api/auth/register', [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('full_name').notEmpty().withMessage('Full name is required'),
  body('role').optional().isIn(Object.values(UserRole)).withMessage('Invalid role')
], handleValidationErrors, async (req, res) => {
  try {
    const { email, password, full_name, role = UserRole.STUDENT } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ detail: 'Email already registered' });
    }

    // Create user
    const hashedPassword = await hashPassword(password);
    const user = new User({
      email,
      password: hashedPassword,
      full_name,
      role
    });

    await user.save();

    // Return user without password
    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse._id;
    delete userResponse.__v;

    res.status(201).json(userResponse);
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ detail: 'Registration failed' });
  }
});

app.post('/api/auth/login', [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
], handleValidationErrors, async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user || !(await verifyPassword(password, user.password))) {
      return res.status(401).json({ detail: 'Incorrect email or password' });
    }

    const accessToken = createAccessToken({ sub: user.email });
    res.json({ access_token: accessToken, token_type: 'bearer' });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ detail: 'Login failed' });
  }
});

app.get('/api/auth/me', authenticate, (req, res) => {
  const userResponse = req.user.toObject();
  delete userResponse.password;
  delete userResponse._id;
  delete userResponse.__v;
  res.json(userResponse);
});

// Question Management Routes
app.post('/api/admin/questions', authenticate, requireAdmin, [
  body('question_text').notEmpty().withMessage('Question text is required'),
  body('question_type').isIn(Object.values(QuestionType)).withMessage('Invalid question type'),
  body('subject').notEmpty().withMessage('Subject is required'),
  body('topic').notEmpty().withMessage('Topic is required')
], handleValidationErrors, async (req, res) => {
  try {
    const questionData = { ...req.body, created_by: req.user.id };
    const question = new Question(questionData);
    await question.save();

    const questionResponse = question.toObject();
    delete questionResponse._id;
    delete questionResponse.__v;

    res.status(201).json(questionResponse);
  } catch (error) {
    console.error('Create question error:', error);
    res.status(500).json({ detail: 'Failed to create question' });
  }
});

app.get('/api/admin/questions', authenticate, requireAdmin, async (req, res) => {
  try {
    const { skip = 0, limit = 100, subject } = req.query;
    const query = subject ? { subject } : {};

    const questions = await Question.find(query)
      .skip(parseInt(skip))
      .limit(parseInt(limit))
      .select('-_id -__v');

    res.json(questions);
  } catch (error) {
    console.error('Get questions error:', error);
    res.status(500).json({ detail: 'Failed to fetch questions' });
  }
});

app.delete('/api/admin/questions/:questionId', authenticate, requireAdmin, async (req, res) => {
  try {
    const { questionId } = req.params;
    const result = await Question.deleteOne({ id: questionId });

    if (result.deletedCount === 0) {
      return res.status(404).json({ detail: 'Question not found' });
    }

    res.json({ message: 'Question deleted successfully' });
  } catch (error) {
    console.error('Delete question error:', error);
    res.status(500).json({ detail: 'Failed to delete question' });
  }
});

// File Upload Routes
app.post('/api/admin/upload/csv', authenticate, requireAdmin, upload.single('file'), async (req, res) => {
  try {
    if (!req.file || !req.file.originalname.endsWith('.csv')) {
      return res.status(400).json({ detail: 'File must be a CSV' });
    }

    const csvData = req.file.buffer.toString('utf-8');
    const results = [];
    const errors = [];
    let questionsAdded = 0;

    // Parse CSV
    const rows = csvData.split('\n').map(row => row.split(','));
    const headers = rows[0].map(h => h.trim());
    
    for (let i = 1; i < rows.length; i++) {
      if (rows[i].length < headers.length) continue;
      
      try {
        const row = {};
        headers.forEach((header, index) => {
          row[header] = rows[i][index] ? rows[i][index].trim() : '';
        });

        if (!row.question_text) continue;

        // Parse question type
        const questionType = (row.type || 'MCQ').toUpperCase();
        if (!Object.values(QuestionType).includes(questionType)) {
          throw new Error(`Invalid question type: ${questionType}`);
        }

        // Parse options for MCQ/MSQ
        const options = [];
        if ([QuestionType.MCQ, QuestionType.MSQ].includes(questionType)) {
          for (let j = 1; j <= 4; j++) {
            const optionText = row[`option_${j}`];
            if (optionText) {
              const isCorrect = ['true', '1', 'yes'].includes(
                (row[`option_${j}_correct`] || '').toLowerCase()
              );
              options.push({
                text: optionText,
                is_correct: isCorrect
              });
            }
          }
        }

        // Create question
        const questionData = {
          question_text: row.question_text,
          question_type: questionType,
          subject: row.subject || 'General',
          topic: row.topic || 'General',
          difficulty: row.difficulty || 'medium',
          marks: parseFloat(row.marks || 1.0),
          negative_marks: parseFloat(row.negative_marks || 0.33),
          options,
          correct_answer: row.correct_answer,
          explanation: row.explanation,
          created_by: req.user.id
        };

        const question = new Question(questionData);
        await question.save();
        questionsAdded++;

      } catch (error) {
        errors.push(`Row ${i + 1}: ${error.message}`);
      }
    }

    res.json({
      message: `Successfully added ${questionsAdded} questions`,
      errors: errors.length > 0 ? errors : null
    });

  } catch (error) {
    console.error('CSV upload error:', error);
    res.status(500).json({ detail: 'Failed to process CSV file' });
  }
});

app.post('/api/admin/upload/pdf', authenticate, requireAdmin, upload.single('file'), async (req, res) => {
  try {
    if (!req.file || !req.file.originalname.endsWith('.pdf')) {
      return res.status(400).json({ detail: 'File must be a PDF' });
    }

    const pdfData = await pdfParse(req.file.buffer);
    const extractedText = pdfData.text;

    res.json({
      message: 'PDF text extracted successfully',
      extracted_text: extractedText.length > 1000 
        ? extractedText.substring(0, 1000) + '...' 
        : extractedText,
      note: 'PDF parsing requires manual review. Please format as CSV for automatic import.'
    });

  } catch (error) {
    console.error('PDF upload error:', error);
    res.status(400).json({ detail: `Error processing PDF: ${error.message}` });
  }
});

// Exam Configuration Routes
app.post('/api/admin/exams', authenticate, requireAdmin, [
  body('name').notEmpty().withMessage('Exam name is required'),
  body('description').notEmpty().withMessage('Exam description is required'),
  body('total_questions').isInt({ min: 1 }).withMessage('Total questions must be a positive integer'),
  body('subjects').isArray({ min: 1 }).withMessage('At least one subject is required')
], handleValidationErrors, async (req, res) => {
  try {
    const examData = { ...req.body, created_by: req.user.id };
    const exam = new ExamConfig(examData);
    await exam.save();

    const examResponse = exam.toObject();
    delete examResponse._id;
    delete examResponse.__v;

    res.status(201).json(examResponse);
  } catch (error) {
    console.error('Create exam error:', error);
    res.status(500).json({ detail: 'Failed to create exam configuration' });
  }
});

app.get('/api/admin/exams', authenticate, requireAdmin, async (req, res) => {
  try {
    const exams = await ExamConfig.find().select('-_id -__v');
    res.json(exams);
  } catch (error) {
    console.error('Get exams error:', error);
    res.status(500).json({ detail: 'Failed to fetch exam configurations' });
  }
});

// Student Exam Routes
app.get('/api/exams', authenticate, async (req, res) => {
  try {
    const exams = await ExamConfig.find().select('-_id -__v');
    res.json(exams);
  } catch (error) {
    console.error('Get available exams error:', error);
    res.status(500).json({ detail: 'Failed to fetch available exams' });
  }
});

app.post('/api/exam/start/:examConfigId', authenticate, async (req, res) => {
  try {
    const { examConfigId } = req.params;

    // Get exam config
    const examConfig = await ExamConfig.findOne({ id: examConfigId });
    if (!examConfig) {
      return res.status(404).json({ detail: 'Exam configuration not found' });
    }

    // Check if user already has an active session
    const existingSession = await ExamSession.findOne({
      user_id: req.user.id,
      exam_config_id: examConfigId,
      submitted: false
    });

    if (existingSession) {
      const sessionResponse = existingSession.toObject();
      delete sessionResponse._id;
      delete sessionResponse.__v;
      return res.json(sessionResponse);
    }

    // Get questions based on subjects
    const allQuestions = await Question.find({ 
      subject: { $in: examConfig.subjects } 
    });

    if (allQuestions.length < examConfig.total_questions) {
      return res.status(400).json({ 
        detail: 'Not enough questions available for this exam' 
      });
    }

    // Select and randomize questions if needed
    let selectedQuestions = allQuestions;
    if (examConfig.randomize_questions) {
      selectedQuestions = allQuestions
        .sort(() => Math.random() - 0.5)
        .slice(0, examConfig.total_questions);
    } else {
      selectedQuestions = allQuestions.slice(0, examConfig.total_questions);
    }

    const questionIds = selectedQuestions.map(q => q.id);

    // Initialize question status
    const questionStatus = new Map();
    questionIds.forEach(qid => {
      questionStatus.set(qid, QuestionStatus.NOT_VISITED);
    });
    questionStatus.set(questionIds[0], QuestionStatus.NOT_ANSWERED);

    // Create exam session
    const session = new ExamSession({
      user_id: req.user.id,
      exam_config_id: examConfigId,
      questions: questionIds,
      question_status: questionStatus
    });

    await session.save();

    const sessionResponse = session.toObject();
    delete sessionResponse._id;
    delete sessionResponse.__v;

    res.status(201).json(sessionResponse);
  } catch (error) {
    console.error('Start exam error:', error);
    res.status(500).json({ detail: 'Failed to start exam' });
  }
});

app.get('/api/exam/session/:sessionId', authenticate, async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await ExamSession.findOne({
      id: sessionId,
      user_id: req.user.id
    });

    if (!session) {
      return res.status(404).json({ detail: 'Exam session not found' });
    }

    const sessionResponse = session.toObject();
    delete sessionResponse._id;
    delete sessionResponse.__v;

    res.json(sessionResponse);
  } catch (error) {
    console.error('Get exam session error:', error);
    res.status(500).json({ detail: 'Failed to fetch exam session' });
  }
});

app.get('/api/exam/question/:sessionId/:questionIndex', authenticate, async (req, res) => {
  try {
    const { sessionId, questionIndex } = req.params;
    const index = parseInt(questionIndex);

    const session = await ExamSession.findOne({
      id: sessionId,
      user_id: req.user.id
    });

    if (!session || session.submitted) {
      return res.status(404).json({ 
        detail: 'Exam session not found or already submitted' 
      });
    }

    if (index >= session.questions.length) {
      return res.status(400).json({ detail: 'Invalid question index' });
    }

    const questionId = session.questions[index];
    const question = await Question.findOne({ id: questionId });

    if (!question) {
      return res.status(404).json({ detail: 'Question not found' });
    }

    // Update current question and visited status
    session.current_question = index;
    session.question_status.set(questionId, QuestionStatus.NOT_ANSWERED);
    await session.save();

    // Remove correct answers and is_correct from response for students
    const questionResponse = question.toObject();
    delete questionResponse._id;
    delete questionResponse.__v;
    delete questionResponse.correct_answer;

    if (questionResponse.options) {
      questionResponse.options.forEach(option => {
        delete option.is_correct;
      });
    }

    res.json({
      question: questionResponse,
      question_number: index + 1,
      total_questions: session.questions.length,
      current_answer: session.answers.get(questionId)
    });
  } catch (error) {
    console.error('Get exam question error:', error);
    res.status(500).json({ detail: 'Failed to fetch question' });
  }
});

app.post('/api/exam/answer/:sessionId', authenticate, [
  body('question_id').notEmpty().withMessage('Question ID is required'),
  body('answer').notEmpty().withMessage('Answer is required'),
  body('status').optional().isIn(Object.values(QuestionStatus))
], handleValidationErrors, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { question_id, answer, status = QuestionStatus.ANSWERED } = req.body;

    const session = await ExamSession.findOne({
      id: sessionId,
      user_id: req.user.id
    });

    if (!session || session.submitted) {
      return res.status(404).json({ 
        detail: 'Exam session not found or already submitted' 
      });
    }

    // Update answer and status
    session.answers.set(question_id, answer);
    session.question_status.set(question_id, status);
    await session.save();

    res.json({ message: 'Answer saved successfully' });
  } catch (error) {
    console.error('Submit answer error:', error);
    res.status(500).json({ detail: 'Failed to save answer' });
  }
});

app.post('/api/exam/submit/:sessionId', authenticate, async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await ExamSession.findOne({
      id: sessionId,
      user_id: req.user.id
    });

    if (!session) {
      return res.status(404).json({ detail: 'Exam session not found' });
    }

    if (session.submitted) {
      // Return existing result
      const existingResult = await ExamResult.findOne({ 
        exam_session_id: sessionId 
      }).select('-_id -__v');
      
      if (existingResult) {
        return res.json(existingResult);
      }
    }

    // Calculate results
    const totalQuestions = session.questions.length;
    const answeredStatuses = [QuestionStatus.ANSWERED, QuestionStatus.MARKED_ANSWERED];
    const attempted = Array.from(session.question_status.values())
      .filter(status => answeredStatuses.includes(status)).length;

    let correct = 0;
    let incorrect = 0;
    const subjectWiseScore = new Map();
    let totalScore = 0;

    for (const questionId of session.questions) {
      const question = await Question.findOne({ id: questionId });
      if (!question) continue;

      const subject = question.subject;
      if (!subjectWiseScore.has(subject)) {
        subjectWiseScore.set(subject, { correct: 0, attempted: 0, total: 0 });
      }

      const subjectStats = subjectWiseScore.get(subject);
      subjectStats.total += 1;

      if (session.answers.has(questionId)) {
        subjectStats.attempted += 1;
        const userAnswer = session.answers.get(questionId);

        // Check if answer is correct based on question type
        let isCorrect = false;
        if (question.question_type === QuestionType.MCQ) {
          const correctOptions = question.options
            .filter(opt => opt.is_correct)
            .map(opt => opt.id);
          isCorrect = correctOptions.includes(userAnswer);
        } else if (question.question_type === QuestionType.MSQ) {
          const correctOptions = new Set(
            question.options
              .filter(opt => opt.is_correct)
              .map(opt => opt.id)
          );
          const userOptions = new Set(Array.isArray(userAnswer) ? userAnswer : [userAnswer]);
          isCorrect = correctOptions.size === userOptions.size &&
            [...correctOptions].every(opt => userOptions.has(opt));
        } else if (question.question_type === QuestionType.NAT) {
          try {
            isCorrect = parseFloat(userAnswer) === parseFloat(question.correct_answer);
          } catch {
            isCorrect = false;
          }
        }

        if (isCorrect) {
          correct++;
          subjectStats.correct++;
          totalScore += question.marks;
        } else {
          incorrect++;
          totalScore -= question.negative_marks;
        }

        subjectWiseScore.set(subject, subjectStats);
      }
    }

    // Calculate time taken
    const startTime = new Date(session.start_time);
    const endTime = new Date();
    const timeTakenMinutes = Math.floor((endTime - startTime) / (1000 * 60));

    // Create result
    const result = new ExamResult({
      user_id: req.user.id,
      exam_session_id: sessionId,
      total_questions: totalQuestions,
      attempted,
      correct,
      incorrect,
      score: Math.max(0, totalScore),
      percentage: totalQuestions > 0 ? (correct / totalQuestions) * 100 : 0,
      subject_wise_score: subjectWiseScore,
      time_taken_minutes: timeTakenMinutes
    });

    // Mark session as submitted
    session.submitted = true;
    session.end_time = endTime;
    await session.save();

    // Save result
    await result.save();

    const resultResponse = result.toObject();
    delete resultResponse._id;
    delete resultResponse.__v;

    res.json(resultResponse);
  } catch (error) {
    console.error('Submit exam error:', error);
    res.status(500).json({ detail: 'Failed to submit exam' });
  }
});

app.get('/api/results/:sessionId', authenticate, async (req, res) => {
  try {
    const { sessionId } = req.params;

    const result = await ExamResult.findOne({
      exam_session_id: sessionId,
      user_id: req.user.id
    }).select('-_id -__v');

    if (!result) {
      return res.status(404).json({ detail: 'Result not found' });
    }

    res.json(result);
  } catch (error) {
    console.error('Get exam result error:', error);
    res.status(500).json({ detail: 'Failed to fetch result' });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ 
    detail: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ detail: 'Route not found' });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 GATE Exam Simulator API running on port ${PORT}`);
  console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🗄️  Database: ${MONGO_URL}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  mongoose.connection.close(() => {
    console.log('MongoDB connection closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  mongoose.connection.close(() => {
    console.log('MongoDB connection closed');
    process.exit(0);
  });
});

module.exports = app;