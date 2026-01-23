from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, List
from datetime import datetime
from enum import Enum


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

    class Config:
        from_attributes = True


# Report Schemas
class ReportBase(BaseModel):
    report_month: str = Field(..., pattern=r"^\d{4}-\d{2}$")
    meetings_held: int = Field(ge=0)
    attendees_count: int = Field(ge=0)
    issues_identified: Optional[str] = None
    actions_taken: Optional[str] = None
    challenges: Optional[str] = None
    recommendations: Optional[str] = None
    additional_notes: Optional[str] = None


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
