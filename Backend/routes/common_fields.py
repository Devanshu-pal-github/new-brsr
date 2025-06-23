from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from models.common_fields import CommonFields
from dependencies import get_database, get_current_active_user
from motor.motor_asyncio import AsyncIOMotorDatabase
from services.common_fields_service import (
    get_common_fields,
    create_common_fields,
    update_common_fields,
    delete_common_fields
)

router = APIRouter(prefix="/commonFields", tags=["Common Fields"])

def get_common_fields_service(db: AsyncIOMotorDatabase = Depends(get_database)):
    return db

@router.get("", response_model=List[CommonFields])
async def read_common_fields(
    plant_id: Optional[str] = None,
    financial_year: Optional[str] = None,
    db: AsyncIOMotorDatabase = Depends(get_common_fields_service),
    user: dict = Depends(get_current_active_user)
):
    try:
        return await get_common_fields(db, user["company_id"], plant_id, financial_year)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("", response_model=CommonFields, status_code=status.HTTP_201_CREATED)
async def add_common_fields(
    fields: CommonFields,
    db: AsyncIOMotorDatabase = Depends(get_common_fields_service),
    user: dict = Depends(get_current_active_user)
):
    
    try:
        return await create_common_fields(fields, db, user["company_id"])
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/", response_model=CommonFields)
async def edit_common_fields(
    fields: CommonFields,
    db: AsyncIOMotorDatabase = Depends(get_common_fields_service),
    user: dict = Depends(get_current_active_user)
):
    try:
        return await update_common_fields(fields, db, user["company_id"])
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
async def remove_common_fields(
    plant_id: Optional[str] = None,
    financial_year: Optional[str] = None,
    db: AsyncIOMotorDatabase = Depends(get_common_fields_service),
    user: dict = Depends(get_current_active_user)
):
    try:
        await delete_common_fields(db, user["company_id"], plant_id, financial_year)
        return None
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
