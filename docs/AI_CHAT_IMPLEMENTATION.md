# Secure AI Chat Interface Implementation

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND (React 18)                               │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐ │
│  │ AIChatInterface │  │  ChatProvider   │  │    Message Components       │ │
│  │    (Modal)      │◄─┤   (Context)     │◄─┤  - TextMessage             │ │
│  │                 │  │                 │  │  - DataTableMessage        │ │
│  │ ┌─────────────┐ │  │ ┌─────────────┐ │  │  - ChartMessage            │ │
│  │ │ ChatInput   │ │  │ │useChat Hook │ │  │  - ErrorMessage            │ │
│  │ │MessagesList │ │  │ │             │ │  └─────────────────────────────┘ │
│  │ │TypingIndic. │ │  │ │- History    │ │                                │
│  │ └─────────────┘ │  │ │- Send Msg   │ │                                │
│  └─────────────────┘  │ │- Streaming  │ │                                │
│                       │ └─────────────┘ │                                │
└───────────────────────┴─────────────────┴────────────────────────────────┘
                                          │
                                          ▼ HTTP / WebSocket
┌─────────────────────────────────────────────────────────────────────────────┐
│                           BACKEND (FastAPI)                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐ │
│  │  Chat Router    │  │  Chat Service   │  │      AI Engine              │ │
│  │  (/api/chat)    │◄─┤                 │◄─┤  ┌─────────────────────┐   │ │
│  │                 │  │ ┌─────────────┐ │  │  │ Query Classifier    │   │ │
│  │ POST /message   │  │ │  NLQ Parser │ │  │  │ - DB Query?         │   │ │
│  │ GET  /history   │  │ │  (Optional) │ │  │  │ - General Question? │   │ │
│  │ DELETE /session │  │ └─────────────┘ │  │  └─────────────────────┘   │ │
│  └─────────────────┘  └─────────────────┘  │                            │ │
│                                            │  ┌─────────────────────┐   │ │
│  ┌─────────────────┐  ┌─────────────────┐  │  │ SQL Generator       │   │ │
│  │  Auth Middleware│  │ Chat Models     │  │  │ (State Official)    │   │ │
│  │  (State Only)   │  │ - Conversation  │  │  └─────────────────────┘   │ │
│  │                 │  │ - Message       │  │                            │ │
│  │ JWT Validation  │  │ - Session       │  │  ┌─────────────────────┐   │ │
│  │ Role Check      │  └─────────────────┘  │  │ External AI (Grok)  │   │ │
│  └─────────────────┘                       │  │ (General Questions) │   │ │
│                                            │  └─────────────────────┘   │ │
└────────────────────────────────────────────────────────────────────────────┘
```

## Data Flow

```
User Query → Frontend Validation → Auth Header → Backend
                                              ↓
                              Role Check (State Official Only)
                                              ↓
                              Query Classification (DB vs General)
                                              ↓
                    ┌─────────────────────────┴─────────────────────────┐
                    ▼                                                     ▼
            DB Query Request                                      General Question
                    ▼                                                     ▼
            SQL Generation (Safe)                              External AI API (Grok)
                    ▼                                                     ▼
            Execute Read-Only Query                              Process Response
                    ▼                                                     ▼
            Format as Table/Chart                                Format as Text
                    └─────────────────────────┬─────────────────────────┘
                                              ▼
                                    Persist to Database
                                              ▼
                                    Stream/Return Response
                                              ▼
                                    Render in UI
```

## Security Layers

1. **Authentication**: JWT token validation on every request
2. **Authorization**: State Official role required
3. **Input Sanitization**: DOMPurify for XSS prevention
4. **SQL Safety**: Read-only queries, parameterized SQL
5. **Rate Limiting**: Prevent abuse (configurable)
6. **Data Access**: Users can only access their own chat history

## Message Types

| Type | Description | Render Component |
|------|-------------|------------------|
| `text` | Plain text/Markdown | `TextMessage` |
| `table` | DB query results as table | `DataTableMessage` |
| `chart` | Data visualization | `ChartMessage` |
| `error` | Error with friendly message | `ErrorMessage` |
| `typing` | AI processing indicator | `TypingIndicator` |

## Database Schema

```sql
-- Conversations table
CREATE TABLE conversations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Chat messages table
CREATE TABLE chat_messages (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE,
    role VARCHAR(20) CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);
```

## API Endpoints

### POST /api/chat/message
Send a new message and get AI response.

**Request:**
```json
{
  "message": "Show me all reports from last month",
  "conversation_id": 123  // optional
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": {
      "id": 456,
      "role": "assistant",
      "content": "Here are the reports from last month:",
      "message_type": "table",
      "metadata": {
        "query": "SELECT * FROM reports WHERE report_month = '2024-01'",
        "row_count": 150
      }
    },
    "conversation_id": 123
  }
}
```

### GET /api/chat/history
Get chat history for the current user.

**Query Parameters:**
- `conversation_id`: Filter by specific conversation
- `limit`: Number of messages (default: 50)
- `offset`: Pagination offset

### GET /api/chat/conversations
Get list of user's conversations.

### DELETE /api/chat/conversations/:id
Delete a conversation and its messages.

## Integration Steps

1. **Backend Setup**
   - Add chat models to database
   - Create chat router with auth middleware
   - Implement query classifier
   - Add AI service integration

2. **Frontend Setup**
   - Install dependencies: `react-markdown`, `dompurify`
   - Create chat API client
   - Implement ChatProvider context
   - Create message type components
   - Update AIChatInterface to use real API

3. **Security Audit**
   - Verify role-based access
   - Test input sanitization
   - Confirm SQL injection prevention
   - Check XSS protection

## Testing Checklist

- [ ] Unit tests for message components
- [ ] Integration tests for chat API
- [ ] E2E tests for chat flow
- [ ] Security tests for SQL injection
- [ ] XSS prevention tests
- [ ] Role-based access tests
- [ ] Rate limiting tests
- [ ] Offline mode tests

## Performance Considerations

1. **Pagination**: Large DB results paginated (default 100 rows)
2. **Debouncing**: Input debounced at 300ms
3. **Caching**: Chat history cached via React Query
4. **Streaming**: Responses streamed for better UX
5. **Cleanup**: Old conversations auto-archived after 90 days
