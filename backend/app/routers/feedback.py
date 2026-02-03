from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime
from ..database import get_db
from ..models import User, Feedback, Ward
from ..schemas import FeedbackCreate, FeedbackResponse, UserSimple
from ..dependencies import get_current_user

router = APIRouter(prefix="/feedback", tags=["Feedback"])


@router.get("", response_model=dict)
def get_feedback_messages(
    ward_id: Optional[int] = None,
    limit: int = 50,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get feedback messages for current user."""

    if current_user.role == "WDC_SECRETARY":
        # WDC Secretary sees feedback for their ward
        if not current_user.ward_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User is not assigned to a ward"
            )
        query = db.query(Feedback).filter(Feedback.ward_id == current_user.ward_id)

    elif current_user.role == "LGA_COORDINATOR":
        # LGA Coordinator needs to specify ward_id
        if not ward_id:
            # Get all wards in their LGA
            wards = db.query(Ward).filter(Ward.lga_id == current_user.lga_id).all()
            ward_ids = [w.id for w in wards]
            query = db.query(Feedback).filter(Feedback.ward_id.in_(ward_ids))
        else:
            # Verify ward belongs to their LGA
            ward = db.query(Ward).filter(Ward.id == ward_id).first()
            if not ward or ward.lga_id != current_user.lga_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Not authorized to view feedback for this ward"
                )
            query = db.query(Feedback).filter(Feedback.ward_id == ward_id)

    elif current_user.role == "STATE_OFFICIAL":
        # State Official can view all feedback or filter by ward
        if ward_id:
            query = db.query(Feedback).filter(Feedback.ward_id == ward_id)
        else:
            query = db.query(Feedback)

    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only WDC Secretaries, LGA Coordinators, and State Officials can access feedback"
        )

    total = query.count()
    messages = query.order_by(Feedback.created_at.desc()).limit(limit).offset(offset).all()

    messages_data = []
    for msg in messages:
        ward = db.query(Ward).filter(Ward.id == msg.ward_id).first()
        sender = db.query(User).filter(User.id == msg.sender_id).first()
        recipient = db.query(User).filter(User.id == msg.recipient_id).first() if msg.recipient_id else None

        messages_data.append({
            "id": msg.id,
            "ward_id": msg.ward_id,
            "ward_name": ward.name if ward else None,
            "sender": {
                "id": sender.id,
                "full_name": sender.full_name,
                "role": sender.role
            } if sender else None,
            "recipient": {
                "id": recipient.id,
                "full_name": recipient.full_name,
                "role": recipient.role
            } if recipient else None,
            "message": msg.message,
            "is_read": msg.is_read,
            "parent_id": msg.parent_id,
            "created_at": msg.created_at
        })

    return {
        "success": True,
        "data": {
            "messages": messages_data,
            "total": total,
            "limit": limit,
            "offset": offset
        }
    }


@router.post("", response_model=dict, status_code=status.HTTP_201_CREATED)
def send_feedback_message(
    feedback_data: FeedbackCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Send a feedback message."""

    if current_user.role not in ["WDC_SECRETARY", "LGA_COORDINATOR", "STATE_OFFICIAL"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only WDC Secretaries, LGA Coordinators, and State Officials can send feedback"
        )

    # Auto-set ward_id for WDC Secretaries
    ward_id = feedback_data.ward_id
    if current_user.role == "WDC_SECRETARY":
        if not current_user.ward_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User is not assigned to a ward"
            )
        ward_id = current_user.ward_id

    # Verify ward access if ward_id provided
    ward = None
    if ward_id:
        ward = db.query(Ward).filter(Ward.id == ward_id).first()
        if not ward:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Ward not found"
            )

        if current_user.role == "LGA_COORDINATOR":
            if ward.lga_id != current_user.lga_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Not authorized to send feedback for this ward"
                )
    elif current_user.role in ["LGA_COORDINATOR", "WDC_SECRETARY"]:
        # Ward ID is required for these roles
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ward ID is required"
        )
    # STATE_OFFICIAL can send feedback without ward_id, but the Feedback
    # model requires ward_id (NOT NULL).  Require it for all roles.
    if not ward_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ward ID is required"
        )

    # Determine recipient_id based on recipient_type if provided
    recipient_id = feedback_data.recipient_id

    if feedback_data.recipient_type and not recipient_id:
        # Look up recipient based on type
        if feedback_data.recipient_type == 'LGA' and ward:
            # Find LGA Coordinator for this ward's LGA
            recipient = db.query(User).filter(
                User.lga_id == ward.lga_id,
                User.role == "LGA_COORDINATOR"
            ).first()
            if recipient:
                recipient_id = recipient.id
        elif feedback_data.recipient_type == 'STATE':
            # Find any State Official
            recipient = db.query(User).filter(
                User.role == "STATE_OFFICIAL"
            ).first()
            if recipient:
                recipient_id = recipient.id
        elif feedback_data.recipient_type == 'WDC' and ward_id:
            # Find WDC Secretary for this ward
            recipient = db.query(User).filter(
                User.ward_id == ward_id,
                User.role == "WDC_SECRETARY"
            ).first()
            if recipient:
                recipient_id = recipient.id

    # Verify recipient if provided
    if recipient_id:
        recipient = db.query(User).filter(User.id == recipient_id).first()
        if not recipient:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Recipient not found"
            )

    # Create feedback message
    feedback = Feedback(
        ward_id=ward_id,
        sender_id=current_user.id,
        recipient_id=recipient_id,
        message=feedback_data.message,
        parent_id=feedback_data.parent_id
    )

    db.add(feedback)
    db.commit()
    db.refresh(feedback)

    return {
        "success": True,
        "data": {
            "id": feedback.id,
            "ward_id": feedback.ward_id,
            "sender_id": feedback.sender_id,
            "recipient_id": feedback.recipient_id,
            "message": feedback.message,
            "parent_id": feedback.parent_id,
            "created_at": feedback.created_at
        },
        "message": "Message sent successfully"
    }


@router.patch("/{feedback_id}/read", response_model=dict)
def mark_feedback_read(
    feedback_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark feedback message as read."""

    feedback = db.query(Feedback).filter(Feedback.id == feedback_id).first()

    if not feedback:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Feedback message not found"
        )

    # Only recipient can mark as read
    if feedback.recipient_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to modify this message"
        )

    feedback.is_read = True
    db.commit()

    return {
        "success": True,
        "data": {
            "id": feedback.id,
            "is_read": feedback.is_read
        }
    }
