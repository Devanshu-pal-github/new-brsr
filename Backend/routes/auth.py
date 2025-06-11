from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from datetime import timedelta
from models.auth import UserCreate, UserInDB, Token, UserUpdate
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

router = APIRouter(prefix="/auth", tags=["Authentication"])

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
    # Authenticate user (sync)
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    # Create access token (JWT)
    access_token = create_access_token(
        data={
            "sub": user["email"],
            "user_id": user["_id"],
            "username": user["full_name"],
            "email": user["email"],
            "roles": [user["role"]],
            "company_id": user.get("company_id"),
            "plant_id": user.get("plant_id")
        }
    )
    # Create refresh token (secure random string)
    refresh_token = secrets.token_urlsafe(32)
    # Store session in DB (sync)
    session_manager = SessionManager(db)
    session_manager.create_session(user["_id"], refresh_token)
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "user_id": user["_id"],
        "role": user["role"],
        "company_id": user.get("company_id"),
        "plant_id": user.get("plant_id")
    }

@router.get("/verify")
async def verify_auth(token):
    """Verify JWT token"""
    return verify_token(token)

@router.post("/refresh")
async def refresh_token(token, db = Depends(get_database)):
    """Refresh JWT token"""
    payload = verify_token(token)
    user = db.users.find_one({"_id": payload["user_id"]})
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
async def register_user(user: UserCreate, db = Depends(get_database)):
    """
    Register a new user (admin-only or open registration, as per business logic).
    - Checks for existing user by email.
    - Hashes password and stores user securely.
    - Returns the created user (excluding password).

    **Sample Postman Request:**
    POST /auth/register
    Body (JSON):
    {
        "email": "user@example.com",
        "full_name": "User Name",
        "password": "yourpassword",
        "role": "company_admin",
        "company_id": "...",  # optional
        "plant_id": "..."     # optional
    }

    **Sample Response:**
    {
        "id": "...",
        "email": "user@example.com",
        "full_name": "User Name",
        "role": "company_admin",
        "company_id": "...",
        "plant_id": "...",
        "is_active": true,
        "hashed_password": "...",
        "access_modules": []
    }
    """
    # Check if email already exists
    if db["users"].find_one({"email": user.email}):
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )
    user_dict = user.model_dump()
    user_dict["_id"] = generate_uuid()
    user_dict["id"] = user_dict["_id"]
    user_dict["hashed_password"] = get_password_hash(user_dict.pop("password"))
    user_dict["access_modules"] = []
    db["users"].insert_one(user_dict)
    return UserInDB(**user_dict)

@router.post("/users", response_model=UserInDB)
async def create_user(user, db):
    """Create a new user"""
    # Check if email already exists
    if db["users"].find_one({"email": user.email}):
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
    db["users"].insert_one(user_dict)
    return UserInDB(**user_dict)

@router.get("/users/me", response_model=UserInDB)
async def read_users_me(
    current_user = Depends(get_current_active_user)
):
    """Get current user information"""
    return current_user

@router.put("/users/me", response_model=UserInDB)
async def update_user(
    user_update,
    db,
    current_user = Depends(get_current_active_user)
):
    """Update current user information"""
    update_data = user_update.model_dump(exclude_unset=True)
    if "password" in update_data:
        update_data["hashed_password"] = get_password_hash(update_data.pop("password"))
    if update_data:
        db["users"].update_one(
            {"_id": current_user.id},
            {"$set": update_data}
        )
    updated_user = db["users"].find_one({"_id": current_user.id})
    return UserInDB(**updated_user) 