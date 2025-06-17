from pydantic import BaseModel, Field
from datetime import datetime
import uuid
from typing import Optional, List, Dict, Any

class ModuleAnswer(BaseModel):
    """Model for storing answers specific to a module
    
    Each module will have its own collection for storing answers.
    This allows for a more modular and reusable approach where multiple companies
    can have their data stored in the same collection but separated by company_id.
    """
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_id: str
    financial_year: str
    # Dynamic fields will be added for each question_id in the module
    # The field name will be the question_id and the value will be the answer
    answers: Dict[str, Any] = Field(default_factory=dict)  # Maps question_id to answer value
    status: str = "DRAFT"  # DRAFT, SUBMITTED, REJECTED, APPROVED, etc.
    validation_status: Optional[str] = None
    validation_errors: Optional[Dict[str, List[str]]] = None  # Maps question_id to list of errors
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None
    updated_by: Optional[str] = None

class ModuleAnswerCreate(BaseModel):
    """Model for creating a new module answer"""
    company_id: str
    financial_year: str
    answers: Dict[str, Any]  # Maps question_id to answer value
    created_by: Optional[str] = None

class ModuleAnswerUpdate(BaseModel):
    """Model for updating an existing module answer"""
    answers: Optional[Dict[str, Any]] = None  # Maps question_id to answer value
    status: Optional[str] = None
    updated_by: Optional[str] = None

class BulkModuleAnswerCreate(BaseModel):
    """Model for creating multiple module answers in bulk"""
    answers: List[ModuleAnswerCreate]

class BulkModuleAnswerResponse(BaseModel):
    """Response model for bulk module answer operations"""
    success_count: int
    failed_count: int
    results: List[ModuleAnswer]

class ModuleAnswerUpdateRequest(BaseModel):
    """Model for bulk update request item"""
    company_id: str
    financial_year: str
    update_data: ModuleAnswerUpdate

class BulkModuleAnswerUpdate(BaseModel):
    """Model for updating multiple module answers in bulk"""
    updates: List[ModuleAnswerUpdateRequest]