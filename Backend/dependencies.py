from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Annotated, Optional, Dict
from models.auth import TokenData, UserInDB
from services.auth import decode_token, verify_token
from services.plant import PlantService
import uuid

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

async def get_database(request: Request) -> AsyncIOMotorDatabase:
    db = getattr(request.app, "mongodb", None)
    if db is None:
        raise RuntimeError("Database not initialized on app.")
    return db

# Database dependency
DB = Depends(get_database)

async def get_plant_service(request: Request) -> PlantService:
    """
    Get an instance of the PlantService
    Args:
        request: The FastAPI request object
    Returns:
        PlantService instance
    """
    return PlantService(request.app.mongodb)

def generate_uuid() -> str:
    """
    Generate a new UUID
    """
    return str(uuid.uuid4())

async def get_current_user(token: str = Depends(oauth2_scheme), db: AsyncIOMotorDatabase = Depends(get_database)) -> Dict:
    """
    Get current authenticated user
    """
    payload = verify_token(token)
    user = await db.users.find_one({"_id": payload["user_id"]})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return user

def get_current_active_user(current_user: Dict = Depends(get_current_user)) -> Dict:
    """
    Get current active user
    """
    if not current_user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    return current_user

def check_company_access(user: Dict = Depends(get_current_active_user)) -> None:
    """
    Check if user has company access
    """
    if not user.get("company_id"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User does not have company access"
        )

def check_plant_access(user: Dict = Depends(get_current_active_user)) -> None:
    """
    Check if user has plant access
    """
    if not user.get("plant_id"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User does not have plant access"
        )

def check_super_admin_access(user: Dict = Depends(get_current_active_user)) -> None:
    """
    Check if user has super admin access
    """
    if user.get("role") != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User does not have super admin access"
        )

async def get_document_by_id(collection: str, doc_id: str, db: AsyncIOMotorDatabase) -> dict:
    """
    Generic function to get a document by its ID
    """
    document = await db[collection].find_one({"_id": doc_id})
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document with ID {doc_id} not found in {collection}"
        )
    return document

async def check_document_exists(collection: str, doc_id: str, db: AsyncIOMotorDatabase) -> bool:
    """
    Check if a document exists in a collection
    """
    document = await db[collection].find_one({"_id": doc_id})
    return document is not None