from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime
from ..database import get_db
from ..models import User, InvestigationNote, Ward, LGA
from ..schemas import (
    InvestigationNoteCreate, InvestigationNoteUpdate, InvestigationNoteResponse,
    WardSimple, LGASimple, UserSimple
)
from ..dependencies import get_state_official

router = APIRouter(prefix="/investigations", tags=["Investigations"])


@router.get("", response_model=dict)
def get_investigations(
    status_filter: Optional[str] = None,
    lga_id: Optional[int] = None,
    priority: Optional[str] = None,
    limit: int = 20,
    offset: int = 0,
    current_user: User = Depends(get_state_official),
    db: Session = Depends(get_db)
):
    """Get all investigation notes (State Official only)."""

    query = db.query(InvestigationNote)

    if status_filter:
        query = query.filter(InvestigationNote.status == status_filter)

    if lga_id:
        query = query.filter(InvestigationNote.lga_id == lga_id)

    if priority:
        query = query.filter(InvestigationNote.priority == priority)

    total = query.count()
    investigations = query.order_by(InvestigationNote.created_at.desc()).limit(limit).offset(offset).all()

    investigations_data = []
    for inv in investigations:
        lga = db.query(LGA).filter(LGA.id == inv.lga_id).first() if inv.lga_id else None
        ward = db.query(Ward).filter(Ward.id == inv.ward_id).first() if inv.ward_id else None
        creator = db.query(User).filter(User.id == inv.created_by).first()

        inv_data = {
            "id": inv.id,
            "title": inv.title,
            "description": inv.description,
            "investigation_type": inv.investigation_type,
            "priority": inv.priority,
            "status": inv.status,
            "lga": {
                "id": lga.id,
                "name": lga.name
            } if lga else None,
            "ward": {
                "id": ward.id,
                "name": ward.name
            } if ward else None,
            "created_by": {
                "id": creator.id,
                "full_name": creator.full_name
            } if creator else None,
            "created_at": inv.created_at,
            "updated_at": inv.updated_at
        }

        investigations_data.append(inv_data)

    return {
        "success": True,
        "data": {
            "investigations": investigations_data,
            "total": total,
            "limit": limit,
            "offset": offset
        }
    }


@router.post("", response_model=dict, status_code=status.HTTP_201_CREATED)
def create_investigation(
    investigation_data: InvestigationNoteCreate,
    current_user: User = Depends(get_state_official),
    db: Session = Depends(get_db)
):
    """Create a new investigation note (State Official only)."""

    # Verify LGA exists if provided
    if investigation_data.lga_id:
        lga = db.query(LGA).filter(LGA.id == investigation_data.lga_id).first()
        if not lga:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="LGA not found"
            )

    # Verify ward exists if provided
    if investigation_data.ward_id:
        ward = db.query(Ward).filter(Ward.id == investigation_data.ward_id).first()
        if not ward:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Ward not found"
            )

    investigation = InvestigationNote(
        created_by=current_user.id,
        title=investigation_data.title,
        description=investigation_data.description,
        investigation_type=investigation_data.investigation_type,
        priority=investigation_data.priority,
        lga_id=investigation_data.lga_id,
        ward_id=investigation_data.ward_id
    )

    db.add(investigation)
    db.commit()
    db.refresh(investigation)

    return {
        "success": True,
        "data": {
            "id": investigation.id,
            "title": investigation.title,
            "description": investigation.description,
            "investigation_type": investigation.investigation_type,
            "priority": investigation.priority,
            "status": investigation.status,
            "lga_id": investigation.lga_id,
            "ward_id": investigation.ward_id,
            "created_by": investigation.created_by,
            "created_at": investigation.created_at
        },
        "message": "Investigation created successfully"
    }


@router.get("/{investigation_id}", response_model=dict)
def get_investigation(
    investigation_id: int,
    current_user: User = Depends(get_state_official),
    db: Session = Depends(get_db)
):
    """Get detailed investigation information (State Official only)."""

    investigation = db.query(InvestigationNote).filter(InvestigationNote.id == investigation_id).first()

    if not investigation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Investigation not found"
        )

    lga = db.query(LGA).filter(LGA.id == investigation.lga_id).first() if investigation.lga_id else None
    ward = db.query(Ward).filter(Ward.id == investigation.ward_id).first() if investigation.ward_id else None
    creator = db.query(User).filter(User.id == investigation.created_by).first()

    # Get coordinator if LGA-level investigation
    coordinator = None
    if lga:
        coordinator = db.query(User).filter(
            User.lga_id == lga.id,
            User.role == "LGA_COORDINATOR"
        ).first()

    inv_data = {
        "id": investigation.id,
        "title": investigation.title,
        "description": investigation.description,
        "investigation_type": investigation.investigation_type,
        "priority": investigation.priority,
        "status": investigation.status,
        "lga": {
            "id": lga.id,
            "name": lga.name,
            "code": lga.code,
            "coordinator": {
                "id": coordinator.id,
                "full_name": coordinator.full_name,
                "email": coordinator.email,
                "phone": coordinator.phone
            } if coordinator else None
        } if lga else None,
        "ward": {
            "id": ward.id,
            "name": ward.name,
            "code": ward.code
        } if ward else None,
        "created_by": {
            "id": creator.id,
            "full_name": creator.full_name
        } if creator else None,
        "created_at": investigation.created_at,
        "updated_at": investigation.updated_at,
        "closed_at": investigation.closed_at
    }

    return {
        "success": True,
        "data": inv_data
    }


@router.patch("/{investigation_id}", response_model=dict)
def update_investigation(
    investigation_id: int,
    update_data: InvestigationNoteUpdate,
    current_user: User = Depends(get_state_official),
    db: Session = Depends(get_db)
):
    """Update investigation status or details (State Official only)."""

    investigation = db.query(InvestigationNote).filter(InvestigationNote.id == investigation_id).first()

    if not investigation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Investigation not found"
        )

    # Update fields
    if update_data.title is not None:
        investigation.title = update_data.title

    if update_data.description is not None:
        investigation.description = update_data.description

    if update_data.investigation_type is not None:
        investigation.investigation_type = update_data.investigation_type

    if update_data.priority is not None:
        investigation.priority = update_data.priority

    if update_data.status is not None:
        investigation.status = update_data.status
        if update_data.status == "CLOSED":
            investigation.closed_at = datetime.utcnow()

    investigation.updated_at = datetime.utcnow()

    db.commit()

    return {
        "success": True,
        "data": {
            "id": investigation.id,
            "status": investigation.status,
            "updated_at": investigation.updated_at
        },
        "message": "Investigation updated successfully"
    }


@router.delete("/{investigation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_investigation(
    investigation_id: int,
    current_user: User = Depends(get_state_official),
    db: Session = Depends(get_db)
):
    """Delete an investigation note (State Official only)."""

    investigation = db.query(InvestigationNote).filter(InvestigationNote.id == investigation_id).first()

    if not investigation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Investigation not found"
        )

    db.delete(investigation)
    db.commit()

    return None
