from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from dependencies import DB
from models.answer import (
    AnswerCreate, Answer, AnswerUpdate, AnswerWithDetails,
    AnswerHistory, BulkAnswerCreate, BulkAnswerResponse
)
from services.answer import AnswerService

router = APIRouter(
    tags=["answers"],
    responses={404: {"description": "Not found"}},
)

def get_answer_service(db):
    return AnswerService(db)

@router.post("/", response_model=Answer, status_code=status.HTTP_201_CREATED)
async def create_answer(
    answer: AnswerCreate,
    answer_service = Depends(get_answer_service)
):
    """Create a new answer"""
    try:
        return await answer_service.create_answer(answer)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.post("/bulk", response_model=BulkAnswerResponse, status_code=status.HTTP_201_CREATED)
async def bulk_create_answers(
    bulk_create: BulkAnswerCreate,
    answer_service = Depends(get_answer_service)
):
    """Create multiple answers for a plant"""
    try:
        return await answer_service.bulk_create_answers(bulk_create)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/{answer_id}", response_model=AnswerWithDetails)
async def get_answer(
    answer_id: str,
    include_details: bool = Query(True, description="Include related details"),
    answer_service = Depends(get_answer_service)
):
    """Get a specific answer by ID"""
    answer = await answer_service.get_answer(answer_id, include_details)
    if not answer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Answer with ID {answer_id} not found"
        )
    return answer

@router.get("/history/{answer_id}", response_model=AnswerHistory)
async def get_answer_history(
    answer_id: str,
    answer_service = Depends(get_answer_service)
):
    """Get the version history of an answer"""
    history = await answer_service.get_answer_history(answer_id)
    if not history:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Answer with ID {answer_id} not found"
        )
    return history

@router.get("/", response_model=List[Answer])
async def list_answers(
    question_id: Optional[str] = Query(None, description="Filter by question ID"),
    plant_id: Optional[str] = Query(None, description="Filter by plant ID"),
    category_id: Optional[str] = Query(None, description="Filter by category ID"),
    module_id: Optional[str] = Query(None, description="Filter by module ID"),
    status: Optional[str] = Query(None, description="Filter by answer status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1),
    answer_service = Depends(get_answer_service)
):
    """List all answers with optional filtering and pagination"""
    return await answer_service.list_answers(
        question_id=question_id,
        plant_id=plant_id,
        category_id=category_id,
        module_id=module_id,
        status=status,
        skip=skip,
        limit=limit
    )

@router.patch("/{answer_id}", response_model=Answer)
async def update_answer(
    answer_id: str,
    answer_update: AnswerUpdate,
    user_id: Optional[str] = Query(None, description="ID of the user making the update"),
    answer_service = Depends(get_answer_service)
):
    """Update an answer"""
    try:
        answer = await answer_service.update_answer(answer_id, answer_update, user_id)
        if not answer:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Answer with ID {answer_id} not found"
            )
        return answer
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.delete("/{answer_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_answer(
    answer_id: str,
    answer_service = Depends(get_answer_service)
):
    """Delete an answer (archives it first)"""
    deleted = await answer_service.delete_answer(answer_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Answer with ID {answer_id} not found"
        )
    return None