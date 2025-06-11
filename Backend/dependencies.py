from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from pymongo.database import Database
from typing import Annotated, Optional, Dict
from models.auth import TokenData, UserInDB
from services.auth import decode_token, verify_token
import uuid

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

def get_database(request: Request):
    db = getattr(request.app, "mongodb", None)
    if db is None:
        raise RuntimeError("Database not initialized on app.")
    return db

# Database dependency
DB = Depends(get_database)

def generate_uuid() -> str:
    """
    Generate a new UUID
    """
    return str(uuid.uuid4())

def get_current_user(token: str = Depends(oauth2_scheme), db: Database = Depends(get_database)) -> Dict:
    """
    Get current authenticated user
    """
    payload = verify_token(token)
    user = db.users.find_one({"_id": payload["user_id"]})
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

def get_document_by_id(collection: str, doc_id: str, db) -> dict:
    """
    Generic function to get a document by its ID
    """
    document = db[collection].find_one({"_id": doc_id})
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document with ID {doc_id} not found in {collection}"
        )
    return document

def check_document_exists(collection: str, doc_id: str, db) -> bool:
    """
    Check if a document exists in a collection
    """
    document = db[collection].find_one({"_id": doc_id})
    return document is not None 