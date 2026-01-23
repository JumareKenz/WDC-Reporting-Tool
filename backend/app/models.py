from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, CheckConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base


class LGA(Base):
    __tablename__ = "lgas"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), nullable=False, unique=True, index=True)
    code = Column(String(20), nullable=False, unique=True)
    population = Column(Integer, nullable=True)
    num_wards = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    wards = relationship("Ward", back_populates="lga", cascade="all, delete-orphan")
    coordinators = relationship("User", back_populates="lga", foreign_keys="User.lga_id")
    investigation_notes = relationship("InvestigationNote", back_populates="lga", cascade="all, delete-orphan")


class Ward(Base):
    __tablename__ = "wards"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    lga_id = Column(Integer, ForeignKey("lgas.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    code = Column(String(20), nullable=False)
    population = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    lga = relationship("LGA", back_populates="wards")
    secretaries = relationship("User", back_populates="ward", foreign_keys="User.ward_id")
    reports = relationship("Report", back_populates="ward", cascade="all, delete-orphan")
    feedback = relationship("Feedback", back_populates="ward", cascade="all, delete-orphan")
    investigation_notes = relationship("InvestigationNote", back_populates="ward", cascade="all, delete-orphan")

    __table_args__ = (
        CheckConstraint("lga_id IS NOT NULL", name="ward_lga_check"),
    )


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    email = Column(String(255), nullable=False, unique=True, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(150), nullable=False)
    phone = Column(String(20), nullable=True)
    role = Column(String(50), nullable=False, index=True)
    ward_id = Column(Integer, ForeignKey("wards.id", ondelete="SET NULL"), nullable=True, index=True)
    lga_id = Column(Integer, ForeignKey("lgas.id", ondelete="SET NULL"), nullable=True, index=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_login = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    ward = relationship("Ward", back_populates="secretaries", foreign_keys=[ward_id])
    lga = relationship("LGA", back_populates="coordinators", foreign_keys=[lga_id])
    reports = relationship("Report", back_populates="user", foreign_keys="Report.user_id")
    reviewed_reports = relationship("Report", back_populates="reviewer", foreign_keys="Report.reviewed_by")
    notifications_received = relationship("Notification", back_populates="recipient", foreign_keys="Notification.recipient_id", cascade="all, delete-orphan")
    notifications_sent = relationship("Notification", back_populates="sender", foreign_keys="Notification.sender_id")
    feedback_sent = relationship("Feedback", back_populates="sender", foreign_keys="Feedback.sender_id")
    feedback_received = relationship("Feedback", back_populates="recipient", foreign_keys="Feedback.recipient_id")
    investigation_notes = relationship("InvestigationNote", back_populates="created_by_user", cascade="all, delete-orphan")

    __table_args__ = (
        CheckConstraint("role IN ('WDC_SECRETARY', 'LGA_COORDINATOR', 'STATE_OFFICIAL')", name="user_role_check"),
    )


class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    ward_id = Column(Integer, ForeignKey("wards.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    report_month = Column(String(7), nullable=False)  # Format: YYYY-MM

    # Form fields
    meetings_held = Column(Integer, default=0)
    attendees_count = Column(Integer, default=0)
    issues_identified = Column(Text, nullable=True)
    actions_taken = Column(Text, nullable=True)
    challenges = Column(Text, nullable=True)
    recommendations = Column(Text, nullable=True)
    additional_notes = Column(Text, nullable=True)

    # Metadata
    status = Column(String(20), default="SUBMITTED", index=True)
    submitted_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    reviewed_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    ward = relationship("Ward", back_populates="reports")
    user = relationship("User", back_populates="reports", foreign_keys=[user_id])
    reviewer = relationship("User", back_populates="reviewed_reports", foreign_keys=[reviewed_by])
    voice_notes = relationship("VoiceNote", back_populates="report", cascade="all, delete-orphan")

    __table_args__ = (
        CheckConstraint("status IN ('DRAFT', 'SUBMITTED', 'REVIEWED', 'FLAGGED')", name="report_status_check"),
        CheckConstraint("meetings_held >= 0", name="meetings_positive_check"),
        CheckConstraint("attendees_count >= 0", name="attendees_positive_check"),
    )


class VoiceNote(Base):
    __tablename__ = "voice_notes"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    report_id = Column(Integer, ForeignKey("reports.id", ondelete="CASCADE"), nullable=False, index=True)
    file_name = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size = Column(Integer, nullable=True)
    duration_seconds = Column(Integer, nullable=True)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    report = relationship("Report", back_populates="voice_notes")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    recipient_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    sender_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    notification_type = Column(String(50), nullable=False)
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    related_entity_type = Column(String(50), nullable=True)
    related_entity_id = Column(Integer, nullable=True)
    is_read = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    # Relationships
    recipient = relationship("User", back_populates="notifications_received", foreign_keys=[recipient_id])
    sender = relationship("User", back_populates="notifications_sent", foreign_keys=[sender_id])

    __table_args__ = (
        CheckConstraint("notification_type IN ('REPORT_SUBMITTED', 'REPORT_MISSING', 'FEEDBACK', 'SYSTEM', 'REMINDER')", name="notification_type_check"),
    )


class Feedback(Base):
    __tablename__ = "feedback"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    ward_id = Column(Integer, ForeignKey("wards.id", ondelete="CASCADE"), nullable=False, index=True)
    sender_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    recipient_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    parent_id = Column(Integer, ForeignKey("feedback.id", ondelete="CASCADE"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    ward = relationship("Ward", back_populates="feedback")
    sender = relationship("User", back_populates="feedback_sent", foreign_keys=[sender_id])
    recipient = relationship("User", back_populates="feedback_received", foreign_keys=[recipient_id])
    parent = relationship("Feedback", remote_side=[id], backref="replies")


class InvestigationNote(Base):
    __tablename__ = "investigation_notes"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    investigation_type = Column(String(50), default="GENERAL")
    priority = Column(String(20), default="MEDIUM")
    status = Column(String(20), default="OPEN", index=True)

    # Linkage (can be ward or LGA level)
    ward_id = Column(Integer, ForeignKey("wards.id", ondelete="CASCADE"), nullable=True, index=True)
    lga_id = Column(Integer, ForeignKey("lgas.id", ondelete="CASCADE"), nullable=True, index=True)

    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    closed_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    created_by_user = relationship("User", back_populates="investigation_notes")
    ward = relationship("Ward", back_populates="investigation_notes")
    lga = relationship("LGA", back_populates="investigation_notes")

    __table_args__ = (
        CheckConstraint("investigation_type IN ('GENERAL', 'FINANCIAL', 'COMPLIANCE', 'PERFORMANCE', 'COMPLAINT')", name="investigation_type_check"),
        CheckConstraint("priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')", name="investigation_priority_check"),
        CheckConstraint("status IN ('OPEN', 'IN_PROGRESS', 'PENDING', 'CLOSED')", name="investigation_status_check"),
    )
