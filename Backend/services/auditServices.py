from typing import Optional
from fastapi import HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase
from models.auditModel import ActionLog, AuditLog
from logging import getLogger

logger = getLogger(__name__)

class AuditService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.collection = db.audit

    async def get_audit_log(self, company_id: str, plant_id: str = None, financial_year: str = None) -> AuditLog:
        """
        Fetch audit log for a company, with optional plant and financial year filters.

        Args:
            company_id: ID of the company (required).
            plant_id: ID of the plant (optional).
            financial_year: Financial year (optional).

        Returns:
            AuditLog object.

        Raises:
            HTTPException: If audit log is not found.
        """
        # Build query with required and optional parameters
        query = {"company_id": company_id}
        if plant_id:
            query["plant_id"] = plant_id
        if financial_year:
            query["financial_year"] = financial_year

        audit = await self.collection.find_one(query)
        if not audit:
            raise HTTPException(status_code=404, detail="Audit log not found")
        
        # Convert _id to string and rename to id
        audit["id"] = str(audit["_id"]) if "_id" in audit else None
        audit.pop("_id", None)  # Ensure _id is removed
        
        # Validate and return AuditLog
        try:
            return AuditLog(**audit)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to validate audit log: {str(e)}")
    
    async def log_action(
        self,
        company_id: str,
        plant_id: Optional[str],
        financial_year: Optional[str],
        action_log: ActionLog
    ) -> None:
        """
        Append an action to the audit log in MongoDB.
        Creates a new document if none exists for the company/plant/financial year combination.

        Args:
            company_id: Company ID.
            plant_id: Plant ID (optional).
            financial_year: Financial year (optional).
            action_log: Action details to log.

        Raises:
            HTTPException: If the database operation fails.
        """
        try:
            # Query to find the existing document
            query = {
                "company_id": company_id,
                "plant_id": plant_id,
                "financial_year": financial_year
            }

            # Update to append the new action
            update = {
                "$push": {
                    "actions": action_log.dict(exclude_unset=True)
                },
                "$setOnInsert": {
                    "company_id": company_id,
                    "plant_id": plant_id,
                    "financial_year": financial_year
                }
            }

            # Perform upsert operation
            result = await self.collection.update_one(
                query,
                update,
                upsert=True  # Create document if it doesn't exist
            )

            if result.modified_count == 0 and result.upserted_id is None:
                logger.warning(f"Failed to log action: {action_log.action} for target_id={action_log.target_id}")
                raise HTTPException(status_code=400, detail="Failed to log action")

            logger.info(f"Logged action: {action_log.action} for target_id={action_log.target_id}")
        except Exception as e:
            logger.error(f"Error logging action: {str(e)}", exc_info=True)
            raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")