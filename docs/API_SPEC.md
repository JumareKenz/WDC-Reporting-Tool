# API Specification - KADUNA STATE WDC System

## Base Configuration

### Base URL
```
Development: http://localhost:8000/api
```

### API Version
```
v1 (included in base path)
```

### Authentication
All endpoints except `/auth/login` require JWT token in header:
```
Authorization: Bearer <jwt_token>
```

### Response Format
All responses follow this structure:

**Success Response**:
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional success message"
}
```

**Error Response**:
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message"
  }
}
```

### HTTP Status Codes
- `200 OK` - Successful GET/PUT/PATCH
- `201 Created` - Successful POST
- `204 No Content` - Successful DELETE
- `400 Bad Request` - Validation error
- `401 Unauthorized` - Missing or invalid token
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

---

## Endpoints by Feature

## 1. Authentication

### POST /auth/login
Login and receive JWT token.

**Access**: Public

**Request Body**:
```json
{
  "email": "wdc.chikun.barnawa@kaduna.gov.ng",
  "password": "demo123"
}
```

**Response** (200):
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "bearer",
    "user": {
      "id": 1,
      "email": "wdc.chikun.barnawa@kaduna.gov.ng",
      "full_name": "Amina Yusuf",
      "role": "WDC_SECRETARY",
      "ward": {
        "id": 1,
        "name": "Barnawa",
        "lga_name": "Chikun"
      }
    }
  }
}
```

**Errors**:
- `401`: Invalid credentials

---

### GET /auth/me
Get current user information.

**Access**: All authenticated users

**Response** (200):
```json
{
  "success": true,
  "data": {
    "id": 1,
    "email": "wdc.chikun.barnawa@kaduna.gov.ng",
    "full_name": "Amina Yusuf",
    "phone": "08012345678",
    "role": "WDC_SECRETARY",
    "ward": {
      "id": 1,
      "name": "Barnawa",
      "code": "CHK-BRN",
      "lga_id": 1,
      "lga_name": "Chikun"
    },
    "last_login": "2026-01-22T10:30:00Z"
  }
}
```

---

## 2. Reports (WDC Secretary)

### POST /reports
Submit a new monthly report.

**Access**: WDC_SECRETARY

**Request Body** (multipart/form-data):
```
report_month: "2026-01"
meetings_held: 3
attendees_count: 150
issues_identified: "Road repairs needed on Main St"
actions_taken: "Reported to LGA"
challenges: "Limited budget for community programs"
recommendations: "Increase quarterly budget allocation"
additional_notes: "Community engagement was positive"
voice_note: <file> (optional, max 10MB, audio formats: mp3, m4a, wav)
```

**Response** (201):
```json
{
  "success": true,
  "data": {
    "id": 15,
    "ward_id": 1,
    "report_month": "2026-01",
    "meetings_held": 3,
    "attendees_count": 150,
    "issues_identified": "Road repairs needed on Main St",
    "actions_taken": "Reported to LGA",
    "status": "SUBMITTED",
    "submitted_at": "2026-01-22T14:30:00Z",
    "voice_note": {
      "id": 5,
      "file_name": "january_report.mp3",
      "file_size": 524288,
      "duration_seconds": 120
    }
  },
  "message": "Report submitted successfully"
}
```

**Errors**:
- `400`: Validation error (missing required fields, invalid month format)
- `409`: Report already exists for this month
- `413`: File too large

**Validation Rules**:
- `report_month`: Required, format "YYYY-MM"
- `meetings_held`: Required, integer >= 0
- `attendees_count`: Required, integer >= 0
- Voice note: Optional, max 10MB, formats: mp3, m4a, wav, ogg

---

### GET /reports
Get reports for current user's ward.

**Access**: WDC_SECRETARY

**Query Parameters**:
- `limit` (optional, default: 10): Number of reports to return
- `offset` (optional, default: 0): Pagination offset

**Response** (200):
```json
{
  "success": true,
  "data": {
    "reports": [
      {
        "id": 15,
        "report_month": "2026-01",
        "meetings_held": 3,
        "attendees_count": 150,
        "status": "SUBMITTED",
        "submitted_at": "2026-01-22T14:30:00Z",
        "has_voice_note": true
      },
      {
        "id": 12,
        "report_month": "2025-12",
        "meetings_held": 2,
        "attendees_count": 120,
        "status": "REVIEWED",
        "submitted_at": "2025-12-28T10:15:00Z",
        "has_voice_note": false
      }
    ],
    "total": 2,
    "limit": 10,
    "offset": 0
  }
}
```

---

### GET /reports/{report_id}
Get detailed report information.

**Access**: WDC_SECRETARY (own ward), LGA_COORDINATOR (own LGA), STATE_OFFICIAL (all)

**Response** (200):
```json
{
  "success": true,
  "data": {
    "id": 15,
    "ward": {
      "id": 1,
      "name": "Barnawa",
      "lga_name": "Chikun"
    },
    "report_month": "2026-01",
    "meetings_held": 3,
    "attendees_count": 150,
    "issues_identified": "Road repairs needed on Main St",
    "actions_taken": "Reported to LGA",
    "challenges": "Limited budget for community programs",
    "recommendations": "Increase quarterly budget allocation",
    "additional_notes": "Community engagement was positive",
    "status": "SUBMITTED",
    "submitted_at": "2026-01-22T14:30:00Z",
    "submitted_by": {
      "id": 1,
      "full_name": "Amina Yusuf"
    },
    "reviewed_by": null,
    "reviewed_at": null,
    "voice_notes": [
      {
        "id": 5,
        "file_name": "january_report.mp3",
        "file_size": 524288,
        "duration_seconds": 120,
        "download_url": "/api/voice-notes/5/download"
      }
    ]
  }
}
```

**Errors**:
- `403`: Not authorized to view this report
- `404`: Report not found

---

### PUT /reports/{report_id}
Update an existing report (only if status is DRAFT).

**Access**: WDC_SECRETARY (own ward only)

**Request Body** (JSON):
```json
{
  "meetings_held": 4,
  "attendees_count": 180,
  "issues_identified": "Updated issues text",
  "actions_taken": "Updated actions text"
}
```

**Response** (200):
```json
{
  "success": true,
  "data": { ... },
  "message": "Report updated successfully"
}
```

**Errors**:
- `400`: Cannot update submitted report
- `403`: Not authorized
- `404`: Report not found

---

### GET /reports/check-submitted
Check if current month's report has been submitted.

**Access**: WDC_SECRETARY

**Query Parameters**:
- `month` (optional, default: current month): Format "YYYY-MM"

**Response** (200):
```json
{
  "success": true,
  "data": {
    "month": "2026-01",
    "submitted": true,
    "report_id": 15,
    "submitted_at": "2026-01-22T14:30:00Z"
  }
}
```

---

## 3. Voice Notes

### GET /voice-notes/{voice_note_id}/download
Download a voice note file.

**Access**: WDC_SECRETARY (own ward), LGA_COORDINATOR (own LGA), STATE_OFFICIAL (all)

**Response** (200):
- Content-Type: audio/mpeg (or appropriate audio MIME type)
- Content-Disposition: attachment; filename="january_report.mp3"
- Binary audio data

**Errors**:
- `403`: Not authorized to download this file
- `404`: Voice note not found

---

### DELETE /voice-notes/{voice_note_id}
Delete a voice note (only if report is in DRAFT status).

**Access**: WDC_SECRETARY (own ward only)

**Response** (204):
No content

**Errors**:
- `400`: Cannot delete voice note from submitted report
- `403`: Not authorized
- `404`: Voice note not found

---

## 4. LGA Dashboard (Coordinator)

### GET /lgas/{lga_id}/wards
Get all wards in an LGA with submission status.

**Access**: LGA_COORDINATOR (own LGA), STATE_OFFICIAL (all)

**Query Parameters**:
- `month` (optional, default: current month): Format "YYYY-MM"

**Response** (200):
```json
{
  "success": true,
  "data": {
    "lga": {
      "id": 1,
      "name": "Chikun",
      "code": "CHK",
      "num_wards": 12
    },
    "month": "2026-01",
    "wards": [
      {
        "id": 1,
        "name": "Barnawa",
        "code": "CHK-BRN",
        "secretary": {
          "id": 1,
          "full_name": "Amina Yusuf",
          "phone": "08012345678"
        },
        "report": {
          "id": 15,
          "status": "SUBMITTED",
          "submitted_at": "2026-01-22T14:30:00Z",
          "has_voice_note": true
        }
      },
      {
        "id": 2,
        "name": "Kakau Daji",
        "code": "CHK-KKD",
        "secretary": {
          "id": 2,
          "full_name": "Ibrahim Musa",
          "phone": "08087654321"
        },
        "report": null
      }
    ],
    "summary": {
      "total_wards": 12,
      "submitted": 10,
      "missing": 2,
      "submission_rate": 83.33
    }
  }
}
```

---

### GET /lgas/{lga_id}/missing-reports
Get wards with missing reports for a given month.

**Access**: LGA_COORDINATOR (own LGA), STATE_OFFICIAL (all)

**Query Parameters**:
- `month` (optional, default: current month): Format "YYYY-MM"

**Response** (200):
```json
{
  "success": true,
  "data": {
    "lga_id": 1,
    "lga_name": "Chikun",
    "month": "2026-01",
    "missing_reports": [
      {
        "ward_id": 2,
        "ward_name": "Kakau Daji",
        "ward_code": "CHK-KKD",
        "secretary": {
          "id": 2,
          "full_name": "Ibrahim Musa",
          "email": "wdc.chikun.kakau@kaduna.gov.ng",
          "phone": "08087654321"
        },
        "last_submitted": "2025-12-28T10:00:00Z"
      },
      {
        "ward_id": 5,
        "ward_name": "Nassarawa",
        "ward_code": "CHK-NSR",
        "secretary": {
          "id": 5,
          "full_name": "Fatima Bello",
          "email": "wdc.chikun.nassarawa@kaduna.gov.ng",
          "phone": "08099887766"
        },
        "last_submitted": null
      }
    ],
    "count": 2
  }
}
```

---

### GET /lgas/{lga_id}/reports
Get all reports for an LGA.

**Access**: LGA_COORDINATOR (own LGA), STATE_OFFICIAL (all)

**Query Parameters**:
- `month` (optional): Filter by specific month "YYYY-MM"
- `status` (optional): Filter by status (SUBMITTED, REVIEWED, FLAGGED)
- `limit` (optional, default: 50): Number of reports
- `offset` (optional, default: 0): Pagination offset

**Response** (200):
```json
{
  "success": true,
  "data": {
    "reports": [
      {
        "id": 15,
        "ward_name": "Barnawa",
        "report_month": "2026-01",
        "meetings_held": 3,
        "attendees_count": 150,
        "status": "SUBMITTED",
        "submitted_at": "2026-01-22T14:30:00Z",
        "secretary_name": "Amina Yusuf",
        "has_voice_note": true
      }
    ],
    "total": 10,
    "limit": 50,
    "offset": 0
  }
}
```

---

### PATCH /reports/{report_id}/review
Mark a report as reviewed.

**Access**: LGA_COORDINATOR (own LGA), STATE_OFFICIAL (all)

**Request Body** (JSON):
```json
{
  "status": "REVIEWED"
}
```

**Response** (200):
```json
{
  "success": true,
  "data": {
    "id": 15,
    "status": "REVIEWED",
    "reviewed_by": 3,
    "reviewed_at": "2026-01-22T16:00:00Z"
  },
  "message": "Report marked as reviewed"
}
```

**Errors**:
- `403`: Not authorized to review this report
- `404`: Report not found

---

## 5. Notifications

### GET /notifications
Get notifications for current user.

**Access**: All authenticated users

**Query Parameters**:
- `unread_only` (optional, default: false): Show only unread notifications
- `limit` (optional, default: 20): Number of notifications
- `offset` (optional, default: 0): Pagination offset

**Response** (200):
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": 25,
        "notification_type": "REPORT_MISSING",
        "title": "Missing Report Reminder",
        "message": "Your ward has not submitted the January 2026 report. Please submit before the deadline.",
        "is_read": false,
        "created_at": "2026-01-22T09:00:00Z",
        "related_entity": {
          "type": "ward",
          "id": 1
        }
      },
      {
        "id": 24,
        "notification_type": "FEEDBACK",
        "title": "New Feedback on Your Report",
        "message": "LGA Coordinator has reviewed your December report.",
        "is_read": true,
        "created_at": "2026-01-20T14:30:00Z",
        "related_entity": {
          "type": "report",
          "id": 12
        }
      }
    ],
    "total": 8,
    "unread_count": 3,
    "limit": 20,
    "offset": 0
  }
}
```

---

### PATCH /notifications/{notification_id}/read
Mark notification as read.

**Access**: Owner of notification

**Response** (200):
```json
{
  "success": true,
  "data": {
    "id": 25,
    "is_read": true
  }
}
```

---

### POST /notifications/mark-all-read
Mark all notifications as read for current user.

**Access**: All authenticated users

**Response** (200):
```json
{
  "success": true,
  "data": {
    "marked_read": 5
  },
  "message": "All notifications marked as read"
}
```

---

### POST /notifications/send
Send a notification to specific users (LGA Coordinator to WDC Secretaries).

**Access**: LGA_COORDINATOR, STATE_OFFICIAL

**Request Body** (JSON):
```json
{
  "recipient_ids": [1, 2, 5],
  "title": "Report Deadline Reminder",
  "message": "Please submit your January reports by January 25, 2026.",
  "notification_type": "REMINDER"
}
```

**Response** (201):
```json
{
  "success": true,
  "data": {
    "sent_count": 3,
    "notification_ids": [26, 27, 28]
  },
  "message": "Notifications sent successfully"
}
```

---

## 6. Feedback / Chat

### GET /feedback
Get feedback messages for current user.

**Access**: WDC_SECRETARY (own ward), LGA_COORDINATOR (own LGA)

**Query Parameters**:
- `ward_id` (optional): Filter by ward (required for LGA_COORDINATOR)
- `limit` (optional, default: 50): Number of messages
- `offset` (optional, default: 0): Pagination offset

**Response** (200):
```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "id": 10,
        "ward_id": 1,
        "ward_name": "Barnawa",
        "sender": {
          "id": 3,
          "full_name": "Ibrahim Suleiman",
          "role": "LGA_COORDINATOR"
        },
        "recipient": {
          "id": 1,
          "full_name": "Amina Yusuf",
          "role": "WDC_SECRETARY"
        },
        "message": "Great work on the January report! Please provide more details on the road repair timeline.",
        "is_read": true,
        "parent_id": null,
        "created_at": "2026-01-22T15:00:00Z"
      },
      {
        "id": 11,
        "ward_id": 1,
        "ward_name": "Barnawa",
        "sender": {
          "id": 1,
          "full_name": "Amina Yusuf",
          "role": "WDC_SECRETARY"
        },
        "recipient": {
          "id": 3,
          "full_name": "Ibrahim Suleiman",
          "role": "LGA_COORDINATOR"
        },
        "message": "Thank you! The LGA promised to start repairs by end of February.",
        "is_read": false,
        "parent_id": 10,
        "created_at": "2026-01-22T16:30:00Z"
      }
    ],
    "total": 8,
    "limit": 50,
    "offset": 0
  }
}
```

---

### POST /feedback
Send a feedback message.

**Access**: WDC_SECRETARY (to own LGA coordinator), LGA_COORDINATOR (to ward secretaries in own LGA)

**Request Body** (JSON):
```json
{
  "ward_id": 1,
  "recipient_id": 1,
  "message": "Please provide an update on the community meeting scheduled for next week.",
  "parent_id": null
}
```

**Response** (201):
```json
{
  "success": true,
  "data": {
    "id": 12,
    "ward_id": 1,
    "sender_id": 3,
    "recipient_id": 1,
    "message": "Please provide an update on the community meeting scheduled for next week.",
    "parent_id": null,
    "created_at": "2026-01-22T17:00:00Z"
  },
  "message": "Message sent successfully"
}
```

**Errors**:
- `403`: Not authorized to send feedback to this ward/user
- `400`: Invalid ward_id or recipient_id

---

### PATCH /feedback/{feedback_id}/read
Mark feedback message as read.

**Access**: Recipient of the message

**Response** (200):
```json
{
  "success": true,
  "data": {
    "id": 11,
    "is_read": true
  }
}
```

---

## 7. State Dashboard (Analytics)

### GET /analytics/overview
Get state-wide overview statistics.

**Access**: STATE_OFFICIAL

**Query Parameters**:
- `month` (optional, default: current month): Format "YYYY-MM"

**Response** (200):
```json
{
  "success": true,
  "data": {
    "month": "2026-01",
    "state_summary": {
      "total_lgas": 23,
      "total_wards": 255,
      "reports_submitted": 198,
      "reports_missing": 57,
      "submission_rate": 77.65,
      "total_meetings_held": 594,
      "total_attendees": 29700
    },
    "top_performing_lgas": [
      {
        "lga_id": 5,
        "lga_name": "Kaduna North",
        "submission_rate": 100.0,
        "wards_submitted": 11,
        "total_wards": 11
      },
      {
        "lga_id": 8,
        "lga_name": "Ikara",
        "submission_rate": 95.45,
        "wards_submitted": 21,
        "total_wards": 22
      }
    ],
    "low_performing_lgas": [
      {
        "lga_id": 12,
        "lga_name": "Soba",
        "submission_rate": 45.45,
        "wards_submitted": 5,
        "total_wards": 11
      },
      {
        "lga_id": 18,
        "lga_name": "Lere",
        "submission_rate": 53.33,
        "wards_submitted": 8,
        "total_wards": 15
      }
    ]
  }
}
```

---

### GET /analytics/lga-comparison
Compare all LGAs for a given month.

**Access**: STATE_OFFICIAL

**Query Parameters**:
- `month` (optional, default: current month): Format "YYYY-MM"
- `sort_by` (optional, default: "submission_rate"): Sort field
- `order` (optional, default: "desc"): Sort order (asc/desc)

**Response** (200):
```json
{
  "success": true,
  "data": {
    "month": "2026-01",
    "lgas": [
      {
        "lga_id": 1,
        "lga_name": "Chikun",
        "total_wards": 12,
        "reports_submitted": 10,
        "reports_missing": 2,
        "submission_rate": 83.33,
        "total_meetings": 30,
        "total_attendees": 1500
      },
      {
        "lga_id": 2,
        "lga_name": "Zaria",
        "total_wards": 13,
        "reports_submitted": 6,
        "reports_missing": 7,
        "submission_rate": 46.15,
        "total_meetings": 18,
        "total_attendees": 900
      }
    ]
  }
}
```

---

### GET /analytics/trends
Get submission trends over time.

**Access**: STATE_OFFICIAL

**Query Parameters**:
- `start_month` (required): Format "YYYY-MM"
- `end_month` (required): Format "YYYY-MM"
- `lga_id` (optional): Filter by specific LGA

**Response** (200):
```json
{
  "success": true,
  "data": {
    "period": {
      "start": "2025-10",
      "end": "2026-01"
    },
    "trends": [
      {
        "month": "2025-10",
        "total_wards": 255,
        "reports_submitted": 210,
        "submission_rate": 82.35
      },
      {
        "month": "2025-11",
        "total_wards": 255,
        "reports_submitted": 195,
        "submission_rate": 76.47
      },
      {
        "month": "2025-12",
        "total_wards": 255,
        "reports_submitted": 188,
        "submission_rate": 73.73
      },
      {
        "month": "2026-01",
        "total_wards": 255,
        "reports_submitted": 198,
        "submission_rate": 77.65
      }
    ]
  }
}
```

---

### POST /analytics/ai-report
Generate AI-assisted summary report.

**Access**: STATE_OFFICIAL

**Request Body** (JSON):
```json
{
  "month": "2026-01",
  "focus_areas": ["performance", "challenges"],
  "lga_ids": [1, 2, 5]
}
```

**Response** (200):
```json
{
  "success": true,
  "data": {
    "report": {
      "generated_at": "2026-01-22T18:00:00Z",
      "month": "2026-01",
      "executive_summary": "State-wide submission rate for January 2026 stands at 77.65%, showing a 3.92% improvement from December 2025. Key challenges identified include road infrastructure issues (45% of reports), water shortage (32%), and budget constraints (28%)...",
      "key_findings": [
        "10 LGAs achieved above 80% submission rate",
        "Road infrastructure remains the top issue across all LGAs",
        "Community engagement increased by 15% compared to last month"
      ],
      "recommendations": [
        "Focus intervention efforts on Soba and Lere LGAs (submission rates below 55%)",
        "Allocate additional resources for road repair projects",
        "Conduct capacity building for LGA coordinators in low-performing areas"
      ],
      "lga_highlights": [
        {
          "lga_name": "Kaduna North",
          "summary": "Excellent performance with 100% submission rate. Notable initiatives include...",
          "status": "EXCELLENT"
        },
        {
          "lga_name": "Soba",
          "summary": "Requires urgent attention. Only 45% submission rate. Coordinator reported...",
          "status": "NEEDS_ATTENTION"
        }
      ]
    }
  }
}
```

**Note**: For demo, this can return mock AI responses. For production, integrate with OpenAI API.

---

## 8. Investigation Notes

### GET /investigations
Get all investigation notes.

**Access**: STATE_OFFICIAL

**Query Parameters**:
- `status` (optional): Filter by status (OPEN, IN_PROGRESS, CLOSED)
- `lga_id` (optional): Filter by LGA
- `priority` (optional): Filter by priority (LOW, MEDIUM, HIGH, URGENT)
- `limit` (optional, default: 20): Number of investigations
- `offset` (optional, default: 0): Pagination offset

**Response** (200):
```json
{
  "success": true,
  "data": {
    "investigations": [
      {
        "id": 5,
        "title": "Low Submission Rate in Zaria",
        "description": "Only 6 out of 13 wards submitted January reports. Need to investigate coordinator effectiveness.",
        "investigation_type": "PERFORMANCE",
        "priority": "HIGH",
        "status": "OPEN",
        "lga": {
          "id": 2,
          "name": "Zaria"
        },
        "ward": null,
        "created_by": {
          "id": 3,
          "full_name": "Dr. Fatima Abdullahi"
        },
        "created_at": "2026-01-22T11:00:00Z",
        "updated_at": "2026-01-22T11:00:00Z"
      }
    ],
    "total": 8,
    "limit": 20,
    "offset": 0
  }
}
```

---

### POST /investigations
Create a new investigation note.

**Access**: STATE_OFFICIAL

**Request Body** (JSON):
```json
{
  "title": "Budget Discrepancy - Chikun",
  "description": "Reported expenditures do not match allocated funds for Q4 2025. Requires detailed audit.",
  "investigation_type": "FINANCIAL",
  "priority": "URGENT",
  "lga_id": 1,
  "ward_id": null
}
```

**Response** (201):
```json
{
  "success": true,
  "data": {
    "id": 6,
    "title": "Budget Discrepancy - Chikun",
    "description": "Reported expenditures do not match allocated funds for Q4 2025. Requires detailed audit.",
    "investigation_type": "FINANCIAL",
    "priority": "URGENT",
    "status": "OPEN",
    "lga_id": 1,
    "ward_id": null,
    "created_by": 3,
    "created_at": "2026-01-22T18:30:00Z"
  },
  "message": "Investigation created successfully"
}
```

---

### GET /investigations/{investigation_id}
Get detailed investigation information.

**Access**: STATE_OFFICIAL

**Response** (200):
```json
{
  "success": true,
  "data": {
    "id": 5,
    "title": "Low Submission Rate in Zaria",
    "description": "Only 6 out of 13 wards submitted January reports. Need to investigate coordinator effectiveness.",
    "investigation_type": "PERFORMANCE",
    "priority": "HIGH",
    "status": "OPEN",
    "lga": {
      "id": 2,
      "name": "Zaria",
      "code": "ZAR",
      "coordinator": {
        "id": 4,
        "full_name": "Musa Ibrahim",
        "email": "coord.zaria@kaduna.gov.ng",
        "phone": "08098765432"
      }
    },
    "ward": null,
    "created_by": {
      "id": 3,
      "full_name": "Dr. Fatima Abdullahi"
    },
    "created_at": "2026-01-22T11:00:00Z",
    "updated_at": "2026-01-22T11:00:00Z",
    "closed_at": null
  }
}
```

---

### PATCH /investigations/{investigation_id}
Update investigation status or details.

**Access**: STATE_OFFICIAL

**Request Body** (JSON):
```json
{
  "status": "IN_PROGRESS",
  "description": "Updated description with new findings..."
}
```

**Response** (200):
```json
{
  "success": true,
  "data": {
    "id": 5,
    "status": "IN_PROGRESS",
    "updated_at": "2026-01-22T19:00:00Z"
  },
  "message": "Investigation updated successfully"
}
```

---

### DELETE /investigations/{investigation_id}
Delete an investigation note.

**Access**: STATE_OFFICIAL

**Response** (204):
No content

---

## 9. Reference Data (Public)

### GET /lgas
Get all LGAs in Kaduna State.

**Access**: All authenticated users

**Response** (200):
```json
{
  "success": true,
  "data": {
    "lgas": [
      {
        "id": 1,
        "name": "Chikun",
        "code": "CHK",
        "num_wards": 12
      },
      {
        "id": 2,
        "name": "Zaria",
        "code": "ZAR",
        "num_wards": 13
      }
    ],
    "total": 23
  }
}
```

---

### GET /lgas/{lga_id}
Get specific LGA details.

**Access**: All authenticated users

**Response** (200):
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Chikun",
    "code": "CHK",
    "population": 372000,
    "num_wards": 12,
    "wards": [
      {
        "id": 1,
        "name": "Barnawa",
        "code": "CHK-BRN"
      },
      {
        "id": 2,
        "name": "Kakau Daji",
        "code": "CHK-KKD"
      }
    ]
  }
}
```

---

### GET /wards/{ward_id}
Get specific ward details.

**Access**: All authenticated users

**Response** (200):
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Barnawa",
    "code": "CHK-BRN",
    "population": 25000,
    "lga": {
      "id": 1,
      "name": "Chikun",
      "code": "CHK"
    }
  }
}
```

---

## 10. Health Check

### GET /health
Check API health status.

**Access**: Public

**Response** (200):
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2026-01-22T20:00:00Z",
    "version": "1.0.0",
    "database": "connected"
  }
}
```

---

## Error Codes Reference

| Error Code | HTTP Status | Description |
|------------|-------------|-------------|
| AUTH_INVALID_CREDENTIALS | 401 | Email or password incorrect |
| AUTH_TOKEN_MISSING | 401 | Authorization header missing |
| AUTH_TOKEN_INVALID | 401 | Token malformed or expired |
| AUTH_INSUFFICIENT_PERMISSIONS | 403 | User role lacks permission for this action |
| VALIDATION_ERROR | 400 | Request validation failed |
| RESOURCE_NOT_FOUND | 404 | Requested resource doesn't exist |
| RESOURCE_ALREADY_EXISTS | 409 | Resource with unique constraint already exists |
| FILE_TOO_LARGE | 413 | Uploaded file exceeds size limit |
| FILE_INVALID_TYPE | 400 | File type not supported |
| REPORT_ALREADY_SUBMITTED | 409 | Report for this ward/month already exists |
| REPORT_CANNOT_UPDATE | 400 | Cannot update report in current status |
| DATABASE_ERROR | 500 | Database operation failed |
| SERVER_ERROR | 500 | Internal server error |

---

## Rate Limiting

For demo purposes, no rate limiting is implemented. For production:

- `100 requests/minute` per user for standard endpoints
- `10 requests/minute` for file uploads
- `5 requests/minute` for AI report generation

---

## CORS Policy

Development:
```
Access-Control-Allow-Origin: http://localhost:5173
Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

---

## File Upload Specifications

### Voice Notes
- **Max Size**: 10 MB
- **Allowed Formats**: mp3, m4a, wav, ogg
- **Storage**: `backend/uploads/voice_notes/{year}/{month}/{filename}`
- **Filename Format**: `ward_{ward_id}_{timestamp}_{random}.{ext}`

---

## API Testing (Development)

FastAPI automatically generates interactive API documentation:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

Use these for testing endpoints without building the frontend first.

---

## WebSocket Endpoints (Future Enhancement)

For real-time notifications (not in MVP):

```
WS /ws/notifications
- Connect with JWT token as query param
- Receive real-time notification events
```

---

**Document Version**: 1.0
**Last Updated**: 2026-01-22
**API Version**: v1
**Base URL**: http://localhost:8000/api
