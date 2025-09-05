# GATE Exam Simulator - Backend API

Node.js/Express backend API for the GATE Exam Simulator application with MongoDB integration.

## 🚀 Features

- **RESTful API**: Clean and well-structured API endpoints
- **Authentication**: JWT-based user authentication
- **MongoDB Integration**: Mongoose ODM for database operations
- **File Upload**: Support for CSV and PDF file processing
- **Security**: Helmet, CORS, rate limiting, and input validation
- **Error Handling**: Comprehensive error handling and logging
- **Real-time Exam**: Session management for timed exams

## 🛠️ Tech Stack

- **Runtime**: Node.js (>=16.0.0)
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (jsonwebtoken)
- **Password Hashing**: bcryptjs
- **File Processing**: Multer, pdf-parse, csv-parser
- **Security**: Helmet, CORS, express-rate-limit
- **Validation**: express-validator, Joi
- **Development**: Nodemon

## 📦 Installation

```bash
cd backend
npm install
```

## ⚙️ Environment Setup

Create a `.env` file in the backend directory:

```env
PORT=8001
MONGO_URL=mongodb://localhost:27017/gate_exam
DB_NAME=gate_exam
CORS_ORIGINS=http://localhost:3000
SECRET_KEY=your-secret-key-change-this-in-production
NODE_ENV=development
```

## 🗄️ Database Setup

### MongoDB Installation

**macOS (Homebrew):**
```bash
brew install mongodb-community
brew services start mongodb-community
```

**Ubuntu/Debian:**
```bash
sudo apt install mongodb
sudo systemctl start mongodb
sudo systemctl enable mongodb
```

### Database Structure

The application uses the following MongoDB collections:
- `users` - User accounts and profiles
- `questions` - Exam questions with options and answers
- `examconfigs` - Exam configurations and settings
- `examsessions` - Active exam sessions
- `examresults` - Completed exam results

## 🚀 Running the Server

### Development Mode (with auto-restart)
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

### Background Process
```bash
nohup npm run dev > backend.log 2>&1 &
```

### Check Server Status
```bash
# Check if server is running
lsof -i :8001

# View logs
tail -f backend.log
```

## 📋 API Documentation

### Base URL
```
http://localhost:8001
```

### Authentication Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "full_name": "John Doe",
  "role": "student"
}
```

#### Login User
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

#### Get Current User
```http
GET /api/auth/me
Authorization: Bearer <jwt_token>
```

### Exam Endpoints

#### Get Available Exams
```http
GET /api/exams
Authorization: Bearer <jwt_token>
```

#### Start Exam Session
```http
POST /api/exam/start/{examConfigId}
Authorization: Bearer <jwt_token>
```

#### Get Question
```http
GET /api/exam/question/{sessionId}/{questionIndex}
Authorization: Bearer <jwt_token>
```

#### Submit Answer
```http
POST /api/exam/answer/{sessionId}
Content-Type: application/json
Authorization: Bearer <jwt_token>

{
  "question_id": "question_uuid",
  "answer": "option_id_or_value",
  "status": "answered"
}
```

#### Submit Exam
```http
POST /api/exam/submit/{sessionId}
Authorization: Bearer <jwt_token>
```

### Admin Endpoints (Requires Admin Role)

#### Create Question
```http
POST /api/admin/questions
Content-Type: application/json
Authorization: Bearer <admin_jwt_token>

{
  "question_text": "What is 2+2?",
  "question_type": "MCQ",
  "subject": "Mathematics",
  "topic": "Arithmetic",
  "options": [
    {"text": "3", "is_correct": false},
    {"text": "4", "is_correct": true},
    {"text": "5", "is_correct": false}
  ]
}
```

#### Upload CSV Questions
```http
POST /api/admin/upload/csv
Content-Type: multipart/form-data
Authorization: Bearer <admin_jwt_token>

file: questions.csv
```

#### Create Exam Configuration
```http
POST /api/admin/exams
Content-Type: application/json
Authorization: Bearer <admin_jwt_token>

{
  "name": "Sample GATE Exam",
  "description": "Practice exam for GATE preparation",
  "duration_minutes": 180,
  "total_questions": 65,
  "subjects": ["Mathematics", "Computer Science"]
}
```

## 📊 Data Models

### User Schema
```javascript
{
  id: String (UUID),
  email: String (unique),
  password: String (hashed),
  full_name: String,
  role: String (student/admin),
  created_at: Date,
  is_active: Boolean
}
```

### Question Schema
```javascript
{
  id: String (UUID),
  question_text: String,
  question_type: String (MCQ/MSQ/NAT),
  subject: String,
  topic: String,
  difficulty: String,
  marks: Number,
  negative_marks: Number,
  options: [{
    id: String (UUID),
    text: String,
    is_correct: Boolean
  }],
  correct_answer: Mixed,
  explanation: String,
  created_by: String,
  created_at: Date
}
```

### Exam Session Schema
```javascript
{
  id: String (UUID),
  user_id: String,
  exam_config_id: String,
  questions: [String],
  answers: Map,
  question_status: Map,
  start_time: Date,
  end_time: Date,
  submitted: Boolean,
  current_question: Number
}
```

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt with salt rounds
- **Rate Limiting**: Prevents API abuse
- **CORS Protection**: Configurable cross-origin requests
- **Helmet**: Security headers
- **Input Validation**: Request validation and sanitization
- **Error Handling**: Secure error responses

## 🐛 Debugging & Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Find process using port 8001
lsof -i :8001

# Kill the process
kill -9 <PID>
```

#### MongoDB Connection Issues
```bash
# Check MongoDB status
brew services list | grep mongodb

# Start MongoDB
brew services start mongodb-community

# Check MongoDB logs
tail -f /opt/homebrew/var/log/mongodb/mongo.log
```

#### Package Issues
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

### Debug Mode

Enable debug logging by setting environment variable:
```bash
DEBUG=* npm run dev
```

### API Testing

Use curl to test endpoints:
```bash
# Test server health
curl http://localhost:8001

# Test API endpoint
curl -X GET http://localhost:8001/api \
  -H "Content-Type: application/json"

# Test with authentication
curl -X GET http://localhost:8001/api/auth/me \
  -H "Authorization: Bearer <jwt_token>"
```

## 📈 Performance

- **Compression**: Gzip compression enabled
- **Caching**: Request-level caching where appropriate
- **Database Indexing**: Optimized queries with proper indexes
- **Rate Limiting**: API rate limiting to prevent abuse

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

## 📝 Logging

The application uses Morgan for HTTP request logging:
- Development: Console logging with detailed information
- Production: File-based logging with error tracking

## 🔄 API Response Format

### Success Response
```json
{
  "data": {...},
  "message": "Success message"
}
```

### Error Response
```json
{
  "detail": "Error message",
  "code": "ERROR_CODE"
}
```

## 🚀 Deployment

### Production Environment Variables
```env
NODE_ENV=production
PORT=8001
MONGO_URL=mongodb://production-server/gate_exam
SECRET_KEY=strong-production-secret-key
CORS_ORIGINS=https://your-domain.com
```

### PM2 Deployment
```bash
# Install PM2
npm install -g pm2

# Start application
pm2 start server.js --name gate-exam-api

# Monitor
pm2 monit
```

## 📚 Additional Resources

- [Express.js Documentation](https://expressjs.com/)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [Mongoose Documentation](https://mongoosejs.com/)
- [JWT Documentation](https://jwt.io/)

---

**API Server Ready! 🚀**
