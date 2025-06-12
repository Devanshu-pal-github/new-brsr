from pydantic import BaseModel, Field, validator
from typing import List, Optional, Dict
from datetime import datetime
import uuid
from enum import Enum

class ModuleType(str, Enum):
    BASIC = "basic"
    CALC = "calc"

class Category(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    question_ids: List[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class SubModule(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    categories: List[Category] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class Module(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    module_type: ModuleType
    submodules: List[SubModule] = Field(default_factory=list)
    is_active: bool = True
    report_ids: List[str] = Field(default_factory=list)  # For two-way referencing with Reports
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    @validator('module_type', pre=True)
    def validate_module_type(cls, v):
        if isinstance(v, ModuleType):
            return v
        if v not in [ModuleType.BASIC.value, ModuleType.CALC.value]:
            raise ValueError('module_type must be either "basic" or "calc"')
        return ModuleType(v)

class ModuleCreate(BaseModel):
    name: str
    module_type: ModuleType
    submodules: List[SubModule] = Field(default_factory=list)

    @validator('module_type', pre=True)
    def validate_module_type(cls, v):
        if isinstance(v, ModuleType):
            return v
        if v not in [ModuleType.BASIC.value, ModuleType.CALC.value]:
            raise ValueError('module_type must be either "basic" or "calc"')
        return ModuleType(v)

class ModuleUpdate(BaseModel):
    name: Optional[str] = None
    module_type: Optional[ModuleType] = None
    submodules: Optional[List[SubModule]] = None
    is_active: Optional[bool] = None

    @validator('module_type', pre=True)
    def validate_module_type(cls, v):
        if v is None:
            return v
        if isinstance(v, ModuleType):
            return v
        if v not in [ModuleType.BASIC.value, ModuleType.CALC.value]:
            raise ValueError('module_type must be either "basic" or "calc"')
        return ModuleType(v)

class ModuleWithDetails(Module):
    question_count: int = 0
    reports: List[str] = Field(default_factory=list)  # For detailed report information

class ValidationRule(BaseModel):
    field: str
    rule_type: str
    params: Dict = Field(default_factory=dict)
    error_message: Optional[str] = None