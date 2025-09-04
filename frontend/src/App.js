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
  Home
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
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    try {
      const response = await axios.get(`${API}/exams`);
      setExams(response.data);
    } catch (error) {
      toast.error('Failed to fetch exams');
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <BookOpen className="h-8 w-8 text-blue-600" />
              <h1 className="text-xl font-bold text-slate-900">GATE Simulator</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant={user?.role === 'admin' ? 'default' : 'secondary'}>
                {user?.role?.toUpperCase()}
              </Badge>
              <span className="text-slate-600">{user?.full_name}</span>
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
          <h2 className="text-3xl font-bold text-slate-900 mb-2">Available Exams</h2>
          <p className="text-slate-600">Select an exam to begin your GATE preparation</p>
        </div>

        {exams.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <FileText className="h-16 w-16 text-slate-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-900 mb-2">No Exams Available</h3>
              <p className="text-slate-600 mb-4">
                {user?.role === 'admin' 
                  ? 'Create your first exam configuration to get started.'
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
            {exams.map((exam) => (
              <Card key={exam.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    {exam.name}
                    <Badge variant="outline">
                      <Clock className="h-3 w-3 mr-1" />
                      {exam.duration_minutes}m
                    </Badge>
                  </CardTitle>
                  <CardDescription>{exam.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Questions:</span>
                      <span className="font-medium">{exam.total_questions}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Subjects:</span>
                      <span className="font-medium">{exam.subjects.join(', ')}</span>
                    </div>
                    <Button 
                      className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
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
      </main>
    </div>
  );
};

// Admin Panel Component
const AdminPanel = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('questions');
  const [questions, setQuestions] = useState([]);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(false);

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
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || `Failed to upload ${type.toUpperCase()}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
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
            <Card>
              <CardHeader>
                <CardTitle>Exam Configuration</CardTitle>
                <CardDescription>
                  Create and manage exam configurations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <BarChart className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">Exam Management</h3>
                  <p className="text-slate-600">Exam configuration feature coming soon!</p>
                </div>
              </CardContent>
            </Card>
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
                          if (e.target.files[0]) {
                            handleFileUpload(e.target.files[0], 'csv');
                          }
                        }}
                        disabled={loading}
                      />
                    </div>
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
  const [loading, setLoading] = useState(true);

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
        </div>
      </main>
    </div>
  );
};

// Main App Component
function App() {
  return (
    <div className="App">
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
            <Route path="/" element={<Navigate to="/dashboard" />} />
          </Routes>
        </Router>
        <Toaster />
      </AuthProvider>
    </div>
  );
}

export default App;