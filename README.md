# 🎯 GATE Exam Simulator

<div align="center">
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" />
</div>

<br />

A **comprehensive GATE (Graduate Aptitude Test in Engineering)** exam simulation platform featuring a modern React frontend with **pure black dark mode** and a robust Node.js/Express backend with MongoDB integration.

## ✨ Features

### 🎨 **UI/UX Excellence**
- **🌙 Pure Black Dark Mode**: Aesthetic dark theme with complete black background
- **📱 Responsive Design**: Seamless experience across all devices
- **⚡ Modern UI Components**: Built with Radix UI and Tailwind CSS
- **🎭 Smooth Animations**: Enhanced user experience with fluid transitions

### 🔐 **Authentication & Security**
- **🛡️ JWT Authentication**: Secure token-based authentication
- **👥 Role-based Access**: Student and Admin role management
- **🔒 Password Security**: bcrypt encryption with secure hashing

### 📚 **Exam Management**
- **📝 Question Bank**: Personal and shared question collections
- **🎯 Multiple Question Types**: MCQ, MSQ, and NAT support
- **⏱️ Real-time Exam Interface**: Timed sessions with auto-submission
- **📊 Comprehensive Analytics**: Detailed performance tracking
- **🔄 Exam History**: Track progress and retake exams

### 🛠️ **Admin Features**
- **📤 File Upload**: Import questions via CSV or PDF
- **⚙️ Exam Configuration**: Create and manage exam sessions
- **👨‍💼 User Management**: Monitor student progress and analytics
- **📈 Advanced Analytics**: Performance insights and reporting

### 🚀 **Technical Features**
- **🔄 Auto-save**: Draft preservation for questions and exams
- **🌐 RESTful API**: Clean and well-documented API endpoints
- **📱 Mobile Optimized**: Touch-friendly interface for mobile devices
- **🎨 Theme System**: Integrated light/dark mode with next-themes

## 🏗️ Architecture

```
GATE-Exam-Simulator/
├── frontend/          # React application
├── backend/           # Node.js/Express API
└── README.md         # This file
```

## 📋 Prerequisites

- Node.js (>=16.0.0)
- npm (>=8.0.0)
- MongoDB (running locally or remote)
- Git

## 🛠️ Installation & Setup

### 1. Clone the repository
```bash
git clone <repository-url>
cd APP-1
```

### 2. Install dependencies

**Backend:**
```bash
cd backend
npm install
```

**Frontend:**
```bash
cd ../frontend
npm install
```

### 3. Environment Configuration

Create `.env` file in the backend directory:
```bash
cd ../backend
cp .env.example .env  # or create manually
```

Update the `.env` file:
```env
PORT=8001
MONGO_URL=mongodb://localhost:27017/gate_exam
CORS_ORIGINS=http://localhost:3000
SECRET_KEY=your-secret-key-change-this
NODE_ENV=development
```

### 4. Start MongoDB

**Using Homebrew (macOS):**
```bash
brew services start mongodb-community
```

**Using systemctl (Linux):**
```bash
sudo systemctl start mongod
```

## 🚀 Running the Application

### Method 1: Manual Start (Recommended for Development)

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm start
```

### Method 2: Background Process

**Start Backend:**
```bash
cd backend
nohup npm run dev > backend.log 2>&1 &
```

**Start Frontend:**
```bash
cd frontend
nohup npm start > frontend.log 2>&1 &
```

### Method 3: Production Start

**Backend:**
```bash
cd backend
npm start
```

**Frontend (build and serve):**
```bash
cd frontend
npm run build
# Serve the build folder with a static server
```

## 🌐 Access URLs

- **Frontend Application**: http://localhost:3000
- **Backend API**: http://localhost:8001
- **API Documentation**: http://localhost:8001/api

## 📁 Project Structure

```
APP-1/
├── backend/
│   ├── server.js              # Main server file
│   ├── package.json           # Backend dependencies
│   ├── .env                   # Environment variables
│   ├── node_modules/          # Backend packages
│   └── README.md             # Backend documentation
├── frontend/
│   ├── src/                   # React source code
│   ├── public/                # Static assets
│   ├── package.json           # Frontend dependencies
│   ├── node_modules/          # Frontend packages
│   └── README.md             # Frontend documentation
└── README.md                 # Main documentation
```

## 🔧 Development Commands

**Backend:**
```bash
npm run dev     # Start with nodemon (auto-restart)
npm start       # Start production server
npm test        # Run tests
```

**Frontend:**
```bash
npm start       # Start development server
npm run build   # Create production build
npm test        # Run tests
```

## 🐛 Troubleshooting

### Backend Issues

1. **Port already in use (EADDRINUSE)**:
   ```bash
   lsof -i :8001
   kill -9 <PID>
   ```

2. **MongoDB connection failed**:
   ```bash
   # Check if MongoDB is running
   brew services list | grep mongodb
   # Start MongoDB if not running
   brew services start mongodb-community
   ```

3. **Dependencies issues**:
   ```bash
   cd backend
   rm -rf node_modules package-lock.json
   npm install
   ```

### Frontend Issues

1. **Build failures**:
   ```bash
   cd frontend
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **CORS errors**:
   - Ensure backend `.env` has correct `CORS_ORIGINS`
   - Check if backend is running on port 8001

### Common Solutions

```bash
# Kill all Node processes
pkill -f node

# Check running processes
ps aux | grep node

# Check port usage
lsof -i :3000
lsof -i :8001
```

## 📝 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### Exams
- `GET /api/exams` - List available exams
- `POST /api/exam/start/:examId` - Start exam session
- `GET /api/exam/question/:sessionId/:index` - Get question
- `POST /api/exam/answer/:sessionId` - Submit answer
- `POST /api/exam/submit/:sessionId` - Submit exam

### Admin
- `POST /api/admin/questions` - Create question
- `GET /api/admin/questions` - List questions
- `POST /api/admin/upload/csv` - Upload CSV questions

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 👥 Support

For support and questions:
- Create an issue in the repository
- Contact the development team

---

**Happy Coding! 🎉**
