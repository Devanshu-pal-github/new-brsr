from typing import List, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from models.module import (
    Module, ModuleCreate, ModuleUpdate, SubModule,
    Category, ModuleWithDetails, ModuleType
)
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

            # Get associated reports
            reports = []
            async for report in self.db.reports.find(
                {"modules.module_id": module_id},
                {"_id": 1, "name": 1}
            ):
                reports.append(report)

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