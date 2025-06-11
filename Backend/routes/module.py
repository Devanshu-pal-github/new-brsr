from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from dependencies import DB
from models.module import ModuleCreate, Module, ModuleUpdate, ModuleWithDetails
from services.module import ModuleService

router = APIRouter(
    prefix="/modules",
    tags=["modules"],
    responses={404: {"description": "Not found"}},
)

def get_module_service(db):
    return ModuleService(db)

@router.post("/", response_model=Module, status_code=status.HTTP_201_CREATED)
async def create_module(
    module: ModuleCreate,
    module_service: ModuleService = Depends(get_module_service)
):
    """Create a new module"""
    try:
        return await module_service.create_module(module)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )

@router.get("/{module_id}", response_model=ModuleWithDetails)
async def get_module(
    module_id: str,
    include_report: bool = Query(True, description="Include report details in response"),
    module_service: ModuleService = Depends(get_module_service)
):
    """Get a specific module by ID"""
    module = await module_service.get_module(module_id, include_report)
    if not module:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Module with ID {module_id} not found"
        )
    return module

@router.get("/", response_model=List[Module])
async def list_modules(
    report_id: Optional[str] = Query(None, description="Filter modules by report ID"),
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1),
    module_service: ModuleService = Depends(get_module_service)
):
    """List all modules with optional report filtering and pagination"""
    return await module_service.list_modules(report_id=report_id, skip=skip, limit=limit)

@router.patch("/{module_id}", response_model=Module)
async def update_module(
    module_id: str,
    module_update: ModuleUpdate,
    module_service: ModuleService = Depends(get_module_service)
):
    """Update a module"""
    module = await module_service.update_module(module_id, module_update)
    if not module:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Module with ID {module_id} not found"
        )
    return module

@router.delete("/{module_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_module(
    module_id: str,
    module_service: ModuleService = Depends(get_module_service)
):
    """Delete a module"""
    deleted = await module_service.delete_module(module_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Module with ID {module_id} not found"
        )
    return None

@router.get("/report/{report_id}", response_model=List[Module])
async def get_modules_by_report(
    report_id: str,
    module_service: ModuleService = Depends(get_module_service)
):
    """Get all modules for a specific report"""
    return await module_service.list_modules(report_id=report_id) 