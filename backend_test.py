to#!/usr/bin/env python3
"""
GATE Exam Simulator Backend API Test Suite
Tests the Node.js/Express backend functionality
"""

import requests
import sys
import json
import io
import csv
from datetime import datetime
import time

class GATEExamAPITester:
    def __init__(self, base_url="https://gate-prep-hub-2.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.admin_token = None
        self.student_token = None
        self.admin_user = None
        self.student_user = None
        self.tests_run = 0
        self.tests_passed = 0
        self.created_question_id = None
        self.created_exam_id = None
        self.exam_session_id = None

    def log_test(self, name, success, details=""):
        """Log test results"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")
        
        if details and success:
            print(f"   ℹ️  {details}")

    def make_request(self, method, endpoint, data=None, headers=None, files=None):
        """Make HTTP request with error handling"""
        url = f"{self.api_url}/{endpoint}" if not endpoint.startswith('http') else endpoint
        
        default_headers = {'Content-Type': 'application/json'}
        if headers:
            default_headers.update(headers)
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=default_headers)
            elif method == 'POST':
                if files:
                    # Remove Content-Type for file uploads
                    if 'Content-Type' in default_headers:
                        del default_headers['Content-Type']
                    response = requests.post(url, data=data, files=files, headers=default_headers)
                else:
                    response = requests.post(url, json=data, headers=default_headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=default_headers)
            
            return response
        except Exception as e:
            print(f"Request error: {str(e)}")
            return None

    def test_api_health(self):
        """Test basic API connectivity"""
        response = self.make_request('GET', '')
        success = response and response.status_code == 200
        details = f"Status: {response.status_code}" if response else "No response"
        self.log_test("API Health Check", success, details)
        return success

    def test_user_registration(self):
        """Test user registration for both admin and student"""
        timestamp = datetime.now().strftime("%H%M%S")
        
        # Register admin user
        admin_data = {
            "email": f"admin{timestamp}@test.com",
            "password": "admin123",
            "full_name": "Test Admin",
            "role": "admin"
        }
        
        response = self.make_request('POST', 'auth/register', admin_data)
        admin_success = response and response.status_code == 201
        
        if admin_success:
            self.admin_user = response.json()
            admin_details = f"Admin registered: {self.admin_user.get('email')}"
        else:
            admin_details = f"Status: {response.status_code if response else 'No response'}"
        
        self.log_test("Admin Registration", admin_success, admin_details)
        
        # Register student user
        student_data = {
            "email": f"student{timestamp}@test.com",
            "password": "student123",
            "full_name": "Test Student",
            "role": "student"
        }
        
        response = self.make_request('POST', 'auth/register', student_data)
        student_success = response and response.status_code == 201
        
        if student_success:
            self.student_user = response.json()
            student_details = f"Student registered: {self.student_user.get('email')}"
        else:
            student_details = f"Status: {response.status_code if response else 'No response'}"
        
        self.log_test("Student Registration", student_success, student_details)
        
        return admin_success and student_success

    def test_user_login(self):
        """Test login functionality"""
        if not self.admin_user or not self.student_user:
            self.log_test("Login Test", False, "Users not registered")
            return False
        
        # Admin login
        admin_login_data = {
            "email": self.admin_user['email'],
            "password": "admin123"
        }
        
        response = self.make_request('POST', 'auth/login', admin_login_data)
        admin_success = response and response.status_code == 200
        
        if admin_success:
            token_data = response.json()
            self.admin_token = token_data.get('access_token')
            admin_details = "Admin login successful"
        else:
            admin_details = f"Status: {response.status_code if response else 'No response'}"
        
        self.log_test("Admin Login", admin_success, admin_details)
        
        # Student login
        student_login_data = {
            "email": self.student_user['email'],
            "password": "student123"
        }
        
        response = self.make_request('POST', 'auth/login', student_login_data)
        student_success = response and response.status_code == 200
        
        if student_success:
            token_data = response.json()
            self.student_token = token_data.get('access_token')
            student_details = "Student login successful"
        else:
            student_details = f"Status: {response.status_code if response else 'No response'}"
        
        self.log_test("Student Login", student_success, student_details)
        
        return admin_success and student_success

    def test_auth_me_endpoint(self):
        """Test the /auth/me endpoint"""
        if not self.admin_token:
            self.log_test("Auth Me Test", False, "No admin token")
            return False
        
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        response = self.make_request('GET', 'auth/me', headers=headers)
        
        success = response and response.status_code == 200
        if success:
            user_data = response.json()
            details = f"User: {user_data.get('full_name')} ({user_data.get('role')})"
        else:
            details = f"Status: {response.status_code if response else 'No response'}"
        
        self.log_test("Auth Me Endpoint", success, details)
        return success

    def test_admin_question_creation(self):
        """Test question creation by admin"""
        if not self.admin_token:
            self.log_test("Question Creation", False, "No admin token")
            return False
        
        question_data = {
            "question_text": "What is the time complexity of binary search?",
            "question_type": "MCQ",
            "subject": "Computer Science",
            "topic": "Algorithms",
            "difficulty": "medium",
            "marks": 2.0,
            "negative_marks": 0.66,
            "options": [
                {"text": "O(n)", "is_correct": False},
                {"text": "O(log n)", "is_correct": True},
                {"text": "O(n²)", "is_correct": False},
                {"text": "O(1)", "is_correct": False}
            ],
            "explanation": "Binary search divides the search space in half each time."
        }
        
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        response = self.make_request('POST', 'admin/questions', question_data, headers)
        
        success = response and response.status_code == 201
        if success:
            question = response.json()
            self.created_question_id = question.get('id')
            details = f"Question created with ID: {self.created_question_id}"
        else:
            details = f"Status: {response.status_code if response else 'No response'}"
        
        self.log_test("Admin Question Creation", success, details)
        return success

    def test_admin_get_questions(self):
        """Test fetching questions by admin"""
        if not self.admin_token:
            self.log_test("Get Questions", False, "No admin token")
            return False
        
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        response = self.make_request('GET', 'admin/questions', headers=headers)
        
        success = response and response.status_code == 200
        if success:
            questions = response.json()
            details = f"Retrieved {len(questions)} questions"
        else:
            details = f"Status: {response.status_code if response else 'No response'}"
        
        self.log_test("Admin Get Questions", success, details)
        return success

    def test_csv_upload(self):
        """Test CSV file upload functionality"""
        if not self.admin_token:
            self.log_test("CSV Upload", False, "No admin token")
            return False
        
        # Create sample CSV data
        csv_data = """question_text,type,subject,topic,option_1,option_1_correct,option_2,option_2_correct,option_3,option_3_correct,option_4,option_4_correct,marks,negative_marks,explanation
"What is 2+2?",MCQ,Mathematics,Arithmetic,"3",false,"4",true,"5",false,"6",false,1,0.33,"Basic addition"
"Select all prime numbers",MSQ,Mathematics,"Number Theory","2",true,"3",true,"4",false,"5",true,2,0.66,"Prime numbers are divisible only by 1 and themselves"
"""
        
        # Create a file-like object
        csv_file = io.StringIO(csv_data)
        csv_bytes = csv_data.encode('utf-8')
        
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        files = {'file': ('test_questions.csv', csv_bytes, 'text/csv')}
        
        response = self.make_request('POST', 'admin/upload/csv', data={}, headers=headers, files=files)
        
        success = response and response.status_code == 200
        if success:
            result = response.json()
            details = result.get('message', 'CSV uploaded successfully')
        else:
            details = f"Status: {response.status_code if response else 'No response'}"
            if response:
                try:
                    error_detail = response.json().get('detail', 'Unknown error')
                    details += f" - {error_detail}"
                except:
                    details += f" - {response.text[:100]}"
        
        self.log_test("CSV Upload", success, details)
        return success

    def test_exam_configuration(self):
        """Test exam configuration creation"""
        if not self.admin_token:
            self.log_test("Exam Configuration", False, "No admin token")
            return False
        
        exam_data = {
            "name": "Sample GATE Exam",
            "description": "A sample GATE examination for testing",
            "duration_minutes": 180,
            "total_questions": 2,
            "subjects": ["Computer Science", "Mathematics"],
            "randomize_questions": True
        }
        
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        response = self.make_request('POST', 'admin/exams', exam_data, headers)
        
        success = response and response.status_code == 201
        if success:
            exam = response.json()
            self.created_exam_id = exam.get('id')
            details = f"Exam created: {exam.get('name')}"
        else:
            details = f"Status: {response.status_code if response else 'No response'}"
        
        self.log_test("Exam Configuration Creation", success, details)
        return success

    def test_student_exam_access(self):
        """Test student access to available exams"""
        if not self.student_token:
            self.log_test("Student Exam Access", False, "No student token")
            return False
        
        headers = {'Authorization': f'Bearer {self.student_token}'}
        response = self.make_request('GET', 'exams', headers=headers)
        
        success = response and response.status_code == 200
        if success:
            exams = response.json()
            details = f"Student can access {len(exams)} exams"
        else:
            details = f"Status: {response.status_code if response else 'No response'}"
        
        self.log_test("Student Exam Access", success, details)
        return success

    def test_start_exam(self):
        """Test starting an exam session"""
        if not self.student_token or not self.created_exam_id:
            self.log_test("Start Exam", False, "Missing student token or exam ID")
            return False
        
        headers = {'Authorization': f'Bearer {self.student_token}'}
        response = self.make_request('POST', f'exam/start/{self.created_exam_id}', headers=headers)
        
        success = response and response.status_code == 201
        if success:
            session = response.json()
            self.exam_session_id = session.get('id')
            details = f"Exam session started: {self.exam_session_id}"
        else:
            details = f"Status: {response.status_code if response else 'No response'}"
            if response:
                try:
                    error_detail = response.json().get('detail', 'Unknown error')
                    details += f" - {error_detail}"
                except:
                    pass
        
        self.log_test("Start Exam Session", success, details)
        return success

    def test_student_admin_access_restriction(self):
        """Test that students cannot access admin routes"""
        if not self.student_token:
            self.log_test("Student Admin Restriction", False, "No student token")
            return False
        
        headers = {'Authorization': f'Bearer {self.student_token}'}
        response = self.make_request('GET', 'admin/questions', headers=headers)
        
        # Should return 403 Forbidden
        success = response and response.status_code == 403
        details = f"Status: {response.status_code} (Expected 403)" if response else "No response"
        
        self.log_test("Student Admin Access Restriction", success, details)
        return success

    def test_cors_configuration(self):
        """Test CORS configuration"""
        response = self.make_request('GET', '', headers={'Origin': 'https://example.com'})
        
        success = response and response.status_code == 200
        if success and hasattr(response, 'headers'):
            cors_header = response.headers.get('Access-Control-Allow-Origin')
            details = f"CORS header: {cors_header}"
        else:
            details = "CORS headers not found or request failed"
        
        self.log_test("CORS Configuration", success, details)
        return success

    def run_all_tests(self):
        """Run all test cases"""
        print("🚀 Starting GATE Exam Simulator Backend Tests")
        print("=" * 60)
        
        # Basic connectivity
        if not self.test_api_health():
            print("❌ API is not accessible. Stopping tests.")
            return False
        
        # Authentication flow
        print("\n📝 Testing Authentication Flow...")
        self.test_user_registration()
        self.test_user_login()
        self.test_auth_me_endpoint()
        
        # Admin functionality
        print("\n👨‍💼 Testing Admin Functionality...")
        self.test_admin_question_creation()
        self.test_admin_get_questions()
        self.test_csv_upload()
        self.test_exam_configuration()
        
        # Student functionality
        print("\n👨‍🎓 Testing Student Functionality...")
        self.test_student_exam_access()
        self.test_start_exam()
        
        # Security tests
        print("\n🔒 Testing Security & Access Control...")
        self.test_student_admin_access_restriction()
        
        # Configuration tests
        print("\n⚙️ Testing Configuration...")
        self.test_cors_configuration()
        
        # Summary
        print("\n" + "=" * 60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed! Backend is working correctly.")
            return True
        else:
            failed = self.tests_run - self.tests_passed
            print(f"⚠️  {failed} test(s) failed. Please check the issues above.")
            return False

def main():
    """Main test execution"""
    tester = GATEExamAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())