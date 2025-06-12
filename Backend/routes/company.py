from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Dict
from dependencies import DB, check_super_admin_access
from models.company import CompanyCreate, Company, CompanyUpdate, CompanyWithPlants
from models.module import ModuleWithDetails
from services.company import CompanyService
from services.module import ModuleService
from services.report import ReportService

router = APIRouter(
    prefix="/companies",
    tags=["companies"],
    responses={404: {"description": "Not found"}},
)

from dependencies import get_database

def get_company_service(db = Depends(get_database)):
    return CompanyService(db)

def get_module_service(db = Depends(get_database)):
    return ModuleService(db)

@router.post("", response_model=Company, status_code=status.HTTP_201_CREATED)
async def create_company(
    company: CompanyCreate,
    company_service: CompanyService = Depends(get_company_service),
    current_user: Dict = Depends(check_super_admin_access)
):
    """Create a new company with default plants"""
    try:
        return await company_service.create_company(company)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )

@router.get("/{company_id}", response_model=CompanyWithPlants)
async def get_company(
    company_id: str,
    include_reports: bool = Query(True, description="Include active reports details"),
    include_plants: bool = Query(False, description="Include plants details"),
    company_service: CompanyService = Depends(get_company_service)
):
    """Get a specific company by ID"""
    company = await company_service.get_company(company_id)
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Company with ID {company_id} not found"
        )
    return company

@router.get("/", response_model=List[Company])
async def list_companies(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1),
    company_service: CompanyService = Depends(get_company_service)
):
    """List all companies with pagination"""
    return await company_service.list_companies(skip=skip, limit=limit)

@router.patch("/{company_id}", response_model=Company)
async def update_company(
    company_id: str,
    company_update: CompanyUpdate,
    company_service: CompanyService = Depends(get_company_service),
    current_user: Dict = Depends(check_super_admin_access)
):
    """Update a company"""
    try:
        company = await company_service.update_company(company_id, company_update)
        if not company:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Company with ID {company_id} not found"
            )
        return company
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )

@router.delete("/{company_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_company(
    company_id: str,
    company_service: CompanyService = Depends(get_company_service),
    current_user: Dict = Depends(check_super_admin_access)
):
    """Delete a company and its associated plants"""
    deleted = await company_service.delete_company(company_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Company with ID {company_id} not found"
        )
    return None

@router.get("/{company_id}/reports/{report_id}/modules", response_model=List[ModuleWithDetails])
async def get_report_modules(
    company_id: str,
    report_id: str,
    company_service: CompanyService = Depends(get_company_service),
    module_service: ModuleService = Depends(get_module_service)
):
    """Get all module details for a specific report assigned to a company"""
    company = await company_service.get_company(company_id)
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Company with ID {company_id} not found"
        )

    active_report = None
    for r in company.active_reports:
        if r.get("report_id") == report_id:
            active_report = r
            break

    if not active_report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Report with ID {report_id} not found for company {company_id}"
        )

    assigned_modules_from_company = active_report.get("assigned_modules")
    all_module_ids = []

    # If assigned_modules in company's active_reports is empty, fetch from report definition
    if not assigned_modules_from_company or \
       (not assigned_modules_from_company.get("basic_modules") and \
        not assigned_modules_from_company.get("calc_modules")):
        
        # Fetch the report definition to get its default modules
        report_service = ReportService(company_service.db) # Re-initialize ReportService with the same db
        report_doc = await report_service.get_report(report_id)
        
        if report_doc:
            if report_doc and report_doc.module_ids:
                all_module_ids.extend(report_doc.module_ids)
            if report_doc and report_doc.basic_modules:
                all_module_ids.extend(report_doc.basic_modules)
            if report_doc and report_doc.calc_modules:
                all_module_ids.extend(report_doc.calc_modules)
    else:
        if "basic_modules" in assigned_modules_from_company:
            all_module_ids.extend(assigned_modules_from_company["basic_modules"])
        if "calc_modules" in assigned_modules_from_company:
            all_module_ids.extend(assigned_modules_from_company["calc_modules"])

    module_details = []
    for module_id in all_module_ids:
        try:
            module = await module_service.get_module(module_id, include_details=True)
            if module:
                module_details.append(module)
        except HTTPException as e:
            # Log the error but don't block the entire response for one missing module
            print(f"Warning: Could not retrieve details for module {module_id}: {e.detail}")
        except Exception as e:
            print(f"Warning: An unexpected error occurred for module {module_id}: {e}")

    return module_details

@router.post("/{company_id}/reports/{report_id}", response_model=Company)
async def add_report_to_company(
    company_id: str,
    report_id: str,
    financial_year: str = Query(..., description="Financial year for the report (e.g., '2023-2024')"),
    modules: List[str] = Query([], description="List of module IDs to assign"),
    company_service: CompanyService = Depends(get_company_service),
    current_user: Dict = Depends(check_super_admin_access)
):
    """Add a report to a company's active reports"""
    try:
        company = await company_service.assign_report(company_id, report_id, financial_year, modules)
        if not company:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Company with ID {company_id} not found"
            )
        return company
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.delete("/{company_id}/reports/{report_id}", response_model=Company)
async def remove_report_from_company(
    company_id: str,
    report_id: str,
    company_service: CompanyService = Depends(get_company_service),
    current_user: Dict = Depends(check_super_admin_access)
):
    """Remove a report from a company's active reports"""
    try:
        company = await company_service.remove_report(company_id, report_id)
        if not company:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Company with ID {company_id} not found"
            )
        return company
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )