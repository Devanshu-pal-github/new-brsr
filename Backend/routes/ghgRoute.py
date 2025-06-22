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

class TotalCO2Query(BaseModel):
    financial_year: Optional[str] = None
    scope: Optional[str] = None

@router.post("/report/total-co2")
async def get_total_co2_emissions(
    query: TotalCO2Query = Body(...),
    service: GHGService = Depends(get_ghg_service),
    user: Dict = Depends(get_current_active_user)
):
    company_id = user["company_id"]
    total = await service.get_total_co2_emissions(company_id, query.financial_year, query.scope)
    return {"total_co2_emissions": total}

class TotalCO2ByScopeQuery(BaseModel):
    financial_year: str
    scopes: Optional[List[str]] = None

@router.post("/report/total-co2-by-scope")
async def get_total_co2_emissions_by_scope(
    body: TotalCO2ByScopeQuery = Body(...),
    service: GHGService = Depends(get_ghg_service),
    user: Dict = Depends(get_current_active_user)
):
    company_id = user["company_id"]
    result = await service.get_total_co2_emissions_by_scope(company_id, body.financial_year, body.scopes)
    return result



