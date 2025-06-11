from typing import List, Optional, Any
from motor.motor_asyncio import AsyncIOMotorDatabase
from models.question import (
    Question, QuestionCreate, QuestionUpdate, QuestionWithCategory,
    ValidationRule, QuestionDependency
)
from datetime import datetime
from fastapi import HTTPException, status
import uuid
class QuestionService:
    def __init__(self, db: AsyncIOMotorDatabase):  # type: ignore
        self.db = db
        self.collection = db.questions

    async def create_question(
        self,
        category_id: str,
        question_data: QuestionCreate
    ) -> Question:
        """
        Create a new question and add it to the specified category.
        Why: Enforces category-question relationship and ensures order is maintained.
        """
        # Check if category exists
        category = await self.db.categories.find_one({"_id": category_id})
        if not category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Category not found"
            )

        # Prepare question document
        question_dict = question_data.model_dump()
        question_dict["_id"] = str(uuid.uuid4())
        question_dict["id"] = question_dict["_id"]
        question_dict["category_id"] = category_id
        question_dict["created_at"] = datetime.utcnow()
        question_dict["updated_at"] = datetime.utcnow()

        # Get the order (last question's order + 1)
        last_question = await self.db.questions.find_one(
            {"category_id": category_id},
            sort=[("order", -1)]
        )
        question_dict["order"] = (last_question["order"] + 1) if last_question else 0

        # Insert into database
        await self.db.questions.insert_one(question_dict)

        # Update category's question_ids
        await self.db.categories.update_one(
            {"_id": category_id},
            {"$push": {"question_ids": question_dict["_id"]}}
        )

        return Question(**question_dict)

    async def get_question(
        self,
        question_id: str,
        include_category: bool = False
    ) -> Question:
        """
        Retrieve a question by its ID. Optionally include category/module info.
        Why: Supports both direct question fetch and context-aware fetch for UI/business logic.
        """
        question = await self.collection.find_one({"_id": question_id})
        if not question:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Question not found"
            )

        if include_category:
            # Get category information
            category = await self.db.categories.find_one({"_id": question["category_id"]})
            if category:
                # Find module containing this category
                module = await self.db.modules.find_one({
                    "sub_modules.categories": question["category_id"]
                })
                if module:
                    return QuestionWithCategory(
                        **question,
                        category_name=category["name"],
                        module_id=module["_id"],
                        module_name=module["name"]
                    )

        return Question(**question)

    async def list_questions(
        self,
        category_id: Optional[str] = None,
        module_id: Optional[str] = None,
        skip: int = 0,
        limit: int = 10
    ) -> List[Question]:
        """
        List questions by category or module, with pagination.
        Why: Enables efficient UI rendering and admin management.
        """
        query = {}
        if category_id:
            query["category_id"] = category_id
        elif module_id:
            # Find all categories in the module
            categories = await self._get_module_categories(module_id)
            if categories:
                query["category_id"] = {"$in": categories}

        questions = []
        cursor = self.collection.find(query).skip(skip).limit(limit)
        async for question in cursor:
            questions.append(Question(**question))
        return questions

    async def update_question(
        self,
        question_id: str,
        question_data: QuestionUpdate
    ) -> Question:
        """
        Update question details.
        Why: Allows admin to correct or improve question metadata/logic.
        """
        update_data = question_data.model_dump(exclude_unset=True)
        if update_data:
            update_data["updated_at"] = datetime.utcnow()
            result = await self.collection.update_one(
                {"_id": question_id},
                {"$set": update_data}
            )
            if result.modified_count == 0:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Question not found"
                )

        question = await self.collection.find_one({"_id": question_id})
        if not question:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Question not found after update"
            )
        return Question(**question)

    async def delete_question(self, question_id: str) -> bool:
        """
        Delete a question and remove its reference from the category.
        Why: Maintains referential integrity and prevents orphaned data.
        """
        # Get question to find category_id
        question = await self.get_question(question_id)

        # Remove question_id from category
        await self.db.categories.update_one(
            {"_id": question.category_id},
            {"$pull": {"question_ids": question_id}}
        )

        # Delete question
        result = await self.collection.delete_one({"_id": question_id})
        return result.deleted_count > 0

    async def _get_category_info(self, category_id: str) -> Optional[dict]:
        """
        Get category information including its module details.
        Why: Used for context-aware question management and UI display.
        """
        pipeline = [
            {"$match": {"submodules.categories._id": category_id}},
            {"$unwind": "$submodules"},
            {"$unwind": "$submodules.categories"},
            {"$match": {"submodules.categories._id": category_id}},
            {
                "$project": {
                    "category_name": "$submodules.categories.name",
                    "module_id": "$_id",
                    "module_name": "$name"
                }
            }
        ]
        result = await self.db.modules.aggregate(pipeline).to_list(length=1)
        return result[0] if result else None

    async def _get_module_categories(self, module_id: str) -> List[str]:
        """
        Get all category IDs in a module.
        Why: Supports listing/filtering questions by module for admin/UI.
        """
        module = await self.db.modules.find_one({"_id": module_id})
        if not module:
            return []

        categories = []
        for submodule in module.get("submodules", []):
            for category_id in submodule.get("categories", []):
                categories.append(category_id)
        return categories

    async def update_question_order(
        self,
        question_id: str,
        new_order: int
    ) -> Question:
        """
        Update the order of a question within its category.
        Why: Maintains question sequence for UI and business logic.
        """
        # Get question to find current order and category
        question = await self.get_question(question_id)
        old_order = question.order

        if old_order == new_order:
            return question

        # Update orders of other questions in the category
        if new_order > old_order:
            # Moving down: decrease order of questions in between
            await self.collection.update_many(
                {
                    "category_id": question.category_id,
                    "order": {"$gt": old_order, "$lte": new_order}
                },
                {"$inc": {"order": -1}}
            )
        else:
            # Moving up: increase order of questions in between
            await self.collection.update_many(
                {
                    "category_id": question.category_id,
                    "order": {"$gte": new_order, "$lt": old_order}
                },
                {"$inc": {"order": 1}}
            )

        # Update question's order
        result = await self.collection.update_one(
            {"_id": question_id},
            {
                "$set": {
                    "order": new_order,
                    "updated_at": datetime.utcnow()
                }
            }
        )

        if result.modified_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Question not found"
            )

        return await self.get_question(question_id)

    async def add_validation_rule(
        self,
        question_id: str,
        rule: ValidationRule
    ) -> Question:
        """
        Add a validation rule to a question.
        Why: Supports dynamic, data-driven validation logic for all question types.
        """
        # Check if question exists
        _ = await self.get_question(question_id)

        # Add validation rule
        result = await self.collection.update_one(
            {"_id": question_id},
            {
                "$push": {"validation_rules": rule.model_dump()},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )

        if result.modified_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Question not found"
            )

        return await self.get_question(question_id)

    async def add_dependency(
        self,
        question_id: str,
        dependency: QuestionDependency
    ) -> Question:
        """
        Add a dependency to a question as a validation rule.
        Why: Enables conditional logic and inter-question dependencies.
        """
        # Check if question exists
        _ = await self.get_question(question_id)

        # Check if dependent question exists
        dependent_question = await self.get_question(dependency.question_id)

        # Add dependency as a validation rule (custom structure)
        validation_rule = {
            "type": "dependency",
            "parameters": {
                "question_id": dependency.question_id,
                "operator": dependency.operator,
                "value": dependency.value
            },
            "error_message": (
                dependency.error_message or
                f"This question depends on the answer to question {getattr(dependent_question, 'question_text', '')}"
            )
        }

        result = await self.collection.update_one(
            {"_id": question_id},
            {
                "$push": {"validation_rules": validation_rule},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )

        if result.modified_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Question not found"
            )

        return await self.get_question(question_id)

    async def get_category_questions(
        self,
        category_id: str,
        include_category: bool = False
    ) -> list[Question]:
        """
        Get all questions in a category, ordered by 'order'.
        Why: Supports UI rendering and admin workflows.
        """
        cursor = self.collection.find(
            {"category_id": category_id},
            sort=[("order", 1)]
        )
        questions = [q async for q in cursor]

        if include_category:
            category = await self.db.categories.find_one({"_id": category_id})
            if category:
                module = await self.db.modules.find_one({
                    "sub_modules.categories": category_id
                })
                if module:
                    return [
                        QuestionWithCategory(
                            **q,
                            category_name=category["name"],
                            module_id=module["_id"],
                            module_name=module["name"]
                        )
                        for q in questions
                    ]

        return [Question(**q) for q in questions]

    async def validate_question_value(
        self,
        question_id: str,
        value: Any,
        context: Optional[dict] = None
    ) -> tuple[bool, list[str]]:
        """
        Validate a value against a question's validation rules.
        Why: Ensures all business and data integrity rules are enforced at the service layer.
        """
        question = await self.get_question(question_id)
        errors = []

        # Each rule is a dict (from DB), not a ValidationRule object
        for rule in question.validation_rules:
            rule_type = rule.get("type")
            parameters = rule.get("parameters", {})
            error_message = rule.get("error_message", "Validation failed.")
            condition = rule.get("condition")

            # Conditional validation
            if condition and context:
                try:
                    if not eval(condition, {"context": context}):
                        continue
                except Exception as e:
                    errors.append(f"Error evaluating condition: {str(e)}")
                    continue

            if rule_type == "required":
                if value is None or (isinstance(value, str) and not value.strip()):
                    errors.append(error_message)

            elif rule_type == "min":
                min_value = parameters.get("value")
                if min_value is not None:
                    if isinstance(value, (int, float)) and value < min_value:
                        errors.append(error_message)

            elif rule_type == "max":
                max_value = parameters.get("value")
                if max_value is not None:
                    if isinstance(value, (int, float)) and value > max_value:
                        errors.append(error_message)

            elif rule_type == "range":
                min_value = parameters.get("min")
                max_value = parameters.get("max")
                if min_value is not None and max_value is not None:
                    if isinstance(value, (int, float)):
                        if value < min_value or value > max_value:
                            errors.append(error_message)

            elif rule_type == "regex":
                import re
                pattern = parameters.get("pattern")
                if pattern and isinstance(value, str):
                    if not re.match(pattern, value):
                        errors.append(error_message)

            elif rule_type == "format":
                format_type = parameters.get("type")
                if format_type == "email":
                    import re
                    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
                    if not re.match(email_pattern, str(value)):
                        errors.append(error_message)

        return (len(errors) == 0, errors)