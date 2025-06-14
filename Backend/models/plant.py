from pydantic import BaseModel, Field
from typing import List, Dict, Optional
from datetime import datetime
from enum import Enum
import uuid

# Plant type constants
PLANT_TYPE_AGGREGATOR = "C001"
PLANT_TYPE_HOME = "P001"
PLANT_TYPE_REGULAR = "regular"

# Access level constants
ACCESS_LEVEL_CALC_ONLY = "calc_modules_only"
ACCESS_LEVEL_ALL_MODULES = "all_modules"

class PlantType(str, Enum):
    AGGREGATOR = "C001"
    HOME = "P001"
    REGULAR = "regular"

class AccessLevel(str, Enum):
    CALC_ONLY = "calc_only"
    ALL_MODULES = "all_modules"

class Plant(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    plant_code: str
    plant_name: str
    company_id: str
    plant_type: str
    access_level: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    @property
    def has_all_modules_access(self) -> bool:
        return self.plant_type in [PlantType.AGGREGATOR, PlantType.HOME]

class PlantBase(BaseModel):
    name: str
    code: str
    type: PlantType = PlantType.REGULAR
    address: str
    contact_email: str
    contact_phone: str
    metadata: Dict = {}

# Assuming the PlantCreate model is already defined as in your code
class PlantCreate(BaseModel):
    company_id: str
    name: str
    code: str
    type: PlantType = PlantType.REGULAR
    address: str
    contact_email: str
    contact_phone: str
    metadata: Dict = {}

class PlantUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    is_active: Optional[bool] = None
    metadata: Optional[Dict] = None

class PlantInDB(Plant):
    _id: str

class PlantWithCompany(Plant):
    company_name: str

class PlantWithModules(Plant):
    active_modules: List[Dict] = []

class PlantValidationStatus(BaseModel):
    plant_id: str
    plant_name: str
    module_id: str
    module_name: str
    total_questions: int
    answered_questions: int
    validation_errors: List[str] = []
    last_updated: datetime

class PlantWithAnswers(Plant):
    answer_count: int
    reports_data: List[Dict]

class AggregatedData(BaseModel):
    module_id: str
    financial_year: str
    data: Dict 