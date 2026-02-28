# KADUNA STATE WDC Digital Reporting System - Technical Architecture

## Executive Summary

This architecture is optimized for **demo-ready MVP delivery** within a 3-hour sprint. All decisions prioritize speed, simplicity, and working functionality over production scalability.

## Tech Stack Decision

### Backend
- **Framework**: FastAPI (Python)
  - Fast to write, automatic API docs, excellent type hints
  - Built-in async support for future scaling
  - Trivial SQLite integration
- **Database**: SQLite
  - Zero configuration, file-based
  - Perfect for MVP/demo with <10k records
  - Easy migration path to PostgreSQL later
- **ORM**: SQLAlchemy
  - Works with SQLite and scales to PostgreSQL
  - Simple models, fast prototyping
- **Auth**: Simple JWT tokens with role-based access
  - Mock users pre-seeded in database
  - No complex OAuth for demo

### Frontend
- **Framework**: React 18 + Vite
  - Fast dev server, instant HMR
  - Component reusability across 3 dashboards
- **Styling**: Tailwind CSS
  - Rapid UI development
  - Consistent design system
  - No custom CSS writing
- **State Management**: React Query (TanStack Query)
  - Handles API calls, caching, loading states
  - Eliminates need for Redux
- **Routing**: React Router v6
  - Client-side routing for SPA experience
- **Charts**: Recharts
  - Simple, React-native charting library
  - Good enough for MVP analytics

### File Upload
- **Storage**: Local filesystem (backend/uploads/)
  - Voice notes stored as files
  - References stored in database
  - Easy to migrate to S3/Cloud Storage later

### AI Integration (State Dashboard)
- **Option 1**: OpenAI API (if available)
- **Option 2**: Mock AI responses with predefined templates
  - For demo, use canned responses based on keywords
  - Proves concept without API costs

## Project Structure (Monorepo)

```
KADWDC/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                    # FastAPI app entry point
│   │   ├── config.py                  # Settings, environment vars
│   │   ├── database.py                # SQLAlchemy setup
│   │   ├── models.py                  # Database models
│   │   ├── schemas.py                 # Pydantic request/response models
│   │   ├── auth.py                    # JWT auth logic
│   │   ├── dependencies.py            # Auth dependencies
│   │   └── routers/
│   │       ├── __init__.py
│   │       ├── auth.py                # Login endpoints
│   │       ├── reports.py             # Report CRUD
│   │       ├── wards.py               # Ward data
│   │       ├── lgas.py                # LGA data
│   │       ├── notifications.py       # Notification system
│   │       ├── feedback.py            # Feedback/chat
│   │       ├── investigations.py      # Investigation notes
│   │       └── analytics.py           # State dashboard analytics
│   ├── uploads/                       # Voice notes storage
│   │   └── voice_notes/
│   ├── requirements.txt
│   └── seed_data.py                   # Pre-populate demo data
│
├── frontend/
│   ├── src/
│   │   ├── main.jsx                   # React entry point
│   │   ├── App.jsx                    # Root component with routing
│   │   ├── api/
│   │   │   └── client.js              # Axios config, base API client
│   │   ├── hooks/
│   │   │   └── useAuth.js             # Auth context/hook
│   │   ├── components/
│   │   │   ├── common/                # Shared components
│   │   │   │   ├── Layout.jsx
│   │   │   │   ├── Navbar.jsx
│   │   │   │   ├── Card.jsx
│   │   │   │   ├── Button.jsx
│   │   │   │   └── LoadingSpinner.jsx
│   │   │   ├── wdc/                   # WDC Secretary components
│   │   │   │   ├── ReportForm.jsx
│   │   │   │   ├── VoiceNoteUpload.jsx
│   │   │   │   └── SubmissionHistory.jsx
│   │   │   ├── lga/                   # LGA Coordinator components
│   │   │   │   ├── WardTracker.jsx
│   │   │   │   ├── MissingReports.jsx
│   │   │   │   ├── NotificationPanel.jsx
│   │   │   │   └── FeedbackChat.jsx
│   │   │   └── state/                 # State Dashboard components
│   │   │       ├── AnalyticsOverview.jsx
│   │   │       ├── LGAComparison.jsx
│   │   │       ├── AIReportAssistant.jsx
│   │   │       └── InvestigationNotes.jsx
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── WDCDashboard.jsx       # Secretary dashboard
│   │   │   ├── LGADashboard.jsx       # Coordinator dashboard
│   │   │   └── StateDashboard.jsx     # State officials dashboard
│   │   └── utils/
│   │       ├── constants.js
│   │       └── formatters.js          # Date, number formatting
│   ├── public/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── postcss.config.js
│
├── docs/
│   ├── ARCHITECTURE.md                # This file
│   ├── SCHEMA.md                      # Database schema
│   └── API_SPEC.md                    # API endpoints
│
└── README.md                          # Quick start guide
```

## Component Architecture

### System Flow Diagram (Text-Based)

```
┌─────────────────────────────────────────────────────────────┐
│                    KADUNA WDC SYSTEM                         │
└─────────────────────────────────────────────────────────────┘

┌──────────────────┐         ┌──────────────────┐         ┌──────────────────┐
│  WDC Secretary   │         │ LGA Coordinator  │         │ State Official   │
│   (Browser)      │         │    (Browser)     │         │   (Browser)      │
└────────┬─────────┘         └────────┬─────────┘         └────────┬─────────┘
         │                            │                            │
         │ Submit Report              │ View Ward Status           │ View Analytics
         │ Upload Voice Note          │ Send Notifications         │ AI Reports
         │                            │ Chat/Feedback              │ Investigations
         │                            │                            │
         └────────────────────────────┼────────────────────────────┘
                                      │
                                      ▼
                        ┌─────────────────────────┐
                        │   React Frontend (SPA)  │
                        │   - React Router        │
                        │   - React Query         │
                        │   - Tailwind CSS        │
                        └────────────┬────────────┘
                                     │
                                     │ HTTP/REST
                                     │ JWT Auth
                                     │
                        ┌────────────▼────────────┐
                        │   FastAPI Backend       │
                        │   - JWT Middleware      │
                        │   - Role-based routes   │
                        │   - File upload handler │
                        └────────────┬────────────┘
                                     │
                    ┌────────────────┼────────────────┐
                    │                │                │
                    ▼                ▼                ▼
            ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
            │   SQLite DB  │  │ File Storage │  │  AI Service  │
            │   (*.db)     │  │ (voice notes)│  │ (OpenAI/Mock)│
            └──────────────┘  └──────────────┘  └──────────────┘
```

### Data Flow Examples

#### 1. WDC Secretary Submits Monthly Report
```
User (Browser)
  → POST /api/reports (form data + voice file)
  → Backend validates JWT, checks role=WDC_SECRETARY
  → Save report to database
  → Save voice file to filesystem
  → Create notification for LGA Coordinator
  → Return success response
```

#### 2. LGA Coordinator Views Missing Reports
```
User (Browser)
  → GET /api/lgas/{lga_id}/missing-reports
  → Backend validates JWT, checks role=LGA_COORDINATOR
  → Query reports table for current month
  → Compare with wards list
  → Return list of wards with missing reports
```

#### 3. State Official Generates AI Report
```
User (Browser)
  → POST /api/analytics/ai-report (parameters: month, focus_area)
  → Backend validates JWT, checks role=STATE_OFFICIAL
  → Query aggregated data from database
  → Send prompt to AI service (or generate mock response)
  → Return formatted report
```

## User Roles and Capabilities

### 1. WDC Secretary (Ward Level)
**Role**: `WDC_SECRETARY`

**Capabilities**:
- Submit monthly report form
- Upload optional voice note (audio file)
- View own submission history
- Edit pending reports (before submission)
- View notifications from LGA Coordinator

**Restrictions**:
- Can only see own ward data
- Cannot view other wards
- Cannot access analytics

**Use Cases**:
- Monthly activity reporting
- Document challenges/achievements
- Voice notes for additional context

---

### 2. LGA Coordinator (LGA Level)
**Role**: `LGA_COORDINATOR`

**Capabilities**:
- View all wards in their LGA
- Track submission status per ward
- See missing reports highlighted
- Send notifications to WDC Secretaries
- Mini feedback/chat with WDC Secretaries
- View submitted reports from their LGA
- Listen to voice notes from their wards
- Mark reports as reviewed

**Restrictions**:
- Can only see own LGA data
- Cannot view other LGAs
- Limited analytics (only their LGA)

**Use Cases**:
- Monitor monthly submission compliance
- Follow up on missing reports
- Provide feedback to ward secretaries
- Escalate issues to state level

---

### 3. State Official (State Level)
**Role**: `STATE_OFFICIAL`

**Capabilities**:
- View all LGAs and wards (state-wide)
- Cross-LGA analytics and comparisons
- Generate AI-assisted summary reports
- Add investigation notes on specific wards/LGAs
- View trends over time
- Export data (bonus feature)
- Advanced search and filtering

**Restrictions**:
- Cannot directly submit ward reports
- Cannot impersonate lower roles (for demo, this is fine)

**Use Cases**:
- State-wide monitoring and reporting
- Identify underperforming LGAs
- Generate executive summaries
- Track investigation cases

---

## Authentication Flow

### Demo Authentication (Simplified)

1. **Pre-seeded Users**:
   - Database contains sample users for each role
   - Passwords are simple (e.g., "password123")
   - Real hashing used (bcrypt) but credentials are public

2. **Login Process**:
   ```
   POST /api/auth/login
   Body: { "email": "user@example.com", "password": "password123" }
   Response: { "access_token": "jwt_token_here", "user": {...} }
   ```

3. **Token Usage**:
   - Frontend stores token in localStorage
   - All API requests include: `Authorization: Bearer {token}`
   - Backend validates token and extracts user role

4. **Role Enforcement**:
   - Each endpoint checks required role
   - Return 403 Forbidden if role doesn't match

### Demo Users (Pre-seeded)

```python
# WDC Secretary Examples
- email: wdc.chikun.barnawa@kaduna.gov.ng, password: demo123, ward: Barnawa (Chikun LGA)
- email: wdc.zaria.sabon-gari@kaduna.gov.ng, password: demo123, ward: Sabon Gari (Zaria LGA)

# LGA Coordinator Examples
- email: coord.chikun@kaduna.gov.ng, password: demo123, lga: Chikun
- email: coord.zaria@kaduna.gov.ng, password: demo123, lga: Zaria

# State Official Examples
- email: state.admin@kaduna.gov.ng, password: demo123, role: STATE_OFFICIAL
```

---

## Development Phases (3-Hour Sprint Breakdown)

### Phase 1: Foundation (30 min)
- Initialize FastAPI backend
- Setup SQLite database with SQLAlchemy models
- Create React + Vite frontend with Tailwind
- Implement basic JWT auth
- Seed demo data

### Phase 2: Core Features (90 min)
- **WDC Tool**: Report form + voice upload (30 min)
- **LGA Dashboard**: Ward tracking + notifications (30 min)
- **State Dashboard**: Analytics + AI mock (30 min)

### Phase 3: Integration & Polish (60 min)
- Connect all frontends to backend APIs
- Test all user flows
- Fix bugs and styling
- Prepare demo script

---

## Key Technical Decisions & Rationale

| Decision | Rationale |
|----------|-----------|
| FastAPI over Django/Flask | Fastest API development, auto-docs, modern async |
| SQLite over PostgreSQL | Zero config, perfect for demo, easy migration later |
| React Query over Redux | Less boilerplate, handles API state automatically |
| Tailwind over custom CSS | 10x faster styling, consistent design |
| File storage over S3 | Simpler for demo, no AWS setup required |
| Mock AI over real integration | Proves concept without API costs/complexity |
| Monorepo structure | Single repo, easier demo deployment |
| JWT over session auth | Stateless, works with SPA architecture |

---

## Non-Functional Requirements (Demo Scope)

### Performance
- Target: <2s page load time
- Not optimizing for scale (demo data only)

### Security
- Basic JWT validation
- CORS enabled for local dev
- No HTTPS required (local demo)
- File upload size limits (10MB max)

### Scalability
- NOT a concern for MVP
- Architecture supports later scaling

### Browser Support
- Modern browsers only (Chrome, Firefox, Edge)
- No IE11 support

---

## Deployment (Demo)

### Local Development
```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
python seed_data.py
uvicorn app.main:app --reload

# Frontend
cd frontend
npm install
npm run dev
```

### Demo Presentation
- Run backend on `localhost:8000`
- Run frontend on `localhost:5173`
- Use pre-seeded demo accounts
- Demo flow: WDC → LGA → State dashboards

---

## Future Enhancements (Post-MVP)

1. Real AI integration (OpenAI/Azure)
2. SMS notifications via Twilio
3. Email notifications
4. Data export (Excel/PDF)
5. Mobile app (React Native)
6. PostgreSQL migration
7. Cloud deployment (Azure/AWS)
8. Advanced analytics (Power BI integration)
9. Audit logs
10. Multi-language support (Hausa)

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Voice upload fails | Graceful error handling, optional field |
| AI service down | Use mock responses as fallback |
| Database corruption | Backup seed script available |
| Browser compatibility | Test on Chrome only for demo |
| Time overrun | Prioritize core flows, cut nice-to-haves |

---

## Success Metrics (Demo)

- All 3 user roles can complete their primary task
- Visual appeal (Tailwind makes this easy)
- Data flows correctly between roles
- Demo completes in <10 minutes
- No critical bugs during presentation

---

**Document Version**: 1.0
**Last Updated**: 2026-01-22
**Author**: CTO/Tech Lead
