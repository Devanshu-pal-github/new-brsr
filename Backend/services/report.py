from typing import List, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase 
from models.report import ReportCreate, ReportUpdate, Report
from datetime import datetime
from fastapi import HTTPException, status

class ReportService:
    def __init__(self, db: AsyncIOMotorDatabase):  # type: ignore
        self.db = db
        self.collection = db.reports
        self.modules_collection = db.modules

    async def create_report(self, report: ReportCreate) -> Report:
        """Create a new report after validating module IDs."""
        # Validate module IDs
        for module_id in report.module_ids + report.basic_modules + report.calc_modules:
            if not await self.modules_collection.find_one({"_id": module_id}):
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Module ID {module_id} not found")
        report_dict = report.model_dump()
        report_dict["created_at"] = datetime.utcnow()
        report_dict["updated_at"] = report_dict["created_at"]
        result = await self.collection.insert_one(report_dict)
        report_dict["_id"] = str(result.inserted_id)
        return Report(**report_dict)

    async def get_report(self, report_id: str) -> Optional[Report]:
        """Get a report by ID."""
        report = await self.collection.find_one({"_id": report_id})
        if report:
            return Report(**report)
        return None

    async def list_reports(self, skip: int = 0, limit: int = 10) -> List[Report]:
        """List all reports."""
        reports = []
        cursor = self.collection.find().skip(skip).limit(limit)
        async for report in cursor:
            reports.append(Report(**report))
        return reports

    async def update_report(self, report_id: str, report_update: ReportUpdate) -> Optional[Report]:
        """Update a report after validating module IDs."""
        update_data = report_update.model_dump(exclude_unset=True)
        if any(key in update_data for key in ["module_ids", "basic_modules", "calc_modules"]):
            module_ids = (update_data.get("module_ids") or []) + (update_data.get("basic_modules") or []) + (update_data.get("calc_modules") or [])
            for module_id in module_ids:
                if not await self.modules_collection.find_one({"_id": module_id}):
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Module ID {module_id} not found")
        update_data["updated_at"] = datetime.utcnow()
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
        result = await self.collection.delete_one({"_id": report_id})
        return result.deleted_count > 0 