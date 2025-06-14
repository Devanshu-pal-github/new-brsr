from fastapi import APIRouter, Depends, HTTPException, status, Query, Body, Request
from typing import List, Optional, Dict
from dependencies import check_super_admin_access
from models.question import QuestionCreate, Question, QuestionUpdate, QuestionWithCategory
from services.question import QuestionService
from pydantic import BaseModel, Field

router = APIRouter(
    prefix="/questions",
    tags=["questions"],
    responses={404: {"description": "Not found"}},
)

async def get_question_service(request: Request):
    """Get an instance of the QuestionService
    Args:
        request: The FastAPI request object
    Returns:
        QuestionService instance
    """
    return QuestionService(request.app.mongodb)

class QuestionCreateWithCategory(BaseModel):
    human_readable_id: str
    category_id: str
    question_text: str
    question_type: str
    metadata: Dict = {}
    
class QuestionBatchRequest(BaseModel):
    question_ids: List[str] = Field(..., description="List of question IDs to fetch")
    category_id: Optional[str] = Field(None, description="Category ID for the questions")
    include_category: bool = Field(False, description="Include category and module details")

@router.post("/", response_model=Question, status_code=status.HTTP_201_CREATED)
async def create_question(
    category_id: str = Query(..., description="Category ID to add the question to"),
    question: QuestionCreate = Body(...),
    question_service = Depends(get_question_service),
    current_user: Dict = Depends(check_super_admin_access)
):
    """Create a new question with required fields: human_readable_id and metadata"""
    try:
        return await question_service.create_question(category_id, question)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/{question_id}", response_model=QuestionWithCategory)
async def get_question(
    question_id: str,
    include_category: bool = Query(True, description="Include category and module details"),
    question_service = Depends(get_question_service)
):
    """Get a specific question by ID with its category and module information"""
    question = await question_service.get_question(question_id, include_category)
    if not question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Question with ID {question_id} not found"
        )
    return question

@router.get("/", response_model=List[Question])
async def list_questions(
    category_id: Optional[str] = Query(None, description="Filter by category ID"),
    module_id: Optional[str] = Query(None, description="Filter by module ID"),
    skip: int = Query(0, description="Number of questions to skip"),
    limit: int = Query(10, description="Maximum number of questions to return"),
    question_service = Depends(get_question_service)
):
    """List questions with optional filtering by category or module ID"""
    if not category_id and not module_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either category_id or module_id must be provided"
        )
    return await question_service.list_questions(category_id, module_id, skip, limit)

@router.patch("/{question_id}", response_model=Question)
async def update_question(
    question_id: str,
    question_data: QuestionUpdate,
    question_service = Depends(get_question_service),
    current_user: Dict = Depends(check_super_admin_access)
):
    """Update a question's human_readable_id or metadata"""
    try:
        return await question_service.update_question(question_id, question_data)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.delete("/{question_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_question(
    question_id: str,
    question_service = Depends(get_question_service),
    current_user: Dict = Depends(check_super_admin_access)
):
    """Delete a question by ID"""
    try:
        deleted = await question_service.delete_question(question_id)
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Question with ID {question_id} not found"
            )
        return None
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.post("/create-with-category", response_model=Question, status_code=status.HTTP_201_CREATED)
async def create_question_with_category(
    question_data: QuestionCreateWithCategory,
    question_service = Depends(get_question_service),
    current_user: Dict = Depends(check_super_admin_access)
):
    """Create a new question and add it to the specified category
    
    This endpoint creates a question with the specified fields and updates the category with the question IDs.
    The question is stored in the questions collection and the question ID is added to the category's question_ids array.
    
    Supported question types: subjective, table, table_with_additional_rows
    """
    try:
        return await question_service.create_question_with_category_update(
            human_readable_id=question_data.human_readable_id,
            category_id=question_data.category_id,
            question_text=question_data.question_text,
            question_type=question_data.question_type,
            metadata=question_data.metadata
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.post("/bulk-create", response_model=List[Question], status_code=status.HTTP_201_CREATED)
async def bulk_create_questions(
    questions_data: List[QuestionCreateWithCategory],
    question_service = Depends(get_question_service),
    current_user: Dict = Depends(check_super_admin_access)
):
    """Bulk create questions and add them to their respective categories
    
    This endpoint creates multiple questions with the specified fields and updates the categories with the question IDs.
    The questions are stored in the questions collection and the question IDs are added to the respective category's question_ids array.
    
    Supported question types: subjective, table, table_with_additional_rows
    """
    try:
        # Convert Pydantic models to dictionaries
        questions_data_dicts = [q.dict() for q in questions_data]
        return await question_service.bulk_create_questions(questions_data_dicts)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.patch("/{question_id}/metadata", response_model=Question)
async def update_question_metadata(
    question_id: str,
    metadata: Dict = Body(..., description="New metadata for the question"),
    question_service = Depends(get_question_service),
    current_user: Dict = Depends(check_super_admin_access)
):
    """Update the metadata of a question
    
    This endpoint updates only the metadata field of a question.
    """
    try:
        return await question_service.update_question_metadata(question_id, metadata)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
        
@router.post("/batch", response_model=List[Question])
async def get_questions_by_ids(
    request: QuestionBatchRequest,
    question_service = Depends(get_question_service)
):
    """Get multiple questions by their IDs in a single batch operation
    
    This endpoint retrieves multiple questions by their IDs in a single request,
    optimizing frontend performance by reducing the number of API calls needed.
    
    Args:
        request: QuestionBatchRequest containing question_ids and include_category flag
        question_service: QuestionService instance
        
    Returns:
        List of Question objects
    """
    try:
        return await question_service.get_questions_by_ids(
            question_ids=request.question_ids,
            include_category=request.include_category,
            category_id=request.category_id
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )