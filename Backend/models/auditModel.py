from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from datetime import datetime
import uuid

class ActionLog(BaseModel):
    action: str  # e.g., "update_question", "delete_employee"
    target_id: str  # e.g., question_id, employee_id
    user_id: str  # ID of the user who performed the action,
    user_role: str  # Roles of the user, e.g., ["admin", "hr"]
    performed_at: datetime  # Timestamp of the action
    details: Optional[Dict] = None  # e.g., {"previous_value": "old", "new_value": "new"}

class AuditLog(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")  # MongoDB ObjectId as string
    audit_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_id: str
    plant_id: Optional[str] = None
    financial_year: Optional[str] = None
    actions: Optional[List[ActionLog]] = None  # List of action logs

   