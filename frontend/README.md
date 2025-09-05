# GATE Exam Simulator - Local Setup Guide

A comprehensive GATE (Graduate Aptitude Test in Engineering) exam simulator with Node.js/Express backend and React frontend.

## 🚀 Prerequisites

Make sure you have these installed:

- **Node.js** (v16 or higher) - [Download here](https://nodejs.org/)
- **MongoDB** (v4.4 or higher) - [Download here](https://www.mongodb.com/try/download/community)
- **Git** - [Download here](https://git-scm.com/)
- **Yarn** (recommended) or npm

## 📥 Download the Project

### Option A: Clone from repository (if available)

```bash
git clone <your-repo-url>
cd gate-exam-simulator
```

### Option B: Create the project structure manually

```bash
mkdir gate-exam-simulator
cd gate-exam-simulator
mkdir backend frontend
```

## 🔧 Backend Setup (Node.js/Express)

### 1. Create backend structure:

```bash
cd backend
```

### 2. Create package.json:

```json
{
  "name": "gate-exam-backend",
  "version": "1.0.0",
  "description": "GATE Exam Simulator Backend - Node.js/Express",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "test": "jest"
  },
  "dependencies": {
    "express": "^4.18.2",
    "mongoose": "^8.0.3",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2",
    "multer": "^1.4.5-lts.1",
    "pdf-parse": "^1.1.1",
    "csv-parser": "^3.0.0",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "dotenv": "^16.3.1",
    "joi": "^17.11.0",
    "express-rate-limit": "^7.1.5",
    "express-validator": "^7.0.1",
    "morgan": "^1.10.0",
    "compression": "^1.7.4"
  },
  "devDependencies": {
    "nodemon": "^3.0.2"
  }
}
```

### 3. Install dependencies:

```bash
yarn install
# or npm install
```

### 4. Create .env file:

```bash
# backend/.env
MONGO_URL=mongodb://localhost:27017
DB_NAME=gate_exam
CORS_ORIGINS=http://localhost:3000
SECRET_KEY=your-secret-key-change-in-production
NODE_ENV=development
PORT=8001
```

### 5. Copy the server.js file (the complete Node.js backend code)

## ⚛️ Frontend Setup (React)

### 1. Navigate to frontend directory:

```bash
cd ../frontend
```

### 2. Create React app:

```bash
npx create-react-app . --template cra-template
```

### 3. Install additional dependencies:

```bash
yarn add @radix-ui/react-accordion @radix-ui/react-alert-dialog @radix-ui/react-aspect-ratio @radix-ui/react-avatar @radix-ui/react-checkbox @radix-ui/react-collapsible @radix-ui/react-context-menu @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-hover-card @radix-ui/react-label @radix-ui/react-menubar @radix-ui/react-navigation-menu @radix-ui/react-popover @radix-ui/react-progress @radix-ui/react-radio-group @radix-ui/react-scroll-area @radix-ui/react-select @radix-ui/react-separator @radix-ui/react-slider @radix-ui/react-slot @radix-ui/react-switch @radix-ui/react-tabs @radix-ui/react-toast @radix-ui/react-toggle @radix-ui/react-toggle-group @radix-ui/react-tooltip axios class-variance-authority clsx cmdk date-fns embla-carousel-react input-otp lucide-react next-themes react-day-picker react-hook-form react-resizable-panels react-router-dom sonner tailwind-merge tailwindcss-animate vaul zod

yarn add -D @craco/craco autoprefixer postcss tailwindcss
```

### 4. Create frontend/.env:

```bash
# frontend/.env
REACT_APP_BACKEND_URL=http://localhost:8001
```

### 5. Setup Tailwind CSS - Create tailwind.config.js:

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
    "./app/**/*.{js,jsx}",
    "./src/**/*.{js,jsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
```

### 6. Create craco.config.js:

```javascript
module.exports = {
  style: {
    postcss: {
      plugins: [require("tailwindcss"), require("autoprefixer")],
    },
  },
};
```

### 7. Update package.json scripts:

```json
{
  "scripts": {
    "start": "craco start",
    "build": "craco build",
    "test": "craco test"
  }
}
```

### 8. You'll need to:

- Copy the complete React App.js code
- Copy the App.css code
- Set up the shadcn/ui components folder structure

## 🎨 Shadcn/UI Components Setup

### 1. Create the components folder structure:

```bash
mkdir -p src/components/ui
mkdir -p src/hooks
```

### 2. Essential components to add:

- `src/components/ui/button.jsx`
- `src/components/ui/card.jsx`
- `src/components/ui/input.jsx`
- `src/components/ui/label.jsx`
- `src/components/ui/dialog.jsx`
- `src/components/ui/tabs.jsx`
- `src/components/ui/progress.jsx`
- `src/components/ui/badge.jsx`
- `src/components/ui/checkbox.jsx`
- `src/components/ui/radio-group.jsx`
- `src/components/ui/select.jsx`
- `src/components/ui/alert.jsx`
- `src/components/ui/sonner.jsx`
- `src/hooks/use-toast.js`

## 🗄️ Database Setup

### Start MongoDB:

**On macOS with Homebrew:**

```bash
brew services start mongodb-community
```

**On Windows:**

```bash
net start MongoDB
```

**On Linux:**

```bash
sudo systemctl start mongod
```

### Verify MongoDB is running:

```bash
mongosh
# Should connect to MongoDB shell
```

## 🚀 Running the Application

### Terminal 1 - Backend:

```bash
cd backend
yarn dev
# or npm run dev

# Should see:
# 🚀 GATE Exam Simulator API running on port 8001
# Connected to MongoDB
```

### Terminal 2 - Frontend:

```bash
cd frontend
yarn start
# or npm start

# Should open browser at http://localhost:3000
```

## 🧪 Test the Application

1. Open browser: http://localhost:3000
2. Register as admin:
   - Email: admin@test.com
   - Password: admin123
   - Role: admin
3. Access admin panel and upload questions via CSV
4. Register as student and take exams

## 📊 Sample CSV for Testing

Create a file `sample_questions.csv`:

```csv
question_text,type,subject,topic,option_1,option_1_correct,option_2,option_2_correct,option_3,option_3_correct,option_4,option_4_correct,marks,negative_marks,explanation
"What is the time complexity of binary search?",MCQ,Computer Science,Algorithms,"O(n)",false,"O(log n)",true,"O(n²)",false,"O(1)",false,2,0.66,"Binary search divides search space in half"
"Which data structure follows LIFO?",MCQ,Computer Science,Data Structures,"Queue",false,"Stack",true,"Array",false,"Tree",false,1,0.33,"Stack follows Last In First Out principle"
"What is 25 + 15?",NAT,Mathematics,Arithmetic,"","","","","","","","",1,0,"Simple addition"
```

## 🔧 Troubleshooting

### Common Issues:

**MongoDB connection error:**

```bash
# Make sure MongoDB is running
brew services start mongodb-community
# or
sudo systemctl start mongod
```

**Port conflicts:**

```bash
# Change ports in .env files if needed
# Backend: PORT=8002
# Frontend: PORT=3001
```

**Missing dependencies:**

```bash
# Re-install dependencies
yarn install
# or npm install
```

**CORS issues:**

```bash
# Update backend/.env
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
```

## 💡 Development Tips

- **Hot reload**: Both frontend and backend support hot reload during development
- **API testing**: Use tools like Postman to test backend APIs at http://localhost:8001/api
- **Database GUI**: Use MongoDB Compass to view your database
- **Logs**: Check terminal outputs for any errors

## 📝 Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

### `npm test`

Launches the test runner in the interactive watch mode.

### `npm run build`

Builds the app for production to the `build` folder.

## 🎉

That's it! You should now have the complete GATE Exam Simulator running locally with Node.js/Express backend and React frontend. The application includes full authentication, admin panel, question management, and exam taking functionality!
