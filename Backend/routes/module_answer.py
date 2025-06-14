from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from typing import List, Optional, Dict, Any
from dependencies import get_database, get_current_user
from models.module_answer import ModuleAnswer, ModuleAnswerCreate, ModuleAnswerUpdate, BulkModuleAnswerCreate, BulkModuleAnswerResponse, BulkModuleAnswerUpdate, ModuleAnswerUpdateRequest
from services.module_answer import ModuleAnswerService
from motor.motor_asyncio import AsyncIOMotorDatabase

router = APIRouter(
    prefix="/module-answers",
    tags=["module-answers"],
    responses={
        404: {"description": "Not found"},
        400: {"description": "Bad request"},
        401: {"description": "Unauthorized"}
    },
)

def get_module_answer_service(module_id: str, db: AsyncIOMotorDatabase = Depends(get_database)) -> ModuleAnswerService:
    return ModuleAnswerService(db, module_id)

@router.post("/{module_id}", response_model=ModuleAnswer, status_code=status.HTTP_201_CREATED)
async def create_module_answer(
    module_id: str,
    answer_data: ModuleAnswerCreate,
    module_answer_service: ModuleAnswerService = Depends(get_module_answer_service),
    current_user: Dict = Depends(get_current_user)
):
    """Create a new answer for a specific module
    
    - Requires authentication
    - Each company/plant/financial_year combination can only have one answer per module
    """
    # Add the current user as the creator
    if current_user and "id" in current_user:
        answer_data.created_by = current_user["id"]
    
    try:
        return await module_answer_service.create_answer(answer_data)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.post("/{module_id}/bulk", response_model=BulkModuleAnswerResponse, status_code=status.HTTP_201_CREATED)
async def bulk_create_module_answers(
    module_id: str,
    bulk_data: BulkModuleAnswerCreate,
    module_answer_service: ModuleAnswerService = Depends(get_module_answer_service),
    current_user: Dict = Depends(get_current_user)
):
    """Create multiple answers for a specific module in bulk
    
    - Requires authentication
    - More efficient than creating answers one by one
    - Validates that no duplicate company/plant/financial_year combinations exist
    """
    # Add the current user as the creator for each answer
    if current_user and "id" in current_user:
        for answer_data in bulk_data.answers:
            answer_data.created_by = current_user["id"]
    
    try:
        results = await module_answer_service.bulk_create_answers(bulk_data.answers)
        return BulkModuleAnswerResponse(
            success_count=len(results),
            failed_count=0,
            results=results
        )
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/{module_id}", response_model=List[ModuleAnswer])
async def list_module_answers(
    module_id: str,
    company_id: Optional[str] = Query(None, description="Filter by company ID"),
    plant_id: Optional[str] = Query(None, description="Filter by plant ID"),
    financial_year: Optional[str] = Query(None, description="Filter by financial year"),
    status: Optional[str] = Query(None, description="Filter by status"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(10, ge=1, le=100, description="Number of records to return"),
    module_answer_service: ModuleAnswerService = Depends(get_module_answer_service),
    current_user: Dict = Depends(get_current_user)
):
    """List answers for a specific module with optional filtering
    
    - Requires authentication
    - Can filter by company, plant, financial year, and status
    """
    try:
        return await module_answer_service.list_answers(
            company_id=company_id,
            plant_id=plant_id,
            financial_year=financial_year,
            status=status,
            skip=skip,
            limit=limit
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/{module_id}/{company_id}/{plant_id}/{financial_year}", response_model=ModuleAnswer)
async def get_module_answer(
    module_id: str,
    company_id: str,
    plant_id: str,
    financial_year: str,
    module_answer_service: ModuleAnswerService = Depends(get_module_answer_service),
    current_user: Dict = Depends(get_current_user)
):
    """Get a specific answer for a module
    
    - Requires authentication
    - Retrieves the answer for a specific company/plant/financial_year combination
    """
    answer = await module_answer_service.get_answer(company_id, plant_id, financial_year)
    if not answer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Answer not found"
        )
    return answer

@router.put("/{module_id}/{company_id}/{plant_id}/{financial_year}", response_model=ModuleAnswer)
async def update_module_answer(
    module_id: str,
    company_id: str,
    plant_id: str,
    financial_year: str,
    update_data: ModuleAnswerUpdate,
    module_answer_service: ModuleAnswerService = Depends(get_module_answer_service),
    current_user: Dict = Depends(get_current_user)
):
    """Update an existing answer for a module
    
    - Requires authentication
    - Updates the answer for a specific company/plant/financial_year combination
    """
    # Add the current user as the updater
    if current_user and "id" in current_user:
        update_data.updated_by = current_user["id"]
    
    try:
        answer = await module_answer_service.update_answer(
            company_id, plant_id, financial_year, update_data
        )
        if not answer:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Answer not found or not updated"
            )
        return answer
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.put("/{module_id}/bulk", response_model=BulkModuleAnswerResponse)
async def bulk_update_module_answers(
    module_id: str,
    bulk_update_data: BulkModuleAnswerUpdate,
    module_answer_service: ModuleAnswerService = Depends(get_module_answer_service),
    current_user: Dict = Depends(get_current_user)
):
    """Update multiple answers for a module in bulk
    
    - Requires authentication
    - More efficient than updating answers one by one
    - Skips non-existent answers
    """
    # Add the current user as the updater for each answer
    if current_user and "id" in current_user:
        for update_request in bulk_update_data.updates:
            if update_request.update_data.updated_by is None:
                update_request.update_data.updated_by = current_user["id"]
    
    # Convert to the format expected by the service
    updates = [
        {
            "company_id": update.company_id,
            "plant_id": update.plant_id,
            "financial_year": update.financial_year,
            "update_data": update.update_data.model_dump(exclude_unset=True)
        }
        for update in bulk_update_data.updates
    ]
    
    try:
        results = await module_answer_service.bulk_update_answers(updates)
        return BulkModuleAnswerResponse(
            success_count=len(results),
            failed_count=len(bulk_update_data.updates) - len(results),
            results=results
        )
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.post("/{module_id}/sync-questions")
async def sync_question_ids(
    module_id: str,
    question_ids: List[str] = Body(..., description="List of question IDs to sync"),
    module_answer_service: ModuleAnswerService = Depends(get_module_answer_service),
    current_user: Dict = Depends(get_current_user)
):
    """Sync question IDs with all answers in this module
    
    - Requires authentication
    - Ensures all answers have entries for all questions in the module
    - Useful when new questions are added to a module
    """
    try:
        await module_answer_service.sync_question_ids(question_ids)
        return {"status": "success", "message": f"Synced {len(question_ids)} question IDs with all answers"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )