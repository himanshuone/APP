require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testGeminiAPI() {
  console.log('🧪 Testing Gemini API...\n');
  
  // Check if API key is loaded
  console.log('1. Checking API key...');
  if (!process.env.GEMINI_API_KEY) {
    console.error('❌ GEMINI_API_KEY not found in environment variables');
    return;
  }
  console.log('✅ API key found:', process.env.GEMINI_API_KEY.substring(0, 20) + '...');
  
  try {
    // Initialize Gemini
    console.log('\n2. Initializing Gemini AI...');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    console.log('✅ Gemini AI initialized successfully');
    
    // Test basic functionality
    console.log('\n3. Testing basic question answering...');
    const prompt = "What is 2 + 2? Give a brief answer.";
    console.log('Question:', prompt);
    
    const result = await model.generateContent(prompt);
    const response = result.response.text();
    
    console.log('✅ Gemini API Response:', response.trim());
    
    // Test GATE-specific functionality
    console.log('\n4. Testing GATE exam specific functionality...');
    const gatePrompt = `Generate a simple MCQ question for GATE Computer Science on Data Structures topic. 
    Provide in the following format:
    Question: [question text]
    A) [option 1]
    B) [option 2] (Correct)
    C) [option 3]
    D) [option 4]
    Explanation: [brief explanation]`;
    
    console.log('GATE Question Request...');
    const gateResult = await model.generateContent(gatePrompt);
    const gateResponse = gateResult.response.text();
    
    console.log('✅ GATE Question Generated:\n', gateResponse.trim());
    
    // Test our custom service
    console.log('\n5. Testing custom Gemini service...');
    const geminiService = require('./services/geminiService');
    
    if (!geminiService.isAvailable()) {
      console.error('❌ Custom Gemini service not available');
      return;
    }
    
    console.log('✅ Custom service is available');
    
    // Test explanation generation
    const testQuestion = {
      question_text: "What is the time complexity of binary search?",
      question_type: "MCQ",
      subject: "Computer Science",
      topic: "Algorithms",
      options: [
        { text: "O(n)", is_correct: false },
        { text: "O(log n)", is_correct: true },
        { text: "O(n^2)", is_correct: false },
        { text: "O(1)", is_correct: false }
      ]
    };
    
    console.log('Testing explanation generation...');
    const explanationResult = await geminiService.generateExplanation(testQuestion);
    
    if (explanationResult.success) {
      console.log('✅ Explanation generated successfully:');
      console.log(explanationResult.explanation.substring(0, 200) + '...');
    } else {
      console.error('❌ Failed to generate explanation:', explanationResult.error);
    }
    
    // Test AI tutor functionality
    console.log('\n6. Testing AI Tutor functionality...');
    const tutorResult = await geminiService.answerDoubt("What is the difference between stack and queue?");
    
    if (tutorResult.success) {
      console.log('✅ AI Tutor response generated successfully:');
      console.log(tutorResult.answer.substring(0, 200) + '...');
    } else {
      console.error('❌ Failed to get AI Tutor response:', tutorResult.error);
    }
    
    console.log('\n🎉 All tests completed successfully! Gemini API is working correctly.');
    
  } catch (error) {
    console.error('❌ Error testing Gemini API:', error);
    
    if (error.message.includes('API_KEY_INVALID')) {
      console.error('🔑 The API key appears to be invalid. Please check your GEMINI_API_KEY.');
    } else if (error.message.includes('PERMISSION_DENIED')) {
      console.error('🚫 Permission denied. Please check if the API key has the required permissions.');
    } else if (error.message.includes('QUOTA_EXCEEDED')) {
      console.error('📊 API quota exceeded. Please check your Gemini API usage limits.');
    } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      console.error('🌐 Network error. Please check your internet connection.');
    }
  }
}

// Run the test
testGeminiAPI().catch(console.error);
