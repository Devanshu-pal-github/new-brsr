from pydantic import BaseModel, Field
from datetime import datetime
import uuid
from typing import Optional, List, Dict, Any

class Answer(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_id: str
    plant_id: str
    financial_year: str
    question_id: str
    answer_data: dict  # Flexible: supports subjective, table, and table_with_additional_rows answers
    status: str  # DRAFT, SUBMITTED, REJECTED, APPROVED, etc.
    value: Any = None  # The main value for subjective/table answers
    metadata: Optional[dict] = None  # Additional metadata (UI, audit, etc.)
    validation_status: Optional[str] = None
    validation_errors: Optional[List[str]] = None
    comments: Optional[str] = None
    reviewer_comments: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None
    updated_by: Optional[str] = None
    authoritative_source: Optional[str] = None  # 'C001', 'P001', or None

class AnswerCreate(BaseModel):
    value: Any
    metadata: Optional[dict] = None
    comments: Optional[str] = None

class AnswerUpdate(BaseModel):
    value: Optional[Any] = None
    metadata: Optional[dict] = None
    comments: Optional[str] = None
    reviewer_comments: Optional[str] = None
    status: Optional[str] = None

class AnswerWithDetails(Answer):
    question_text: Optional[str] = None
    question_type: Optional[str] = None
    plant_name: Optional[str] = None
    company_name: Optional[str] = None
    category_name: Optional[str] = None
    module_name: Optional[str] = None

class AnswerHistory(BaseModel):
    answer_id: str
    versions: List[Answer]

class BulkAnswerCreate(BaseModel):
    plant_id: str
    answers: List[Dict[str, Any]]  # Each dict should match AnswerCreate fields + question_id, etc.

class BulkAnswerResponse(BaseModel):
    success: List[Any] = []  # List of successfully created answers (could be Answer or IDs)
    errors: List[Dict[str, Any]] = []  # List of errors with question_id and error message 