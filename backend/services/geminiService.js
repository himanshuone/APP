const { GoogleGenerativeAI } = require('@google/generative-ai');

class GeminiService {
  constructor() {
    // Load environment variables if not already loaded
    if (!process.env.GEMINI_API_KEY) {
      try {
        require('dotenv').config();
      } catch (error) {
        console.error('Failed to load environment variables:', error);
      }
    }
    
    if (!process.env.GEMINI_API_KEY) {
      console.warn('GEMINI_API_KEY not found in environment variables');
      this.genAI = null;
      return;
    }
    
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    console.log('Gemini AI service initialized successfully');
  }

  // Check if AI service is available
  isAvailable() {
    return this.genAI !== null;
  }

  // Generate explanation for a question
  async generateExplanation(questionData) {
    if (!this.isAvailable()) {
      throw new Error('Gemini AI service is not available');
    }

    try {
      const prompt = `Generate a clear, detailed explanation for this GATE exam question:

Question: ${questionData.question_text}
Type: ${questionData.question_type}
Subject: ${questionData.subject}
Topic: ${questionData.topic}
${questionData.options ? `Options: ${questionData.options.map((opt, idx) => `${String.fromCharCode(65 + idx)}. ${opt.text}${opt.is_correct ? ' (Correct)' : ''}`).join(', ')}` : ''}
${questionData.correct_answer ? `Correct Answer: ${questionData.correct_answer}` : ''}

Please provide:
1. Step-by-step solution
2. Key concepts involved
3. Why other options are incorrect (if MCQ/MSQ)
4. Tips to remember this concept

Keep the explanation clear and educational for GATE aspirants.`;

      const result = await this.model.generateContent(prompt);
      const explanation = result.response.text();
      
      return {
        success: true,
        explanation: explanation.trim()
      };
    } catch (error) {
      console.error('Error generating explanation:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Categorize question automatically
  async categorizeQuestion(questionText) {
    if (!this.isAvailable()) {
      throw new Error('Gemini AI service is not available');
    }

    try {
      const prompt = `Analyze this GATE exam question and provide categorization:

Question: ${questionText}

Please provide the following in JSON format:
{
  "subject": "most likely GATE subject (CS/EC/ME/EE etc.)",
  "topic": "specific topic within the subject",
  "difficulty": "easy/medium/hard",
  "concepts": ["key concept 1", "key concept 2"],
  "question_type_suggestion": "MCQ/MSQ/NAT based on question nature"
}

Only respond with valid JSON.`;

      const result = await this.model.generateContent(prompt);
      const response = result.response.text();
      
      // Try to parse JSON from response
      try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const categorization = JSON.parse(jsonMatch[0]);
          return {
            success: true,
            categorization
          };
        } else {
          throw new Error('No valid JSON found in response');
        }
      } catch (parseError) {
        console.error('Error parsing categorization JSON:', parseError);
        return {
          success: false,
          error: 'Failed to parse AI response'
        };
      }
    } catch (error) {
      console.error('Error categorizing question:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Enhance question quality
  async enhanceQuestion(questionData) {
    if (!this.isAvailable()) {
      throw new Error('Gemini AI service is not available');
    }

    try {
      const prompt = `Improve this GATE exam question for clarity and quality:

Original Question: ${questionData.question_text}
Type: ${questionData.question_type}
Subject: ${questionData.subject}
${questionData.options ? `Current Options: ${questionData.options.map((opt, idx) => `${String.fromCharCode(65 + idx)}. ${opt.text}`).join(', ')}` : ''}

Please provide:
1. Improved question text (more clear and precise)
2. Better options (if applicable) that are more challenging and realistic
3. Suggestions for improvement

Respond in JSON format:
{
  "improved_question": "enhanced question text",
  "improved_options": ["option 1", "option 2", "option 3", "option 4"],
  "improvements_made": ["improvement 1", "improvement 2"],
  "quality_score": "1-10"
}

Only respond with valid JSON.`;

      const result = await this.model.generateContent(prompt);
      const response = result.response.text();
      
      try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const enhancement = JSON.parse(jsonMatch[0]);
          return {
            success: true,
            enhancement
          };
        } else {
          throw new Error('No valid JSON found in response');
        }
      } catch (parseError) {
        console.error('Error parsing enhancement JSON:', parseError);
        return {
          success: false,
          error: 'Failed to parse AI response'
        };
      }
    } catch (error) {
      console.error('Error enhancing question:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Answer student doubts/questions
  async answerDoubt(question, context = '') {
    if (!this.isAvailable()) {
      throw new Error('Gemini AI service is not available');
    }

    try {
      const prompt = `You are an expert GATE exam tutor. A student has asked this question:

Student Question: ${question}
${context ? `Context: ${context}` : ''}

Please provide:
1. A clear, detailed answer
2. Step-by-step explanation if it's a problem
3. Related concepts they should know
4. Tips for GATE exam preparation on this topic

Keep your response educational, encouraging, and focused on GATE exam preparation.`;

      const result = await this.model.generateContent(prompt);
      const answer = result.response.text();
      
      return {
        success: true,
        answer: answer.trim()
      };
    } catch (error) {
      console.error('Error answering doubt:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Generate questions for a topic
  async generateQuestions(subject, topic, difficulty = 'medium', count = 1, questionType = 'MCQ') {
    if (!this.isAvailable()) {
      throw new Error('Gemini AI service is not available');
    }

    try {
      const prompt = `Generate ${count} high-quality GATE exam questions on the following topic:

Subject: ${subject}
Topic: ${topic}
Difficulty: ${difficulty}
Question Type: ${questionType}

For each question, provide in JSON format:
{
  "questions": [
    {
      "question_text": "the question",
      "question_type": "${questionType}",
      "subject": "${subject}",
      "topic": "${topic}",
      "difficulty": "${difficulty}",
      "options": [
        {"text": "option A", "is_correct": false},
        {"text": "option B", "is_correct": true},
        {"text": "option C", "is_correct": false},
        {"text": "option D", "is_correct": false}
      ],
      "correct_answer": "for NAT type questions",
      "explanation": "detailed explanation",
      "marks": 1 or 2,
      "negative_marks": 0.33
    }
  ]
}

Make sure questions are:
1. Relevant to GATE syllabus
2. Technically accurate
3. Appropriate difficulty level
4. Have clear, unambiguous language

Only respond with valid JSON.`;

      const result = await this.model.generateContent(prompt);
      const response = result.response.text();
      
      try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const generated = JSON.parse(jsonMatch[0]);
          return {
            success: true,
            questions: generated.questions || []
          };
        } else {
          throw new Error('No valid JSON found in response');
        }
      } catch (parseError) {
        console.error('Error parsing generated questions JSON:', parseError);
        return {
          success: false,
          error: 'Failed to parse AI response'
        };
      }
    } catch (error) {
      console.error('Error generating questions:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Analyze student performance and provide recommendations
  async analyzePerformance(performanceData) {
    if (!this.isAvailable()) {
      throw new Error('Gemini AI service is not available');
    }

    try {
      const prompt = `Analyze this student's GATE exam performance data and provide insights:

Performance Data: ${JSON.stringify(performanceData, null, 2)}

Please provide analysis in JSON format:
{
  "overall_score": "percentage or grade",
  "strengths": ["strength 1", "strength 2"],
  "weaknesses": ["weakness 1", "weakness 2"],
  "recommendations": ["recommendation 1", "recommendation 2"],
  "study_plan": ["action 1", "action 2", "action 3"],
  "focus_topics": ["topic 1", "topic 2"],
  "predicted_gate_score": "estimated score range"
}

Only respond with valid JSON.`;

      const result = await this.model.generateContent(prompt);
      const response = result.response.text();
      
      try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const analysis = JSON.parse(jsonMatch[0]);
          return {
            success: true,
            analysis
          };
        } else {
          throw new Error('No valid JSON found in response');
        }
      } catch (parseError) {
        console.error('Error parsing performance analysis JSON:', parseError);
        return {
          success: false,
          error: 'Failed to parse AI response'
        };
      }
    } catch (error) {
      console.error('Error analyzing performance:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new GeminiService();
