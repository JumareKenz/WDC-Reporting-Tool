# KADUNA WDC Backend API Contract

Every endpoint the frontend calls, documented for backend reimplementation.

**Base URL**: `VITE_API_BASE_URL` environment variable (default: `http://localhost:8000/api`)

**Common Headers** (all authenticated requests):
```
Authorization: Bearer {access_token}
Content-Type: application/json (unless multipart/form-data)
```

**Standard Response Envelope**:
```json
{
  "success": true,
  "data": { ... }
}
```

**Standard Error Response**:
```json
{
  "detail": "Error message"
}
// or for 422:
{
  "detail": [
    { "loc": ["body", "field_name"], "msg": "error description", "type": "value_error" }
  ]
}
// or for 409:
{
  "detail": { "message": "Conflict description" }
}
```

**Error Codes Handled by Frontend**:
- 400: "Invalid request. Please check your input."
- 401: Silent token refresh → if fails, redirect to /login
- 403: "You do not have permission to perform this action."
- 404: "The requested resource was not found."
- 409: Uses `detail.message` if object, else default
- 413: "File size is too large."
- 422: Formats Pydantic validation errors as comma-separated list
- 429: "Too many requests. Please try again later."
- 500: "Internal server error. Please try again later."
- 503: "Service temporarily unavailable."
- Network error (no response): "No connection – your work has been saved as a draft..."

---

## Authentication

### POST `/auth/login`
**Auth required**: No

**Request**:
```json
{
  "email": "string (required)",
  "password": "string (required)"
}
```

**Success Response** (200):
```json
{
  "data": {
    "access_token": "string (JWT, ~15min TTL)",
    "refresh_token": "string (long-lived, ~1 year)",
    "refresh_expires_at": "ISO datetime string (optional)",
    "user": {
      "id": "integer",
      "email": "string",
      "full_name": "string",
      "role": "WDC_SECRETARY | LGA_COORDINATOR | STATE_OFFICIAL",
      "lga_id": "integer | null",
      "ward_id": "integer | null",
      "ward": {
        "id": "integer",
        "name": "string",
        "lga_id": "integer",
        "lga_name": "string"
      },
      "lga": {
        "id": "integer",
        "name": "string"
      },
      "ward_name": "string | null",
      "lga_name": "string | null",
      "phone": "string | null",
      "is_active": "boolean"
    }
  }
}
```

**Error Response** (401):
```json
{ "detail": "Invalid email or password" }
```

**Frontend usage**: `usePersistentAuth.login()` — stores access token in memory, refresh token in IndexedDB, user profile in IndexedDB. Navigates to role-based dashboard.

---

### POST `/auth/refresh`
**Auth required**: No (uses refresh token in body)

**Request**:
```json
{
  "refresh_token": "string (required)"
}
```

**Success Response** (200):
```json
{
  "data": {
    "access_token": "string (new JWT)",
    "refresh_token": "string (rotated, optional)",
    "refresh_expires_at": "ISO datetime (optional)",
    "user": { ... same shape as login ... }
  }
}
```

**Error Response** (401):
```json
{ "detail": "Invalid or revoked refresh token" }
```

**Frontend usage**: Called automatically by API client 401 interceptor and by `usePersistentAuth.refreshAccessToken()`. On failure, clears all auth state and redirects to `/login`.

---

### POST `/auth/logout`
**Auth required**: Yes (best-effort; tolerates failure)

**Request**:
```json
{
  "refresh_token": "string"
}
```

**Success Response** (200):
```json
{ "success": true }
```

**Frontend usage**: Called on explicit logout. Failure is tolerated (offline logout works by clearing local state).

---

### POST `/auth/forgot-password`
**Auth required**: No

**Request**: Query parameter `email` (no body or empty body with email as query param)
```
POST /auth/forgot-password?email=user@example.com
```

**Success Response** (200):
```json
{ "success": true }
```

**Frontend usage**: ForgotPassword page. Always shows success to prevent email enumeration.

---

### POST `/auth/reset-password`
**Auth required**: No

**Request**:
```json
{
  "token": "string (from email link)",
  "new_password": "string"
}
```

**Success Response** (200):
```json
{ "success": true }
```

**Frontend usage**: ResetPassword page with token from URL query param.

---

### GET `/auth/me`
**Auth required**: Yes

**Response** (200):
```json
{
  "data": { ... same user object as login ... }
}
```

**Frontend usage**: Token verification / user data refresh.

---

## Reports

### POST `/reports`
**Auth required**: Yes (WDC_SECRETARY)

**Content-Type**: `multipart/form-data`

**Request fields**:
| Field | Type | Description |
|-------|------|-------------|
| `report_month` | string | "YYYY-MM" format |
| `report_data` | string (JSON) | Serialized form data object (80+ fields) |
| `voice_{fieldName}` | File (audio) | Per-field voice notes (.mp3/.m4a/.wav/.ogg/.webm, max 10MB) |
| `attendance_picture_{N}` | File (image) | Attendance photos (.jpg/.png/.webp, max 10MB) |
| `group_photo_{N}` | File (image) | Group photos (.jpg/.png/.webp, max 10MB) |

**report_data JSON shape**:
```json
{
  "state": "Kaduna State",
  "lga_id": "integer",
  "ward_id": "integer",
  "report_date": "YYYY-MM-DD",
  "report_time": "HH:MM",
  "meeting_type": "Monthly | Emergency | Quarterly Town Hall",
  "agenda_opening_prayer": "boolean",
  "agenda_minutes": "boolean",
  "agenda_action_tracker": "boolean",
  "agenda_reports": "boolean",
  "agenda_action_plan": "boolean",
  "agenda_aob": "boolean",
  "agenda_closing": "boolean",
  "action_tracker": [
    { "action_point": "string", "status": "Completed|On-going|Not Started", "challenges": "string", "timeline": "string", "responsible_person": "string" }
  ],
  "health_opd_total": "integer",
  "health_penta1": "integer",
  "health_bcg": "integer",
  "health_penta3": "integer",
  "health_measles": "integer",
  "health_opd_under5_total": "integer",
  "health_malaria_under5": "integer",
  "health_diarrhea_under5": "integer",
  "health_anc_total": "integer",
  "health_anc_first_visit": "integer",
  "health_anc_fourth_visit": "integer",
  "health_anc_eighth_visit": "integer",
  "health_deliveries": "integer",
  "health_postnatal": "integer",
  "health_fp_counselling": "integer",
  "health_fp_new_acceptors": "integer",
  "health_hepb_tested": "integer",
  "health_hepb_positive": "integer",
  "health_tb_presumptive": "integer",
  "health_tb_on_treatment": "integer",
  "facilities_renovated_govt": "integer",
  "facilities_renovated_partners": "integer",
  "facilities_renovated_wdc": "integer",
  "items_donated_count": "integer",
  "items_donated_types": ["string"],
  "items_donated_govt_count": "integer",
  "items_donated_govt_types": ["string"],
  "items_repaired_count": "integer",
  "items_repaired_types": ["string"],
  "women_transported_anc": "integer",
  "women_transported_delivery": "integer",
  "children_transported_danger": "integer",
  "women_supported_delivery_items": "integer",
  "maternal_deaths": "integer",
  "perinatal_deaths": "integer",
  "maternal_death_causes": ["string", "string", "string"],
  "perinatal_death_causes": ["string", "string", "string"],
  "town_hall_conducted": "Yes | No | empty",
  "community_feedback": [
    { "indicator": "string", "feedback": "string", "action_required": "string" }
  ],
  "vdc_reports": [
    { "vdc_name": "string", "issues": "string", "action_taken": "string" }
  ],
  "awareness_theme": "string",
  "traditional_leaders_support": "string",
  "religious_leaders_support": "string",
  "action_plan": [
    { "issue": "string", "action": "string", "timeline": "string", "responsible_person": "string" }
  ],
  "support_required": "string",
  "aob": "string",
  "attendance_total": "integer",
  "attendance_male": "integer",
  "attendance_female": "integer",
  "next_meeting_date": "YYYY-MM-DD",
  "chairman_signature": "string",
  "secretary_signature": "string"
}
```

**Success Response** (201):
```json
{
  "data": {
    "id": "integer",
    "status": "SUBMITTED",
    "report_month": "YYYY-MM",
    "ward_id": "integer",
    "ward_name": "string",
    "created_at": "ISO datetime",
    "submitted_at": "ISO datetime"
  }
}
```

**Error Response** (409 — already submitted):
```json
{ "detail": { "message": "Report already submitted for this month" } }
```

**Frontend usage**: `WDCReportForm` submit mutation. Also used by offline queue sync.

---

### GET `/reports`
**Auth required**: Yes

**Query params**: `limit` (int, default 10), `offset` (int, default 0)

**Response** (200):
```json
{
  "data": {
    "reports": [
      {
        "id": "integer",
        "report_month": "YYYY-MM",
        "status": "DRAFT | SUBMITTED | REVIEWED | FLAGGED | DECLINED",
        "ward_id": "integer",
        "ward_name": "string",
        "meetings_held": "integer",
        "attendees_count": "integer",
        "submitted_at": "ISO datetime",
        "created_at": "ISO datetime",
        "issues_identified": "string | null",
        "actions_taken": "string | null",
        "challenges": "string | null"
      }
    ],
    "total": "integer"
  }
}
```

**Frontend usage**: `useReports()` hook in WDCDashboard and MyReportsPage.

---

### GET `/reports/{id}`
**Auth required**: Yes

**Response** (200):
```json
{
  "data": {
    "id": "integer",
    "report_month": "YYYY-MM",
    "status": "string",
    "ward_id": "integer",
    "ward_name": "string",
    "lga_name": "string",
    "submitted_by": "string",
    "meeting_type": "string",
    "submitted_at": "ISO datetime",
    "...all report_data fields flattened...",
    "voice_notes": [{ "id": "integer", "field_name": "string", "filename": "string" }],
    "attendance_pictures": ["string (URL)"],
    "group_photos": ["string (URL)"]
  }
}
```

**Frontend usage**: `useReportById()` for ReportDetailView.

---

### PUT `/reports/{id}`
**Auth required**: Yes (owner only, status must be DRAFT)

**Request**: JSON body with updated report fields

**Response** (200): Updated report object

---

### GET `/reports/check-submitted`
**Auth required**: Yes

**Query params**: `month` (string, "YYYY-MM")

**Response** (200):
```json
{
  "data": {
    "submitted": "boolean",
    "report_id": "integer | null"
  }
}
```

**Frontend usage**: `useCheckSubmission()` on WDCDashboard to show/disable submit button.

---

### GET `/reports/submission-info`
**Auth required**: Yes

**Response** (200):
```json
{
  "data": {
    "target_month": "YYYY-MM",
    "month_name": "string (e.g. 'April 2026')",
    "already_submitted": "boolean",
    "is_submission_window": "boolean",
    "window_start": "ISO date",
    "window_end": "ISO date"
  }
}
```

**Frontend usage**: SubmitReportPage to determine target month and check eligibility.

---

### PATCH `/reports/{id}/review`
**Auth required**: Yes (LGA_COORDINATOR or STATE_OFFICIAL)

**Request** (from LGA Coordinator):
```json
{
  "status": "REVIEWED | FLAGGED",
  "reviewer_notes": "string (optional)"
}
```

**Request** (from State Official):
```json
{
  "action": "approve | decline | flag",
  "notes": "string (optional)"
}
```

**Response** (200):
```json
{
  "data": { ...updated report... }
}
```

**Frontend usage**: `useReviewReport()` in both LGA and State data hooks.

---

### GET `/reports/{id}/ai-suggestions`
**Auth required**: Yes

**Response** (200):
```json
{
  "data": {
    "status": "pending | processing | completed | failed",
    "transcription": "string | null",
    "suggestions": {
      "field_name": "suggested_value",
      ...
    }
  }
}
```

---

### POST `/reports/{id}/ai-suggestions/accept`
**Auth required**: Yes

**Request**:
```json
{
  "fields": ["field_name_1", "field_name_2"]
}
```

**Response** (200):
```json
{
  "data": {
    "updated_fields": ["field_name_1", "field_name_2"]
  }
}
```

---

### GET `/reports/state-submissions`
**Auth required**: Yes (STATE_OFFICIAL)

**Query params**: `month` (YYYY-MM), `lga_id` (int, optional), `status` (string, optional), `limit`, `offset`

**Response** (200):
```json
{
  "data": {
    "submissions": [{ ...full report objects... }],
    "total": "integer"
  }
}
```

---

## Drafts

### POST `/reports/draft`
**Auth required**: Yes

**Content-Type**: `multipart/form-data`

**Request fields**:
| Field | Type |
|-------|------|
| `report_month` | string "YYYY-MM" |
| `report_data` | string (JSON — same shape as submit) |
| `voice_note` | File (optional, first voice note) |

**Response** (200):
```json
{
  "data": {
    "id": "integer (draft report ID)",
    "saved_at": "ISO datetime"
  }
}
```

---

### GET `/reports/draft/existing`
**Auth required**: Yes

**Query params**: `report_month` (string, YYYY-MM, optional — defaults to current)

**Response** (200):
```json
{
  "has_draft": "boolean",
  "report_data": "object | null (the saved form data)",
  "saved_at": "ISO datetime | null",
  "draft_id": "integer | null"
}
```

---

### DELETE `/reports/draft/{id}`
**Auth required**: Yes

**Response** (200):
```json
{ "success": true }
```

---

## Voice Notes

### GET `/voice-notes/{id}/download`
**Auth required**: Yes

**Response**: Binary audio file with `Content-Disposition` header

---

### DELETE `/voice-notes/{id}`
**Auth required**: Yes

**Response** (200):
```json
{ "success": true }
```

---

## LGA Endpoints

### GET `/lgas/{id}`
**Auth required**: Yes

**Response** (200):
```json
{
  "data": {
    "id": "integer",
    "name": "string",
    "num_wards": "integer",
    "state_id": "integer"
  }
}
```

---

### GET `/lgas/{id}/wards`
**Auth required**: Yes

**Query params**: `month` (YYYY-MM, optional)

**Response** (200):
```json
{
  "data": {
    "wards": [
      {
        "id": "integer",
        "name": "string",
        "submitted": "boolean",
        "total_meetings": "integer",
        "total_attendees": "integer",
        "secretary_name": "string | null"
      }
    ],
    "lga": {
      "id": "integer",
      "name": "string",
      "num_wards": "integer"
    }
  }
}
```

---

### GET `/lgas/{id}/reports`
**Auth required**: Yes

**Query params**: `limit` (int), `offset` (int), `month` (YYYY-MM, optional), `status` (string, optional)

**Response** (200):
```json
{
  "data": {
    "reports": [{ ...report objects with ward_name, status, meetings_held, attendees_count... }],
    "total": "integer"
  }
}
```

---

### GET `/lgas/{id}/missing-reports`
**Auth required**: Yes

**Query params**: `month` (YYYY-MM)

**Response** (200):
```json
{
  "data": {
    "missing": [
      {
        "ward_id": "integer",
        "ward_name": "string",
        "secretary_name": "string | null",
        "secretary_email": "string | null"
      }
    ]
  }
}
```

---

### GET `/lgas`
**Auth required**: Yes (STATE_OFFICIAL)

**Response** (200):
```json
{
  "data": [
    { "id": "integer", "name": "string", "num_wards": "integer" }
  ]
}
```

---

## Notifications

### GET `/notifications`
**Auth required**: Yes

**Query params**: `unread_only` (boolean), `limit` (int), `offset` (int)

**Response** (200):
```json
{
  "data": {
    "notifications": [
      {
        "id": "integer",
        "title": "string",
        "message": "string",
        "notification_type": "REPORT_MISSING | REPORT_SUBMITTED | REPORT_REVIEWED | FEEDBACK | REMINDER | SYSTEM",
        "is_read": "boolean",
        "created_at": "ISO datetime"
      }
    ],
    "total": "integer"
  }
}
```

---

### PATCH `/notifications/{id}/read`
**Auth required**: Yes

**Response** (200):
```json
{ "success": true }
```

---

### POST `/notifications/mark-all-read`
**Auth required**: Yes

**Response** (200):
```json
{ "success": true }
```

---

### POST `/notifications/send`
**Auth required**: Yes (LGA_COORDINATOR or STATE_OFFICIAL)

**Request**:
```json
{
  "ward_ids": ["integer"],
  "notification_type": "REMINDER",
  "title": "string",
  "message": "string"
}
```

**Response** (200):
```json
{ "success": true, "sent_count": "integer" }
```

---

## Feedback / Messages

### GET `/feedback`
**Auth required**: Yes

**Query params**: `limit` (int), `offset` (int)

**Response** (200):
```json
{
  "data": {
    "messages": [
      {
        "id": "integer",
        "message": "string",
        "sender_name": "string",
        "sender_role": "string",
        "recipient_type": "string",
        "is_read": "boolean",
        "created_at": "ISO datetime"
      }
    ]
  }
}
```

---

### POST `/feedback`
**Auth required**: Yes

**Request**:
```json
{
  "message": "string (required)",
  "recipient_type": "WDC | LGA | STATE"
}
```

**Response** (201):
```json
{
  "data": {
    "id": "integer",
    "message": "string",
    "created_at": "ISO datetime"
  }
}
```

---

### PATCH `/feedback/{id}/read`
**Auth required**: Yes

**Response** (200):
```json
{ "success": true }
```

---

## Analytics (State Officials)

### GET `/analytics/overview`
**Auth required**: Yes (STATE_OFFICIAL)

**Query params**: `month` (YYYY-MM)

**Response** (200):
```json
{
  "data": {
    "total_lgas": "integer",
    "total_wards": "integer",
    "total_submitted": "integer",
    "total_missing": "integer",
    "total_reviewed": "integer",
    "total_flagged": "integer"
  }
}
```

---

### GET `/analytics/lga-comparison`
**Auth required**: Yes (STATE_OFFICIAL)

**Query params**: `month` (YYYY-MM)

**Response** (200):
```json
{
  "data": {
    "lgas": [
      {
        "id": "integer",
        "name": "string",
        "total_wards": "integer",
        "official_ward_count": "integer (optional)",
        "submitted_count": "integer",
        "missing_count": "integer",
        "reviewed_count": "integer",
        "flagged_count": "integer",
        "submission_rate": "integer (0-100)",
        "reports": [{ "id": "integer", "ward_name": "string", "submitted_at": "ISO datetime", "status": "string" }]
      }
    ]
  }
}
```

---

### GET `/analytics/trends`
**Auth required**: Yes (STATE_OFFICIAL)

**Query params**: `months` (integer, how many months of history)

**Response** (200):
```json
{
  "data": {
    "trends": [
      {
        "month": "string (e.g. 'Jan 2026')",
        "submission_rate": "integer (0-100)",
        "total_submitted": "integer",
        "total_wards": "integer"
      }
    ]
  }
}
```

---

### POST `/analytics/ai-report`
**Auth required**: Yes (STATE_OFFICIAL)

**Request**:
```json
{
  "month": "YYYY-MM (optional, defaults to current)"
}
```

**Response** (200):
```json
{
  "data": {
    "summary": "string (paragraph)",
    "insights": ["string"],
    "recommendations": ["string"]
  }
}
```

---

## Investigations

### GET `/investigations`
**Auth required**: Yes (STATE_OFFICIAL)

**Query params**: `limit` (int), `offset` (int), `status` (OPEN|IN_PROGRESS|CLOSED, optional)

**Response** (200):
```json
{
  "data": {
    "investigations": [
      {
        "id": "integer",
        "title": "string",
        "description": "string | null",
        "priority": "LOW | MEDIUM | HIGH | URGENT",
        "status": "OPEN | IN_PROGRESS | CLOSED",
        "lga_id": "integer | null",
        "lga_name": "string | null",
        "created_at": "ISO datetime",
        "updated_at": "ISO datetime"
      }
    ]
  }
}
```

---

### POST `/investigations`
**Auth required**: Yes (STATE_OFFICIAL)

**Request**:
```json
{
  "title": "string (required)",
  "description": "string (optional)",
  "priority": "LOW | MEDIUM | HIGH | URGENT (default MEDIUM)",
  "lga_id": "integer | null (optional, null = state-wide)"
}
```

**Response** (201):
```json
{
  "data": { ...investigation object... }
}
```

---

### PATCH `/investigations/{id}`
**Auth required**: Yes (STATE_OFFICIAL)

**Request**:
```json
{
  "status": "OPEN | IN_PROGRESS | CLOSED",
  "description": "string (optional update)"
}
```

**Response** (200):
```json
{
  "data": { ...updated investigation... }
}
```

---

## Forms (Dynamic Form Builder)

### GET `/forms/active`
**Auth required**: Yes

**Response** (200):
```json
{
  "data": {
    "id": "integer",
    "name": "string",
    "version": "integer",
    "fields": [
      {
        "id": "string",
        "type": "text | number | select | textarea | checkbox | radio | date",
        "label": "string",
        "name": "string",
        "required": "boolean",
        "options": ["string"] ,
        "section": "string",
        "order": "integer",
        "conditions": [{ ... }]
      }
    ],
    "is_active": true,
    "deployed_at": "ISO datetime"
  }
}
```

**Frontend usage**: SubmitReportPage checks for active dynamic form before showing WDCReportForm.

---

### GET `/forms`
**Auth required**: Yes (STATE_OFFICIAL)

**Query params**: `limit`, `offset`

**Response** (200):
```json
{
  "data": [
    {
      "id": "integer",
      "name": "string",
      "version": "integer",
      "is_active": "boolean",
      "fields_count": "integer",
      "created_at": "ISO datetime",
      "deployed_at": "ISO datetime | null"
    }
  ]
}
```

---

### GET `/forms/{id}`
**Auth required**: Yes (STATE_OFFICIAL)

**Response** (200): Full form object with all fields and conditions.

---

### POST `/forms`
**Auth required**: Yes (STATE_OFFICIAL)

**Request**:
```json
{
  "name": "string",
  "fields": [{ ...field definitions... }],
  "conditions": [{ ...condition rules... }]
}
```

**Response** (201):
```json
{
  "data": { ...created form... }
}
```

---

### PUT `/forms/{id}`
**Auth required**: Yes (STATE_OFFICIAL)

**Request**: Same shape as POST

**Response** (200): Updated form object.

---

### POST `/forms/{id}/deploy`
**Auth required**: Yes (STATE_OFFICIAL)

**Response** (200):
```json
{
  "data": {
    "id": "integer",
    "is_active": true,
    "deployed_at": "ISO datetime"
  }
}
```

---

## User Management (State Officials)

### GET `/users/summary`
**Auth required**: Yes (STATE_OFFICIAL)

**Response** (200):
```json
{
  "data": {
    "total_users": "integer",
    "by_role": {
      "WDC_SECRETARY": "integer",
      "LGA_COORDINATOR": "integer",
      "STATE_OFFICIAL": "integer"
    },
    "active_count": "integer",
    "inactive_count": "integer"
  }
}
```

---

### GET `/users/lga-wards/{lgaId}`
**Auth required**: Yes (STATE_OFFICIAL)

**Response** (200):
```json
{
  "data": {
    "wards": [
      { "id": "integer", "name": "string", "has_secretary": "boolean", "secretary_name": "string | null" }
    ]
  }
}
```

---

### GET `/users/coordinator/{lgaId}`
**Auth required**: Yes (STATE_OFFICIAL)

**Response** (200):
```json
{
  "data": {
    "user": {
      "id": "integer",
      "full_name": "string",
      "email": "string",
      "phone": "string | null",
      "is_active": "boolean",
      "last_login": "ISO datetime | null"
    }
  }
}
```

---

### GET `/users/secretary/{wardId}`
**Auth required**: Yes (STATE_OFFICIAL)

**Response** (200):
```json
{
  "data": {
    "user": { ...same shape as coordinator... }
  }
}
```

---

### PATCH `/users/{id}`
**Auth required**: Yes (STATE_OFFICIAL)

**Request**:
```json
{
  "full_name": "string (optional)",
  "email": "string (optional)",
  "phone": "string (optional)"
}
```

**Response** (200):
```json
{ "data": { "user": { ... } } }
```

---

### PATCH `/users/{id}/password`
**Auth required**: Yes (STATE_OFFICIAL)

**Request**:
```json
{
  "new_password": "string"
}
```

**Response** (200):
```json
{ "success": true }
```

---

### PATCH `/users/{id}/access`
**Auth required**: Yes (STATE_OFFICIAL)

**Request**:
```json
{
  "is_active": "boolean"
}
```

**Response** (200):
```json
{ "success": true }
```

---

### POST `/users/assign`
**Auth required**: Yes (STATE_OFFICIAL)

**Request**:
```json
{
  "user_id": "integer",
  "ward_id": "integer (optional, for WDC_SECRETARY)",
  "lga_id": "integer (optional, for LGA_COORDINATOR)"
}
```

**Response** (200):
```json
{ "success": true }
```

---

## Profile (Self-service)

### GET `/profile/me`
**Auth required**: Yes

**Response** (200):
```json
{
  "data": { ...user object... }
}
```

---

### PATCH `/profile/me`
**Auth required**: Yes

**Request**:
```json
{
  "full_name": "string (optional)",
  "phone": "string (optional)"
}
```

**Response** (200):
```json
{ "data": { ...updated user... } }
```

---

### PATCH `/profile/email`
**Auth required**: Yes (STATE_OFFICIAL only, or all roles depending on backend)

**Request**:
```json
{
  "email": "string"
}
```

**Response** (200):
```json
{ "data": { ...updated user... } }
```

---

### POST `/profile/change-password`
**Auth required**: Yes

**Request**:
```json
{
  "current_password": "string",
  "new_password": "string"
}
```

**Response** (200):
```json
{ "success": true }
```

---

## Admin Endpoints (State Officials)

### POST `/admin/update-state-executive-name`
**Auth required**: Yes (STATE_OFFICIAL)

**Request**: None (hardcoded operation)

**Response** (200):
```json
{
  "old_name": "string",
  "new_name": "string"
}
```

---

### POST `/admin/update-lgas-wards`
**Auth required**: Yes (STATE_OFFICIAL)

**Request**: None (seeds/updates from hardcoded data)

**Response** (200):
```json
{
  "lgas": { "total": "integer", "created": "integer", "updated": "integer" },
  "wards": { "total": "integer", "created": "integer", "updated": "integer" }
}
```

---

## Health & Version

### GET `/health`
**Auth required**: No

**Response** (200):
```json
{ "status": "ok" }
```

---

### GET `/app/version`
**Auth required**: No

**Response** (200):
```json
{
  "version": "string (semver, e.g. '2.5.0')",
  "min_version": "string (optional, minimum supported client version)"
}
```

**Frontend usage**: `useAppVersion` hook (native only). If server version > client version and client isn't dev (version !== '0.0.0'), shows persistent toast prompting update.

---

## Data Types Reference

### User Roles
```
WDC_SECRETARY
LGA_COORDINATOR
STATE_OFFICIAL
```

### Report Statuses
```
DRAFT
SUBMITTED
REVIEWED
FLAGGED
DECLINED
```

### Notification Types
```
REPORT_MISSING
REPORT_SUBMITTED
REPORT_REVIEWED
FEEDBACK
REMINDER
SYSTEM
```

### Investigation Statuses
```
OPEN
IN_PROGRESS
CLOSED
```

### Investigation Priorities
```
LOW
MEDIUM
HIGH
URGENT
```

### Investigation Types
```
PERFORMANCE
FINANCIAL
COMPLAINT
AUDIT
OTHER
```

### File Upload Constraints
| Type | Max Size | Formats |
|------|----------|---------|
| Voice Note | 10 MB | .mp3, .m4a, .wav, .ogg, .webm |
| Photo | 10 MB | .jpg, .jpeg, .png, .webp |

### Pagination
- Default limit: 10
- Max limit: 100
- Default offset: 0

---

## Authentication Flow Summary

```
┌──────────┐         ┌──────────┐         ┌──────────┐
│  Client  │         │   API    │         │   DB     │
└────┬─────┘         └────┬─────┘         └────┬─────┘
     │                     │                     │
     │ POST /auth/login    │                     │
     │────────────────────>│  verify credentials │
     │                     │────────────────────>│
     │                     │<────────────────────│
     │  { access_token,    │                     │
     │    refresh_token,   │                     │
     │    user }           │                     │
     │<────────────────────│                     │
     │                     │                     │
     │  [access_token in   │                     │
     │   memory only]      │                     │
     │  [refresh_token in  │                     │
     │   IndexedDB]        │                     │
     │                     │                     │
     │ GET /reports        │                     │
     │ Authorization:      │                     │
     │   Bearer {token}    │                     │
     │────────────────────>│                     │
     │                     │                     │
     │  [on 401]           │                     │
     │ POST /auth/refresh  │                     │
     │────────────────────>│  validate & rotate  │
     │                     │────────────────────>│
     │  { new_access,      │                     │
     │    new_refresh }    │                     │
     │<────────────────────│                     │
     │                     │                     │
     │  [retry original]   │                     │
     │ GET /reports        │                     │
     │────────────────────>│                     │
     │  { data }           │                     │
     │<────────────────────│                     │
```

---

*End of Backend Contract*
