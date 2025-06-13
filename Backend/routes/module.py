from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from typing import List, Optional, Dict
from dependencies import get_database, check_super_admin_access
from models.module import (
    ModuleCreate, Module, ModuleUpdate, ModuleWithDetails,
    SubModule, Category, ModuleType
)
from models.question import QuestionCreate, Question
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
        
@router.get("/{module_id}/json", response_model=Dict)
async def get_module_json(
    module_id: str,
    module_service: ModuleService = Depends(get_module_service)
):
    """
    Get a specific module by ID in JSON structure format
    
    - Returns module in hierarchical JSON structure with module at the top level
    - Contains submodules, categories, and question IDs in a nested structure
    """
    try:
        return await module_service.get_module_json_structure(module_id)
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
    
@router.get("/json", response_model=List[Dict])
async def list_modules_json(
    module_type: Optional[ModuleType] = Query(None, description="Filter by module type (basic/calc)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(10, ge=1, le=100, description="Number of records to return"),
    module_service: ModuleService = Depends(get_module_service)
):
    """
    List all modules in JSON structure format with filtering and pagination
    
    - Returns modules in hierarchical JSON structure
    - Optional filtering by module_type (basic/calc)
    - Pagination support
    """
    return await module_service.list_modules_json_structure(
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
    - Removes all submodules and categories
    - Fails if module is referenced in reports
    """
    try:
        deleted = await module_service.delete_module(module_id)
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Module not found"
            )
        return None
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
        
@router.post("/{module_id}/submodules/{submodule_id}/categories/{category_id}/questions/{question_id}", status_code=status.HTTP_200_OK)
async def add_question_id_to_category(
    module_id: str,
    submodule_id: str,
    category_id: str,
    question_id: str,
    current_user: Dict = Depends(check_super_admin_access),
    module_service: ModuleService = Depends(get_module_service)
):
    """
    Add an existing question ID to a category within a module's submodule
    
    - Only accessible by Super Admin
    """
    
    result = await module_service.add_question_id_to_category(
        module_id, submodule_id, category_id, question_id
    )
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Module, submodule, or category not found"
        )
    
    return {"success": True}

@router.post("/{module_id}/submodules/{submodule_id}/categories/{category_id}/questions", response_model=Question)
async def add_question_to_category(
    module_id: str,
    submodule_id: str,
    category_id: str,
    question_data: QuestionCreate,
    current_user: Dict = Depends(check_super_admin_access),
    module_service: ModuleService = Depends(get_module_service)
):
    """
    Add a new question to a category with human-readable ID
    
    Creates a new question with both UUID and human-readable ID in the format {category_id[:4]}-Q{question_number:03d}
    and adds it to the specified category.
    
    - Only accessible by Super Admin
    """
    
    try:
        result = await module_service.add_question_to_category(
            module_id, submodule_id, category_id, question_data
        )
        return result
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to add question: {str(e)}"
        )
        
@router.post("/{module_id}/submodules/{submodule_id}/categories/{category_id}/bulk-questions", status_code=status.HTTP_200_OK)
async def add_bulk_questions_to_category(
    module_id: str,
    submodule_id: str,
    category_id: str,
    question_ids: List[str] = Body(..., description="List of question IDs to add to the category"),
    module_service: ModuleService = Depends(get_module_service),
    current_user: Dict = Depends(check_super_admin_access)
):
    """
    Add multiple questions to a category within a module's submodule in a single operation
    
    - Only accessible by Super Admin
    - Updates the JSON structure of the module
    - More efficient than adding questions one by one
    - Returns success status
    """
    try:
        success = await module_service.add_bulk_questions_to_category(
            module_id, submodule_id, category_id, question_ids
        )
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Module, submodule, or category not found"
            )
        return {"status": "success", "message": "Questions added to category successfully"}
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
    Add a new submodule to an existing module
    
    - Only accessible by Super Admin
    - Maintains hierarchical structure
    - Automatically generates UUID for the new submodule
    """
    try:
        result = await module_service.add_sub_module(module_id, submodule)
        return result
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.post("/{module_id}/submodule", response_model=Module)
async def add_single_submodule_direct(
    module_id: str,
    submodule: SubModule,
    module_service: ModuleService = Depends(get_module_service),
    current_user: Dict = Depends(check_super_admin_access)
):
    """
    Add a single submodule directly to a module
    
    - Only accessible by Super Admin
    - Maintains hierarchical structure
    - Automatically generates UUID for the new submodule
    """
    try:
        result = await module_service.add_sub_module(module_id, submodule)
        return result
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to add submodule: {str(e)}"
        )
        
@router.post("/{module_id}/bulk-submodules", response_model=Module)
async def add_bulk_submodules(
    module_id: str,
    submodules: List[SubModule],
    module_service: ModuleService = Depends(get_module_service),
    current_user: Dict = Depends(check_super_admin_access)
):
    """
    Add multiple submodules to an existing module in a single operation
    
    - Only accessible by Super Admin
    - Maintains hierarchical structure
    - Automatically generates UUIDs for new submodules and their categories
    - More efficient than adding submodules one by one
    """
    try:
        return await module_service.add_bulk_submodules(module_id, submodules)
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.post("/{module_id}/bulk-submodules", response_model=Module)
async def add_bulk_submodules_direct(
    module_id: str,
    submodules: List[SubModule] = Body(...),
    module_service: ModuleService = Depends(get_module_service),
    current_user: Dict = Depends(check_super_admin_access)
):
    """
    Add multiple submodules directly to a module in a single operation
    
    - Only accessible by Super Admin
    - Maintains hierarchical structure
    - Automatically generates UUIDs for new submodules
    - More efficient than adding submodules one by one
    - Submodules are provided in the request body
    """
    try:
        result = await module_service.add_bulk_submodules(module_id, submodules)
        return result
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to add bulk submodules: {str(e)}"
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
    Add a category to a submodule within a module
    
    - Only accessible by Super Admin
    - Maintains hierarchical structure
    - Automatically generates UUID for the new category
    """
    try:
        result = await module_service.add_category(module_id, submodule_id, category)
        return result
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.post("/{module_id}/submodules/{submodule_id}/category", response_model=Module)
async def add_single_category_to_submodule(
    module_id: str,
    submodule_id: str,
    category: Category,
    module_service: ModuleService = Depends(get_module_service),
    current_user: Dict = Depends(check_super_admin_access)
):
    """
    Add a single category to a specific submodule within a module
    
    - Only accessible by Super Admin
    - Maintains hierarchical structure (module -> submodule -> category)
    - Automatically generates UUID for the new category
    """
    try:
        result = await module_service.add_category(module_id, submodule_id, category)
        return result
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to add category to submodule: {str(e)}"
        )
        
@router.post("/{module_id}/submodules/{submodule_id}/bulk-categories", response_model=Module)
async def add_bulk_categories(
    module_id: str,
    submodule_id: str,
    categories: List[Category],
    module_service: ModuleService = Depends(get_module_service),
    current_user: Dict = Depends(check_super_admin_access)
):
    """
    Add multiple categories to a submodule in a single operation
    
    - Only accessible by Super Admin
    - Maintains hierarchical structure
    - Automatically generates UUIDs for new categories
    - More efficient than adding categories one by one
    """
    try:
        result = await module_service.add_bulk_categories(module_id, submodule_id, categories)
        return result
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.post("/{module_id}/submodules/{submodule_id}/bulk-categories", response_model=Module)
async def add_bulk_categories_to_submodule(
    module_id: str,
    submodule_id: str,
    categories: List[Category] = Body(...),
    module_service: ModuleService = Depends(get_module_service),
    current_user: Dict = Depends(check_super_admin_access)
):
    """
    Add multiple categories to a specific submodule within a module in a single operation
    
    - Only accessible by Super Admin
    - Maintains hierarchical structure (module -> submodule -> categories)
    - Automatically generates UUIDs for new categories
    - More efficient than adding categories one by one
    - Categories are provided in the request body
    """
    try:
        result = await module_service.add_bulk_categories(module_id, submodule_id, categories)
        return result
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to add bulk categories to submodule: {str(e)}"
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

@router.post("/{module_id}/categories/{category_id}/questions", status_code=status.HTTP_201_CREATED)
async def add_question_to_category_direct(
    module_id: str,
    category_id: str,
    question_data: QuestionCreate = Body(...),
    module_service: ModuleService = Depends(get_module_service),
    current_user: Dict = Depends(check_super_admin_access)
):
    """
    Add a single question to a category
    
    - Only accessible by Super Admin
    - Creates a question with both UUID and human-readable ID
    - Human-readable ID follows the format: {category_id[:4]}-Q{question_number:03d}
    - Adds the question to the category and updates the module structure
    """
    try:
        return await module_service.create_temp_question(category_id, question_data)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
        
@router.post("/{module_id}/categories/{category_id}/bulk-questions", status_code=status.HTTP_201_CREATED)
async def add_bulk_questions_to_category_direct(
    module_id: str,
    category_id: str,
    questions: List[QuestionCreate] = Body(...),
    module_service: ModuleService = Depends(get_module_service),
    current_user: Dict = Depends(check_super_admin_access)
):
    """Add multiple questions to a category in a single operation
    
    - Only accessible by Super Admin
    - Creates questions with both UUID and human-readable IDs
    - Human-readable IDs follow the format: {category_id[:4]}-Q{question_number:03d}
    - Adds all questions to the category in a single database operation
    - More efficient than adding questions one by one
    """
    try:
        created_questions = await module_service.add_bulk_questions_to_category(category_id, questions)
        return {
            "status": "success",
            "message": f"Created {len(created_questions)} questions successfully",
            "questions": created_questions
        }
    except HTTPException as e:
        raise e
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
        
# Endpoint for adding a category directly to a module has been removed as per requirements
# Users should use the hierarchical approach with submodules instead
        
