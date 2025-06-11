from typing import List, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from models.module import (
    Module, ModuleCreate, ModuleUpdate, SubModule,
    Category, ModuleWithDetails, ValidationRule
)
from datetime import datetime
import uuid
from fastapi import HTTPException, status

class ModuleService:
    def __init__(self, db: AsyncIOMotorDatabase):  # type: ignore
        self.db = db
        self.collection = db.modules

    async def create_module(self, module_data: ModuleCreate) -> Module:
        """Create a new module"""
        module_dict = module_data.model_dump()
        module_dict["_id"] = str(uuid.uuid4())
        module_dict["id"] = module_dict["_id"]
        module_dict["created_at"] = datetime.utcnow()
        module_dict["updated_at"] = datetime.utcnow()
        module_dict["is_active"] = True
        await self.collection.insert_one(module_dict)
        return Module(**module_dict)

    async def get_module(self, module_id: str, include_details: bool = False) -> Module:
        """Get module by ID"""
        module = await self.collection.find_one({"_id": module_id})
        if not module:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Module not found"
            )
        if include_details:
            # Get all categories
            category_ids = [cat for sub in module.get("submodules", []) for cat in sub.get("categories", [])]
            categories = []
            if category_ids:
                cursor = self.db.categories.find({"_id": {"$in": category_ids}})
                categories = [cat async for cat in cursor]
            # Get report references
            reports = []
            cursor = self.db.reports.find({"modules.module_id": module_id}, {"_id": 1})
            async for report in cursor:
                reports.append(report)
            # Count questions
            question_count = sum(len(cat.get("question_ids", [])) for cat in categories)
            module["categories"] = categories
            module["question_count"] = question_count
            module["reports"] = [r["_id"] for r in reports]
            return ModuleWithDetails(**module)
        return Module(**module)

    async def list_modules(self, report_id: Optional[str] = None, skip: int = 0, limit: int = 10) -> List[Module]:
        """List modules, optionally filtered by report_id."""
        query = {"report_id": report_id} if report_id else {}
        modules = []
        cursor = self.collection.find(query).skip(skip).limit(limit)
        async for module in cursor:
            modules.append(Module(**module))
        return modules

    async def update_module(self, module_id: str, module_data: ModuleUpdate) -> Module:
        """Update module details"""
        update_data = module_data.model_dump(exclude_unset=True)
        if update_data:
            update_data["updated_at"] = datetime.utcnow()
            result = await self.collection.update_one(
                {"_id": module_id},
                {"$set": update_data}
            )
            if result.modified_count == 0:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Module not found"
                )
        module = await self.collection.find_one({"_id": module_id})
        return Module(**module)

    async def add_sub_module(self, module_id: str, sub_module: SubModule) -> Module:
        """Add a sub-module to a module"""
        module = await self.get_module(module_id)
        sub_module_dict = sub_module.model_dump()
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
        """Add a category to a sub-module"""
        module = await self.get_module(module_id)
        sub_module = next(
            (sm for sm in module.submodules if sm.id == sub_module_id),
            None
        )
        if not sub_module:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Sub-module not found"
            )
        category_dict = category.model_dump()
        category_dict["_id"] = str(uuid.uuid4())
        category_dict["id"] = category_dict["_id"]
        await self.db.categories.insert_one(category_dict)
        result = await self.collection.update_one(
            {
                "_id": module_id,
                "submodules.id": sub_module_id
            },
            {
                "$push": {"submodules.$.categories": category_dict["_id"]},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )
        if result.modified_count == 0:
            await self.db.categories.delete_one({"_id": category_dict["_id"]})
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Failed to add category to sub-module"
            )
        return await self.get_module(module_id)

    async def update_category(
        self,
        category_id: str,
        category_data: dict
    ) -> Category:
        """Update category details"""
        update_data = {k: v for k, v in category_data.items() if v is not None}
        if update_data:
            result = await self.db.categories.update_one(
                {"_id": category_id},
                {"$set": update_data}
            )
            if result.modified_count == 0:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Category not found"
                )
        category = await self.db.categories.find_one({"_id": category_id})
        if not category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Category not found"
            )
        return Category(**category)

    async def add_validation_rule(
        self,
        module_id: str,
        rule: ValidationRule
    ) -> Module:
        """Add a validation rule to a module"""
        module = await self.get_module(module_id)
        result = await self.collection.update_one(
            {"_id": module_id},
            {
                "$push": {"validation_rules": rule.model_dump()},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )
        if result.modified_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Module not found"
            )
        return await self.get_module(module_id)

    async def get_module_categories(self, module_id: str) -> list[Category]:
        """Get all categories in a module"""
        module = await self.get_module(module_id, include_details=True)
        if not isinstance(module, ModuleWithDetails):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to get module details"
            )
        return module.categories

    async def delete_module(self, module_id: str) -> bool:
        """Delete a module and its associated data"""
        report_count = await self.db.reports.count_documents({
            "modules.module_id": module_id
        })
        if report_count > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete module as it is used in reports"
            )
        module = await self.get_module(module_id)
        category_ids = [cat.id for sub in module.submodules for cat in sub.categories]
        if category_ids:
            await self.db.categories.delete_many({"_id": {"$in": category_ids}})
        result = await self.collection.delete_one({"_id": module_id})
        return result.deleted_count > 0 