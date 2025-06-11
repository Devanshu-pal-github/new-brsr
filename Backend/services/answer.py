from typing import List, Optional, Dict, Any
from motor.motor_asyncio import AsyncIOMotorDatabase
from models.answer import (
    AnswerCreate, AnswerUpdate, Answer, AnswerWithDetails,
    AnswerHistory, BulkAnswerCreate, BulkAnswerResponse
)
from datetime import datetime
from fastapi import HTTPException, status
from services.question import QuestionService
import uuid

class AnswerService:
    def __init__(self, db: AsyncIOMotorDatabase):  # type: ignore
        self.db = db
        self.collection = db.answers
        self.question_service = QuestionService(db)

    async def create_answer(
        self,
        question_id: str,
        report_id: str,
        company_id: str,
        plant_id: str,
        financial_year: str,
        answer_data: AnswerCreate,
        user_id: str
    ) -> Answer:
        """
        Create a new answer for a question, enforcing uniqueness and authoritative source logic.
        Why: Ensures data integrity, validation, and correct data flow (P001/C001 logic).
        """
        # Check if question exists
        question = await self.question_service.get_question(question_id)
        if not question:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Question not found"
            )

        # Check if answer already exists
        existing = await self.collection.find_one({
            "question_id": question_id,
            "report_id": report_id,
            "company_id": company_id,
            "plant_id": plant_id,
            "financial_year": financial_year
        })
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Answer already exists"
            )

        # Validate answer value
        is_valid, errors = await self.question_service.validate_question_value(
            question_id,
            answer_data.value,
            None  # No context for initial creation
        )

        # Create answer document
        answer_dict = answer_data.model_dump()
        answer_dict["_id"] = str(uuid.uuid4())
        answer_dict["id"] = answer_dict["_id"]
        answer_dict["question_id"] = question_id
        answer_dict["report_id"] = report_id
        answer_dict["company_id"] = company_id
        answer_dict["plant_id"] = plant_id
        answer_dict["financial_year"] = financial_year
        answer_dict["status"] = "DRAFT"
        answer_dict["validation_errors"] = errors
        answer_dict["created_at"] = datetime.utcnow()
        answer_dict["updated_at"] = answer_dict["created_at"]
        answer_dict["created_by"] = user_id
        answer_dict["updated_by"] = user_id

        # Determine authoritative_source
        plant = await self.db.plants.find_one({'_id': plant_id})
        authoritative_source = None
        if plant and plant.get('plant_code') == 'P001':
            authoritative_source = 'P001'
        elif plant and plant.get('plant_code') == 'C001':
            authoritative_source = 'C001'
        answer_dict['authoritative_source'] = authoritative_source

        # Insert into database
        await self.collection.insert_one(answer_dict)

        # Create history entry
        history_entry = AnswerHistory(
            answer_id=answer_dict["_id"],
            versions=[Answer(**answer_dict)]
        )
        await self.db.answer_history.insert_one(history_entry.model_dump())

        return Answer(**answer_dict)

    async def get_answer(
        self,
        answer_id: str,
        include_details: bool = False
    ) -> Optional[Answer]:
        """
        Retrieve an answer by its ID, optionally with details.
        Why: Supports both direct answer fetch and context-aware fetch for UI/business logic.
        """
        answer = await self.collection.find_one({"_id": answer_id})
        if not answer:
            return None

        if include_details:
            return await self._add_answer_details(answer)

        return Answer(**answer)

    async def list_answers(
        self,
        question_id: Optional[str] = None,
        plant_id: Optional[str] = None,
        category_id: Optional[str] = None,
        module_id: Optional[str] = None,
        status: Optional[str] = None,
        skip: int = 0,
        limit: int = 10
    ) -> List[Answer]:
        """
        List answers by question, plant, category, or module, with pagination.
        Why: Enables efficient UI rendering and admin management.
        """
        query = {}
        if question_id:
            query["question_id"] = question_id
        if plant_id:
            query["plant_id"] = plant_id
        if status:
            query["status"] = status

        # Handle category and module filtering
        if category_id or module_id:
            questions = []
            if category_id:
                # Find all questions in the category
                async for q in self.db.questions.find({"category_id": category_id}):
                    questions.append(q["_id"])
            elif module_id:
                # Find all questions in the module's categories
                module = await self.db.modules.find_one({"_id": module_id})
                if module:
                    for submodule in module.get("submodules", []):
                        for category in submodule.get("categories", []):
                            async for q in self.db.questions.find({"category_id": category["_id"]}):
                                questions.append(q["_id"])
            if questions:
                query["question_id"] = {"$in": questions}
            else:
                return []

        answers = []
        cursor = self.collection.find(query).skip(skip).limit(limit)
        async for answer in cursor:
            answers.append(Answer(**answer))
        return answers

    async def update_answer(
        self,
        answer_id: str,
        answer_data: AnswerUpdate,
        user_id: str
    ) -> Optional[Answer]:
        """
        Update answer details, enforcing status and validation rules.
        Why: Ensures only draft/rejected answers can be updated and all changes are validated.
        """
        # Get current answer
        answer = await self.get_answer(answer_id)
        if not answer:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Answer not found"
            )

        # Check if answer can be updated
        if answer.status not in ["DRAFT", "REJECTED"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot update answer in current status"
            )

        update_data = answer_data.model_dump(exclude_unset=True)
        if update_data:
            # If value is being updated, validate it
            if "value" in update_data:
                is_valid, errors = await self.question_service.validate_question_value(
                    answer.question_id,
                    update_data["value"],
                    None  # No context for update
                )
                update_data["validation_errors"] = errors

            update_data["updated_at"] = datetime.utcnow()
            update_data["updated_by"] = user_id

            result = await self.collection.find_one_and_update(
                {"_id": answer_id},
                {"$set": update_data},
                return_document=True
            )
            if result:
                # Create history entry
                history_entry = AnswerHistory(
                    answer_id=answer_id,
                    versions=[Answer(**result)]
                )
                await self.db.answer_history.insert_one(history_entry.model_dump())
                return Answer(**result)
        return answer

    async def delete_answer(self, answer_id: str) -> bool:
        """
        Archive the answer before deletion and then delete it.
        Why: Maintains audit trail and prevents data loss.
        """
        current = await self.collection.find_one({"_id": answer_id})
        if current:
            await self._archive_answer(current)
        result = await self.collection.delete_one({"_id": answer_id})
        return result.deleted_count > 0

    async def get_answer_history(self, answer_id: str) -> Optional[AnswerHistory]:
        """
        Retrieve the version history of an answer, including archived versions.
        Why: Supports audit trail and regulatory compliance.
        """
        current = await self.collection.find_one({"_id": answer_id})
        if not current:
            return None
        # Get archived versions
        archived = []
        cursor = self.db.answers_archive.find({"original_id": answer_id}).sort("version", 1)
        async for doc in cursor:
            archived.append(doc)
        # Combine all versions
        versions = [Answer(**v) for v in archived] + [Answer(**current)]
        return AnswerHistory(
            answer_id=answer_id,
            versions=versions
        )

    async def bulk_create_answers(self, bulk_create: BulkAnswerCreate) -> BulkAnswerResponse:
        """
        Create multiple answers for a plant in bulk.
        Why: Improves efficiency for large data entry operations.
        """
        response = BulkAnswerResponse()
        # Verify plant exists
        plant = await self.db.plants.find_one({"_id": bulk_create.plant_id})
        if not plant:
            raise ValueError(f"Plant with ID {bulk_create.plant_id} not found")
        for answer_data in bulk_create.answers:
            try:
                answer = AnswerCreate(
                    value=answer_data.get("value"),
                    metadata=answer_data.get("metadata"),
                    comments=answer_data.get("comments")
                )
                created = await self.create_answer(
                    question_id=answer_data["question_id"],
                    report_id=answer_data.get("report_id", ""),
                    company_id=answer_data.get("company_id", ""),
                    plant_id=bulk_create.plant_id,
                    financial_year=answer_data.get("financial_year", ""),
                    answer_data=answer,
                    user_id=answer_data.get("user_id", "system")
                )
                response.success.append(created)
            except Exception as e:
                response.errors.append({
                    "question_id": answer_data.get("question_id"),
                    "error": str(e)
                })
        return response

    async def _archive_answer(self, answer: Dict[str, Any]) -> None:
        """
        Archive an answer version for audit/history.
        Why: Maintains a complete audit trail for compliance and rollback.
        """
        archive_data = answer.copy()
        archive_data["original_id"] = archive_data.pop("_id")
        archive_data["archived_at"] = datetime.utcnow()
        await self.db.answers_archive.insert_one(archive_data)

    async def _add_answer_details(self, answer: Dict[str, Any]) -> AnswerWithDetails:
        """
        Add related details (question, plant, company, category, module) to an answer.
        Why: Supports rich UI and reporting needs.
        """
        question = await self.db.questions.find_one({"_id": answer["question_id"]})
        plant = await self.db.plants.find_one({"_id": answer["plant_id"]})
        company = await self.db.companies.find_one({"_id": plant["company_id"]}) if plant else None
        # Get category and module info
        category_info = await self._get_category_info(question["category_id"]) if question else None
        return AnswerWithDetails(
            **answer,
            question_text=question["text"] if question else "Unknown",
            question_type=question["question_type"] if question else "Unknown",
            plant_name=plant["name"] if plant else "Unknown",
            company_name=company["name"] if company else "Unknown",
            category_name=category_info["category_name"] if category_info else "Unknown",
            module_name=category_info["module_name"] if category_info else "Unknown"
        )

    async def _get_category_info(self, category_id: str) -> Optional[Dict[str, str]]:
        """
        Get category and module information for a given category ID.
        Why: Supports context-aware answer details and reporting.
        """
        pipeline = [
            {"$match": {"submodules.categories._id": category_id}},
            {"$unwind": "$submodules"},
            {"$unwind": "$submodules.categories"},
            {"$match": {"submodules.categories._id": category_id}},
            {
                "$project": {
                    "category_name": "$submodules.categories.name",
                    "module_name": "$name"
                }
            }
        ]
        result = await self.db.modules.aggregate(pipeline).to_list(length=1)
        return result[0] if result else None

    async def get_final_answer(
        self,
        question_id: str,
        company_id: str,
        financial_year: str
    ) -> Optional[Answer]:
        """
        Get the authoritative answer for a question/year/company, preferring P001 over C001.
        Why: Implements authoritative_source logic as per CHECKLIST.md.
        """
        # Prefer P001 authoritative answer
        p001_answer = await self.collection.find_one({
            'question_id': question_id,
            'company_id': company_id,
            'financial_year': financial_year,
            'authoritative_source': 'P001'
        })
        if p001_answer:
            return Answer(**p001_answer)
        # Fallback to C001
        c001_answer = await self.collection.find_one({
            'question_id': question_id,
            'company_id': company_id,
            'financial_year': financial_year,
            'authoritative_source': 'C001'
        })
        if c001_answer:
            return Answer(**c001_answer)
        return None