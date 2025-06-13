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
        await self.collection.create_index([("companyId", 1), ("financialYear", 1)], unique=True)
        await self.collection.create_index([("companyId", 1)])
        await self.collection.create_index([("financialYear", 1)])
        await self.collection.create_index([("status", 1)])

    async def create_report(
        self, 
        company_id: str, 
        financial_year: str
    ) -> str:
        """Create a new environment report"""
        existing_report = await self.collection.find_one({
            "companyId": company_id,
            "financialYear": financial_year
        })
        if existing_report:
            raise ValueError(f"Report already exists for financial year {financial_year}")

        report = EnvironmentReport(
            companyId=company_id,
            financialYear=financial_year
        )
        
        result = await self.collection.insert_one(report.dict())
        return str(result.inserted_id)

    async def get_report(
        self, 
        company_id: str, 
        financial_year: str
    ) -> Optional[EnvironmentReport]:
        """Get an environment report"""
        doc = await self.collection.find_one({
            "companyId": company_id,
            "financialYear": financial_year
        })
        if doc:
            return EnvironmentReport(**doc)
        return None

    async def get_company_reports(
        self,
        company_id: str
    ) -> List[EnvironmentReport]:
        """Get all reports for a company"""
        cursor = self.collection.find({"companyId": company_id})
        reports = []
        async for doc in cursor:
            reports.append(EnvironmentReport(**doc))
        return reports

    async def update_answer(
        self, 
        company_id: str, 
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
        financial_year: str,
        question_id: str,
        question_title: str,
        table_data: Union[List[Dict[str, str]], Dict[str, List[Dict[str, str]]]]
    ) -> bool:
        
        """Update table answer for a specific question"""
        now = datetime.utcnow()
          # Store the raw data directly
        question_answer = QuestionAnswer(
            questionId=question_id,
            questionTitle=question_title,
            updatedData=table_data,  # Store the raw table data as is
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