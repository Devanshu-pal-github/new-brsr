from typing import List, Dict, Optional, Any
from fastapi import APIRouter, Depends, HTTPException, status, Body
from motor.motor_asyncio import AsyncIOMotorDatabase
from services.ghgService import GHGService
from dependencies import get_database, get_current_active_user
from models.ghgModel import GHGReport
from pydantic import BaseModel, Field

router = APIRouter(
    prefix="/ghg",
    tags=["ghg"]
)

def get_ghg_service(db: AsyncIOMotorDatabase = Depends(get_database)) -> GHGService:
    return GHGService(db)

class GHGReportQuery(BaseModel):
    financial_year: str
    plant_id: Optional[str] = None
    scope: Optional[str] = None

@router.post("/report/get", response_model=Optional[GHGReport])
async def get_ghg_report(
    query: GHGReportQuery = Body(...),
    service: GHGService = Depends(get_ghg_service),
    user: Dict = Depends(get_current_active_user)
):
    company_id = user["company_id"]
    return await service.get_report(company_id, query.financial_year, query.plant_id, query.scope)

@router.post("/report/upsert", response_model=GHGReport)
async def upsert_ghg_report(
    report: GHGReport = Body(...),
    service: GHGService = Depends(get_ghg_service),
    user: Dict = Depends(get_current_active_user)
):
    company_id = user["company_id"]
    report.company_id = company_id
    return await service.upsert_report(report)
