import json
from multiprocessing.util import get_logger
from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel
from dotenv import load_dotenv
import os
import logging
import pytz
from datetime import datetime
from google import genai
from google.genai import types
from bson import ObjectId

from services.mcpServices.LLMs.Groq.ToolService import get_tool_service, ToolService
from services.mcpServices.LLMs.Groq.GroqSerivce import get_groq_service, GroqService
from services.mcpServices.LLMs.Groq.LoggerService import get_logger
from services.mcpServices.LLMs.Groq.DatabaseService import get_database_service, DatabaseService
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
from routes.geminiRoute import router as gemini_router
from routes.audit import router as audit_router
from routes.ghgRoute import router as ghg_router
from routes.common_fields import router as common_fields_router
from routes.notification import router as notification_router
from routes.mcp_router import router as mcp_router

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi_utils.tasks import repeat_every
from services.auth import SessionManager

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# Load environment variables
load_dotenv()

# Check required environment variables
if not os.getenv("JWT_SECRET_KEY"):
    raise HTTPException(
        status_code=500,
        detail="JWT_SECRET_KEY environment variable not set"
    )

# Initialize Gemini
EXPECTED_API_KEY = os.getenv("GEMINI_API_KEY")
if not EXPECTED_API_KEY:
    logger.error("GEMINI_API_KEY not found in environment variables")
    raise RuntimeError("GEMINI_API_KEY not found in environment variables")

client = genai.Client(api_key=EXPECTED_API_KEY)
model = "gemini-1.5-flash"

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

# Mock message storage (replace with MongoDB in production)
messages = []
chat_sessions = set()
class MessageRequest(BaseModel):
    message: str
    
# Define request model
class ChatRequest(BaseModel):
    sessionId: str
    message: str


def convert_objectid(obj):
    if isinstance(obj, ObjectId):
        return str(obj)
    if isinstance(obj, datetime):
        return obj.isoformat()
    if isinstance(obj, list):
        return [convert_objectid(item) for item in obj]
    if isinstance(obj, dict):
        return {k: convert_objectid(v) for k, v in obj.items()}
    return obj

@app.post("/api/chat")
async def chat_endpoint(
    request: ChatRequest,
    db_service: DatabaseService = Depends(get_database_service),
    groq_service: GroqService = Depends(get_groq_service)
):
    tool_service = get_tool_service(db_service.get_db())
    try:
        logger.info("Received chat request: sessionId=%s, message=%s", request.sessionId, request.message)
        if not request.sessionId or len(request.sessionId) > 100:
            raise HTTPException(status_code=400, detail="Invalid sessionId")
        if not request.message or len(request.message) > 1000:
            raise HTTPException(status_code=400, detail="Message too long or empty")

        response = await groq_service.query([{"role": "user", "content": request.message}])
        logger.info("Groq response: %s", response)

        is_db_related = response.get("isDbRelated", False)
        result = response.get("response", "No response provided")

        if is_db_related:
            try:
                if isinstance(result, str):
                    result = json.loads(result)
                db_result = tool_service.db_call(result, user_prompt=request.message)
                logger.info("Database query result: %s", db_result)
                db_result = convert_objectid(db_result)
                return JSONResponse({"reply": db_result})
            except Exception as e:
                logger.error("Error executing database query: %s", e)
                return JSONResponse({"reply": f"Error executing database query: {str(e)}"}, status_code=500)
        else:
            logger.info("Non-database response: %s", result)
            return JSONResponse({"reply": result})
    except HTTPException as he:
        logger.error("HTTP error: %s", he)
        raise he
    except Exception as e:
        logger.error("Unexpected error in chat endpoint: %s", e)
        return JSONResponse({"reply": f"Unexpected error: {str(e)}"}, status_code=500)
    
    
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

# Chatbot endpoints
@app.get("/api/messages")
async def get_messages():
    return messages

@app.post("/api/messages")
async def post_message(request: MessageRequest):
    prompt = request.message
    
    if not EXPECTED_API_KEY:
        logger.error("AI service unavailable: API key missing or invalid")
        raise HTTPException(status_code=500, detail="AI service unavailable")

    try:
        generate_content_config = types.GenerateContentConfig(
            response_mime_type="text/plain",
        )
        response = client.models.generate_content(
            model=model,
            contents=prompt,
            config=generate_content_config,
        )
        reply = response.text
        message_id = len(messages) + 1
        ist = pytz.timezone('Asia/Kolkata')
        messages.append({
            "message_id": message_id,
            "user_message": prompt,
            "bot_reply": reply,
            "timestamp": datetime.now(ist).isoformat()
        })
        return {"reply": reply}
    except Exception as e:
        logger.error(f"Error generating text: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/messages/stream")
async def stream_message(request: Request, message: str):
    if not EXPECTED_API_KEY:
        logger.error("AI service unavailable: API key missing or invalid")
        raise HTTPException(status_code=500, detail="AI service unavailable")

    async def stream_response():
        try:
            generate_content_config = types.GenerateContentConfig(
                response_mime_type="text/plain",
            )
            stream = client.models.generate_content_stream(
                model=model,
                contents=message,
                config=generate_content_config,
            )
            for chunk in stream:
                if chunk.text:
                    logger.info(f"Streaming chunk: {chunk.text}")
                    yield f"data: {chunk.text}\n\n"
            logger.info("Streaming complete")
            yield "event: complete\ndata: \n\n"
        except Exception as e:
            logger.error(f"Streaming error: {str(e)}")
            yield f"error: {str(e)}\n\n"

    return StreamingResponse(stream_response(), media_type="text/event-stream", headers={"Cache-Control": "no-cache"})

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
    allow_origins=["*"],  # Update with specific origins in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=[
        "Content-Type", 
        "Authorization", 
        "accept", 
        "Origin", 
        "X-Requested-With",
        "Access-Control-Allow-Origin",
        "Access-Control-Allow-Credentials",
        "Access-Control-Allow-Methods",
        "Access-Control-Allow-Headers"
    ],
    expose_headers=[
        "Access-Control-Allow-Origin",
        "Access-Control-Allow-Credentials",
        "Access-Control-Allow-Methods",
        "Access-Control-Allow-Headers"
    ]
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
app.include_router(module_router, prefix="/modules")
app.include_router(company_router)
app.include_router(plant_router, prefix="/plants")
app.include_router(question_router)
app.include_router(user_access_router, prefix="/user-access")
app.include_router(auth_router, prefix="/auth")
app.include_router(report_router)
app.include_router(environment_router)
app.include_router(module_answer_router)
app.include_router(gemini_router)
app.include_router(audit_router, prefix="/audit")
app.include_router(ghg_router)
app.include_router(common_fields_router)
app.include_router(notification_router)
# Include MCP router
app.include_router(mcp_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
