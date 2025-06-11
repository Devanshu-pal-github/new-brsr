from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from datetime import datetime
import uuid

class Category(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    question_ids: List[str] = []

class SubModule(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    categories: List[Category] = []

class Module(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    module_type: str
    submodules: List[SubModule] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class ModuleCreate(BaseModel):
    name: str
    module_type: str
    submodules: List[SubModule] = []

class ModuleUpdate(BaseModel):
    name: Optional[str] = None
    module_type: Optional[str] = None
    submodules: Optional[List[SubModule]] = None

class ModuleWithDetails(Module):
    categories: List[Category] = []
    question_count: int = 0
    reports: List[str] = []

class ValidationRule(BaseModel):
    field: str
    rule_type: str
    params: Dict = {}
    error_message: Optional[str] = None