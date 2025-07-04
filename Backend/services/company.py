from typing import List, Optional, Dict, Any
from motor.motor_asyncio import AsyncIOMotorDatabase
from models.company import CompanyCreate, CompanyUpdate, Company, ActiveReport
from models.plant import Plant, PlantCreate, PlantType, AccessLevel
from models.module import ModuleType
from services.module import ModuleService
from datetime import datetime
import uuid
from fastapi import HTTPException, status
from bson.objectid import ObjectId
from bson.errors import InvalidId
class CompanyService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.collection = db.companies

    async def create_company(self, company_data: CompanyCreate) -> Company:
        """Create a new company with default plants (C001, P001) and their environment reports"""
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
        company_dict["financialYear"] = company_data.financialYear  # Add financialYear from input data

        # Create default plants with UUIDs
        c001_id = str(uuid.uuid4())  # UUID for aggregator plant
        p001_id = str(uuid.uuid4())  # UUID for home plant

        c001 = PlantCreate(
            code="C001",
            name=f"{company_data.name} - Aggregator Plant",
            company_id=company_id,
            type=PlantType.AGGREGATOR,
            address=company_data.address,
            contact_email=company_data.contact_email,
            contact_phone=company_data.contact_phone
        )
        p001 = PlantCreate(
            code="P001",
            name=f"{company_data.name} - Home Plant",
            company_id=company_id,
            type=PlantType.HOME,
            address=company_data.address,
            contact_email=company_data.contact_email,
            contact_phone=company_data.contact_phone
        )
        
        # Prepare C001 plant document
        c001_dict = c001.model_dump()
        c001_dict["id"] = c001_id
        c001_dict["created_at"] = now
        c001_dict["updated_at"] = now
        c001_dict["plant_type"] = PlantType.AGGREGATOR.value
        c001_dict["access_level"] = AccessLevel.ALL_MODULES.value
        c001_dict["plant_code"] = c001_dict.pop("code")
        c001_dict["plant_name"] = c001_dict.pop("name")
        c001_dict.pop("type")  # Remove type as it's replaced by plant_type
        
        # Prepare P001 plant document
        p001_dict = p001.model_dump()
        p001_dict["id"] = p001_id
        p001_dict["created_at"] = now
        p001_dict["updated_at"] = now
        p001_dict["plant_type"] = PlantType.HOME.value
        p001_dict["access_level"] = AccessLevel.ALL_MODULES.value
        p001_dict["plant_code"] = p001_dict.pop("code")
        p001_dict["plant_name"] = p001_dict.pop("name")
        p001_dict.pop("type")  # Remove type as it's replaced by plant_type
        
        company_dict["plant_ids"] = [c001_id, p001_id]

        # Create environment reports for both plants
        current_financial_year = "2024-2025"
        environment_reports = [
            {
                "id": str(uuid.uuid4()),
                "companyId": company_id,
                "plantId": c001_id,  # Use UUID for plantId
                "plant_type": PlantType.AGGREGATOR.value,  # Use plant type for categorization
                "financialYear": current_financial_year,
                "answers": {},  # Initialize with empty answers
                "status": "draft",
                "createdAt": now,
                "updatedAt": now,
                "version": 1
            },
            {
                "id": str(uuid.uuid4()),
                "companyId": company_id,
                "plantId": p001_id,  # Use UUID for plantId
                "plant_type": PlantType.HOME.value,  # Use plant type for categorization
                "financialYear": current_financial_year,
                "answers": {},  # Initialize with empty answers
                "status": "draft",
                "createdAt": now,
                "updatedAt": now,
                "version": 1
            }
        ]

        # Insert company, plants, and environment reports into database
        async with await self.db.client.start_session() as session:
            async with session.start_transaction():
                await self.db.companies.insert_one(company_dict, session=session)
                await self.db.plants.insert_many([c001_dict, p001_dict], session=session)
                await self.db.environment.insert_many(environment_reports, session=session)
        
        return Company(**company_dict)

    async def get_company(self, company_id: str) -> Optional[Company]:
        doc = None
        # Try to find by MongoDB's _id first
        try:
            if len(company_id) == 24: # ObjectId strings are 24 hex characters
                doc = await self.collection.find_one({"_id": ObjectId(company_id)})
        except InvalidId:
            pass # Not a valid ObjectId string, proceed to try 'id' field

        if not doc:
            # If not found by _id, try to find by the 'id' field (UUID string)
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

    async def assign_report(self, company_id: str, report_id: str, financial_year: str, modules: List[str] = None) -> Company:
        """Assign a report to a company with module assignments and update plant access levels."""
        # Check if company exists
        company = await self.get_company(company_id)
        if not company:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")
            
        # Check if report exists - first try UUID (id field)
        report_doc = await self.db.reports.find_one({"id": report_id})
        
        # If not found, try MongoDB ObjectId (_id field)
        if not report_doc:
            report_doc = await self.db.reports.find_one({"_id": report_id})
        if not report_doc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
            
        # Check if report is already assigned to this company
        for active_report in company.active_reports:
            if isinstance(active_report, dict) and active_report.get("report_id") == report_id:
                raise ValueError(f"Report with ID {report_id} is already assigned to this company")
        
        basic_modules = []
        calc_modules = []

        if modules:
            # If modules are provided, categorize them
            module_service = ModuleService(self.db)
            for module_id in modules:
                module_doc = await module_service.get_module(module_id)
                if module_doc and isinstance(module_doc, dict):
                    if module_doc.get("module_type") == ModuleType.BASIC.value:
                        basic_modules.append(module_id)
                    elif module_doc.get("module_type") == ModuleType.CALC.value:
                        calc_modules.append(module_id)
                elif module_doc:  # If module_doc is a Module object
                    if getattr(module_doc, "module_type", None) == ModuleType.BASIC.value:
                        basic_modules.append(module_id)
                    elif getattr(module_doc, "module_type", None) == ModuleType.CALC.value:
                        calc_modules.append(module_id)
        else:
            # If no modules are provided, use the default modules from the report definition
            if report_doc.get("basic_modules"):
                basic_modules.extend(report_doc["basic_modules"])
            if report_doc.get("calc_modules"):
                calc_modules.extend(report_doc["calc_modules"])

        assigned_modules = {"basic_modules": basic_modules, "calc_modules": calc_modules}
        
        active_report = {
            "report_id": report_id,
            "report_name": report_doc.get("name", ""),  # Add report name to the response
            "assigned_modules": assigned_modules,
            "financial_year": financial_year,
            "status": "active"
        }
        
        # Add the report to the company's active_reports
        await self.collection.update_one(
            {"id": company_id},
            {"$push": {"active_reports": active_report}, "$set": {"updated_at": datetime.utcnow()}}
        )
        
        # Update plant access levels
        await self.db.plants.update_many(
            {"company_id": company_id, "plant_type": "regular"},
            {"$set": {"access_level": "calc_modules_only"}}
        )
        
        await self.db.plants.update_many(
            {"company_id": company_id, "plant_type": {"$in": ["C001", "P001"]}},
            {"$set": {"access_level": "all_modules"}}
        )
        
        # Update access_modules for company_admin and plant_admin users of this company
        # Company admins get access to all modules (both basic and calc)
        company_admins = await self.db.users.find({
            "company_id": company_id,
            "role": "company_admin"
        }).to_list(length=None)
        
        for admin in company_admins:
            # Update the user's access_modules with all modules
            all_modules = basic_modules + calc_modules
            if all_modules:
                await self.db.users.update_one(
                    {"_id": admin["_id"]},
                    {"$addToSet": {"access_modules": {"$each": all_modules}}}
                )
        
        # Plant admins only get access to calc modules
        plant_admins = await self.db.users.find({
            "company_id": company_id,
            "role": "plant_admin"
        }).to_list(length=None)
        
        for admin in plant_admins:
            # Update the user's access_modules with only calc modules
            if calc_modules:
                await self.db.users.update_one(
                    {"_id": admin["_id"]},
                    {"$addToSet": {"access_modules": {"$each": calc_modules}}}
                )
                
                # Ensure plant admin has access to all plants in the company
                plants = await self.db.plants.find({"company_id": company_id}).to_list(length=None)
                
                # Get existing user access records
                user_access_records = await self.db.user_access.find({
                    "user_id": admin["_id"],
                    "company_id": company_id
                }).to_list(length=None)
                
                # Create a set of plant IDs that the user already has access to
                existing_plant_access = set()
                for record in user_access_records:
                    if "plant_id" in record and record["plant_id"]:
                        existing_plant_access.add(record["plant_id"])
                
                # Create user access records for plants that the user doesn't already have access to
                for plant in plants:
                    if plant["id"] not in existing_plant_access:
                        try:
                            await self.db.user_access.insert_one({
                                "id": str(uuid.uuid4()),
                                "user_id": admin["_id"],
                                "company_id": company_id,
                                "plant_id": plant["id"],
                                "role": "plant_admin",
                                "access_level": "validate",
                                "scope": "plant",
                                "created_at": datetime.utcnow(),
                                "updated_at": datetime.utcnow()
                            })
                        except Exception:
                            # If access already exists, continue to the next plant
                            continue
        
        # Return the updated company
        company = await self.get_company(company_id)
        if not company:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")
            
        return company

    async def get_company_plants(self, company_id: str) -> List[Plant]:
        plants = []
        async for doc in self.db.plants.find({"company_id": company_id}):
            plants.append(Plant(**doc))
        return plants
        
    async def remove_report(self, company_id: str, report_id: str) -> Optional[Company]:
        """Remove a report from a company's active reports"""
        # Check if company exists
        company = await self.get_company(company_id)
        if not company:
            return None
            
        # Check if report is assigned to the company
        report_exists = False
        for report in company.active_reports:
            if report.report_id == report_id:
                report_exists = True
                break
                
        if not report_exists:
            raise ValueError(f"Report with ID {report_id} is not assigned to this company")
            
        # Remove the report from active_reports
        await self.collection.update_one(
            {"id": company_id},
            {"$pull": {"active_reports": {"report_id": report_id}}, "$set": {"updated_at": datetime.utcnow()}}
        )
        
        return await self.get_company(company_id)