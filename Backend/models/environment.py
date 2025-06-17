from typing import List, Optional, Dict, Any, Union
from pydantic import BaseModel, Field
from datetime import datetime
import uuid

class TableResponse(BaseModel):
    """Stores the table response data"""
    current_year: str
    previous_year: str

class MultiTableResponse(BaseModel):
    """Stores responses for questions with multiple tables"""
    table0: List[TableResponse] = Field(default_factory=list)
    table1: Optional[List[TableResponse]] = None

class QuestionAnswer(BaseModel):
    """Stores the answer data for a specific question"""
    questionId: str
    questionTitle: Optional[str]
    updatedData: Any = Field(default_factory=dict)  # Allow any type of data to be stored
    lastUpdated: datetime = Field(default_factory=datetime.utcnow)
    comments: List[Dict[str, Any]] = Field(default_factory=list)
    attachments: List[str] = Field(default_factory=list)
    auditStatus: Optional[bool] = None

class EnvironmentReport(BaseModel):
    """Stores only the answer data and metadata for an environment report"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    companyId: str
    financialYear: str
    answers: Dict[str, QuestionAnswer] = Field(default_factory=dict)
    status: str = "draft"
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)
    version: int = 1
