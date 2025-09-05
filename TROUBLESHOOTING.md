# GATE Exam Simulator - Troubleshooting Guide

This document contains all errors encountered during development and their solutions.

## 🚨 Common Errors & Solutions

### 1. Authentication Failures (Login/Registration Failed)

#### **Error:** Frontend unable to connect to backend API
**Symptoms:**
- Login attempts fail silently
- Registration returns "Registration failed"
- Network requests timeout or return connection errors

**Root Cause:**
Frontend was configured to connect to wrong backend URL

**Solution:**
```bash
# Check frontend environment file
cat frontend/.env
# Should contain: REACT_APP_BACKEND_URL=http://localhost:8001

# If wrong, fix it:
echo "REACT_APP_BACKEND_URL=http://localhost:8001" > frontend/.env

# Restart React development server
cd frontend
pkill -f "react-scripts|npm.*start"
npm start
```

**Prevention:**
- Always verify frontend `.env` matches backend URL
- Restart React server after changing environment variables

---

### 2. MongoDB Connection Error: "bufferMaxEntries is not supported"

#### **Error:** 
```
MongoParseError: option buffermaxentries is not supported
```

**Root Cause:**
Using deprecated MongoDB connection options in newer versions of MongoDB driver

**Solution:**
```javascript
// In server.js, remove deprecated option:
// OLD (causes error):
mongoose.connect(MONGO_URL, {
  dbName: DB_NAME,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  bufferCommands: false,
  bufferMaxEntries: 0  // ❌ This is deprecated
});

// NEW (fixed):
mongoose.connect(MONGO_URL, {
  dbName: DB_NAME,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  bufferCommands: false  // ✅ Remove bufferMaxEntries
});
```

**Prevention:**
- Keep MongoDB driver updated
- Review deprecation warnings in logs
- Test connection options with latest MongoDB versions

---

### 3. Missing JWT Secret Key

#### **Error:**
```
TypeError: Cannot read property 'SECRET_KEY' of undefined
```

**Root Cause:**
Backend environment file missing required `SECRET_KEY` variable

**Solution:**
```bash
# Add to backend/.env
echo "SECRET_KEY=your-development-secret-key-change-in-production" >> backend/.env
echo "NODE_ENV=development" >> backend/.env

# Restart backend server
pkill -f "node.*server.js"
npm run dev
```

**Prevention:**
- Use `.env.example` template
- Validate all required environment variables on startup

---

### 4. MongoDB Service Not Running

#### **Error:**
```
MongoNetworkError: connect ECONNREFUSED 127.0.0.1:27017
```

**Root Cause:**
MongoDB service is not started

**Solution:**
```bash
# On macOS with Homebrew:
brew services start mongodb-community

# On Linux:
sudo systemctl start mongod

# Verify connection:
mongosh --eval "db.runCommand('ping')"
# Should return: { ok: 1 }
```

**Prevention:**
- Add MongoDB to system startup services
- Create health check endpoint to verify DB connection

---

### 5. Port Already in Use

#### **Error:**
```
Error: listen EADDRINUSE: address already in use :::8001
Error: listen EADDRINUSE: address already in use :::3000
```

**Root Cause:**
Previous server instances still running

**Solution:**
```bash
# Check what's using the ports
lsof -i :8001  # Backend
lsof -i :3000  # Frontend

# Kill processes
pkill -f "node.*server.js"  # Backend
pkill -f "react-scripts"    # Frontend

# Or kill by PID
kill -9 <PID>

# Restart servers
cd backend && npm run dev
cd frontend && npm start
```

**Prevention:**
- Use process managers like PM2
- Implement graceful shutdown handlers

---

### 6. CORS (Cross-Origin) Errors

#### **Error:**
```
Access to fetch at 'http://localhost:8001/api/auth/login' from origin 'http://localhost:3000' has been blocked by CORS policy
```

**Root Cause:**
Backend CORS not configured for frontend origin

**Solution:**
```javascript
// In server.js, ensure CORS is properly configured:
app.use(cors({
  origin: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : '*',
  credentials: true
}));

// In backend/.env, add:
CORS_ORIGINS=http://localhost:3000,http://192.168.1.5:3000
```

**Prevention:**
- Configure CORS for all development and production origins
- Test cross-origin requests during development

---

### 7. Frontend Environment Variables Not Loading

#### **Error:**
Frontend makes requests to `undefined/api/auth/login`

**Root Cause:**
React environment variables must be prefixed with `REACT_APP_`

**Solution:**
```bash
# In frontend/.env (correct):
REACT_APP_BACKEND_URL=http://localhost:8001

# NOT (incorrect):
BACKEND_URL=http://localhost:8001

# Restart React server after changes
```

**Prevention:**
- Always prefix React env vars with `REACT_APP_`
- Validate environment variables in app startup

---

## 🔧 Quick Diagnosis Commands

### Check System Status
```bash
# Check if services are running
lsof -i :8001 -i :3000  # Both backend and frontend
brew services list | grep mongodb  # MongoDB status
ps aux | grep node  # Node processes

# Test backend API
curl http://localhost:8001/api/auth/login -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# Test MongoDB
mongosh --eval "db.runCommand('ping')"
```

### View Logs
```bash
# Backend logs (if running with nohup)
tail -f backend/server.log

# Frontend logs
tail -f backend/frontend.log

# MongoDB logs (macOS)
tail -f /usr/local/var/log/mongodb/mongo.log
```

### Environment Check
```bash
# Verify environment files exist
ls -la backend/.env frontend/.env

# Check environment variables
cd backend && node -e "require('dotenv').config(); console.log(process.env)"
```

## 🛠️ Development Best Practices

### 1. Start Development Environment
```bash
# Terminal 1 - Start MongoDB
brew services start mongodb-community

# Terminal 2 - Start Backend
cd backend
npm run dev

# Terminal 3 - Start Frontend  
cd frontend
npm start
```

### 2. Clean Restart (if issues persist)
```bash
# Kill all processes
pkill -f "node\|mongo"

# Clear dependencies (if needed)
rm -rf backend/node_modules frontend/node_modules
cd backend && npm install
cd frontend && npm install

# Restart all services
brew services restart mongodb-community
cd backend && npm run dev
cd frontend && npm start
```

### 3. Health Check Endpoints
Always verify these URLs work:
- Backend: `http://localhost:8001/api/auth/login`
- Frontend: `http://localhost:3000`
- MongoDB: `mongosh --eval "db.runCommand('ping')"`

## 📝 Environment Files Template

### Backend `.env`
```env
PORT=8001
MONGO_URL=mongodb://localhost:27017/gate_exam
CORS_ORIGINS=http://localhost:3000,http://192.168.1.5:3000
SECRET_KEY=your-development-secret-key-change-in-production
NODE_ENV=development
```

### Frontend `.env`
```env
REACT_APP_BACKEND_URL=http://localhost:8001
```

## 🆘 Emergency Reset

If all else fails, complete system reset:

```bash
# 1. Stop everything
pkill -f node
brew services stop mongodb-community

# 2. Clean install
rm -rf node_modules package-lock.json
npm install

# 3. Reset database (⚠️  destroys data)
mongosh gate_exam --eval "db.dropDatabase()"

# 4. Restart services
brew services start mongodb-community
npm run dev
```

---

## 📦 Dependency Management & Security

### Current Vulnerabilities (Frontend)

#### **High Priority Fixes Needed:**

1. **react-scripts** - Currently using v5.0.1
   - **Issue**: Multiple security vulnerabilities in dependencies
   - **Impact**: nth-check, postcss, webpack-dev-server vulnerabilities
   - **Solution**: Upgrade carefully due to breaking changes

2. **nth-check** - Inefficient regex complexity
   - **Severity**: High
   - **Fix**: Update via react-scripts upgrade

3. **webpack-dev-server** - Source code exposure risk
   - **Severity**: Moderate
   - **Impact**: Development security concern

### Safe Dependency Updates

#### **Backend (Low Risk Updates)**
```bash
cd backend

# Safe minor updates:
npm update dotenv express-rate-limit eslint-config-prettier

# Check for major version compatibility:
npm info express@latest  # v5.x has breaking changes
npm info joi@latest      # v18.x may have breaking changes
npm info bcryptjs@latest # v3.x has breaking changes
```

#### **Frontend (Medium Risk Updates)**
```bash
cd frontend

# Safe updates (no breaking changes):
npm update lucide-react sonner tailwind-merge

# Careful updates (potential breaking changes):
npm update react@18.3.1 react-dom@18.3.1  # Don't go to v19 yet
npm update react-router-dom@6.28.0         # Don't go to v7 yet
npm update tailwindcss@3.4.14             # Don't go to v4 yet
```

### Security Audit & Fix Strategy

#### **Immediate Actions (Do Now):**
```bash
# 1. Check current vulnerabilities
cd frontend && npm audit
cd backend && npm audit

# 2. Fix non-breaking vulnerabilities
cd frontend && npm audit fix
cd backend && npm audit fix

# 3. Update PostCSS (safe fix)
cd frontend
npm install postcss@^8.4.31
```

#### **Planned Updates (Test First):**
```bash
# 1. Upgrade React Scripts (Breaking Change)
# TEST IN SEPARATE BRANCH FIRST
cd frontend
npm install react-scripts@latest
# This will require testing all components

# 2. Major version updates (Breaking Changes)
# TEST THOROUGHLY
npm install express@5.0.0          # Backend
npm install react@19.0.0           # Frontend
npm install tailwindcss@4.0.0      # Frontend
```

### Dependency Monitoring Setup

#### **Regular Maintenance Commands:**
```bash
# Weekly security check
npm audit

# Monthly dependency updates
npm outdated
npm update

# Quarterly major version review
npm outdated | grep -E "(Major|Breaking)"
```

#### **Automated Security Monitoring:**
Add to `.github/workflows/security.yml`:
```yaml
name: Security Audit
on:
  schedule:
    - cron: '0 0 * * 1'  # Weekly
jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Audit Backend
        run: cd backend && npm audit
      - name: Audit Frontend  
        run: cd frontend && npm audit
```

### Safe Update Priority Order

#### **Phase 1 (Safe - Do Immediately):**
- ✅ PostCSS to v8.4.31+ (security fix)
- ✅ Lucide-react, sonner (minor updates)
- ✅ ESLint config, dotenv (dev dependencies)

#### **Phase 2 (Test Required - Next Sprint):**
- ⚠️  React Scripts to v5.0.2+ (vulnerability fixes)
- ⚠️  Webpack-dev-server via React Scripts update
- ⚠️  Express rate limit to v8.x

#### **Phase 3 (Major Changes - Future):**
- 🔴 Express v5.x (breaking changes)
- 🔴 React v19.x (breaking changes)
- 🔴 Tailwind v4.x (breaking changes)
- 🔴 React Router v7.x (breaking changes)

### Dependency Lock Strategy

#### **Production Dependencies:**
```json
// In package.json, use exact versions for critical deps:
{
  "dependencies": {
    "express": "4.21.1",     // Exact version
    "react": "18.3.1",       // Exact version
    "mongoose": "~8.8.1"     // Patch updates only
  }
}
```

#### **Development Workflow:**
```bash
# 1. Test updates in development
npm update --dry-run

# 2. Update package-lock.json
npm install

# 3. Test thoroughly
npm test
npm run build

# 4. Commit lock file changes
git add package-lock.json
git commit -m "Update dependencies"
```

### Breaking Change Migration Guide

#### **React Scripts v5 → v6+ Migration:**
```bash
# 1. Backup current working version
git commit -am "Backup before react-scripts upgrade"

# 2. Update gradually
npm install react-scripts@latest

# 3. Check for breaking changes
npm start  # Look for console errors
npm run build  # Check build process

# 4. Fix common issues:
# - Update import statements
# - Update webpack config (if using craco)
# - Update test configurations
```

#### **Express v4 → v5 Migration:**
```bash
# Major changes to expect:
# - Router.use() signature changes
# - Error handling middleware changes
# - Removed deprecated methods

# Migration steps:
# 1. Review Express v5 migration guide
# 2. Update middleware signatures
# 3. Update error handlers
# 4. Test all API endpoints
```

---

*Last updated: September 2025*
*For additional help, check server logs or contact the development team*
