from typing import Dict
from fastapi import APIRouter, Depends, HTTPException
from dependencies import get_current_active_user
from models.auditModel import AuditLog, ActionLog
from services.auditServices import AuditService
from logging import getLogger
from motor.motor_asyncio import AsyncIOMotorDatabase
from dependencies import get_database

logger = getLogger(__name__)

router = APIRouter(tags=["Audit"])

def get_audit_service(db: AsyncIOMotorDatabase = Depends(get_database)) -> AuditService:
    return AuditService(db)

@router.get("/", response_model=dict)
async def get_audit_log(
    current_user: Dict = Depends(get_current_active_user),
    audit_service: AuditService = Depends(get_audit_service)
):
    """
    Fetch audit log for the current user's company.
    - If only company_id is present, returns all actions for the company.
    - If plant_id or financial_year is present, returns the specific audit log.
    """
    company_id = current_user.get("company_id")
    plant_id = current_user.get("plant_id")
    financial_year = current_user.get("financial_year")

    if not company_id:
        logger.warning("Missing required field in current_user: company_id")
        raise HTTPException(status_code=400, detail="Missing required user context: company_id")

    try:
        if not plant_id and not financial_year:
            # Only company_id present: return all actions
            logger.debug(f"Fetching all audit actions for company_id: {company_id}")
            actions = await audit_service.get_all_company_actions(company_id)
            return {"company_id": company_id, "total_actions": len(actions), "actions": actions}
        else:
            # plant_id or financial_year present: return specific audit log
            query_params = {"company_id": company_id}
            if plant_id:
                query_params["plant_id"] = plant_id
            if financial_year:
                query_params["financial_year"] = financial_year.replace("-", "_")
            logger.debug(f"Fetching audit log with params: {query_params}")
            result = await audit_service.get_audit_log(**query_params)
            if not result:
                logger.warning(f"No audit log found for params: {query_params}")
                raise HTTPException(status_code=404, detail="Audit log not found")
            return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch audit log: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.post("/log", response_model=dict)
async def log_action(
    action_log: ActionLog,
    current_user: Dict = Depends(get_current_active_user)
):
    """
    Log an action (e.g., update_question, delete_employee) to the audit log.

    Args:
        action_log: Details of the action to log.
        current_user: User info including company_id, plant_id, financial_year, user_id, user_role.

    Returns:
        dict: Confirmation message.

    Raises:
        HTTPException: If the action cannot be logged.
    """
    company_id = current_user.get("company_id")
    plant_id = current_user.get("plant_id")
    financial_year = current_user.get("financial_year")
    user_role = current_user.get("user_role", [])[0],
    user_id = current_user.get("user_id")
    
    if user_id is None:
        logger.warning("Missing user_id in current_user")
        raise HTTPException(status_code=400, detail="Missing user_id in user context")


    if not company_id or not financial_year:
        logger.warning("Missing required fields in current_user: company_id or financial_year")
        raise HTTPException(status_code=400, detail="Missing required user context: company_id, financial_year")

    try:
        logger.debug(f"Logging action: {action_log.action} for target_id={action_log.target_id}")
        result = await log_action_service(
            company_id=company_id,
            plant_id=plant_id,
            
            financial_year=financial_year.replace("-", "_"),
            action_log=action_log
        )
        return {"detail": "Action logged successfully"}
    except HTTPException as e:
        raise
    except Exception as e:
        logger.error(f"Failed to log action: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")