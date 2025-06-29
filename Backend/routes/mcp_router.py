import json
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from services.mcpServices.LLMs.Groq.ToolService import get_tool_service, ToolService
from services.mcpServices.LLMs.Groq.GroqSerivce import get_groq_service, GroqService
from services.mcpServices.LLMs.Groq.LoggerService import get_logger
from services.mcpServices.LLMs.Groq.DatabaseService import get_database_service, DatabaseService
from bson import ObjectId
from datetime import datetime

logger = get_logger("MCP.Main")

router = APIRouter()

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

@router.post("/api/chat")
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
                # --- Friendly message for plant count queries ---
                if (
                    isinstance(db_result, dict)
                    and "plant_count" in db_result
                    and "company_name" in db_result
                    and db_result.get("plant_count") is not None
                ):
                    company = db_result.get("company_name", "The company")
                    count = db_result.get("plant_count", 0)
                    reply = f"{company} has {count} plant{'s' if count != 1 else ''}."
                    return JSONResponse({"reply": reply, "plant_ids": db_result.get("plant_ids", [])})
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
