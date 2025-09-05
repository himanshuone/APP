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
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

// Load Gemini service after environment variables
const geminiService = require('./services/geminiService');

// Email service configuration
const createEmailTransporter = () => {
  if (!process.env.EMAIL_USER || process.env.EMAIL_USER === 'your-email@gmail.com') {
    console.log('⚠️  Email service not configured - emails will be simulated');
    return null;
  }
  
  return nodemailer.createTransporter({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

const emailTransporter = createEmailTransporter();

// Email templates
const createQuestionShareEmail = (senderName, questionTitle, questionLink, viewLink) => {
  return {
    subject: `${senderName} shared a GATE exam question with you`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
        <div style="background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h2 style="color: #059669; margin-bottom: 20px;">📚 Question Shared with You!</h2>
          
          <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
            <strong>${senderName}</strong> has shared a GATE exam question with you from the GATE Exam Simulator.
          </p>
          
          <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; border-left: 4px solid #059669; margin: 20px 0;">
            <h3 style="color: #065f46; margin: 0 0 10px 0;">Question Preview:</h3>
            <p style="color: #047857; font-weight: 500; margin: 0;">${questionTitle}</p>
          </div>
          
          <div style="margin: 30px 0;">
            <a href="${viewLink}" style="display: inline-block; background: #059669; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500; margin-right: 10px;">🔍 View Question</a>
            <a href="${questionLink}" style="display: inline-block; background: #0f766e; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500;">📝 Practice on Platform</a>
          </div>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          
          <p style="color: #6b7280; font-size: 14px; margin: 0;">
            📱 <strong>GATE Exam Simulator</strong> - Prepare for your GATE exam with AI-powered questions and practice tests.<br>
            This email was sent because someone shared a question with your email address.
          </p>
        </div>
      </div>
    `,
    text: `${senderName} shared a GATE exam question with you!\n\nQuestion: ${questionTitle}\n\nView the question: ${viewLink}\n\nPractice on platform: ${questionLink}\n\nGATE Exam Simulator - Prepare for your GATE exam with AI-powered questions.`
  };
};

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

// Rate limiting - More permissive for exam functionality
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 200, // limit each IP to 200 requests per minute
  message: { detail: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/', limiter);

// MongoDB connection with modern configuration
const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017/gate_exam';
const DB_NAME = process.env.DB_NAME || 'gate_exam';

// Enhanced MongoDB connection
mongoose.connect(MONGO_URL, {
  dbName: DB_NAME,
  serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
  socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
  bufferCommands: false // Disable buffering if connection is down
});

const db = mongoose.connection;

// Enhanced error handling
db.on('error', (error) => {
  console.error('MongoDB connection error:', error);
});

db.once('open', () => {
  console.log('✅ Connected to MongoDB successfully');
  console.log(`📊 Database: ${DB_NAME}`);
  console.log(`🔗 Connection: ${MONGO_URL}`);
});

db.on('disconnected', () => {
  console.warn('⚠️  MongoDB disconnected');
});

db.on('reconnected', () => {
  console.log('🔄 MongoDB reconnected');
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
  shared_with_emails: { type: [String], default: [] },
  share_token: { type: String, default: null }, // For public link sharing
  share_token_expires: { type: Date, default: null },
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
  question_types: { type: [String], default: ['MCQ', 'MSQ', 'NAT'] },
  difficulty_level: { type: String, default: 'medium' },
  negative_marking: { type: Boolean, default: false },
  mcq_marks: { type: Number, default: 1 },
  mcq_negative: { type: Number, default: 0.33 },
  msq_marks: { type: Number, default: 2 },
  msq_negative: { type: Number, default: 0 },
  nat_marks: { type: Number, default: 2 },
  nat_negative: { type: Number, default: 0 },
  is_published: { type: Boolean, default: true },
  status: { type: String, default: 'active' },
  attempt_count: { type: Number, default: 0 },
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

app.get('/api/', (req, res) => {
  res.json({ message: 'Hello World from Node.js/Express' });
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
    const { question_text, subject, topic } = req.body;
    
    // Check for duplicate questions
    const duplicateQuestion = await Question.findOne({
      question_text: { $regex: new RegExp(`^${question_text.trim()}$`, 'i') },
      subject: { $regex: new RegExp(`^${subject.trim()}$`, 'i') },
      topic: { $regex: new RegExp(`^${topic.trim()}$`, 'i') }
    });
    
    if (duplicateQuestion) {
      return res.status(400).json({ 
        detail: 'A similar question already exists with the same text, subject, and topic',
        existing_question: {
          id: duplicateQuestion.id,
          question_text: duplicateQuestion.question_text,
          subject: duplicateQuestion.subject,
          topic: duplicateQuestion.topic,
          created_by: duplicateQuestion.created_by
        }
      });
    }
    
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

// Student Questions Route
app.get('/api/questions', authenticate, async (req, res) => {
  try {
    const { skip = 0, limit = 100, subject } = req.query;
    const query = subject ? { subject } : {};

    const questions = await Question.find(query)
      .skip(parseInt(skip))
      .limit(parseInt(limit))
      .select('-_id -__v');

    // Add user relation for each question
    const questionsWithRelation = questions.map(question => {
      const questionObj = question.toObject();
      
      // Determine relationship to user
      if (questionObj.created_by === req.user.id) {
        questionObj.user_relation = 'own';
      } else if (Array.isArray(questionObj.shared_with_emails) && questionObj.shared_with_emails.includes(req.user.email)) {
        questionObj.user_relation = 'shared';
      } else if (req.user.role === 'admin') {
        questionObj.user_relation = 'admin';
      } else {
        questionObj.user_relation = 'public';
      }
      
      // Add creator name (simplified)
      questionObj.creator_name = questionObj.created_by === req.user.id ? req.user.full_name : 'Admin';
      questionObj.shared_count = Array.isArray(questionObj.shared_with_emails) ? questionObj.shared_with_emails.length : 0;
      
      return questionObj;
    });

    res.json(questionsWithRelation);
  } catch (error) {
    console.error('Get questions error:', error);
    res.status(500).json({ detail: 'Failed to fetch questions' });
  }
});

// User Question Management Routes
app.post('/api/questions', authenticate, [
  body('question_text').notEmpty().withMessage('Question text is required'),
  body('question_type').isIn(Object.values(QuestionType)).withMessage('Invalid question type'),
  body('subject').notEmpty().withMessage('Subject is required'),
  body('topic').notEmpty().withMessage('Topic is required')
], handleValidationErrors, async (req, res) => {
  try {
    const { question_text, subject, topic } = req.body;
    
    // Check for duplicate questions (case-insensitive)
    const duplicateQuestion = await Question.findOne({
      question_text: { $regex: new RegExp(`^${question_text.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
      subject: { $regex: new RegExp(`^${subject.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
      topic: { $regex: new RegExp(`^${topic.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
    });
    
    if (duplicateQuestion) {
      return res.status(400).json({ 
        detail: 'A similar question already exists with the same text, subject, and topic',
        existing_question: {
          id: duplicateQuestion.id,
          question_text: duplicateQuestion.question_text,
          subject: duplicateQuestion.subject,
          topic: duplicateQuestion.topic,
          created_by: duplicateQuestion.created_by,
          creator_name: duplicateQuestion.created_by === req.user.id ? 'You' : 'Another user'
        }
      });
    }
    
    const questionData = { ...req.body, created_by: req.user.id };
    const question = new Question(questionData);
    await question.save();

    const questionResponse = question.toObject();
    delete questionResponse._id;
    delete questionResponse.__v;

    res.status(201).json(questionResponse);
  } catch (error) {
    console.error('Create user question error:', error);
    res.status(500).json({ detail: 'Failed to create question' });
  }
});

app.post('/api/questions/:questionId/share', authenticate, async (req, res) => {
  try {
    const { questionId } = req.params;
    const { recipient_emails, share_method = 'email' } = req.body; // 'email' or 'link'

    // Find question and verify permission
    const question = await Question.findOne({ id: questionId });
    if (!question) {
      return res.status(404).json({ detail: 'Question not found' });
    }

    if (question.created_by !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ detail: 'Permission denied' });
    }

    let shareLink = null;
    let emailsSent = 0;
    
    // Generate or reuse share token for link sharing
    if (share_method === 'link' || recipient_emails?.length > 0) {
      if (!question.share_token || question.share_token_expires < new Date()) {
        question.share_token = crypto.randomBytes(32).toString('hex');
        question.share_token_expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
      }
      
      shareLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/shared/${question.share_token}`;
    }

    // Handle email sharing
    if (share_method === 'email' && recipient_emails?.length > 0) {
      // Validate emails
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const cleanEmails = recipient_emails
        .map(e => String(e).trim().toLowerCase())
        .filter(e => emailRegex.test(e));

      if (cleanEmails.length === 0) {
        return res.status(400).json({ detail: 'No valid recipient emails provided' });
      }

      // Update shared emails list
      const current = new Set(question.shared_with_emails || []);
      cleanEmails.forEach(e => current.add(e));
      question.shared_with_emails = Array.from(current);

      // Send emails if email service is configured
      if (emailTransporter) {
        const questionTitle = question.question_text.length > 100 
          ? question.question_text.substring(0, 100) + '...' 
          : question.question_text;
          
        const platformLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard`;
        
        for (const email of cleanEmails) {
          try {
            const emailContent = createQuestionShareEmail(
              req.user.full_name,
              questionTitle,
              platformLink,
              shareLink
            );
            
            await emailTransporter.sendMail({
              from: process.env.EMAIL_FROM || 'GATE Exam Simulator <noreply@example.com>',
              to: email,
              ...emailContent
            });
            
            emailsSent++;
          } catch (emailError) {
            console.error(`Failed to send email to ${email}:`, emailError);
          }
        }
      } else {
        console.log('📧 Email simulation - Would send to:', cleanEmails);
        emailsSent = cleanEmails.length; // Simulate success for development
      }
    }

    await question.save();

    const response = {
      success: true,
      message: share_method === 'link' 
        ? 'Share link generated successfully'
        : `Question shared with ${emailsSent} recipient(s)`,
      share_method,
    };

    if (shareLink) {
      response.share_link = shareLink;
      response.expires_at = question.share_token_expires;
    }
    
    if (share_method === 'email') {
      response.emails_sent = emailsSent;
      response.shared_with_emails = question.shared_with_emails;
    }

    res.json(response);
  } catch (error) {
    console.error('Share question error:', error);
    res.status(500).json({ detail: 'Failed to share question' });
  }
});

// Public endpoint for viewing shared questions
app.get('/api/shared/:shareToken', async (req, res) => {
  try {
    const { shareToken } = req.params;
    
    // Find question by share token
    const question = await Question.findOne({
      share_token: shareToken,
      share_token_expires: { $gt: new Date() } // Token must not be expired
    });
    
    if (!question) {
      return res.status(404).json({ detail: 'Shared question not found or link has expired' });
    }
    
    // Return question data without sensitive information
    const questionData = {
      id: question.id,
      question_text: question.question_text,
      question_type: question.question_type,
      subject: question.subject,
      topic: question.topic,
      difficulty: question.difficulty || 'medium',
      marks: question.marks,
      negative_marks: question.negative_marks,
      options: question.options,
      explanation: question.explanation,
      created_at: question.created_at,
      creator_name: 'Anonymous', // Don't expose creator details publicly
      is_shared: true,
      expires_at: question.share_token_expires
    };
    
    res.json(questionData);
  } catch (error) {
    console.error('Get shared question error:', error);
    res.status(500).json({ detail: 'Failed to fetch shared question' });
  }
});

app.delete('/api/questions/:questionId', authenticate, async (req, res) => {
  try {
    const { questionId } = req.params;
    
    // Find the question first to check ownership
    const question = await Question.findOne({ id: questionId });
    if (!question) {
      return res.status(404).json({ detail: 'Question not found' });
    }
    
    // Check if user owns the question or is admin
    if (question.created_by !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ detail: 'Permission denied' });
    }
    
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

    // Parse CSV - Better handling of quoted fields
    const rows = [];
    const lines = csvData.split('\n');
    
    for (const line of lines) {
      if (line.trim()) {
        // Simple CSV parser that handles quoted fields
        const row = [];
        let currentField = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            row.push(currentField.trim());
            currentField = '';
          } else {
            currentField += char;
          }
        }
        row.push(currentField.trim()); // Add the last field
        rows.push(row);
      }
    }
    
    if (rows.length === 0) {
      return res.status(400).json({ detail: 'CSV file is empty' });
    }
    
    const headers = rows[0].map(h => h.trim());
    console.log('CSV Headers:', headers);
    
    for (let i = 1; i < rows.length; i++) {
      if (rows[i].length < headers.length) continue;
      
      try {
        const row = {};
        headers.forEach((header, index) => {
          row[header] = rows[i][index] ? rows[i][index].trim().replace(/^"|"$/g, '') : '';
        });

        console.log('Processing row:', row);
        
        if (!row.question_text) {
          console.log('Skipping row - no question text');
          continue;
        }

        // Parse question type - check both 'type' and 'question_type'
        const questionType = (row.question_type || row.type || 'MCQ').toUpperCase();
        if (!Object.values(QuestionType).includes(questionType)) {
          throw new Error(`Invalid question type: ${questionType}`);
        }

        // Parse options for MCQ/MSQ
        const options = [];
        let correctAnswer = null;
        
        if ([QuestionType.MCQ, QuestionType.MSQ].includes(questionType)) {
          for (let j = 1; j <= 4; j++) {
            const optionText = row[`option_${j}`];
            if (optionText && optionText.trim() !== '') {
              // Handle both 'true/false' and 'TRUE/FALSE' formats
              const correctValue = (row[`option_${j}_correct`] || '').toLowerCase();
              const isCorrect = ['true', '1', 'yes'].includes(correctValue);
              
              const optionId = require('crypto').randomUUID();
              options.push({
                id: optionId,
                text: optionText,
                is_correct: isCorrect
              });
            }
          }
        } else if (questionType === QuestionType.NAT) {
          // For NAT questions, check if answer is provided in option_1 or correct_answer field
          correctAnswer = row.correct_answer || row.option_1 || null;
          if (correctAnswer) {
            correctAnswer = parseFloat(correctAnswer) || correctAnswer;
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
          correct_answer: correctAnswer || row.correct_answer,
          explanation: row.explanation || '',
          created_by: req.user.id
        };
        
        console.log('Question data to save:', JSON.stringify(questionData, null, 2));

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

app.post('/api/admin/preview-csv', authenticate, requireAdmin, upload.single('file'), async (req, res) => {
  try {
    if (!req.file || !req.file.originalname.endsWith('.csv')) {
      return res.status(400).json({ detail: 'File must be a CSV' });
    }

    const csvData = req.file.buffer.toString('utf-8');
    const previewQuestions = [];
    let headers = [];
    let rowCount = 0;
    
    // Parse CSV - Better handling of quoted fields
    const rows = [];
    const lines = csvData.split('\n');
    
    for (const line of lines) {
      if (line.trim()) {
        // Simple CSV parser that handles quoted fields
        const row = [];
        let currentField = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            row.push(currentField.trim());
            currentField = '';
          } else {
            currentField += char;
          }
        }
        row.push(currentField.trim()); // Add the last field
        rows.push(row);
      }
    }
    
    if (rows.length === 0) {
      return res.status(400).json({ detail: 'CSV file is empty' });
    }
    
    headers = rows[0].map(h => h.trim());
    const totalRows = rows.length - 1; // Excluding header
    
    // Process first 10 rows (or less) for preview
    for (let i = 1; i < Math.min(rows.length, 11); i++) {
      try {
        const row = {};
        headers.forEach((header, index) => {
          row[header] = rows[i][index] ? rows[i][index].trim().replace(/^"|"$/g, '') : '';
        });
        
        if (!row.question_text) {
          previewQuestions.push({
            row_number: i + 1,
            error: 'Missing question text',
            raw_row: row
          });
          rowCount++;
          continue;
        }

        // Parse question type
        const questionType = (row.question_type || row.type || 'MCQ').toUpperCase();
        if (!Object.values(QuestionType).includes(questionType)) {
          previewQuestions.push({
            row_number: i + 1,
            error: `Invalid question type: ${questionType}`,
            raw_row: row
          });
          rowCount++;
          continue;
        }

        // Parse options for MCQ/MSQ
        const options = [];
        if ([QuestionType.MCQ, QuestionType.MSQ].includes(questionType)) {
          for (let j = 1; j <= 4; j++) {
            const optionText = row[`option_${j}`];
            if (optionText && optionText.trim() !== '') {
              const correctValue = (row[`option_${j}_correct`] || '').toLowerCase();
              const isCorrect = ['true', '1', 'yes'].includes(correctValue);
              
              options.push({
                text: optionText,
                is_correct: isCorrect
              });
            }
          }
        }

        previewQuestions.push({
          row_number: i + 1,
          question_text: row.question_text,
          question_type: questionType,
          subject: row.subject || 'General',
          topic: row.topic || 'General',
          difficulty: row.difficulty || 'medium',
          marks: parseFloat(row.marks || 1.0),
          options,
          correct_answer: row.correct_answer,
          explanation: row.explanation || '',
          raw_row: row
        });
        rowCount++;
        
      } catch (error) {
        previewQuestions.push({
          row_number: i + 1,
          error: error.message,
          raw_row: rows[i]
        });
        rowCount++;
      }
    }

    res.json({
      headers,
      preview_questions: previewQuestions,
      total_rows: totalRows,
      showing_rows: Math.min(10, totalRows),
      filename: req.file.originalname
    });

  } catch (error) {
    console.error('CSV preview error:', error);
    res.status(500).json({ detail: 'Failed to preview CSV file' });
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

app.delete('/api/admin/exams/:examId', authenticate, requireAdmin, async (req, res) => {
  try {
    const { examId } = req.params;
    
    // Check if exam configuration exists
    const examConfig = await ExamConfig.findOne({ id: examId });
    if (!examConfig) {
      return res.status(404).json({ detail: 'Exam configuration not found' });
    }
    
    // Check for active exam sessions
    const activeSessions = await ExamSession.find({ 
      exam_config_id: examId, 
      submitted: false 
    });
    
    if (activeSessions.length > 0) {
      return res.status(400).json({ 
        detail: `Cannot delete exam configuration. ${activeSessions.length} active session(s) exist.` 
      });
    }
    
    // Delete the exam configuration
    const result = await ExamConfig.deleteOne({ id: examId });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ detail: 'Exam configuration not found' });
    }
    
    res.json({ message: 'Exam configuration deleted successfully' });
  } catch (error) {
    console.error('Delete exam error:', error);
    res.status(500).json({ detail: 'Failed to delete exam configuration' });
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

// User Exam Creation Route
app.post('/api/exams', authenticate, [
  body('title').notEmpty().withMessage('Exam title is required'),
  body('description').notEmpty().withMessage('Exam description is required'),
  body('duration').isInt({ min: 30 }).withMessage('Duration must be at least 30 minutes'),
  body('total_questions').isInt({ min: 1 }).withMessage('Total questions must be a positive integer'),
  body('subjects').isArray({ min: 1 }).withMessage('At least one subject is required'),
  body('question_types').isArray({ min: 1 }).withMessage('At least one question type is required')
], handleValidationErrors, async (req, res) => {
  try {
    const {
      title,
      description,
      duration,
      total_questions,
      subjects,
      question_types,
      difficulty_level,
      negative_marking,
      mcq_marks,
      mcq_negative,
      msq_marks,
      msq_negative,
      nat_marks,
      nat_negative
    } = req.body;

    // Check if there are enough questions for the requested exam
    const availableQuestions = await Question.find({
      subject: { $in: subjects },
      question_type: { $in: question_types }
    });

    // Remove duplicate questions based on question text (case-insensitive) for validation
    const uniqueQuestions = [];
    const seenQuestionTexts = new Set();
    
    for (const question of availableQuestions) {
      const normalizedText = question.question_text.trim().toLowerCase();
      if (!seenQuestionTexts.has(normalizedText)) {
        seenQuestionTexts.add(normalizedText);
        uniqueQuestions.push(question);
      }
    }

    if (uniqueQuestions.length < total_questions) {
      return res.status(400).json({
        detail: `Not enough unique questions available. Found ${uniqueQuestions.length} unique questions but need ${total_questions}. Available: ${availableQuestions.length} total questions (${availableQuestions.length - uniqueQuestions.length} duplicates removed)`
      });
    }

    // Create exam configuration
    const examData = {
      name: title, // Map title to name for compatibility
      description,
      duration_minutes: duration,
      total_questions,
      subjects,
      question_types,
      difficulty_level: difficulty_level || 'medium',
      negative_marking: negative_marking || false,
      mcq_marks: mcq_marks || 1,
      mcq_negative: mcq_negative || 0.33,
      msq_marks: msq_marks || 2,
      msq_negative: msq_negative || 0,
      nat_marks: nat_marks || 2,
      nat_negative: nat_negative || 0,
      created_by: req.user.id,
      randomize_questions: true
    };

    const exam = new ExamConfig(examData);
    await exam.save();

    const examResponse = exam.toObject();
    delete examResponse._id;
    delete examResponse.__v;

    res.status(201).json({
      success: true,
      exam: examResponse,
      message: 'Exam created successfully'
    });
  } catch (error) {
    console.error('Create user exam error:', error);
    res.status(500).json({ detail: 'Failed to create exam' });
  }
});

app.delete('/api/exams/:examId', authenticate, async (req, res) => {
  try {
    const { examId } = req.params;
    
    // Find the exam configuration first to check ownership
    const examConfig = await ExamConfig.findOne({ id: examId });
    if (!examConfig) {
      return res.status(404).json({ detail: 'Exam configuration not found' });
    }
    
    // Check if user owns the exam configuration or is admin
    if (examConfig.created_by !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ detail: 'Permission denied. You can only delete your own exam configurations.' });
    }
    
    // Check for active exam sessions
    const activeSessions = await ExamSession.find({ 
      exam_config_id: examId, 
      submitted: false 
    });
    
    if (activeSessions.length > 0) {
      return res.status(400).json({ 
        detail: `Cannot delete exam configuration. ${activeSessions.length} active session(s) exist.` 
      });
    }
    
    // Delete the exam configuration
    const result = await ExamConfig.deleteOne({ id: examId });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ detail: 'Exam configuration not found' });
    }
    
    res.json({ message: 'Exam configuration deleted successfully' });
  } catch (error) {
    console.error('Delete user exam error:', error);
    res.status(500).json({ detail: 'Failed to delete exam configuration' });
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

    // Get unique questions based on subjects (prevent duplicates by question text)
    const allQuestions = await Question.find({ 
      subject: { $in: examConfig.subjects } 
    });

    // Remove duplicate questions based on question text (case-insensitive)
    const uniqueQuestions = [];
    const seenQuestionTexts = new Set();
    
    for (const question of allQuestions) {
      const normalizedText = question.question_text.trim().toLowerCase();
      if (!seenQuestionTexts.has(normalizedText)) {
        seenQuestionTexts.add(normalizedText);
        uniqueQuestions.push(question);
      }
    }

    console.log(`Found ${allQuestions.length} total questions, ${uniqueQuestions.length} unique questions`);

    if (uniqueQuestions.length < examConfig.total_questions) {
      return res.status(400).json({ 
        detail: `Not enough unique questions available for this exam. Found ${uniqueQuestions.length} unique questions but need ${examConfig.total_questions}. Please reduce the number of questions or add more unique questions.`
      });
    }

    // Select and randomize questions if needed
    let selectedQuestions = uniqueQuestions;
    if (examConfig.randomize_questions) {
      selectedQuestions = uniqueQuestions
        .sort(() => Math.random() - 0.5)
        .slice(0, examConfig.total_questions);
    } else {
      selectedQuestions = uniqueQuestions.slice(0, examConfig.total_questions);
    }

    const questionIds = selectedQuestions.map(q => q.id);
    
    // Double-check for duplicate IDs (should not happen, but safety check)
    const uniqueIds = [...new Set(questionIds)];
    if (uniqueIds.length !== questionIds.length) {
      console.error('Duplicate question IDs detected in exam:', questionIds);
      return res.status(500).json({ detail: 'Internal error: duplicate questions detected' });
    }

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

app.get('/api/detailed-results/:sessionId', authenticate, async (req, res) => {
  try {
    const { sessionId } = req.params;

    // First check if the exam session exists and belongs to the user
    const session = await ExamSession.findOne({
      id: sessionId,
      user_id: req.user.id,
      submitted: true
    });

    if (!session) {
      return res.status(404).json({ detail: 'Exam session not found or not submitted' });
    }

    // Get the exam result
    const result = await ExamResult.findOne({
      exam_session_id: sessionId,
      user_id: req.user.id
    }).select('-_id -__v');

    if (!result) {
      return res.status(404).json({ detail: 'Result not found' });
    }

    // Get detailed question-wise results
    const detailedQuestions = [];
    
    for (const questionId of session.questions) {
      const question = await Question.findOne({ id: questionId }).select('-_id -__v');
      if (!question) continue;

      const userAnswer = session.answers.get(questionId);
      const questionStatus = session.question_status.get(questionId) || QuestionStatus.NOT_VISITED;
      
      // Determine if answer is correct
      let isCorrect = false;
      let correctAnswerValue = null;
      
      if (userAnswer) {
        if (question.question_type === QuestionType.MCQ) {
          const correctOptions = question.options.filter(opt => opt.is_correct);
          isCorrect = correctOptions.some(opt => opt.id === userAnswer);
          correctAnswerValue = correctOptions.map(opt => opt.id);
        } else if (question.question_type === QuestionType.MSQ) {
          const correctOptions = new Set(
            question.options
              .filter(opt => opt.is_correct)
              .map(opt => opt.id)
          );
          const userOptions = new Set(Array.isArray(userAnswer) ? userAnswer : [userAnswer]);
          isCorrect = correctOptions.size === userOptions.size &&
            [...correctOptions].every(opt => userOptions.has(opt));
          correctAnswerValue = [...correctOptions];
        } else if (question.question_type === QuestionType.NAT) {
          try {
            isCorrect = parseFloat(userAnswer) === parseFloat(question.correct_answer);
            correctAnswerValue = question.correct_answer;
          } catch {
            isCorrect = false;
            correctAnswerValue = question.correct_answer;
          }
        }
      }

      detailedQuestions.push({
        question_id: question.id,
        question_text: question.question_text,
        question_type: question.question_type,
        subject: question.subject,
        topic: question.topic,
        difficulty: question.difficulty,
        marks: question.marks,
        negative_marks: question.negative_marks,
        options: question.options || [],
        user_answer: userAnswer,
        correct_answer: correctAnswerValue,
        is_correct: isCorrect,
        status: questionStatus,
        explanation: question.explanation
      });
    }

    res.json({
      session_id: sessionId,
      result_summary: result,
      questions: detailedQuestions
    });
  } catch (error) {
    console.error('Get detailed results error:', error);
    res.status(500).json({ detail: 'Failed to fetch detailed results' });
  }
});

// Exam History Route
app.get('/api/exam-history', authenticate, async (req, res) => {
  try {
    const examResults = await ExamResult.find({ user_id: req.user.id })
      .sort({ submitted_at: -1 })
      .select('-_id -__v');

    // Get exam config details for each result
    const historyWithDetails = await Promise.all(
      examResults.map(async (result) => {
        const session = await ExamSession.findOne({ id: result.exam_session_id })
          .select('exam_config_id -_id');
        
        const examConfig = session ? 
          await ExamConfig.findOne({ id: session.exam_config_id })
            .select('name description duration_minutes subjects -_id') :
          null;

        return {
          ...result.toObject(),
          exam_config_id: session?.exam_config_id || null,
          exam_name: examConfig?.name || 'Unknown Exam',
          exam_description: examConfig?.description || '',
          exam_duration: examConfig?.duration_minutes || 180,
          exam_subjects: examConfig?.subjects || [],
          completed_at: result.submitted_at
        };
      })
    );

    res.json(historyWithDetails);
  } catch (error) {
    console.error('Get exam history error:', error);
    res.status(500).json({ detail: 'Failed to fetch exam history' });
  }
});

// Admin Analytics Routes
app.get('/api/admin/analytics/overview', authenticate, requireAdmin, async (req, res) => {
  try {
    const [totalUsers, totalQuestions, totalExams, totalSessions] = await Promise.all([
      User.countDocuments(),
      Question.countDocuments(),
      ExamConfig.countDocuments(),
      ExamSession.countDocuments()
    ]);

    const recentUsers = await User.find()
      .sort({ created_at: -1 })
      .limit(5)
      .select('-password -_id -__v');

    const activeUsers = await ExamSession.distinct('user_id', {
      start_time: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
    });

    const completedExams = await ExamSession.countDocuments({ submitted: true });
    const avgScore = await ExamResult.aggregate([
      { $group: { _id: null, avgPercentage: { $avg: '$percentage' } } }
    ]);

    res.json({
      total_users: totalUsers,
      total_questions: totalQuestions,
      total_exams: totalExams,
      total_sessions: totalSessions,
      active_users: activeUsers.length,
      completed_exams: completedExams,
      average_score: avgScore[0]?.avgPercentage || 0,
      recent_users: recentUsers
    });
  } catch (error) {
    console.error('Get admin analytics error:', error);
    res.status(500).json({ detail: 'Failed to fetch analytics' });
  }
});

app.get('/api/admin/users', authenticate, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let query = {};
    if (search) {
      query = {
        $or: [
          { full_name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ]
      };
    }

    const [users, totalUsers] = await Promise.all([
      User.find(query)
        .select('-password -_id -__v')
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      User.countDocuments(query)
    ]);

    // Get user stats
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        const userObj = user.toObject();
        
        const [examsTaken, totalScore, lastActive] = await Promise.all([
          ExamSession.countDocuments({ user_id: user.id, submitted: true }),
          ExamResult.aggregate([
            { $match: { user_id: user.id } },
            { $group: { _id: null, avgScore: { $avg: '$percentage' } } }
          ]),
          ExamSession.findOne({ user_id: user.id }).sort({ start_time: -1 }).select('start_time')
        ]);

        return {
          ...userObj,
          exams_taken: examsTaken,
          average_score: totalScore[0]?.avgScore || 0,
          last_active: lastActive?.start_time || user.created_at
        };
      })
    );

    res.json({
      users: usersWithStats,
      total: totalUsers,
      page: parseInt(page),
      limit: parseInt(limit),
      total_pages: Math.ceil(totalUsers / parseInt(limit))
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ detail: 'Failed to fetch users' });
  }
});

app.get('/api/admin/users/:userId/details', authenticate, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findOne({ id: userId }).select('-password -_id -__v');
    if (!user) {
      return res.status(404).json({ detail: 'User not found' });
    }

    const [examSessions, examResults] = await Promise.all([
      ExamSession.find({ user_id: userId })
        .sort({ start_time: -1 })
        .select('-_id -__v'),
      ExamResult.find({ user_id: userId })
        .sort({ submitted_at: -1 })
        .select('-_id -__v')
    ]);

    // Get exam configs for sessions
    const sessionDetails = await Promise.all(
      examSessions.map(async (session) => {
        const examConfig = await ExamConfig.findOne({ id: session.exam_config_id })
          .select('name description -_id');
        return {
          ...session.toObject(),
          exam_name: examConfig?.name || 'Unknown Exam',
          exam_description: examConfig?.description || ''
        };
      })
    );

    const stats = {
      total_exams_taken: examResults.length,
      total_sessions: examSessions.length,
      completed_sessions: examSessions.filter(s => s.submitted).length,
      average_score: examResults.length > 0 
        ? examResults.reduce((sum, result) => sum + result.percentage, 0) / examResults.length 
        : 0,
      best_score: examResults.length > 0 
        ? Math.max(...examResults.map(r => r.percentage)) 
        : 0
    };

    res.json({
      user: user.toObject(),
      stats,
      recent_sessions: sessionDetails.slice(0, 10),
      recent_results: examResults.slice(0, 10)
    });
  } catch (error) {
    console.error('Get user details error:', error);
    res.status(500).json({ detail: 'Failed to fetch user details' });
  }
});

app.get('/api/admin/analytics/charts', authenticate, requireAdmin, async (req, res) => {
  try {
    // User registration over time (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const userRegistrations = await User.aggregate([
      { $match: { created_at: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$created_at' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Exam completion over time (last 30 days)
    const examCompletions = await ExamResult.aggregate([
      { $match: { submitted_at: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$submitted_at' }
          },
          count: { $sum: 1 },
          avgScore: { $avg: '$percentage' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Score distribution
    const scoreDistribution = await ExamResult.aggregate([
      {
        $bucket: {
          groupBy: '$percentage',
          boundaries: [0, 20, 40, 60, 80, 100],
          default: 'Other',
          output: {
            count: { $sum: 1 }
          }
        }
      }
    ]);

    // Popular subjects
    const popularSubjects = await Question.aggregate([
      {
        $group: {
          _id: '$subject',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    res.json({
      user_registrations: userRegistrations,
      exam_completions: examCompletions,
      score_distribution: scoreDistribution,
      popular_subjects: popularSubjects
    });
  } catch (error) {
    console.error('Get analytics charts error:', error);
    res.status(500).json({ detail: 'Failed to fetch chart data' });
  }
});

// ============= AI ENDPOINTS =============

// Generate explanation for a question
app.post('/api/ai/generate-explanation/:questionId', authenticate, async (req, res) => {
  try {
    const { questionId } = req.params;
    
    const question = await Question.findOne({ id: questionId });
    if (!question) {
      return res.status(404).json({ detail: 'Question not found' });
    }

    if (!geminiService || !geminiService.isAvailable()) {
      return res.status(503).json({ detail: 'AI service is currently unavailable' });
    }

    const result = await geminiService.generateExplanation(question);
    
    if (result.success) {
      // Update question with generated explanation
      question.explanation = result.explanation;
      await question.save();
      
      res.json({
        success: true,
        explanation: result.explanation,
        message: 'Explanation generated successfully'
      });
    } else {
      res.status(500).json({ 
        success: false, 
        error: result.error,
        message: 'Failed to generate explanation'
      });
    }
  } catch (error) {
    console.error('Generate explanation error:', error);
    res.status(500).json({ detail: 'Failed to generate explanation' });
  }
});

// Categorize question using AI
app.post('/api/ai/categorize-question', authenticate, async (req, res) => {
  try {
    const { question_text } = req.body;
    
    if (!question_text) {
      return res.status(400).json({ detail: 'Question text is required' });
    }

    if (!geminiService || !geminiService.isAvailable()) {
      return res.status(503).json({ detail: 'AI service is currently unavailable' });
    }

    const result = await geminiService.categorizeQuestion(question_text);
    
    if (result.success) {
      res.json({
        success: true,
        categorization: result.categorization
      });
    } else {
      res.status(500).json({ 
        success: false, 
        error: result.error
      });
    }
  } catch (error) {
    console.error('Categorize question error:', error);
    res.status(500).json({ detail: 'Failed to categorize question' });
  }
});

// Enhance question quality
app.post('/api/ai/enhance-question/:questionId', authenticate, async (req, res) => {
  try {
    const { questionId } = req.params;
    
    const question = await Question.findOne({ id: questionId });
    if (!question) {
      return res.status(404).json({ detail: 'Question not found' });
    }

    // Check if user owns the question or is admin
    if (question.created_by !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ detail: 'Permission denied' });
    }

    if (!geminiService || !geminiService.isAvailable()) {
      return res.status(503).json({ detail: 'AI service is currently unavailable' });
    }

    const result = await geminiService.enhanceQuestion(question);
    
    if (result.success) {
      res.json({
        success: true,
        enhancement: result.enhancement
      });
    } else {
      res.status(500).json({ 
        success: false, 
        error: result.error
      });
    }
  } catch (error) {
    console.error('Enhance question error:', error);
    res.status(500).json({ detail: 'Failed to enhance question' });
  }
});

// AI Tutor - Answer student doubts
app.post('/api/ai/ask-tutor', authenticate, async (req, res) => {
  try {
    const { question, context } = req.body;
    
    if (!question) {
      return res.status(400).json({ detail: 'Question is required' });
    }

    if (!geminiService || !geminiService.isAvailable()) {
      return res.status(503).json({ detail: 'AI Tutor is currently unavailable' });
    }

    const result = await geminiService.answerDoubt(question, context);
    
    if (result.success) {
      res.json({
        success: true,
        answer: result.answer
      });
    } else {
      res.status(500).json({ 
        success: false, 
        error: result.error
      });
    }
  } catch (error) {
    console.error('AI Tutor error:', error);
    res.status(500).json({ detail: 'Failed to get answer from AI Tutor' });
  }
});

// Generate questions using AI
app.post('/api/ai/generate-questions', authenticate, async (req, res) => {
  try {
    const { subject, topic, difficulty = 'medium', count = 1, question_type = 'MCQ' } = req.body;
    
    if (!subject || !topic) {
      return res.status(400).json({ detail: 'Subject and topic are required' });
    }

    if (!geminiService || !geminiService.isAvailable()) {
      return res.status(503).json({ detail: 'AI service is currently unavailable' });
    }

    const result = await geminiService.generateQuestions(subject, topic, difficulty, count, question_type);
    
    if (result.success) {
      // Optionally save generated questions to database
      const savedQuestions = [];
      for (const questionData of result.questions) {
        const question = new Question({
          ...questionData,
          created_by: req.user.id
        });
        const savedQuestion = await question.save();
        savedQuestions.push(savedQuestion);
      }

      res.json({
        success: true,
        questions: savedQuestions,
        count: savedQuestions.length
      });
    } else {
      res.status(500).json({ 
        success: false, 
        error: result.error
      });
    }
  } catch (error) {
    console.error('Generate questions error:', error);
    res.status(500).json({ detail: 'Failed to generate questions' });
  }
});

// Analyze user performance
app.post('/api/ai/analyze-performance', authenticate, async (req, res) => {
  try {
    // Get user's recent exam results
    const examResults = await ExamResult.find({ user_id: req.user.id })
      .sort({ submitted_at: -1 })
      .limit(10)
      .lean();

    if (examResults.length === 0) {
      return res.status(400).json({ detail: 'No exam data available for analysis' });
    }

    if (!geminiService || !geminiService.isAvailable()) {
      return res.status(503).json({ detail: 'AI service is currently unavailable' });
    }

    // Prepare performance data for AI analysis
    const performanceData = {
      total_exams: examResults.length,
      average_score: examResults.reduce((sum, result) => sum + result.percentage, 0) / examResults.length,
      best_score: Math.max(...examResults.map(r => r.percentage)),
      worst_score: Math.min(...examResults.map(r => r.percentage)),
      subject_scores: {},
      recent_trend: examResults.slice(0, 5).map(r => ({ 
        score: r.percentage, 
        date: r.submitted_at,
        attempted: r.attempted,
        correct: r.correct
      }))
    };

    // Calculate subject-wise performance
    examResults.forEach(result => {
      if (result.subject_wise_score) {
        for (const [subject, score] of Object.entries(result.subject_wise_score)) {
          if (!performanceData.subject_scores[subject]) {
            performanceData.subject_scores[subject] = [];
          }
          performanceData.subject_scores[subject].push(score);
        }
      }
    });

    const result = await geminiService.analyzePerformance(performanceData);
    
    if (result.success) {
      res.json({
        success: true,
        analysis: result.analysis,
        performance_data: performanceData
      });
    } else {
      res.status(500).json({ 
        success: false, 
        error: result.error
      });
    }
  } catch (error) {
    console.error('Analyze performance error:', error);
    res.status(500).json({ detail: 'Failed to analyze performance' });
  }
});

// Check AI service status
app.get('/api/ai/status', authenticate, (req, res) => {
  const isAvailable = geminiService && geminiService.isAvailable();
  res.json({
    available: isAvailable,
    features: {
      explanation_generation: isAvailable,
      question_categorization: isAvailable,
      question_enhancement: isAvailable,
      ai_tutor: isAvailable,
      question_generation: isAvailable,
      performance_analysis: isAvailable
    }
  });
});

// Bulk generate explanations for questions without explanations
app.post('/api/ai/bulk-generate-explanations', authenticate, requireAdmin, async (req, res) => {
  try {
    if (!geminiService || !geminiService.isAvailable()) {
      return res.status(503).json({ detail: 'AI service is currently unavailable' });
    }

    // Find questions without explanations
    const questionsWithoutExplanations = await Question.find({
      $or: [
        { explanation: { $exists: false } },
        { explanation: '' },
        { explanation: null }
      ]
    }).limit(10); // Limit to 10 to avoid rate limits

    const results = [];
    let successCount = 0;
    let failureCount = 0;

    for (const question of questionsWithoutExplanations) {
      try {
        const result = await geminiService.generateExplanation(question);
        
        if (result.success) {
          question.explanation = result.explanation;
          await question.save();
          successCount++;
          results.push({
            question_id: question.id,
            success: true,
            explanation_length: result.explanation.length
          });
        } else {
          failureCount++;
          results.push({
            question_id: question.id,
            success: false,
            error: result.error
          });
        }
        
        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        failureCount++;
        results.push({
          question_id: question.id,
          success: false,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      processed: questionsWithoutExplanations.length,
      successful: successCount,
      failed: failureCount,
      results
    });
  } catch (error) {
    console.error('Bulk generate explanations error:', error);
    res.status(500).json({ detail: 'Failed to bulk generate explanations' });
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
  console.log('\n' + '='.repeat(60));
  console.log('🚀 GATE Exam Simulator API Server Started!');
  console.log('='.repeat(60));
  console.log(`📡 Port: ${PORT}`);
  console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🗄️  Database: ${MONGO_URL}`);
  console.log(`🔒 CORS Origins: ${process.env.CORS_ORIGINS || '*'}`);
  console.log('\n📍 Server Access URLs:');
  console.log(`   Local:    http://localhost:${PORT}`);
  console.log(`   Network:  http://0.0.0.0:${PORT}`);
  console.log(`   Phone:    http://192.168.1.5:${PORT}`);
  console.log('\n📋 API Status:');
  console.log(`   Health:   http://localhost:${PORT}/api/health`);
  console.log(`   AI Status: http://localhost:${PORT}/api/ai/status`);
  console.log('\n✨ Ready to accept connections!');
  console.log('='.repeat(60) + '\n');
});

// Add health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: '2.0.0',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  mongoose.connection.close().then(() => {
    console.log('MongoDB connection closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  mongoose.connection.close().then(() => {
    console.log('MongoDB connection closed');
    process.exit(0);
  });
});

module.exports = app;