from typing import List, Dict, Optional, Any, Union
from fastapi import APIRouter, Depends, HTTPException, Query
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
    company_id: str = Query(..., description="Company ID"),
    service: EnvironmentService = Depends(get_environment_service)
):
    """Get all environment reports for a company"""
    return await service.get_company_reports(company_id)

@router.get("/reports/{financial_year}", response_model=Optional[EnvironmentReport])
async def get_report(
    financial_year: str,
    company_id: str = Query(..., description="Company ID"),
    service: EnvironmentService = Depends(get_environment_service)
):
    """Get a specific environment report"""
    report = await service.get_report(company_id, financial_year)
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
    company_id: str = Query(..., description="Company ID"),
    service: EnvironmentService = Depends(get_environment_service)
):
    """Update answer for a specific question"""
    success = await service.update_answer(
        company_id=company_id,
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
    company_id: str = Query(..., description="Company ID"),
    service: EnvironmentService = Depends(get_environment_service)
):
    print("financial_year:", financial_year)
    """Update table answer for a specific question"""
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