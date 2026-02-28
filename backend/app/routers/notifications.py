from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime
from ..database import get_db
from ..models import User, Notification
from ..schemas import NotificationResponse, NotificationSend
from ..dependencies import get_current_user

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("", response_model=dict)
def get_notifications(
    unread_only: bool = False,
    limit: int = 20,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get notifications for current user."""

    query = db.query(Notification).filter(Notification.recipient_id == current_user.id)

    if unread_only:
        query = query.filter(Notification.is_read == False)

    total = query.count()
    unread_count = db.query(Notification).filter(
        Notification.recipient_id == current_user.id,
        Notification.is_read == False
    ).count()

    notifications = query.order_by(Notification.created_at.desc()).limit(limit).offset(offset).all()

    notifications_data = []
    for notif in notifications:
        notif_data = {
            "id": notif.id,
            "notification_type": notif.notification_type,
            "title": notif.title,
            "message": notif.message,
            "is_read": notif.is_read,
            "created_at": notif.created_at,
            "related_entity": None
        }

        if notif.related_entity_type and notif.related_entity_id:
            notif_data["related_entity"] = {
                "type": notif.related_entity_type,
                "id": notif.related_entity_id
            }

        notifications_data.append(notif_data)

    return {
        "success": True,
        "data": {
            "notifications": notifications_data,
            "total": total,
            "unread_count": unread_count,
            "limit": limit,
            "offset": offset
        }
    }


@router.patch("/{notification_id}/read", response_model=dict)
def mark_notification_read(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark notification as read."""

    notification = db.query(Notification).filter(Notification.id == notification_id).first()

    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )

    if notification.recipient_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to modify this notification"
        )

    notification.is_read = True
    db.commit()

    return {
        "success": True,
        "data": {
            "id": notification.id,
            "is_read": notification.is_read
        }
    }


@router.post("/mark-all-read", response_model=dict)
def mark_all_notifications_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark all notifications as read for current user."""

    result = db.query(Notification).filter(
        Notification.recipient_id == current_user.id,
        Notification.is_read == False
    ).update({"is_read": True})

    db.commit()

    return {
        "success": True,
        "data": {
            "marked_read": result
        },
        "message": "All notifications marked as read"
    }


@router.post("/send", response_model=dict, status_code=status.HTTP_201_CREATED)
def send_notifications(
    notification_data: NotificationSend,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Send a notification to specific users (LGA Coordinator or State Official)."""

    if current_user.role not in ["LGA_COORDINATOR", "STATE_OFFICIAL"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only LGA Coordinators and State Officials can send notifications"
        )

    # Verify all recipients exist
    for recipient_id in notification_data.recipient_ids:
        recipient = db.query(User).filter(User.id == recipient_id).first()
        if not recipient:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"User with ID {recipient_id} not found"
            )

    # Create notifications
    notification_ids = []
    for recipient_id in notification_data.recipient_ids:
        notification = Notification(
            recipient_id=recipient_id,
            sender_id=current_user.id,
            notification_type=notification_data.notification_type,
            title=notification_data.title,
            message=notification_data.message
        )
        db.add(notification)
        db.flush()
        notification_ids.append(notification.id)

    db.commit()

    return {
        "success": True,
        "data": {
            "sent_count": len(notification_ids),
            "notification_ids": notification_ids
        },
        "message": "Notifications sent successfully"
    }
