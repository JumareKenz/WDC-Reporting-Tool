from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, List
from datetime import datetime
from enum import Enum
import json


# Enums
class UserRole(str, Enum):
    WDC_SECRETARY = "WDC_SECRETARY"
    LGA_COORDINATOR = "LGA_COORDINATOR"
    STATE_OFFICIAL = "STATE_OFFICIAL"


class ReportStatus(str, Enum):
    DRAFT = "DRAFT"
    SUBMITTED = "SUBMITTED"
    REVIEWED = "REVIEWED"
    FLAGGED = "FLAGGED"


class NotificationType(str, Enum):
    REPORT_SUBMITTED = "REPORT_SUBMITTED"
    REPORT_MISSING = "REPORT_MISSING"
    FEEDBACK = "FEEDBACK"
    SYSTEM = "SYSTEM"
    REMINDER = "REMINDER"


class InvestigationType(str, Enum):
    GENERAL = "GENERAL"
    FINANCIAL = "FINANCIAL"
    COMPLIANCE = "COMPLIANCE"
    PERFORMANCE = "PERFORMANCE"
    COMPLAINT = "COMPLAINT"


class InvestigationPriority(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    URGENT = "URGENT"


class InvestigationStatus(str, Enum):
    OPEN = "OPEN"
    IN_PROGRESS = "IN_PROGRESS"
    PENDING = "PENDING"
    CLOSED = "CLOSED"


# LGA Schemas
class LGABase(BaseModel):
    name: str
    code: str
    population: Optional[int] = None
    num_wards: int = 0


class LGACreate(LGABase):
    pass


class LGAResponse(LGABase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class LGASimple(BaseModel):
    id: int
    name: str
    code: str

    class Config:
        from_attributes = True


# Ward Schemas
class WardBase(BaseModel):
    name: str
    code: str
    population: Optional[int] = None


class WardCreate(WardBase):
    lga_id: int


class WardResponse(WardBase):
    id: int
    lga_id: int
    lga_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class WardSimple(BaseModel):
    id: int
    name: str
    code: str
    lga_id: Optional[int] = None
    lga_name: Optional[str] = None

    class Config:
        from_attributes = True


# User Schemas
class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    phone: Optional[str] = None
    role: UserRole


class UserCreate(UserBase):
    password: str
    ward_id: Optional[int] = None
    lga_id: Optional[int] = None


class UserResponse(UserBase):
    id: int
    is_active: bool
    created_at: datetime
    last_login: Optional[datetime] = None
    ward: Optional[WardSimple] = None
    lga: Optional[LGASimple] = None

    class Config:
        from_attributes = True


class UserSimple(BaseModel):
    id: int
    full_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[str] = None

    class Config:
        from_attributes = True


# Auth Schemas
class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class TokenData(BaseModel):
    user_id: int
    email: str
    role: str


# Voice Note Schemas
class VoiceNoteBase(BaseModel):
    file_name: str
    file_size: Optional[int] = None
    duration_seconds: Optional[int] = None


class VoiceNoteResponse(VoiceNoteBase):
    id: int
    report_id: int
    file_path: str
    uploaded_at: datetime
    download_url: Optional[str] = None

    class Config:
        from_attributes = True


class VoiceNoteSimple(BaseModel):
    id: int
    file_name: str
    file_size: Optional[int] = None
    duration_seconds: Optional[int] = None
    download_url: Optional[str] = None
    field_name: Optional[str] = None
    transcription_status: Optional[str] = None
    transcription_text: Optional[str] = None

    class Config:
        from_attributes = True


class AISuggestionsResponse(BaseModel):
    report_id: int
    voice_note_id: Optional[int] = None
    transcription_status: str
    transcription_text: Optional[str] = None
    suggestions: Optional[dict] = None


class AcceptSuggestionsRequest(BaseModel):
    fields: List[str]


# Helper schemas for JSON fields
class ActionTrackerItem(BaseModel):
    action_point: str
    status: str
    challenges: Optional[str] = None
    timeline: Optional[str] = None
    responsible_person: Optional[str] = None


class CommunityFeedbackItem(BaseModel):
    indicator: str
    feedback: Optional[str] = None
    action_required: Optional[str] = None


class VDCReportItem(BaseModel):
    vdc_name: str
    issues: Optional[str] = None
    action_taken: Optional[str] = None


class ActionPlanItem(BaseModel):
    issue: str
    action: Optional[str] = None
    timeline: Optional[str] = None
    responsible_person: Optional[str] = None


# Report Schemas
class ReportBase(BaseModel):
    report_month: str = Field(..., pattern=r"^\d{4}-\d{2}$")
    report_date: Optional[str] = None
    report_time: Optional[str] = None
    
    # Meeting Type and Agenda
    meeting_type: Optional[str] = "Monthly"
    agenda_opening_prayer: Optional[bool] = False
    agenda_minutes: Optional[bool] = False
    agenda_action_tracker: Optional[bool] = False
    agenda_reports: Optional[bool] = False
    agenda_action_plan: Optional[bool] = False
    agenda_aob: Optional[bool] = False
    agenda_closing: Optional[bool] = False
    
    # Action Tracker (JSON)
    action_tracker: Optional[List[ActionTrackerItem]] = None
    
    # Legacy simple fields
    meetings_held: int = Field(ge=0, default=0)
    attendees_count: int = Field(ge=0, default=0)
    issues_identified: Optional[str] = None
    actions_taken: Optional[str] = None
    challenges: Optional[str] = None
    recommendations: Optional[str] = None
    additional_notes: Optional[str] = None
    
    # Section 3A: Health Data - OPD
    health_penta1: Optional[int] = Field(None, ge=0)
    health_bcg: Optional[int] = Field(None, ge=0)
    health_penta3: Optional[int] = Field(None, ge=0)
    health_measles: Optional[int] = Field(None, ge=0)
    
    # Section 3A: Health Data - OPD Under 5
    health_malaria_under5: Optional[int] = Field(None, ge=0)
    health_diarrhea_under5: Optional[int] = Field(None, ge=0)
    
    # Section 3A: Health Data - ANC
    health_anc_first_visit: Optional[int] = Field(None, ge=0)
    health_anc_fourth_visit: Optional[int] = Field(None, ge=0)
    health_anc_eighth_visit: Optional[int] = Field(None, ge=0)
    health_deliveries: Optional[int] = Field(None, ge=0)
    health_postnatal: Optional[int] = Field(None, ge=0)
    
    # Section 3A: Health Data - Family Planning
    health_fp_counselling: Optional[int] = Field(None, ge=0)
    health_fp_new_acceptors: Optional[int] = Field(None, ge=0)
    
    # Section 3A: Health Data - Hepatitis B
    health_hepb_tested: Optional[int] = Field(None, ge=0)
    health_hepb_positive: Optional[int] = Field(None, ge=0)
    
    # Section 3A: Health Data - TB
    health_tb_presumptive: Optional[int] = Field(None, ge=0)
    health_tb_on_treatment: Optional[int] = Field(None, ge=0)
    
    # Section 3B: Health Facility Support - Renovations
    facilities_renovated_govt: Optional[int] = Field(None, ge=0)
    facilities_renovated_partners: Optional[int] = Field(None, ge=0)
    facilities_renovated_wdc: Optional[int] = Field(None, ge=0)
    
    # Section 3B: Items
    items_donated_count: Optional[int] = Field(None, ge=0)
    items_donated_types: Optional[List[str]] = None
    items_repaired_count: Optional[int] = Field(None, ge=0)
    items_repaired_types: Optional[List[str]] = None
    
    # Section 3C: Transportation & Emergency
    women_transported_anc: Optional[int] = Field(None, ge=0)
    women_transported_delivery: Optional[int] = Field(None, ge=0)
    children_transported_danger: Optional[int] = Field(None, ge=0)
    women_supported_delivery_items: Optional[int] = Field(None, ge=0)
    
    # Section 3D: cMPDSR
    maternal_deaths: Optional[int] = Field(None, ge=0)
    perinatal_deaths: Optional[int] = Field(None, ge=0)
    maternal_death_causes: Optional[List[str]] = None
    perinatal_death_causes: Optional[List[str]] = None
    
    # Section 4: Community Feedback
    town_hall_conducted: Optional[str] = None
    community_feedback: Optional[List[CommunityFeedbackItem]] = None
    
    # Section 5: VDC Reports
    vdc_reports: Optional[List[VDCReportItem]] = None
    
    # Section 6: Community Mobilization
    awareness_theme: Optional[str] = None
    traditional_leaders_support: Optional[str] = None
    religious_leaders_support: Optional[str] = None
    
    # Section 7: Community Action Plan
    action_plan: Optional[List[ActionPlanItem]] = None
    
    # Section 8: Support & Conclusion
    support_required: Optional[str] = None
    aob: Optional[str] = None
    attendance_total: Optional[int] = Field(None, ge=0)
    attendance_male: Optional[int] = Field(None, ge=0)
    attendance_female: Optional[int] = Field(None, ge=0)
    next_meeting_date: Optional[str] = None
    chairman_signature: Optional[str] = None
    secretary_signature: Optional[str] = None

    @validator('attendance_total')
    def validate_attendance_total(cls, v, values):
        """Validate that attendance_total >= attendance_male + attendance_female"""
        if v is not None:
            male = values.get('attendance_male', 0) or 0
            female = values.get('attendance_female', 0) or 0
            if v < (male + female):
                raise ValueError(f'Attendance total ({v}) must be >= sum of male ({male}) and female ({female})')
        return v

    @validator('health_hepb_positive')
    def validate_hepb_positive(cls, v, values):
        """Validate that health_hepb_positive <= health_hepb_tested"""
        if v is not None and v > 0:
            tested = values.get('health_hepb_tested', 0) or 0
            if v > tested:
                raise ValueError(f'Hepatitis B positive cases ({v}) cannot exceed tested cases ({tested})')
        return v

    @validator('next_meeting_date')
    def validate_next_meeting_date(cls, v):
        """Validate that next_meeting_date is in the future"""
        if v:
            from datetime import datetime
            try:
                meeting_date = datetime.strptime(v, '%Y-%m-%d')
                if meeting_date.date() < datetime.utcnow().date():
                    raise ValueError('Next meeting date must be in the future')
            except ValueError as e:
                if 'does not match format' in str(e):
                    raise ValueError('Next meeting date must be in YYYY-MM-DD format')
                raise
        return v

    @validator('action_tracker')
    def validate_action_tracker_size(cls, v):
        """Validate action_tracker max size"""
        if v and len(v) > 10:
            raise ValueError('Action tracker cannot have more than 10 items')
        return v

    @validator('vdc_reports')
    def validate_vdc_reports_size(cls, v):
        """Validate vdc_reports max size"""
        if v and len(v) > 10:
            raise ValueError('VDC reports cannot have more than 10 items')
        return v

    @validator('action_plan')
    def validate_action_plan_size(cls, v):
        """Validate action_plan max size"""
        if v and len(v) > 10:
            raise ValueError('Action plan cannot have more than 10 items')
        return v

    @validator('community_feedback')
    def validate_community_feedback_size(cls, v):
        """Validate community_feedback has exactly 5 items"""
        if v and len(v) != 5:
            raise ValueError('Community feedback must have exactly 5 items')
        return v


class ReportCreate(ReportBase):
    pass


class ReportUpdate(BaseModel):
    meetings_held: Optional[int] = Field(None, ge=0)
    attendees_count: Optional[int] = Field(None, ge=0)
    issues_identified: Optional[str] = None
    actions_taken: Optional[str] = None
    challenges: Optional[str] = None
    recommendations: Optional[str] = None
    additional_notes: Optional[str] = None


class ReportResponse(ReportBase):
    id: int
    ward_id: int
    user_id: int
    status: ReportStatus
    submitted_at: datetime
    reviewed_by: Optional[int] = None
    reviewed_at: Optional[datetime] = None
    ward: Optional[WardSimple] = None
    submitted_by: Optional[UserSimple] = None
    voice_notes: List[VoiceNoteSimple] = []
    has_voice_note: bool = False

    @validator('action_tracker', 'community_feedback', 'vdc_reports', 'action_plan', pre=True)
    def parse_json_fields(cls, v):
        """Parse JSON string fields from database into lists."""
        if isinstance(v, str):
            try:
                return json.loads(v) if v else None
            except json.JSONDecodeError:
                return None
        return v

    class Config:
        from_attributes = True


class ReportListItem(BaseModel):
    id: int
    report_month: str
    meetings_held: int
    attendees_count: int
    status: ReportStatus
    submitted_at: datetime
    has_voice_note: bool = False
    ward_name: Optional[str] = None
    secretary_name: Optional[str] = None

    class Config:
        from_attributes = True


class CheckSubmittedResponse(BaseModel):
    month: str
    submitted: bool
    report_id: Optional[int] = None
    submitted_at: Optional[datetime] = None


# Notification Schemas
class NotificationBase(BaseModel):
    title: str
    message: str
    notification_type: NotificationType


class NotificationCreate(NotificationBase):
    recipient_id: int
    sender_id: Optional[int] = None
    related_entity_type: Optional[str] = None
    related_entity_id: Optional[int] = None


class NotificationSend(BaseModel):
    recipient_ids: List[int]
    title: str
    message: str
    notification_type: NotificationType = NotificationType.REMINDER


class NotificationResponse(NotificationBase):
    id: int
    recipient_id: int
    sender_id: Optional[int] = None
    is_read: bool
    created_at: datetime
    related_entity: Optional[dict] = None

    class Config:
        from_attributes = True


# Feedback Schemas
class FeedbackBase(BaseModel):
    message: str


class FeedbackCreate(FeedbackBase):
    ward_id: int
    recipient_id: Optional[int] = None
    recipient_type: Optional[str] = None  # 'LGA', 'STATE', or None
    parent_id: Optional[int] = None


class FeedbackResponse(FeedbackBase):
    id: int
    ward_id: int
    ward_name: Optional[str] = None
    sender: UserSimple
    recipient: Optional[UserSimple] = None
    is_read: bool
    parent_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


# Investigation Note Schemas
class InvestigationNoteBase(BaseModel):
    title: str
    description: str
    investigation_type: InvestigationType = InvestigationType.GENERAL
    priority: InvestigationPriority = InvestigationPriority.MEDIUM


class InvestigationNoteCreate(InvestigationNoteBase):
    lga_id: Optional[int] = None
    ward_id: Optional[int] = None


class InvestigationNoteUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    investigation_type: Optional[InvestigationType] = None
    priority: Optional[InvestigationPriority] = None
    status: Optional[InvestigationStatus] = None


class InvestigationNoteResponse(InvestigationNoteBase):
    id: int
    status: InvestigationStatus
    created_by: int
    ward_id: Optional[int] = None
    lga_id: Optional[int] = None
    ward: Optional[WardSimple] = None
    lga: Optional[LGASimple] = None
    created_by_user: Optional[UserSimple] = None
    created_at: datetime
    updated_at: datetime
    closed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# LGA Dashboard Schemas
class WardStatusResponse(BaseModel):
    id: int
    name: str
    code: str
    secretary: Optional[UserSimple] = None
    report: Optional[ReportListItem] = None


class WardsSummary(BaseModel):
    total_wards: int
    submitted: int
    missing: int
    submission_rate: float


class LGAWardsResponse(BaseModel):
    lga: LGASimple
    month: str
    wards: List[WardStatusResponse]
    summary: WardsSummary


class MissingReportItem(BaseModel):
    ward_id: int
    ward_name: str
    ward_code: str
    secretary: Optional[UserSimple] = None
    last_submitted: Optional[datetime] = None


# Analytics Schemas
class StateSummary(BaseModel):
    total_lgas: int
    total_wards: int
    reports_submitted: int
    reports_missing: int
    submission_rate: float
    total_meetings_held: int
    total_attendees: int


class LGAPerformance(BaseModel):
    lga_id: int
    lga_name: str
    submission_rate: float
    wards_submitted: int
    total_wards: int


class AnalyticsOverviewResponse(BaseModel):
    month: str
    state_summary: StateSummary
    top_performing_lgas: List[LGAPerformance]
    low_performing_lgas: List[LGAPerformance]


class LGAComparisonItem(BaseModel):
    lga_id: int
    lga_name: str
    total_wards: int
    reports_submitted: int
    reports_missing: int
    submission_rate: float
    total_meetings: int
    total_attendees: int


class TrendItem(BaseModel):
    month: str
    total_wards: int
    reports_submitted: int
    submission_rate: float


class AIReportRequest(BaseModel):
    month: str = Field(..., pattern=r"^\d{4}-\d{2}$")
    focus_areas: List[str] = []
    lga_ids: List[int] = []


class LGAHighlight(BaseModel):
    lga_name: str
    summary: str
    status: str


class AIReportResponse(BaseModel):
    generated_at: datetime
    month: str
    executive_summary: str
    key_findings: List[str]
    recommendations: List[str]
    lga_highlights: List[LGAHighlight]


# Form Definition Schemas
class FormStatus(str, Enum):
    DRAFT = "DRAFT"
    DEPLOYED = "DEPLOYED"
    ARCHIVED = "ARCHIVED"


class FormDefinitionCreate(BaseModel):
    name: str
    description: Optional[str] = None
    definition: dict  # {sections: [...], fields: [...]}


class FormDefinitionUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    definition: Optional[dict] = None


class FormDefinitionResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    version: int
    status: FormStatus
    definition: dict
    created_by: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    deployed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class FormDefinitionListItem(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    version: int
    status: FormStatus
    created_at: datetime
    deployed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# User Management (State Admin)
class UserAssignRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=200)
    email: str = Field(..., min_length=5, max_length=255)
    phone: Optional[str] = None
    password: str = Field(..., min_length=6, max_length=128)
    role: str
    lga_id: Optional[int] = None
    ward_id: Optional[int] = None


class UserUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None


class UserPasswordChange(BaseModel):
    new_password: str = Field(..., min_length=6, max_length=128)


class UserAccessChange(BaseModel):
    is_active: bool


# Profile Update Schemas
class ProfileUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None

    @validator('phone')
    def validate_phone(cls, v):
        if v is not None:
            import re
            pattern = r'^(\+234|0)[789]\d{9}$'
            if not re.match(pattern, v):
                raise ValueError('Phone number must be in format +234XXXXXXXXXX or 0XXXXXXXXXX')
        return v


class EmailUpdateRequest(BaseModel):
    email: str

    @validator('email')
    def validate_email(cls, v):
        import re
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(pattern, v):
            raise ValueError('Invalid email format')
        return v


class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str

    @validator('new_password')
    def validate_password(cls, v):
        if len(v) < 6:
            raise ValueError('Password must be at least 6 characters long')
        return v


# Generic Response Wrappers
class SuccessResponse(BaseModel):
    success: bool = True
    data: dict
    message: Optional[str] = None


class ErrorResponse(BaseModel):
    success: bool = False
    error: dict


# Pagination
class PaginatedResponse(BaseModel):
    items: List[dict]
    total: int
    limit: int
    offset: int
