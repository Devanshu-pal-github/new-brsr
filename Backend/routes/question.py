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
    """Create a new question"""
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
    """Get a specific question by ID"""
    question = await question_service.get_question(question_id, include_category)
    if not question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Question with ID {question_id} not found"
        )
    return question

@router.get("/", response_model=List[Question])
async def list_questions(
    category_id: Optional[str] = Query(None, description="Filter questions by category ID"),
    module_id: Optional[str] = Query(None, description="Filter questions by module ID"),
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1),
    question_service = Depends(get_question_service)
):
    """List all questions with optional filtering and pagination"""
    return await question_service.list_questions(
        category_id=category_id,
        module_id=module_id,
        skip=skip,
        limit=limit
    )

@router.patch("/{question_id}", response_model=Question)
async def update_question(
    question_id: str,
    question_update: QuestionUpdate,
    question_service = Depends(get_question_service),
    current_user: Dict = Depends(check_super_admin_access)
):
    """Update a question"""
    try:
        question = await question_service.update_question(question_id, question_update)
        if not question:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Question with ID {question_id} not found"
            )
        return question
    except ValueError as e:
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
    """Delete a question and its associated answers"""
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