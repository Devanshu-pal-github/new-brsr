from typing import List, Optional, Dict, Any
from motor.motor_asyncio import AsyncIOMotorDatabase
from models.module import (
    Module, ModuleCreate, ModuleUpdate, SubModule,
    Category, ModuleWithDetails, ModuleType
)
from models.question import QuestionCreate, Question
from datetime import datetime
import uuid
from fastapi import HTTPException, status

class ModuleService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.collection = db.modules

    async def create_module(self, module_data: ModuleCreate) -> Module:
        """Create a new module with proper structure"""
        # Validate module_type
        if module_data.module_type not in [ModuleType.BASIC, ModuleType.CALC]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="module_type must be either 'basic' or 'calc'"
            )

        module_dict = module_data.model_dump()
        
        # Generate base module fields
        module_dict["_id"] = str(uuid.uuid4())
        module_dict["id"] = module_dict["_id"]
        module_dict["created_at"] = datetime.utcnow()
        module_dict["updated_at"] = datetime.utcnow()
        module_dict["report_ids"] = []
        module_dict["submodules"] = module_dict.get("submodules", [])

        # Initialize submodules with proper structure
        for submodule in module_dict["submodules"]:
            submodule["id"] = str(uuid.uuid4())
            submodule["created_at"] = datetime.utcnow()
            submodule["updated_at"] = datetime.utcnow()
            submodule["categories"] = submodule.get("categories", [])
            
            # Initialize categories within submodules
            for category in submodule["categories"]:
                category["id"] = str(uuid.uuid4())
                category["created_at"] = datetime.utcnow()
                category["updated_at"] = datetime.utcnow()
                category["question_ids"] = []

        await self.collection.insert_one(module_dict)
        return Module(**module_dict)

    async def get_module(self, module_id: str, include_details: bool = False) -> Module:
        """Get module by ID with enhanced details"""
        module = await self.collection.find_one({"_id": module_id})
        if not module:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Module not found"
            )

        if include_details:
            # Calculate total questions across all categories
            question_count = sum(
                len(category.get("question_ids", []))
                for submodule in module.get("submodules", [])
                for category in submodule.get("categories", [])
            )

            # Get associated reports - extract just the report IDs as strings
            reports = []
            async for report in self.db.reports.find(
                {"$or":[
                    {"module_ids": module_id},
                    {"basic_modules": module_id},
                    {"calc_modules": module_id}
                ]},
                {"_id": 1, "name": 1, "id": 1}
            ):
                # Use the UUID id field if available, otherwise use _id as string
                report_id = report.get("id") or str(report.get("_id"))
                reports.append(report_id)

            return ModuleWithDetails(
                **module,
                question_count=question_count,
                reports=reports
            )

        return Module(**module)

    async def list_modules(
        self,
        skip: int = 0,
        limit: int = 10,
        module_type: Optional[ModuleType] = None
    ) -> List[Module]:
        """List modules with optional filtering"""
        query = {}
        if module_type:
            query["module_type"] = module_type

        modules = []
        cursor = self.collection.find(query).skip(skip).limit(limit)
        async for module in cursor:
            modules.append(Module(**module))
        return modules

    async def update_module(self, module_id: str, module_data: ModuleUpdate) -> Module:
        """Update module with timestamp tracking"""
        update_data = module_data.model_dump(exclude_unset=True)
        if update_data:
            update_data["updated_at"] = datetime.utcnow()
            
            # Update timestamps for nested structures if they're being modified
            if "submodules" in update_data:
                for submodule in update_data["submodules"]:
                    submodule["updated_at"] = datetime.utcnow()
                    if "categories" in submodule:
                        for category in submodule["categories"]:
                            category["updated_at"] = datetime.utcnow()

            result = await self.collection.update_one(
                {"_id": module_id},
                {"$set": update_data}
            )
            if result.modified_count == 0:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Module not found"
                )
        
        return await self.get_module(module_id)

    async def add_sub_module(self, module_id: str, sub_module: SubModule) -> Module:
        """Add a sub-module with proper structure"""
        sub_module_dict = sub_module.model_dump()
        sub_module_dict["id"] = str(uuid.uuid4())
        sub_module_dict["created_at"] = datetime.utcnow()
        sub_module_dict["updated_at"] = datetime.utcnow()
        sub_module_dict["categories"] = sub_module_dict.get("categories", [])

        # Initialize categories if present
        for category in sub_module_dict["categories"]:
            category["id"] = str(uuid.uuid4())
            category["created_at"] = datetime.utcnow()
            category["updated_at"] = datetime.utcnow()
            category["question_ids"] = []

        result = await self.collection.update_one(
            {"_id": module_id},
            {
                "$push": {"submodules": sub_module_dict},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )
        if result.modified_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Module not found"
            )
        return await self.get_module(module_id)

    async def add_category(
        self,
        module_id: str,
        sub_module_id: str,
        category: Category
    ) -> Module:
        """Add a category with proper structure"""
        category_dict = category.model_dump()
        category_dict["id"] = str(uuid.uuid4())
        category_dict["created_at"] = datetime.utcnow()
        category_dict["updated_at"] = datetime.utcnow()
        category_dict["question_ids"] = []

        result = await self.collection.update_one(
            {
                "_id": module_id,
                "submodules.id": sub_module_id
            },
            {
                "$push": {"submodules.$.categories": category_dict},
                "$set": {
                    "updated_at": datetime.utcnow(),
                    "submodules.$.updated_at": datetime.utcnow()
                }
            }
        )
        if result.modified_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Module or submodule not found"
            )
        return await self.get_module(module_id)

    async def delete_module(self, module_id: str) -> bool:
        """Delete module with proper cleanup"""
        # Check for report dependencies
        report_count = await self.db.reports.count_documents({
            "modules.module_id": module_id
        })
        if report_count > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete module as it is referenced in reports"
            )

        result = await self.collection.delete_one({"_id": module_id})
        return result.deleted_count > 0

    async def get_module_structure(self, module_id: str) -> dict:
        """Get complete module structure with all relationships"""
        module = await self.get_module(module_id, include_details=True)
        if not isinstance(module, ModuleWithDetails):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to get module details"
            )

        structure = module.model_dump()
        
        # Add additional metadata
        structure["total_submodules"] = len(module.submodules)
        structure["total_categories"] = sum(
            len(submodule.categories) for submodule in module.submodules
        )
        
        return structure

    async def create_temp_question(
        self,
        category_id: str,
        question_data: QuestionCreate
    ) -> Question:
        """
        Temporary method to create a question in a category.
        This is a temporary solution until the question router is fixed.
        """
        # Find the category within the module's submodule structure
        module = await self.collection.find_one({
            "submodules.categories.id": category_id
        })
        
        if not module:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Category not found in any module"
            )

        # Find the specific category
        category = None
        for submodule in module.get("submodules", []):
            for cat in submodule.get("categories", []):
                if cat.get("id") == category_id:
                    category = cat
                    break
            if category:
                break

        if not category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Category not found"
            )

        # Get the order (last question's order + 1)
        last_question = await self.db.questions.find_one(
            {"category_id": category_id},
            sort=[("order", -1)]
        )
        order = (last_question["order"] + 1) if last_question else 0

        # Convert validation rules to dictionary format
        validation_rules_dict = {}
        for rule in question_data.validation_rules:
            rule_dict = rule.model_dump()
            if rule.data_type:
                validation_rules_dict["data_type"] = rule.data_type
            if rule.range_constraints:
                validation_rules_dict["range_constraints"] = rule.range_constraints
            if rule.required:
                validation_rules_dict["required"] = rule.required
            if rule.custom_validation:
                validation_rules_dict["custom_validation"] = rule.custom_validation

        # Create question document using the Question model
        question_dict = {
            "_id": str(uuid.uuid4()),
            "id": str(uuid.uuid4()),
            "category_id": category_id,
            "question_number": f"Q{order + 1}",  # Generate question number
            "question_text": question_data.text,
            "question_type": question_data.type.value,
            "validation_rules": validation_rules_dict,  # Use the dictionary format
            "module_id": module["_id"],  # Use the module's _id
            "order": order,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }

        # Add optional fields if they exist
        if question_data.help_text:
            question_dict["help_text"] = question_data.help_text
        if question_data.placeholder:
            question_dict["placeholder"] = question_data.placeholder
        if question_data.default_value is not None:
            question_dict["default_value"] = question_data.default_value
        if question_data.metadata:
            question_dict["metadata"] = question_data.metadata

        # Handle type-specific fields
        if question_data.type.value in ["select", "multiselect"] and question_data.options:
            question_dict["options"] = [option.model_dump() for option in question_data.options]
        elif question_data.type.value == "table" and question_data.table_columns:
            question_dict["table_columns"] = [col.model_dump() for col in question_data.table_columns]
        elif question_data.type.value == "formula" and question_data.formula:
            question_dict["formula"] = question_data.formula.model_dump()
        elif question_data.type.value == "number" and question_data.unit:
            question_dict["unit"] = question_data.unit
        elif question_data.type.value == "file":
            if question_data.file_types:
                question_dict["file_types"] = question_data.file_types
            if question_data.max_file_size:
                question_dict["max_file_size"] = question_data.max_file_size

        # Insert into database
        await self.db.questions.insert_one(question_dict)

        # Update category's question_ids
        await self.collection.update_one(
            {
                "submodules.categories.id": category_id
            },
            {
                "$push": {
                    "submodules.$[].categories.$[category].question_ids": question_dict["_id"]
                }
            },
            array_filters=[{"category.id": category_id}]
        )

        return Question(**question_dict)