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
        # Check if category exists and find its module
        category_info = await self._get_category_info(category_id)
        if not category_info:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Category not found"
            )

        # Prepare question document
        question_dict = question_data.model_dump()
        question_dict["_id"] = str(uuid.uuid4())
        question_dict["id"] = question_dict["_id"]
        question_dict["category_id"] = category_id
        question_dict["module_id"] = category_info.get("module_id")
        question_dict["created_at"] = datetime.utcnow()
        question_dict["updated_at"] = datetime.utcnow()

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
            category_info = await self._get_category_info(question["category_id"])
            if category_info:
                return QuestionWithCategory(
                    **question,
                    category_name=category_info["category_name"],
                    module_name=category_info["module_name"]
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
            query["module_id"] = module_id

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
        # First check if question exists
        existing_question = await self.collection.find_one({"_id": question_id})
        if not existing_question:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Question not found"
            )
            
        update_data = question_data.model_dump(exclude_unset=True)
        if update_data:
            update_data["updated_at"] = datetime.utcnow()
            await self.collection.update_one(
                {"_id": question_id},
                {"$set": update_data}
            )

        # Get updated question
        question = await self.collection.find_one({"_id": question_id})
        return Question(**question)

    async def delete_question(self, question_id: str) -> bool:
        """
        Delete a question and remove its reference from the category.
        Why: Maintains referential integrity and prevents orphaned data.
        """
        # Get question to find category_id and module_id
        question = await self.collection.find_one({"_id": question_id})
        if not question:
            return False
            
        # Get module_id from the question
        module_id = question.get("module_id")
        if not module_id:
            # If module_id is not in the question, try to find it through the category
            category_id = question.get("category_id")
            if category_id:
                # Find the module that contains this category
                module = await self.db.modules.find_one(
                    {"submodules.categories.id": category_id},
                    {"_id": 1}
                )
                if module:
                    module_id = module["_id"]
        
        # Remove question_id from category
        await self.db.modules.update_one(
            {"submodules.categories.id": question.get("category_id")},
            {"$pull": {"submodules.$[].categories.$[cat].question_ids": question_id}},
            array_filters=[{"cat.id": question.get("category_id")}]
        )

        # Remove question from module answers if module_id is found
        if module_id:
            module_answers_collection = self.db[f"module_answers_{module_id}"]
            # Remove the question ID from all answers in the collection
            await module_answers_collection.update_many(
                {}, # Match all documents
                {"$unset": {f"answers.{question_id}": ""}, "$set": {"updated_at": datetime.utcnow()}}
            )

        # Delete question
        result = await self.collection.delete_one({"_id": question_id})
        return result.deleted_count > 0

    async def _get_category_info(self, category_id: str) -> Optional[dict]:
        """
        Get category information including its module details.
        Why: Used for context-aware question management and UI display.
        """
        # Find the module containing this category
        pipeline = [
            {"$match": {"submodules.categories.id": category_id}},
            {"$unwind": "$submodules"},
            {"$unwind": "$submodules.categories"},
            {"$match": {"submodules.categories.id": category_id}},
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
        Note: This method is kept for backward compatibility but is no longer used
        for filtering questions by module since we now store module_id directly.
        """
        module = await self.db.modules.find_one({"_id": module_id})
        if not module:
            return []

        categories = []
        for submodule in module.get("submodules", []):
            for category in submodule.get("categories", []):
                if isinstance(category, dict) and "_id" in category:
                    categories.append(category["_id"])
                else:
                    categories.append(category)
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
        question_doc = await self.collection.find_one({"_id": question_id})
        if not question_doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Question not found"
            )
            
        old_order = question_doc.get("order", 0)
        category_id = question_doc.get("category_id")

        if old_order == new_order:
            return Question(**question_doc)

        # Update orders of other questions in the category
        if new_order > old_order:
            # Moving down: decrease order of questions in between
            await self.collection.update_many(
                {
                    "category_id": category_id,
                    "order": {"$gt": old_order, "$lte": new_order}
                },
                {"$inc": {"order": -1}}
            )
        else:
            # Moving up: increase order of questions in between
            await self.collection.update_many(
                {
                    "category_id": category_id,
                    "order": {"$gte": new_order, "$lt": old_order}
                },
                {"$inc": {"order": 1}}
            )

        # Update question's order
        await self.collection.update_one(
            {"_id": question_id},
            {
                "$set": {
                    "order": new_order,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        # Get updated question
        updated_question = await self.collection.find_one({"_id": question_id})
        return Question(**updated_question)

    async def add_validation_rule(
        self,
        question_id: str,
        rule: ValidationRule
    ) -> Question:
        """
        Add a validation rule to a question's metadata.
        Why: Supports dynamic, data-driven validation logic for all question types.
        """
        # Check if question exists
        question_doc = await self.collection.find_one({"_id": question_id})
        if not question_doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Question not found"
            )
            
        # Get current metadata
        metadata = question_doc.get("metadata", {})
        
        # Add validation rule to metadata
        if "validation_rules" not in metadata:
            metadata["validation_rules"] = []
        metadata["validation_rules"].append(rule.model_dump())
        
        # Update question with new metadata
        await self.collection.update_one(
            {"_id": question_id},
            {
                "$set": {
                    "metadata": metadata,
                    "updated_at": datetime.utcnow()
                }
            }
        )

        # Get updated question
        updated_question = await self.collection.find_one({"_id": question_id})
        return Question(**updated_question)

    async def add_dependency(
        self,
        question_id: str,
        dependency: QuestionDependency
    ) -> Question:
        """
        Add a dependency to a question's metadata.
        Why: Enables conditional logic and inter-question dependencies.
        """
        # Check if question exists
        question_doc = await self.collection.find_one({"_id": question_id})
        if not question_doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Question not found"
            )

        # Check if dependent question exists
        dependent_question_doc = await self.collection.find_one({"_id": dependency.question_id})
        if not dependent_question_doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Dependent question with ID {dependency.question_id} not found"
            )

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
                f"This question depends on the answer to question {dependent_question_doc.get('human_readable_id', '')}"
            )
        }

        # Get current metadata
        metadata = question_doc.get("metadata", {})
        
        # Add dependency to metadata
        if "validation_rules" not in metadata:
            metadata["validation_rules"] = []
        metadata["validation_rules"].append(validation_rule)
        
        # Update question with new metadata
        await self.collection.update_one(
            {"_id": question_id},
            {
                "$set": {
                    "metadata": metadata,
                    "updated_at": datetime.utcnow()
                }
            }
        )

        # Get updated question
        updated_question = await self.collection.find_one({"_id": question_id})
        return Question(**updated_question)

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
            # Get category info including module details
            category_info = await self._get_category_info(category_id)
            if category_info:
                return [
                    QuestionWithCategory(
                        **q,
                        category_name=category_info.get("category_name", ""),
                        module_id=category_info.get("module_id", ""),
                        module_name=category_info.get("module_name", "")
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
        question_doc = await self.collection.find_one({"_id": question_id})
        if not question_doc:
            return False, ["Question not found"]
            
        # Get validation rules from metadata
        metadata = question_doc.get("metadata", {})
        validation_rules = metadata.get("validation_rules", [])
        errors = []

        # Each rule is a dict (from DB), not a ValidationRule object
        for rule in validation_rules:
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
        
    async def create_question_with_category_update(
        self,
        human_readable_id: str,
        category_id: str,
        question_text: str,
        question_type: str,
        metadata: dict = {}
    ) -> Question:
        """
        Create a new question and add its ID to the specified category.
        This API creates a question in the questions collection and updates the category with both the UUID and human readable ID.
        """
        # Check if category exists
        category_info = await self._get_category_info(category_id)
        if not category_info:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Category not found"
            )
            
        # Validate question type
        valid_question_types = ["subjective", "table", "table_with_additional_rows"]
        if question_type not in valid_question_types:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Question type must be one of: {', '.join(valid_question_types)}"
            )
        
        # Get the highest question number to start incrementing from
        highest_question = await self.db.questions.find_one(
            {"category_id": category_id},
            sort=[("question_number", -1)]
        )
        
        next_question_number = 1
        if highest_question and "question_number" in highest_question:
            next_question_number = int(highest_question["question_number"]) + 1
            
        # Prepare question document
        question_id = str(uuid.uuid4())
        question_dict = {
            "_id": question_id,
            "id": question_id,
            "human_readable_id": human_readable_id,
            "category_id": category_id,
            "module_id": category_info.get("module_id"),
            "question_text": question_text,
            "question_type": question_type,
            "question_number": str(next_question_number),
            "metadata": metadata,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }

        # Insert into database
        await self.db.questions.insert_one(question_dict)

        # Update category's question_ids in the modules collection
        await self.db.modules.update_one(
            {"submodules.categories.id": category_id},
            {"$push": {"submodules.$[].categories.$[cat].question_ids": question_id}},
            array_filters=[{"cat.id": category_id}]
        )

        return Question(**question_dict)
        
    async def bulk_create_questions(
        self,
        questions_data: List[dict]
    ) -> List[Question]:
        """
        Bulk create questions and add their IDs to the specified categories.
        This API creates multiple questions in the questions collection and updates the categories with the question IDs.
        """
        created_questions = []
        valid_question_types = ["subjective", "table", "table_with_additional_rows"]
        
        # Group questions by category_id to handle question_number generation efficiently
        questions_by_category = {}
        for question_data in questions_data:
            category_id = question_data.get("category_id")
            if category_id not in questions_by_category:
                questions_by_category[category_id] = []
            questions_by_category[category_id].append(question_data)
        
        # Get the highest question number for each category
        next_question_numbers = {}
        for category_id in questions_by_category.keys():
            highest_question = await self.db.questions.find_one(
                {"category_id": category_id},
                sort=[("question_number", -1)]
            )
            
            next_question_number = 1
            if highest_question and "question_number" in highest_question:
                next_question_number = int(highest_question["question_number"]) + 1
            
            next_question_numbers[category_id] = next_question_number
        
        for question_data in questions_data:
            # Extract data from the question data
            human_readable_id = question_data.get("human_readable_id")
            category_id = question_data.get("category_id")
            question_text = question_data.get("question_text")
            question_type = question_data.get("question_type")
            metadata = question_data.get("metadata", {})
            
            # Validate required fields
            if not all([human_readable_id, category_id, question_text, question_type]):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Missing required fields: human_readable_id, category_id, question_text, question_type"
                )
                
            # Check if category exists
            category_info = await self._get_category_info(category_id)
            if not category_info:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Category with ID {category_id} not found"
                )
                
            # Validate question type
            if question_type not in valid_question_types:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Question type must be one of: {', '.join(valid_question_types)}"
                )
                
            # Prepare question document
            question_id = str(uuid.uuid4())
            
            # Get the next question number for this category
            next_question_number = next_question_numbers[category_id]
            
            question_dict = {
                "_id": question_id,
                "id": question_id,
                "human_readable_id": human_readable_id,
                "category_id": category_id,
                "module_id": category_info.get("module_id"),
                "question_text": question_text,
                "question_type": question_type,
                "question_number": str(next_question_number),
                "metadata": metadata,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            
            # Increment the next question number for this category
            next_question_numbers[category_id] += 1
            
            # Insert into database
            await self.db.questions.insert_one(question_dict)
            
            # Update category's question_ids in the modules collection
            await self.db.modules.update_one(
                {"submodules.categories.id": category_id},
                {"$push": {"submodules.$[].categories.$[cat].question_ids": question_id}},
                array_filters=[{"cat.id": category_id}]
            )
            
            created_questions.append(Question(**question_dict))
            
        return created_questions
        
    async def update_question_metadata(
        self,
        question_id: str,
        metadata: dict
    ) -> Question:
        """
        Update the metadata of a question.
        This API updates only the metadata field of a question.
        """
        # Check if question exists
        question_doc = await self.collection.find_one({"_id": question_id})
        if not question_doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Question not found"
            )
            
        # Update question's metadata
        await self.collection.update_one(
            {"_id": question_id},
            {
                "$set": {
                    "metadata": metadata,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        # Get updated question
        updated_question = await self.collection.find_one({"_id": question_id})
        return Question(**updated_question)