from typing import List, Dict, Optional, Any, Union
from fastapi import APIRouter, Depends, HTTPException, Query, status
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorDatabase
from services.environment import EnvironmentService
from dependencies import get_database, get_current_active_user, check_company_access
from models.environment import EnvironmentReport, QuestionAnswer
from pydantic import BaseModel

router = APIRouter(
    prefix="/environment",
    tags=["environment"]
)

def get_environment_service(db: AsyncIOMotorDatabase = Depends(get_database)) -> EnvironmentService:
    return EnvironmentService(db)

@router.post("/reports/{financial_year}", response_model=dict)
async def create_environment_report(
    financial_year: str,
    company_id: str = Query(..., description="Company ID"),
    service: EnvironmentService = Depends(get_environment_service)
):
    """Create a new environment report"""
    try:
        report_id = await service.create_report(
            company_id=company_id,
            financial_year=financial_year
        )
        return {"reportId": report_id, "message": "Report created successfully"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/reports", response_model=List[EnvironmentReport])
async def get_company_reports(
    service: EnvironmentService = Depends(get_environment_service),
    user: Dict = Depends(get_current_active_user)
):
    """Get all environment reports for a company"""
    # Check if user has company access
    if not user.get("company_id"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User does not have company access"
        )
    
    return await service.get_company_reports(user["company_id"])

@router.get("/reports/{financial_year}", response_model=Optional[EnvironmentReport])
async def get_report(
    financial_year: str,
    service: EnvironmentService = Depends(get_environment_service),
    user: Dict = Depends(get_current_active_user)
):
    """Get a specific environment report"""
    # Check if user has company access
    if not user.get("company_id"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User does not have company access"
        )
        
    report = await service.get_report(user["company_id"], financial_year)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report

class AnswerUpdate(BaseModel):
    questionTitle: str
    answer_data: Dict[str, Any]

@router.put("/reports/{financial_year}/answers/{question_id}")
async def update_answer(
    financial_year: str,
    question_id: str,
    update: AnswerUpdate,
    service: EnvironmentService = Depends(get_environment_service),
    user: Dict = Depends(get_current_active_user)
):
    """Update answer for a specific question"""
    # Check if user has company access
    if not user.get("company_id"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User does not have company access"
        )
        
    success = await service.update_answer(
        company_id=user["company_id"],
        financial_year=financial_year,
        question_id=question_id,
        question_title=update.questionTitle,
        answer_data=update.answer_data
    )
    if not success:
        raise HTTPException(status_code=404, detail="Question not found or update failed")
    return {"message": "Answer updated successfully"}

@router.post("/reports/{financial_year}/comments/{question_id}")
async def add_comment(
    financial_year: str,
    question_id: str,
    comment: Dict[str, Any],
    company_id: str = Query(..., description="Company ID"),
    service: EnvironmentService = Depends(get_environment_service)
):
    """Add a comment to a specific question"""
    success = await service.add_comment(
        company_id=company_id,
        financial_year=financial_year,
        question_id=question_id,
        comment=comment
    )
    if not success:
        raise HTTPException(status_code=404, detail="Question not found or comment addition failed")
    return {"message": "Comment added successfully"}

class StatusUpdate(BaseModel):
    status: str

@router.put("/reports/{financial_year}/status")
async def update_status(
    financial_year: str,
    update: StatusUpdate,
    company_id: str = Query(..., description="Company ID"),
    service: EnvironmentService = Depends(get_environment_service)
):
    """Update report status"""
    success = await service.update_status(
        company_id=company_id,
        financial_year=financial_year,
        status=update.status
    )
    if not success:
        raise HTTPException(status_code=404, detail="Report not found or update failed")
    return {"message": "Status updated successfully"}

class BulkAnswerUpdate(BaseModel):
    answers: Dict[str, AnswerUpdate]  # Enforce structure with questionTitle and answer_data

@router.put("/reports/{financial_year}/bulk-answers")
async def bulk_update_answers(
    financial_year: str,
    update: BulkAnswerUpdate,
    company_id: str = Query(..., description="Company ID"),
    service: EnvironmentService = Depends(get_environment_service)
):
    """Bulk update answers for multiple questions"""
    success = await service.bulk_update_answers(
        company_id=company_id,
        financial_year=financial_year,
        answers={k: v.dict() for k, v in update.answers.items()}
    )
    if not success:
        raise HTTPException(status_code=404, detail="Update failed")
    return {"message": "Answers updated successfully"}

class TableAnswerUpdate(BaseModel):
    questionId: str
    questionTitle: str
    updatedData: Union[List[Dict[str, str]], Dict[str, List[Dict[str, str]]]]

@router.post("/reports/{financial_year}/table-answer")
async def update_table_answer(
    financial_year: str,
    update: TableAnswerUpdate,
    current_user: dict = Depends(get_current_active_user),
    service: EnvironmentService = Depends(get_environment_service)
):
    """Update table answer for a specific question"""
    company_id = current_user["company_id"]
    print("current_user:", current_user)
    
    # First check if the report exists
    report = await service.get_report(company_id, financial_year)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found. Please create a report first.")

    success = await service.update_table_answer(
        company_id=company_id,
        financial_year=financial_year,
        question_id=update.questionId,
        question_title=update.questionTitle,
        table_data=update.updatedData
    )
    if not success:
        raise HTTPException(status_code=404, detail="Failed to update table answer.")
    return {"message": "Table answer updated successfully"}

class RowUpdate(BaseModel):
    row_index: int
    current_year: str
    previous_year: str

class PatchTableAnswer(BaseModel):
    questionTitle: str
    rows: List[RowUpdate]

@router.patch("/reports/{financial_year}/answers/{question_id}")
async def patch_table_answer(
    financial_year: str,
    question_id: str,
    update: PatchTableAnswer,
    service: EnvironmentService = Depends(get_environment_service),
    user: Dict = Depends(get_current_active_user)
):
    """Update specific rows in a table answer"""
    # Check if user has company access
    if not user.get("company_id"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User does not have company access"
        )

    # Convert RowUpdate models to dictionaries
    row_updates = []
    for row in update.rows:
        row_updates.append({
            "row_index": row.row_index,
            "current_year": row.current_year,
            "previous_year": row.previous_year
        })

    success = await service.patch_table_answer(
        company_id=user["company_id"],
        financial_year=financial_year,
        question_id=question_id,
        question_title=update.questionTitle,
        row_updates=row_updates
    )
    
    if not success:
        raise HTTPException(status_code=404, detail="Question not found or update failed")
    return {"message": "Table rows updated successfully"}

class SubjectiveAnswerCreate(BaseModel):
    """Request model for creating/updating a subjective answer"""
    questionId: str
    questionTitle: str
    type: str = "subjective"
    data: Dict[str, str]

@router.post("/reports/{financial_year}/subjective-answer")
async def update_subjective_answer(
    financial_year: str,
    answer: SubjectiveAnswerCreate,
    service: EnvironmentService = Depends(get_environment_service),
    user: Dict = Depends(get_current_active_user)
):
    """Update answer for a subjective question"""
    if not user.get("company_id"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User does not have company access"
        )

    try:
        success = await service.update_answer(
            company_id=user["company_id"],
            financial_year=financial_year,
            question_id=answer.questionId,
            question_title=answer.questionTitle,
            answer_data={
                "type": "subjective",
                "text": answer.data.get("text", "")
            }
        )
        if success:
            return {"message": "Answer updated successfully"}
        raise HTTPException(status_code=400, detail="Failed to update answer")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))