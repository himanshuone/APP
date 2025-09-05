import axios from 'axios';

const API_BASE = process.env.REACT_APP_BACKEND_URL ? `${process.env.REACT_APP_BACKEND_URL}/api` : 'http://localhost:8000/api';

class AIService {
  // Check AI service status
  async getStatus() {
    try {
      const response = await axios.get(`${API_BASE}/ai/status`);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || 'Failed to check AI status'
      };
    }
  }

  // Generate explanation for a question
  async generateExplanation(questionId) {
    try {
      const response = await axios.post(`${API_BASE}/ai/generate-explanation/${questionId}`);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || 'Failed to generate explanation'
      };
    }
  }

  // Categorize question using AI
  async categorizeQuestion(questionText) {
    try {
      const response = await axios.post(`${API_BASE}/ai/categorize-question`, {
        question_text: questionText
      });
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || 'Failed to categorize question'
      };
    }
  }

  // Enhance question quality
  async enhanceQuestion(questionId) {
    try {
      const response = await axios.post(`${API_BASE}/ai/enhance-question/${questionId}`);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || 'Failed to enhance question'
      };
    }
  }

  // Ask AI Tutor
  async askTutor(question, context = '') {
    try {
      const response = await axios.post(`${API_BASE}/ai/ask-tutor`, {
        question,
        context
      });
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || 'Failed to get answer from AI Tutor'
      };
    }
  }

  // Generate questions using AI
  async generateQuestions(subject, topic, difficulty = 'medium', count = 1, questionType = 'MCQ') {
    try {
      const response = await axios.post(`${API_BASE}/ai/generate-questions`, {
        subject,
        topic,
        difficulty,
        count,
        question_type: questionType
      });
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || 'Failed to generate questions'
      };
    }
  }

  // Analyze user performance
  async analyzePerformance() {
    try {
      const response = await axios.post(`${API_BASE}/ai/analyze-performance`);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || 'Failed to analyze performance'
      };
    }
  }

  // Bulk generate explanations (admin only)
  async bulkGenerateExplanations() {
    try {
      const response = await axios.post(`${API_BASE}/ai/bulk-generate-explanations`);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || 'Failed to bulk generate explanations'
      };
    }
  }
}

export default new AIService();
