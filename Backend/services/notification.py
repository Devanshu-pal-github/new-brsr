from datetime import datetime
from typing import List, Dict, Any, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from models.notification import Notification, NotificationUser, NotificationMessage
from bson import ObjectId

class NotificationService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.collection = db["notifications"]

    async def create_notification(self, notification_data: Dict[str, Any]) -> str:
        # Validate notificationMessage is a dict with title and description
        if not isinstance(notification_data.get("notificationMessage"), dict):
            raise ValueError("notificationMessage must be an object with title and description")
        NotificationMessage(**notification_data["notificationMessage"])
        notification = Notification(**notification_data)
        result = await self.collection.insert_one(notification.dict())
        return str(result.inserted_id)

    async def get_notifications_for_user(self, user_id: str, role: Optional[str] = None) -> List[Notification]:
        query = {"notificationTo.id": user_id}
        if role:
            query["notificationTo.role"] = role
        cursor = self.collection.find(query).sort("createdAt", -1)
        notifications = []
        async for doc in cursor:
            notifications.append(Notification(**doc))
        return notifications

    async def mark_as_read(self, notification_id: str) -> bool:
        result = await self.collection.update_one({"id": notification_id}, {"$set": {"read": True}})
        return result.modified_count > 0
