from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import Optional
from .database import get_db
from .auth import verify_token
from .models import User
from .schemas import TokenData

# Security scheme
security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """Get the current authenticated user."""
    token = credentials.credentials
    token_data: TokenData = verify_token(token)

    user = db.query(User).filter(User.id == token_data.user_id).first()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user"
        )

    return user


def require_role(allowed_roles: list):
    """Dependency to check if user has required role."""
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access forbidden. Required roles: {', '.join(allowed_roles)}"
            )
        return current_user
    return role_checker


def get_wdc_secretary(current_user: User = Depends(get_current_user)) -> User:
    """Dependency for WDC Secretary role."""
    if current_user.role != "WDC_SECRETARY":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden. WDC Secretary role required."
        )
    return current_user


def get_lga_coordinator(current_user: User = Depends(get_current_user)) -> User:
    """Dependency for LGA Coordinator role."""
    if current_user.role != "LGA_COORDINATOR":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden. LGA Coordinator role required."
        )
    return current_user


def get_state_official(current_user: User = Depends(get_current_user)) -> User:
    """Dependency for State Official role."""
    if current_user.role != "STATE_OFFICIAL":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden. State Official role required."
        )
    return current_user
