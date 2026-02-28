from fastapi import APIRouter, Depends, HTTPException, status, Response
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import Optional, List
from datetime import datetime
import os
from ..database import get_db
from ..models import User, LGA, Ward, Report, VoiceNote
from ..schemas import (
    LGAResponse, LGASimple, WardSimple, WardStatusResponse, LGAWardsResponse,
    WardsSummary, MissingReportItem, ReportListItem, UserSimple
)
from ..dependencies import get_current_user

router = APIRouter(tags=["LGAs and Wards"])


@router.get("/lgas", response_model=dict)
def get_all_lgas(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all LGAs in Kaduna State."""
    lgas = db.query(LGA).order_by(LGA.name).all()

    return {
        "success": True,
        "data": {
            "lgas": [
                {
                    "id": lga.id,
                    "name": lga.name,
                    "code": lga.code,
                    "num_wards": lga.num_wards
                } for lga in lgas
            ],
            "total": len(lgas)
        }
    }


@router.get("/lgas/{lga_id}", response_model=dict)
def get_lga_details(
    lga_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get specific LGA details with wards."""
    lga = db.query(LGA).filter(LGA.id == lga_id).first()

    if not lga:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="LGA not found"
        )

    wards = db.query(Ward).filter(Ward.lga_id == lga_id).order_by(Ward.name).all()

    return {
        "success": True,
        "data": {
            "id": lga.id,
            "name": lga.name,
            "code": lga.code,
            "population": lga.population,
            "num_wards": lga.num_wards,
            "wards": [
                {
                    "id": ward.id,
                    "name": ward.name,
                    "code": ward.code
                } for ward in wards
            ]
        }
    }


@router.get("/lgas/{lga_id}/wards", response_model=dict)
def get_lga_wards_status(
    lga_id: int,
    month: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all wards in an LGA with submission status."""

    # Check permissions
    if current_user.role == "LGA_COORDINATOR" and current_user.lga_id != lga_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this LGA"
        )

    lga = db.query(LGA).filter(LGA.id == lga_id).first()

    if not lga:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="LGA not found"
        )

    # Use current month if not provided
    if not month:
        now = datetime.now()
        month = f"{now.year}-{now.month:02d}"

    wards = db.query(Ward).filter(Ward.lga_id == lga_id).order_by(Ward.name).all()

    wards_data = []
    submitted_count = 0

    for ward in wards:
        # Get secretary
        secretary = db.query(User).filter(
            User.ward_id == ward.id,
            User.role == "WDC_SECRETARY"
        ).first()

        # Get report for this month
        report = db.query(Report).filter(
            Report.ward_id == ward.id,
            Report.report_month == month
        ).first()

        ward_data = {
            "id": ward.id,
            "name": ward.name,
            "code": ward.code,
            "secretary": None,
            "report": None
        }

        if secretary:
            ward_data["secretary"] = {
                "id": secretary.id,
                "full_name": secretary.full_name,
                "phone": secretary.phone,
                "email": secretary.email
            }

        if report:
            submitted_count += 1
            has_voice_note = db.query(VoiceNote).filter(VoiceNote.report_id == report.id).first() is not None
            ward_data["report"] = {
                "id": report.id,
                "status": report.status,
                "submitted_at": report.submitted_at,
                "has_voice_note": has_voice_note
            }

        wards_data.append(ward_data)

    total_wards = len(wards)
    missing_count = total_wards - submitted_count
    submission_rate = (submitted_count / total_wards * 100) if total_wards > 0 else 0

    return {
        "success": True,
        "data": {
            "lga": {
                "id": lga.id,
                "name": lga.name,
                "code": lga.code,
                "num_wards": lga.num_wards
            },
            "month": month,
            "wards": wards_data,
            "summary": {
                "total_wards": total_wards,
                "submitted": submitted_count,
                "missing": missing_count,
                "submission_rate": round(submission_rate, 2)
            }
        }
    }


@router.get("/lgas/{lga_id}/missing-reports", response_model=dict)
def get_missing_reports(
    lga_id: int,
    month: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get wards with missing reports for a given month."""

    # Check permissions
    if current_user.role == "LGA_COORDINATOR" and current_user.lga_id != lga_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this LGA"
        )

    lga = db.query(LGA).filter(LGA.id == lga_id).first()

    if not lga:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="LGA not found"
        )

    # Use current month if not provided
    if not month:
        now = datetime.now()
        month = f"{now.year}-{now.month:02d}"

    # Get all wards
    wards = db.query(Ward).filter(Ward.lga_id == lga_id).all()

    missing_reports = []

    for ward in wards:
        # Check if report exists for this month
        report = db.query(Report).filter(
            Report.ward_id == ward.id,
            Report.report_month == month
        ).first()

        if not report:
            # Get secretary
            secretary = db.query(User).filter(
                User.ward_id == ward.id,
                User.role == "WDC_SECRETARY"
            ).first()

            # Get last submitted report
            last_report = db.query(Report).filter(
                Report.ward_id == ward.id
            ).order_by(Report.submitted_at.desc()).first()

            missing_data = {
                "ward_id": ward.id,
                "ward_name": ward.name,
                "ward_code": ward.code,
                "secretary": None,
                "last_submitted": last_report.submitted_at if last_report else None
            }

            if secretary:
                missing_data["secretary"] = {
                    "id": secretary.id,
                    "full_name": secretary.full_name,
                    "email": secretary.email,
                    "phone": secretary.phone
                }

            missing_reports.append(missing_data)

    return {
        "success": True,
        "data": {
            "lga_id": lga.id,
            "lga_name": lga.name,
            "month": month,
            "missing_reports": missing_reports,
            "count": len(missing_reports)
        }
    }


@router.get("/lgas/{lga_id}/reports", response_model=dict)
def get_lga_reports(
    lga_id: int,
    month: Optional[str] = None,
    status_filter: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all reports for an LGA."""

    # Check permissions
    if current_user.role == "LGA_COORDINATOR" and current_user.lga_id != lga_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this LGA"
        )

    lga = db.query(LGA).filter(LGA.id == lga_id).first()

    if not lga:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="LGA not found"
        )

    # Build query
    query = db.query(Report).join(Ward).filter(Ward.lga_id == lga_id)

    if month:
        query = query.filter(Report.report_month == month)

    if status_filter:
        query = query.filter(Report.status == status_filter)

    total = query.count()
    reports = query.order_by(Report.submitted_at.desc()).limit(limit).offset(offset).all()

    reports_data = []
    for report in reports:
        ward = db.query(Ward).filter(Ward.id == report.ward_id).first()
        secretary = db.query(User).filter(User.id == report.user_id).first()
        has_voice_note = db.query(VoiceNote).filter(VoiceNote.report_id == report.id).first() is not None

        reports_data.append({
            "id": report.id,
            "ward_name": ward.name if ward else None,
            "report_month": report.report_month,
            "meetings_held": report.meetings_held,
            "attendees_count": report.attendees_count,
            "status": report.status,
            "submitted_at": report.submitted_at,
            "secretary_name": secretary.full_name if secretary else None,
            "has_voice_note": has_voice_note
        })

    return {
        "success": True,
        "data": {
            "reports": reports_data,
            "total": total,
            "limit": limit,
            "offset": offset
        }
    }


@router.get("/wards/{ward_id}", response_model=dict)
def get_ward_details(
    ward_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get specific ward details."""
    ward = db.query(Ward).filter(Ward.id == ward_id).first()

    if not ward:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ward not found"
        )

    lga = db.query(LGA).filter(LGA.id == ward.lga_id).first()

    return {
        "success": True,
        "data": {
            "id": ward.id,
            "name": ward.name,
            "code": ward.code,
            "population": ward.population,
            "lga": {
                "id": lga.id,
                "name": lga.name,
                "code": lga.code
            } if lga else None
        }
    }


@router.get("/voice-notes/{voice_note_id}/download")
async def download_voice_note(
    voice_note_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Download a voice note file."""

    voice_note = db.query(VoiceNote).filter(VoiceNote.id == voice_note_id).first()

    if not voice_note:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Voice note not found"
        )

    # Get report and check permissions
    report = db.query(Report).filter(Report.id == voice_note.report_id).first()

    if current_user.role == "WDC_SECRETARY":
        if report.ward_id != current_user.ward_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to download this file"
            )
    elif current_user.role == "LGA_COORDINATOR":
        ward = db.query(Ward).filter(Ward.id == report.ward_id).first()
        if ward.lga_id != current_user.lga_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to download this file"
            )

    # Check if file exists
    if not os.path.exists(voice_note.file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found on server"
        )

    return FileResponse(
        voice_note.file_path,
        media_type="application/octet-stream",
        filename=voice_note.file_name
    )
