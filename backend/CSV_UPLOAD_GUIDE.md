# CSV Upload Guide for GATE Exam Simulator

## 📄 CSV Format Requirements

### Required Headers
Your CSV file must include these exact column headers:

```csv
question_text,question_type,subject,topic,option_1,option_1_correct,option_2,option_2_correct,option_3,option_3_correct,option_4,option_4_correct,marks,negative_marks,explanation
```

### Column Descriptions

| Column | Required | Description | Example Values |
|--------|----------|-------------|----------------|
| `question_text` | ✅ Yes | The question text | "What is the time complexity of binary search?" |
| `question_type` | ✅ Yes | Type of question | MCQ, MSQ, NAT |
| `subject` | ✅ Yes | Subject category | Computer Science, Mathematics, etc. |
| `topic` | ✅ Yes | Topic within subject | Algorithms, Data Structures, etc. |
| `option_1` | For MCQ/MSQ | First option text | "O(n)" |
| `option_1_correct` | For MCQ/MSQ | Is option 1 correct? | true, false, yes, no, 1, 0 |
| `option_2` | For MCQ/MSQ | Second option text | "O(log n)" |
| `option_2_correct` | For MCQ/MSQ | Is option 2 correct? | true, false, yes, no, 1, 0 |
| `option_3` | For MCQ/MSQ | Third option text | "O(n²)" |
| `option_3_correct` | For MCQ/MSQ | Is option 3 correct? | true, false, yes, no, 1, 0 |
| `option_4` | For MCQ/MSQ | Fourth option text | "O(1)" |
| `option_4_correct` | For MCQ/MSQ | Is option 4 correct? | true, false, yes, no, 1, 0 |
| `marks` | Optional | Points for correct answer | 1, 2, 1.5 (default: 1.0) |
| `negative_marks` | Optional | Points deducted for wrong answer | 0.33, 0.5 (default: 0.33) |
| `explanation` | Optional | Explanation for the answer | "Binary search divides search space in half" |

## 📋 Question Types

### 1. MCQ (Multiple Choice Question)
- **Single correct answer**
- Must have at least 2 options
- Exactly one option should be marked as correct

Example:
```csv
"What is 2+2?",MCQ,Mathematics,Arithmetic,"3",false,"4",true,"5",false,"6",false,1,0.33,"Simple addition"
```

### 2. MSQ (Multiple Select Question)  
- **Multiple correct answers**
- Must have at least 2 options
- Can have multiple options marked as correct

Example:
```csv
"Which are programming languages?",MSQ,Computer Science,Programming,"Java",true,"HTML",false,"Python",true,"CSS",false,2,0.66,"Java and Python are programming languages"
```

### 3. NAT (Numerical Answer Type)
- **Numerical answer only**
- No options needed (leave option fields empty)
- Answer goes in correct_answer field

Example:
```csv
"What is 25 + 15?",NAT,Mathematics,Arithmetic,"","","","","","","","",1,0,"Simple addition"
```

## ✅ Sample CSV File

```csv
question_text,question_type,subject,topic,option_1,option_1_correct,option_2,option_2_correct,option_3,option_3_correct,option_4,option_4_correct,marks,negative_marks,explanation
"What is the time complexity of binary search?",MCQ,Computer Science,Algorithms,"O(n)",false,"O(log n)",true,"O(n²)",false,"O(1)",false,2,0.66,"Binary search divides search space in half"
"Which data structure follows LIFO?",MCQ,Computer Science,Data Structures,"Queue",false,"Stack",true,"Array",false,"Tree",false,1,0.33,"Stack follows Last In First Out principle"
"Which are sorting algorithms?",MSQ,Computer Science,Algorithms,"Bubble Sort",true,"Binary Search",false,"Quick Sort",true,"Linear Search",false,2,0.66,"Bubble Sort and Quick Sort are sorting algorithms"
"What is 25 + 15?",NAT,Mathematics,Arithmetic,"","","","","","","","",1,0,"Simple addition: 25 + 15 = 40"
"Find the square root of 64",NAT,Mathematics,Arithmetic,"","","","","","","","",1,0.33,"√64 = 8"
```

## 🚨 Common Issues & Solutions

### 1. **CSV Parsing Errors**
- **Issue**: Commas in question text break parsing
- **Solution**: Wrap text with commas in double quotes
```csv
"In C++, what does the operator ',' do?",MCQ,...
```

### 2. **Question Type Errors** 
- **Issue**: Invalid question type
- **Solution**: Use exactly: MCQ, MSQ, or NAT (case-insensitive)

### 3. **Missing Required Fields**
- **Issue**: Empty question_text, subject, or topic
- **Solution**: Ensure all required fields have values

### 4. **Option Validation Errors**
- **Issue**: MCQ with no correct answers or multiple correct answers
- **Solution**: MCQ must have exactly one correct answer, MSQ can have multiple

### 5. **Authentication Errors**
- **Issue**: "Could not validate credentials"
- **Solution**: Ensure you're logged in as admin user

## 📤 How to Upload

### Via Web Interface
1. Login as admin user
2. Go to Admin Panel → Upload Questions
3. Select your CSV file
4. Click Upload

### Via API (curl)
```bash
# First login to get token
TOKEN=$(curl -s -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}' | \
  jq -r '.access_token')

# Upload CSV
curl -X POST http://localhost:8001/api/admin/upload/csv \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@your_questions.csv"
```

## 🔍 Validation Process

The system validates each row and will:
1. ✅ **Accept valid questions** and add them to database
2. ❌ **Skip invalid rows** and report errors
3. 📊 **Return summary** with count of successful uploads and any errors

Example Response:
```json
{
  "message": "Successfully added 3 questions",
  "errors": [
    "Row 2: Invalid question type: INVALID",
    "Row 4: Question text is required"
  ]
}
```

## 💡 Best Practices

1. **Start Small**: Test with 2-3 questions first
2. **Use Templates**: Copy the sample CSV format exactly
3. **Validate Data**: Check your CSV in a text editor before upload
4. **Backup**: Keep a backup of your question data
5. **Test Questions**: Review uploaded questions in the admin panel

---

**Happy Question Uploading! 📚**
