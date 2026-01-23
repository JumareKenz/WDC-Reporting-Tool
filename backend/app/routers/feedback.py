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

    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only WDC Secretaries and LGA Coordinators can access feedback"
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

    if current_user.role not in ["WDC_SECRETARY", "LGA_COORDINATOR"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only WDC Secretaries and LGA Coordinators can send feedback"
        )

    # Verify ward access
    ward = db.query(Ward).filter(Ward.id == feedback_data.ward_id).first()
    if not ward:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ward not found"
        )

    if current_user.role == "WDC_SECRETARY":
        if current_user.ward_id != feedback_data.ward_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to send feedback for this ward"
            )
    elif current_user.role == "LGA_COORDINATOR":
        if ward.lga_id != current_user.lga_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to send feedback for this ward"
            )

    # Verify recipient if provided
    if feedback_data.recipient_id:
        recipient = db.query(User).filter(User.id == feedback_data.recipient_id).first()
        if not recipient:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Recipient not found"
            )

    # Create feedback message
    feedback = Feedback(
        ward_id=feedback_data.ward_id,
        sender_id=current_user.id,
        recipient_id=feedback_data.recipient_id,
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
