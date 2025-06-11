from datetime import datetime, timedelta
from typing import Optional, Dict
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import HTTPException, status
from models.auth import UserInDB, TokenData
import os
from dotenv import load_dotenv
import uuid

load_dotenv()

# Security configuration
SECRET_KEY = os.getenv("JWT_SECRET_KEY")
if not SECRET_KEY:
    raise ValueError("JWT_SECRET_KEY must be set in environment variables")
# For type checkers, assert non-None
assert isinstance(SECRET_KEY, str)

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7

# Password hashing
try:
    # Try to initialize with bcrypt
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
except AttributeError:
    # Fallback to sha256_crypt if bcrypt has compatibility issues
    pwd_context = CryptContext(schemes=["sha256_crypt"], deprecated="auto")

class SessionManager:
    def __init__(self, db):
        self.db = db
        self.collection = db.sessions

    def create_session(self, user_id: str, refresh_token: str) -> str:
        """
        Create a new session for a user with a refresh token.
        Why: Supports secure session management and token refresh.
        """
        session_id = str(uuid.uuid4())
        session = {
            "_id": session_id,
            "user_id": user_id,
            "refresh_token": refresh_token,
            "created_at": datetime.utcnow(),
            "expires_at": datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
            "is_active": True
        }
        self.collection.insert_one(session)
        return session_id

    def validate_session(self, session_id: str, refresh_token: str) -> bool:
        """
        Validate a session by ID and refresh token.
        Why: Ensures only valid, active, and unexpired sessions are used for token refresh.
        """
        session = self.collection.find_one({
            "_id": session_id,
            "refresh_token": refresh_token,
            "is_active": True,
            "expires_at": {"$gt": datetime.utcnow()}
        })
        return session is not None

    def invalidate_session(self, session_id: str) -> None:
        """
        Invalidate a session by setting is_active to False.
        Why: Supports logout and session revocation.
        """
        self.collection.update_one(
            {"_id": session_id},
            {"$set": {"is_active": False}}
        )

    async def cleanup_expired_sessions(self) -> None:
        """
        Delete all expired sessions from the database.
        Why: Maintains DB hygiene and security.
        """
        self.collection.delete_many({
            "expires_at": {"$lt": datetime.utcnow()}
        })

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Generate password hash"""
    return pwd_context.hash(password)

def create_access_token(data: Dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create JWT access token"""
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)  # type: ignore
    return encoded_jwt

def verify_token(token: str) -> Dict:
    """Verify JWT token"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])  # type: ignore
        if datetime.fromtimestamp(payload["exp"]) < datetime.utcnow():
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

def authenticate_user(db, email: str, password: str) -> dict | None:
    """Authenticate user and return user data if valid, else None."""
    user = db.users.find_one({"email": email})
    if not user:
        return None
    from services.auth import verify_password  # avoid circular import
    if not verify_password(password, user["hashed_password"]):
        return None
    return user

def decode_token(token: str) -> TokenData:
    """Decode and verify JWT token."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])  # type: ignore
        user_id = payload.get("user_id")
        username = payload.get("username")
        email = payload.get("email")
        roles = payload.get("roles", [])
        company_id = payload.get("company_id")
        plant_id = payload.get("plant_id")
        exp = payload.get("exp")
        # Validate required fields and types
        if not isinstance(user_id, str) or not isinstance(username, str) or not isinstance(email, str) or not exp:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        if not isinstance(roles, list):
            roles = [str(roles)] if roles else []
        else:
            roles = [str(r) for r in roles]
        token_data = TokenData(
            user_id=user_id,
            username=username,
            email=email,
            roles=roles,
            company_id=company_id,
            plant_id=plant_id,
            exp=exp
        )
        return token_data
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )