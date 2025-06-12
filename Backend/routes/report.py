from fastapi import APIRouter, Depends, HTTPException, status, Body, Query
from typing import List, Optional
from datetime import datetime

from dependencies import check_super_admin_access, get_database, get_current_active_user
from models.report import ReportCreate, Report, ReportUpdate, ReportSummary, ModuleAssignment
from models.report import REPORT_STATUS_ACTIVE, REPORT_STATUS_INACTIVE, REPORT_STATUS_ARCHIVED
from services.report import ReportService

router = APIRouter(
    prefix="/reports",
    tags=["reports"],
    responses={404: {"description": "Not found"}},
)

def get_report_service(db = Depends(get_database)):
    return ReportService(db)

@router.post("", response_model=Report, status_code=status.HTTP_201_CREATED)
async def create_report(
    report: ReportCreate,
    current_user = Depends(check_super_admin_access),
    report_service: ReportService = Depends(get_report_service)
):
    """Create a new report"""
    return await report_service.create_report(report)

@router.get("/{report_id}", response_model=Report)
async def get_report(
    report_id: str,
    current_user = Depends(get_current_active_user),
    report_service: ReportService = Depends(get_report_service)
):
    """Get a specific report by ID"""
    report = await report_service.get_report(report_id)
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Report with ID {report_id} not found"
        )
    return report

@router.get("/", response_model=List[Report])
async def list_reports(
    skip: int = 0,
    limit: int = 10,
    status: Optional[str] = Query(None, description="Filter reports by status (active, inactive, archived)"),
    current_user = Depends(get_current_active_user),
    report_service: ReportService = Depends(get_report_service)
):
    """List all reports with pagination and optional status filtering"""
    return await report_service.list_reports(skip=skip, limit=limit, status=status)

@router.patch("/{report_id}", response_model=Report)
async def update_report(
    report_id: str,
    report_update: ReportUpdate,
    current_user = Depends(check_super_admin_access),
    report_service: ReportService = Depends(get_report_service)
):
    """Update a report"""
    report = await report_service.update_report(report_id, report_update)
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Report with ID {report_id} not found"
        )
    return report

@router.delete("/{report_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_report(
    report_id: str,
    current_user = Depends(check_super_admin_access),
    report_service: ReportService = Depends(get_report_service)
):
    """Delete a report"""
    deleted = await report_service.delete_report(report_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Report with ID {report_id} not found"
        )
    return None

@router.patch("/{report_id}/status", response_model=Report)
async def change_report_status(
    report_id: str,
    new_status: str = Query(..., description="New status for the report (active, inactive, archived)"),
    current_user = Depends(check_super_admin_access),
    report_service: ReportService = Depends(get_report_service)
):
    """Change the status of a report"""
    if new_status not in [REPORT_STATUS_ACTIVE, REPORT_STATUS_INACTIVE, REPORT_STATUS_ARCHIVED]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status: {new_status}. Must be one of: active, inactive, archived"
        )
    
    report = await report_service.change_report_status(report_id, new_status)
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Report with ID {report_id} not found"
        )
    return report

@router.patch("/{report_id}/assign-modules", response_model=Report)
async def assign_modules_to_report_api(
    report_id: str,
    modules: List[ModuleAssignment] = Body(..., description="List of modules with IDs and types to assign"),
    current_user = Depends(check_super_admin_access),
    report_service: ReportService = Depends(get_report_service)
):
    """Assign modules to a report with explicit module types"""
    report = await report_service.assign_modules_to_report_with_types(report_id, modules)
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Report with ID {report_id} not found"
        )
    return report

@router.get("/{report_id}/summary", response_model=ReportSummary)
async def get_report_summary(
    report_id: str,
    current_user = Depends(get_current_active_user),
    report_service: ReportService = Depends(get_report_service)
):
    """Get a summary of a report including usage statistics"""
    summary = await report_service.get_report_summary(report_id)
    if not summary:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Report with ID {report_id} not found"
        )
    return summary