from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User, Ward, LGA
from ..schemas import (
    UserResponse,
    ProfileUpdateRequest,
    EmailUpdateRequest,
    PasswordChangeRequest,
    WardSimple,
    LGASimple
)
from ..auth import verify_password, get_password_hash
from ..dependencies import get_current_user

router = APIRouter(prefix="/profile", tags=["Profile"])


@router.get("/me", response_model=UserResponse)
def get_profile(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get current user profile."""

    user_data = UserResponse.from_orm(current_user)

    # Add ward info if WDC Secretary
    if current_user.ward_id:
        ward = db.query(Ward).filter(Ward.id == current_user.ward_id).first()
        if ward:
            lga = db.query(LGA).filter(LGA.id == ward.lga_id).first()
            user_data.ward = WardSimple(
                id=ward.id,
                name=ward.name,
                code=ward.code,
                lga_id=ward.lga_id,
                lga_name=lga.name if lga else None
            )

    # Add LGA info if LGA Coordinator
    if current_user.lga_id:
        lga = db.query(LGA).filter(LGA.id == current_user.lga_id).first()
        if lga:
            user_data.lga = LGASimple(
                id=lga.id,
                name=lga.name,
                code=lga.code
            )

    return user_data


@router.patch("/me", response_model=UserResponse)
def update_profile(
    profile_data: ProfileUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update user profile (full_name and phone only)."""

    # Update full_name if provided
    if profile_data.full_name is not None:
        current_user.full_name = profile_data.full_name

    # Update phone if provided
    if profile_data.phone is not None:
        current_user.phone = profile_data.phone

    db.commit()
    db.refresh(current_user)

    return get_profile(current_user, db)


@router.patch("/email", response_model=UserResponse)
def update_email(
    email_data: EmailUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update user email (STATE_OFFICIAL only)."""

    # Check if user is allowed to change email
    if current_user.role in ["WDC_SECRETARY", "LGA_COORDINATOR"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Ward and LGA users cannot change email. Contact state office for email changes."
        )

    # Check if email already exists
    existing_user = db.query(User).filter(
        User.email == email_data.email,
        User.id != current_user.id
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already in use"
        )

    current_user.email = email_data.email
    db.commit()
    db.refresh(current_user)

    return get_profile(current_user, db)


@router.post("/change-password")
def change_password(
    password_data: PasswordChangeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Change user password."""

    # Verify current password
    if not verify_password(password_data.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Current password is incorrect"
        )

    # Hash and update new password
    current_user.password_hash = get_password_hash(password_data.new_password)
    db.commit()

    return {"message": "Password changed successfully"}
