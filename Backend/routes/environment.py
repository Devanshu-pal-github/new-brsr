from typing import List, Dict, Optional, Any
from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorDatabase
from services.environment import EnvironmentService
from dependencies import get_database, get_current_active_user
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
    current_user: Dict = Depends(get_current_active_user),
    service: EnvironmentService = Depends(get_environment_service)
):
    """Create a new environment report"""
    try:
        company_id = current_user["company_id"]
        report_id = await service.create_report(
            company_id=company_id,
            financial_year=financial_year
        )
        return {"reportId": report_id, "message": "Report created successfully"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/reports", response_model=List[EnvironmentReport])
async def get_company_reports(
    current_user: Dict = Depends(get_current_active_user),
    service: EnvironmentService = Depends(get_environment_service)
):
    """Get all environment reports for a company"""
    company_id = current_user["company_id"]
    return await service.get_company_reports(company_id)

@router.get("/reports/{financial_year}", response_model=Optional[EnvironmentReport])
async def get_report(
    financial_year: str,
    current_user: Dict = Depends(get_current_active_user),
    service: EnvironmentService = Depends(get_environment_service)
):
    """Get a specific environment report"""
    company_id = current_user["company_id"]
    report = await service.get_report(company_id, financial_year)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report

class AnswerUpdate(BaseModel):
    answer_data: Dict[str, Any]

@router.put("/reports/{financial_year}/answers/{question_id}")
async def update_answer(
    financial_year: str,
    question_id: str,
    update: AnswerUpdate,
    current_user: Dict = Depends(get_current_active_user),
    service: EnvironmentService = Depends(get_environment_service)
):
    """Update answer for a specific question"""
    company_id = current_user["company_id"]
    success = await service.update_answer(
        company_id=company_id,
        financial_year=financial_year,
        question_id=question_id,
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
    current_user: Dict = Depends(get_current_active_user),
    service: EnvironmentService = Depends(get_environment_service)
):
    """Add a comment to a specific question"""
    company_id = current_user["company_id"]
    success = await service.add_comment(
        company_id=company_id,
        financial_year=financial_year,
        question_id=question_id,
        comment=comment
    )
    if not success:
        raise HTTPException(status_code=404, detail="Question not found or update failed")
    return {"message": "Comment added successfully"}

class StatusUpdate(BaseModel):
    status: str

@router.put("/reports/{financial_year}/status")
async def update_status(
    financial_year: str,
    update: StatusUpdate,
    current_user: Dict = Depends(get_current_active_user),
    service: EnvironmentService = Depends(get_environment_service)
):
    """Update report status"""
    company_id = current_user["company_id"]
    success = await service.update_status(
        company_id=company_id,
        financial_year=financial_year,
        status=update.status
    )
    if not success:
        raise HTTPException(status_code=404, detail="Report not found or update failed")
    return {"message": "Status updated successfully"}

class BulkAnswerUpdate(BaseModel):
    answers: Dict[str, Dict[str, Any]]

@router.put("/reports/{financial_year}/bulk-answers")
async def bulk_update_answers(
    financial_year: str,
    update: BulkAnswerUpdate,
    current_user: Dict = Depends(get_current_active_user),
    service: EnvironmentService = Depends(get_environment_service)
):
    """Bulk update answers for multiple questions"""
    company_id = current_user["company_id"]
    success = await service.bulk_update_answers(
        company_id=company_id,
        financial_year=financial_year,
        answers=update.answers
    )
    if not success:
        raise HTTPException(status_code=404, detail="Update failed")
    return {"message": "Answers updated successfully"}
