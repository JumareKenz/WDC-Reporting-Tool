# Backend Requirements for AI Chat Feature

## Overview

This document outlines the API endpoints, database schema, and services required from the backend team to fully support the AI Chat Interface.

**Current State**: Frontend has mock implementation using localStorage  
**Target State**: Full backend integration with persistent chat history and AI processing

---

## 1. API Endpoints Required

### Base Path: `/api/chat`

#### 1.1 Chat Sessions

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/chat/sessions` | List user's chat sessions | JWT + State Official |
| POST | `/chat/sessions` | Create new session | JWT + State Official |
| PUT | `/chat/sessions/{id}` | Update session title | JWT + State Official + Owner |
| DELETE | `/chat/sessions/{id}` | Delete session | JWT + State Official + Owner |
| DELETE | `/chat/sessions` | Clear all sessions | JWT + State Official |

**Request/Response Examples:**

```http
GET /api/chat/sessions
Authorization: Bearer <jwt_token>

Response:
{
  "success": true,
  "data": {
    "sessions": [
      {
        "id": 1,
        "title": "Submission Analysis",
        "message_count": 12,
        "created_at": "2024-03-07T10:00:00Z",
        "updated_at": "2024-03-07T11:30:00Z"
      }
    ]
  }
}
```

```http
POST /api/chat/sessions
Authorization: Bearer <jwt_token>
Content-Type: application/json

Request:
{
  "title": "LGA Performance Review"
}

Response:
{
  "success": true,
  "data": {
    "session": {
      "id": 2,
      "title": "LGA Performance Review",
      "message_count": 0,
      "created_at": "2024-03-07T12:00:00Z",
      "updated_at": "2024-03-07T12:00:00Z"
    }
  }
}
```

#### 1.2 Chat Messages

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/chat/sessions/{id}/messages` | Get session messages | JWT + State Official + Owner |
| POST | `/chat/message` | Send message & get AI response | JWT + State Official |
| DELETE | `/chat/sessions/{id}/messages` | Clear session messages | JWT + State Official + Owner |

**Request/Response Examples:**

```http
GET /api/chat/sessions/1/messages?limit=50&offset=0
Authorization: Bearer <jwt_token>

Response:
{
  "success": true,
  "data": {
    "messages": [
      {
        "id": 1,
        "role": "user",
        "content": "Show me submission trends",
        "message_type": "text",
        "created_at": "2024-03-07T10:00:00Z"
      },
      {
        "id": 2,
        "role": "assistant",
        "content": "Here are the submission trends:",
        "message_type": "chart",
        "metadata": {
          "chart_data": { ... },
          "query_type": "analytics"
        },
        "created_at": "2024-03-07T10:00:05Z"
      }
    ],
    "total": 12,
    "limit": 50,
    "offset": 0
  }
}
```

```http
POST /api/chat/message
Authorization: Bearer <jwt_token>
Content-Type: application/json

Request:
{
  "message": "Compare LGA performance",
  "conversation_id": 1  // optional - creates new if null
}

Response:
{
  "success": true,
  "data": {
    "message": {
      "id": 3,
      "role": "assistant",
      "content": "LGA Performance Comparison",
      "message_type": "table",
      "metadata": {
        "table_data": {
          "columns": [...],
          "rows": [...],
          "total_rows": 23
        },
        "query_type": "database",
        "sql_query": "SELECT ..."
      },
      "created_at": "2024-03-07T10:05:00Z"
    },
    "conversation_id": 1
  }
}
```

---

## 2. Database Schema

### 2.1 Tables

```sql
-- Conversations table
CREATE TABLE conversations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_conversations_updated_at ON conversations(updated_at);

-- Chat messages table
CREATE TABLE chat_messages (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'table', 'chart', 'error')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_chat_messages_conversation_id ON chat_messages(conversation_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at);
CREATE INDEX idx_chat_messages_conversation_created ON chat_messages(conversation_id, created_at);

-- Query logs table (for audit and improvement)
CREATE TABLE chat_query_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    query_text TEXT NOT NULL,
    query_type VARCHAR(50),
    sql_query TEXT,
    execution_time_ms INTEGER,
    row_count INTEGER,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_chat_query_logs_user_id ON chat_query_logs(user_id);
CREATE INDEX idx_chat_query_logs_created_at ON chat_query_logs(created_at);
```

### 2.2 Migration Script

```python
# backend/migrations/versions/xxx_add_chat_tables.py

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = 'xxx'
down_revision = 'previous_revision'

def upgrade():
    # Create conversations table
    op.create_table(
        'conversations',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=200), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    
    op.create_index('idx_conversations_user_id', 'conversations', ['user_id'])
    op.create_index('idx_conversations_updated_at', 'conversations', ['updated_at'])
    
    # Create chat_messages table
    op.create_table(
        'chat_messages',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('conversation_id', sa.Integer(), nullable=False),
        sa.Column('role', sa.String(length=20), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('message_type', sa.String(length=20), server_default='text'),
        sa.Column('metadata', postgresql.JSONB(), server_default='{}'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['conversation_id'], ['conversations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    
    op.create_index('idx_chat_messages_conversation_id', 'chat_messages', ['conversation_id'])
    op.create_index('idx_chat_messages_created_at', 'chat_messages', ['created_at'])
    
    # Create query_logs table
    op.create_table(
        'chat_query_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('query_text', sa.Text(), nullable=False),
        sa.Column('query_type', sa.String(length=50), nullable=True),
        sa.Column('sql_query', sa.Text(), nullable=True),
        sa.Column('execution_time_ms', sa.Integer(), nullable=True),
        sa.Column('row_count', sa.Integer(), nullable=True),
        sa.Column('success', sa.Boolean(), server_default='true'),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

def downgrade():
    op.drop_table('chat_query_logs')
    op.drop_table('chat_messages')
    op.drop_table('conversations')
```

---

## 3. AI Service Implementation

### 3.1 Query Classification Service

```python
# backend/app/services/query_classifier.py

from enum import Enum
from typing import Optional, Dict, Any
import re

class QueryType(str, Enum):
    DATABASE = "database"
    GENERAL = "general"
    ANALYTICS = "analytics"
    UNKNOWN = "unknown"

class QueryClassifier:
    """Classifies natural language queries into types."""
    
    DB_KEYWORDS = [
        'show', 'list', 'get', 'find', 'count', 'how many',
        'reports', 'users', 'wards', 'lgas', 'submissions',
        'statistics', 'data', 'summary', 'total', 'average'
    ]
    
    GENERAL_KEYWORDS = [
        'what is', 'who is', 'when', 'where', 'why', 'how to',
        'explain', 'define', 'help', 'hello'
    ]
    
    def classify(self, query: str) -> tuple[QueryType, float]:
        query_lower = query.lower()
        
        # Check for general queries
        if any(kw in query_lower for kw in self.GENERAL_KEYWORDS):
            return QueryType.GENERAL, 0.9
        
        # Check for database queries
        score = sum(2 for kw in self.DB_KEYWORDS if kw in query_lower)
        if score >= 3:
            return QueryType.DATABASE, min(0.5 + score * 0.1, 0.95)
        
        return QueryType.GENERAL, 0.6
```

### 3.2 SQL Generation Service

```python
# backend/app/services/sql_generator.py

from typing import Optional, Dict, Any
from datetime import datetime
import re

class SQLGenerator:
    """Generates safe, read-only SQL queries from natural language."""
    
    # Whitelist of allowed tables
    ALLOWED_TABLES = ['reports', 'users', 'wards', 'lgas', 'notifications']
    
    # Forbidden SQL keywords
    FORBIDDEN_KEYWORDS = [
        'INSERT', 'UPDATE', 'DELETE', 'DROP', 'CREATE', 'ALTER',
        'TRUNCATE', 'GRANT', 'REVOKE', 'EXECUTE'
    ]
    
    def generate(self, query: str, context: Dict[str, Any]) -> Optional[str]:
        query_lower = query.lower()
        
        # Reports queries
        if 'report' in query_lower:
            return self._generate_report_query(query_lower, context)
        
        # User queries
        if 'user' in query_lower or 'secretary' in query_lower:
            return self._generate_user_query(query_lower, context)
        
        # LGA queries
        if 'lga' in query_lower:
            return self._generate_lga_query(query_lower, context)
        
        return None
    
    def _generate_report_query(self, query: str, context: Dict) -> str:
        month = context.get('current_month', datetime.now().strftime('%Y-%m'))
        
        return f"""
            SELECT r.id, r.report_month, r.status, r.submitted_at,
                   w.name as ward_name, l.name as lga_name
            FROM reports r
            JOIN wards w ON r.ward_id = w.id
            JOIN lgas l ON w.lga_id = l.id
            WHERE r.report_month = '{month}'
            ORDER BY r.submitted_at DESC
            LIMIT 100
        """
    
    def validate(self, sql: str) -> bool:
        """Validate SQL is safe (read-only)."""
        sql_upper = sql.upper()
        
        # Must start with SELECT
        if not re.match(r'^\s*SELECT\s+', sql_upper):
            return False
        
        # No forbidden keywords
        for keyword in self.FORBIDDEN_KEYWORDS:
            if keyword in sql_upper:
                return False
        
        # Only allowed tables
        # (Additional validation logic here)
        
        return True
```

### 3.3 AI Response Service

```python
# backend/app/services/ai_response.py

from typing import Dict, Any
import openai  # or grok, anthropic, etc.

class AIResponseService:
    """Generates AI responses for general queries."""
    
    def __init__(self, api_key: str):
        self.client = openai.OpenAI(api_key=api_key)
    
    def generate(
        self, 
        query: str, 
        conversation_history: list,
        system_context: Dict[str, Any]
    ) -> str:
        """Generate AI response using external LLM."""
        
        messages = [
            {
                "role": "system",
                "content": f"""You are an AI assistant for the Kaduna State WDC Digital Reporting System.
                
Context:
- State: Kaduna, Nigeria
- Total LGAs: {system_context.get('total_lgas', 23)}
- Total Wards: {system_context.get('total_wards', 255)}
- Current Month: {system_context.get('current_month')}

You help State Officials with:
1. Understanding the WDC reporting system
2. Interpreting analytics and data
3. General questions about the platform

Be concise, professional, and helpful."""
            }
        ]
        
        # Add conversation history
        for msg in conversation_history[-5:]:  # Last 5 messages
            messages.append({
                "role": msg['role'],
                "content": msg['content']
            })
        
        # Add current query
        messages.append({"role": "user", "content": query})
        
        response = self.client.chat.completions.create(
            model="gpt-4",  # or "grok-1", "claude-3", etc.
            messages=messages,
            max_tokens=500,
            temperature=0.7
        )
        
        return response.choices[0].message.content
```

---

## 4. Router Implementation

```python
# backend/app/routers/chat.py

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional
from ..database import get_db
from ..dependencies import get_state_official
from ..models import User
from ..services.query_classifier import QueryClassifier, QueryType
from ..services.sql_generator import SQLGenerator
from ..services.ai_response import AIResponseService
from ..schemas_chat import (
    ChatMessageRequest,
    ChatMessageResponse,
    ConversationResponse,
    ChatHistoryResponse
)

router = APIRouter(prefix="/chat", tags=["Chat"])

# Services
classifier = QueryClassifier()
sql_generator = SQLGenerator()
# ai_service = AIResponseService(api_key=settings.OPENAI_API_KEY)

@router.get("/sessions", response_model=dict)
def get_sessions(
    current_user: User = Depends(get_state_official),
    db: Session = Depends(get_db)
):
    """Get all chat sessions for current user."""
    sessions = db.query(Conversation).filter(
        Conversation.user_id == current_user.id
    ).order_by(Conversation.updated_at.desc()).all()
    
    return {
        "success": True,
        "data": {
            "sessions": [
                {
                    "id": s.id,
                    "title": s.title,
                    "message_count": len(s.messages),
                    "created_at": s.created_at,
                    "updated_at": s.updated_at
                }
                for s in sessions
            ]
        }
    }

@router.post("/sessions", response_model=dict)
def create_session(
    title: Optional[str] = None,
    current_user: User = Depends(get_state_official),
    db: Session = Depends(get_db)
):
    """Create new chat session."""
    session = Conversation(
        user_id=current_user.id,
        title=title or "New Conversation"
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    
    return {
        "success": True,
        "data": {
            "session": {
                "id": session.id,
                "title": session.title,
                "message_count": 0,
                "created_at": session.created_at,
                "updated_at": session.updated_at
            }
        }
    }

@router.post("/message", response_model=dict)
def send_message(
    request: ChatMessageRequest,
    current_user: User = Depends(get_state_official),
    db: Session = Depends(get_db)
):
    """Process user message and return AI response."""
    
    # Create or get session
    if request.conversation_id:
        session = db.query(Conversation).filter(
            Conversation.id == request.conversation_id,
            Conversation.user_id == current_user.id
        ).first()
        if not session:
            raise HTTPException(status_code=404, detail="Conversation not found")
    else:
        session = Conversation(
            user_id=current_user.id,
            title=request.message[:50] + "..."
        )
        db.add(session)
        db.commit()
        db.refresh(session)
    
    # Save user message
    user_msg = ChatMessage(
        conversation_id=session.id,
        role="user",
        content=request.message,
        message_type="text"
    )
    db.add(user_msg)
    
    # Classify query
    query_type, confidence = classifier.classify(request.message)
    
    # Generate response based on type
    if query_type == QueryType.DATABASE:
        response_data = handle_database_query(
            request.message, 
            current_user,
            db
        )
    else:
        response_data = handle_general_query(
            request.message,
            session,
            current_user,
            db
        )
    
    # Save AI response
    ai_msg = ChatMessage(
        conversation_id=session.id,
        role="assistant",
        content=response_data["content"],
        message_type=response_data["type"],
        metadata=response_data.get("metadata", {})
    )
    db.add(ai_msg)
    
    # Update session timestamp
    session.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(ai_msg)
    
    return {
        "success": True,
        "data": {
            "message": {
                "id": ai_msg.id,
                "role": ai_msg.role,
                "content": ai_msg.content,
                "message_type": ai_msg.message_type,
                "metadata": ai_msg.metadata,
                "created_at": ai_msg.created_at
            },
            "conversation_id": session.id
        }
    }

def handle_database_query(query: str, user: User, db: Session) -> dict:
    """Handle database query type."""
    sql = sql_generator.generate(query, {
        "current_month": datetime.now().strftime("%Y-%m"),
        "user_id": user.id
    })
    
    if not sql or not sql_generator.validate(sql):
        return {
            "type": "error",
            "content": "I couldn't generate a safe query for that request.",
            "metadata": {"query_type": "error"}
        }
    
    # Execute query
    start_time = time.time()
    try:
        result = db.execute(text(sql))
        rows = [dict(row._mapping) for row in result.fetchall()]
        execution_time = int((time.time() - start_time) * 1000)
        
        # Log query
        log_query(db, user.id, query, "database", sql, execution_time, len(rows))
        
        return {
            "type": "table",
            "content": f"Found {len(rows)} records",
            "metadata": {
                "query_type": "database",
                "sql_query": sql,
                "table_data": format_as_table(rows),
                "execution_time_ms": execution_time
            }
        }
    except Exception as e:
        log_query(db, user.id, query, "database", sql, None, 0, False, str(e))
        return {
            "type": "error",
            "content": f"Query failed: {str(e)}",
            "metadata": {"query_type": "error", "error": str(e)}
        }

def handle_general_query(query: str, session, user: User, db: Session) -> dict:
    """Handle general knowledge query."""
    
    # Get conversation history
    history = [
        {"role": msg.role, "content": msg.content}
        for msg in session.messages[-5:]
    ]
    
    # Get system context
    context = {
        "total_lgas": db.query(LGA).count(),
        "total_wards": db.query(Ward).count(),
        "current_month": datetime.now().strftime("%Y-%m")
    }
    
    # Generate AI response (or use fallback)
    # response_text = ai_service.generate(query, history, context)
    response_text = generate_fallback_response(query)
    
    return {
        "type": "text",
        "content": response_text,
        "metadata": {"query_type": "general"}
    }
```

---

## 5. Rate Limiting

```python
# backend/app/middleware/rate_limit.py

from fastapi import Request, HTTPException
from functools import wraps
import time
from collections import defaultdict

class RateLimiter:
    """Simple in-memory rate limiter."""
    
    def __init__(self, max_requests: int = 30, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests = defaultdict(list)
    
    def is_allowed(self, user_id: int) -> bool:
        now = time.time()
        window_start = now - self.window_seconds
        
        # Clean old requests
        self.requests[user_id] = [
            req_time for req_time in self.requests[user_id]
            if req_time > window_start
        ]
        
        # Check limit
        if len(self.requests[user_id]) >= self.max_requests:
            return False
        
        # Record request
        self.requests[user_id].append(now)
        return True

# Usage in router
rate_limiter = RateLimiter(max_requests=30, window_seconds=60)

@router.post("/message")
def send_message(
    request: ChatMessageRequest,
    current_user: User = Depends(get_state_official),
    db: Session = Depends(get_db)
):
    if not rate_limiter.is_allowed(current_user.id):
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded. Please try again later."
        )
    # ... process message
```

---

## 6. Testing Requirements

### Unit Tests

```python
# backend/tests/test_chat.py

def test_query_classifier():
    classifier = QueryClassifier()
    
    # Test database query detection
    query_type, confidence = classifier.classify("Show me reports")
    assert query_type == QueryType.DATABASE
    
    # Test general query detection
    query_type, confidence = classifier.classify("What is WDC?")
    assert query_type == QueryType.GENERAL

def test_sql_generator_validation():
    generator = SQLGenerator()
    
    # Valid SELECT
    assert generator.validate("SELECT * FROM reports") == True
    
    # Invalid INSERT
    assert generator.validate("INSERT INTO reports VALUES (1)") == False
    
    # Invalid DELETE
    assert generator.validate("DELETE FROM reports") == False

def test_chat_endpoints(client, auth_headers):
    # Create session
    response = client.post("/api/chat/sessions", headers=auth_headers)
    assert response.status_code == 200
    session_id = response.json()["data"]["session"]["id"]
    
    # Send message
    response = client.post(
        "/api/chat/message",
        headers=auth_headers,
        json={"message": "Show overview", "conversation_id": session_id}
    )
    assert response.status_code == 200
    assert response.json()["data"]["message"]["role"] == "assistant"
```

---

## 7. Environment Variables

```bash
# .env

# AI Service (choose one)
OPENAI_API_KEY=sk-...
# GROK_API_KEY=...
# ANTHROPIC_API_KEY=...

# Rate Limiting
CHAT_RATE_LIMIT_REQUESTS=30
CHAT_RATE_LIMIT_WINDOW=60

# Query Execution
MAX_QUERY_ROWS=1000
QUERY_TIMEOUT_SECONDS=30
```

---

## 8. Deployment Checklist

- [ ] Run database migrations
- [ ] Set environment variables
- [ ] Configure rate limiting
- [ ] Test all endpoints
- [ ] Verify role-based access
- [ ] Set up query logging
- [ ] Configure monitoring/alerting
- [ ] Document API for frontend team

---

## Summary

**Priority Order:**

1. **High Priority** (Week 1)
   - Database migrations
   - Basic CRUD endpoints (/sessions, /messages)
   - Role-based access control

2. **Medium Priority** (Week 2)
   - Query classification
   - SQL generation
   - Rate limiting

3. **Low Priority** (Week 3)
   - AI service integration
   - Query logging
   - Advanced analytics

**Estimated Effort:** 2-3 weeks for full implementation

**Contact:** Frontend team for API contract questions
