from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
import uuid
from models.module import ModuleType

# Report status constants
REPORT_STATUS_ACTIVE = "active"
REPORT_STATUS_INACTIVE = "inactive"
REPORT_STATUS_ARCHIVED = "archived"

class Report(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    module_ids: List[str] = []
    basic_modules: List[str] = []
    calc_modules: List[str] = []
    module_names: Optional[Dict[str, str]] = None
    status: str = REPORT_STATUS_ACTIVE
    version: str = "1.0.0"
    metadata: Optional[Dict[str, Any]] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class ReportSummary(BaseModel):
    report_id: str
    name: str
    type: str
    version: str
    status: str
    company_count: int
    submission_count: int
    last_submission: Optional[datetime] = None

class ReportCreate(BaseModel):
    name: str
    module_ids: List[str] = []
    basic_modules: List[str] = []
    calc_modules: List[str] = []
    module_names: Optional[Dict[str, str]] = None
    status: str = REPORT_STATUS_ACTIVE
    version: str = "1.0.0"
    metadata: Optional[Dict[str, Any]] = None

class ReportUpdate(BaseModel):
    name: Optional[str] = None
    module_ids: Optional[List[str]] = None
    basic_modules: Optional[List[str]] = None
    calc_modules: Optional[List[str]] = None
    module_names: Optional[Dict[str, str]] = None
    status: Optional[str] = None
    version: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

class ModuleAssignment(BaseModel):
    id: str
    module_type: ModuleType