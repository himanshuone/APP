// Test script to check exam creation functionality
const axios = require('axios');

async function testExamCreation() {
  try {
    console.log('Testing exam creation...');
    
    // First, let's try to get questions to see available subjects
    const questionsResponse = await axios.get('http://localhost:8001/api/admin/questions', {
      headers: {
        'Authorization': 'Bearer test-token' // This will fail but let's see the response
      }
    });
    
  } catch (error) {
    if (error.response) {
      console.log('Questions endpoint response:', error.response.status, error.response.data);
    } else {
      console.log('Network error:', error.message);
    }
  }
  
  try {
    // Test exam creation endpoint
    const examData = {
      name: "Test GATE Exam",
      description: "Test exam for debugging",
      duration_minutes: 180,
      total_questions: 5,
      subjects: ["General Aptitude", "Computer Science", "C Programming"]
    };
    
    const examResponse = await axios.post('http://localhost:8001/api/admin/exams', examData, {
      headers: {
        'Authorization': 'Bearer test-token',
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Exam created successfully:', examResponse.data);
    
  } catch (error) {
    if (error.response) {
      console.log('Exam creation error:', error.response.status, error.response.data);
    } else {
      console.log('Network error:', error.message);
    }
  }
}

testExamCreation();
