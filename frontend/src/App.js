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
  Activity,
  Eye,
  ChevronDown,
  ChevronUp,
  X,
  Check,
  Minus,
  FileQuestion,
  Menu
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [exams, setExams] = useState([]);
  const [examHistory, setExamHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adminStats, setAdminStats] = useState({ questions: 0, users: 0 });

  useEffect(() => {
    fetchExams();
    fetchExamHistory();
    if (user?.role === 'admin') {
      fetchAdminStats();
    }
  }, [user]);

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

  const fetchAdminStats = async () => {
    try {
      const [questionsResponse, usersResponse] = await Promise.all([
        axios.get(`${API}/admin/questions`),
        axios.get(`${API}/admin/analytics/overview`)
      ]);
      
      setAdminStats({
        questions: questionsResponse.data.questions?.length || questionsResponse.data.length || 0,
        users: usersResponse.data.total_users || 0
      });
    } catch (error) {
      console.error('Failed to fetch admin stats:', error);
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
            <div className="flex items-center space-x-2 sm:space-x-4">
              <BookOpen className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">GATE Simulator</h1>
            </div>
            
            {/* Mobile menu */}
            <div className="flex items-center space-x-2 md:hidden">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                title="Menu"
              >
                {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </Button>
            </div>
            
            {/* Desktop menu */}
            <div className="hidden md:flex items-center space-x-4">
              <Badge variant={user?.role === 'admin' ? 'default' : 'secondary'}>
                {user?.role?.toUpperCase()}
              </Badge>
              <span className="text-gray-600 dark:text-gray-300 hidden lg:block">{user?.full_name}</span>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate('/questions')}
                className="hidden sm:flex"
              >
                <BookOpen className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Question Bank</span>
              </Button>
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
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-lg">
          <div className="px-4 py-3 space-y-3">
            <div className="flex items-center justify-center py-2">
              <Badge variant={user?.role === 'admin' ? 'default' : 'secondary'}>
                {user?.role?.toUpperCase()}
              </Badge>
              <span className="ml-3 text-gray-600 dark:text-gray-300 font-medium">{user?.full_name}</span>
            </div>
            <hr className="border-gray-200 dark:border-gray-600" />
            <Button 
              variant="ghost" 
              className="w-full justify-start" 
              onClick={() => {
                navigate('/questions');
                setMobileMenuOpen(false);
              }}
            >
              <BookOpen className="h-4 w-4 mr-3" />
              Question Bank
            </Button>
            <hr className="border-gray-200 dark:border-gray-600" />
            <Button 
              variant="ghost" 
              className="w-full justify-start" 
              onClick={() => {
                toggleTheme();
                setMobileMenuOpen(false);
              }}
            >
              {theme === 'light' ? <Moon className="h-4 w-4 mr-3" /> : <Sun className="h-4 w-4 mr-3" />}
              {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
            </Button>
            <Button 
              variant="ghost" 
              className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950" 
              onClick={() => {
                logout();
                setMobileMenuOpen(false);
              }}
            >
              <LogOut className="h-4 w-4 mr-3" />
              Logout
            </Button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">GATE Exam Dashboard</h2>
          <p className="text-gray-600 dark:text-gray-400">Track your progress and continue your GATE preparation</p>
        </div>

        {/* Admin Analytics Section */}
        {user?.role === 'admin' && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-semibold text-slate-900 dark:text-white">Admin Overview</h3>
              <Button 
                variant="outline" 
                onClick={() => navigate('/questions')}
                className="flex items-center"
              >
                <FileText className="h-4 w-4 mr-2" />
                Manage Questions
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center">
                    <FileText className="h-4 w-4 mr-2" />
                    Total Questions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{adminStats.questions}</div>
                  <p className="text-xs text-blue-100">In question bank</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center">
                    <BarChart className="h-4 w-4 mr-2" />
                    Active Exams
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{exams.length}</div>
                  <p className="text-xs text-green-100">Configured exams</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center">
                    <Users className="h-4 w-4 mr-2" />
                    Total Users
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{adminStats.users}</div>
                  <p className="text-xs text-purple-100">Registered users</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center">
                    <Activity className="h-4 w-4 mr-2" />
                    System Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">Active</div>
                  <p className="text-xs text-orange-100">All systems operational</p>
                </CardContent>
              </Card>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Upload className="h-5 w-5 mr-2 text-blue-600" />
                    Quick Actions
                  </CardTitle>
                  <CardDescription>Common administrative tasks</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button 
                    className="w-full justify-start" 
                    variant="outline"
                    onClick={() => navigate('/questions')}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Questions (CSV)
                  </Button>
                  <Button 
                    className="w-full justify-start" 
                    variant="outline"
                    onClick={() => navigate('/questions')}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Question
                  </Button>
                  <Button 
                    className="w-full justify-start" 
                    variant="outline"
                    onClick={() => navigate('/questions')}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Question Bank
                  </Button>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BarChart className="h-5 w-5 mr-2 text-green-600" />
                    Recent Activity
                  </CardTitle>
                  <CardDescription>Latest system activities</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center text-sm">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                      <span className="text-slate-600 dark:text-slate-300">System running smoothly</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                      <span className="text-slate-600 dark:text-slate-300">Database connected</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
                      <span className="text-slate-600 dark:text-slate-300">{examHistory.length} exam sessions completed</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <div className="w-2 h-2 bg-orange-500 rounded-full mr-3"></div>
                      <span className="text-slate-600 dark:text-slate-300">Admin panel ready</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
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
                        className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {completedExams.map((exam) => {
                const history = getExamHistory(exam.id);
                const latestAttempt = history.sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at))[0];
                
                return (
                  <Card key={exam.id} className="hover:shadow-lg transition-shadow dark:bg-gray-800 dark:border-gray-700">
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

// Exam Creation Form Component
const ExamCreationForm = ({ 
  examFormData, 
  examErrors, 
  examCreationLoading, 
  onFormChange, 
  onSubjectChange, 
  onQuestionTypeChange, 
  onSubmit, 
  availableSubjects = [],
  onCancel 
}) => {
  return (
    <form onSubmit={onSubmit} className="space-y-6 max-h-96 overflow-y-auto">
      {/* Basic Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="exam-title">Exam Title *</Label>
          <Input
            id="exam-title"
            name="title"
            value={examFormData.title}
            onChange={onFormChange}
            placeholder="e.g., GATE CS Mock Test 1"
            className={examErrors.title ? 'border-red-500' : ''}
          />
          {examErrors.title && <p className="text-red-500 text-sm">{examErrors.title}</p>}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="exam-duration">Duration (minutes) *</Label>
          <Input
            id="exam-duration"
            name="duration"
            type="number"
            min="30"
            max="300"
            value={examFormData.duration}
            onChange={onFormChange}
            className={examErrors.duration ? 'border-red-500' : ''}
          />
          {examErrors.duration && <p className="text-red-500 text-sm">{examErrors.duration}</p>}
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="exam-description">Description *</Label>
        <Textarea
          id="exam-description"
          name="description"
          value={examFormData.description}
          onChange={onFormChange}
          placeholder="Describe the exam content and objectives..."
          rows={3}
          className={examErrors.description ? 'border-red-500' : ''}
        />
        {examErrors.description && <p className="text-red-500 text-sm">{examErrors.description}</p>}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="exam-total-questions">Total Questions *</Label>
          <Input
            id="exam-total-questions"
            name="total_questions"
            type="number"
            min="1"
            max="200"
            value={examFormData.total_questions}
            onChange={onFormChange}
            className={examErrors.total_questions ? 'border-red-500' : ''}
          />
          {examErrors.total_questions && <p className="text-red-500 text-sm">{examErrors.total_questions}</p>}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="exam-difficulty">Difficulty Level</Label>
          <Select name="difficulty_level" value={examFormData.difficulty_level} onValueChange={(value) => {
            onFormChange({ target: { name: 'difficulty_level', value } });
          }}>
            <SelectTrigger>
              <SelectValue placeholder="Select difficulty" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="easy">Easy</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="hard">Hard</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {/* Subjects */}
      <div className="space-y-3">
        <Label>Subjects *</Label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-32 overflow-y-auto">
          {availableSubjects.map((subject) => (
            <div key={subject} className="flex items-center space-x-2">
              <Checkbox
                id={`exam-subject-${subject}`}
                checked={examFormData.subjects.includes(subject)}
                onCheckedChange={() => onSubjectChange(subject)}
              />
              <Label 
                htmlFor={`exam-subject-${subject}`} 
                className="text-sm font-normal cursor-pointer"
              >
                {subject}
              </Label>
            </div>
          ))}
        </div>
        {examErrors.subjects && <p className="text-red-500 text-sm">{examErrors.subjects}</p>}
      </div>
      
      {/* Question Types */}
      <div className="space-y-3">
        <Label>Question Types *</Label>
        <div className="flex gap-4">
          {['MCQ', 'MSQ', 'NAT'].map((type) => (
            <div key={type} className="flex items-center space-x-2">
              <Checkbox
                id={`exam-type-${type}`}
                checked={examFormData.question_types.includes(type)}
                onCheckedChange={() => onQuestionTypeChange(type)}
              />
              <Label htmlFor={`exam-type-${type}`} className="text-sm font-normal cursor-pointer">
                {type}
              </Label>
            </div>
          ))}
        </div>
        {examErrors.question_types && <p className="text-red-500 text-sm">{examErrors.question_types}</p>}
      </div>
      
      {/* Marking Scheme */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="exam-negative-marking"
            name="negative_marking"
            checked={examFormData.negative_marking}
            onCheckedChange={(checked) => {
              onFormChange({ target: { name: 'negative_marking', type: 'checkbox', checked } });
            }}
          />
          <Label htmlFor="exam-negative-marking">Enable Negative Marking</Label>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div className="space-y-1">
            <Label>MCQ Marks</Label>
            <Input
              type="number"
              name="mcq_marks"
              value={examFormData.mcq_marks}
              onChange={onFormChange}
              min="0"
              step="0.25"
              className="h-8"
            />
          </div>
          <div className="space-y-1">
            <Label>MCQ Negative</Label>
            <Input
              type="number"
              name="mcq_negative"
              value={examFormData.mcq_negative}
              onChange={onFormChange}
              min="0"
              step="0.01"
              className="h-8"
              disabled={!examFormData.negative_marking}
            />
          </div>
          <div className="space-y-1">
            <Label>MSQ Marks</Label>
            <Input
              type="number"
              name="msq_marks"
              value={examFormData.msq_marks}
              onChange={onFormChange}
              min="0"
              step="0.25"
              className="h-8"
            />
          </div>
          <div className="space-y-1">
            <Label>MSQ Negative</Label>
            <Input
              type="number"
              name="msq_negative"
              value={examFormData.msq_negative}
              onChange={onFormChange}
              min="0"
              step="0.01"
              className="h-8"
              disabled={!examFormData.negative_marking}
            />
          </div>
          <div className="space-y-1">
            <Label>NAT Marks</Label>
            <Input
              type="number"
              name="nat_marks"
              value={examFormData.nat_marks}
              onChange={onFormChange}
              min="0"
              step="0.25"
              className="h-8"
            />
          </div>
          <div className="space-y-1">
            <Label>NAT Negative</Label>
            <Input
              type="number"
              name="nat_negative"
              value={examFormData.nat_negative}
              onChange={onFormChange}
              min="0"
              step="0.01"
              className="h-8"
              disabled={!examFormData.negative_marking}
            />
          </div>
        </div>
      </div>
      
      {/* Submit Buttons */}
      <div className="flex justify-between items-center pt-6 border-t">
        <div className="text-sm text-slate-600">
          Selected: {examFormData.subjects.length} subject{examFormData.subjects.length !== 1 ? 's' : ''}
          , {examFormData.question_types.length} type{examFormData.question_types.length !== 1 ? 's' : ''}
        </div>
        <div className="flex space-x-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={examCreationLoading}>
            Cancel
          </Button>
          <Button type="submit" disabled={examCreationLoading}>
            {examCreationLoading ? (
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
  const [csvFile, setCsvFile] = useState(null);
  const [csvPreview, setCsvPreview] = useState(null);
  const [showCsvPreview, setShowCsvPreview] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [previewQuestions, setPreviewQuestions] = useState([]);
  const [selectedQuestionToDelete, setSelectedQuestionToDelete] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [showCreateExamDialog, setShowCreateExamDialog] = useState(false);
  const [examFormData, setExamFormData] = useState({
    title: '',
    description: '',
    duration: 180,
    total_questions: 50,
    subjects: [],
    question_types: ['MCQ', 'MSQ', 'NAT'],
    difficulty_level: 'medium',
    negative_marking: true,
    mcq_marks: 1,
    mcq_negative: 0.33,
    msq_marks: 2,
    msq_negative: 0,
    nat_marks: 2,
    nat_negative: 0
  });
  const [examErrors, setExamErrors] = useState({});
  const [examCreationLoading, setExamCreationLoading] = useState(false);
  const [exams, setExams] = useState([]);
  const [examsLoading, setExamsLoading] = useState(false);

  useEffect(() => {
    fetchQuestions();
    fetchExams();
  }, []);

  const fetchExams = async () => {
    setExamsLoading(true);
    try {
      const response = await axios.get(`${API}/exams`);
      setExams(response.data);
    } catch (error) {
      toast.error('Failed to fetch exams');
    } finally {
      setExamsLoading(false);
    }
  };

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

  const handleFileUpload = async (file, type) => {
    const formData = new FormData();
    formData.append('file', file);
    
    setUploadLoading(true);
    try {
      const response = await axios.post(`${API}/admin/upload/${type}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      toast.success(response.data.message);
      if (type === 'csv') {
        fetchQuestions();
        setCsvPreview(null);
        setShowCsvPreview(false);
        setCsvFile(null);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || `Failed to upload ${type.toUpperCase()}`);
    } finally {
      setUploadLoading(false);
    }
  };

  const handlePreviewCsv = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    setUploadLoading(true);
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
      setUploadLoading(false);
    }
  };

  const handlePreviewAll = () => {
    const myQuestions = getQuestionsByType('my-questions');
    setPreviewQuestions(myQuestions);
    setShowPreviewDialog(true);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedSubject('all');
    setSelectedType('all');
  };

  const handleExamFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setExamFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : 
             type === 'number' ? parseFloat(value) || 0 : 
             value
    }));
    
    // Clear error for this field
    if (examErrors[name]) {
      setExamErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleExamSubjectChange = (subject) => {
    setExamFormData(prev => ({
      ...prev,
      subjects: prev.subjects.includes(subject)
        ? prev.subjects.filter(s => s !== subject)
        : [...prev.subjects, subject]
    }));
  };

  const handleExamQuestionTypeChange = (type) => {
    setExamFormData(prev => ({
      ...prev,
      question_types: prev.question_types.includes(type)
        ? prev.question_types.filter(t => t !== type)
        : [...prev.question_types, type]
    }));
  };

  const validateExamForm = () => {
    const errors = {};
    
    if (!examFormData.title.trim()) {
      errors.title = 'Title is required';
    }
    
    if (!examFormData.description.trim()) {
      errors.description = 'Description is required';
    }
    
    if (examFormData.duration < 30) {
      errors.duration = 'Duration must be at least 30 minutes';
    }
    
    if (examFormData.total_questions < 1) {
      errors.total_questions = 'Must have at least 1 question';
    }
    
    if (examFormData.subjects.length === 0) {
      errors.subjects = 'At least one subject must be selected';
    }
    
    if (examFormData.question_types.length === 0) {
      errors.question_types = 'At least one question type must be selected';
    }
    
    setExamErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateExam = async (e) => {
    e.preventDefault();
    
    if (!validateExamForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }
    
    setExamCreationLoading(true);
    try {
      const response = await axios.post(`${API}/exams`, examFormData);
      toast.success('Exam created successfully!');
      setShowCreateExamDialog(false);
      fetchExams();
      
      // Reset form
      setExamFormData({
        title: '',
        description: '',
        duration: 180,
        total_questions: 50,
        subjects: [],
        question_types: ['MCQ', 'MSQ', 'NAT'],
        difficulty_level: 'medium',
        negative_marking: true,
        mcq_marks: 1,
        mcq_negative: 0.33,
        msq_marks: 2,
        msq_negative: 0,
        nat_marks: 2,
        nat_negative: 0
      });
      setExamErrors({});
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create exam');
    } finally {
      setExamCreationLoading(false);
    }
  };

  const handleDeleteQuestion = async (questionId) => {
    setDeleteLoading(true);
    try {
      await axios.delete(`${API}/questions/${questionId}`);
      toast.success('Question deleted successfully!');
      fetchQuestions();
      setShowDeleteDialog(false);
      setSelectedQuestionToDelete(null);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete question');
    } finally {
      setDeleteLoading(false);
    }
  };

  const getQuestionsByType = (type) => {
    let filteredQuestions;
    
    switch (type) {
      case 'my-questions':
        filteredQuestions = questions.filter(q => q.user_relation === 'own');
        break;
      case 'shared-with-me':
        filteredQuestions = questions.filter(q => q.user_relation === 'shared');
        break;
      case 'all-questions':
        filteredQuestions = questions;
        break;
      default:
        filteredQuestions = [];
    }
    
    // Apply search and filters only for all-questions tab
    if (type === 'all-questions') {
      // Apply search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        filteredQuestions = filteredQuestions.filter(q => 
          q.question_text.toLowerCase().includes(query) ||
          q.subject.toLowerCase().includes(query) ||
          q.topic.toLowerCase().includes(query) ||
          (q.explanation && q.explanation.toLowerCase().includes(query))
        );
      }
      
      // Apply subject filter
      if (selectedSubject && selectedSubject !== 'all') {
        filteredQuestions = filteredQuestions.filter(q => q.subject === selectedSubject);
      }
      
      // Apply type filter
      if (selectedType && selectedType !== 'all') {
        filteredQuestions = filteredQuestions.filter(q => q.question_type === selectedType);
      }
    }
    
    return filteredQuestions;
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2 sm:space-x-4">
              <BookOpen className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">Question Bank</h1>
            </div>
            
            {/* Mobile menu */}
            <div className="flex items-center space-x-2 md:hidden">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate('/dashboard')}
                title="Dashboard"
              >
                <Home className="h-4 w-4" />
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={toggleTheme}
                title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              >
                {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              </Button>
              <Button variant="outline" size="sm" onClick={logout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Desktop menu */}
            <div className="hidden md:flex items-center space-x-4">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate('/dashboard')}
              >
                <Home className="h-4 w-4 mr-2" />
                Dashboard
              </Button>
              <span className="text-slate-600 dark:text-slate-300 hidden lg:block">{user?.full_name}</span>
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
                <span className="hidden sm:inline">Logout</span>
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
            <TabsList className={`grid w-full ${user?.role === 'admin' ? 'grid-cols-6' : 'grid-cols-4'}`}>
              <TabsTrigger value="my-questions">My Questions</TabsTrigger>
              <TabsTrigger value="shared-with-me">Shared with Me</TabsTrigger>
              <TabsTrigger value="all-questions">All Questions</TabsTrigger>
              <TabsTrigger value="my-exams">My Exams</TabsTrigger>
              {user?.role === 'admin' && (
                <>
                  <TabsTrigger value="upload-csv">Upload CSV</TabsTrigger>
                  <TabsTrigger value="manage">Manage</TabsTrigger>
                </>
              )}
            </TabsList>

            {/* My Questions Tab */}
            <TabsContent value="my-questions" className="mt-6">
              <div className="space-y-6">
                {/* Personal Stats Header */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 border-l-4 border-l-blue-500">
                    <CardContent className="p-4">
                      <div className="flex items-center">
                        <FileText className="h-8 w-8 text-blue-600" />
                        <div className="ml-3">
                          <p className="text-sm font-medium text-blue-800 dark:text-blue-200">My Questions</p>
                          <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{getQuestionsByType('my-questions').length}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900 dark:to-green-800 border-l-4 border-l-green-500">
                    <CardContent className="p-4">
                      <div className="flex items-center">
                        <Share2 className="h-8 w-8 text-green-600" />
                        <div className="ml-3">
                          <p className="text-sm font-medium text-green-800 dark:text-green-200">Shared</p>
                          <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                            {getQuestionsByType('my-questions').filter(q => q.shared_count > 0).length}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900 dark:to-purple-800 border-l-4 border-l-purple-500">
                    <CardContent className="p-4">
                      <div className="flex items-center">
                        <BookOpen className="h-8 w-8 text-purple-600" />
                        <div className="ml-3">
                          <p className="text-sm font-medium text-purple-800 dark:text-purple-200">Subjects</p>
                          <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                            {[...new Set(getQuestionsByType('my-questions').map(q => q.subject))].length}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900 dark:to-orange-800 border-l-4 border-l-orange-500">
                    <CardContent className="p-4">
                      <div className="flex items-center">
                        <Clock className="h-8 w-8 text-orange-600" />
                        <div className="ml-3">
                          <p className="text-sm font-medium text-orange-800 dark:text-orange-200">This Week</p>
                          <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">0</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Enhanced Questions List with Action Buttons */}
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle className="text-green-700 dark:text-green-300">📝 Questions I Created</CardTitle>
                        <CardDescription>
                          Manage, share, and organize your personal question collection
                        </CardDescription>
                      </div>
                      <div className="flex space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={handlePreviewAll}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Preview All
                        </Button>
                        <Button variant="outline" size="sm">
                          <Share2 className="h-4 w-4 mr-2" />
                          Bulk Share
                        </Button>
                        <Button 
                          variant="default" 
                          size="sm"
                          onClick={() => setShowCreateExamDialog(true)}
                          disabled={getQuestionsByType('my-questions').length === 0}
                          className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Create Exam
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <QuestionsList 
                      questions={getQuestionsByType('my-questions')} 
                      loading={loading}
                      onShare={(question) => {
                        setSelectedQuestion(question);
                        setShowShareDialog(true);
                      }}
                      onView={(question) => {
                        setSelectedQuestion(question);
                        setShowPreviewDialog(true);
                      }}
                      onDelete={(question) => {
                        setSelectedQuestionToDelete(question);
                        setShowDeleteDialog(true);
                      }}
                      showShareButton={true}
                      showDeleteButton={true}
                      getQuestionBadgeColor={getQuestionBadgeColor}
                      getQuestionLabel={getQuestionLabel}
                    />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Shared with Me Tab */}
            <TabsContent value="shared-with-me" className="mt-6">
              <div className="space-y-6">
                {/* Shared Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="bg-gradient-to-r from-emerald-50 to-teal-100 dark:from-emerald-900 dark:to-teal-800 border-l-4 border-l-emerald-500">
                    <CardContent className="p-4">
                      <div className="flex items-center">
                        <Users className="h-8 w-8 text-emerald-600" />
                        <div className="ml-3">
                          <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">Shared Questions</p>
                          <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">{getQuestionsByType('shared-with-me').length}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-r from-cyan-50 to-blue-100 dark:from-cyan-900 dark:to-blue-800 border-l-4 border-l-cyan-500">
                    <CardContent className="p-4">
                      <div className="flex items-center">
                        <User className="h-8 w-8 text-cyan-600" />
                        <div className="ml-3">
                          <p className="text-sm font-medium text-cyan-800 dark:text-cyan-200">Contributors</p>
                          <p className="text-2xl font-bold text-cyan-900 dark:text-cyan-100">
                            {[...new Set(getQuestionsByType('shared-with-me').map(q => q.creator_name))].length}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-r from-indigo-50 to-purple-100 dark:from-indigo-900 dark:to-purple-800 border-l-4 border-l-indigo-500">
                    <CardContent className="p-4">
                      <div className="flex items-center">
                        <BookOpen className="h-8 w-8 text-indigo-600" />
                        <div className="ml-3">
                          <p className="text-sm font-medium text-indigo-800 dark:text-indigo-200">New Topics</p>
                          <p className="text-2xl font-bold text-indigo-900 dark:text-indigo-100">
                            {[...new Set(getQuestionsByType('shared-with-me').map(q => q.subject))].length}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Shared Questions */}
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle className="text-emerald-700 dark:text-emerald-300">🤝 Questions Shared With Me</CardTitle>
                        <CardDescription>
                          Collaborative questions from other users and admins
                        </CardDescription>
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">
                          <User className="h-4 w-4 mr-2" />
                          By Author
                        </Button>
                        <Button variant="outline" size="sm">
                          <BookOpen className="h-4 w-4 mr-2" />
                          By Subject
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {getQuestionsByType('shared-with-me').length === 0 ? (
                      <div className="text-center py-12">
                        <Users className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">No Shared Questions Yet</h3>
                        <p className="text-slate-600 dark:text-slate-400 mb-4">
                          When other users share questions with you, they'll appear here.
                        </p>
                        <div className="text-sm text-slate-500">
                          <p>💡 Tip: Ask colleagues or instructors to share their questions!</p>
                        </div>
                      </div>
                    ) : (
                      <QuestionsList 
                        questions={getQuestionsByType('shared-with-me')} 
                        loading={loading}
                        onShare={null}
                        showShareButton={false}
                        getQuestionBadgeColor={getQuestionBadgeColor}
                        getQuestionLabel={getQuestionLabel}
                        showCollaborativeFeatures={true}
                      />
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* All Questions Tab */}
            <TabsContent value="all-questions" className="mt-6">
              <div className="space-y-6">
                {/* Search and Filter Bar */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row gap-4">
                      <div className="flex-1">
                        <div className="relative">
                          <Input
                            placeholder="Search questions by text, subject, or topic..."
                            className="pl-10"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                          />
                          <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                          <SelectTrigger className="w-32">
                            <SelectValue placeholder="Subject" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Subjects</SelectItem>
                            {[...new Set(questions.map(q => q.subject))].map(subject => (
                              <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select value={selectedType} onValueChange={setSelectedType}>
                          <SelectTrigger className="w-28">
                            <SelectValue placeholder="Type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                            <SelectItem value="MCQ">MCQ</SelectItem>
                            <SelectItem value="MSQ">MSQ</SelectItem>
                            <SelectItem value="NAT">NAT</SelectItem>
                          </SelectContent>
                        </Select>
                        {(searchQuery || selectedSubject !== 'all' || selectedType !== 'all') && (
                          <Button variant="outline" size="sm" onClick={clearFilters}>
                            <X className="h-4 w-4 mr-1" />
                            Clear
                          </Button>
                        )}
                        <Button variant="outline" size="sm">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Statistics Overview */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <Card className="bg-gradient-to-r from-slate-50 to-gray-100 dark:from-slate-800 dark:to-gray-700 border-l-4 border-l-slate-500">
                    <CardContent className="p-3">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{getQuestionsByType('all-questions').length}</p>
                        <p className="text-xs text-slate-600 dark:text-slate-300">
                          {searchQuery || selectedSubject !== 'all' || selectedType !== 'all' ? 'Filtered' : 'Total'} Questions
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 border-l-4 border-l-blue-500">
                    <CardContent className="p-3">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                          {getQuestionsByType('all-questions').filter(q => q.question_type === 'MCQ').length}
                        </p>
                        <p className="text-xs text-blue-700 dark:text-blue-200">MCQ</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900 dark:to-green-800 border-l-4 border-l-green-500">
                    <CardContent className="p-3">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                          {getQuestionsByType('all-questions').filter(q => q.question_type === 'MSQ').length}
                        </p>
                        <p className="text-xs text-green-700 dark:text-green-200">MSQ</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900 dark:to-purple-800 border-l-4 border-l-purple-500">
                    <CardContent className="p-3">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                          {getQuestionsByType('all-questions').filter(q => q.question_type === 'NAT').length}
                        </p>
                        <p className="text-xs text-purple-700 dark:text-purple-200">NAT</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900 dark:to-orange-800 border-l-4 border-l-orange-500">
                    <CardContent className="p-3">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">
                          {[...new Set(getQuestionsByType('all-questions').map(q => q.subject))].length}
                        </p>
                        <p className="text-xs text-orange-700 dark:text-orange-200">Subjects</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* All Questions List */}
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle className="text-slate-700 dark:text-slate-300">📚 Complete Question Bank</CardTitle>
                        <CardDescription>
                          Browse the entire collection of questions from all sources
                        </CardDescription>
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">
                          <BarChart className="h-4 w-4 mr-2" />
                          Analytics
                        </Button>
                        <Button 
                          variant="default" 
                          size="sm"
                          onClick={() => setShowCreateExamDialog(true)}
                          disabled={getQuestionsByType('all-questions').length === 0}
                          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Create Exam
                        </Button>
                        <Button variant="outline" size="sm">
                          <Plus className="h-4 w-4 mr-2" />
                          Practice Set
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
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
                      showDetailedView={true}
                    />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* My Exams Tab */}
            <TabsContent value="my-exams" className="mt-6">
              <div className="space-y-6">
                {/* Exam Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card className="bg-gradient-to-r from-indigo-50 to-purple-100 dark:from-indigo-900 dark:to-purple-800 border-l-4 border-l-indigo-500">
                    <CardContent className="p-4">
                      <div className="flex items-center">
                        <BookOpen className="h-8 w-8 text-indigo-600" />
                        <div className="ml-3">
                          <p className="text-sm font-medium text-indigo-800 dark:text-indigo-200">Total Exams</p>
                          <p className="text-2xl font-bold text-indigo-900 dark:text-indigo-100">{exams.length}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 border-l-4 border-l-blue-500">
                    <CardContent className="p-4">
                      <div className="flex items-center">
                        <Play className="h-8 w-8 text-blue-600" />
                        <div className="ml-3">
                          <p className="text-sm font-medium text-blue-800 dark:text-blue-200">Active</p>
                          <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                            {exams.filter(exam => exam.status === 'active').length}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900 dark:to-green-800 border-l-4 border-l-green-500">
                    <CardContent className="p-4">
                      <div className="flex items-center">
                        <CheckCircle className="h-8 w-8 text-green-600" />
                        <div className="ml-3">
                          <p className="text-sm font-medium text-green-800 dark:text-green-200">Published</p>
                          <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                            {exams.filter(exam => exam.is_published).length}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900 dark:to-orange-800 border-l-4 border-l-orange-500">
                    <CardContent className="p-4">
                      <div className="flex items-center">
                        <Users className="h-8 w-8 text-orange-600" />
                        <div className="ml-3">
                          <p className="text-sm font-medium text-orange-800 dark:text-orange-200">Attempts</p>
                          <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">
                            {exams.reduce((total, exam) => total + (exam.attempt_count || 0), 0)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Exam List */}
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle className="text-indigo-700 dark:text-indigo-300">📝 My Created Exams</CardTitle>
                        <CardDescription>
                          Manage and monitor your exam configurations
                        </CardDescription>
                      </div>
                      <div className="flex space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setShowCreateExamDialog(true)}
                          disabled={questions.length === 0}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Create New
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {examsLoading ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto"></div>
                        <p className="mt-4 text-slate-600">Loading exams...</p>
                      </div>
                    ) : exams.length === 0 ? (
                      <div className="text-center py-12">
                        <BookOpen className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">No Exams Created</h3>
                        <p className="text-slate-600 dark:text-slate-400 mb-4">
                          Create your first exam from the available questions.
                        </p>
                        <Button 
                          onClick={() => setShowCreateExamDialog(true)}
                          disabled={questions.length === 0}
                          className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Create First Exam
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {exams.map((exam) => (
                          <Card key={exam.id} className="hover:shadow-md transition-shadow">
                            <CardContent className="p-6">
                              <div className="flex justify-between items-start mb-4">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-3 mb-2">
                                    <Badge className="bg-indigo-100 text-indigo-800 border-indigo-300">
                                      {exam.difficulty_level || 'Medium'}
                                    </Badge>
                                    <Badge variant="outline">
                                      {exam.total_questions} Questions
                                    </Badge>
                                    <Badge variant="outline">
                                      {exam.duration} min
                                    </Badge>
                                    {exam.is_published && (
                                      <Badge className="bg-green-100 text-green-800 border-green-300">
                                        Published
                                      </Badge>
                                    )}
                                  </div>
                                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                                    {exam.title}
                                  </h3>
                                  <p className="text-slate-600 dark:text-slate-400 mb-2">
                                    {exam.description}
                                  </p>
                                  <div className="text-sm text-slate-500">
                                    <span>Subjects: {exam.subjects?.join(', ') || 'Multiple'}</span>
                                    <span className="mx-2">•</span>
                                    <span>Created: {new Date(exam.created_at).toLocaleDateString()}</span>
                                    <span className="mx-2">•</span>
                                    <span>Attempts: {exam.attempt_count || 0}</span>
                                  </div>
                                </div>
                                <div className="flex space-x-2 ml-4">
                                  <Button variant="outline" size="sm" title="View Details">
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button variant="outline" size="sm" title="Edit Exam">
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    title="Delete Exam"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                              
                              {/* Quick Stats */}
                              <div className="bg-slate-50 dark:bg-slate-700 p-4 rounded-lg">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                  <div className="text-center">
                                    <p className="font-medium text-slate-900 dark:text-slate-100">
                                      {exam.mcq_marks || 1}
                                    </p>
                                    <p className="text-slate-600 dark:text-slate-400">MCQ Marks</p>
                                  </div>
                                  <div className="text-center">
                                    <p className="font-medium text-slate-900 dark:text-slate-100">
                                      {exam.msq_marks || 2}
                                    </p>
                                    <p className="text-slate-600 dark:text-slate-400">MSQ Marks</p>
                                  </div>
                                  <div className="text-center">
                                    <p className="font-medium text-slate-900 dark:text-slate-100">
                                      {exam.nat_marks || 2}
                                    </p>
                                    <p className="text-slate-600 dark:text-slate-400">NAT Marks</p>
                                  </div>
                                  <div className="text-center">
                                    <p className="font-medium text-slate-900 dark:text-slate-100">
                                      {exam.negative_marking ? 'Yes' : 'No'}
                                    </p>
                                    <p className="text-slate-600 dark:text-slate-400">Negative Marking</p>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* CSV Upload Tab */}
            {user?.role === 'admin' && (
              <TabsContent value="upload-csv" className="mt-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Upload className="h-5 w-5 mr-2" />
                        Upload CSV Questions
                      </CardTitle>
                      <CardDescription>
                        Import questions from a CSV file to add them to the question bank
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
                              setCsvFile(file);
                              if (file) {
                                setCsvPreview(null);
                                setShowCsvPreview(false);
                              }
                            }}
                            disabled={uploadLoading}
                          />
                        </div>
                        
                        <div className="flex space-x-3">
                          <Button
                            variant="outline"
                            onClick={() => {
                              if (csvFile) {
                                handlePreviewCsv(csvFile);
                              } else {
                                toast.error('Please select a CSV file first');
                              }
                            }}
                            disabled={uploadLoading || !csvFile}
                          >
                            <FileQuestion className="h-4 w-4 mr-2" />
                            Preview CSV
                          </Button>
                          <Button
                            onClick={() => {
                              if (csvFile) {
                                handleFileUpload(csvFile, 'csv');
                              } else {
                                toast.error('Please select a CSV file first');
                              }
                            }}
                            disabled={uploadLoading || !csvFile}
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            {uploadLoading ? 'Uploading...' : 'Upload CSV'}
                          </Button>
                        </div>
                        
                        {showCsvPreview && csvPreview && (
                          <div className="mt-6">
                            <CsvPreview preview={csvPreview} onClose={() => setShowCsvPreview(false)} />
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <FileText className="h-5 w-5 mr-2" />
                        Upload Instructions
                      </CardTitle>
                      <CardDescription>
                        Follow this format for your CSV file
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <h4 className="font-medium text-slate-900">Required CSV Columns:</h4>
                        <div className="text-sm space-y-1">
                          <p><code className="bg-slate-100 px-1 rounded">question_text</code> - The question content</p>
                          <p><code className="bg-slate-100 px-1 rounded">type</code> - MCQ, MSQ, or NAT</p>
                          <p><code className="bg-slate-100 px-1 rounded">subject</code> - Subject name</p>
                          <p><code className="bg-slate-100 px-1 rounded">topic</code> - Topic within subject</p>
                          <p><code className="bg-slate-100 px-1 rounded">option_1</code> to <code className="bg-slate-100 px-1 rounded">option_4</code> - Answer options</p>
                          <p><code className="bg-slate-100 px-1 rounded">option_1_correct</code> to <code className="bg-slate-100 px-1 rounded">option_4_correct</code> - true/false</p>
                          <p><code className="bg-slate-100 px-1 rounded">marks</code> - Question marks (optional)</p>
                          <p><code className="bg-slate-100 px-1 rounded">explanation</code> - Answer explanation (optional)</p>
                        </div>
                        <Alert>
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription className="text-xs">
                            For NAT questions, use the correct_answer column instead of options.
                          </AlertDescription>
                        </Alert>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            )}

            {/* Management Tab */}
            {user?.role === 'admin' && (
              <TabsContent value="manage" className="mt-6">
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Question Bank Statistics</CardTitle>
                      <CardDescription>Overview of questions in the database</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                          <div className="text-2xl font-bold text-blue-600">{questions.length}</div>
                          <div className="text-sm text-blue-600">Total Questions</div>
                        </div>
                        <div className="text-center p-4 bg-green-50 rounded-lg">
                          <div className="text-2xl font-bold text-green-600">
                            {[...new Set(questions.map(q => q.subject))].length}
                          </div>
                          <div className="text-sm text-green-600">Subjects</div>
                        </div>
                        <div className="text-center p-4 bg-purple-50 rounded-lg">
                          <div className="text-2xl font-bold text-purple-600">
                            {questions.filter(q => q.user_relation === 'admin').length}
                          </div>
                          <div className="text-sm text-purple-600">Admin Questions</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Subject-wise Breakdown</CardTitle>
                      <CardDescription>Question distribution across subjects</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {[...new Set(questions.map(q => q.subject))].map(subject => {
                          const subjectQuestions = questions.filter(q => q.subject === subject);
                          const percentage = questions.length > 0 ? (subjectQuestions.length / questions.length * 100) : 0;
                          return (
                            <div key={subject} className="flex items-center justify-between">
                              <span className="font-medium text-slate-900">{subject}</span>
                              <div className="flex items-center space-x-2">
                                <div className="w-32 bg-slate-200 rounded-full h-2">
                                  <div 
                                    className="bg-blue-600 h-2 rounded-full" 
                                    style={{ width: `${percentage}%` }}
                                  ></div>
                                </div>
                                <span className="text-sm text-slate-600 w-12 text-right">
                                  {subjectQuestions.length}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            )}
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

        {/* Question Preview Dialog */}
        <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Question Preview</DialogTitle>
              <DialogDescription>
                {previewQuestions.length > 0 ? 
                  `Previewing ${previewQuestions.length} questions` : 
                  selectedQuestion ? 'Question Details' : 'Question Preview'
                }
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {previewQuestions.length > 0 ? (
                previewQuestions.map((question, index) => (
                  <Card key={question.id} className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-lg">Question {index + 1}</h4>
                        <div className="flex space-x-2">
                          <Badge variant="outline">{question.question_type}</Badge>
                          <Badge variant="outline">{question.subject}</Badge>
                          <Badge variant="secondary">{question.marks} marks</Badge>
                        </div>
                      </div>
                      <p className="text-slate-900 dark:text-slate-100 leading-relaxed">
                        {question.question_text}
                      </p>
                      {question.options && question.options.length > 0 && (
                        <div className="space-y-2">
                          <p className="font-medium text-sm text-slate-700">Options:</p>
                          {question.options.map((option, optIndex) => (
                            <div key={optIndex} className={`p-2 rounded text-sm ${
                              option.is_correct ? 'bg-green-50 text-green-800 border-l-4 border-green-400' : 'bg-slate-50 text-slate-700'
                            }`}>
                              <span className="font-medium">{String.fromCharCode(65 + optIndex)}.</span> {option.text}
                              {option.is_correct && <span className="ml-2 text-green-600">✓ Correct</span>}
                            </div>
                          ))}
                        </div>
                      )}
                      {question.explanation && (
                        <div className="bg-blue-50 p-3 rounded">
                          <p className="text-sm font-medium text-blue-800">Explanation:</p>
                          <p className="text-sm text-blue-700">{question.explanation}</p>
                        </div>
                      )}
                      <div className="text-xs text-slate-500">
                        Topic: {question.topic} • Difficulty: {question.difficulty || 'Medium'}
                      </div>
                    </div>
                  </Card>
                ))
              ) : selectedQuestion && (
                <Card className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-lg">Question Details</h4>
                      <div className="flex space-x-2">
                        <Badge variant="outline">{selectedQuestion.question_type}</Badge>
                        <Badge variant="outline">{selectedQuestion.subject}</Badge>
                        <Badge variant="secondary">{selectedQuestion.marks} marks</Badge>
                      </div>
                    </div>
                    <p className="text-slate-900 dark:text-slate-100 leading-relaxed">
                      {selectedQuestion.question_text}
                    </p>
                    {selectedQuestion.options && selectedQuestion.options.length > 0 && (
                      <div className="space-y-2">
                        <p className="font-medium text-sm text-slate-700">Options:</p>
                        {selectedQuestion.options.map((option, optIndex) => (
                          <div key={optIndex} className={`p-2 rounded text-sm ${
                            option.is_correct ? 'bg-green-50 text-green-800 border-l-4 border-green-400' : 'bg-slate-50 text-slate-700'
                          }`}>
                            <span className="font-medium">{String.fromCharCode(65 + optIndex)}.</span> {option.text}
                            {option.is_correct && <span className="ml-2 text-green-600">✓ Correct</span>}
                          </div>
                        ))}
                      </div>
                    )}
                    {selectedQuestion.explanation && (
                      <div className="bg-blue-50 p-3 rounded">
                        <p className="text-sm font-medium text-blue-800">Explanation:</p>
                        <p className="text-sm text-blue-700">{selectedQuestion.explanation}</p>
                      </div>
                    )}
                    <div className="text-xs text-slate-500">
                      Topic: {selectedQuestion.topic} • Difficulty: {selectedQuestion.difficulty || 'Medium'}
                    </div>
                  </div>
                </Card>
              )}
            </div>
            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={() => {
                setShowPreviewDialog(false);
                setPreviewQuestions([]);
                setSelectedQuestion(null);
              }}>
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-red-600">Delete Question</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this question? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            {selectedQuestionToDelete && (
              <div className="bg-slate-50 p-3 rounded">
                <p className="font-medium text-sm text-slate-900">Question:</p>
                <p className="text-sm text-slate-700 mt-1">
                  {selectedQuestionToDelete.question_text.substring(0, 100)}...
                </p>
                <div className="flex space-x-2 mt-2">
                  <Badge variant="outline">{selectedQuestionToDelete.question_type}</Badge>
                  <Badge variant="outline">{selectedQuestionToDelete.subject}</Badge>
                </div>
              </div>
            )}
            <div className="flex justify-end space-x-3">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowDeleteDialog(false);
                  setSelectedQuestionToDelete(null);
                }}
              >
                Cancel
              </Button>
              <Button 
                variant="destructive"
                onClick={() => selectedQuestionToDelete && handleDeleteQuestion(selectedQuestionToDelete.id)}
                disabled={deleteLoading}
              >
                {deleteLoading ? 'Deleting...' : 'Delete Question'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Exam Creation Dialog */}
        <Dialog open={showCreateExamDialog} onOpenChange={setShowCreateExamDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <Plus className="h-5 w-5 mr-2" />
                Create New Exam
              </DialogTitle>
              <DialogDescription>
                Create a customized exam from existing questions in the database
              </DialogDescription>
            </DialogHeader>
            <ExamCreationForm
              examFormData={examFormData}
              examErrors={examErrors}
              examCreationLoading={examCreationLoading}
              onFormChange={handleExamFormChange}
              onSubjectChange={handleExamSubjectChange}
              onQuestionTypeChange={handleExamQuestionTypeChange}
              onSubmit={handleCreateExam}
              availableSubjects={[...new Set(questions.map(q => q.subject))]}
              onCancel={() => setShowCreateExamDialog(false)}
            />
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

// Questions List Component
const QuestionsList = ({ questions, loading, onShare, onView, onDelete, showShareButton, showDeleteButton = false, getQuestionBadgeColor, getQuestionLabel }) => {
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
                    title="Share Question"
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => onView && onView(question)}
                  title="View Question Details"
                >
                  <Eye className="h-4 w-4" />
                </Button>
                {showDeleteButton && question.user_relation === 'own' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onDelete && onDelete(question)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    title="Delete Question"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
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
          <div className="flex items-center space-x-2 sm:space-x-4">
            <BookOpen className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
            <h1 className="text-base sm:text-lg font-semibold text-slate-900">GATE Exam</h1>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-6">
            <div className="flex items-center space-x-1 sm:space-x-2">
              <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-slate-600" />
              <span className={`font-mono text-sm sm:text-lg font-semibold ${timeLeft < 600 ? 'text-red-600' : 'text-slate-900'}`}>
                {formatTime(timeLeft)}
              </span>
            </div>
            <Button 
              variant="destructive" 
              size="sm"
              onClick={() => setShowSubmitDialog(true)}
              disabled={isSubmitting}
            >
              Submit Exam
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Question Palette */}
        <div className="lg:w-80 bg-white border-b lg:border-b-0 lg:border-r border-slate-200 p-4">
          <h3 className="font-semibold text-slate-900 mb-4">Questions</h3>
          <div className="grid grid-cols-8 sm:grid-cols-10 lg:grid-cols-5 gap-2 mb-6">
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
        <div className="flex-1 p-4 sm:p-6">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 sm:p-6">
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
              <div className="flex flex-col sm:flex-row justify-between space-y-3 sm:space-y-0">
                <div className="flex space-x-2 sm:space-x-3 justify-center sm:justify-start">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrevious}
                    disabled={currentIndex === 0}
                  >
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleNext}
                    disabled={currentIndex === session.questions.length - 1}
                  >
                    Next
                  </Button>
                </div>
                <div className="flex space-x-2 sm:space-x-3 justify-center sm:justify-end">
                  <Button variant="outline" size="sm" onClick={clearResponse}>
                    <span className="hidden sm:inline">Clear Response</span>
                    <span className="sm:hidden">Clear</span>
                  </Button>
                  <Button variant="outline" size="sm" onClick={markForReview}>
                    <Flag className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Mark for Review</span>
                    <span className="sm:hidden">Mark</span>
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