import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import './App.css';

// Components
import { Button } from './components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Badge } from './components/ui/badge';
import { Progress } from './components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Alert, AlertDescription } from './components/ui/alert';
import { Textarea } from './components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
import { Checkbox } from './components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from './components/ui/radio-group';
import { toast } from 'sonner';
import { Toaster } from './components/ui/sonner';

// Icons
import { 
  Clock, 
  User, 
  BookOpen, 
  BarChart, 
  Upload, 
  Plus, 
  Edit, 
  Trash2, 
  FileText,
  CheckCircle,
  AlertCircle,
  Flag,
  Play,
  LogOut,
  Settings,
  Home,
  Moon,
  Sun,
  Share2,
  Users,
  Eye,
  ChevronDown,
  ChevronUp,
  X,
  Check,
  Minus,
  FileQuestion
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Auth Context
const AuthContext = createContext();

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUser();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUser = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`);
      setUser(response.data);
    } catch (error) {
      localStorage.removeItem('token');
      delete axios.defaults.headers.common['Authorization'];
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await axios.post(`${API}/auth/login`, { email, password });
      const { access_token } = response.data;
      
      localStorage.setItem('token', access_token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      
      await fetchUser();
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Login failed' 
      };
    }
  };

  const register = async (userData) => {
    try {
      await axios.post(`${API}/auth/register`, userData);
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Registration failed' 
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
  };

  const value = {
    user,
    login,
    register,
    logout,
    loading
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Theme Context
const ThemeContext = createContext();

const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'light';
  });

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

// Login Component
const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    const result = await login(formData.email, formData.password);
    
    if (result.success) {
      toast.success('Login successful!');
      navigate('/dashboard');
    } else {
      toast.error(result.error);
    }
    
    setIsLoading(false);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md backdrop-blur-sm bg-white/10 border-white/20">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-white">GATE Exam Simulator</CardTitle>
          <CardDescription className="text-slate-300">
            Sign in to access your exam portal
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email" className="text-white">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="bg-white/10 border-white/20 text-white placeholder:text-slate-400"
                placeholder="Enter your email"
              />
            </div>
            <div>
              <Label htmlFor="password" className="text-white">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={handleChange}
                className="bg-white/10 border-white/20 text-white placeholder:text-slate-400"
                placeholder="Enter your password"
              />
            </div>
            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              disabled={isLoading}
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <p className="text-slate-300">
              Don't have an account?{' '}
              <Button variant="link" className="text-blue-400 p-0 h-auto" onClick={() => navigate('/register')}>
                Register here
              </Button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Register Component
const Register = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'student'
  });
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    const result = await register(formData);
    
    if (result.success) {
      toast.success('Registration successful! Please login.');
      navigate('/login');
    } else {
      toast.error(result.error);
    }
    
    setIsLoading(false);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md backdrop-blur-sm bg-white/10 border-white/20">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-white">Create Account</CardTitle>
          <CardDescription className="text-slate-300">
            Join the GATE preparation platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="full_name" className="text-white">Full Name</Label>
              <Input
                id="full_name"
                name="full_name"
                required
                value={formData.full_name}
                onChange={handleChange}
                className="bg-white/10 border-white/20 text-white placeholder:text-slate-400"
                placeholder="Enter your full name"
              />
            </div>
            <div>
              <Label htmlFor="email" className="text-white">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="bg-white/10 border-white/20 text-white placeholder:text-slate-400"
                placeholder="Enter your email"
              />
            </div>
            <div>
              <Label htmlFor="password" className="text-white">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={handleChange}
                className="bg-white/10 border-white/20 text-white placeholder:text-slate-400"
                placeholder="Create a password"
              />
            </div>
            <div>
              <Label htmlFor="role" className="text-white">Role</Label>
              <Select value={formData.role} onValueChange={(value) => setFormData({...formData, role: value})}>
                <SelectTrigger className="bg-white/10 border-white/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              disabled={isLoading}
            >
              {isLoading ? 'Creating account...' : 'Create Account'}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <p className="text-slate-300">
              Already have an account?{' '}
              <Button variant="link" className="text-blue-400 p-0 h-auto" onClick={() => navigate('/login')}>
                Sign in here
              </Button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Dashboard Component
const Dashboard = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [examHistory, setExamHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExams();
    fetchExamHistory();
  }, []);

  const fetchExams = async () => {
    try {
      const response = await axios.get(`${API}/exams`);
      setExams(response.data);
    } catch (error) {
      toast.error('Failed to fetch exams');
    }
  };

  const fetchExamHistory = async () => {
    try {
      const response = await axios.get(`${API}/exam-history`);
      setExamHistory(response.data);
    } catch (error) {
      toast.error('Failed to fetch exam history');
    } finally {
      setLoading(false);
    }
  };

  const startExam = async (examId) => {
    try {
      const response = await axios.post(`${API}/exam/start/${examId}`);
      navigate(`/exam/${response.data.id}`);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to start exam');
    }
  };

  const isExamCompleted = (examId) => {
    return examHistory.some(history => history.exam_config_id === examId);
  };

  const getExamHistory = (examId) => {
    return examHistory.filter(history => history.exam_config_id === examId);
  };

  const availableExams = exams.filter(exam => !isExamCompleted(exam.id));
  const completedExams = exams.filter(exam => isExamCompleted(exam.id));

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <BookOpen className="h-8 w-8 text-blue-600" />
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">GATE Simulator</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant={user?.role === 'admin' ? 'default' : 'secondary'}>
                {user?.role?.toUpperCase()}
              </Badge>
              <span className="text-gray-600 dark:text-gray-300">{user?.full_name}</span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={toggleTheme}
                title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              >
                {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate('/questions')}
              >
                <BookOpen className="h-4 w-4 mr-2" />
                Question Bank
              </Button>
              {user?.role === 'admin' && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate('/admin')}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Admin Panel
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={logout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">GATE Exam Dashboard</h2>
          <p className="text-gray-600 dark:text-gray-400">Track your progress and continue your GATE preparation</p>
        </div>

        {/* Available Exams Section */}
        <div className="mb-12">
          <h3 className="text-2xl font-semibold text-slate-900 dark:text-white mb-6">Available Exams</h3>
          {availableExams.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <FileText className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                <h4 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">No New Exams Available</h4>
                <p className="text-slate-600 dark:text-blue-200 mb-4">
                  {user?.role === 'admin' 
                    ? 'Create your first exam configuration to get started.'
                    : completedExams.length > 0 
                      ? 'You have completed all available exams. Check the completed section below to retake any exam.'
                      : 'Please contact your administrator to set up exams.'
                  }
                </p>
                {user?.role === 'admin' && (
                  <Button onClick={() => navigate('/admin')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Exam
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {availableExams.map((exam) => (
                <Card key={exam.id} className="hover:shadow-lg transition-shadow dark:bg-gray-800 dark:border-gray-700">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      {exam.name}
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="text-green-600 border-green-300">
                          New
                        </Badge>
                        <Badge variant="outline">
                          <Clock className="h-3 w-3 mr-1" />
                          {exam.duration_minutes}m
                        </Badge>
                      </div>
                    </CardTitle>
                    <CardDescription>{exam.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Questions:</span>
                        <span className="font-medium dark:text-white">{exam.total_questions}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Subjects:</span>
                        <span className="font-medium dark:text-white">{exam.subjects.join(', ')}</span>
                      </div>
                      <Button 
                        className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 dark:from-green-500 dark:to-emerald-500 dark:hover:from-green-400 dark:hover:to-emerald-400 transition-all duration-300 hover:shadow-lg dark:hover:shadow-green-500/20"
                        onClick={() => startExam(exam.id)}
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Start Exam
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Completed Exams Section */}
        {completedExams.length > 0 && (
          <div>
            <h3 className="text-2xl font-semibold text-slate-900 dark:text-white mb-6">Completed Exams</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {completedExams.map((exam) => {
                const history = getExamHistory(exam.id);
                const latestAttempt = history.sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at))[0];
                
                return (
                  <Card key={exam.id} className="hover:shadow-lg transition-all duration-300 border-2 border-blue-200 dark:border-blue-500/30 dark:bg-gradient-to-br dark:from-gray-800/50 dark:to-gray-900/50 dark:hover:border-blue-400/50 dark:hover:shadow-blue-500/20">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        {exam.name}
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className="text-blue-600 border-blue-300">
                            Completed
                          </Badge>
                          <Badge variant="outline">
                            <Clock className="h-3 w-3 mr-1" />
                            {exam.duration_minutes}m
                          </Badge>
                        </div>
                      </CardTitle>
                      <CardDescription>{exam.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600 dark:text-slate-300">Last Score:</span>
                          <span className="font-medium text-blue-600">{latestAttempt?.percentage.toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600 dark:text-slate-300">Attempts:</span>
                          <span className="font-medium">{history.length}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600 dark:text-slate-300">Best Score:</span>
                          <span className="font-medium text-green-600">
                            {Math.max(...history.map(h => h.percentage)).toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex space-x-2">
                          <Button 
                            className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                            onClick={() => startExam(exam.id)}
                          >
                            <Play className="h-4 w-4 mr-2" />
                            Start Again
                          </Button>
                          <Button 
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/results/${latestAttempt.session_id}`)}
                          >
                            <BarChart className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

// Exam Creation Form Component
const ExamCreationForm = ({ onExamCreated }) => {
  const EXAM_STORAGE_KEY = 'examCreateForm';
  
  // Load saved exam form data from localStorage
  const loadSavedExamData = () => {
    try {
      const saved = localStorage.getItem(EXAM_STORAGE_KEY);
      if (saved) {
        const parsedData = JSON.parse(saved);
        return {
          name: '',
          description: '',
          duration_minutes: 180,
          total_questions: 10,
          subjects: [],
          ...parsedData
        };
      }
    } catch (error) {
      console.error('Error loading saved exam data:', error);
    }
    return {
      name: '',
      description: '',
      duration_minutes: 180,
      total_questions: 10,
      subjects: []
    };
  };
  
  const [formData, setFormData] = useState(loadSavedExamData);
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [hasUnsavedExamChanges, setHasUnsavedExamChanges] = useState(false);

  useEffect(() => {
    fetchAvailableSubjects();
  }, []);

  // Auto-save exam form data
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(EXAM_STORAGE_KEY, JSON.stringify(formData));
        if (formData.name.trim() || formData.description.trim()) {
          setHasUnsavedExamChanges(true);
        }
      } catch (error) {
        console.error('Error saving exam form data:', error);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [formData, EXAM_STORAGE_KEY]);

  const fetchAvailableSubjects = async () => {
    try {
      const response = await axios.get(`${API}/admin/questions`);
      const subjects = [...new Set(response.data.map(q => q.subject))];
      setAvailableSubjects(subjects);
    } catch (error) {
      console.error('Failed to fetch subjects:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'duration_minutes' || name === 'total_questions' ? parseInt(value) : value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubjectChange = (subject) => {
    setFormData(prev => ({
      ...prev,
      subjects: prev.subjects.includes(subject)
        ? prev.subjects.filter(s => s !== subject)
        : [...prev.subjects, subject]
    }));
    if (errors.subjects) {
      setErrors(prev => ({ ...prev, subjects: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Exam name is required';
    }
    
    if (!formData.description.trim()) {
      newErrors.description = 'Exam description is required';
    }
    
    if (formData.total_questions < 1) {
      newErrors.total_questions = 'Total questions must be at least 1';
    }
    
    if (formData.duration_minutes < 1) {
      newErrors.duration_minutes = 'Duration must be at least 1 minute';
    }
    
    if (formData.subjects.length === 0) {
      newErrors.subjects = 'At least one subject must be selected';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API}/admin/exams`, formData);
      
      // Clear saved draft and reset form
      try {
        localStorage.removeItem(EXAM_STORAGE_KEY);
        setHasUnsavedExamChanges(false);
      } catch (error) {
        console.error('Error clearing saved exam data:', error);
      }
      
      setFormData({
        name: '',
        description: '',
        duration_minutes: 180,
        total_questions: 10,
        subjects: []
      });
      
      onExamCreated?.();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create exam');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="name">Exam Name *</Label>
          <Input
            id="name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            placeholder="e.g., GATE Computer Science Mock Test 1"
            className={errors.name ? 'border-red-500' : ''}
          />
          {errors.name && <p className="text-red-500 text-sm">{errors.name}</p>}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="duration_minutes">Duration (minutes) *</Label>
          <Input
            id="duration_minutes"
            name="duration_minutes"
            type="number"
            min="1"
            value={formData.duration_minutes}
            onChange={handleInputChange}
            className={errors.duration_minutes ? 'border-red-500' : ''}
          />
          {errors.duration_minutes && <p className="text-red-500 text-sm">{errors.duration_minutes}</p>}
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="description">Description *</Label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleInputChange}
          placeholder="Describe the exam content and objectives..."
          rows={3}
          className={`w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.description ? 'border-red-500' : ''}`}
        />
        {errors.description && <p className="text-red-500 text-sm">{errors.description}</p>}
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="total_questions">Total Questions *</Label>
        <Input
          id="total_questions"
          name="total_questions"
          type="number"
          min="1"
          value={formData.total_questions}
          onChange={handleInputChange}
          className={errors.total_questions ? 'border-red-500' : ''}
        />
        {errors.total_questions && <p className="text-red-500 text-sm">{errors.total_questions}</p>}
      </div>
      
      <div className="space-y-3">
        <Label>Subjects *</Label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {availableSubjects.map((subject) => (
            <div key={subject} className="flex items-center space-x-2">
              <input
                type="checkbox"
                id={`subject-${subject}`}
                checked={formData.subjects.includes(subject)}
                onChange={() => handleSubjectChange(subject)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 focus:ring-2"
              />
              <Label 
                htmlFor={`subject-${subject}`} 
                className="text-sm font-normal cursor-pointer"
              >
                {subject}
              </Label>
            </div>
          ))}
        </div>
        {errors.subjects && <p className="text-red-500 text-sm">{errors.subjects}</p>}
        
        {availableSubjects.length === 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No subjects found. Please upload questions first to create exams.
            </AlertDescription>
          </Alert>
        )}
      </div>
      
      <div className="flex justify-between items-center pt-6 border-t">
        <div className="text-sm text-slate-600">
          Selected: {formData.subjects.length} subject{formData.subjects.length !== 1 ? 's' : ''}
        </div>
        <Button 
          type="submit" 
          disabled={loading || availableSubjects.length === 0}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Creating...
            </>
          ) : (
            <>
              <Plus className="h-4 w-4 mr-2" />
              Create Exam
            </>
          )}
        </Button>
      </div>
    </form>
  );
};

// Student Question Bank Component
const StudentQuestionBank = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('my-questions');
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [shareEmails, setShareEmails] = useState('');

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/questions`);
      setQuestions(response.data);
    } catch (error) {
      toast.error('Failed to fetch questions');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateQuestion = async (questionData) => {
    try {
      await axios.post(`${API}/questions`, questionData);
      toast.success('Question created successfully!');
      setShowCreateForm(false);
      fetchQuestions();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create question');
    }
  };

  const handleShareQuestion = async () => {
    if (!selectedQuestion || !shareEmails.trim()) {
      toast.error('Please enter recipient emails');
      return;
    }

    const emails = shareEmails.split(',').map(email => email.trim()).filter(email => email);
    
    try {
      await axios.post(`${API}/questions/${selectedQuestion.id}/share`, {
        question_id: selectedQuestion.id,
        recipient_emails: emails
      });
      toast.success('Question shared successfully!');
      setShowShareDialog(false);
      setShareEmails('');
      setSelectedQuestion(null);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to share question');
    }
  };

  const getQuestionsByType = (type) => {
    switch (type) {
      case 'my-questions':
        return questions.filter(q => q.user_relation === 'own');
      case 'shared-with-me':
        return questions.filter(q => q.user_relation === 'shared');
      case 'all-questions':
        return questions;
      default:
        return [];
    }
  };

  const getQuestionBadgeColor = (question) => {
    switch (question.user_relation) {
      case 'own':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'shared':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'public':
        return 'bg-slate-100 text-slate-800 border-slate-300';
      case 'admin':
        return 'bg-slate-100 text-slate-800 border-slate-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  const getQuestionLabel = (question) => {
    switch (question.user_relation) {
      case 'own':
        return 'Self';
      case 'shared':
        return `By ${question.creator_name}`;
      case 'public':
        return 'Official';
      case 'admin':
        return 'Official';
      default:
        return 'Official';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-100 dark:from-gray-900 dark:via-purple-900 dark:to-indigo-900">
      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-purple-700/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <BookOpen className="h-8 w-8 text-blue-600" />
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">Question Bank</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate('/dashboard')}
              >
                <Home className="h-4 w-4 mr-2" />
                Dashboard
              </Button>
              <span className="text-slate-600 dark:text-slate-300">{user?.full_name}</span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={toggleTheme}
                title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              >
                {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              </Button>
              <Button variant="outline" size="sm" onClick={logout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">My Question Collection</h2>
            <Button 
              onClick={() => setShowCreateForm(true)}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Question
            </Button>
          </div>
          
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="my-questions">My Questions</TabsTrigger>
              <TabsTrigger value="shared-with-me">Shared with Me</TabsTrigger>
              <TabsTrigger value="all-questions">All Questions</TabsTrigger>
            </TabsList>

            {/* My Questions Tab */}
            <TabsContent value="my-questions" className="mt-6">
              <QuestionsList 
                questions={getQuestionsByType('my-questions')} 
                loading={loading}
                onShare={(question) => {
                  setSelectedQuestion(question);
                  setShowShareDialog(true);
                }}
                showShareButton={true}
                getQuestionBadgeColor={getQuestionBadgeColor}
                getQuestionLabel={getQuestionLabel}
              />
            </TabsContent>

            {/* Shared with Me Tab */}
            <TabsContent value="shared-with-me" className="mt-6">
              <QuestionsList 
                questions={getQuestionsByType('shared-with-me')} 
                loading={loading}
                onShare={null}
                showShareButton={false}
                getQuestionBadgeColor={getQuestionBadgeColor}
                getQuestionLabel={getQuestionLabel}
              />
            </TabsContent>

            {/* All Questions Tab */}
            <TabsContent value="all-questions" className="mt-6">
              <QuestionsList 
                questions={getQuestionsByType('all-questions')} 
                loading={loading}
                onShare={(question) => {
                  if (question.user_relation === 'own') {
                    setSelectedQuestion(question);
                    setShowShareDialog(true);
                  }
                }}
                showShareButton={false}
                getQuestionBadgeColor={getQuestionBadgeColor}
                getQuestionLabel={getQuestionLabel}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Create Question Form */}
        {showCreateForm && (
          <QuestionCreateForm 
            onSubmit={handleCreateQuestion}
            onCancel={() => setShowCreateForm(false)}
          />
        )}

        {/* Share Dialog */}
        <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Share Question</DialogTitle>
              <DialogDescription>
                Enter the email addresses of people you want to share this question with.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="share-emails">Recipient Emails</Label>
                <Textarea
                  id="share-emails"
                  value={shareEmails}
                  onChange={(e) => setShareEmails(e.target.value)}
                  placeholder="Enter email addresses separated by commas..."
                  className="mt-2"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={() => setShowShareDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleShareQuestion}>
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

// Questions List Component
const QuestionsList = ({ questions, loading, onShare, showShareButton, getQuestionBadgeColor, getQuestionLabel }) => {
  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-slate-600">Loading questions...</p>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <Card className="text-center py-12">
        <CardContent>
          <FileText className="h-16 w-16 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No Questions Found</h3>
          <p className="text-slate-600">Create your first question or check other tabs for shared questions.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {questions.map((question) => (
        <Card key={question.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <Badge className={getQuestionBadgeColor(question)}>
                    {getQuestionLabel(question)}
                  </Badge>
                  <Badge variant="outline">{question.question_type}</Badge>
                  <Badge variant="outline">{question.subject}</Badge>
                  <span className="text-sm text-slate-500">{question.marks} marks</span>
                </div>
                <p className="text-slate-900 dark:text-slate-100 font-medium mb-2">
                  {question.question_text.substring(0, 150)}...
                </p>
                <div className="text-sm text-slate-600 dark:text-slate-300">
                  <span>Topic: {question.topic}</span>
                  <span className="mx-2">•</span>
                  <span>Difficulty: {question.difficulty}</span>
                </div>
              </div>
              <div className="flex space-x-2 ml-4">
                {showShareButton && question.user_relation === 'own' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onShare(question)}
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                )}
                <Button variant="outline" size="sm">
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {question.options && question.options.length > 0 && (
              <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Options:</p>
                <div className="space-y-1">
                  {question.options.slice(0, 2).map((option, index) => (
                    <p key={index} className="text-sm text-slate-600 dark:text-slate-400">
                      {String.fromCharCode(65 + index)}. {option.text}
                    </p>
                  ))}
                  {question.options.length > 2 && (
                    <p className="text-sm text-slate-500 dark:text-slate-500">... and {question.options.length - 2} more</p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

// Question Create Form Component
const QuestionCreateForm = ({ onSubmit, onCancel }) => {
  const STORAGE_KEY = 'questionCreateForm';
  
  // Load saved form data from localStorage on mount
  const loadSavedFormData = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsedData = JSON.parse(saved);
        // Merge with default data to ensure all fields exist
        return {
          question_text: '',
          question_type: 'MCQ',
          subject: '',
          topic: '',
          difficulty: 'medium',
          marks: 1,
          negative_marks: 0.33,
          options: [{ text: '', is_correct: false }, { text: '', is_correct: false }],
          correct_answer: '',
          explanation: '',
          ...parsedData
        };
      }
    } catch (error) {
      console.error('Error loading saved form data:', error);
    }
    return {
      question_text: '',
      question_type: 'MCQ',
      subject: '',
      topic: '',
      difficulty: 'medium',
      marks: 1,
      negative_marks: 0.33,
      options: [{ text: '', is_correct: false }, { text: '', is_correct: false }],
      correct_answer: '',
      explanation: ''
    };
  };
  
  const [formData, setFormData] = useState(loadSavedFormData);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Auto-save to localStorage whenever formData changes
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(formData));
        if (formData.question_text.trim() || formData.subject.trim() || formData.topic.trim()) {
          setHasUnsavedChanges(true);
        }
      } catch (error) {
        console.error('Error saving form data:', error);
      }
    }, 1000); // Save after 1 second of inactivity

    return () => clearTimeout(timer);
  }, [formData, STORAGE_KEY]);

  // Clear saved data on mount if it's empty
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsedData = JSON.parse(saved);
      const hasContent = parsedData.question_text?.trim() || 
                        parsedData.subject?.trim() || 
                        parsedData.topic?.trim();
      if (hasContent) {
        setHasUnsavedChanges(true);
      }
    }
  }, [STORAGE_KEY]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.question_text.trim() || !formData.subject.trim()) {
      toast.error('Please fill in required fields');
      return;
    }
    
    // Clear saved draft on successful submit
    try {
      localStorage.removeItem(STORAGE_KEY);
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Error clearing saved form data:', error);
    }
    
    onSubmit(formData);
  };

  const handleCancel = () => {
    if (hasUnsavedChanges) {
      if (window.confirm('You have unsaved changes. Are you sure you want to discard them?')) {
        clearDraft();
        onCancel();
      }
    } else {
      onCancel();
    }
  };

  const clearDraft = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      setHasUnsavedChanges(false);
      // Reset form to default state
      setFormData({
        question_text: '',
        question_type: 'MCQ',
        subject: '',
        topic: '',
        difficulty: 'medium',
        marks: 1,
        negative_marks: 0.33,
        options: [{ text: '', is_correct: false }, { text: '', is_correct: false }],
        correct_answer: '',
        explanation: ''
      });
      toast.success('Draft cleared!');
    } catch (error) {
      console.error('Error clearing draft:', error);
    }
  };

  const handleOptionChange = (index, field, value) => {
    const newOptions = [...formData.options];
    newOptions[index][field] = value;
    setFormData({ ...formData, options: newOptions });
  };

  const addOption = () => {
    if (formData.options.length < 4) {
      setFormData({
        ...formData,
        options: [...formData.options, { text: '', is_correct: false }]
      });
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>Create New Question</CardTitle>
            <CardDescription>
              Create a new question for your personal collection
              {hasUnsavedChanges && (
                <span className="block mt-1 text-amber-600 text-sm font-medium">
                  📝 Auto-saved draft available
                </span>
              )}
            </CardDescription>
          </div>
          {hasUnsavedChanges && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={clearDraft}
              className="text-slate-600 hover:text-red-600"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Clear Draft
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="subject">Subject *</Label>
              <Input
                id="subject"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="e.g., Computer Science"
                required
              />
            </div>
            <div>
              <Label htmlFor="topic">Topic *</Label>
              <Input
                id="topic"
                value={formData.topic}
                onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                placeholder="e.g., Data Structures"
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="question_text">Question Text *</Label>
            <Textarea
              id="question_text"
              value={formData.question_text}
              onChange={(e) => setFormData({ ...formData, question_text: e.target.value })}
              placeholder="Enter your question here..."
              required
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="question_type">Question Type</Label>
              <Select 
                value={formData.question_type} 
                onValueChange={(value) => setFormData({ ...formData, question_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MCQ">Multiple Choice (Single)</SelectItem>
                  <SelectItem value="MSQ">Multiple Select</SelectItem>
                  <SelectItem value="NAT">Numerical Answer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="difficulty">Difficulty</Label>
              <Select 
                value={formData.difficulty} 
                onValueChange={(value) => setFormData({ ...formData, difficulty: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="marks">Marks</Label>
              <Input
                id="marks"
                type="number"
                min="1"
                value={formData.marks}
                onChange={(e) => setFormData({ ...formData, marks: parseInt(e.target.value) })}
              />
            </div>
          </div>

          {(formData.question_type === 'MCQ' || formData.question_type === 'MSQ') && (
            <div>
              <Label>Options</Label>
              <div className="space-y-3 mt-2">
                {formData.options.map((option, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <Checkbox
                      checked={option.is_correct}
                      onCheckedChange={(checked) => handleOptionChange(index, 'is_correct', checked)}
                    />
                    <Input
                      value={option.text}
                      onChange={(e) => handleOptionChange(index, 'text', e.target.value)}
                      placeholder={`Option ${String.fromCharCode(65 + index)}`}
                      className="flex-1"
                    />
                  </div>
                ))}
                {formData.options.length < 4 && (
                  <Button type="button" variant="outline" size="sm" onClick={addOption}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Option
                  </Button>
                )}
              </div>
            </div>
          )}

          {formData.question_type === 'NAT' && (
            <div>
              <Label htmlFor="correct_answer">Correct Answer</Label>
              <Input
                id="correct_answer"
                type="number"
                step="any"
                value={formData.correct_answer}
                onChange={(e) => setFormData({ ...formData, correct_answer: e.target.value })}
                placeholder="Enter the numerical answer"
              />
            </div>
          )}

          <div>
            <Label htmlFor="explanation">Explanation (Optional)</Label>
            <Textarea
              id="explanation"
              value={formData.explanation}
              onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
              placeholder="Provide an explanation for the correct answer..."
              rows={2}
            />
          </div>

          <div className="flex justify-between items-center">
            <div className="text-sm text-slate-500">
              {hasUnsavedChanges ? (
                <span className="text-amber-600">💾 Draft auto-saved</span>
              ) : (
                <span>Changes are automatically saved as you type</span>
              )}
            </div>
            <div className="flex space-x-3">
              <Button type="button" variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button type="submit" className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                <Plus className="h-4 w-4 mr-2" />
                Create Question
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

// Admin Panel Component
const AdminPanel = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('questions');
  const [questions, setQuestions] = useState([]);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [csvPreview, setCsvPreview] = useState(null);
  const [showCsvPreview, setShowCsvPreview] = useState(false);

  useEffect(() => {
    if (user?.role !== 'admin') {
      navigate('/dashboard');
      return;
    }
    fetchQuestions();
    fetchExams();
  }, [user, navigate]);

  const fetchQuestions = async () => {
    try {
      const response = await axios.get(`${API}/admin/questions`);
      setQuestions(response.data);
    } catch (error) {
      toast.error('Failed to fetch questions');
    }
  };

  const fetchExams = async () => {
    try {
      const response = await axios.get(`${API}/admin/exams`);
      setExams(response.data);
    } catch (error) {
      toast.error('Failed to fetch exams');
    }
  };

  const handleFileUpload = async (file, type) => {
    const formData = new FormData();
    formData.append('file', file);
    
    setLoading(true);
    try {
      const response = await axios.post(`${API}/admin/upload/${type}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      toast.success(response.data.message);
      if (type === 'csv') {
        fetchQuestions();
        setCsvPreview(null);
        setShowCsvPreview(false);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || `Failed to upload ${type.toUpperCase()}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePreviewCsv = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    setLoading(true);
    try {
      const response = await axios.post(`${API}/admin/preview-csv`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setCsvPreview(response.data);
      setShowCsvPreview(true);
      toast.success(`Preview loaded: ${response.data.showing_rows} of ${response.data.total_rows} rows`);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to preview CSV');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-red-100 dark:from-gray-900 dark:via-orange-900 dark:to-red-900">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Settings className="h-8 w-8 text-blue-600" />
              <h1 className="text-xl font-bold text-slate-900">Admin Panel</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate('/dashboard')}
              >
                <Home className="h-4 w-4 mr-2" />
                Dashboard
              </Button>
              <span className="text-slate-600">{user?.full_name}</span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={toggleTheme}
                title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              >
                {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              </Button>
              <Button variant="outline" size="sm" onClick={logout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="questions">Questions</TabsTrigger>
            <TabsTrigger value="exams">Exams</TabsTrigger>
            <TabsTrigger value="upload">Upload</TabsTrigger>
          </TabsList>

          <TabsContent value="questions" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Question Management</CardTitle>
                <CardDescription>
                  Manage your question bank for GATE exams
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {questions.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-slate-900 mb-2">No Questions Found</h3>
                      <p className="text-slate-600">Upload a CSV file to add questions to your database.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {questions.slice(0, 10).map((question) => (
                        <div key={question.id} className="border rounded-lg p-4">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <p className="font-medium text-slate-900 mb-2">
                                {question.question_text.substring(0, 100)}...
                              </p>
                              <div className="flex space-x-4 text-sm text-slate-600">
                                <Badge variant="outline">{question.question_type}</Badge>
                                <span>{question.subject}</span>
                                <span>{question.topic}</span>
                                <span>{question.marks} marks</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      {questions.length > 10 && (
                        <div className="text-center py-4">
                          <p className="text-slate-600">
                            Showing 10 of {questions.length} questions
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="exams" className="mt-6">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Create New Exam</CardTitle>
                  <CardDescription>
                    Configure a new exam with questions from your database
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ExamCreationForm onExamCreated={() => { fetchExams(); toast.success('Exam created successfully!'); }} />
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Existing Exams</CardTitle>
                  <CardDescription>
                    Manage your existing exam configurations
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {exams.length === 0 ? (
                    <div className="text-center py-8">
                      <BarChart className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-slate-900 mb-2">No Exams Found</h3>
                      <p className="text-slate-600">Create your first exam using the form above.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {exams.map((exam) => (
                        <div key={exam.id} className="border rounded-lg p-4">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h4 className="font-semibold text-slate-900 mb-1">{exam.name}</h4>
                              <p className="text-slate-600 text-sm mb-2">{exam.description}</p>
                              <div className="flex space-x-4 text-sm text-slate-500">
                                <span>📝 {exam.total_questions} questions</span>
                                <span>⏱️ {exam.duration_minutes} minutes</span>
                                <span>📚 {exam.subjects.join(', ')}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="upload" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Upload className="h-5 w-5 mr-2" />
                    Upload CSV
                  </CardTitle>
                  <CardDescription>
                    Import questions from a CSV file
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        CSV should have columns: question_text, type, subject, topic, option_1, option_1_correct, etc.
                      </AlertDescription>
                    </Alert>
                    <div>
                      <Label htmlFor="csv-upload">Select CSV File</Label>
                      <Input
                        id="csv-upload"
                        type="file"
                        accept=".csv"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            setCsvPreview(null);
                            setShowCsvPreview(false);
                          }
                        }}
                        disabled={loading}
                      />
                    </div>
                    
                    {/* Preview and Upload Buttons */}
                    <div className="flex space-x-3">
                      <Button
                        variant="outline"
                        onClick={() => {
                          const fileInput = document.getElementById('csv-upload');
                          const file = fileInput?.files[0];
                          if (file) {
                            handlePreviewCsv(file);
                          } else {
                            toast.error('Please select a CSV file first');
                          }
                        }}
                        disabled={loading}
                      >
                        <FileQuestion className="h-4 w-4 mr-2" />
                        Preview CSV
                      </Button>
                      <Button
                        onClick={() => {
                          const fileInput = document.getElementById('csv-upload');
                          const file = fileInput?.files[0];
                          if (file) {
                            handleFileUpload(file, 'csv');
                          } else {
                            toast.error('Please select a CSV file first');
                          }
                        }}
                        disabled={loading}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        {loading ? 'Uploading...' : 'Upload CSV'}
                      </Button>
                    </div>
                    
                    {/* CSV Preview */}
                    {showCsvPreview && csvPreview && (
                      <CsvPreview preview={csvPreview} onClose={() => setShowCsvPreview(false)} />
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Upload className="h-5 w-5 mr-2" />
                    Upload PDF
                  </CardTitle>
                  <CardDescription>
                    Extract text from PDF files
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        PDF text extraction is for preview only. Convert to CSV format for importing questions.
                      </AlertDescription>
                    </Alert>
                    <div>
                      <Label htmlFor="pdf-upload">Select PDF File</Label>
                      <Input
                        id="pdf-upload"
                        type="file"
                        accept=".pdf"
                        onChange={(e) => {
                          if (e.target.files[0]) {
                            handleFileUpload(e.target.files[0], 'pdf');
                          }
                        }}
                        disabled={loading}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  return user ? children : <Navigate to="/login" />;
};

// Exam Interface Component
const ExamInterface = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);

  useEffect(() => {
    fetchSession();
  }, [sessionId]);

  useEffect(() => {
    if (session) {
      fetchQuestion(currentIndex);
      // Calculate time left
      const startTime = new Date(session.start_time);
      const duration = 180 * 60 * 1000; // 3 hours in milliseconds
      const elapsed = Date.now() - startTime.getTime();
      const remaining = Math.max(0, duration - elapsed);
      setTimeLeft(Math.floor(remaining / 1000));
    }
  }, [session, currentIndex]);

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleAutoSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [timeLeft]);

  const fetchSession = async () => {
    try {
      const response = await axios.get(`${API}/exam/session/${sessionId}`);
      setSession(response.data);
    } catch (error) {
      toast.error('Failed to load exam session');
      navigate('/dashboard');
    }
  };

  const fetchQuestion = async (index) => {
    try {
      const response = await axios.get(`${API}/exam/question/${sessionId}/${index}`);
      setCurrentQuestion(response.data);
      // Load existing answer
      if (response.data.current_answer) {
        setAnswers(prev => ({
          ...prev,
          [response.data.question.id]: response.data.current_answer
        }));
      }
    } catch (error) {
      toast.error('Failed to load question');
    }
  };

  const saveAnswer = async (questionId, answer, status = 'answered') => {
    try {
      await axios.post(`${API}/exam/answer/${sessionId}`, {
        question_id: questionId,
        answer,
        status
      });
    } catch (error) {
      toast.error('Failed to save answer');
    }
  };

  const handleAnswerChange = (questionId, answer) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
    saveAnswer(questionId, answer);
  };

  const navigateToQuestion = (index) => {
    if (index >= 0 && index < session.questions.length) {
      setCurrentIndex(index);
    }
  };

  const handleNext = () => {
    if (currentIndex < session.questions.length - 1) {
      navigateToQuestion(currentIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      navigateToQuestion(currentIndex - 1);
    }
  };

  const markForReview = () => {
    if (currentQuestion) {
      const questionId = currentQuestion.question.id;
      const currentAnswer = answers[questionId];
      const status = currentAnswer ? 'marked_answered' : 'marked';
      saveAnswer(questionId, currentAnswer || '', status);
    }
  };

  const clearResponse = () => {
    if (currentQuestion) {
      const questionId = currentQuestion.question.id;
      setAnswers(prev => ({ ...prev, [questionId]: null }));
      saveAnswer(questionId, '', 'not_answered');
    }
  };

  const handleAutoSubmit = async () => {
    await submitExam();
  };

  const submitExam = async () => {
    setIsSubmitting(true);
    try {
      const response = await axios.post(`${API}/exam/submit/${sessionId}`);
      toast.success('Exam submitted successfully!');
      navigate(`/results/${sessionId}`);
    } catch (error) {
      toast.error('Failed to submit exam');
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!session || !currentQuestion) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading exam...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm px-4 py-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <BookOpen className="h-6 w-6 text-blue-600" />
            <h1 className="text-lg font-semibold text-slate-900">GATE Exam</h1>
          </div>
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-slate-600" />
              <span className={`font-mono text-lg font-semibold ${timeLeft < 600 ? 'text-red-600' : 'text-slate-900'}`}>
                {formatTime(timeLeft)}
              </span>
            </div>
            <Button 
              variant="destructive" 
              onClick={() => setShowSubmitDialog(true)}
              disabled={isSubmitting}
            >
              Submit Exam
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex">
        {/* Question Palette */}
        <div className="w-80 bg-white border-r border-slate-200 p-4">
          <h3 className="font-semibold text-slate-900 mb-4">Questions</h3>
          <div className="grid grid-cols-5 gap-2 mb-6">
            {session.questions.map((_, index) => (
              <Button
                key={index}
                variant={index === currentIndex ? "default" : "outline"}
                size="sm"
                className={`h-10 w-10 p-0 ${
                  answers[session.questions[index]] 
                    ? 'bg-green-100 border-green-300 text-green-800' 
                    : 'bg-slate-100 border-slate-300'
                }`}
                onClick={() => navigateToQuestion(index)}
              >
                {index + 1}
              </Button>
            ))}
          </div>
          
          {/* Legend */}
          <div className="space-y-2 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
              <span>Answered</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-slate-100 border border-slate-300 rounded"></div>
              <span>Not Answered</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-blue-100 border border-blue-300 rounded"></div>
              <span>Current</span>
            </div>
          </div>
        </div>

        {/* Question Area */}
        <div className="flex-1 p-6">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold text-slate-900">
                  Question {currentQuestion.question_number} of {currentQuestion.total_questions}
                </h2>
                <Badge variant="outline">
                  {currentQuestion.question.question_type}
                </Badge>
              </div>

              <div className="mb-6">
                <p className="text-slate-900 text-lg leading-relaxed">
                  {currentQuestion.question.question_text}
                </p>
              </div>

              {/* Answer Options */}
              <div className="space-y-4 mb-8">
                {currentQuestion.question.question_type === 'MCQ' && (
                  <RadioGroup
                    value={answers[currentQuestion.question.id] || ''}
                    onValueChange={(value) => handleAnswerChange(currentQuestion.question.id, value)}
                  >
                    {currentQuestion.question.options.map((option) => (
                      <div key={option.id} className="flex items-center space-x-2">
                        <RadioGroupItem value={option.id} id={option.id} />
                        <Label htmlFor={option.id} className="flex-1 cursor-pointer">
                          {option.text}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                )}

                {currentQuestion.question.question_type === 'MSQ' && (
                  <div className="space-y-3">
                    {currentQuestion.question.options.map((option) => (
                      <div key={option.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={option.id}
                          checked={(answers[currentQuestion.question.id] || []).includes(option.id)}
                          onCheckedChange={(checked) => {
                            const currentAnswers = answers[currentQuestion.question.id] || [];
                            const newAnswers = checked
                              ? [...currentAnswers, option.id]
                              : currentAnswers.filter(id => id !== option.id);
                            handleAnswerChange(currentQuestion.question.id, newAnswers);
                          }}
                        />
                        <Label htmlFor={option.id} className="flex-1 cursor-pointer">
                          {option.text}
                        </Label>
                      </div>
                    ))}
                  </div>
                )}

                {currentQuestion.question.question_type === 'NAT' && (
                  <div>
                    <Label htmlFor="nat-answer">Enter your answer:</Label>
                    <Input
                      id="nat-answer"
                      type="number"
                      step="any"
                      value={answers[currentQuestion.question.id] || ''}
                      onChange={(e) => handleAnswerChange(currentQuestion.question.id, e.target.value)}
                      className="mt-2 max-w-xs"
                      placeholder="Enter numerical answer"
                    />
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between">
                <div className="flex space-x-3">
                  <Button
                    variant="outline"
                    onClick={handlePrevious}
                    disabled={currentIndex === 0}
                  >
                    Previous
                  </Button>
                  <Button
                    onClick={handleNext}
                    disabled={currentIndex === session.questions.length - 1}
                  >
                    Next
                  </Button>
                </div>
                <div className="flex space-x-3">
                  <Button variant="outline" onClick={clearResponse}>
                    Clear Response
                  </Button>
                  <Button variant="outline" onClick={markForReview}>
                    <Flag className="h-4 w-4 mr-2" />
                    Mark for Review
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Submit Confirmation Dialog */}
      <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Exam</DialogTitle>
            <DialogDescription>
              Are you sure you want to submit your exam? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={() => setShowSubmitDialog(false)}>
              Cancel
            </Button>
            <Button onClick={submitExam} disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit Exam'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Results Component
const ResultsPage = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [result, setResult] = useState(null);
  const [detailedResults, setDetailedResults] = useState(null);
  const [showDetailedResults, setShowDetailedResults] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingDetailed, setLoadingDetailed] = useState(false);

  useEffect(() => {
    fetchResult();
  }, [sessionId]);

  const fetchResult = async () => {
    try {
      const response = await axios.get(`${API}/results/${sessionId}`);
      setResult(response.data);
    } catch (error) {
      toast.error('Failed to load results');
    } finally {
      setLoading(false);
    }
  };

  const fetchDetailedResults = async () => {
    if (detailedResults) {
      setShowDetailedResults(!showDetailedResults);
      return;
    }
    
    setLoadingDetailed(true);
    try {
      const response = await axios.get(`${API}/detailed-results/${sessionId}`);
      setDetailedResults(response.data);
      setShowDetailedResults(true);
    } catch (error) {
      toast.error('Failed to load detailed results');
    } finally {
      setLoadingDetailed(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading results...</p>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <Card className="text-center">
          <CardContent className="py-12">
            <AlertCircle className="h-16 w-16 text-slate-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">Results Not Found</h3>
            <p className="text-slate-600 mb-4">Unable to load your exam results.</p>
            <Button onClick={() => navigate('/dashboard')}>
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <BarChart className="h-8 w-8 text-blue-600" />
              <h1 className="text-xl font-bold text-slate-900">Exam Results</h1>
            </div>
            <Button onClick={() => navigate('/dashboard')}>
              <Home className="h-4 w-4 mr-2" />
              Dashboard
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Overall Score */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center">
                <CheckCircle className="h-6 w-6 text-green-600 mr-2" />
                Overall Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">{result.score.toFixed(1)}</div>
                  <div className="text-sm text-slate-600">Total Score</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">{result.percentage.toFixed(1)}%</div>
                  <div className="text-sm text-slate-600">Percentage</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">{result.correct}</div>
                  <div className="text-sm text-slate-600">Correct</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-slate-600">{result.attempted}</div>
                  <div className="text-sm text-slate-600">Attempted</div>
                </div>
              </div>
              
              <div className="mb-4">
                <div className="flex justify-between text-sm text-slate-600 mb-2">
                  <span>Progress</span>
                  <span>{result.attempted} / {result.total_questions}</span>
                </div>
                <Progress value={(result.attempted / result.total_questions) * 100} className="h-2" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-slate-600">Time Taken: </span>
                  <span className="font-medium">{Math.floor(result.time_taken_minutes / 60)}h {result.time_taken_minutes % 60}m</span>
                </div>
                <div>
                  <span className="text-slate-600">Incorrect: </span>
                  <span className="font-medium text-red-600">{result.incorrect}</span>
                </div>
                <div>
                  <span className="text-slate-600">Not Attempted: </span>
                  <span className="font-medium text-slate-500">{result.total_questions - result.attempted}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Accuracy</span>
                  <span className="font-semibold">
                    {result.attempted > 0 ? ((result.correct / result.attempted) * 100).toFixed(1) : 0}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Completion</span>
                  <span className="font-semibold">
                    {((result.attempted / result.total_questions) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Grade</span>
                  <Badge variant={result.percentage >= 60 ? "default" : "destructive"}>
                    {result.percentage >= 80 ? 'Excellent' : 
                     result.percentage >= 60 ? 'Good' : 
                     result.percentage >= 40 ? 'Average' : 'Needs Improvement'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Subject-wise Performance */}
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>Subject-wise Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(result.subject_wise_score || {}).map(([subject, stats]) => (
                  <div key={subject} className="border rounded-lg p-4">
                    <h4 className="font-semibold text-slate-900 mb-3">{subject}</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Correct:</span>
                        <span className="font-medium text-green-600">{stats.correct}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Attempted:</span>
                        <span className="font-medium">{stats.attempted}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Total:</span>
                        <span className="font-medium">{stats.total}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Accuracy:</span>
                        <span className="font-medium">
                          {stats.attempted > 0 ? ((stats.correct / stats.attempted) * 100).toFixed(1) : 0}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Detailed Question Analysis */}
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Question-by-Question Analysis
                <Button 
                  variant="outline"
                  onClick={fetchDetailedResults}
                  disabled={loadingDetailed}
                >
                  {loadingDetailed ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                  ) : showDetailedResults ? (
                    <ChevronUp className="h-4 w-4 mr-2" />
                  ) : (
                    <ChevronDown className="h-4 w-4 mr-2" />
                  )}
                  {showDetailedResults ? 'Hide Details' : 'Show Details'}
                </Button>
              </CardTitle>
            </CardHeader>
            {showDetailedResults && detailedResults && (
              <CardContent>
                <QuestionAnalysis questions={detailedResults.questions} />
              </CardContent>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
};

// CSV Preview Component
const CsvPreview = ({ preview, onClose }) => {
  return (
    <div className="mt-6 border border-slate-200 rounded-lg bg-white">
      <div className="flex justify-between items-center p-4 border-b border-slate-200">
        <div>
          <h3 className="font-semibold text-slate-900">CSV Preview</h3>
          <p className="text-sm text-slate-600">
            {preview.filename} - Showing {preview.showing_rows} of {preview.total_rows} rows
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="p-4">
        {/* Headers */}
        <div className="mb-4">
          <h4 className="font-medium text-slate-700 mb-2">CSV Headers:</h4>
          <div className="flex flex-wrap gap-2">
            {preview.headers.map((header, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {header}
              </Badge>
            ))}
          </div>
        </div>
        
        {/* Preview Questions */}
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {preview.preview_questions.map((question, index) => (
            <Card key={index} className={question.error ? 'border-red-200 bg-red-50' : 'border-slate-200'}>
              <CardContent className="p-3">
                {question.error ? (
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <X className="h-4 w-4 text-red-600" />
                      <span className="text-red-600 font-medium">Row {question.row_number} - Error</span>
                    </div>
                    <p className="text-red-600 text-sm mb-2">{question.error}</p>
                    <details className="text-xs text-slate-600">
                      <summary className="cursor-pointer">Raw data</summary>
                      <pre className="mt-2 p-2 bg-slate-100 rounded overflow-x-auto">
                        {JSON.stringify(question.raw_row, null, 2)}
                      </pre>
                    </details>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span className="font-medium text-slate-700">Row {question.row_number}</span>
                      <Badge variant="outline" className="text-xs">{question.question_type}</Badge>
                      <Badge variant="outline" className="text-xs">{question.subject}</Badge>
                    </div>
                    
                    <p className="text-slate-900 text-sm mb-2 line-clamp-2">
                      {question.question_text.substring(0, 150)}...
                    </p>
                    
                    {question.options && question.options.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs text-slate-600 mb-1">Options ({question.options.length}):</p>
                        <div className="grid grid-cols-2 gap-1 text-xs">
                          {question.options.slice(0, 4).map((option, optIndex) => (
                            <div 
                              key={optIndex} 
                              className={`p-1 rounded ${option.is_correct ? 'bg-green-100 text-green-800' : 'bg-slate-100'}`}
                            >
                              {String.fromCharCode(65 + optIndex)}. {option.text.substring(0, 30)}...
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {question.correct_answer && (
                      <p className="text-xs text-slate-600 mt-2">
                        <span className="font-medium">Correct Answer:</span> {question.correct_answer}
                      </p>
                    )}
                    
                    <div className="flex space-x-3 mt-2 text-xs text-slate-500">
                      <span>Topic: {question.topic}</span>
                      <span>Difficulty: {question.difficulty}</span>
                      <span>Marks: {question.marks}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
        
        {preview.total_rows > preview.showing_rows && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
            <p className="text-blue-700 text-sm">
              📊 This preview shows the first {preview.showing_rows} rows. 
              The full CSV contains {preview.total_rows} rows total.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// Question Analysis Component
const QuestionAnalysis = ({ questions }) => {
  const [expandedQuestions, setExpandedQuestions] = useState(new Set());

  const toggleQuestion = (questionId) => {
    const newExpanded = new Set(expandedQuestions);
    if (newExpanded.has(questionId)) {
      newExpanded.delete(questionId);
    } else {
      newExpanded.add(questionId);
    }
    setExpandedQuestions(newExpanded);
  };

  const getStatusIcon = (question) => {
    if (question.status === 'not_answered') {
      return <Minus className="h-4 w-4 text-slate-400" />;
    } else if (question.is_correct) {
      return <Check className="h-4 w-4 text-green-600" />;
    } else {
      return <X className="h-4 w-4 text-red-600" />;
    }
  };

  const getStatusColor = (question) => {
    if (question.status === 'not_answered') {
      return 'border-slate-200 bg-slate-50';
    } else if (question.is_correct) {
      return 'border-green-200 bg-green-50';
    } else {
      return 'border-red-200 bg-red-50';
    }
  };

  // Group questions by status
  const correctQuestions = questions.filter(q => q.is_correct && q.status !== 'not_answered');
  const wrongQuestions = questions.filter(q => !q.is_correct && q.status !== 'not_answered');
  const unansweredQuestions = questions.filter(q => q.status === 'not_answered');

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="flex flex-wrap gap-4 text-sm">
        <div className="flex items-center space-x-2">
          <Check className="h-4 w-4 text-green-600" />
          <span className="text-green-600 font-medium">{correctQuestions.length} Correct</span>
        </div>
        <div className="flex items-center space-x-2">
          <X className="h-4 w-4 text-red-600" />
          <span className="text-red-600 font-medium">{wrongQuestions.length} Wrong</span>
        </div>
        <div className="flex items-center space-x-2">
          <Minus className="h-4 w-4 text-slate-400" />
          <span className="text-slate-600 font-medium">{unansweredQuestions.length} Not Answered</span>
        </div>
      </div>

      {/* Questions List */}
      <div className="space-y-3">
        {questions.map((question) => {
          const isExpanded = expandedQuestions.has(question.question_id);
          
          return (
            <Card key={question.question_id} className={`${getStatusColor(question)} transition-all`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 flex-1">
                    {getStatusIcon(question)}
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-1">
                        <span className="font-medium text-slate-700">Q{question.question_number}</span>
                        <Badge variant="outline" className="text-xs">{question.subject}</Badge>
                        <Badge variant="outline" className="text-xs">{question.question_type}</Badge>
                        <span className="text-xs text-slate-500">{question.marks} marks</span>
                      </div>
                      <p className="text-slate-900 text-sm">
                        {question.question_text.substring(0, 100)}...
                      </p>
                      {question.status !== 'not_answered' && (
                        <div className="mt-2 text-xs space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-slate-600">Your answer:</span>
                            <span className={question.is_correct ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                              {question.user_answer_text || 'No answer'}
                            </span>
                          </div>
                          {!question.is_correct && question.correct_answer && (
                            <div className="flex items-center space-x-2">
                              <span className="text-slate-600">Correct answer:</span>
                              <span className="text-green-600 font-medium">{question.correct_answer}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => toggleQuestion(question.question_id)}
                  >
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </div>
                
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <div className="space-y-4">
                      {/* Full Question */}
                      <div>
                        <h4 className="font-medium text-slate-900 mb-2">Question:</h4>
                        <p className="text-slate-700">{question.question_text}</p>
                      </div>
                      
                      {/* Options (for MCQ/MSQ) */}
                      {question.options && question.options.length > 0 && (
                        <div>
                          <h4 className="font-medium text-slate-900 mb-2">Options:</h4>
                          <div className="space-y-2">
                            {question.options.map((option, index) => {
                              const isUserSelected = Array.isArray(question.user_answer) 
                                ? question.user_answer.includes(option.id)
                                : question.user_answer === option.id;
                              const isCorrect = option.is_correct;
                              
                              return (
                                <div 
                                  key={option.id} 
                                  className={`p-2 rounded text-sm flex items-center space-x-2 ${
                                    isCorrect ? 'bg-green-100 border border-green-200' :
                                    isUserSelected ? 'bg-red-100 border border-red-200' :
                                    'bg-slate-50 border border-slate-200'
                                  }`}
                                >
                                  <span className="font-medium">{String.fromCharCode(65 + index)}.</span>
                                  <span className="flex-1">{option.text}</span>
                                  <div className="flex space-x-1">
                                    {isCorrect && <Check className="h-3 w-3 text-green-600" />}
                                    {isUserSelected && !isCorrect && <X className="h-3 w-3 text-red-600" />}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      
                      {/* Explanation */}
                      {question.explanation && (
                        <div>
                          <h4 className="font-medium text-slate-900 mb-2">Explanation:</h4>
                          <p className="text-slate-600 bg-blue-50 p-3 rounded">{question.explanation}</p>
                        </div>
                      )}
                      
                      {/* Question Details */}
                      <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                        <span>Topic: {question.topic}</span>
                        <span>Difficulty: {question.difficulty || 'Medium'}</span>
                        <span>Status: {question.status.replace('_', ' ').toUpperCase()}</span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

// Main App Component
function App() {
  return (
    <div className="App">
      <ThemeProvider>
        <AuthProvider>
          <Router>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/admin" element={
                <ProtectedRoute>
                  <AdminPanel />
                </ProtectedRoute>
              } />
              <Route path="/exam/:sessionId" element={
                <ProtectedRoute>
                  <ExamInterface />
                </ProtectedRoute>
              } />
            <Route path="/results/:sessionId" element={
              <ProtectedRoute>
                <ResultsPage />
              </ProtectedRoute>
            } />
            <Route path="/questions" element={
              <ProtectedRoute>
                <StudentQuestionBank />
              </ProtectedRoute>
            } />
            <Route path="/" element={<Navigate to="/dashboard" />} />
            </Routes>
          </Router>
          <Toaster />
        </AuthProvider>
      </ThemeProvider>
    </div>
  );
}

export default App;