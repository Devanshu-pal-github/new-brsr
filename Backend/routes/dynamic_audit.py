from fastapi import APIRouter, Depends, HTTPException, Query
from dependencies import get_current_active_user, get_database
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel
from typing import Dict, Optional
from datetime import datetime
from services.dynamic_audit_service import DynamicAuditService

router = APIRouter(tags=["DynamicAudit"])

class DynamicAuditRequest(BaseModel):
    question_id: str
    audited: bool
    module_id: Optional[str] = None
    company_id: Optional[str] = None
    timestamp: Optional[datetime] = None

@router.post("/dynamic-audit/audited", response_model=dict)
async def set_dynamic_audited(
    req: DynamicAuditRequest,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: Dict = Depends(get_current_active_user)
):
    company_id = req.company_id or current_user.get("company_id")
    if not company_id:
        raise HTTPException(status_code=400, detail="Missing company_id")
    service = DynamicAuditService(db)
    await service.set_audited(company_id, req.question_id, req.audited, user_id=None, module_id=req.module_id)
    return {"detail": "Audited state saved successfully", "audited": req.audited}

@router.get("/dynamic-audit/audited/{question_id}", response_model=dict)
async def get_dynamic_audited(
    question_id: str,
    company_id: Optional[str] = Query(None),
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: Dict = Depends(get_current_active_user)
):
    # Prefer query param, fallback to user
    company_id = company_id or current_user.get("company_id")
    if not company_id:
        raise HTTPException(status_code=400, detail="Missing company_id")
    service = DynamicAuditService(db)
    audited = await service.get_audited(company_id, question_id)
    return {"audited": audited}
