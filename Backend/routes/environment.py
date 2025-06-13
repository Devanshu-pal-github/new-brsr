from typing import List, Dict, Optional, Any
from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorDatabase
from services.environment import EnvironmentService
from dependencies import get_database
from models.environment import EnvironmentReport, QuestionAnswer
from pydantic import BaseModel

router = APIRouter(
    prefix="/environment",
    tags=["environment"]
)

def get_environment_service(db: AsyncIOMotorDatabase = Depends(get_database)) -> EnvironmentService:
    return EnvironmentService(db)

@router.post("/reports/{company_id}/{financial_year}", response_model=dict)
async def create_environment_report(
    company_id: str,
    financial_year: str,
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

@router.get("/reports/{company_id}", response_model=List[EnvironmentReport])
async def get_company_reports(
    company_id: str,
    service: EnvironmentService = Depends(get_environment_service)
):
    """Get all environment reports for a company"""
    return await service.get_company_reports(company_id)

@router.get("/reports/{company_id}/{financial_year}", response_model=Optional[EnvironmentReport])
async def get_report(
    company_id: str,
    financial_year: str,
    service: EnvironmentService = Depends(get_environment_service)
):
    """Get a specific environment report"""
    report = await service.get_report(company_id, financial_year)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report

class AnswerUpdate(BaseModel):
    answer_data: Dict[str, Any]

@router.put("/reports/{company_id}/{financial_year}/answers/{question_id}")
async def update_answer(
    company_id: str,
    financial_year: str,
    question_id: str,
    update: AnswerUpdate,
    service: EnvironmentService = Depends(get_environment_service)
):
    """Update answer for a specific question"""
    success = await service.update_answer(
        company_id=company_id,
        financial_year=financial_year,
        question_id=question_id,
        answer_data=update.answer_data
    )
    if not success:
        raise HTTPException(status_code=404, detail="Question not found or update failed")
    return {"message": "Answer updated successfully"}

@router.post("/reports/{company_id}/{financial_year}/comments/{question_id}")
async def add_comment(
    company_id: str,
    financial_year: str,
    question_id: str,
    comment: Dict[str, Any],
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
        raise HTTPException(status_code=404, detail="Question not found or update failed")
    return {"message": "Comment added successfully"}

class StatusUpdate(BaseModel):
    status: str

@router.put("/reports/{company_id}/{financial_year}/status")
async def update_status(
    company_id: str,
    financial_year: str,
    update: StatusUpdate,
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
    answers: Dict[str, Dict[str, Any]]

@router.put("/reports/{company_id}/{financial_year}/bulk-answers")
async def bulk_update_answers(
    company_id: str,
    financial_year: str,
    update: BulkAnswerUpdate,
    service: EnvironmentService = Depends(get_environment_service)
):
    """Bulk update answers for multiple questions"""
    success = await service.bulk_update_answers(
        company_id=company_id,
        financial_year=financial_year,
        answers=update.answers
    )
    if not success:
        raise HTTPException(status_code=404, detail="Update failed")
    return {"message": "Answers updated successfully"}
