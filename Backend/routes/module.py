from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from typing import List, Optional, Dict
from dependencies import get_database, check_super_admin_access
from models.module import (
    ModuleCreate, Module, ModuleUpdate, ModuleWithDetails,
    SubModule, Category, ModuleType
)
from services.module import ModuleService
from motor.motor_asyncio import AsyncIOMotorDatabase

router = APIRouter(
    prefix="/modules",
    tags=["modules"],
    responses={
        404: {"description": "Not found"},
        400: {"description": "Bad request"},
        401: {"description": "Unauthorized"},
        403: {"description": "Forbidden - Super Admin access required"}
    },
)

def get_module_service(db: AsyncIOMotorDatabase = Depends(get_database)) -> ModuleService:
    return ModuleService(db)

@router.post("/", response_model=Module, status_code=status.HTTP_201_CREATED)
async def create_module(
    module: ModuleCreate,
    module_service: ModuleService = Depends(get_module_service),
    current_user: Dict = Depends(check_super_admin_access)
):
    """
    Create a new module
    
    - Only accessible by Super Admin
    - Module type must be either 'basic' or 'calc'
    - Supports hierarchical structure (Module → Sub-modules → Categories)
    """
    try:
        return await module_service.create_module(module)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/{module_id}", response_model=ModuleWithDetails)
async def get_module(
    module_id: str,
    include_details: bool = Query(True, description="Include detailed information in response"),
    module_service: ModuleService = Depends(get_module_service)
):
    """
    Get a specific module by ID
    
    - Returns module with its complete hierarchy
    - Includes detailed information if include_details=True
    - Includes question count and category details
    """
    try:
        module = await module_service.get_module(module_id, include_details)
        return module
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/", response_model=List[Module])
async def list_modules(
    module_type: Optional[ModuleType] = Query(None, description="Filter by module type (basic/calc)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(10, ge=1, le=100, description="Number of records to return"),
    module_service: ModuleService = Depends(get_module_service)
):
    """
    List all modules with filtering and pagination
    
    - Optional filtering by module_type (basic/calc)
    - Pagination support
    """
    return await module_service.list_modules(
        skip=skip,
        limit=limit,
        module_type=module_type
    )

@router.patch("/{module_id}", response_model=Module)
async def update_module(
    module_id: str,
    module_update: ModuleUpdate,
    module_service: ModuleService = Depends(get_module_service),
    current_user: Dict = Depends(check_super_admin_access)
):
    """
    Update a module
    
    - Only accessible by Super Admin
    - Can update module properties, submodules, and categories
    - Maintains module type constraints (basic/calc)
    - Preserves hierarchical structure
    """
    try:
        return await module_service.update_module(module_id, module_update)
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.delete("/{module_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_module(
    module_id: str,
    module_service: ModuleService = Depends(get_module_service),
    current_user: Dict = Depends(check_super_admin_access)
):
    """
    Delete a module
    
    - Only accessible by Super Admin
    - Checks for existing report associations before deletion
    - Cascading delete for related data
    """
    try:
        await module_service.delete_module(module_id)
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.post("/{module_id}/submodules", response_model=Module)
async def add_submodule(
    module_id: str,
    submodule: SubModule,
    module_service: ModuleService = Depends(get_module_service),
    current_user: Dict = Depends(check_super_admin_access)
):
    """
    Add a submodule to an existing module
    
    - Only accessible by Super Admin
    - Maintains hierarchical structure
    - Automatically generates UUIDs for new submodule and categories
    """
    try:
        return await module_service.add_sub_module(module_id, submodule)
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.post("/{module_id}/submodules/{submodule_id}/categories", response_model=Module)
async def add_category(
    module_id: str,
    submodule_id: str,
    category: Category,
    module_service: ModuleService = Depends(get_module_service),
    current_user: Dict = Depends(check_super_admin_access)
):
    """
    Add a category to a submodule
    
    - Only accessible by Super Admin
    - Maintains hierarchical structure
    - Automatically generates UUID for new category
    """
    try:
        return await module_service.add_category(module_id, submodule_id, category)
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/structure/{module_id}", response_model=dict)
async def get_module_structure(
    module_id: str,
    module_service: ModuleService = Depends(get_module_service)
):
    """
    Get complete module structure with all relationships
    
    - Returns detailed hierarchical structure
    - Includes metadata about submodules and categories
    - Includes relationships with other entities
    """
    try:
        return await module_service.get_module_structure(module_id)
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )