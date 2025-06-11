from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List
from dependencies import DB
from models.company import CompanyCreate, Company, CompanyUpdate, CompanyWithPlants
from services.company import CompanyService

router = APIRouter(
    prefix="/companies",
    tags=["companies"],
    responses={404: {"description": "Not found"}},
)

def get_company_service(db):
    return CompanyService(db)

@router.post("/", response_model=Company, status_code=status.HTTP_201_CREATED)
async def create_company(
    company: CompanyCreate,
    company_service: CompanyService = Depends(get_company_service)
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
    company_service: CompanyService = Depends(get_company_service)
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
    company_service: CompanyService = Depends(get_company_service)
):
    """Delete a company and its associated plants"""
    deleted = await company_service.delete_company(company_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Company with ID {company_id} not found"
        )
    return None

# @router.post("/{company_id}/reports/{report_id}", response_model=Company)
# async def add_report_to_company(
#     company_id: str,
#     report_id: str,
#     company_service: CompanyService = Depends(get_company_service)
# ):
#     """Add a report to a company's active reports"""
#     try:
#         company = await company_service.add_report_to_company(company_id, report_id)
#         if not company:
#             raise HTTPException(
#                 status_code=status.HTTP_404_NOT_FOUND,
#                 detail=f"Company with ID {company_id} not found"
#             )
#         return company
#     except ValueError as e:
#         raise HTTPException(
#             status_code=status.HTTP_404_NOT_FOUND,
#             detail=str(e)
#         )

# @router.delete("/{company_id}/reports/{report_id}", response_model=Company)
# async def remove_report_from_company(
#     company_id: str,
#     report_id: str,
#     company_service: CompanyService = Depends(get_company_service)
# ):
#     """Remove a report from a company's active reports"""
#     company = await company_service.remove_report_from_company(company_id, report_id)
#     if not company:
#         raise HTTPException(
#             status_code=status.HTTP_404_NOT_FOUND,
#             detail=f"Company with ID {company_id} not found"
#         )
#     return company 