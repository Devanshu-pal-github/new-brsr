from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from dependencies import DB
from models.plant import PlantCreate, Plant, PlantUpdate, PlantWithCompany, PlantWithAnswers
from services.plant import PlantService

router = APIRouter(
    prefix="/plants",
    tags=["plants"],
    responses={404: {"description": "Not found"}},
)

def get_plant_service(db):
    return PlantService(db)

@router.post("/", response_model=Plant, status_code=status.HTTP_201_CREATED)
async def create_plant(
    plant: PlantCreate,
    plant_service = Depends(get_plant_service)
):
    """Create a new plant"""
    try:
        return await plant_service.create_plant(plant)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
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