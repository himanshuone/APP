from fastapi import FastAPI, APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Union
import uuid
from datetime import datetime, timedelta, timezone
import jwt
from passlib.context import CryptContext
import pdfplumber
import csv
import io
import json
from enum import Enum

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'gate_exam')]

# Create the main app without a prefix
app = FastAPI(title="GATE Exam Simulator", version="1.0.0")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = os.environ.get("SECRET_KEY", "your-secret-key-change-this")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Enums
class QuestionType(str, Enum):
    MCQ = "MCQ"  # Multiple Choice Question - single answer
    MSQ = "MSQ"  # Multiple Select Question - multiple answers
    NAT = "NAT"  # Numerical Answer Type

class UserRole(str, Enum):
    STUDENT = "student"
    ADMIN = "admin"

class QuestionStatus(str, Enum):
    NOT_VISITED = "not_visited"
    NOT_ANSWERED = "not_answered"
    ANSWERED = "answered"
    MARKED = "marked"
    MARKED_ANSWERED = "marked_answered"

class QuestionSource(str, Enum):
    ADMIN = "admin"
    STUDENT = "student"
    SHARED = "shared"

# User Models
class UserCreate(BaseModel):
    email: str
    password: str
    full_name: str
    role: UserRole = UserRole.STUDENT

class UserLogin(BaseModel):
    email: str
    password: str

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    full_name: str
    role: UserRole
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_active: bool = True

class Token(BaseModel):
    access_token: str
    token_type: str

# Question Models
class QuestionOption(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    text: str
    is_correct: bool = False

class Question(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    question_text: str
    question_type: QuestionType
    subject: str
    topic: str
    difficulty: str = "medium"
    marks: float = 1.0
    negative_marks: float = 0.33
    options: List[QuestionOption] = []  # For MCQ/MSQ
    correct_answer: Optional[Union[str, float, List[str]]] = None  # For NAT or correct option IDs
    explanation: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: str
    source: QuestionSource = QuestionSource.ADMIN
    shared_with: List[str] = []  # List of user IDs who can see this question
    is_public: bool = False  # If true, visible to all users

class QuestionCreate(BaseModel):
    question_text: str
    question_type: QuestionType
    subject: str
    topic: str
    difficulty: str = "medium"
    marks: float = 1.0
    negative_marks: float = 0.33
    options: List[QuestionOption] = []
    correct_answer: Optional[Union[str, float, List[str]]] = None
    explanation: Optional[str] = None
    source: QuestionSource = QuestionSource.ADMIN
    is_public: bool = False

# Exam Models
class ExamConfig(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    duration_minutes: int = 180  # 3 hours default
    total_questions: int
    subjects: List[str]
    randomize_questions: bool = True
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ExamSession(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    exam_config_id: str
    questions: List[str]  # Question IDs
    answers: Dict[str, Any] = {}  # Question ID -> Answer
    question_status: Dict[str, QuestionStatus] = {}
    start_time: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    end_time: Optional[datetime] = None
    submitted: bool = False
    current_question: int = 0

class ExamAnswer(BaseModel):
    question_id: str
    answer: Union[str, float, List[str]]
    status: QuestionStatus = QuestionStatus.ANSWERED

class ExamResult(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    exam_session_id: str
    total_questions: int
    attempted: int
    correct: int
    incorrect: int
    score: float
    percentage: float
    subject_wise_score: Dict[str, Dict[str, Any]]
    time_taken_minutes: int
    submitted_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ShareQuestionRequest(BaseModel):
    question_id: str
    recipient_emails: List[str]
    message: Optional[str] = None

# Helper Functions
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception
    
    user = await db.users.find_one({"email": email})
    if user is None:
        raise credentials_exception
    return User(**user)

async def get_admin_user(current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    return current_user

# Auth Routes
@api_router.post("/auth/register", response_model=User)
async def register(user_data: UserCreate):
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Hash password
    hashed_password = get_password_hash(user_data.password)
    
    # Create user
    user_dict = user_data.dict()
    user_dict["password"] = hashed_password
    user_obj = User(**{k: v for k, v in user_dict.items() if k != "password"})
    
    # Store in database
    await db.users.insert_one({**user_obj.dict(), "password": hashed_password})
    return user_obj

@api_router.post("/auth/login", response_model=Token)
async def login(user_data: UserLogin):
    user = await db.users.find_one({"email": user_data.email})
    if not user or not verify_password(user_data.password, user["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["email"]}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

# Question Management Routes
@api_router.post("/admin/questions", response_model=Question)
async def create_question(
    question_data: QuestionCreate,
    current_user: User = Depends(get_admin_user)
):
    question_dict = question_data.dict()
    question_dict["created_by"] = current_user.id
    question = Question(**question_dict)
    
    await db.questions.insert_one(question.dict())
    return question

@api_router.get("/admin/questions", response_model=List[Question])
async def get_questions(
    skip: int = 0,
    limit: int = 100,
    subject: Optional[str] = None,
    current_user: User = Depends(get_admin_user)
):
    query = {}
    if subject:
        query["subject"] = subject
    
    questions = await db.questions.find(query).skip(skip).limit(limit).to_list(length=None)
    return [Question(**q) for q in questions]

@api_router.delete("/admin/questions/{question_id}")
async def delete_question(
    question_id: str,
    current_user: User = Depends(get_admin_user)
):
    result = await db.questions.delete_one({"id": question_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Question not found")
    return {"message": "Question deleted successfully"}

# File Upload Routes
@api_router.post("/admin/upload/csv")
async def upload_csv_questions(
    file: UploadFile = File(...),
    current_user: User = Depends(get_admin_user)
):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV")
    
    contents = await file.read()
    csv_data = io.StringIO(contents.decode('utf-8'))
    csv_reader = csv.DictReader(csv_data)
    
    questions_added = 0
    errors = []
    
    for row_num, row in enumerate(csv_reader, start=2):
        try:
            # Parse question type
            question_type = QuestionType(row.get('type', 'MCQ').upper())
            
            # Parse options for MCQ/MSQ
            options = []
            if question_type in [QuestionType.MCQ, QuestionType.MSQ]:
                for i in range(1, 5):  # Support up to 4 options
                    option_text = row.get(f'option_{i}', '').strip()
                    if option_text:
                        is_correct = row.get(f'option_{i}_correct', '').lower() in ['true', '1', 'yes']
                        options.append(QuestionOption(text=option_text, is_correct=is_correct))
            
            # Create question
            question_data = QuestionCreate(
                question_text=row['question_text'],
                question_type=question_type,
                subject=row.get('subject', 'General'),
                topic=row.get('topic', 'General'),
                difficulty=row.get('difficulty', 'medium'),
                marks=float(row.get('marks', 1.0)),
                negative_marks=float(row.get('negative_marks', 0.33)),
                options=options,
                correct_answer=row.get('correct_answer'),
                explanation=row.get('explanation'),
                source=QuestionSource.ADMIN,
                is_public=True
            )
            
            question_dict = question_data.dict()
            question_dict["created_by"] = current_user.id
            question_dict["shared_with"] = []  # Initialize empty shared list
            question = Question(**question_dict)
            
            await db.questions.insert_one(question.dict())
            questions_added += 1
            
        except Exception as e:
            errors.append(f"Row {row_num}: {str(e)}")
    
    return {
        "message": f"Successfully added {questions_added} questions",
        "errors": errors if errors else None
    }

@api_router.post("/questions", response_model=Question)
async def create_student_question(
    question_data: QuestionCreate,
    current_user: User = Depends(get_current_user)
):
    # Set source as student for non-admin users
    if current_user.role != UserRole.ADMIN:
        question_data.source = QuestionSource.STUDENT
    
    question_dict = question_data.dict()
    question_dict["created_by"] = current_user.id
    question_dict["shared_with"] = []  # Initialize empty shared list
    question = Question(**question_dict)
    
    await db.questions.insert_one(question.dict())
    return question

@api_router.post("/questions/{question_id}/share")
async def share_question(
    question_id: str,
    share_request: ShareQuestionRequest,
    current_user: User = Depends(get_current_user)
):
    # Get the question
    question = await db.questions.find_one({"id": question_id})
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    # Check if user owns this question or is admin
    if question["created_by"] != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="You can only share your own questions")
    
    # Find recipient users by email
    recipient_ids = []
    for email in share_request.recipient_emails:
        recipient = await db.users.find_one({"email": email})
        if recipient:
            recipient_ids.append(recipient["id"])
    
    if not recipient_ids:
        raise HTTPException(status_code=400, detail="No valid recipients found")
    
    # Update question with shared recipients
    current_shared = question.get("shared_with", [])
    new_shared = list(set(current_shared + recipient_ids))
    
    await db.questions.update_one(
        {"id": question_id},
        {"$set": {"shared_with": new_shared}}
    )
    
    return {
        "message": f"Question shared with {len(recipient_ids)} user(s)",
        "shared_with": len(new_shared)
    }

@api_router.get("/questions")
async def get_user_questions(
    current_user: User = Depends(get_current_user)
):
    # Build query for questions visible to user
    query = {
        "$or": [
            {"created_by": current_user.id},  # Own questions
            {"shared_with": current_user.id},  # Shared with user
            {"is_public": True},  # Public questions
        ]
    }
    
    # Admins can see all questions
    if current_user.role == UserRole.ADMIN:
        query = {}
    
    questions = await db.questions.find(query).to_list(length=None)
    
    # Add metadata to questions
    for question in questions:
        if question.get("created_by") == current_user.id:
            question["user_relation"] = "own"
        elif current_user.id in question.get("shared_with", []):
            question["user_relation"] = "shared"
        elif question.get("is_public", False):
            question["user_relation"] = "public"
        else:
            question["user_relation"] = "admin"
            
        # Get creator info for display
        creator = await db.users.find_one({"id": question["created_by"]})
        if creator:
            question["creator_name"] = creator["full_name"]
            question["creator_email"] = creator["email"]
    
    return questions

@api_router.post("/admin/upload/pdf")
async def upload_pdf_questions(
    file: UploadFile = File(...),
    current_user: User = Depends(get_admin_user)
):
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="File must be a PDF")
    
    contents = await file.read()
    
    try:
        # Extract text from PDF
        with pdfplumber.open(io.BytesIO(contents)) as pdf:
            full_text = ""
            for page in pdf.pages:
                full_text += page.extract_text() + "\n"
        
        # For now, return the extracted text for manual processing
        # In a real implementation, you'd need more sophisticated parsing
        return {
            "message": "PDF text extracted successfully",
            "extracted_text": full_text[:1000] + "..." if len(full_text) > 1000 else full_text,
            "note": "PDF parsing requires manual review. Please format as CSV for automatic import."
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error processing PDF: {str(e)}")

# Exam Configuration Routes
@api_router.post("/admin/exams", response_model=ExamConfig)
async def create_exam_config(
    exam_data: ExamConfig,
    current_user: User = Depends(get_admin_user)
):
    exam_dict = exam_data.dict()
    exam_dict["created_by"] = current_user.id
    exam = ExamConfig(**exam_dict)
    
    await db.exam_configs.insert_one(exam.dict())
    return exam

@api_router.get("/admin/exams", response_model=List[ExamConfig])
async def get_exam_configs(current_user: User = Depends(get_admin_user)):
    configs = await db.exam_configs.find().to_list(length=None)
    return [ExamConfig(**config) for config in configs]

# Student Exam Routes
@api_router.get("/exams", response_model=List[ExamConfig])
async def get_available_exams(current_user: User = Depends(get_current_user)):
    configs = await db.exam_configs.find().to_list(length=None)
    return [ExamConfig(**config) for config in configs]

@api_router.post("/exam/start/{exam_config_id}", response_model=ExamSession)
async def start_exam(
    exam_config_id: str,
    current_user: User = Depends(get_current_user)
):
    # Get exam config
    exam_config = await db.exam_configs.find_one({"id": exam_config_id})
    if not exam_config:
        raise HTTPException(status_code=404, detail="Exam configuration not found")
    
    # Check if user already has an active session
    existing_session = await db.exam_sessions.find_one({
        "user_id": current_user.id,
        "exam_config_id": exam_config_id,
        "submitted": False
    })
    
    if existing_session:
        return ExamSession(**existing_session)
    
    # Get questions based on subjects
    query = {"subject": {"$in": exam_config["subjects"]}}
    all_questions = await db.questions.find(query).to_list(length=None)
    
    if len(all_questions) < exam_config["total_questions"]:
        raise HTTPException(
            status_code=400, 
            detail="Not enough questions available for this exam"
        )
    
    # Always randomize questions to ensure different experience on retakes
    import random
    selected_questions = random.sample(all_questions, exam_config["total_questions"])
    
    question_ids = [q["id"] for q in selected_questions]
    
    # Initialize question status
    question_status = {qid: QuestionStatus.NOT_VISITED for qid in question_ids}
    question_status[question_ids[0]] = QuestionStatus.NOT_ANSWERED  # First question visited
    
    # Create exam session
    session = ExamSession(
        user_id=current_user.id,
        exam_config_id=exam_config_id,
        questions=question_ids,
        question_status=question_status
    )
    
    await db.exam_sessions.insert_one(session.dict())
    return session

@api_router.get("/exam/session/{session_id}", response_model=ExamSession)
async def get_exam_session(
    session_id: str,
    current_user: User = Depends(get_current_user)
):
    session = await db.exam_sessions.find_one({
        "id": session_id,
        "user_id": current_user.id
    })
    
    if not session:
        raise HTTPException(status_code=404, detail="Exam session not found")
    
    return ExamSession(**session)

@api_router.get("/exam/question/{session_id}/{question_index}")
async def get_exam_question(
    session_id: str,
    question_index: int,
    current_user: User = Depends(get_current_user)
):
    session = await db.exam_sessions.find_one({
        "id": session_id,
        "user_id": current_user.id
    })
    
    if not session or session["submitted"]:
        raise HTTPException(status_code=404, detail="Exam session not found or already submitted")
    
    if question_index >= len(session["questions"]):
        raise HTTPException(status_code=400, detail="Invalid question index")
    
    question_id = session["questions"][question_index]
    question = await db.questions.find_one({"id": question_id})
    
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    # Update current question and visited status
    await db.exam_sessions.update_one(
        {"id": session_id},
        {
            "$set": {
                "current_question": question_index,
                f"question_status.{question_id}": QuestionStatus.NOT_ANSWERED
            }
        }
    )
    
    # Remove correct answers from response for students
    question_copy = question.copy()
    if "correct_answer" in question_copy:
        del question_copy["correct_answer"]
    
    # Remove is_correct from options
    if "options" in question_copy:
        for option in question_copy["options"]:
            if "is_correct" in option:
                del option["is_correct"]
    
    return {
        "question": Question(**question_copy),
        "question_number": question_index + 1,
        "total_questions": len(session["questions"]),
        "current_answer": session["answers"].get(question_id)
    }

@api_router.post("/exam/answer/{session_id}")
async def submit_answer(
    session_id: str,
    answer_data: ExamAnswer,
    current_user: User = Depends(get_current_user)
):
    session = await db.exam_sessions.find_one({
        "id": session_id,
        "user_id": current_user.id
    })
    
    if not session or session["submitted"]:
        raise HTTPException(status_code=404, detail="Exam session not found or already submitted")
    
    # Update answer and status
    await db.exam_sessions.update_one(
        {"id": session_id},
        {
            "$set": {
                f"answers.{answer_data.question_id}": answer_data.answer,
                f"question_status.{answer_data.question_id}": answer_data.status
            }
        }
    )
    
    return {"message": "Answer saved successfully"}

@api_router.post("/exam/submit/{session_id}", response_model=ExamResult)
async def submit_exam(
    session_id: str,
    current_user: User = Depends(get_current_user)
):
    session = await db.exam_sessions.find_one({
        "id": session_id,
        "user_id": current_user.id
    })
    
    if not session:
        raise HTTPException(status_code=404, detail="Exam session not found")
    
    if session["submitted"]:
        # Return existing result
        existing_result = await db.exam_results.find_one({"exam_session_id": session_id})
        if existing_result:
            return ExamResult(**existing_result)
    
    # Calculate results
    total_questions = len(session["questions"])
    attempted = len([q for q, status in session["question_status"].items() 
                    if status in [QuestionStatus.ANSWERED, QuestionStatus.MARKED_ANSWERED]])
    
    correct = 0
    incorrect = 0
    subject_wise_score = {}
    total_score = 0
    
    for question_id in session["questions"]:
        question = await db.questions.find_one({"id": question_id})
        if not question:
            continue
            
        subject = question["subject"]
        if subject not in subject_wise_score:
            subject_wise_score[subject] = {"correct": 0, "attempted": 0, "total": 0}
        
        subject_wise_score[subject]["total"] += 1
        
        if question_id in session["answers"]:
            subject_wise_score[subject]["attempted"] += 1
            user_answer = session["answers"][question_id]
            
            # Check if answer is correct based on question type
            is_correct = False
            if question["question_type"] == QuestionType.MCQ:
                # For MCQ, check if selected option is correct
                correct_options = [opt["id"] for opt in question["options"] if opt["is_correct"]]
                is_correct = user_answer in correct_options
            elif question["question_type"] == QuestionType.MSQ:
                # For MSQ, check if all selected options are correct
                correct_options = set([opt["id"] for opt in question["options"] if opt["is_correct"]])
                user_options = set(user_answer if isinstance(user_answer, list) else [user_answer])
                is_correct = user_options == correct_options
            elif question["question_type"] == QuestionType.NAT:
                # For NAT, check numerical answer
                try:
                    is_correct = float(user_answer) == float(question["correct_answer"])
                except:
                    is_correct = False
            
            if is_correct:
                correct += 1
                subject_wise_score[subject]["correct"] += 1
                total_score += question["marks"]
            else:
                incorrect += 1
                total_score -= question["negative_marks"]
    
    # Calculate time taken
    start_time = datetime.fromisoformat(session["start_time"].replace("Z", "+00:00"))
    end_time = datetime.now(timezone.utc)
    time_taken_minutes = int((end_time - start_time).total_seconds() / 60)
    
    # Create result
    result = ExamResult(
        user_id=current_user.id,
        exam_session_id=session_id,
        total_questions=total_questions,
        attempted=attempted,
        correct=correct,
        incorrect=incorrect,
        score=max(0, total_score),  # Ensure non-negative score
        percentage=(correct / total_questions) * 100 if total_questions > 0 else 0,
        subject_wise_score=subject_wise_score,
        time_taken_minutes=time_taken_minutes
    )
    
    # Mark session as submitted
    await db.exam_sessions.update_one(
        {"id": session_id},
        {
            "$set": {
                "submitted": True,
                "end_time": end_time
            }
        }
    )
    
    # Save result
    await db.exam_results.insert_one(result.dict())
    return result

@api_router.get("/results/{session_id}", response_model=ExamResult)
async def get_exam_result(
    session_id: str,
    current_user: User = Depends(get_current_user)
):
    result = await db.exam_results.find_one({
        "exam_session_id": session_id,
        "user_id": current_user.id
    })
    
    if not result:
        raise HTTPException(status_code=404, detail="Result not found")
    
    return ExamResult(**result)

@api_router.get("/exam-history")
async def get_user_exam_history(
    current_user: User = Depends(get_current_user)
):
    # Get all completed sessions for the user
    sessions = await db.exam_sessions.find({
        "user_id": current_user.id,
        "submitted": True
    }).to_list(length=None)
    
    history = []
    for session in sessions:
        # Get exam config details
        exam_config = await db.exam_configs.find_one({"id": session["exam_config_id"]})
        if not exam_config:
            continue
        
        # Get result
        result = await db.exam_results.find_one({"exam_session_id": session["id"]})
        if not result:
            continue
        
        history.append({
            "session_id": session["id"],
            "exam_config_id": session["exam_config_id"],
            "exam_name": exam_config["name"],
            "exam_description": exam_config["description"],
            "completed_at": session.get("end_time", session["created_at"]),
            "score": result["score"],
            "percentage": result["percentage"],
            "correct": result["correct"],
            "total_questions": result["total_questions"],
            "time_taken_minutes": result["time_taken_minutes"]
        })
    
    return history

@api_router.get("/detailed-results/{session_id}")
async def get_detailed_exam_results(
    session_id: str,
    current_user: User = Depends(get_current_user)
):
    # Get the exam session
    session = await db.exam_sessions.find_one({
        "id": session_id,
        "user_id": current_user.id
    })
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Get exam result
    result = await db.exam_results.find_one({"exam_session_id": session_id})
    if not result:
        raise HTTPException(status_code=404, detail="Result not found")
    
    detailed_questions = []
    
    for i, question_id in enumerate(session["questions"]):
        question = await db.questions.find_one({"id": question_id})
        if not question:
            continue
            
        user_answer = session.get("answers", {}).get(question_id)
        question_status = session.get("question_status", {}).get(question_id, "not_answered")
        
        # Determine if answer is correct
        is_correct = False
        correct_answer = None
        
        if question["question_type"] == QuestionType.MCQ:
            correct_options = [opt for opt in question["options"] if opt["is_correct"]]
            correct_answer = correct_options[0]["text"] if correct_options else None
            if user_answer:
                is_correct = user_answer in [opt["id"] for opt in correct_options]
        elif question["question_type"] == QuestionType.MSQ:
            correct_options = [opt for opt in question["options"] if opt["is_correct"]]
            correct_answer = ", ".join([opt["text"] for opt in correct_options])
            if user_answer and isinstance(user_answer, list):
                correct_ids = set([opt["id"] for opt in correct_options])
                user_ids = set(user_answer)
                is_correct = user_ids == correct_ids
        elif question["question_type"] == QuestionType.NAT:
            correct_answer = question.get("correct_answer")
            if user_answer:
                try:
                    is_correct = float(user_answer) == float(correct_answer)
                except:
                    is_correct = False
        
        # Get user's answer text
        user_answer_text = None
        if user_answer:
            if question["question_type"] in [QuestionType.MCQ, QuestionType.MSQ]:
                if isinstance(user_answer, list):
                    selected_options = [opt for opt in question["options"] if opt["id"] in user_answer]
                    user_answer_text = ", ".join([opt["text"] for opt in selected_options])
                else:
                    selected_option = next((opt for opt in question["options"] if opt["id"] == user_answer), None)
                    user_answer_text = selected_option["text"] if selected_option else "Unknown"
            else:
                user_answer_text = str(user_answer)
        
        detailed_questions.append({
            "question_number": i + 1,
            "question_id": question_id,
            "question_text": question["question_text"],
            "question_type": question["question_type"],
            "subject": question["subject"],
            "topic": question["topic"],
            "marks": question["marks"],
            "options": question.get("options", []),
            "user_answer": user_answer,
            "user_answer_text": user_answer_text,
            "correct_answer": correct_answer,
            "is_correct": is_correct,
            "status": question_status,
            "explanation": question.get("explanation")
        })
    
    return {
        "session_id": session_id,
        "total_questions": len(detailed_questions),
        "questions": detailed_questions,
        "overall_result": {
            "score": result["score"],
            "percentage": result["percentage"],
            "correct": result["correct"],
            "incorrect": result["incorrect"],
            "attempted": result["attempted"]
        }
    }

@api_router.post("/admin/preview-csv")
async def preview_csv_questions(
    file: UploadFile = File(...),
    current_user: User = Depends(get_admin_user)
):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV")
    
    contents = await file.read()
    csv_data = io.StringIO(contents.decode('utf-8'))
    csv_reader = csv.DictReader(csv_data)
    
    preview_questions = []
    headers = csv_reader.fieldnames or []
    row_count = 0
    
    for row_num, row in enumerate(csv_reader, start=2):
        if row_count >= 10:  # Limit preview to 10 rows
            break
            
        try:
            # Parse question type
            question_type = QuestionType(row.get('type', 'MCQ').upper())
            
            # Parse options for MCQ/MSQ
            options = []
            if question_type in [QuestionType.MCQ, QuestionType.MSQ]:
                for i in range(1, 5):  # Support up to 4 options
                    option_text = row.get(f'option_{i}', '').strip()
                    if option_text:
                        is_correct = row.get(f'option_{i}_correct', '').lower() in ['true', '1', 'yes']
                        options.append({
                            'text': option_text,
                            'is_correct': is_correct
                        })
            
            preview_questions.append({
                'row_number': row_num,
                'question_text': row.get('question_text', ''),
                'question_type': question_type.value,
                'subject': row.get('subject', 'General'),
                'topic': row.get('topic', 'General'),
                'difficulty': row.get('difficulty', 'medium'),
                'marks': float(row.get('marks', 1.0)),
                'options': options,
                'correct_answer': row.get('correct_answer'),
                'explanation': row.get('explanation', ''),
                'raw_row': dict(row)  # Include raw CSV row data
            })
            row_count += 1
            
        except Exception as e:
            preview_questions.append({
                'row_number': row_num,
                'error': str(e),
                'raw_row': dict(row)
            })
            row_count += 1
    
    # Get total row count
    csv_data.seek(0)
    total_rows = sum(1 for _ in csv.DictReader(csv_data)) 
    
    return {
        'headers': headers,
        'preview_questions': preview_questions,
        'total_rows': total_rows,
        'showing_rows': min(10, total_rows),
        'filename': file.filename
    }

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()