"""
Pydantic schemas for chat API.
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class MessageRole(str, Enum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class MessageType(str, Enum):
    TEXT = "text"
    TABLE = "table"
    CHART = "chart"
    ERROR = "error"
    TYPING = "typing"


class QueryType(str, Enum):
    DATABASE = "database"
    GENERAL = "general"
    ANALYTICS = "analytics"
    UNKNOWN = "unknown"


# ==================== Request Schemas ====================

class ChatMessageRequest(BaseModel):
    """Request to send a new chat message."""
    message: str = Field(..., min_length=1, max_length=4000, description="User message content")
    conversation_id: Optional[int] = Field(None, description="Existing conversation ID or null for new")


class CreateConversationRequest(BaseModel):
    """Request to create a new conversation."""
    title: Optional[str] = Field(None, max_length=200, description="Optional conversation title")


class UpdateConversationRequest(BaseModel):
    """Request to update a conversation."""
    title: str = Field(..., max_length=200, description="New conversation title")


# ==================== Response Schemas ====================

class ChatMessageResponse(BaseModel):
    """Single chat message response."""
    id: int
    role: MessageRole
    content: str
    message_type: MessageType = MessageType.TEXT
    metadata: Optional[Dict[str, Any]] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ConversationResponse(BaseModel):
    """Conversation (thread) response."""
    id: int
    user_id: int
    title: Optional[str] = None
    message_count: Optional[int] = 0
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ConversationDetailResponse(ConversationResponse):
    """Conversation with messages."""
    messages: List[ChatMessageResponse] = []


class ChatHistoryResponse(BaseModel):
    """Paginated chat history response."""
    messages: List[ChatMessageResponse]
    total: int
    limit: int
    offset: int


class AIQueryResponse(BaseModel):
    """Internal AI query classification response."""
    query_type: QueryType
    confidence: float = Field(..., ge=0, le=1)
    sql_query: Optional[str] = None
    explanation: Optional[str] = None
    parameters: Optional[Dict[str, Any]] = None


class SendMessageResponse(BaseModel):
    """Response after sending a message."""
    success: bool = True
    data: Dict[str, Any]


# ==================== Data Display Schemas ====================

class TableColumn(BaseModel):
    """Table column definition."""
    key: str
    label: str
    type: str = "string"  # 'string', 'number', 'date', 'boolean'


class TableData(BaseModel):
    """Table data for DB query results."""
    columns: List[TableColumn]
    rows: List[Dict[str, Any]]
    total_rows: int
    page: int = 1
    page_size: int = 100


class ChartData(BaseModel):
    """Chart data for visualization."""
    chart_type: str  # 'bar', 'line', 'pie', 'area'
    title: str
    labels: List[str]
    datasets: List[Dict[str, Any]]
    options: Optional[Dict[str, Any]] = None


# ==================== Streaming Response ====================

class StreamingChunk(BaseModel):
    """Single chunk for streaming responses."""
    type: str  # 'start', 'content', 'table', 'chart', 'error', 'end'
    data: Any
    conversation_id: Optional[int] = None
    message_id: Optional[int] = None
