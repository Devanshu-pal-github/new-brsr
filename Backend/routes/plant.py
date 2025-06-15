from fastapi import APIRouter, Depends, HTTPException, status, Query, Request, Body
from typing import List, Optional
from dependencies import get_database, get_current_user
from models.plant import PlantCreate, Plant, PlantUpdate, PlantWithCompany, PlantWithAnswers
from models.auth import User
from services.plant import PlantService
import uuid
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorDatabase


router = APIRouter(
    tags=["plants"],
    responses={404: {"description": "Not found"}},
)

def get_plant_service(db=Depends(get_database)):
    return PlantService(db)



@router.post("/create", response_model=Plant, status_code=status.HTTP_201_CREATED)
async def create_plant(
    plant: PlantCreate,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Create a new plant"""
    try:
        # Create plant dictionary
        plant_dict = {
            "id": str(uuid.uuid4()),
            "plant_code": plant.code,
            "plant_name": plant.name,
            "company_id": plant.company_id,
            "plant_type": plant.type.value,
            "access_level": "calc_modules_only",  # Default access level
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        # Basic validation
        if plant.code in ["C001", "P001"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Reserved plant codes (C001, P001) cannot be used"
            )
            
        # Insert plant into database
        await db.plants.insert_one(plant_dict)

        # Update company's plant_ids
        await db.companies.update_one(
            {"_id": plant.company_id},
            {
                "$push": {"plant_ids": plant_dict["id"]},
                "$set": {"updated_at": datetime.utcnow()}
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
    plant_service = Depends(get_plant_service)
):
    """Delete a plant and its associated answers"""
    try:
        deleted = await plant_service.delete_plant(plant_id)
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Plant with ID {plant_id} not found"
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
    Fetch all employees for a specific plant.
    
    Required body parameters:
    - plant_id: str
    
    The company_id is automatically fetched from the current user's context.
    """
    # Get the plant_id from request body and company_id from current user
    plant_id = plant_data.get("plant_id")
    company_id = current_user["company_id"]
    print(plant_id)
    print(company_id)
    
    if not plant_id:
        raise HTTPException(
            status_code=400,
            detail="plant_id is required in request body"
        )
    
    # Use the PlantService class to get employees
    plant_service = PlantService(db)
    employees = await plant_service.get_plant_employees_service(company_id, plant_id)
    
    return employees

