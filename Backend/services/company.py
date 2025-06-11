from typing import List, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from models.company import CompanyCreate, CompanyUpdate, Company, ActiveReport
from models.plant import Plant, PlantCreate, PlantType
from datetime import datetime
import uuid
from fastapi import HTTPException, status

class CompanyService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.collection = db.companies

    async def create_company(self, company_data: CompanyCreate) -> Company:
        """Create a new company with default plants (C001, P001)"""
        # Check for duplicate company name
        if await self.db.companies.find_one({"name": company_data.name}):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Company with this name already exists")

        company_id = str(uuid.uuid4())
        now = datetime.utcnow()
        company_dict = company_data.model_dump()
        company_dict["id"] = company_id
        company_dict["created_at"] = now
        company_dict["updated_at"] = now
        company_dict["plant_ids"] = []
        company_dict["active_reports"] = []

        # Create default plants
        c001 = PlantCreate(
            code="C001",
            name=f"{company_data.name} - Aggregator Plant",
            company_id=company_id,
            type=PlantType.AGGREGATOR,
            address="",
            contact_email="",
            contact_phone=""
        )
        p001 = PlantCreate(
            code="P001",
            name=f"{company_data.name} - Home Plant",
            company_id=company_id,
            type=PlantType.HOME,
            address="",
            contact_email="",
            contact_phone=""
        )
        c001_id = str(uuid.uuid4())
        p001_id = str(uuid.uuid4())
        c001_dict = c001.model_dump()
        c001_dict["id"] = c001_id
        c001_dict["created_at"] = now
        c001_dict["updated_at"] = now
        c001_dict["plant_type"] = PlantType.AGGREGATOR.value
        c001_dict["access_level"] = "all_modules"
        p001_dict = p001.model_dump()
        p001_dict["id"] = p001_id
        p001_dict["created_at"] = now
        p001_dict["updated_at"] = now
        p001_dict["plant_type"] = PlantType.HOME.value
        p001_dict["access_level"] = "all_modules"
        company_dict["plant_ids"] = [c001_id, p001_id]

        await self.db.companies.insert_one(company_dict)
        await self.db.plants.insert_many([c001_dict, p001_dict])
        return Company(**company_dict)

    async def get_company(self, company_id: str) -> Optional[Company]:
        doc = await self.collection.find_one({"id": company_id})
        if not doc:
            return None
        return Company(**doc)

    async def list_companies(self, skip: int = 0, limit: int = 10) -> List[Company]:
        companies = []
        async for doc in self.collection.find().skip(skip).limit(limit):
            companies.append(Company(**doc))
        return companies

    async def update_company(self, company_id: str, company_data: CompanyUpdate) -> Company:
        update_data = company_data.model_dump(exclude_unset=True)
        if update_data:
            update_data["updated_at"] = datetime.utcnow()
            result = await self.collection.update_one({"id": company_id}, {"$set": update_data})
            if result.modified_count == 0:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")
        doc = await self.collection.find_one({"id": company_id})
        return Company(**doc)

    async def delete_company(self, company_id: str) -> bool:
        await self.db.plants.delete_many({"company_id": company_id})
        result = await self.collection.delete_one({"id": company_id})
        return result.deleted_count > 0

    async def assign_report(self, company_id: str, report_id: str, basic_modules: List[str], calc_modules: List[str], financial_year: str) -> Company:
        """Assign a report to a company with module assignments and update plant access levels."""
        company = await self.get_company(company_id)
        if not company:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")
        report = await self.db.reports.find_one({"id": report_id})
        if not report:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
        assigned_modules = {"basic_modules": basic_modules, "calc_modules": calc_modules}
        active_report = {
            "report_id": report_id,
            "assigned_modules": assigned_modules,
            "financial_year": financial_year,
            "status": "active"
        }
        await self.collection.update_one(
            {"id": company_id},
            {" $push": {"active_reports": active_report}, "$set": {"updated_at": datetime.utcnow()}}
        )
        # Update plant access levels
        await self.db.plants.update_many(
            {"company_id": company_id, "plant_type": "regular"},
            {" $set": {"access_level": "calc_modules_only"}}
        )
        await self.db.plants.update_many(
            {"company_id": company_id, "plant_type": {"$in": ["C001", "P001"]}},
            {" $set": {"access_level": "all_modules"}}
        )
        company = await self.get_company(company_id)
        if not company:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")
        return company

    async def get_company_plants(self, company_id: str) -> List[Plant]:
        plants = []
        async for doc in self.db.plants.find({"company_id": company_id}):
            plants.append(Plant(**doc))
        return plants