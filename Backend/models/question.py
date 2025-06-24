from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from enum import Enum
from datetime import datetime
import uuid

class QuestionType(str, Enum):
    """Question type enumeration"""
    SUBJECTIVE = "subjective"
    TABLE = "table"
    TABLE_WITH_ADDITIONAL_ROWS = "table_with_additional_rows"

class ValidationRule(BaseModel):
    """Validation rule for question answers"""
    type: str  # e.g., "required", "min", "max", "regex", "format"
    parameters: Optional[Dict[str, Any]] = None  # e.g., {"value": 0} for min
    error_message: Optional[str] = None
    condition: Optional[str] = None  # Optional condition for rule application

class QuestionDependency(BaseModel):
    """Question dependency definition"""
    question_id: str
    operator: str  # e.g., "equals", "not_equals", "greater_than"
    value: Any
    error_message: Optional[str] = None

class TableHeader(BaseModel):
    """Header definition for table questions"""
    label: str
    level: int  # Hierarchy level (0 = top, 1 = subheader, etc.)
    parent: Optional[str] = None  # Parent header ID
    width: Optional[int] = None
    min_width: Optional[int] = None
    max_width: Optional[int] = None
    type: Optional[str] = None  # e.g., "text", "number"
    calc_type: Optional[str] = None  # e.g., "sum", "avg"
    validation: Optional[Dict[str, Any]] = None

class TableColumn(BaseModel):
    """Column definition for table questions"""
    key: str
    header_path: List[str]  # e.g., ["label", "header", "subheader1"]
    type: str  # e.g., "text", "number", "boolean"
    calc_type: Optional[str] = None  # e.g., "sum", "avg"
    validation: Optional[Dict[str, Any]] = None
    width: Optional[int] = None
    min_width: Optional[int] = None
    max_width: Optional[int] = None

class TableRow(BaseModel):
    """Row definition for table questions"""
    key: str
    type: str  # e.g., "data", "calc"
    calc_type: Optional[str] = None  # e.g., "sum", "avg"
    label: Optional[str] = None
    validation: Optional[Dict[str, Any]] = None

class TableCell(BaseModel):
    """Cell definition for table questions"""
    row_key: str
    column_key: str
    type: Optional[str] = None  # e.g., "text", "number"
    validation: Optional[Dict[str, Any]] = None
    calc_type: Optional[str] = None  # e.g., "sum"
    value: Optional[Any] = None

class TableMetadata(BaseModel):
    """Metadata for table and table_with_additional_rows questions"""
    headers: List[TableHeader]
    columns: List[TableColumn]
    rows: List[TableRow]
    cells: Optional[List[TableCell]] = None
    calc_columns: List[str] = []
    calc_rows: List[str] = []
    allow_add_rows: bool = False  # True for table_with_additional_rows
    max_rows: Optional[int] = None
    min_rows: Optional[int] = None
    ui: Optional[Dict[str, Any]] = None  # e.g., {"scroll": True, "pagination": 20}

class QuestionCreate(BaseModel):
    """Model for creating a new question"""
    human_readable_id: str
    category_id: str
    question_text: str
    question_type: QuestionType
    validation_rules: Optional[List[ValidationRule]] = None
    dependencies: Optional[List[QuestionDependency]] = None
    metadata: Dict[str, Any] = {}
    order: Optional[int] = None
    question_number: Optional[str] = None

    class Config:
        extra = 'allow'

class QuestionUpdate(BaseModel):
    """Model for updating an existing question"""
    human_readable_id: Optional[str] = None
    question_text: Optional[str] = None
    question_type: Optional[QuestionType] = None
    validation_rules: Optional[List[ValidationRule]] = None
    dependencies: Optional[List[QuestionDependency]] = None
    metadata: Optional[Dict[str, Any]] = None
    order: Optional[int] = None
    question_number: Optional[str] = None

    class Config:
        extra = 'allow'

class Question(BaseModel):
    """Question model"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), alias="_id")
    human_readable_id: str
    category_id: str
    module_id: Optional[str] = None
    question_text: str
    question_type: QuestionType
    validation_rules: Optional[List[ValidationRule]] = None
    dependencies: Optional[List[QuestionDependency]] = None
    metadata: Dict[str, Any] = {}
    order: Optional[int] = None
    question_number: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        extra = 'allow'

class QuestionWithCategory(Question):
    """Question model with category information"""
    category_name: Optional[str] = None
    module_name: Optional[str] = None