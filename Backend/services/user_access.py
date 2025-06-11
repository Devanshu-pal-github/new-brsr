from typing import List, Optional, Dict
from motor.motor_asyncio import AsyncIOMotorDatabase
from models.user_access import (
    UserAccessCreate, UserAccessUpdate, UserAccess, UserAccessWithDetails,
    UserAccessSummary, UserCompanyAccess, UserRole, AccessScope, Permission
)
from datetime import datetime
import uuid

class UserAccessService:
    def __init__(self, db: AsyncIOMotorDatabase):  # type: ignore
        self.db = db
        self.collection = db.user_access

    async def create_user_access(self, user_access: UserAccessCreate) -> UserAccess:
        """
        Create a new user access entry, enforcing uniqueness and role/permission logic.
        Why: Ensures RBAC and access integrity for the platform.
        """
        # Verify company exists
        company = await self.db.companies.find_one({"_id": user_access.company_id})
        if not company:
            raise ValueError(f"Company with ID {user_access.company_id} not found")

        # Verify plant exists if plant-level access
        if user_access.plant_id:
            plant = await self.db.plants.find_one({
                "_id": user_access.plant_id,
                "company_id": user_access.company_id
            })
            if not plant:
                raise ValueError(f"Plant with ID {user_access.plant_id} not found in company")

        # Check for existing access
        existing = await self.collection.find_one({
            "user_id": user_access.user_id,
            "company_id": user_access.company_id,
            "plant_id": user_access.plant_id,
            "is_active": True
        })
        if existing:
            raise ValueError("User already has active access for this scope")

        # Set default permissions based on role if not provided
        permissions = user_access.permissions or self._get_default_permissions(user_access.role)

        user_access_dict = user_access.model_dump()
        user_access_dict["permissions"] = permissions
        user_access_dict["created_at"] = datetime.utcnow()
        user_access_dict["updated_at"] = user_access_dict["created_at"]
        user_access_dict["is_active"] = True
        user_access_dict["scope"] = user_access_dict.get("scope", "plant")
        user_access_dict["access_level"] = user_access_dict.get("access_level", permissions[0] if permissions else "read")
        user_access_dict["_id"] = str(uuid.uuid4())

        await self.collection.insert_one(user_access_dict)
        return UserAccess(**user_access_dict)

    async def get_user_access(
        self,
        access_id: str,
        include_details: bool = False
    ) -> Optional[UserAccess]:
        """
        Retrieve a user access entry by ID, optionally with details.
        Why: Supports both direct access fetch and context-aware fetch for UI/business logic.
        """
        access = await self.collection.find_one({"_id": access_id})
        if not access:
            return None
        if include_details:
            return await self._add_access_details(access)
        return UserAccess(**access)

    async def list_user_access(
        self,
        user_id: Optional[str] = None,
        company_id: Optional[str] = None,
        plant_id: Optional[str] = None,
        role: Optional[UserRole] = None,
        is_active: Optional[bool] = None,
        skip: int = 0,
        limit: int = 10
    ) -> List[UserAccess]:
        """
        List user access entries with optional filtering and pagination.
        Why: Enables efficient UI rendering and admin management.
        """
        query = {}
        if user_id:
            query["user_id"] = user_id
        if company_id:
            query["company_id"] = company_id
        if plant_id:
            query["plant_id"] = plant_id
        if role:
            query["role"] = role
        if is_active is not None:
            query["is_active"] = is_active
        access_list = []
        cursor = self.collection.find(query).skip(skip).limit(limit)
        async for access in cursor:
            access_list.append(UserAccess(**access))
        return access_list

    async def update_user_access(
        self,
        access_id: str,
        access_update: UserAccessUpdate
    ) -> Optional[UserAccess]:
        """
        Update a user access entry, enforcing role/permission/plant validation.
        Why: Ensures RBAC and access integrity for the platform.
        """
        current = await self.collection.find_one({"_id": access_id})
        if not current:
            return None
        update_data = access_update.model_dump(exclude_unset=True)
        # Validate role and permission changes
        if "role" in update_data or "permissions" in update_data:
            new_role = update_data.get("role", current["role"])
            new_permissions = update_data.get("permissions", current["permissions"])
            self._validate_role_permissions(new_role, new_permissions)
        # Validate plant changes
        if "plant_id" in update_data:
            if update_data["plant_id"]:
                plant = await self.db.plants.find_one({
                    "_id": update_data["plant_id"],
                    "company_id": current["company_id"]
                })
                if not plant:
                    raise ValueError(f"Plant with ID {update_data['plant_id']} not found in company")
        update_data["updated_at"] = datetime.utcnow()
        result = await self.collection.find_one_and_update(
            {"_id": access_id},
            {"$set": update_data},
            return_document=True
        )
        if result:
            return UserAccess(**result)
        return None

    async def delete_user_access(self, access_id: str) -> bool:
        """
        Delete a user access entry.
        Why: Supports access revocation and admin workflows.
        """
        result = await self.collection.delete_one({"_id": access_id})
        return result.deleted_count > 0

    async def get_user_access_summary(self, user_id: str) -> UserAccessSummary:
        """
        Get a summary of all user's access across companies.
        Why: Supports RBAC dashboards and reporting.
        """
        access_list = self.collection.find({
            "user_id": user_id,
            "is_active": True
        })
        companies: Dict[str, UserCompanyAccess] = {}
        async for access in access_list:
            company_id = access["company_id"]
            if company_id not in companies:
                company = await self.db.companies.find_one({"_id": company_id})
                if company:
                    companies[company_id] = UserCompanyAccess(
                        company_id=company_id,
                        company_name=company["name"],
                        role=access["role"],
                        permissions=access["permissions"],
                        plants=[]
                    )
            if access["plant_id"]:
                plant = await self.db.plants.find_one({"_id": access["plant_id"]})
                if plant and company_id in companies:
                    companies[company_id].plants.append({
                        "id": plant["_id"],
                        "name": plant["name"],
                        "role": access["role"]
                    })
        return UserAccessSummary(
            user_id=user_id,
            companies=list(companies.values())
        )

    async def check_user_permission(
        self,
        user_id: str,
        company_id: str,
        permission: Permission,
        plant_id: Optional[str] = None
    ) -> bool:
        """
        Check if a user has a specific permission.
        Why: Enforces RBAC and permission checks for all business logic.
        """
        query = {
            "user_id": user_id,
            "company_id": company_id,
            "is_active": True,
            "permissions": permission
        }
        if plant_id:
            # Check for plant-specific or company-wide access
            query["$or"] = [
                {"plant_id": plant_id},
                {"scope": AccessScope.COMPANY}
            ]
        access = await self.collection.find_one(query)
        return bool(access)

    def _get_default_permissions(self, role: UserRole) -> List[Permission]:
        """Get default permissions for a role"""
        if role == UserRole.SUPER_ADMIN:
            return [Permission.READ, Permission.WRITE, Permission.VALIDATE, Permission.APPROVE]
        elif role == UserRole.COMPANY_ADMIN:
            return [Permission.READ, Permission.WRITE, Permission.VALIDATE, Permission.APPROVE]
        elif role == UserRole.PLANT_ADMIN:
            return [Permission.READ, Permission.WRITE, Permission.VALIDATE]
        elif role == UserRole.USER:
            return [Permission.READ, Permission.WRITE]
        else:
            return [Permission.READ]

    def _validate_role_permissions(self, role: UserRole, permissions: List[Permission]) -> None:
        """Validate that permissions match the role requirements"""
        required_permissions = self._get_default_permissions(role)
        if not all(p in permissions for p in required_permissions):
            raise ValueError(f"Role {role} requires permissions: {required_permissions}")

    async def _add_access_details(self, access: Dict) -> UserAccessWithDetails:
        """Add company and plant details to access record"""
        company = await self.db.companies.find_one({"_id": access["company_id"]})
        plant = None
        if access.get("plant_id"):
            plant = await self.db.plants.find_one({"_id": access["plant_id"]})

        return UserAccessWithDetails(
            **access,
            company_name=company["name"] if company else "Unknown",
            plant_name=plant["name"] if plant else None
        ) 