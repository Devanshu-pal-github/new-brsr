from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
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
    data: Dict = Body(..., description="Request body containing financial_year and optional modules"),
    company_service: CompanyService = Depends(get_company_service),
    current_user: Dict = Depends(check_super_admin_access)
):
    """Add a report to a company's active reports"""
    try:
        # Extract financial_year and modules from the request body
        financial_year = data.get("financial_year")
        modules = data.get("modules", [])
        
        if not financial_year or not isinstance(financial_year, str):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="financial_year must be a valid string"
            )
            
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

@router.post("/{company_id}/assign-user", status_code=status.HTTP_201_CREATED)
async def assign_user_to_company(
    company_id: str,
    data: Dict = Body(..., description="Request body containing user_id and optional role"),
    company_service: CompanyService = Depends(get_company_service),
    db = Depends(get_database),
    current_user: Dict = Depends(check_super_admin_access)
):
    """Assign a user to a company with a specific role
    
    This endpoint creates a new user access record that assigns a user to a company
    with a specific role (company_admin, plant_admin, or user). The role determines
    which modules the user will have access to.
    """
    from services.user_access import UserAccessService
    from models.user_access import UserAccessCreate, UserRole, Permission, AccessScope
    
    # Extract user_id and role from request body
    user_id = data.get("user_id")
    role = data.get("role", "user")  # Default to regular user if not specified
    
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="user_id is required"
        )
    
    # Validate role
    valid_roles = [r.value for r in UserRole]
    if role not in valid_roles:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Role must be one of: {', '.join(valid_roles)}"
        )
    
    # Check if company exists
    company = await company_service.get_company(company_id)
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Company with ID {company_id} not found"
        )
    
    # Check if user exists
    user = await db.users.find_one({"_id": user_id})
    if not user:
        # Try to find by id field if not found by _id
        user = await db.users.find_one({"id": user_id})
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"User with ID {user_id} not found"
            )
    
    # Create user access service
    user_access_service = UserAccessService(db)
    
    # Determine access level based on role
    access_level = Permission.READ
    if role == UserRole.SUPER_ADMIN.value or role == UserRole.COMPANY_ADMIN.value:
        access_level = Permission.APPROVE
    elif role == UserRole.PLANT_ADMIN.value:
        access_level = Permission.VALIDATE
    
    # Create user access record
    try:
        user_access = UserAccessCreate(
            user_id=user_id,
            company_id=company_id,
            role=role,
            access_level=access_level,
            scope=AccessScope.COMPANY
        )
        
        # Create the user access record
        result = await user_access_service.create_user_access(user_access)
        
        # Update user's company_id in the users collection
        # For company_admin, set company_id but leave plant_id as null
        # For plant_admin, set both company_id and plant_id (using first plant if available)
        update_fields = {"company_id": company_id}
        
        # If role is plant_admin, assign to the first plant in the company
        if role == UserRole.PLANT_ADMIN.value and company.plant_ids and len(company.plant_ids) > 0:
            update_fields["plant_id"] = company.plant_ids[0]
        
        # Update the user document with company_id and plant_id
        await db.users.update_one(
            {"_id": user_id},
            {"$set": update_fields}
        )
        
        # If company has active reports with modules, assign appropriate modules to the user
        if company.active_reports:
            for report in company.active_reports:
                if "assigned_modules" in report and report["assigned_modules"]:
                    # For company admins, assign all modules
                    if role == UserRole.COMPANY_ADMIN.value:
                        basic_modules = report["assigned_modules"].get("basic_modules", [])
                        calc_modules = report["assigned_modules"].get("calc_modules", [])
                        
                        # Update user's access_modules in the users collection
                        all_modules = basic_modules + calc_modules
                        if all_modules:
                            await db.users.update_one(
                                {"_id": user_id},
                                {"$addToSet": {"access_modules": {"$each": all_modules}}}
                            )
                    
                    # For plant admins, assign only calc modules
                    elif role == UserRole.PLANT_ADMIN.value:
                        calc_modules = report["assigned_modules"].get("calc_modules", [])
                        
                        # Update user's access_modules in the users collection
                        if calc_modules:
                            await db.users.update_one(
                                {"_id": user_id},
                                {"$addToSet": {"access_modules": {"$each": calc_modules}}}
                            )
        
        return {"message": f"User {user_id} assigned to company {company_id} with role {role}", "user_access_id": result.id}
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )