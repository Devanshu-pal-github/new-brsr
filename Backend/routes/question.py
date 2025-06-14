from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from typing import List, Optional, Dict
from dependencies import DB, check_super_admin_access
from models.question import QuestionCreate, Question, QuestionUpdate, QuestionWithCategory
from services.question import QuestionService

router = APIRouter(
    prefix="/questions",
    tags=["questions"],
    responses={404: {"description": "Not found"}},
)

def get_question_service(db):
    return QuestionService(db)

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