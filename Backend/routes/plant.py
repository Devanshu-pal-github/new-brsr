from fastapi import APIRouter, Depends, HTTPException, status, Query, Request, Body
from typing import List, Optional,Dict
from dependencies import get_database, get_current_active_user ,get_current_user
from models.plant import PlantCreate, Plant, PlantUpdate, PlantWithCompany, PlantWithAnswers
from models.auth import User, DeleteEmployeeRequest
from services.plant import PlantService
import uuid
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorDatabase
from services.auditServices import AuditService
from models.auditModel import ActionLog



router = APIRouter(
    tags=["plants"],
    responses={404: {"description": "Not found"}},
)

def get_plant_service(db=Depends(get_database)):
    return PlantService(db)

def get_audit_service(db=Depends(get_database)):
    return AuditService(db)



@router.post("/create", response_model=Plant, status_code=status.HTTP_201_CREATED)
async def create_plant(
    plant: PlantCreate,
    user: Dict = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
    audit_service: AuditService = Depends(get_audit_service)
):
    """Create a new plant and log audit"""
    try:
        now = datetime.utcnow()
        # Create plant dictionary
        plant_dict = {
            "id": str(uuid.uuid4()),
            "plant_code": plant.code,
            "plant_name": plant.name,
            "company_id": plant.company_id,
            "plant_type": plant.type.value,
            "access_level": "calc_modules_only",  # Default access level
            "address": plant.address,  # Add address field
            "contact_email": plant.contact_email,  # Add email field
            "contact_phone": plant.contact_phone,  # Add phone field
            "created_at": now,
            "updated_at": now
        }
        
        # Basic validation
        if plant.code in ["C001", "P001"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Reserved plant codes (C001, P001) cannot be used"
            )
            
        # Insert plant into database
        await db.plants.insert_one(plant_dict)

        # Initialize environment report for the new plant
        environment_report = {
            "id": str(uuid.uuid4()),
            "companyId": plant.company_id,
            "plantId": plant_dict["id"],
            "plant_type": plant.type.value,
            "financialYear": "2024-2025",
            "answers": {},  # Initialize with empty answers
            "status": "draft",
            "createdAt": now,
            "updatedAt": now,
            "version": 1
        }
        
        # Insert the environment report
        await db.environment.insert_one(environment_report)

        # Audit log
        action_log = ActionLog(
            action="Plant Created",
            target_id=plant_dict["id"],
            user_id=user["id"],
            user_role=user.get("role", [])[0],
            performed_at=now,
            details={
                "plant_name": plant_dict["plant_name"],
                "plant_code": plant_dict["plant_code"],
                "plant_type": plant_dict["plant_type"]
            }
        )
        plant_id = user["plant_id"] if user.get("role", [])[0] == "plant_admin" else None
        financial_year = user.get("financial_year")
        await audit_service.log_action(
            company_id=user["company_id"],
            plant_id=plant_id,
            financial_year=financial_year,
            action_log=action_log
        )

        # Update company's plant_ids
        await db.companies.update_one(
            {"_id": plant.company_id},
            {
                "$push": {"plant_ids": plant_dict["id"]},
                "$set": {"updated_at": now}
            }
        )

        return Plant(**plant_dict)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating plant: {str(e)}"
        )

@router.get("/{plant_id}", response_model=PlantWithAnswers)
async def get_plant(
    plant_id: str,
    include_company: bool = Query(True, description="Include company details"),
    include_answers: bool = Query(True, description="Include answer statistics"),
    plant_service = Depends(get_plant_service)
):
    """Get a specific plant by ID"""
    plant = await plant_service.get_plant(plant_id, include_company, include_answers)
    if not plant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Plant with ID {plant_id} not found"
        )
    return plant

@router.get("/", response_model=List[Plant])
async def list_plants(
    company_id: Optional[str] = Query(None, description="Filter plants by company ID"),
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1),
    plant_service = Depends(get_plant_service)
):
    """List all plants with optional filtering and pagination"""
    return await plant_service.list_plants(
        company_id=company_id,
        skip=skip,
        limit=limit
    )

@router.patch("/{plant_id}", response_model=Plant)
async def update_plant(
    plant_id: str,
    plant_update: PlantUpdate,
    plant_service = Depends(get_plant_service)
):
    """Update a plant"""
    try:
        plant = await plant_service.update_plant(plant_id, plant_update)
        if not plant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Plant with ID {plant_id} not found"
            )
        return plant
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.delete("/{plant_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_plant(
    plant_id: str,
    plant_service = Depends(get_plant_service),
    user: Dict = Depends(get_current_active_user),
    audit_service: AuditService = Depends(get_audit_service)
):
    """Delete a plant and its associated answers, with audit log"""
    try:
        deleted = await plant_service.delete_plant(plant_id)
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Plant with ID {plant_id} not found"
            )
        # Audit log
        action_log = ActionLog(
            action="Plant Deleted",
            target_id=plant_id,
            user_id=user["id"],
            user_role=user.get("role", [])[0],
            performed_at=datetime.utcnow(),
            details={
                "plant_id": plant_id
            }
        )
        await audit_service.log_action(
            company_id=user["company_id"],
            plant_id=plant_id,
            financial_year=None,
            action_log=action_log
        )
        return None
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/company/{company_id}", response_model=List[Plant])
async def get_company_plants(
    company_id: str,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    """
    Get all plants for a specific company
    Args:
        company_id: The ID of the company
        current_user: The current authenticated user
    Returns:
        List of Plant objects
    """
    try:
        plant_service = PlantService(db)
        plants = await plant_service.get_plants_by_company(company_id)
        return plants
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.post("/employees", response_model=List[User])
async def get_plant_employees(
    plant_data: dict = Body(...),
    current_user: User = Depends(get_current_user),
    db = Depends(get_database)
):
    """
    Fetch employees based on plant_id or company_id.
    
    Optional body parameters:
    - plant_id: str (if not provided, fetches all employees for the company)
    
    The company_id is automatically fetched from the current user's context.
    """
    # Get the plant_id from request body and company_id from current user
    plant_id = plant_data.get("plant_id")
    company_id = current_user["company_id"]
    print(f"Fetching employees - Plant ID: {plant_id}, Company ID: {company_id}")
    
    # Use the PlantService class to get employees
    plant_service = PlantService(db)
    
    # If plant_id is provided, get employees for that plant
    # Otherwise, get all employees for the company
    if plant_id:
        employees = await plant_service.get_plant_employees_service(company_id, plant_id)
    else:
        employees = await plant_service.get_company_employees_service(company_id)
    
    return employees

@router.delete("/employee/delete", status_code=status.HTTP_204_NO_CONTENT)
async def delete_employee_from_plant(
    payload: DeleteEmployeeRequest = Body(...),
    user: Dict = Depends(get_current_active_user),
    plant_service = Depends(get_plant_service),
    audit_service: AuditService = Depends(get_audit_service)
):
    """
    Delete an employee from a specific plant. The company_id is taken from the current user.
    The plant_id and employee_id are provided in the request body.
    """
    company_id = user["company_id"]
    plant_id = payload.plant_id
    employee_id = payload.employee_id
    deleted = await plant_service.delete_employee_from_plant(company_id, plant_id, employee_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Employee with ID {employee_id} not found in plant {plant_id}"
        )
    # Audit log
    
    action_log = ActionLog(
        action="Employee Deleted",
        target_id=employee_id,
        user_id=user["id"],
        user_role=user.get("role", [])[0],
        performed_at=datetime.utcnow(),
        details={
            "plant_id": plant_id,
            "employee_id": employee_id
        }
    )
    await audit_service.log_action(
        company_id=company_id,
        plant_id=plant_id,
        financial_year=None,
        action_log=action_log
    )
    return None


