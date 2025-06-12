from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from dependencies import DB
from models.user_access import (
    UserAccessCreate, UserAccess, UserAccessUpdate, UserAccessWithDetails,
    UserAccessSummary, UserRole, Permission
)
from services.user_access import UserAccessService

router = APIRouter(
    tags=["user-access"],
    responses={404: {"description": "Not found"}},
)

def get_user_access_service(db):
    return UserAccessService(db)

@router.post("/", response_model=UserAccess, status_code=status.HTTP_201_CREATED)
async def create_user_access(
    user_access: UserAccessCreate,
    user_access_service = Depends(get_user_access_service)
):
    """Create a new user access record"""
    try:
        return await user_access_service.create_user_access(user_access)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/{access_id}", response_model=UserAccessWithDetails)
async def get_user_access(
    access_id: str,
    include_details: bool = Query(True, description="Include company and plant details"),
    user_access_service = Depends(get_user_access_service)
):
    """Get a specific user access record by ID"""
    access = await user_access_service.get_user_access(access_id, include_details)
    if not access:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User access with ID {access_id} not found"
        )
    return access

@router.get("/summary/{user_id}", response_model=UserAccessSummary)
async def get_user_access_summary(
    user_id: str,
    user_access_service = Depends(get_user_access_service)
):
    """Get a summary of all access records for a user"""
    return await user_access_service.get_user_access_summary(user_id)

@router.get("/", response_model=List[UserAccess])
async def list_user_access(
    user_id: Optional[str] = Query(None, description="Filter by user ID"),
    company_id: Optional[str] = Query(None, description="Filter by company ID"),
    plant_id: Optional[str] = Query(None, description="Filter by plant ID"),
    role: Optional[UserRole] = Query(None, description="Filter by role"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1),
    user_access_service = Depends(get_user_access_service)
):
    """List all user access records with optional filtering and pagination"""
    return await user_access_service.list_user_access(
        user_id=user_id,
        company_id=company_id,
        plant_id=plant_id,
        role=role,
        is_active=is_active,
        skip=skip,
        limit=limit
    )

@router.patch("/{access_id}", response_model=UserAccess)
async def update_user_access(
    access_id: str,
    access_update: UserAccessUpdate,
    user_access_service = Depends(get_user_access_service)
):
    """Update a user access record"""
    try:
        access = await user_access_service.update_user_access(access_id, access_update)
        if not access:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"User access with ID {access_id} not found"
            )
        return access
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.delete("/{access_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user_access(
    access_id: str,
    user_access_service = Depends(get_user_access_service)
):
    """Delete a user access record"""
    deleted = await user_access_service.delete_user_access(access_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User access with ID {access_id} not found"
        )
    return None

@router.get("/check-permission/{user_id}", response_model=bool)
async def check_user_permission(
    user_id: str,
    company_id: str = Query(..., description="Company ID to check permission for"),
    permission: Permission = Query(..., description="Permission to check"),
    plant_id: Optional[str] = Query(None, description="Plant ID to check permission for"),
    user_access_service = Depends(get_user_access_service)
):
    """Check if a user has a specific permission"""
    return await user_access_service.check_user_permission(
        user_id=user_id,
        company_id=company_id,
        permission=permission,
        plant_id=plant_id
    )