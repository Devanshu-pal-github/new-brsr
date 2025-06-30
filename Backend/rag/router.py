
from fastapi import APIRouter, UploadFile, File, HTTPException, Body, Depends
from .rag_service import process_file_and_store, retrieve_relevant_chunks, ask_gemini_with_context, delete_file_and_index, extract_table_values

# Table Extraction Models
from typing import Dict, Any, List, Optional
from pydantic import BaseModel
from dependencies import get_database
from motor.motor_asyncio import AsyncIOMotorDatabase

router = APIRouter(prefix="/rag", tags=["RAG"])

# Request/Response models
class ChatRequest(BaseModel):
    file_id: str
    question: str

class ChatResponse(BaseModel):
    response: str

# Chat endpoint
@router.post("/chat/", response_model=ChatResponse)
async def chat(
    request: ChatRequest = Body(...),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    # Optionally check file exists using async db
    # file_metadata = await get_file_metadata(request.file_id, db)
    docs = retrieve_relevant_chunks(request.file_id, request.question, k=3)
    if not docs:
        return ChatResponse(response="No relevant information found in the uploaded document.")
    context = "\n".join([doc.page_content for doc in docs])
    answer = ask_gemini_with_context(context, request.question)
    return ChatResponse(response=answer)

@router.get("/ping")
def ping():
    return {"message": "RAG module is up!"}


# File upload endpoint
@router.post("/upload/")
async def upload_file(
    file: UploadFile = File(...),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    # Support multiple file types
    allowed_extensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx']
    file_ext = '.' + file.filename.lower().split('.')[-1] if file.filename else ''
    
    if not file.filename or file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400, 
            detail=f"Only the following file types are allowed: {', '.join(allowed_extensions)}"
        )
    
    if file.size is None:
        raise HTTPException(status_code=400, detail="File size is required")
    
    try:
        file_bytes = await file.read()
        print(f"🔍 [RAG API] Uploading file: {file.filename} ({file.size} bytes)")
        file_id = await process_file_and_store(file_bytes, file.filename, file.size, db)
        print(f"🔍 [RAG API] File uploaded successfully with ID: {file_id}")
        return {"file_id": file_id}
    except Exception as e:
        print(f"❌ [RAG API] Error processing file: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")



@router.delete("/file/{file_id}")
async def delete_file(file_id: str, db: AsyncIOMotorDatabase = Depends(get_database)):
    success = await delete_file_and_index(file_id, db)
    if not success:
        raise HTTPException(status_code=404, detail="File not found")
    return {"message": "File and vector index deleted successfully"}




class TableExtractionRequest(BaseModel):
    file_id: str
    table_metadata: Dict[str, Any]
    question: str

class TableExtractionResponse(BaseModel):
    suggested_values: Dict[str, Dict[str, Any]]
    unit_warnings: Optional[List[str]] = []

# Table extraction endpoint
@router.post("/extract-table", response_model=TableExtractionResponse)
async def extract_table(
    request: TableExtractionRequest = Body(...),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Extracts table values from a document for a given table metadata and question.
    Returns a mapping of rowIdx -> {colKey: value, ...} for editable fields only.
    """
    print(f"🔍 [RAG API] Table extraction request:")
    print(f"🔍 [RAG API] File ID: {request.file_id}")
    print(f"🔍 [RAG API] Question: {request.question}")
    print(f"🔍 [RAG API] Table metadata keys: {list(request.table_metadata.keys()) if request.table_metadata else 'None'}")
    
    try:
        result = await extract_table_values(
            file_id=request.file_id,
            table_metadata=request.table_metadata,
            question=request.question
        )
        print(f"🔍 [RAG API] Extraction result: {result}")
        return result
    except Exception as e:
        print(f"❌ [RAG API] Error in table extraction: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error extracting table values: {str(e)}")