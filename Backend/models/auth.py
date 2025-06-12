from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from enum import Enum
import uuid
from datetime import datetime

# Role constants
ROLE_COMPANY_ADMIN = "company_admin"
ROLE_PLANT_ADMIN = "plant_admin"

class UserRole(str, Enum):
    SUPER_ADMIN = "super_admin"
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
    
    # Add model validator to handle string role values
    @classmethod
    def model_validate(cls, obj, *args, **kwargs):
        # If role is a string, convert it to UserRole enum
        if isinstance(obj, dict) and "role" in obj and isinstance(obj["role"], str):
            try:
                obj["role"] = UserRole(obj["role"])
            except ValueError:
                # If conversion fails, use a default role or raise an error
                valid_roles = [r.value for r in UserRole]
                if obj["role"] not in valid_roles:
                    raise ValueError(f"Invalid role: {obj['role']}. Must be one of: {', '.join(valid_roles)}")
        return super().model_validate(obj, *args, **kwargs)

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
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user_id: str
    role: str
    company_id: Optional[str] = None
    plant_id: Optional[str] = None
    user_name: str

class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user_id: str
    role: str
    company_id: Optional[str] = None
    plant_id: Optional[str] = None
    user_name: str

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