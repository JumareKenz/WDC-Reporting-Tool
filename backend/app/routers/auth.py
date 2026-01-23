from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime
from ..database import get_db
from ..models import User, Ward, LGA
from ..schemas import LoginRequest, LoginResponse, UserResponse, WardSimple, LGASimple
from ..auth import verify_password, create_access_token
from ..dependencies import get_current_user

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
    user_data = UserResponse.from_orm(user)

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
