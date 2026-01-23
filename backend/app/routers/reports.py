from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime
import os
import uuid
from pathlib import Path
from ..database import get_db
from ..models import User, Report, VoiceNote, Ward, LGA, Notification
from ..schemas import (
    ReportCreate, ReportResponse, ReportUpdate, ReportListItem,
    CheckSubmittedResponse, VoiceNoteSimple, WardSimple, UserSimple
)
from ..dependencies import get_current_user
from ..config import VOICE_NOTES_DIR, MAX_VOICE_NOTE_SIZE, ALLOWED_AUDIO_EXTENSIONS

router = APIRouter(prefix="/reports", tags=["Reports"])


def save_voice_note(file: UploadFile, ward_id: int, report_id: int) -> dict:
    """Save uploaded voice note file."""
    # Check file size
    file.file.seek(0, 2)
    file_size = file.file.tell()
    file.file.seek(0)

    if file_size > MAX_VOICE_NOTE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large. Maximum size is {MAX_VOICE_NOTE_SIZE / 1024 / 1024}MB"
        )

    # Check file extension
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in ALLOWED_AUDIO_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Allowed types: {', '.join(ALLOWED_AUDIO_EXTENSIONS)}"
        )

    # Create directory structure: year/month/
    now = datetime.now()
    upload_dir = VOICE_NOTES_DIR / str(now.year) / f"{now.month:02d}"
    upload_dir.mkdir(parents=True, exist_ok=True)

    # Generate unique filename
    unique_id = uuid.uuid4().hex[:8]
    timestamp = int(datetime.now().timestamp())
    filename = f"ward_{ward_id}_{timestamp}_{unique_id}{file_ext}"
    file_path = upload_dir / filename

    # Save file
    with open(file_path, "wb") as buffer:
        buffer.write(file.file.read())

    return {
        "file_name": file.filename,
        "file_path": str(file_path),
        "file_size": file_size
    }


@router.post("", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
async def create_report(
    report_month: str = Form(...),
    meetings_held: int = Form(...),
    attendees_count: int = Form(...),
    issues_identified: Optional[str] = Form(None),
    actions_taken: Optional[str] = Form(None),
    challenges: Optional[str] = Form(None),
    recommendations: Optional[str] = Form(None),
    additional_notes: Optional[str] = Form(None),
    voice_note: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Submit a new monthly report (WDC Secretary only)."""

    # Check if user is WDC Secretary
    if current_user.role != "WDC_SECRETARY":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only WDC Secretaries can submit reports"
        )

    if not current_user.ward_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not assigned to a ward"
        )

    # Check if report already exists for this ward and month
    existing_report = db.query(Report).filter(
        Report.ward_id == current_user.ward_id,
        Report.report_month == report_month
    ).first()

    if existing_report:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Report for {report_month} already exists"
        )

    # Create report
    new_report = Report(
        ward_id=current_user.ward_id,
        user_id=current_user.id,
        report_month=report_month,
        meetings_held=meetings_held,
        attendees_count=attendees_count,
        issues_identified=issues_identified,
        actions_taken=actions_taken,
        challenges=challenges,
        recommendations=recommendations,
        additional_notes=additional_notes,
        status="SUBMITTED"
    )

    db.add(new_report)
    db.commit()
    db.refresh(new_report)

    # Save voice note if provided
    voice_note_data = None
    if voice_note:
        voice_file_data = save_voice_note(voice_note, current_user.ward_id, new_report.id)
        voice_note_record = VoiceNote(
            report_id=new_report.id,
            file_name=voice_file_data["file_name"],
            file_path=voice_file_data["file_path"],
            file_size=voice_file_data["file_size"]
        )
        db.add(voice_note_record)
        db.commit()
        db.refresh(voice_note_record)
        voice_note_data = voice_note_record

    # Create notification for LGA Coordinator
    ward = db.query(Ward).filter(Ward.id == current_user.ward_id).first()
    if ward:
        coordinator = db.query(User).filter(
            User.lga_id == ward.lga_id,
            User.role == "LGA_COORDINATOR"
        ).first()

        if coordinator:
            notification = Notification(
                recipient_id=coordinator.id,
                sender_id=current_user.id,
                notification_type="REPORT_SUBMITTED",
                title="New Report Submitted",
                message=f"{ward.name} ward has submitted their {report_month} report",
                related_entity_type="report",
                related_entity_id=new_report.id
            )
            db.add(notification)
            db.commit()

    # Prepare response
    response = ReportResponse.from_orm(new_report)
    response.has_voice_note = voice_note_data is not None

    if voice_note_data:
        response.voice_notes = [
            VoiceNoteSimple(
                id=voice_note_data.id,
                file_name=voice_note_data.file_name,
                file_size=voice_note_data.file_size,
                duration_seconds=voice_note_data.duration_seconds,
                download_url=f"/api/voice-notes/{voice_note_data.id}/download"
            )
        ]

    return response


@router.get("", response_model=List[ReportListItem])
def get_reports(
    limit: int = 10,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get reports for current user's ward."""

    if current_user.role != "WDC_SECRETARY":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only WDC Secretaries can access this endpoint"
        )

    reports = db.query(Report).filter(
        Report.ward_id == current_user.ward_id
    ).order_by(Report.submitted_at.desc()).limit(limit).offset(offset).all()

    result = []
    for report in reports:
        has_voice_note = db.query(VoiceNote).filter(VoiceNote.report_id == report.id).first() is not None
        result.append(
            ReportListItem(
                id=report.id,
                report_month=report.report_month,
                meetings_held=report.meetings_held,
                attendees_count=report.attendees_count,
                status=report.status,
                submitted_at=report.submitted_at,
                has_voice_note=has_voice_note
            )
        )

    return result


@router.get("/check-submitted", response_model=CheckSubmittedResponse)
def check_submitted(
    month: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Check if current month's report has been submitted."""

    if current_user.role != "WDC_SECRETARY":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only WDC Secretaries can access this endpoint"
        )

    # Use current month if not provided
    if not month:
        now = datetime.now()
        month = f"{now.year}-{now.month:02d}"

    report = db.query(Report).filter(
        Report.ward_id == current_user.ward_id,
        Report.report_month == month
    ).first()

    if report:
        return CheckSubmittedResponse(
            month=month,
            submitted=True,
            report_id=report.id,
            submitted_at=report.submitted_at
        )
    else:
        return CheckSubmittedResponse(
            month=month,
            submitted=False
        )


@router.get("/{report_id}", response_model=ReportResponse)
def get_report(
    report_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get detailed report information."""

    report = db.query(Report).filter(Report.id == report_id).first()

    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found"
        )

    # Check permissions
    if current_user.role == "WDC_SECRETARY":
        if report.ward_id != current_user.ward_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to view this report"
            )
    elif current_user.role == "LGA_COORDINATOR":
        ward = db.query(Ward).filter(Ward.id == report.ward_id).first()
        if ward.lga_id != current_user.lga_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to view this report"
            )

    # Get ward info
    ward = db.query(Ward).filter(Ward.id == report.ward_id).first()
    lga = db.query(LGA).filter(LGA.id == ward.lga_id).first() if ward else None

    # Get voice notes
    voice_notes = db.query(VoiceNote).filter(VoiceNote.report_id == report.id).all()

    # Prepare response
    response = ReportResponse.from_orm(report)
    response.has_voice_note = len(voice_notes) > 0

    if ward:
        response.ward = WardSimple(
            id=ward.id,
            name=ward.name,
            code=ward.code,
            lga_id=ward.lga_id,
            lga_name=lga.name if lga else None
        )

    response.submitted_by = UserSimple(
        id=report.user.id,
        full_name=report.user.full_name
    )

    response.voice_notes = [
        VoiceNoteSimple(
            id=vn.id,
            file_name=vn.file_name,
            file_size=vn.file_size,
            duration_seconds=vn.duration_seconds,
            download_url=f"/api/voice-notes/{vn.id}/download"
        ) for vn in voice_notes
    ]

    return response


@router.patch("/{report_id}/review")
def review_report(
    report_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark a report as reviewed (LGA Coordinator or State Official)."""

    if current_user.role not in ["LGA_COORDINATOR", "STATE_OFFICIAL"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only LGA Coordinators and State Officials can review reports"
        )

    report = db.query(Report).filter(Report.id == report_id).first()

    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found"
        )

    # Check permissions for LGA Coordinator
    if current_user.role == "LGA_COORDINATOR":
        ward = db.query(Ward).filter(Ward.id == report.ward_id).first()
        if ward.lga_id != current_user.lga_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to review this report"
            )

    report.status = "REVIEWED"
    report.reviewed_by = current_user.id
    report.reviewed_at = datetime.utcnow()

    db.commit()

    return {
        "success": True,
        "data": {
            "id": report.id,
            "status": report.status,
            "reviewed_by": report.reviewed_by,
            "reviewed_at": report.reviewed_at
        },
        "message": "Report marked as reviewed"
    }
