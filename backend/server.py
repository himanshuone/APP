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
                explanation=row.get('explanation')
            )
            
            question_dict = question_data.dict()
            question_dict["created_by"] = current_user.id
            question = Question(**question_dict)
            
            await db.questions.insert_one(question.dict())
            questions_added += 1
            
        except Exception as e:
            errors.append(f"Row {row_num}: {str(e)}")
    
    return {
        "message": f"Successfully added {questions_added} questions",
        "errors": errors if errors else None
    }

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
    
    # Select and randomize questions if needed
    import random
    if exam_config["randomize_questions"]:
        selected_questions = random.sample(all_questions, exam_config["total_questions"])
    else:
        selected_questions = all_questions[:exam_config["total_questions"]]
    
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