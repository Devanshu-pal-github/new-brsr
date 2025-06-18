from datetime import datetime
from typing import List, Optional, Dict, Any, Union
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo.operations import UpdateOne
from models.environment import EnvironmentReport, QuestionAnswer, TableResponse, MultiTableResponse
from bson import ObjectId

class EnvironmentService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.collection = db["environment"]

    async def create_indices(self):
        """Create indices for efficient querying"""
        await self.collection.create_index([("companyId", 1), ("plantId", 1), ("financialYear", 1)], unique=True)
        await self.collection.create_index([("companyId", 1)])
        await self.collection.create_index([("plantId", 1)])
        await self.collection.create_index([("financialYear", 1)])
        await self.collection.create_index([("status", 1)])

    async def create_report(
        self, 
        company_id: str,
        plant_id: str,
        financial_year: str
    ) -> str:
        """Create a new environment report"""
        existing_report = await self.collection.find_one({
            "companyId": company_id,
            "plantId": plant_id,
            "financialYear": financial_year
        })
        if existing_report:
            raise ValueError(f"Report already exists for plant {plant_id} in financial year {financial_year}")

        # Get plant details to determine plant type
        plant_doc = await self.db.plants.find_one({"id": plant_id})
        if not plant_doc:
            raise ValueError(f"Plant {plant_id} not found")

        # Create a new report with empty answers
        report = {
            "companyId": company_id,
            "plantId": plant_id,
            "plant_type": plant_doc.get("plant_type", "regular"),  # Get plant type from plant document
            "financialYear": financial_year,
            "answers": {},  # Initialize with empty object
            "status": "draft",
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow(),
            "version": 1
        }
        
        result = await self.collection.insert_one(report)
        return str(result.inserted_id)

    async def get_report(
        self, 
        company_id: str,
        plant_id: str,
        financial_year: str
    ) -> Optional[EnvironmentReport]:
        """Get an environment report"""
        doc = await self.collection.find_one({
            "companyId": company_id,
            "plantId": plant_id,
            "financialYear": financial_year
        })
        if doc:
            return EnvironmentReport(**doc)
        return None

    async def get_company_reports(
        self,
        company_id: str,
        plant_id: Optional[str] = None,
        financial_year: Optional[str] = None
    ) -> List[EnvironmentReport]:
        """Get all reports for a company, optionally filtered by plant and financial year"""
        query = {"companyId": company_id}
        if plant_id:
            query["plantId"] = plant_id
        if financial_year:
            query["financialYear"] = financial_year

        print(query)
        cursor = self.collection.find(query)
        reports = []
        async for doc in cursor:
            reports.append(EnvironmentReport(**doc))
        return reports

    async def update_answer(
        self, 
        company_id: str,
        plant_id: str,
        financial_year: str, 
        question_id: str,
        question_title: str, 
        answer_data: Dict[str, Any]
    ) -> bool:
        """Update answer for a specific question"""
        now = datetime.utcnow()
        
        question_answer = QuestionAnswer(
            questionId=question_id,
            questionTitle=question_title,
            updatedData=answer_data,
            lastUpdated=now
        )

        result = await self.collection.update_one(
            {
                "companyId": company_id,
                "plantId": plant_id,
                "financialYear": financial_year
            },
            {
                "$set": {
                    f"answers.{question_id}": question_answer.dict(),
                    "updatedAt": now
                }
            }
        )
        return result.modified_count > 0

    async def add_comment(
        self, 
        company_id: str, 
        financial_year: str, 
        question_id: str, 
        comment: Dict[str, Any]
    ) -> bool:
        """Add a comment to a specific question"""
        now = datetime.utcnow()
        comment["timestamp"] = now
        
        result = await self.collection.update_one(
            {
                "companyId": company_id,
                "financialYear": financial_year
            },
            {
                "$push": {
                    f"answers.{question_id}.comments": comment
                },
                "$set": {
                    "updatedAt": now
                }
            }
        )
        return result.modified_count > 0

    async def update_attachments(
        self, 
        company_id: str, 
        financial_year: str,
        question_id: str, 
        attachments: List[str]
    ) -> bool:
        """Update attachments for a specific question"""
        now = datetime.utcnow()
        
        result = await self.collection.update_one(
            {
                "companyId": company_id,
                "financialYear": financial_year
            },
            {
                "$set": {
                    f"answers.{question_id}.attachments": attachments,
                    f"answers.{question_id}.lastUpdated": now,
                    "updatedAt": now
                }
            }
        )
        return result.modified_count > 0

    async def update_status(
        self,
        company_id: str,
        financial_year: str,
        status: str
    ) -> bool:
        """Update the status of an environment report"""
        now = datetime.utcnow()
        result = await self.collection.update_one(
            {
                "companyId": company_id,
                "financialYear": financial_year
            },
            {
                "$set": {
                    "status": status,
                    "updatedAt": now
                }
            }
        )
        return result.modified_count > 0

    async def bulk_update_answers(
        self,
        company_id: str,
        financial_year: str,
        answers: Dict[str, Dict[str, Any]]
    ) -> bool:
        """Bulk update answers for multiple questions"""
        now = datetime.utcnow()
        update_dict = {}
        
        for question_id, answer_data in answers.items():
            question_answer = QuestionAnswer(
                questionId=question_id,
                questionTitle=answer_data.get("questionTitle", ""),
                updatedData=answer_data.get("answer_data", {}),
                lastUpdated=now
            )
            update_dict[f"answers.{question_id}"] = question_answer.dict()
        
        update_dict["updatedAt"] = now
        
        result = await self.collection.update_one(
            {
                "companyId": company_id,
                "financialYear": financial_year
            },
            {"$set": update_dict}
        )
        return result.modified_count > 0

    async def update_table_answer(
        self,
        company_id: str,
        plant_id: str,
        financial_year: str,
        question_id: str,
        question_title: str,
        table_data: Union[List[Dict[str, str]], Dict[str, List[Dict[str, str]]]]
    ) -> bool:
        """Update table answer for a specific question"""
        now = datetime.utcnow()
        question_answer = QuestionAnswer(
            questionId=question_id,
            questionTitle=question_title,
            updatedData=table_data,
            lastUpdated=now
        )

        result = await self.collection.update_one(
            {
                "companyId": company_id,
                "plantId": plant_id,
                "financialYear": financial_year
            },
            {
                "$set": {
                    f"answers.{question_id}": question_answer.dict(),
                    "updatedAt": now
                }
            }
        )
        return result.modified_count > 0

    async def patch_table_answer(
        self,
        company_id: str,
        plant_id: str,
        financial_year: str,
        question_id: str,
        question_title: str,
        row_updates: List[Dict[str, Union[int, str]]]
    ) -> bool:
        """Update specific rows in a table answer"""
        now = datetime.utcnow()

        # First get the existing answer
        report = await self.collection.find_one({
            "companyId": company_id,
            "plantId": plant_id,
            "financialYear": financial_year
        })

        if not report:
            return False

        # Get existing answer data or initialize empty array
        existing_answer = report.get("answers", {}).get(question_id, {})
        existing_data = existing_answer.get("updatedData", [])
        
        if not isinstance(existing_data, list):
            # Handle case where existing data is not an array (e.g., multi-table)
            return False

        # Process and validate all row indices first
        validated_updates = []
        max_index = -1
        for update in row_updates:
            try:
                index = int(update["row_index"])
                if index < 0:
                    return False  # Reject negative indices
                max_index = max(max_index, index)
                validated_updates.append({
                    "row_index": index,
                    "current_year": str(update["current_year"]),
                    "previous_year": str(update["previous_year"])
                })
            except (ValueError, TypeError):
                return False  # Invalid row_index that can't be converted to int

        # Ensure the list has enough capacity
        while len(existing_data) <= max_index:
            existing_data.append({"current_year": "", "previous_year": ""})

        # Apply the validated updates
        for update in validated_updates:
            index = update["row_index"]
            existing_data[index] = {
                "current_year": update["current_year"],
                "previous_year": update["previous_year"]
            }

        # Create or update the answer
        question_answer = QuestionAnswer(
            questionId=question_id,
            questionTitle=question_title,
            updatedData=existing_data,
            lastUpdated=now
        )

        result = await self.collection.update_one(
            {
                "companyId": company_id,
                "plantId": plant_id,
                "financialYear": financial_year
            },
            {
                "$set": {
                    f"answers.{question_id}": question_answer.dict(),
                    "updatedAt": now
                }
            }
        )
        return result.modified_count > 0

    async def update_subjective_answer(
        self,
        company_id: str,
        financial_year: str,
        question_id: str,
        question_title: str,
        answer_text: str
    ) -> bool:
        """Update a subjective answer for a specific question"""
        now = datetime.utcnow()
        
        question_answer = QuestionAnswer(
            questionId=question_id,
            questionTitle=question_title,
            updatedData={
                "type": "subjective",
                "text": answer_text
            },
            lastUpdated=now
        )

        result = await self.collection.update_one(
            {
                "companyId": company_id,
                "financialYear": financial_year
            },
            {
                "$set": {
                    f"answers.{question_id}": question_answer.dict(),
                    "updatedAt": now
                }
            }
        )
        return result.modified_count > 0

    async def update_audit_status(
        self,
        company_id: str,
        financial_year: str,
        question_id: str,
        audit_status: bool
    ) -> bool:
        """Update audit status for a specific question"""
        now = datetime.utcnow()
        
        result = await self.collection.update_one(
            {
                "companyId": company_id,
                "financialYear": financial_year
            },
            {
                "$set": {
                    f"answers.{question_id}.auditStatus": audit_status,
                    "updatedAt": now
                }
            }
        )
        return result.modified_count > 0

