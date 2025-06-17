import os
from fastapi import APIRouter, HTTPException
from typing import Optional, Dict, Any
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from datetime import datetime
from services.gemini_services import GeminiService
import logging

# Configure logging
logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api",
    tags=["Gemini AI"]
)

# Initialize Gemini service
gemini_service = GeminiService()

# Store active streams (shared across all streaming routes)
active_streams = {}

class MessageRequest(BaseModel):
    message: str
    context: Optional[Dict[Any, Any]] = None

class StreamRequest(BaseModel):
    message: str
    context: Optional[Dict[Any, Any]] = None

class BRSRStreamRequest(BaseModel):
    question: str
    response: str

@router.post("/messages")
async def generate_text(request: MessageRequest):
    try:
        # Create prompt with context
        prompt = gemini_service.create_prompt_with_context(request.message, request.context)
        
        # Generate response
        response = await gemini_service.generate_content(prompt)
        return {"text": response}
    except Exception as e:
        logger.error(f"Error generating text: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/messages/stream")
async def create_stream(request: StreamRequest):
    try:
        # Create a unique stream ID
        stream_id = datetime.now().strftime("%Y%m%d%H%M%S") + str(len(active_streams))
        
        # Store stream context
        active_streams[stream_id] = {
            "message": request.message,
            "context": request.context
        }
        
        return {"streamId": stream_id}
    except Exception as e:
        logger.error(f"Error creating stream: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/messages/stream/{stream_id}")
async def get_stream(stream_id: str):
    if stream_id not in active_streams:
        raise HTTPException(status_code=404, detail="Stream not found")

    stream_data = active_streams[stream_id]
    prompt = gemini_service.create_prompt_with_context(
        stream_data["message"], 
        stream_data["context"]
    )

    async def stream_response():
        try:
            stream = await gemini_service.generate_content_stream(prompt)
            
            async for chunk in stream:
                if chunk.text:
                    logger.info(f"Streaming chunk for {stream_id}: {chunk.text}")
                    yield f"data: {chunk.text}\n\n"
            
            logger.info(f"Stream {stream_id} complete")
            yield "event: complete\ndata: \n\n"
            del active_streams[stream_id]
            
        except Exception as e:
            logger.error(f"Streaming error for {stream_id}: {str(e)}")
            yield f"error: {str(e)}\n\n"
            del active_streams[stream_id]

    return StreamingResponse(
        stream_response(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive"
        }
    )

@router.post("/generate")
async def generate_text_from_first(request: MessageRequest):
    try:
        prompt = gemini_service.create_prompt_with_context(request.message, request.context)
        
        response = await gemini_service.generate_content(prompt)
        
        return {"text": response}
    except Exception as e:
        logger.error(f"Error generating text: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate_stream")
async def generate_stream_from_first(request: StreamRequest):
    if not (os.getenv("GEMINI_API_KEY") or os.getenv("VITE_API_KEY")):
        logger.error("AI service unavailable: API key missing or invalid")
        raise HTTPException(status_code=500, detail="AI service unavailable")

    stream_id = datetime.now().strftime("%Y%m%d%H%M%S") + str(len(active_streams))
    active_streams[stream_id] = {
        "message": request.message,
        "context": request.context
    }
    
    return {"streamId": stream_id}

@router.get("/generate_stream/{stream_id}")
async def get_stream_from_first(stream_id: str):
    if stream_id not in active_streams:
        raise HTTPException(status_code=404, detail="Stream not found")

    stream_data = active_streams[stream_id]
    prompt = gemini_service.create_prompt_with_context(stream_data["message"], stream_data["context"])

    async def stream_response():
        try:
            stream = await gemini_service.generate_content_stream(prompt)
            
            async for chunk in stream:
                if chunk.text:
                    logger.info(f"Streaming chunk for {stream_id}: {chunk.text}")
                    yield f"data: {chunk.text}\n\n"
            
            logger.info(f"Stream {stream_id} complete")
            yield "event: complete\ndata: \n\n"
            del active_streams[stream_id]
            
        except Exception as e:
            logger.error(f"Streaming error for {stream_id}: {str(e)}")
            yield f"error: {str(e)}\n\n"
            del active_streams[stream_id]

    return StreamingResponse(
        stream_response(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive"
        }
    )

@router.post("/brsr/improve/stream")
async def create_brsr_stream(request: BRSRStreamRequest):
    if not (os.getenv("GEMINI_API_KEY") or os.getenv("VITE_API_KEY")):
        logger.error("AI service unavailable: API key missing or invalid")
        raise HTTPException(status_code=500, detail="AI service unavailable")

    try:
        # Create a unique stream ID
        stream_id = datetime.now().strftime("%Y%m%d%H%M%S") + str(len(active_streams))
        
        # Store BRSR stream data
        active_streams[stream_id] = {
            "question": request.question,
            "response": request.response
        }
        
        logger.info(f"Created BRSR stream with ID: {stream_id}")
        return {"streamId": stream_id}
    except Exception as e:
        logger.error(f"Error creating BRSR stream: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/brsr/improve/stream/{stream_id}")
async def get_brsr_stream(stream_id: str):
    if stream_id not in active_streams:
        raise HTTPException(status_code=404, detail="Stream not found")

    stream_data = active_streams[stream_id]

    async def stream_response():
        try:
            # Stream the improved BRSR response
            async for chunk in gemini_service.improve_brsr_response(
                question=stream_data["question"],
                response=stream_data["response"]
            ):
                logger.info(f"Streaming BRSR chunk for {stream_id}: {chunk}")
                yield f"data: {chunk}\n\n"
            
            logger.info(f"BRSR stream {stream_id} complete")
            yield "event: complete\ndata: \n\n"
            del active_streams[stream_id]
            
        except Exception as e:
            logger.error(f"Streaming error for BRSR stream {stream_id}: {str(e)}")
            yield f"error: {str(e)}\n\n"
            del active_streams[stream_id]

    return StreamingResponse(
        stream_response(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive"
        }
    )