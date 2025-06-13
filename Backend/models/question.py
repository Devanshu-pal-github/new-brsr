from pydantic import BaseModel, Field
from typing import List, Optional, Union, Dict, Any
from enum import Enum
from .base import BaseDBModel
import uuid
from datetime import datetime

# Question type constants
QUESTION_TYPE_TEXT = "text"
QUESTION_TYPE_NUMBER = "number"
QUESTION_TYPE_BOOLEAN = "boolean"
QUESTION_TYPE_DATE = "date"
QUESTION_TYPE_SELECT = "select"
QUESTION_TYPE_MULTISELECT = "multiselect"

class QuestionType(str, Enum):
    """Question type enumeration"""
    TEXT = "text"
    NUMBER = "number"
    BOOLEAN = "boolean"
    SELECT = "select"
    MULTISELECT = "multiselect"
    DATE = "date"
    FILE = "file"
    FORMULA = "formula"
    TABLE = "table"

class ValidationRuleType(str, Enum):
    DATA_TYPE = "data_type"
    RANGE = "range"
    REQUIRED = "required"
    CUSTOM = "custom"

class ValidationRule(BaseModel):
    data_type: str
    range_constraints: Optional[Dict[str, Any]] = None
    required: bool = False
    custom_validation: Optional[str] = None

class Option(BaseModel):
    """Option for select/multiselect questions"""
    value: str
    label: str
    description: Optional[str] = None
    metadata: Dict = {}

class TableHeader(BaseModel):
    label: str
    level: int  # 0 = top, 1 = next, etc.
    parent: Optional[str] = None
    width: Optional[int] = None
    min_width: Optional[int] = None
    max_width: Optional[int] = None
    type: Optional[str] = None  # e.g., 'text', 'number', 'calc', etc.
    calc_type: Optional[str] = None  # e.g., 'sum', 'avg', etc.
    validation: Optional[Dict[str, Any]] = None

class TableColumn(BaseModel):
    key: str
    header_path: List[str]  # e.g., ['label', 'header', 'subheader1', ...]
    type: str  # 'text', 'number', 'boolean', etc.
    calc_type: Optional[str] = None
    validation: Optional[Dict[str, Any]] = None
    width: Optional[int] = None
    min_width: Optional[int] = None
    max_width: Optional[int] = None

class TableRow(BaseModel):
    key: str
    type: str  # 'data', 'calc', etc.
    calc_type: Optional[str] = None
    label: Optional[str] = None
    validation: Optional[Dict[str, Any]] = None

class TableCell(BaseModel):
    row_key: str
    column_key: str
    type: Optional[str] = None
    validation: Optional[Dict[str, Any]] = None
    calc_type: Optional[str] = None
    value: Optional[Any] = None

class TableMetadata(BaseModel):
    headers: List[TableHeader]
    columns: List[TableColumn]
    rows: List[TableRow]
    cells: Optional[List[TableCell]] = None  # Optional, for cell-level metadata
    calc_columns: List[str] = []
    calc_rows: List[str] = []
    allow_add_rows: bool = False
    max_rows: Optional[int] = None
    min_rows: Optional[int] = None
    ui: Optional[Dict[str, Any]] = None  # e.g., {'scroll': True, 'pagination': 20, ...}

class Formula(BaseModel):
    """Formula definition for calculated fields"""
    expression: str  # Python expression
    variables: Dict[str, str]  # Map of variable names to question IDs
    description: Optional[str] = None
    error_handling: Optional[str] = None

class QuestionBase(BaseModel):
    """Base question model"""
    text: Optional[str] = None
    type: Optional[QuestionType] = None
    help_text: Optional[str] = None
    placeholder: Optional[str] = None
    default_value: Optional[Any] = None
    is_required: bool = False
    validation_rules: List[ValidationRule] = []
    metadata: Dict = {}

class QuestionCreate(QuestionBase):
    """Question creation model"""
    human_readable_id: Optional[str] = None # Allow user to pass human-readable ID
    # Type-specific fields
    options: Optional[List[Option]] = None  # For select/multiselect
    table_columns: Optional[List[TableColumn]] = None  # For table type
    formula: Optional[Formula] = None  # For formula type
    unit: Optional[str] = None  # For number type
    file_types: Optional[List[str]] = None  # For file type
    max_file_size: Optional[int] = None  # For file type

class QuestionUpdate(BaseModel):
    """Question update model"""
    text: Optional[str] = None
    help_text: Optional[str] = None
    placeholder: Optional[str] = None
    default_value: Optional[Any] = None
    is_required: Optional[bool] = None
    validation_rules: Optional[List[ValidationRule]] = None
    options: Optional[List[Option]] = None
    table_columns: Optional[List[TableColumn]] = None
    formula: Optional[Formula] = None
    unit: Optional[str] = None
    file_types: Optional[List[str]] = None
    max_file_size: Optional[int] = None
    metadata: Optional[Dict] = None

class Question(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    human_readable_id: Optional[str] = None


class QuestionInDB(BaseDBModel):
    """Question model as stored in database"""
    id: str
    human_readable_id: Optional[str] = None

class QuestionWithCategory(QuestionInDB):
    """Question model with category information"""

class QuestionDependency(BaseModel):
    """Question dependency definition"""
    question_id: str
    operator: str  # e.g., "equals", "not_equals", "greater_than", etc.
    value: Any
    error_message: Optional[str] = None