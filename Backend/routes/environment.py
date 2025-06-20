from typing import List, Dict, Optional, Any, Union
from fastapi import APIRouter, Depends, HTTPException, Query, status, Body
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorDatabase
from services.environment import EnvironmentService
from dependencies import get_database, get_current_active_user, check_company_access
from models.environment import EnvironmentReport, QuestionAnswer
from pydantic import BaseModel, Field
from services.auditServices import AuditService
from models.auditModel import ActionLog

router = APIRouter(
    prefix="/environment",
    tags=["environment"]
)

def get_environment_service(db: AsyncIOMotorDatabase = Depends(get_database)) -> EnvironmentService:
    return EnvironmentService(db)

def get_audit_service(db: AsyncIOMotorDatabase = Depends(get_database)) -> AuditService:
    return AuditService(db)

class ReportCreate(BaseModel):
    plant_id: str
    financial_year: str

class ReportQuery(BaseModel):
    plant_id: str
    financial_year: str = Field(description="Format: YYYY-YYYY (e.g., 2024-2025)")

@router.post("/reports/get", response_model=Optional[EnvironmentReport])
async def get_plant_report(
    report_query: ReportQuery,
    service: EnvironmentService = Depends(get_environment_service),
    user: Dict = Depends(get_current_active_user)
):
   
    

    """
    Get environment report for a specific plant and financial year.
    This endpoint is used when a user clicks on a plant card to view its report.
    
    Request Body:
    {
        "plant_id": "uuid-of-plant",
        "financial_year": "2024-2025"
    }
    
    The company_id is automatically taken from the authenticated user's token.
    If no report exists, returns 404.
    If report exists but has no answers, returns report with empty answers object.
    """
    if not user.get("company_id"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User does not have company access"
        )
        
    report = await service.get_report(
        company_id=user["company_id"],
        plant_id=report_query.plant_id,
        financial_year=report_query.financial_year
    )
    
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No report found for plant {report_query.plant_id} in financial year {report_query.financial_year}"
        )
    
    return report

@router.post("/reports", response_model=dict)
async def create_environment_report(
    report_data: ReportCreate,
    service: EnvironmentService = Depends(get_environment_service),
    user: Dict = Depends(get_current_active_user)
):
    """Create a new environment report"""
    if not user.get("company_id"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User does not have company access"
        )
        
    try:
        report_id = await service.create_report(
            company_id=user["company_id"],
            plant_id=report_data.plant_id,
            financial_year=report_data.financial_year
        )
        return {"reportId": report_id, "message": "Report created successfully"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

class PlantFilter(BaseModel):
    plant_id: Optional[str] = None
    financial_year: Optional[str] = None

@router.post("/reports/list", response_model=List[EnvironmentReport])
async def list_company_reports(
    filter: PlantFilter = Body(default=None),
    service: EnvironmentService = Depends(get_environment_service),
    user: Dict = Depends(get_current_active_user)
):
    
    """
    List all environment reports for the company.
    Can be filtered by plant_id and/or financial_year in request body.
    Company ID is automatically taken from the authenticated user's token.
    
    Request Body (optional):
    {
        "plant_id": "uuid-of-plant",
        "financial_year": "2024-2025"
    }
    """
    if not user.get("company_id"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User does not have company access"
        )
    
    return await service.get_company_reports(
        company_id=user["company_id"],
        plant_id=filter.plant_id if filter else None,
        financial_year=filter.financial_year if filter else None
    )

class AnswerUpdate(BaseModel):
    questionTitle: str
    answer_data: Dict[str, Any]
    plant_id: str
    financial_year: str

@router.put("/answers/{question_id}")
async def update_answer(
    question_id: str,
    update: AnswerUpdate,
    service: EnvironmentService = Depends(get_environment_service),
    user: Dict = Depends(get_current_active_user)
):
    """Update answer for a specific question"""
    if not user.get("company_id"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User does not have company access"
        )
        
    success = await service.update_answer(
        company_id=user["company_id"],
        plant_id=update.plant_id,
        financial_year=update.financial_year,
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
    plant_id: str
    financial_year: str

@router.post("/table-answer")
async def update_table_answer(
    update: TableAnswerUpdate,
    current_user: dict = Depends(get_current_active_user),
    service: EnvironmentService = Depends(get_environment_service),
    audit_service: AuditService = Depends(get_audit_service)
):
    """Update table answer for a specific question"""
    company_id = current_user["company_id"]
    
    # First check if the report exists
    report = await service.get_report(
        company_id=company_id,
        plant_id=update.plant_id,
        financial_year=update.financial_year
    )
    if not report:
        raise HTTPException(status_code=404, detail="Report not found. Please create a report first.")

    success = await service.update_table_answer(
        company_id=company_id,
        plant_id=update.plant_id,
        financial_year=update.financial_year,
        question_id=update.questionId,
        question_title=update.questionTitle,
        table_data=update.updatedData
    )
    if not success:
        raise HTTPException(status_code=404, detail="Failed to update table answer.")

    # Create audit log for table answer update
    action_log = ActionLog(
        action="Table Answer Updated",
        target_id=update.questionId,
        user_id=current_user["id"],
        user_role=current_user.get("role", [])[0],
        performed_at=datetime.utcnow(),
        details={
            "question_id": update.questionId,
            "question_title": update.questionTitle,
            "financial_year": update.financial_year,
            "plant_id": update.plant_id
        }
    )

    await audit_service.log_action(
        company_id=company_id,
        plant_id=update.plant_id,
        financial_year=update.financial_year,
        action_log=action_log
    )

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
    plant_id: str
    financial_year: str

@router.post("/subjective-answer")
async def update_subjective_answer(
    answer: SubjectiveAnswerCreate,
    service: EnvironmentService = Depends(get_environment_service),
    user: Dict = Depends(get_current_active_user),
    audit_service: AuditService = Depends(get_audit_service)
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
            plant_id=answer.plant_id,
            financial_year=answer.financial_year,
            question_id=answer.questionId,
            question_title=answer.questionTitle,
            answer_data={
                "type": "subjective",
                "text": answer.data.get("text", "")
            }
        )
        if success:
            # Create audit log for subjective answer update
            action_log = ActionLog(
                action="Subjective Answer Updated",
                target_id=answer.questionId,
                user_id=user["id"],
                user_role=user.get("role", [])[0],
                performed_at=datetime.utcnow(),
                details={
                    "question_id": answer.questionId,
                    "question_title": answer.questionTitle,
                    "financial_year": answer.financial_year,
                    "plant_id": answer.plant_id
                }
            )
            
            await audit_service.log_action(
                company_id=user["company_id"],
                plant_id=answer.plant_id,
                financial_year=answer.financial_year,
                action_log=action_log
            )

            return {"message": "Answer updated successfully"}
        raise HTTPException(status_code=400, detail="Failed to update answer")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

class AuditStatusUpdate(BaseModel):
    audit_status: bool = Field(description="Boolean flag indicating if the question has been audited")
    plant_id: str = Field(..., description="Plant ID")

@router.put("/reports/{financial_year}/audit-status/{question_id}")
async def update_audit_status(
    financial_year: str,
    question_id: str,
    update: AuditStatusUpdate,
    service: EnvironmentService = Depends(get_environment_service),
    user: Dict = Depends(get_current_active_user)
):
    """Update audit status for a specific question"""
    # Check if user has company access
    if not user.get("company_id"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User does not have company access"
        )
    success = await service.update_audit_status(
        company_id=user["company_id"],
        plant_id=update.plant_id,
        financial_year=financial_year,
        question_id=question_id,
        audit_status=update.audit_status
    )
    if not success:
        raise HTTPException(status_code=404, detail="Question not found or update failed")
    return {"message": "Audit status updated successfully"}

class AuditStatusQuery(BaseModel):
    plant_id: str = Field(..., description="Plant ID")

@router.get("/reports/{financial_year}/audit-status/{question_id}")
async def get_audit_status(
    financial_year: str,
    question_id: str,
    plant_id: str = Query(..., description="Plant ID"),
    service: EnvironmentService = Depends(get_environment_service),
    user: Dict = Depends(get_current_active_user)
):
    """Get audit status for a specific question, plant, and year"""
    if not user.get("company_id"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User does not have company access"
        )
    audit_status = await service.get_audit_status(
        company_id=user["company_id"],
        plant_id=plant_id,
        financial_year=financial_year,
        question_id=question_id
    )
    if audit_status is None:
        raise HTTPException(status_code=404, detail="No audit status available")
    return {"audit_status": audit_status}