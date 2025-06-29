from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime
from typing import Optional
import logging

logger = logging.getLogger("dynamic_audit_service")

class DynamicAuditService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.collection = db.audit

    async def set_audited(self, company_id: str, question_id: str, audited: bool, user_id: str, module_id: Optional[str] = None):
        now = datetime.utcnow()
        audited_entry = {
            "question_id": question_id,
            "audited": audited,
            "user_id": user_id,
            "module_id": module_id,
            "timestamp": now,
        }
        try:
            audit_doc = await self.collection.find_one({"company_id": company_id, "question_id": question_id})
            if audit_doc:
                result = await self.collection.update_one(
                    {"_id": audit_doc["_id"]},
                    {"$set": {"audited": audited, "audited_entry": audited_entry}}
                )
                logger.info(f"Updated audited for company_id={company_id}, question_id={question_id}, result={result.raw_result}")
            else:
                result = await self.collection.insert_one({
                    "company_id": company_id,
                    "question_id": question_id,
                    "audited": audited,
                    "audited_entry": audited_entry
                })
                logger.info(f"Inserted new audited for company_id={company_id}, question_id={question_id}, inserted_id={result.inserted_id}")
            return True
        except Exception as e:
            logger.error(f"Error in set_audited: {e}", exc_info=True)
            raise

    async def get_audited(self, company_id: str, question_id: str):
        try:
            audit_doc = await self.collection.find_one({"company_id": company_id, "question_id": question_id})
            if not audit_doc:
                logger.info(f"No audit doc found for company_id={company_id}, question_id={question_id}")
                return None
            logger.info(f"Fetched audited for company_id={company_id}, question_id={question_id}: {audit_doc.get('audited', None)}")
            return audit_doc.get("audited", None)
        except Exception as e:
            logger.error(f"Error in get_audited: {e}", exc_info=True)
            raise
