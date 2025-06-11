from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from dependencies import DB
from models.report import ReportCreate, Report, ReportUpdate
from services.report import ReportService

router = APIRouter(
    prefix="/reports",
    tags=["reports"],
    responses={404: {"description": "Not found"}},
)

def get_report_service(db = Depends()) -> ReportService:
    return ReportService(db)

@router.post("/", response_model=Report, status_code=status.HTTP_201_CREATED)
def create_report(
    report: ReportCreate,
    report_service: ReportService = Depends(get_report_service)
):
    """Create a new report"""
    return report_service.create_report(report)

@router.get("/{report_id}", response_model=Report)
def get_report(
    report_id: str,
    report_service: ReportService = Depends(get_report_service)
):
    """Get a specific report by ID"""
    report = report_service.get_report(report_id)
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Report with ID {report_id} not found"
        )
    return report

@router.get("/", response_model=List[Report])
def list_reports(
    skip: int = 0,
    limit: int = 10,
    report_service: ReportService = Depends(get_report_service)
):
    """List all reports with pagination"""
    return report_service.list_reports(skip=skip, limit=limit)

@router.patch("/{report_id}", response_model=Report)
def update_report(
    report_id: str,
    report_update: ReportUpdate,
    report_service: ReportService = Depends(get_report_service)
):
    """Update a report"""
    report = report_service.update_report(report_id, report_update)
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Report with ID {report_id} not found"
        )
    return report

@router.delete("/{report_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_report(
    report_id: str,
    report_service: ReportService = Depends(get_report_service)
):
    """Delete a report"""
    deleted = report_service.delete_report(report_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Report with ID {report_id} not found"
        )
    return None 