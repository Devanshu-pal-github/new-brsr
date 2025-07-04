from fastapi import APIRouter, Depends, HTTPException, status, Body
from fastapi.security import OAuth2PasswordRequestForm
from datetime import timedelta, datetime
from models.auditModel import ActionLog
from motor.motor_asyncio import AsyncIOMotorDatabase
from models.auth import UserCreate, UserInDB, Token, UserUpdate , User
from services.auditServices import AuditService
from services.auth import (
    authenticate_user,
    create_access_token,
    verify_token,
    get_password_hash,
    ACCESS_TOKEN_EXPIRE_MINUTES,
    SessionManager
)
from dependencies import DB, get_current_active_user, generate_uuid, get_database
import secrets
from pydantic import BaseModel
from models.company import Company, CompanyWithPlants
from services.company import CompanyService
from routes.company import get_company_service # Import the dependency for CompanyService
import uuid

router = APIRouter(tags=["Authentication"])

class ForgotPasswordRequest(BaseModel):
    email: str


def get_audit_service(db: AsyncIOMotorDatabase = Depends(get_database)) -> AuditService:
    return AuditService(db)

@router.post("/login")
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db = Depends(get_database)
):
    """
    Authenticate user and return access and refresh tokens.
    - On success: creates a session and returns both tokens and user info.
    - On failure: returns 401 Unauthorized.

    **Sample Postman Request:**
    POST /auth/login
    Body (x-www-form-urlencoded):
        username: user@example.com
        password: yourpassword

    **Sample Response:**
    {
        "access_token": "...",
        "refresh_token": "...",
        "token_type": "bearer",
        "expires_in": 1800,
        "user_id": "...",
        "role": "company_admin",
        "company_id": "...",
        "plant_id": "..."
    }
    """
    # Authenticate user
    user = await authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    # Create access token (JWT)
    token_data = {
        "sub": user["email"],
        "user_id": user["_id"],
        "user_name": user["full_name"],
        "email": user["email"],
        "roles": [user["role"]],
        "company_id": user.get("company_id"),
        "plant_id": user.get("plant_id")
    }
    
    access_token = create_access_token(data=token_data)
    refresh_token = secrets.token_urlsafe(32)
    
    # Store session in DB
    session_manager = SessionManager(db)
    await session_manager.create_session(user["_id"], refresh_token)
    
    # Return response with user name
    response_data = {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "user_id": user["_id"],
        "role": user["role"],
        "company_id": user.get("company_id"),
        "plant_id": user.get("plant_id"),
        "user_name": user["full_name"]
    }
    return response_data

@router.get("/verify")
async def verify_auth(token):
    """Verify JWT token"""
    return verify_token(token)

@router.post("/refresh")
async def refresh_token(token, db = Depends(get_database)):
    """Refresh JWT token"""
    payload = verify_token(token)
    user = await db.users.find_one({"_id": payload["user_id"]})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    new_token = create_access_token(
        data={
            "sub": user["email"],
            "user_id": user["_id"],
            "role": user["role"],
            "company_id": user.get("company_id"),
            "plant_id": user.get("plant_id")
        }
    )
    return {
        "access_token": new_token,
        "token_type": "bearer"
    }

@router.post("/register", response_model=UserInDB)
async def register_user(
    user_data: dict = Body(...), 
    current_user: User = Depends(get_current_active_user),
    db = Depends(get_database)
):
    """
    Register a new user (admin-only or open registration, as per business logic).
    - Checks for existing user by email.
    - Hashes password and stores user securely.
    - Returns the created user (excluding password).
    - For company_admin role, company_id should be provided in the request
    - For other roles, company_id is set from the authenticated user's context

    **Sample Postman Request:**
    POST /auth/register
    Headers:
        Authorization: Bearer <token>
    Body (JSON):
    {
        "email": "user@example.com",
        "full_name": "User Name",
        "password": "yourpassword",
        "role": "company_admin",
        "company_id": "..." # Required for company_admin role
    }

    **Sample Response:**
    {
        "id": "...",
        "email": "user@example.com",
        "full_name": "User Name",
        "role": "company_admin",
        "company_id": "...",
        "plant_id": null,
        "is_active": true,
        "hashed_password": "...",
        "access_modules": []
    }
    """
    
    
    # Check if email already exists
    if await db["users"].find_one({"email": user_data["email"]}):
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )
    
    # Validate role value
    from models.auth import UserRole
    valid_roles = [r.value for r in UserRole]
    if user_data.get("role") not in valid_roles:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid role. Must be one of: {', '.join(valid_roles)}"
        )

    # For company_admin role, company_id must be provided in the request
    if user_data.get("role") == "company_admin":
        if not user_data.get("company_id"):
            raise HTTPException(
                status_code=400,
                detail="company_id is required for company_admin role"
            )
        # Verify if the company exists
        company = await db["companies"].find_one({"id": user_data["company_id"]})
        if not company:
            raise HTTPException(
                status_code=404,
                detail=f"Company with ID {user_data['company_id']} not found"
            )
    else:
        # For other roles, set company_id from the authenticated user's context
        user_data["company_id"] = current_user["company_id"]
    
    # Hash the password
    user_data["hashed_password"] = get_password_hash(user_data.pop("password"))
    
    # Initialize other fields
    generated_uuid = str(uuid.uuid4())
    user_data["_id"] = generated_uuid  # Use the same UUID for both _id and id
    user_data["id"] = generated_uuid
    user_data["is_active"] = True
    user_data["access_modules"] = []
    user_data["created_at"] = datetime.utcnow()
    user_data["updated_at"] = user_data["created_at"]
    
    # Insert the new user
    await db["users"].insert_one(user_data)
    
    return UserInDB(**user_data)

@router.post("/users", response_model=UserInDB)
async def create_user(user, db=Depends(get_database), user_ctx=Depends(get_current_active_user), audit_service=Depends(get_audit_service)):
    """Create a new user and log audit"""
    # Check if email already exists
    if await db["users"].find_one({"email": user.email}):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    # Create user document
    user_dict = user.model_dump()
    user_dict["_id"] = generate_uuid()
    user_dict["id"] = user_dict["_id"]
    user_dict["hashed_password"] = get_password_hash(user_dict.pop("password"))
    # Insert into database
    await db["users"].insert_one(user_dict)
    # Audit log
    action_log = ActionLog(
        action="User Created",
        target_id=user_dict["id"],
        user_id=user_ctx["id"],
        user_role=user_ctx.get("role", [])[0],
        performed_at=datetime.utcnow(),
        details={
            "user_email": user_dict["email"],
            "user_name": user_dict.get("full_name"),
            "role": user_dict.get("role"),
            "company_id": user_dict.get("company_id"),
        }
    )
    await audit_service.log_action(
        company_id=user_dict.get("company_id"),
        plant_id=user_dict.get("plant_id", None),
        financial_year=None,
        action_log=action_log
    )
    return UserInDB(**user_dict)

@router.get("/users/me", response_model=UserInDB)
async def read_users_me(
    current_user = Depends(get_current_active_user)
):
    """Get current user information"""
    return current_user

@router.put("/users/me", response_model=UserInDB)
async def update_user(
    user_update: UserUpdate = Body(...),
    db = Depends(get_database),
    current_user = Depends(get_current_active_user)
):
    """Update current user information"""
    update_data = user_update.model_dump(exclude_unset=True)
    if "password" in update_data:
        update_data["hashed_password"] = get_password_hash(update_data.pop("password"))
    if update_data:
        db["users"].update_one(
            {"_id": current_user["_id"]},
            {"$set": update_data}
        )
    updated_user = db["users"].find_one({"_id": current_user["_id"]})
    return UserInDB(**updated_user)

@router.post("/forgot-password")
async def forgot_password(
    request: ForgotPasswordRequest = Body(...),
    db = Depends(get_database)
):
    """Request password reset"""
    user = await db["users"].find_one({"email": request.email})
    if not user:
        # Don't reveal if email exists or not for security
        return {"message": "If the email exists, reset instructions will be sent"}
    
    # Generate reset token
    reset_token = secrets.token_urlsafe(32)
    
    # Store token in DB with expiry (e.g., 1 hour)
    await db["password_resets"].insert_one({
        "user_id": user["_id"],
        "token": reset_token,
        "expires_at": datetime.utcnow() + timedelta(hours=1)
    })
    
    # TODO: Send email with reset link
    # For now, just return token (in production, send via email)
    return {"message": "Reset instructions sent", "token": reset_token}

@router.get("/users/{user_id}/company-details", response_model=CompanyWithPlants)
async def get_company_details_by_user_id(
    user_id: str,
    db = Depends(get_database),
    company_service: CompanyService = Depends(get_company_service)
):
    """Get company details associated with a user ID"""
    # Try to find user by _id first, then by id if not found
    user = await db["users"].find_one({"_id": user_id})
    if not user:
        # If not found by _id, try to find by id field
        user = await db["users"].find_one({"id": user_id})
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"User with ID {user_id} not found"
            )

    company_id = user.get("company_id")
    if not company_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} is not associated with any company"
        )

    company = await company_service.get_company(company_id)
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Company with ID {company_id} not found"
        )
    return company

@router.post("/reset-password")
async def reset_password(
    token: str = Body(...),
    password: str = Body(...),
    db = Depends(get_database)
):
    """Reset password using token"""
    # Find valid reset token
    reset_data = await db["password_resets"].find_one({
        "token": token,
        "expires_at": {"$gt": datetime.utcnow()}
    })
    
    if not reset_data:
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired reset token"
        )
    
    # Update user password
    hashed_password = get_password_hash(password)
    await db["users"].update_one(
        {"_id": reset_data["user_id"]},
        {"$set": {"hashed_password": hashed_password}}
    )
    
    # Delete used token
    await db["password_resets"].delete_one({"token": token})
    
    return {"message": "Password reset successful"}