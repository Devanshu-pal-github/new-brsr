from pydantic import BaseModel, Field
from typing import List, Dict, Optional
from datetime import datetime
from enum import Enum
import uuid

# Report status constants
REPORT_STATUS_ACTIVE = "active"
REPORT_STATUS_INACTIVE = "inactive"
REPORT_STATUS_ARCHIVED = "archived"

class ReportStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    ARCHIVED = "archived"

class AssignedModules(BaseModel):
    basic_modules: List[str] = []
    calc_modules: List[str] = []

class ActiveReport(BaseModel):
    report_id: str
    report_name: str = ""
    assigned_modules: AssignedModules
    financial_year: str
    status: ReportStatus = ReportStatus.ACTIVE

class Company(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    active_reports: List[dict] = []
    plant_ids: List[str] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class CompanyBase(BaseModel):
    name: str
    code: str  # Required field
    address: str
    contact_email: str
    contact_phone: str
    metadata: Dict = {}

class CompanyCreate(CompanyBase):
    pass

class CompanyUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    is_active: Optional[bool] = None
    metadata: Optional[Dict] = None

class CompanyInDB(Company):
    _id: str

class CompanyWithPlants(Company):
    plants: List[Dict] = []