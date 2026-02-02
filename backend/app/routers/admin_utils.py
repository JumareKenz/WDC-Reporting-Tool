from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User
from ..dependencies import get_current_user

router = APIRouter(prefix="/admin", tags=["Admin Utilities"])


@router.post("/update-state-executive-name")
def update_state_executive_name(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update the state executive name to Abdulrazak Mukhtar."""

    # Only STATE_OFFICIAL can run this
    if current_user.role != "STATE_OFFICIAL":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only state officials can perform this action"
        )

    # Find the state admin user
    user = db.query(User).filter(
        User.email == "state.admin@kaduna.gov.ng",
        User.role == "STATE_OFFICIAL"
    ).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="State executive user not found"
        )

    old_name = user.full_name
    user.full_name = "Abdulrazak Mukhtar"
    db.commit()

    return {
        "success": True,
        "message": "State executive name updated successfully",
        "old_name": old_name,
        "new_name": user.full_name,
        "email": user.email
    }
