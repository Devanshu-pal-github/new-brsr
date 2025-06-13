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
import json

class ModuleService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.collection = db.modules
        
    async def get_module_json_structure(self, module_id: str) -> Dict:
        """Get module in JSON structure format
        
        Returns a module in the hierarchical JSON structure with module at the top level,
        containing submodules, categories, and question IDs.
        """
        module = await self.get_module(module_id)
        return module.to_json_structure()
        
    async def list_modules_json_structure(self, 
        skip: int = 0,
        limit: int = 10,
        module_type: Optional[ModuleType] = None
    ) -> List[Dict]:
        """List modules in JSON structure format
        
        Returns a list of modules in the hierarchical JSON structure.
        """
        modules = await self.list_modules(skip, limit, module_type)
        return [module.to_json_structure() for module in modules]

    async def create_module(self, module_data: ModuleCreate) -> Module:
        """Create a new module with proper hierarchical JSON structure"""
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
        module_dict["is_active"] = True

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

        # Create JSON structure representation for storage
        module_obj = Module(**module_dict)
        json_structure = module_obj.to_json_structure()
        
        # Store both the full model and its JSON structure representation
        await self.collection.insert_one(module_dict)
        
        return module_obj

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

    async def update_module(self, module_id: str, module_update: ModuleUpdate) -> Module:
        """Update module with proper validation and maintain JSON structure"""
        # Get existing module
        existing_module = await self.get_module(module_id)
        if not existing_module:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Module not found"
            )

        # Prepare update data
        update_data = module_update.model_dump(exclude_unset=True)
        update_data["updated_at"] = datetime.utcnow()

        # Handle submodules update if provided
        if "submodules" in update_data:
            for submodule in update_data["submodules"]:
                # Ensure ID for new submodules
                if "id" not in submodule or not submodule["id"]:
                    submodule["id"] = str(uuid.uuid4())
                submodule["updated_at"] = datetime.utcnow()
                
                # Handle categories
                if "categories" in submodule:
                    for category in submodule["categories"]:
                        # Ensure ID for new categories
                        if "id" not in category or not category["id"]:
                            category["id"] = str(uuid.uuid4())
                        category["updated_at"] = datetime.utcnow()
                        # Ensure question_ids exists
                        if "question_ids" not in category:
                            category["question_ids"] = []

        # Update in database
        result = await self.collection.update_one(
            {"_id": module_id},
            {"$set": update_data}
        )

        if result.modified_count == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Module update failed"
            )

        # Get updated module
        updated_module = await self.get_module(module_id)
        
        # Update JSON structure representation
        json_structure = updated_module.to_json_structure()
        
        # Return updated module
        return updated_module

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
        
    async def add_category_to_module(
        self,
        module_id: str,
        category: Category,
        submodule_name: str = "General"
    ) -> Module:
        """Add a category directly to a module by creating a new submodule if needed
        
        Args:
            module_id: The ID of the module
            category: Category object to add
            submodule_name: Name of the submodule to create or use (default: "General")
            
        Returns:
            Updated Module object
        """
        # First check if a submodule with the given name exists
        module = await self.get_module(module_id)
        
        # Find submodule with the given name
        submodule_id = None
        for submodule in module.submodules:
            if submodule.name == submodule_name:
                submodule_id = submodule.id
                break
                
        # If no submodule found, create one
        if not submodule_id:
            new_submodule = SubModule(name=submodule_name)
            updated_module = await self.add_sub_module(module_id, new_submodule)
            submodule_id = updated_module.submodules[-1].id
            
        # Now add the category to the submodule
        return await self.add_category(module_id, submodule_id, category)
        
    async def add_bulk_submodules(self, module_id: str, submodules: List[SubModule]) -> Module:
        """Add multiple submodules to a module in a single operation
        
        Args:
            module_id: The ID of the module
            submodules: List of SubModule objects to add
            
        Returns:
            Updated Module object
        """
        # Prepare all submodules with proper structure
        submodule_dicts = []
        current_time = datetime.utcnow()
        
        for submodule in submodules:
            submodule_dict = submodule.model_dump()
            submodule_dict["id"] = str(uuid.uuid4())
            submodule_dict["created_at"] = current_time
            submodule_dict["updated_at"] = current_time
            submodule_dict["categories"] = []
            submodule_dicts.append(submodule_dict)
        
        # Add all submodules in a single database operation
        result = await self.collection.update_one(
            {"_id": module_id},
            {
                "$push": {"submodules": {"$each": submodule_dicts}},
                "$set": {"updated_at": current_time}
            }
        )
        
        if result.modified_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Module not found"
            )
            
        # Return the updated module
        return await self.get_module(module_id)
        
    async def add_bulk_categories(self, module_id: str, sub_module_id: str, categories: List[Category]) -> Module:
        """Add multiple categories to a submodule in a single operation
        
        Args:
            module_id: The ID of the module
            sub_module_id: The ID of the submodule
            categories: List of Category objects to add
            
        Returns:
            Updated Module object
        """
        # Prepare all categories with proper structure
        category_dicts = []
        current_time = datetime.utcnow()
        
        for category in categories:
            category_dict = category.model_dump()
            category_dict["id"] = str(uuid.uuid4())
            category_dict["created_at"] = current_time
            category_dict["updated_at"] = current_time
            category_dict["question_ids"] = []
            category_dicts.append(category_dict)
        
        # Add all categories in a single database operation
        result = await self.collection.update_one(
            {
                "_id": module_id,
                "submodules.id": sub_module_id
            },
            {
                "$push": {"submodules.$.categories": {"$each": category_dicts}},
                "$set": {
                    "updated_at": current_time,
                    "submodules.$.updated_at": current_time
                }
            }
        )
        
        if result.modified_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Module or submodule not found"
            )
            
        # Return the updated module
        return await self.get_module(module_id)
        
    async def add_bulk_questions_to_category(self, category_id: str, questions: List[QuestionCreate]) -> List[Dict]:
        """Add multiple questions to a category in a single operation
        
        Args:
            category_id: The ID of the category
            questions: List of QuestionCreate objects to add
            
        Returns:
            List of created question documents
        """
        # Find the module and category
        module = await self.collection.find_one(
            {"submodules.categories.id": category_id},
            {"_id": 1}
        )
        
        if not module:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Category not found"
            )
            
        module_id = module["_id"]
        
        # Create all questions and collect their IDs
        question_collection = self.db["questions"]
        created_questions = []
        question_ids = []
        current_time = datetime.utcnow()
        
        # Get the highest question number to start incrementing from
        highest_question = await question_collection.find_one(
            {"category_id": category_id},
            sort=[("question_number", -1)]
        )
        
        next_question_number = 1
        if highest_question and "question_number" in highest_question:
            next_question_number = int(highest_question["question_number"]) + 1
        
        for question_data in questions:
            # Generate a UUID for the question
            question_id = str(uuid.uuid4())
            
            # Use provided human_readable_id or create a new one
            if question_data.human_readable_id:
                human_readable_id = question_data.human_readable_id
            else:
                human_readable_id = f"{category_id[:4]}-Q{next_question_number:03d}"
            
            # Prepare the question document
            question_doc = {
                "_id": question_id,
                "human_readable_id": human_readable_id,
                "category_id": category_id,
                "question_number": str(next_question_number),
                "question_text": question_data.text if question_data.text is not None else None,
                "question_type": question_data.type.value if question_data.type is not None else None,
                "is_mandatory": question_data.is_mandatory,
                "created_at": current_time,
                "updated_at": current_time
            }
            
            # Add type-specific data only if question_data.type is provided
            if question_data.type is not None:
                if question_data.type.value == "number":
                    question_doc["unit"] = question_data.unit
                elif question_data.type.value == "file":
                    question_doc["allowed_file_types"] = question_data.allowed_file_types
                    question_doc["max_file_size"] = question_data.max_file_size
            
            # Insert the question document
            await question_collection.insert_one(question_doc)
            created_questions.append(question_doc)
            question_ids.append(question_id)
            next_question_number += 1
        
        # Update the category with all question IDs in a single operation
        if question_ids:
            await self.collection.update_one(
                {"submodules.categories.id": category_id},
                {
                    "$push": {"submodules.$[].categories.$[cat].question_ids": {"$each": question_ids}},
                    "$set": {"updated_at": current_time}
                },
                array_filters=[{"cat.id": category_id}]
            )
        
        return created_questions

    async def delete_module(self, module_id: str) -> bool:
        """Delete a module"""
        # Check if module is assigned to any report
        report_collection = self.db["reports"]
        report = await report_collection.find_one({"modules": module_id})
        if report:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Module is assigned to report {report['_id']}"
            )

        result = await self.collection.delete_one({"_id": module_id})
        if result.deleted_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Module not found"
            )
        return True

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

    async def add_question_to_category(self, module_id: str, submodule_id: str, category_id: str, question_data: QuestionCreate) -> Question:
        """Add a single question to a category with human-readable ID
        
        Args:
            module_id: The ID of the module
            submodule_id: The ID of the submodule
            category_id: The ID of the category to add the question to
            question_data: QuestionCreate object with question details
            
        Returns:
            Created Question object
        """
        # Verify the module, submodule, and category exist
        module = await self.collection.find_one({
            "_id": module_id,
            "submodules.id": submodule_id,
            "submodules.categories.id": category_id
        })
        
        if not module:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Module, submodule, or category not found"
            )
        
        # Get the highest question number to start incrementing from
        question_collection = self.db["questions"]
        highest_question = await question_collection.find_one(
            {"category_id": category_id},
            sort=[("question_number", -1)]
        )
        
        next_question_number = 1
        if highest_question and "question_number" in highest_question:
            next_question_number = int(highest_question["question_number"]) + 1
        
        # Generate a UUID for the question
        question_id = str(uuid.uuid4())
        
        # Use provided human_readable_id or create a new one
        if question_data.human_readable_id:
            human_readable_id = question_data.human_readable_id
        else:
            human_readable_id = f"{category_id[:4]}-Q{next_question_number:03d}"
        
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
        
        # Create question document
        question_doc = {
            "_id": question_id,
            "id": question_id,
            "human_readable_id": human_readable_id,
            "category_id": category_id,
            "question_number": str(next_question_number),
            "question_text": question_data.text if question_data.text is not None else None,
            "question_type": question_data.type.value if question_data.type is not None else None,
            "validation_rules": validation_rules_dict,
            "module_id": module_id,
            "order": next_question_number - 1,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        # Add optional fields if they exist
        if question_data.help_text:
            question_doc["help_text"] = question_data.help_text
        if question_data.placeholder:
            question_doc["placeholder"] = question_data.placeholder
        if question_data.default_value is not None:
            question_doc["default_value"] = question_data.default_value
        if question_data.metadata:
            question_doc["metadata"] = question_data.metadata

        # Handle type-specific fields only if question_data.type is provided
        if question_data.type is not None:
            if question_data.type.value in ["select", "multiselect"] and question_data.options:
                question_doc["options"] = [option.model_dump() for option in question_data.options]
            elif question_data.type.value == "table" and question_data.table_columns:
                question_doc["table_columns"] = [col.model_dump() for col in question_data.table_columns]
            elif question_data.type.value == "formula" and question_data.formula:
                question_doc["formula"] = question_data.formula.model_dump()
            elif question_data.type.value == "number" and question_data.unit:
                question_doc["unit"] = question_data.unit
            elif question_data.type.value == "file":
                if question_data.file_types:
                    question_doc["file_types"] = question_data.file_types
                if question_data.max_file_size:
                    question_doc["max_file_size"] = question_data.max_file_size
        
        # Insert the question document
        await question_collection.insert_one(question_doc)
        
        # Update the category with the question ID
        await self.collection.update_one(
            {
                "_id": module_id,
                "submodules.id": submodule_id,
                "submodules.categories.id": category_id
            },
            {"$push": {"submodules.$[sm].categories.$[cat].question_ids": question_id}},
            array_filters=[
                {"sm.id": submodule_id},
                {"cat.id": category_id}
            ]
        )
        
        # Get updated module to refresh JSON structure
        updated_module = await self.get_module(module_id)
        # Generate updated JSON structure
        json_structure = updated_module.to_json_structure()
        
        return Question(**question_doc)
        
    async def add_question_id_to_category(self, module_id: str, submodule_id: str, category_id: str, question_id: str) -> bool:
        """Add an existing question ID to a category and update JSON structure"""
        # Add question to category
        result = await self.collection.update_one(
            {
                "_id": module_id,
                "submodules.id": submodule_id,
                "submodules.categories.id": category_id
            },
            {"$push": {"submodules.$[sm].categories.$[cat].question_ids": question_id}},
            array_filters=[
                {"sm.id": submodule_id},
                {"cat.id": category_id}
            ]
        )
        
        if result.modified_count > 0:
            # Get updated module to refresh JSON structure
            updated_module = await self.get_module(module_id)
            # Generate updated JSON structure
            json_structure = updated_module.to_json_structure()
            return True
        
        return False
        
    async def add_bulk_submodules(self, module_id: str, submodules: List[SubModule]) -> Module:
        """Add multiple submodules to a module at once
        
        Args:
            module_id: The ID of the module to add submodules to
            submodules: List of SubModule objects to add
            
        Returns:
            Updated Module object
        """
        # Prepare submodules with proper structure
        submodule_dicts = []
        for submodule in submodules:
            sub_dict = submodule.model_dump()
            sub_dict["id"] = str(uuid.uuid4())
            sub_dict["created_at"] = datetime.utcnow()
            sub_dict["updated_at"] = datetime.utcnow()
            sub_dict["categories"] = sub_dict.get("categories", [])
            
            # Initialize categories within submodules
            for category in sub_dict["categories"]:
                category["id"] = str(uuid.uuid4())
                category["created_at"] = datetime.utcnow()
                category["updated_at"] = datetime.utcnow()
                category["question_ids"] = []
                
            submodule_dicts.append(sub_dict)
        
        # Update module with all new submodules
        result = await self.collection.update_one(
            {"_id": module_id},
            {
                "$push": {"submodules": {"$each": submodule_dicts}},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )
        
        if result.modified_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Module not found"
            )
            
        return await self.get_module(module_id)
    
    async def add_bulk_categories(self, module_id: str, submodule_id: str, categories: List[Category]) -> Module:
        """Add multiple categories to a submodule at once
        
        Args:
            module_id: The ID of the module
            submodule_id: The ID of the submodule to add categories to
            categories: List of Category objects to add
            
        Returns:
            Updated Module object
        """
        # Prepare categories with proper structure
        category_dicts = []
        for category in categories:
            cat_dict = category.model_dump()
            cat_dict["id"] = str(uuid.uuid4())
            cat_dict["created_at"] = datetime.utcnow()
            cat_dict["updated_at"] = datetime.utcnow()
            cat_dict["question_ids"] = []
            category_dicts.append(cat_dict)
        
        # Update submodule with all new categories
        result = await self.collection.update_one(
            {
                "_id": module_id,
                "submodules.id": submodule_id
            },
            {
                "$push": {"submodules.$.categories": {"$each": category_dicts}},
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
        
    async def add_bulk_questions_to_category(self, module_id: str, submodule_id: str, category_id: str, question_ids: List[str]) -> bool:
        """Add multiple questions to a category at once
        
        Args:
            module_id: The ID of the module
            submodule_id: The ID of the submodule
            category_id: The ID of the category to add questions to
            question_ids: List of question IDs to add
            
        Returns:
            Boolean indicating success
        """
        # Add questions to category
        result = await self.collection.update_one(
            {
                "_id": module_id,
                "submodules.id": submodule_id,
                "submodules.categories.id": category_id
            },
            {"$push": {"submodules.$[sm].categories.$[cat].question_ids": {"$each": question_ids}}},
            array_filters=[
                {"sm.id": submodule_id},
                {"cat.id": category_id}
            ]
        )
        
        if result.modified_count > 0:
            # Get updated module to refresh JSON structure
            updated_module = await self.get_module(module_id)
            # Generate updated JSON structure
            json_structure = updated_module.to_json_structure()
            return True
        
        return False
        
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

        # Generate a UUID for the question
        question_id = str(uuid.uuid4())
        
        # Use human_readable_id from question_data if provided, otherwise generate a UUID
        human_readable_id = question_data.human_readable_id if question_data.human_readable_id else str(uuid.uuid4())
        
        # Create question document with only _id, id, and human_readable_id
        question_dict = {
            "_id": question_id,
            "id": question_id,
            "human_readable_id": human_readable_id
        }

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