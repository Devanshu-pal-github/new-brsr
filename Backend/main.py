from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os
# Import routers directly
from routes.report import router as report_router
from routes.module import router as module_router
from routes.company import router as company_router
from routes.plant import router as plant_router
from routes.question import router as question_router
from routes.user_access import router as user_access_router
from routes.auth import router as auth_router
from routes.environment import router as environment_router
from routes.module_answer import router as module_answer_router

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi_utils.tasks import repeat_every
from services.auth import SessionManager

# Load environment variables
load_dotenv()

# Check required environment variables
if not os.getenv("JWT_SECRET_KEY"):
    raise HTTPException(
        status_code=500,
        detail="JWT_SECRET_KEY environment variable not set"
    )

# Create rate limiter
limiter = Limiter(key_func=get_remote_address)

# Create FastAPI app
app = FastAPI(
    title="BRSR API",
    description="API for BRSR and Greenhouse Report Management System",
    version="1.0.0",
    redirect_slashes=False
)

# Database connection URL
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "brsr_db")

# Database connection handler
@app.on_event("startup")
async def startup_db_client():
    app.mongodb_client = AsyncIOMotorClient(MONGODB_URL)
    app.mongodb = app.mongodb_client[DB_NAME]
    
    # Create indexes for Reports collection
    await app.mongodb.reports.create_index("name", unique=True)
    await app.mongodb.reports.create_index([("module_ids", 1)])
    
    # Create indexes for Modules collection
    await app.mongodb.modules.create_index("name", unique=True)
    await app.mongodb.modules.create_index("module_type")
    
    # Create indexes for Companies collection
    await app.mongodb.companies.create_index("name", unique=True)
    await app.mongodb.companies.create_index("plant_ids")
    
    # Create indexes for Plants collection
    await app.mongodb.plants.create_index([("company_id", 1), ("plant_code", 1)], unique=True)
    await app.mongodb.plants.create_index("plant_type")
    
    # Create indexes for Questions collection
    await app.mongodb.questions.create_index("module_id")
    await app.mongodb.questions.create_index("question_number", unique=True)
    
    # Create indexes for User Access collection
    await app.mongodb.user_access.create_index([
        ("user_id", 1),
        ("company_id", 1),
        ("plant_id", 1)
    ], unique=True)
    app.mongodb.user_access.create_index("role")

# Background task for session cleanup
@app.on_event("startup")
@repeat_every(seconds=60 * 60 * 24)  # Run once per day
async def cleanup_expired_sessions() -> None:
    session_manager = SessionManager(app.mongodb)
    await session_manager.cleanup_expired_sessions()

# Add rate limiter to app
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    app.mongodb_client.close()

# Root endpoint
@app.get("/")
async def root():
    return {
        "message": "Welcome to BRSR API",
        "status": "active",
        "version": "1.0.0"
    }

# Include routers
app.include_router(module_router)
app.include_router(company_router)
app.include_router(plant_router, prefix="/plants")
app.include_router(question_router)
app.include_router(user_access_router, prefix="/user-access")
app.include_router(auth_router, prefix="/auth")
app.include_router(report_router)
app.include_router(environment_router)
app.include_router(module_answer_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
