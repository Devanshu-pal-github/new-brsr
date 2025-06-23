from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from datetime import datetime
import uuid

class NotificationUser(BaseModel):
    id: Optional[str] = None
    name: Optional[str] = None
    role: Optional[str] = None

class NotificationMessage(BaseModel):
    title: str
    description: str

class Notification(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    companyId: str
    plantId: Optional[str] = None
    financialYear: Optional[str] = None
    notificationFrom: NotificationUser
    notificationTo: List[NotificationUser]
    notificationMessage: NotificationMessage
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    read: bool = False
