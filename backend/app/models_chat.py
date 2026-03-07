"""
Chat models for AI assistant conversations.
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base


class Conversation(Base):
    """Chat conversation/thread model."""
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(200), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="conversations")
    messages = relationship("ChatMessage", back_populates="conversation", cascade="all, delete-orphan", order_by="ChatMessage.created_at")

    __table_args__ = (
        Index('idx_conversation_user_updated', 'user_id', 'updated_at'),
    )


class ChatMessage(Base):
    """Individual chat message model."""
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String(20), nullable=False)  # 'user', 'assistant', 'system'
    content = Column(Text, nullable=False)
    message_type = Column(String(20), default="text")  # 'text', 'table', 'chart', 'error'
    metadata_ = Column("metadata", JSON, default=dict)  # Renamed to avoid conflict
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    # Relationships
    conversation = relationship("Conversation", back_populates="messages")

    __table_args__ = (
        Index('idx_message_conversation_created', 'conversation_id', 'created_at'),
    )


# Add relationship to User model (to be imported in main models)
def add_conversation_relationship():
    """Add conversations relationship to User model."""
    from .models import User
    User.conversations = relationship("Conversation", back_populates="user", cascade="all, delete-orphan")
