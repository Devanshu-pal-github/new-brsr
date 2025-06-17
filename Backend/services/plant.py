from typing import List, Optional, Dict
# from pymongo.database import Database
from motor.motor_asyncio import AsyncIOMotorDatabase
from models.plant import PlantCreate, PlantUpdate, Plant, PlantWithCompany, PlantWithAnswers, PlantType, PlantValidationStatus as ValidationStatus, AggregatedData
from datetime import datetime
from fastapi import HTTPException, status
import uuid
from bson import ObjectId

class PlantService:
    def __init__(self, db: AsyncIOMotorDatabase):  # type: ignore
        self.db = db
        self.collection = db.plants

    async def create_plant(self, plant_data: PlantCreate) -> Plant:
        """Create a new plant"""
    
        # Check if company exists
        company = await self.db.companies.find_one({"id": plant_data.company_id})
        if not company:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Company not found"
            )

        # Check if plant code already exists for company
        existing_plant = await self.db.plants.find_one({
            "company_id": plant_data.company_id,
            "plant_code": plant_data.code
        })
        if existing_plant:
            raise ValueError(f"Plant with code {plant_data.code} already exists for this company")

        # Ensure C001 and P001 are unique and only created during company creation
        if plant_data.code in ["C001", "P001"]:
            raise ValueError(f"Plant code {plant_data.code} is reserved for system use and cannot be manually created")

        # For manually added plants, ensure type is 'regular'
        if plant_data.type != PlantType.REGULAR:
            plant_data.type = PlantType.REGULAR

        plant_dict = {
            "id": str(uuid.uuid4()),
            "plant_code": plant_data.code,
            "plant_name": plant_data.name,
            "company_id": plant_data.company_id,
            "plant_type": plant_data.type.value,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }

        # Set access level based on plant type
        if plant_data.type in [PlantType.AGGREGATOR, PlantType.HOME]:
            # C001 and P001 plants get all modules from company's active reports
            company = await self.db.companies.find_one({"_id": plant_data.company_id})
            access_modules = []
            for report in company.get("active_reports", []):
                access_modules.extend(report.get("basic_modules", []))
                access_modules.extend(report.get("calc_modules", []))
            plant_dict["access_level"] = list(set(access_modules))
        else:
            # Regular plants only get calc modules
            company = await self.db.companies.find_one({"_id": plant_data.company_id})
            calc_modules = []
            for report in company.get("active_reports", []):
                calc_modules.extend(report.get("calc_modules", []))
            plant_dict["access_level"] = list(set(calc_modules))

        # Insert plant and update company
        await self.db.plants.insert_one(plant_dict)
        await self.db.companies.update_one(
            {"_id": plant_data.company_id},
            {
                "$push": {"plant_ids": plant_dict["id"]},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )

        # Find plant admins for this company and assign them the calc modules
        plant_admins = await self.db.users.find({
            "company_id": plant_data.company_id,
            "role": "plant_admin"
        }).to_list(length=None)
        
        # Get calc modules from the company's active reports
        calc_modules = []
        for report in company.get("active_reports", []):
            calc_modules.extend(report.get("calc_modules", []))
        
        # Assign calc modules to all plant admins
        if calc_modules and plant_admins:
            for admin in plant_admins:
                await self.db.users.update_one(
                    {"_id": admin["_id"]},
                    {"$addToSet": {"access_modules": {"$each": calc_modules}}}
                )

        return Plant(**plant_dict)

    async def get_plant(
        self,
        plant_id: str,
        include_company: bool = False,
        include_answers: bool = False
    ) -> Optional[Plant]:
        """Get plant by ID, optionally including company or answers info."""
        plant = await self.collection.find_one({"_id": plant_id})
        if not plant:
            return None

        if include_company:
            company = await self.db.companies.find_one({"_id": plant["company_id"]})
            if company:
                return PlantWithCompany(**plant, company_name=company["name"])

        if include_answers:
            answer_count = await self.db.answers.count_documents({"plant_id": plant_id})
            reports_data = await self._get_plant_reports_data(plant_id, plant["company_id"])
            return PlantWithAnswers(
                **plant,
                answer_count=answer_count,
                reports_data=reports_data
            )

        return Plant(**plant)

    async def update_plant(self, plant_id: str, plant_data: PlantUpdate) -> Plant:
        """Update plant details"""
        update_data = plant_data.model_dump(exclude_unset=True)
        if update_data:
            update_data["updated_at"] = datetime.utcnow()
            result = await self.db.plants.update_one(
                {"_id": plant_id},
                {"$set": update_data}
            )
            if result.modified_count == 0:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Plant not found"
                )

        plant = await self.db.plants.find_one({"_id": plant_id})
        return Plant(**plant)

    async def validate_data(
        self,
        plant_id: str,
        module_id: str,
        financial_year: str,
        validation_notes: Optional[str] = None
    ) -> ValidationStatus:
        """Validate data for P001 plant"""
        plant = await self.get_plant(plant_id)
        if not plant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Plant not found"
            )
        if plant.plant_type != PlantType.HOME:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only P001 plant can validate data"
            )
        validation_status = ValidationStatus(
            plant_id=plant_id,
            plant_name=plant.plant_name,
            module_id=module_id,
            module_name="",  # Placeholder, fetch if available
            total_questions=0,  # Placeholder, set real value if available
            answered_questions=0,  # Placeholder, set real value if available
            validation_errors=[],  # Placeholder, set real value if available
            last_updated=datetime.utcnow()
        )
        await self.db.validation_status.insert_one(validation_status.model_dump())
        return validation_status

    async def aggregate_data(
        self,
        plant_id: str,
        module_id: str,
        financial_year: str,
        data: dict
    ) -> AggregatedData:
        """Aggregate data for C001 plant"""
        plant = await self.get_plant(plant_id)
        if not plant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Plant not found"
            )
        if plant.plant_type != PlantType.AGGREGATOR:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only C001 plant can aggregate data"
            )
        aggregated_data = AggregatedData(
            module_id=module_id,
            financial_year=financial_year,
            data=data
        )
        await self.db.aggregated_data.insert_one(aggregated_data.model_dump())
        return aggregated_data

    async def get_company_plants(self, company_id: str) -> list[Plant]:
        """Get all plants for a company"""
        cursor = self.db.plants.find({"company_id": company_id})
        plants = [Plant(**plant) async for plant in cursor]
        return plants

    async def get_plant_modules(self, plant_id: str) -> list[str]:
        """Get accessible modules for a plant"""
        plant = await self.get_plant(plant_id)
        if not plant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Plant not found"
            )
        return [plant.access_level] if plant.access_level else []

    async def list_plants(
        self,
        company_id: Optional[str] = None,
        skip: int = 0,
        limit: int = 10
    ) -> List[Plant]:
        """List all plants, optionally filtered by company."""
        query = {}
        if company_id:
            query["company_id"] = company_id
        plants = []
        cursor = self.collection.find(query).skip(skip).limit(limit)
        async for plant in cursor:
            plants.append(Plant(**plant))
        return plants

    async def delete_plant(self, plant_id: str) -> bool:
        """Delete a plant by ID, ensuring C001/P001 are protected and answers are cleaned up."""
        # Try to find the plant by 'id' field first
        plant = await self.collection.find_one({"id": plant_id})
        if not plant:
            return False
            
        # Don't allow deletion of C001 or P001 plants
        if plant["plant_code"] in ["C001", "P001"]:
            raise ValueError(f"Cannot delete {plant['plant_code']} plant")
            
        # Delete associated answers first
        await self.db.answers.delete_many({"plant_id": plant_id})
        
        # Delete the plant using the same field we used to find it
        result = await self.collection.delete_one({"id": plant_id})
        return result.deleted_count > 0

    async def _get_plant_reports_data(self, plant_id: str, company_id: str) -> List[Dict]:
        """Get report completion data for a plant."""
        company = await self.db.companies.find_one({"_id": company_id})
        if not company or not company.get("active_report_ids"):
            return []
        reports_data = []
        for report_id in company["active_report_ids"]:
            report = await self.db.reports.find_one({"_id": report_id})
            if report:
                total_questions = 0
                answered_questions = 0
                for module_id in report.get("module_ids", []):
                    module = await self.db.modules.find_one({"_id": module_id})
                    if module:
                        for submodule in module.get("submodules", []):
                            for category in submodule.get("categories", []):
                                question_count = len(category.get("question_ids", []))
                                total_questions += question_count
                                answered_questions += await self.db.answers.count_documents({
                                    "plant_id": plant_id,
                                    "question_id": {"$in": category.get("question_ids", [])}
                                })
                reports_data.append({
                    "report_id": report["_id"],
                    "report_name": report["name"],
                    "total_questions": total_questions,
                    "answered_questions": answered_questions,
                    "completion_percentage": (answered_questions / total_questions * 100) if total_questions > 0 else 0
                })
        return reports_data

    async def get_plants_by_company(self, company_id: str) -> List[Plant]:
        """
        Get all plants for a company with their details
        Args:
            company_id: The ID of the company
        Returns:
            List of Plant objects
        """
        try:
            cursor = self.db.plants.find({"company_id": company_id})
            plants = [Plant(**plant) async for plant in cursor]
            return plants
        except Exception as e:
            raise Exception(f"Error fetching plants: {str(e)}")

    async def get_plant_employees_service(self, company_id: str, plant_id: str):
        """
        Service function to fetch all employees for a specific plant.
        
        Args:
            company_id: ID of the company
            plant_id: ID of the plant
        
        Returns:
            List of employees (users) that belong to the specified plant and company
        """
        try:
            # Query users collection for employees matching company_id and plant_id
            employees = await self.db["users"].find({
                "company_id": company_id,
                "plant_id": plant_id,
                "is_active": True  # Only fetch active users
            }).to_list(length=None)
            
            return employees
        except Exception as e:
            raise Exception(f"Error fetching plant employees: {str(e)}")

    async def get_company_employees_service(self, company_id: str):
        """
        Service function to fetch all employees for a company.
        
        Args:
            company_id: ID of the company
        
        Returns:
            List of employees (users) that belong to the specified company
        """
        try:
            # Query users collection for employees matching company_id
            employees = await self.db["users"].find({
                "company_id": company_id  # Only fetch active users
            }).to_list(length=None)
            
            return employees
        except Exception as e:
            raise Exception(f"Error fetching company employees: {str(e)}")