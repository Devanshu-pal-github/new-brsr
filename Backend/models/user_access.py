from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
import uuid
from enum import Enum

# Role constants (for backward compatibility)
ROLE_SUPER_ADMIN = "super_admin"
ROLE_COMPANY_ADMIN = "company_admin"
ROLE_PLANT_ADMIN = "plant_admin"
ROLE_USER = "user"

# Access level constants
ACCESS_LEVEL_READ = "read"
ACCESS_LEVEL_WRITE = "write"
ACCESS_LEVEL_VALIDATE = "validate"
ACCESS_LEVEL_APPROVE = "approve"

class UserRole(str, Enum):
    SUPER_ADMIN = "super_admin"
    COMPANY_ADMIN = "company_admin"
    PLANT_ADMIN = "plant_admin"
    USER = "user"

class AccessScope(str, Enum):
    COMPANY = "company"
    PLANT = "plant"

class Permission(str, Enum):
    READ = "read"
    WRITE = "write"
    VALIDATE = "validate"
    APPROVE = "approve"

class UserAccess(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    company_id: str
    plant_id: Optional[str] = None
    role: UserRole
    access_level: Permission
    permissions: List[Permission] = []
    scope: AccessScope = AccessScope.PLANT
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class UserAccessCreate(BaseModel):
    user_id: str
    company_id: str
    plant_id: Optional[str] = None
    role: UserRole
    access_level: Permission
    permissions: Optional[List[Permission]] = None
    scope: AccessScope = AccessScope.PLANT

class UserAccessUpdate(BaseModel):
    role: Optional[UserRole] = None
    access_level: Optional[Permission] = None
    permissions: Optional[List[Permission]] = None
    plant_id: Optional[str] = None
    is_active: Optional[bool] = None

class UserCompanyAccess(BaseModel):
    company_id: str
    company_name: str
    role: UserRole
    permissions: List[Permission]
    plants: List[Dict[str, Any]] = []  # Each dict: {id, name, role}

class UserAccessSummary(BaseModel):
    user_id: str
    companies: List[UserCompanyAccess]

class UserAccessWithDetails(UserAccess):
    username: Optional[str] = None
    company_name: Optional[str] = None
    plant_name: Optional[str] = None
    role_display: Optional[str] = None
    access_level_display: Optional[str] = None
    permissions_display: Optional[List[str]] = None

class AccessSummary(BaseModel):
    user_id: str
    username: str
    roles: List[str]
    company_access: List[Dict] = []
    plant_access: List[Dict] = []
    module_access: List[Dict] = [] 