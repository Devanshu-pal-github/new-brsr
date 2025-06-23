from fastapi import APIRouter, Depends, HTTPException, status, Body, Query
from typing import List, Dict, Any, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from services.notification import NotificationService
from dependencies import get_database, get_current_active_user
from models.notification import Notification, NotificationUser, NotificationMessage

router = APIRouter(
    prefix="/notifications",
    tags=["notifications"]
)

def get_notification_service(db: AsyncIOMotorDatabase = Depends(get_database)) -> NotificationService:
    return NotificationService(db)

@router.post("/send", response_model=dict)
async def send_notification(
    notification: Dict[str, Any] = Body(...),
    service: NotificationService = Depends(get_notification_service),
    user: Dict = Depends(get_current_active_user)
):
    """Send a notification from company admin to plant admin(s)"""
    try:
        notification["notificationFrom"] = notification.get("notificationFrom") or {
            "id": user.get("id"),
            "name": user.get("name"),
            "role": user.get("role", [None])[0]
        }
        # Always set companyId from user, never from frontend
        notification["companyId"] = user.get("company_id")
        # Ensure notificationMessage is a dict with title and description
        if not isinstance(notification.get("notificationMessage"), dict):
            raise HTTPException(status_code=400, detail="notificationMessage must be an object with title and description")
        # Validate notificationMessage fields
        NotificationMessage(**notification["notificationMessage"])
        notification_id = await service.create_notification(notification)
        return {"notificationId": notification_id, "message": "Notification sent successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/received", response_model=List[Notification])
async def get_received_notifications(
    service: NotificationService = Depends(get_notification_service),
    user: Dict = Depends(get_current_active_user)
):
    """Get notifications for the current user"""
    user_id = user.get("id")
    role = user.get("role", [None])[0]
    if not user_id:
        raise HTTPException(status_code=403, detail="User not authenticated")
    return await service.get_notifications_for_user(user_id, role)

@router.put("/{notification_id}/read", response_model=dict)
async def mark_notification_as_read(
    notification_id: str,
    service: NotificationService = Depends(get_notification_service),
    user: Dict = Depends(get_current_active_user)
):
    """Mark a notification as read"""
    success = await service.mark_as_read(notification_id)
    if not success:
        raise HTTPException(status_code=404, detail="Notification not found or already read")
    return {"message": "Notification marked as read"}
