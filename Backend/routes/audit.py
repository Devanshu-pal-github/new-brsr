from typing import Dict
from fastapi import APIRouter, Depends, HTTPException
from auth import get_current_user
from models.auditModel import AuditLog, ActionLog
from services.auditServices import get_audit_log_service, log_action_service  # You will implement this
from logging import getLogger

logger = getLogger(__name__)

router = APIRouter(prefix="/audit", tags=["Audit"])

@router.get("/", response_model=AuditLog)
async def get_audit_log(current_user: Dict = Depends(get_current_user)):
    """
    Fetch audit log for the current user's company, plant, and financial year.

    Args:
        current_user: User info including company_id, plant_id, financial_year, user_id, user_role.

    Returns:
        AuditLog: Audit log data.

    Raises:
        HTTPException: If required fields are missing or audit log is not found.
    """
    company_id = current_user["company_id"]
    plant_id = current_user["plant_id"]
    financial_year = current_user["financial_year"]

    if not company_id or not financial_year:
        logger.warning("Missing required fields in current_user: company_id or financial_year")
        raise HTTPException(status_code=400, detail="Missing required user context: company_id, financial_year")

    try:
        logger.debug(f"Fetching audit log for company_id={company_id}, plant_id={plant_id}, financial_year={financial_year}")
        result = await get_audit_log_service(
            company_id=company_id,
            plant_id=plant_id,
            financial_year=financial_year.replace("-", "_")  # Convert to MongoDB format
        )
        if not result:
            logger.warning(f"No audit log found for company_id={company_id}, plant_id={plant_id}, financial_year={financial_year}")
            raise HTTPException(status_code=404, detail="Audit log not found")
        return result
    except HTTPException as e:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch audit log: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.post("/log", response_model=dict)
async def log_action(
    action_log: ActionLog,
    current_user: Dict = Depends(get_current_user)
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