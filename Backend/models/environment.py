from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime
import uuid

class QuestionAnswer(BaseModel):
    """Stores the answer data for a specific question"""
    questionId: str
    answers: Dict[str, Any] = Field(default_factory=dict)
    lastUpdated: datetime = Field(default_factory=datetime.utcnow)
    comments: List[Dict[str, Any]] = Field(default_factory=list)
    attachments: List[str] = Field(default_factory=list)
    auditStatus: Optional[str] = None

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
