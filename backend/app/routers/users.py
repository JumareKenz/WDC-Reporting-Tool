from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User, LGA, Ward
from ..dependencies import get_state_official
from ..auth import get_password_hash
from ..schemas import UserAssignRequest, UserUpdateRequest, UserPasswordChange, UserAccessChange
from ..utils.password_generator import generate_memorable_password
from ..services.sms import send_welcome_sms

router = APIRouter(prefix="/users", tags=["User Management"])


def _build_user_detail(user, db):
    """Build a complete user detail dict for API responses."""
    data = {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "phone": user.phone,
        "role": user.role,
        "is_active": user.is_active,
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "last_login": user.last_login.isoformat() if user.last_login else None,
        "ward_id": user.ward_id,
        "lga_id": user.lga_id,
        "ward_name": None,
        "ward_code": None,
        "lga_name": None,
    }

    if user.ward_id:
        ward = db.query(Ward).filter(Ward.id == user.ward_id).first()
        if ward:
            data["ward_name"] = ward.name
            data["ward_code"] = ward.code
            data["lga_id"] = ward.lga_id
            lga = db.query(LGA).filter(LGA.id == ward.lga_id).first()
            if lga:
                data["lga_name"] = lga.name
    elif user.lga_id:
        lga = db.query(LGA).filter(LGA.id == user.lga_id).first()
        if lga:
            data["lga_name"] = lga.name

    return data


@router.get("/summary")
def get_users_summary(
    current_user: User = Depends(get_state_official),
    db: Session = Depends(get_db),
):
    """Get user management dashboard summary statistics."""
    total_coordinators = db.query(User).filter(User.role == "LGA_COORDINATOR").count()
    active_coordinators = db.query(User).filter(
        User.role == "LGA_COORDINATOR", User.is_active == True
    ).count()
    total_secretaries = db.query(User).filter(User.role == "WDC_SECRETARY").count()
    active_secretaries = db.query(User).filter(
        User.role == "WDC_SECRETARY", User.is_active == True
    ).count()

    # LGAs / wards that have no user assigned yet
    coordinator_lga_ids = db.query(User.lga_id).filter(
        User.role == "LGA_COORDINATOR", User.lga_id.isnot(None)
    ).distinct()
    unassigned_lgas = db.query(LGA).filter(~LGA.id.in_(coordinator_lga_ids)).count()

    secretary_ward_ids = db.query(User.ward_id).filter(
        User.role == "WDC_SECRETARY", User.ward_id.isnot(None)
    ).distinct()
    unassigned_wards = db.query(Ward).filter(~Ward.id.in_(secretary_ward_ids)).count()

    return {
        "total_lgas": db.query(LGA).count(),
        "total_wards": db.query(Ward).count(),
        "total_coordinators": total_coordinators,
        "active_coordinators": active_coordinators,
        "total_secretaries": total_secretaries,
        "active_secretaries": active_secretaries,
        "unassigned_lgas": unassigned_lgas,
        "unassigned_wards": unassigned_wards,
    }


@router.get("/lga-wards/{lga_id}")
def get_lga_wards(
    lga_id: int,
    current_user: User = Depends(get_state_official),
    db: Session = Depends(get_db),
):
    """Get ward list for an LGA used by the user management navigation tree."""
    lga = db.query(LGA).filter(LGA.id == lga_id).first()
    if not lga:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="LGA not found")

    wards = db.query(Ward).filter(Ward.lga_id == lga_id).order_by(Ward.name).all()
    return [{"id": w.id, "name": w.name, "code": w.code} for w in wards]


@router.get("/coordinator/{lga_id}")
def get_lga_coordinator(
    lga_id: int,
    current_user: User = Depends(get_state_official),
    db: Session = Depends(get_db),
):
    """Get the LGA Coordinator assigned to a specific LGA."""
    user = db.query(User).filter(
        User.lga_id == lga_id, User.role == "LGA_COORDINATOR"
    ).first()

    if not user:
        return {"user": None}

    return {"user": _build_user_detail(user, db)}


@router.get("/secretary/{ward_id}")
def get_ward_secretary(
    ward_id: int,
    current_user: User = Depends(get_state_official),
    db: Session = Depends(get_db),
):
    """Get the WDC Secretary assigned to a specific ward."""
    user = db.query(User).filter(
        User.ward_id == ward_id, User.role == "WDC_SECRETARY"
    ).first()

    if not user:
        return {"user": None}

    return {"user": _build_user_detail(user, db)}


@router.patch("/{user_id}")
def update_user(
    user_id: int,
    update_data: UserUpdateRequest,
    current_user: User = Depends(get_state_official),
    db: Session = Depends(get_db),
):
    """Update a user's name and phone number. Email and role are immutable."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if user.role == "STATE_OFFICIAL":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="State Official accounts cannot be modified via User Management.",
        )

    if update_data.full_name is not None:
        user.full_name = update_data.full_name.strip()
    if update_data.phone is not None:
        user.phone = update_data.phone.strip() if update_data.phone.strip() else None

    db.commit()
    db.refresh(user)
    return {"success": True, "message": "User profile updated.", "user": _build_user_detail(user, db)}


@router.patch("/{user_id}/password")
def change_user_password(
    user_id: int,
    password_data: UserPasswordChange,
    current_user: User = Depends(get_state_official),
    db: Session = Depends(get_db),
):
    """Reset a user's password. State Officials cannot be targeted."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if user.role == "STATE_OFFICIAL":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="State Official accounts cannot be modified via User Management.",
        )

    user.password_hash = get_password_hash(password_data.new_password)
    db.commit()
    return {"success": True, "message": "Password has been reset successfully."}


@router.patch("/{user_id}/access")
def toggle_user_access(
    user_id: int,
    access_data: UserAccessChange,
    current_user: User = Depends(get_state_official),
    db: Session = Depends(get_db),
):
    """Activate or revoke a user's platform access."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if user.role == "STATE_OFFICIAL":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="State Official accounts cannot be modified via User Management.",
        )

    user.is_active = access_data.is_active
    db.commit()
    action = "restored" if user.is_active else "revoked"
    return {"success": True, "message": f"Access {action} for {user.full_name}."}


@router.post("/assign")
def assign_user(
    assign_data: UserAssignRequest,
    current_user: User = Depends(get_state_official),
    db: Session = Depends(get_db),
):
    """Create a new user and assign them as LGA Coordinator or WDC Secretary."""
    if assign_data.role not in ("LGA_COORDINATOR", "WDC_SECRETARY"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role must be LGA_COORDINATOR or WDC_SECRETARY.",
        )

    ward = None

    if assign_data.role == "LGA_COORDINATOR":
        if not assign_data.lga_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="lga_id is required for LGA Coordinator.",
            )
        lga = db.query(LGA).filter(LGA.id == assign_data.lga_id).first()
        if not lga:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="LGA not found.")
        existing = db.query(User).filter(
            User.lga_id == assign_data.lga_id, User.role == "LGA_COORDINATOR"
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"An LGA Coordinator is already assigned to {lga.name}.",
            )

    if assign_data.role == "WDC_SECRETARY":
        if not assign_data.ward_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="ward_id is required for WDC Secretary.",
            )
        ward = db.query(Ward).filter(Ward.id == assign_data.ward_id).first()
        if not ward:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ward not found.")
        existing = db.query(User).filter(
            User.ward_id == assign_data.ward_id, User.role == "WDC_SECRETARY"
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"A WDC Secretary is already assigned to {ward.name} ward.",
            )

    # Email must be unique across all users
    if db.query(User).filter(User.email == assign_data.email).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This email address is already in use.",
        )

    # Auto-generate password if not provided
    password = assign_data.password
    if not password:
        password = generate_memorable_password()

    new_user = User(
        email=assign_data.email,
        password_hash=get_password_hash(password),
        full_name=assign_data.full_name.strip(),
        phone=assign_data.phone.strip(),
        role=assign_data.role,
        lga_id=assign_data.lga_id if assign_data.role == "LGA_COORDINATOR" else (ward.lga_id if ward else None),
        ward_id=assign_data.ward_id if assign_data.role == "WDC_SECRETARY" else None,
        is_active=True,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Send welcome SMS with credentials
    sms_sent = False
    sms_error = None
    if assign_data.phone:
        sms_success, sms_error = send_welcome_sms(
            phone=assign_data.phone,
            full_name=assign_data.full_name,
            email=assign_data.email,
            password=password,
            role=assign_data.role
        )
        sms_sent = sms_success

    role_label = "LGA Coordinator" if assign_data.role == "LGA_COORDINATOR" else "WDC Secretary"

    response_message = f"{role_label} assigned successfully."
    if sms_sent:
        response_message += " Login credentials sent via SMS."
    elif sms_error:
        response_message += f" Note: SMS failed - {sms_error}. Please share credentials manually."
    else:
        response_message += " Note: SMS not configured. Please share credentials manually."

    return {
        "success": True,
        "message": response_message,
        "user": _build_user_detail(new_user, db),
        "credentials": {
            "email": assign_data.email,
            "password": password if not assign_data.password else None  # Only return auto-generated passwords
        },
        "sms_sent": sms_sent
    }
