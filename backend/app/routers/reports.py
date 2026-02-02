from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Body, BackgroundTasks
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime
import os
import uuid
import json
from pathlib import Path
from ..database import get_db
from ..models import User, Report, VoiceNote, Ward, LGA, Notification
from ..schemas import (
    ReportCreate, ReportResponse, ReportUpdate, ReportListItem,
    CheckSubmittedResponse, VoiceNoteSimple, WardSimple, UserSimple,
)
from ..dependencies import get_current_user
from ..config import VOICE_NOTES_DIR, MAX_VOICE_NOTE_SIZE, ALLOWED_AUDIO_EXTENSIONS
from ..tasks import process_voice_note
from ..utils.date_utils import validate_report_month, get_month_display_info

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
    meetings_held: int = Form(0),
    attendees_count: int = Form(0),
    issues_identified: Optional[str] = Form(None),
    actions_taken: Optional[str] = Form(None),
    challenges: Optional[str] = Form(None),
    recommendations: Optional[str] = Form(None),
    additional_notes: Optional[str] = Form(None),
    # Comprehensive report data (JSON blob for complex forms)
    report_data: Optional[str] = Form(None),
    voice_note: Optional[UploadFile] = File(None),
    voice_awareness_theme: Optional[UploadFile] = File(None),
    voice_traditional_leaders_support: Optional[UploadFile] = File(None),
    voice_religious_leaders_support: Optional[UploadFile] = File(None),
    voice_support_required: Optional[UploadFile] = File(None),
    voice_aob: Optional[UploadFile] = File(None),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Submit a new monthly report (WDC Secretary only).
    
    Supports both simple form submission (individual fields) and 
    comprehensive form submission (report_data JSON blob).
    """

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

    # Validate report month matches expected submission period
    is_valid, error_msg = validate_report_month(report_month)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg
        )

    # Parse comprehensive report data if provided
    comprehensive_data = {}
    if report_data:
        try:
            comprehensive_data = json.loads(report_data)
        except json.JSONDecodeError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid JSON in report_data field"
            )

    # Extract values from comprehensive data (overrides simple fields)
    def get_value(key, default=None):
        return comprehensive_data.get(key, default)

    # Check if report already exists for this ward and month
    existing_report = db.query(Report).filter(
        Report.ward_id == current_user.ward_id,
        Report.report_month == report_month
    ).first()

    # Build report kwargs from comprehensive data
    report_kwargs = {
        # Basic fields
        'report_month': report_month,
        'meetings_held': get_value('meetings_held', meetings_held),
        'attendees_count': get_value('attendees_count', attendees_count),
        'issues_identified': get_value('issues_identified', issues_identified),
        'actions_taken': get_value('actions_taken', actions_taken),
        'challenges': get_value('challenges', challenges),
        'recommendations': get_value('recommendations', recommendations),
        'additional_notes': get_value('additional_notes', additional_notes),
        
        # Meeting metadata
        'report_date': get_value('report_date'),
        'report_time': get_value('report_time'),
        'meeting_type': get_value('meeting_type', 'Monthly'),
        'agenda_opening_prayer': get_value('agenda_opening_prayer', False),
        'agenda_minutes': get_value('agenda_minutes', False),
        'agenda_action_tracker': get_value('agenda_action_tracker', False),
        'agenda_reports': get_value('agenda_reports', False),
        'agenda_action_plan': get_value('agenda_action_plan', False),
        'agenda_aob': get_value('agenda_aob', False),
        'agenda_closing': get_value('agenda_closing', False),
        
        # Action Tracker (JSON)
        'action_tracker': json.dumps(get_value('action_tracker', [])) if get_value('action_tracker') else None,
        
        # Health Data - OPD
        'health_penta1': get_value('health_penta1', 0),
        'health_bcg': get_value('health_bcg', 0),
        'health_penta3': get_value('health_penta3', 0),
        'health_measles': get_value('health_measles', 0),
        
        # Health Data - OPD Under 5
        'health_malaria_under5': get_value('health_malaria_under5', 0),
        'health_diarrhea_under5': get_value('health_diarrhea_under5', 0),
        
        # Health Data - ANC
        'health_anc_first_visit': get_value('health_anc_first_visit', 0),
        'health_anc_fourth_visit': get_value('health_anc_fourth_visit', 0),
        'health_anc_eighth_visit': get_value('health_anc_eighth_visit', 0),
        'health_deliveries': get_value('health_deliveries', 0),
        'health_postnatal': get_value('health_postnatal', 0),
        
        # Health Data - Family Planning
        'health_fp_counselling': get_value('health_fp_counselling', 0),
        'health_fp_new_acceptors': get_value('health_fp_new_acceptors', 0),
        
        # Health Data - Hepatitis B
        'health_hepb_tested': get_value('health_hepb_tested', 0),
        'health_hepb_positive': get_value('health_hepb_positive', 0),
        
        # Health Data - TB
        'health_tb_presumptive': get_value('health_tb_presumptive', 0),
        'health_tb_on_treatment': get_value('health_tb_on_treatment', 0),
        
        # Health Facility Support
        'facilities_renovated_govt': get_value('facilities_renovated_govt', 0),
        'facilities_renovated_partners': get_value('facilities_renovated_partners', 0),
        'facilities_renovated_wdc': get_value('facilities_renovated_wdc', 0),
        'items_donated_count': get_value('items_donated_count', 0),
        'items_donated_types': json.dumps(get_value('items_donated_types', [])) if get_value('items_donated_types') else None,
        'items_repaired_count': get_value('items_repaired_count', 0),
        'items_repaired_types': json.dumps(get_value('items_repaired_types', [])) if get_value('items_repaired_types') else None,
        
        # Transportation & Emergency
        'women_transported_anc': get_value('women_transported_anc', 0),
        'women_transported_delivery': get_value('women_transported_delivery', 0),
        'children_transported_danger': get_value('children_transported_danger', 0),
        'women_supported_delivery_items': get_value('women_supported_delivery_items', 0),
        
        # cMPDSR
        'maternal_deaths': get_value('maternal_deaths', 0),
        'perinatal_deaths': get_value('perinatal_deaths', 0),
        'maternal_death_causes': json.dumps(get_value('maternal_death_causes', [])) if get_value('maternal_death_causes') else None,
        'perinatal_death_causes': json.dumps(get_value('perinatal_death_causes', [])) if get_value('perinatal_death_causes') else None,
        
        # Community Feedback
        'town_hall_conducted': get_value('town_hall_conducted'),
        'community_feedback': json.dumps(get_value('community_feedback', [])) if get_value('community_feedback') else None,
        
        # VDC Reports
        'vdc_reports': json.dumps(get_value('vdc_reports', [])) if get_value('vdc_reports') else None,
        
        # Community Mobilization
        'awareness_theme': get_value('awareness_theme'),
        'traditional_leaders_support': get_value('traditional_leaders_support'),
        'religious_leaders_support': get_value('religious_leaders_support'),
        
        # Action Plan
        'action_plan': json.dumps(get_value('action_plan', [])) if get_value('action_plan') else None,
        
        # Support & Conclusion
        'support_required': get_value('support_required'),
        'aob': get_value('aob'),
        'attendance_total': get_value('attendance_total', 0),
        'attendance_male': get_value('attendance_male', 0),
        'attendance_female': get_value('attendance_female', 0),
        'next_meeting_date': get_value('next_meeting_date'),
        'chairman_signature': get_value('chairman_signature'),
        'secretary_signature': get_value('secretary_signature'),
        
        'status': 'SUBMITTED'
    }

    # Collect any unknown keys from comprehensive_data into custom_fields JSON
    known_keys = set(report_kwargs.keys()) | {
        'report_month', 'ward_id', 'user_id',
    }
    custom = {k: v for k, v in comprehensive_data.items() if k not in known_keys}
    if custom:
        report_kwargs['custom_fields'] = json.dumps(custom)

    if existing_report:
        # Update existing report
        for key, value in report_kwargs.items():
            setattr(existing_report, key, value)
        existing_report.submitted_at = datetime.utcnow()
        new_report = existing_report
    else:
        # Create new report
        report_kwargs['ward_id'] = current_user.ward_id
        report_kwargs['user_id'] = current_user.id
        new_report = Report(**report_kwargs)
        db.add(new_report)

    db.commit()
    db.refresh(new_report)

    # Save per-field voice notes and kick off background transcription
    per_field_voices = {
        "awareness_theme": voice_awareness_theme,
        "traditional_leaders_support": voice_traditional_leaders_support,
        "religious_leaders_support": voice_religious_leaders_support,
        "support_required": voice_support_required,
        "aob": voice_aob,
    }

    saved_voice_notes = []
    for field_name, uploaded_file in per_field_voices.items():
        if uploaded_file and uploaded_file.filename:
            voice_file_data = save_voice_note(uploaded_file, current_user.ward_id, new_report.id)
            voice_note_record = VoiceNote(
                report_id=new_report.id,
                file_name=voice_file_data["file_name"],
                file_path=voice_file_data["file_path"],
                file_size=voice_file_data["file_size"],
                field_name=field_name,
            )
            db.add(voice_note_record)
            db.commit()
            db.refresh(voice_note_record)
            saved_voice_notes.append(voice_note_record)

            background_tasks.add_task(
                process_voice_note,
                voice_note_id=voice_note_record.id,
                file_path=voice_file_data["file_path"],
                report_id=new_report.id,
                field_name=field_name,
            )

    # Legacy single voice_note support
    voice_note_data = None
    if voice_note and voice_note.filename:
        voice_file_data = save_voice_note(voice_note, current_user.ward_id, new_report.id)
        voice_note_record = VoiceNote(
            report_id=new_report.id,
            file_name=voice_file_data["file_name"],
            file_path=voice_file_data["file_path"],
            file_size=voice_file_data["file_size"],
        )
        db.add(voice_note_record)
        db.commit()
        db.refresh(voice_note_record)
        voice_note_data = voice_note_record
        saved_voice_notes.append(voice_note_record)

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
    response.has_voice_note = len(saved_voice_notes) > 0
    response.voice_notes = [
        VoiceNoteSimple(
            id=vn.id,
            file_name=vn.file_name,
            file_size=vn.file_size,
            duration_seconds=vn.duration_seconds,
            download_url=f"/api/voice-notes/{vn.id}/download"
        ) for vn in saved_voice_notes
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

    report = (
        db.query(Report)
        .filter(
            Report.user_id == current_user.id,
            Report.ward_id == current_user.ward_id,
            Report.report_month == month,
        )
        .order_by(Report.submitted_at.desc())
        .first()
    )

    if report:
        return CheckSubmittedResponse(
            month=month,
            submitted=True,
            report_id=report.id,
            submitted_at=report.submitted_at,
        )

    return CheckSubmittedResponse(
        month=month,
        submitted=False,
    )


@router.get("/state-submissions")
def get_state_submissions(
    month: Optional[str] = None,
    lga_id: Optional[int] = None,
    report_status: Optional[str] = None,
    search: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all submissions across all wards grouped by LGA (State Official only)."""
    if current_user.role != "STATE_OFFICIAL":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only State Officials can access this endpoint"
        )

    if not month:
        now = datetime.now()
        month = f"{now.year}-{now.month:02d}"

    lga_query = db.query(LGA)
    if lga_id:
        lga_query = lga_query.filter(LGA.id == lga_id)
    lgas = lga_query.order_by(LGA.name).all()

    result_lgas = []
    total_reports = 0
    total_wards_reported = 0
    total_wards = 0
    total_voice_notes = 0

    for lga in lgas:
        wards = db.query(Ward).filter(Ward.lga_id == lga.id).all()
        total_wards += len(wards)
        ward_ids = [w.id for w in wards]
        ward_map = {w.id: w for w in wards}

        report_query = db.query(Report).filter(
            Report.ward_id.in_(ward_ids),
            Report.report_month == month
        )

        if report_status:
            report_query = report_query.filter(Report.status == report_status)

        if search:
            matching_ward_ids = [w.id for w in wards if search.lower() in w.name.lower()]
            if not matching_ward_ids:
                continue
            report_query = report_query.filter(Report.ward_id.in_(matching_ward_ids))

        reports = report_query.order_by(Report.submitted_at.desc()).all()
        if not reports:
            continue

        report_items = []
        for report in reports:
            ward = ward_map.get(report.ward_id)
            voice_notes = db.query(VoiceNote).filter(VoiceNote.report_id == report.id).all()
            total_voice_notes += len(voice_notes)

            report_items.append({
                "id": report.id,
                "report_month": report.report_month,
                "ward_id": report.ward_id,
                "ward_name": ward.name if ward else "",
                "ward_code": ward.code if ward else "",
                "status": report.status,
                "meetings_held": report.meetings_held or 0,
                "attendees_count": report.attendees_count or 0,
                "submitted_at": report.submitted_at.isoformat() if report.submitted_at else None,
                "submitted_by": report.user.full_name if report.user else None,
                "voice_notes_count": len(voice_notes),
                "voice_notes": [
                    {
                        "id": vn.id,
                        "file_name": vn.file_name,
                        "file_size": vn.file_size,
                        "duration_seconds": vn.duration_seconds,
                        "field_name": vn.field_name,
                        "download_url": f"/api/voice-notes/{vn.id}/download",
                        "transcription_status": vn.transcription_status,
                        "transcription_text": vn.transcription_text,
                    } for vn in voice_notes
                ]
            })

        wards_with_reports = len(set(r.ward_id for r in reports))
        total_reports += len(reports)
        total_wards_reported += wards_with_reports

        result_lgas.append({
            "lga_id": lga.id,
            "lga_name": lga.name,
            "total_reports": len(report_items),
            "total_wards": len(wards),
            "submission_rate": round((wards_with_reports / len(wards) * 100), 1) if wards else 0,
            "reports": report_items
        })

    result_lgas.sort(key=lambda x: x["submission_rate"], reverse=True)

    return {
        "month": month,
        "total_reports": total_reports,
        "total_wards_reported": total_wards_reported,
        "total_wards": total_wards,
        "total_voice_notes": total_voice_notes,
        "lgas": result_lgas
    }


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


@router.get("/submission-info")
def get_submission_info(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get information about the current submission period and whether user has already submitted.

    Returns target month, month name, whether it's first week, and submission status.
    """
    # Get month display information
    info = get_month_display_info()

    # Check if user has already submitted for this month (if WDC Secretary)
    already_submitted = False
    if current_user.role == "WDC_SECRETARY" and current_user.ward_id:
        existing_report = db.query(Report).filter(
            Report.ward_id == current_user.ward_id,
            Report.report_month == info['target_month']
        ).first()
        already_submitted = existing_report is not None

    return {
        "success": True,
        "data": {
            "target_month": info['target_month'],
            "month_name": info['month_name'],
            "is_first_week": info['is_first_week'],
            "current_day": info['current_day'],
            "already_submitted": already_submitted,
            "submission_period_description": (
                f"Days 1-7: Submit reports for previous month" if info['is_first_week']
                else f"Days 8-31: Submit reports for current month"
            )
        }
    }


