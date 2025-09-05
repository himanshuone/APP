# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

**GATE Exam Simulator** - A comprehensive examination simulation platform featuring a React frontend with pure black dark mode and a Node.js/Express backend with MongoDB integration. The system supports JWT authentication, role-based access (student/admin), real-time exam sessions, and comprehensive analytics.

## Development Commands

### Prerequisites
- Node.js (>=16.0.0)
- npm (>=8.0.0) 
- MongoDB (running locally or remote)

### Environment Setup
```bash
# Copy environment template
cp .env.example .env

# Backend environment (.env file in backend/ directory)
PORT=8001
MONGO_URL=mongodb://localhost:27017/gate_exam
CORS_ORIGINS=http://localhost:3000
SECRET_KEY=your-secret-key-change-this
NODE_ENV=development
```

### MongoDB Commands
```bash
# Start MongoDB (macOS with Homebrew)
brew services start mongodb-community

# Start MongoDB (Linux)
sudo systemctl start mongod

# Verify MongoDB connection
mongosh
```

### Backend Development
```bash
cd backend

# Install dependencies
npm install

# Development server (with auto-restart)
npm run dev

# Production server
npm start

# Testing
npm test                    # Run all tests
npm run test:watch         # Watch mode
npm run test:coverage      # Generate coverage report

# Code Quality
npm run lint               # ESLint check
npm run lint:fix          # ESLint auto-fix
npm run format            # Prettier formatting
npm run validate          # Lint + test combined

# Docker (if needed)
npm run docker:build      # Build Docker image
npm run docker:run        # Run containerized app
```

### Frontend Development
```bash
cd frontend

# Install dependencies
npm install

# Development server
npm start                  # Starts on http://localhost:3000

# Production build
npm run build

# Testing
npm test                   # Run React tests
```

### Running Full Application
```bash
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend  
cd frontend && npm start
```

### Common Debugging Commands
```bash
# Check port usage
lsof -i :3000              # Frontend port
lsof -i :8001              # Backend port

# Kill processes if needed
pkill -f node

# Clear dependencies
rm -rf node_modules package-lock.json && npm install
```

## Code Architecture

### Monorepo Structure
```
APP-1/
├── backend/               # Node.js/Express API server
├── frontend/              # React application  
└── README.md             # Main documentation
```

### Backend Architecture (`/backend`)

**Core Components:**
- **Single-file server**: `server.js` - Complete Express application with embedded models, routes, and middleware (~1200 lines)
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT-based with bcrypt password hashing
- **File Processing**: CSV parsing and PDF text extraction for question imports
- **Security**: Helmet, CORS, rate limiting, input validation with Joi/express-validator

**Key Models:**
- `User` - Authentication & role management (student/admin)
- `Question` - Exam questions with MCQ/MSQ/NAT support  
- `ExamConfig` - Exam templates and configuration
- `ExamSession` - Active exam instances with real-time state
- `ExamResult` - Performance analytics and scoring

**API Endpoints:**
- `/api/auth/*` - Registration, login, user profile
- `/api/exams/*` - Exam listing and management
- `/api/exam/*` - Exam session handling (start, questions, answers, submit)
- `/api/admin/*` - Administrative functions (question management, CSV/PDF upload)

### Frontend Architecture (`/frontend`)

**Technology Stack:**
- **Framework**: React 18 with functional components and hooks
- **Routing**: React Router DOM v6
- **Styling**: Tailwind CSS with custom pure-black dark theme
- **UI Components**: Radix UI primitives + shadcn/ui component system
- **State Management**: React hooks (useState, useEffect, useContext)
- **HTTP Client**: Axios with custom interceptors
- **Build Tool**: Craco (Create React App + custom config)

**Key Structure:**
- `src/App.js` - Main application component (~3000 lines) with embedded routing and state
- `src/components/ui/` - Reusable shadcn/ui components
- `src/hooks/` - Custom React hooks
- `src/lib/` - Utility functions and helpers

**Core Features:**
- **Authentication Flow**: Login/register with JWT token management
- **Exam Interface**: Timer, question navigation, auto-save, status tracking
- **Admin Panel**: Question management, CSV upload, user analytics  
- **Responsive Design**: Mobile-optimized exam interface
- **Theme System**: Dark mode with next-themes integration

### Key Architectural Patterns

**Backend Patterns:**
- **Monolithic Express App**: Single `server.js` with embedded routes and models
- **Schema-First Design**: Mongoose schemas define data structure and validation
- **Middleware Chain**: Authentication, validation, error handling as Express middleware
- **Stateful Sessions**: Exam state maintained in database with real-time updates

**Frontend Patterns:**
- **Component Composition**: Radix UI primitives composed into complex interfaces
- **Hook-based State**: Custom hooks for authentication, exam state, API calls
- **Route-based Architecture**: React Router with protected routes and role guards
- **Responsive-First**: Tailwind CSS with mobile-first breakpoints

### Data Flow

**Exam Session Lifecycle:**
1. **Start**: `POST /api/exam/start/:examId` → Creates ExamSession with question randomization
2. **Navigation**: `GET /api/exam/question/:sessionId/:index` → Fetches question with state
3. **Answer**: `POST /api/exam/answer/:sessionId` → Saves answer with auto-save  
4. **Submit**: `POST /api/exam/submit/:sessionId` → Calculates results and stores ExamResult

**Authentication Flow:**
1. **Login**: Credentials → JWT token → Local storage → Axios headers
2. **Protected Routes**: Token validation middleware on backend + route guards on frontend
3. **Role-based Access**: Admin vs Student permissions for different endpoints

### Development Considerations

**Testing Strategy:**
- Backend: Jest with Supertest for API integration tests
- Frontend: React Testing Library for component tests
- No end-to-end tests currently configured

**Security Measures:**
- Password hashing with bcrypt (salt rounds: 12)
- JWT tokens with 30-minute expiration
- Rate limiting (200 requests/minute per IP)
- Input validation with Joi schemas
- MongoDB injection protection with express-mongo-sanitize
- XSS protection with xss-clean

**Performance Optimizations:**
- Gzip compression on Express responses
- MongoDB indexing on frequently queried fields
- Lazy loading of exam questions
- Auto-save with debouncing to prevent excessive API calls

**Error Handling:**
- Global error middleware on Express
- Structured error responses with consistent format
- Frontend error boundaries (should be implemented)
- Logging with Morgan (HTTP requests) and Winston (application logs)

### File Upload System

**CSV Question Import:**
- Endpoint: `POST /api/admin/upload/csv`
- Format: Structured columns for question_text, type, subject, options, etc.
- Processing: csv-parser with validation and bulk MongoDB insert
- Sample provided in `backend/sample_questions.csv`

**PDF Processing:**
- Endpoint: `POST /api/admin/upload/pdf`
- Uses pdf-parse library for text extraction
- Requires manual question formatting post-extraction

### Customization Notes

**Theme System:**
- Pure black background (#000000) for dark mode aesthetic
- Tailwind CSS custom color palette in `tailwind.config.js`
- next-themes for seamless dark/light mode switching

**Question Types:**
- **MCQ**: Single correct answer from 4 options
- **MSQ**: Multiple correct answers (partial scoring)
- **NAT**: Numerical answer type (exact match validation)

**Scoring Algorithm:**
- Correct: +full marks
- Incorrect: -negative marks (default 0.33 for MCQ)
- Unattempted: 0 marks
- Subject-wise breakdown maintained in results
