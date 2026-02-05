from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from ..database import get_db
from ..models import User, Ward, LGA
from ..schemas import LoginRequest, LoginResponse, UserResponse, WardSimple, LGASimple
from ..auth import verify_password, create_access_token, get_password_hash
from ..dependencies import get_current_user
from ..services.email import send_password_reset_email
import secrets

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=LoginResponse)
def login(login_data: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate user and return JWT token."""

    # Find user by email
    user = db.query(User).filter(User.email == login_data.email).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    # Verify password
    if not verify_password(login_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    # Check if user is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive"
        )

    # Update last login
    user.last_login = datetime.utcnow()
    db.commit()

    # Create access token
    access_token = create_access_token(
        data={
            "user_id": user.id,
            "email": user.email,
            "role": user.role
        }
    )

    # Prepare user response with ward/lga info
    user_data = UserResponse.model_validate(user)

    # Add ward info if WDC Secretary
    if user.ward_id:
        ward = db.query(Ward).filter(Ward.id == user.ward_id).first()
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
    if user.lga_id:
        lga = db.query(LGA).filter(LGA.id == user.lga_id).first()
        if lga:
            user_data.lga = LGASimple(
                id=lga.id,
                name=lga.name,
                code=lga.code
            )

    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        user=user_data
    )


@router.get("/me", response_model=UserResponse)
def get_current_user_info(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get current authenticated user information."""

    user_data = UserResponse.model_validate(current_user)

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


# In-memory store for password reset tokens
# In production, use Redis or database table
PASSWORD_RESET_TOKENS = {}


@router.post("/forgot-password")
def request_password_reset(email: str, db: Session = Depends(get_db)):
    """Request a password reset link via email."""

    # Find user by email
    user = db.query(User).filter(User.email == email).first()

    # Always return success (don't reveal if email exists)
    if not user:
        return {
            "success": True,
            "message": "If an account with that email exists, a password reset link has been sent."
        }

    # Generate reset token
    reset_token = secrets.token_urlsafe(32)
    expiry = datetime.utcnow() + timedelta(hours=1)

    # Store token with expiry
    PASSWORD_RESET_TOKENS[reset_token] = {
        "user_id": user.id,
        "email": user.email,
        "expiry": expiry
    }

    # Send reset email
    email_sent, error = send_password_reset_email(
        email=user.email,
        reset_token=reset_token,
        full_name=user.full_name
    )

    if not email_sent:
        # Log error but still return success to user
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Failed to send password reset email: {error}")

    return {
        "success": True,
        "message": "If an account with that email exists, a password reset link has been sent."
    }


@router.post("/reset-password")
def reset_password(token: str, new_password: str, db: Session = Depends(get_db)):
    """Reset password using the token from email."""

    # Validate token
    if token not in PASSWORD_RESET_TOKENS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )

    token_data = PASSWORD_RESET_TOKENS[token]

    # Check if token expired
    if datetime.utcnow() > token_data["expiry"]:
        del PASSWORD_RESET_TOKENS[token]
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reset token has expired. Please request a new one."
        )

    # Validate password
    if len(new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 6 characters long"
        )

    # Get user and update password
    user = db.query(User).filter(User.id == token_data["user_id"]).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    user.password_hash = get_password_hash(new_password)
    db.commit()

    # Remove used token
    del PASSWORD_RESET_TOKENS[token]

    return {
        "success": True,
        "message": "Password has been reset successfully. You can now login with your new password."
    }
