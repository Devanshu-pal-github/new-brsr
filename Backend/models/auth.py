from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from enum import Enum
import uuid
from datetime import datetime

# Role constants
ROLE_COMPANY_ADMIN = "company_admin"
ROLE_PLANT_ADMIN = "plant_admin"

class UserRole(str, Enum):
    COMPANY_ADMIN = "company_admin"
    PLANT_ADMIN = "plant_admin"

class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: UserRole
    company_id: Optional[str] = None
    plant_id: Optional[str] = None
    is_active: bool = True

class UserCreate(UserBase):
    password: str

class UserInDB(UserBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    hashed_password: str
    access_modules: List[str] = []

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    password: Optional[str] = None
    role: Optional[UserRole] = None
    company_id: Optional[str] = None
    plant_id: Optional[str] = None
    is_active: Optional[bool] = None

class TokenData(BaseModel):
    user_id: str
    username: str
    email: str
    roles: List[str] = []
    company_id: Optional[str] = None
    plant_id: Optional[str] = None
    exp: datetime

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user_id: str
    username: str
    email: str
    roles: List[str] = []
    company_id: Optional[str] = None
    plant_id: Optional[str] = None
    exp: datetime

class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user_id: str
    username: str
    email: str
    roles: List[str] = []
    company_id: Optional[str] = None
    plant_id: Optional[str] = None

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    full_name: str
    role: str
    company_id: Optional[str] = None
    plant_id: Optional[str] = None
    is_active: bool = True
    hashed_password: str
    access_modules: List[str] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

# This file can be left minimal or empty if not required by the checklist. If needed, only basic user fields should be kept for authentication. 