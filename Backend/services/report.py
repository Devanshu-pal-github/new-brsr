from typing import List, Optional, Dict, Any
from motor.motor_asyncio import AsyncIOMotorDatabase
import logging
import uuid
from typing import List, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from models.report import ReportCreate, ReportUpdate, Report, ReportSummary, ModuleAssignment
from models.report import REPORT_STATUS_ACTIVE, REPORT_STATUS_INACTIVE, REPORT_STATUS_ARCHIVED
from datetime import datetime
from fastapi import HTTPException, status

logger = logging.getLogger(__name__)

class ReportService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        if db is None:
            raise RuntimeError("Database not initialized properly.")
        self.collection = db.reports
        self.modules_collection = db.modules
        self.companies_collection = db.companies
        self.answers_collection = db.answers

    async def create_report(self, report: ReportCreate) -> Report:
        logger.info(f"Attempting to create report: {report.name}")
        """Create a new report after validating module IDs."""
        # Check if report with same name already exists
        logger.debug(f"Checking for existing report with name: {report.name}")
        existing_report = await self.collection.find_one({"name": report.name})
        if existing_report:
            logger.warning(f"Report with name '{report.name}' already exists.")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail=f"Report with name '{report.name}' already exists"
            )
        logger.debug(f"No existing report found with name: {report.name}")
            
        # Validate module IDs
        all_module_ids = report.module_ids + report.basic_modules + report.calc_modules
        if all_module_ids:
            logger.debug(f"Validating module IDs: {all_module_ids}")
            for module_id in all_module_ids:
                logger.debug(f"Checking module ID: {module_id}")
                if not await self.modules_collection.find_one({"_id": module_id}):
                    logger.warning(f"Module ID {module_id} not found.")
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST, 
                        detail=f"Module ID {module_id} not found"
                    )
                logger.debug(f"Module ID {module_id} found.")
        logger.debug("All module IDs validated.")
        
        # Validate status
        logger.debug(f"Validating report status: {report.status}")
        if report.status not in [REPORT_STATUS_ACTIVE, REPORT_STATUS_INACTIVE, REPORT_STATUS_ARCHIVED]:
            logger.warning(f"Invalid status provided: {report.status}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail=f"Invalid status: {report.status}. Must be one of: active, inactive, archived"
            )
        logger.debug("Report status validated.")
            
        report_dict = report.model_dump()
        report_dict["created_at"] = datetime.utcnow()
        report_dict["updated_at"] = report_dict["created_at"]
        
        # Ensure we have a UUID in the 'id' field
        if "id" not in report_dict or not report_dict["id"]:
            report_dict["id"] = str(uuid.uuid4())
        
        logger.debug(f"Inserting new report into database: {report.name} with UUID: {report_dict['id']}")
        result = await self.collection.insert_one(report_dict)
        logger.info(f"Report '{report.name}' inserted with MongoDB ID: {result.inserted_id} and UUID: {report_dict['id']}")
        
        # Keep both IDs in the response
        report_dict["_id"] = str(result.inserted_id)
        return Report(**report_dict)

    async def get_report(self, report_id: str) -> Optional[Report]:
        """Get a report by ID. Supports both UUID (id) and MongoDB ObjectId (_id) lookups."""
        # First try to find by UUID (id field)
        report = await self.collection.find_one({"id": report_id})
        
        # If not found, try by MongoDB ObjectId (_id field)
        if not report:
            report = await self.collection.find_one({"_id": report_id})
            
        if report:
            return Report(**report)
        return None

    async def list_reports(self, skip: int = 0, limit: int = 10, status: Optional[str] = None) -> List[Report]:
        """List all reports with optional filtering by status."""
        query = {}
        if status:
            if status not in [REPORT_STATUS_ACTIVE, REPORT_STATUS_INACTIVE, REPORT_STATUS_ARCHIVED]:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST, 
                    detail=f"Invalid status: {status}. Must be one of: active, inactive, archived"
                )
            query["status"] = status
            
        reports = []
        cursor = self.collection.find(query).skip(skip).limit(limit)
        async for report in cursor:
            reports.append(Report(**report))
        return reports

    async def update_report(self, report_id: str, report_update: ReportUpdate) -> Optional[Report]:
        """Update a report after validating module IDs and status."""
        # Check if report exists - first try UUID (id field)
        existing_report = await self.collection.find_one({"id": report_id})
        
        # If not found, try MongoDB ObjectId (_id field)
        if not existing_report:
            existing_report = await self.collection.find_one({"_id": report_id})
            
        if not existing_report:
            return None
            
        update_data = report_update.model_dump(exclude_unset=True)
        
        # Validate name uniqueness if changing name
        if "name" in update_data:
            name_check = await self.collection.find_one({"name": update_data["name"], "_id": {"$ne": report_id}})
            if name_check:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST, 
                    detail=f"Report with name '{update_data['name']}' already exists"
                )
        
        # Validate module IDs if updating modules
        if any(key in update_data for key in ["module_ids", "basic_modules", "calc_modules"]):
            module_ids = (update_data.get("module_ids") or []) + \
                         (update_data.get("basic_modules") or []) + \
                         (update_data.get("calc_modules") or [])
            for module_id in module_ids:
                if not await self.modules_collection.find_one({"_id": module_id}):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST, 
                        detail=f"Module ID {module_id} not found"
                    )
        
        # Validate status if updating status
        if "status" in update_data and update_data["status"] not in [
            REPORT_STATUS_ACTIVE, REPORT_STATUS_INACTIVE, REPORT_STATUS_ARCHIVED
        ]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail=f"Invalid status: {update_data['status']}. Must be one of: active, inactive, archived"
            )
            
        update_data["updated_at"] = datetime.utcnow()
        
        # Try to update by UUID (id field) first
        result = await self.collection.find_one_and_update(
            {"id": report_id},
            {"$set": update_data},
            return_document=True
        )
        
        # If not found, try by MongoDB ObjectId (_id field)
        if not result:
            result = await self.collection.find_one_and_update(
                {"_id": report_id},
                {"$set": update_data},
                return_document=True
            )
            
        if result:
            return Report(**result)
        return None

    async def delete_report(self, report_id: str) -> bool:
        """Delete a report by ID."""
        # Check if report is used by any company
        company_using_report = await self.companies_collection.find_one({"active_reports.report_id": report_id})
        if company_using_report:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot delete report as it is being used by company: {company_using_report['name']}"
            )
        
        # Try to delete by UUID (id field) first
        result = await self.collection.delete_one({"id": report_id})
        
        # If not found, try by MongoDB ObjectId (_id field)
        if result.deleted_count == 0:
            result = await self.collection.delete_one({"_id": report_id})
            
        return result.deleted_count > 0
        
    async def change_report_status(self, report_id: str, new_status: str) -> Optional[Report]:
        """Change the status of a report."""
        if new_status not in [REPORT_STATUS_ACTIVE, REPORT_STATUS_INACTIVE, REPORT_STATUS_ARCHIVED]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail=f"Invalid status: {new_status}. Must be one of: active, inactive, archived"
            )

    async def assign_modules_to_report_with_types(self, report_id: str, modules: List[ModuleAssignment]) -> Optional[Report]:
        """Assign modules to a report with explicit module types specified in the request."""
        # Check if report exists
        report = await self.get_report(report_id)
        if not report:
            return None

        # Extract module IDs and categorize by type
        module_ids = []
        basic_modules = []
        calc_modules = []
        
        for module in modules:
            module_id = module.id
            module_ids.append(module_id)
            
            # Validate that module exists
            db_module = await self.modules_collection.find_one({"$or": [{"_id": module_id}, {"id": module_id}]})
            if not db_module:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Module ID {module_id} not found"
                )
            
            # Categorize based on provided type
            if module.module_type.value == "basic":
                basic_modules.append(module_id)
            elif module.module_type.value == "calc":
                calc_modules.append(module_id)
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid module type: {module.module_type}. Must be either 'basic' or 'calc'"
                )

        update_data = {
            "module_ids": module_ids, 
            "basic_modules": basic_modules,
            "calc_modules": calc_modules,
            "updated_at": datetime.utcnow()
        }
        
        # Update the report
        result = await self.collection.find_one_and_update(
            {"id": report_id},
            {"$set": update_data},
            return_document=True
        )

        if not result:
            result = await self.collection.find_one_and_update(
                {"_id": report_id},
                {"$set": update_data},
                return_document=True
            )

        if result:
            return Report(**result)
        return None
        
    async def assign_modules_to_report(self, report_id: str, module_ids: List[str]) -> Optional[Report]:
        """Assign modules to a report and categorize them as basic or calc."""
        # Check if report exists
        report = await self.get_report(report_id)
        if not report:
            return None

        # Validate module IDs and categorize them
        basic_modules = []
        calc_modules = []
        
        for module_id in module_ids:
            # Try to find module by either _id or id field
            module = await self.modules_collection.find_one({"$or": [{"_id": module_id}, {"id": module_id}]})
            if not module:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Module ID {module_id} not found"
                )
            
            # Categorize module based on its type
            if module.get("module_type") == "basic":
                basic_modules.append(module_id)
            elif module.get("module_type") == "calc":
                calc_modules.append(module_id)
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Module ID {module_id} has invalid type: {module.get('module_type')}. Must be either 'basic' or 'calc'"
                )

        update_data = {
            "module_ids": module_ids, 
            "basic_modules": basic_modules,
            "calc_modules": calc_modules,
            "updated_at": datetime.utcnow()
        }

        # Update the report
        result = await self.collection.find_one_and_update(
            {"id": report_id},
            {"$set": update_data},
            return_document=True
        )

        if not result:
            result = await self.collection.find_one_and_update(
                {"_id": report_id},
                {"$set": update_data},
                return_document=True
            )

        if result:
            return Report(**result)
        return None
        
        # Try to update by UUID (id field) first
        result = await self.collection.find_one_and_update(
            {"id": report_id},
            {"$set": {"status": new_status, "updated_at": datetime.utcnow()}},
            return_document=True
        )
        
        # If not found, try by MongoDB ObjectId (_id field)
        if not result:
            result = await self.collection.find_one_and_update(
                {"_id": report_id},
                {"$set": {"status": new_status, "updated_at": datetime.utcnow()}},
                return_document=True
            )
            
        if result:
            return Report(**result)
        return None
        
    async def get_report_summary(self, report_id: str) -> Optional[ReportSummary]:
        """Get a summary of a report including usage statistics."""
        report = await self.collection.find_one({"_id": report_id})
        if not report:
            return None
            
        # Count companies using this report
        company_count = await self.companies_collection.count_documents({"active_reports.report_id": report_id})
        
        # Count submissions for this report
        submission_count = await self.answers_collection.count_documents({"report_id": report_id})
        
        # Get last submission date
        last_submission = None
        if submission_count > 0:
            last_answer = await self.answers_collection.find_one(
                {"report_id": report_id},
                sort=[("updated_at", -1)]
            )
            if last_answer:
                last_submission = last_answer.get("updated_at")
                
        return ReportSummary(
            report_id=report_id,
            name=report["name"],
            type="BRSR",  # This could be dynamic based on report metadata
            version=report.get("version", "1.0.0"),
            status=report.get("status", REPORT_STATUS_ACTIVE),
            company_count=company_count,
            submission_count=submission_count,
            last_submission=last_submission
        )