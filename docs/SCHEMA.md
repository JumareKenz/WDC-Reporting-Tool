# Database Schema - KADUNA STATE WDC System

## Overview

This schema is optimized for SQLite demo deployment with clear relationships and minimal complexity. All tables use auto-incrementing integer primary keys for simplicity.

## Entity Relationship Diagram (Text-Based)

```
┌─────────────┐
│    users    │
└──────┬──────┘
       │
       │ (1:1 for WDC_SECRETARY)
       ├──────────────────────────┐
       │                          │
       │ (1:1 for LGA_COORDINATOR)│
       ├──────────────────────────┤
       │                          │
       ▼                          ▼
┌─────────────┐          ┌─────────────┐
│    wards    │          │    lgas     │
└──────┬──────┘          └──────┬──────┘
       │                        │
       │ (1:N)                  │ (1:N)
       │                        │
       ▼                        ▼
┌─────────────┐          ┌─────────────┐
│   reports   │          │    wards    │
└──────┬──────┘          └─────────────┘
       │
       │ (1:N)
       ▼
┌──────────────┐
│ voice_notes  │
└──────────────┘

┌──────────────────┐
│  notifications   │  (linked to users)
└──────────────────┘

┌──────────────────┐
│    feedback      │  (linked to users + wards)
└──────────────────┘

┌──────────────────┐
│ investigation_   │  (linked to wards/lgas)
│     notes        │
└──────────────────┘
```

---

## Table Definitions

### 1. lgas (Local Government Areas)

Stores the 23 LGAs in Kaduna State.

```sql
CREATE TABLE lgas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(20) NOT NULL UNIQUE,
    population INTEGER,
    num_wards INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | INTEGER | PK, AUTO | Unique LGA identifier |
| name | VARCHAR(100) | NOT NULL, UNIQUE | LGA name (e.g., "Chikun", "Zaria") |
| code | VARCHAR(20) | NOT NULL, UNIQUE | Short code (e.g., "CHK", "ZAR") |
| population | INTEGER | NULL | LGA population (for analytics) |
| num_wards | INTEGER | DEFAULT 0 | Total wards in this LGA |
| created_at | DATETIME | DEFAULT NOW | Record creation timestamp |

**Sample Data**:
```sql
INSERT INTO lgas (name, code, population, num_wards) VALUES
('Chikun', 'CHK', 372000, 12),
('Zaria', 'ZAR', 408000, 13),
('Kaduna North', 'KDN', 364000, 11),
('Kaduna South', 'KDS', 402000, 15);
-- ... 19 more LGAs
```

---

### 2. wards

Stores all wards across the 23 LGAs.

```sql
CREATE TABLE wards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lga_id INTEGER NOT NULL,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) NOT NULL,
    population INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lga_id) REFERENCES lgas(id) ON DELETE CASCADE,
    UNIQUE(lga_id, name)
);
```

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | INTEGER | PK, AUTO | Unique ward identifier |
| lga_id | INTEGER | FK, NOT NULL | Reference to parent LGA |
| name | VARCHAR(100) | NOT NULL | Ward name (e.g., "Barnawa") |
| code | VARCHAR(20) | NOT NULL | Ward code (e.g., "CHK-BRN") |
| population | INTEGER | NULL | Ward population |
| created_at | DATETIME | DEFAULT NOW | Record creation timestamp |

**Composite Unique**: (lga_id, name)

**Sample Data**:
```sql
INSERT INTO wards (lga_id, name, code, population) VALUES
(1, 'Barnawa', 'CHK-BRN', 25000),
(1, 'Kakau Daji', 'CHK-KKD', 18000),
(2, 'Sabon Gari', 'ZAR-SBG', 32000),
(2, 'Tudun Wada', 'ZAR-TWD', 28000);
-- ... more wards
```

---

### 3. users

Stores all system users with role-based access.

```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(20),
    role VARCHAR(50) NOT NULL,
    ward_id INTEGER,
    lga_id INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME,
    FOREIGN KEY (ward_id) REFERENCES wards(id) ON DELETE SET NULL,
    FOREIGN KEY (lga_id) REFERENCES lgas(id) ON DELETE SET NULL,
    CHECK (role IN ('WDC_SECRETARY', 'LGA_COORDINATOR', 'STATE_OFFICIAL'))
);
```

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | INTEGER | PK, AUTO | Unique user identifier |
| email | VARCHAR(255) | NOT NULL, UNIQUE | Login email |
| password_hash | VARCHAR(255) | NOT NULL | Bcrypt hashed password |
| full_name | VARCHAR(150) | NOT NULL | User's full name |
| phone | VARCHAR(20) | NULL | Contact number |
| role | VARCHAR(50) | NOT NULL, CHECK | User role (enum) |
| ward_id | INTEGER | FK, NULL | For WDC_SECRETARY role |
| lga_id | INTEGER | FK, NULL | For LGA_COORDINATOR role |
| is_active | BOOLEAN | DEFAULT TRUE | Account status |
| created_at | DATETIME | DEFAULT NOW | Account creation date |
| last_login | DATETIME | NULL | Last successful login |

**Role Logic**:
- `WDC_SECRETARY`: Must have `ward_id`, `lga_id` is NULL
- `LGA_COORDINATOR`: Must have `lga_id`, `ward_id` is NULL
- `STATE_OFFICIAL`: Both `ward_id` and `lga_id` are NULL

**Sample Data**:
```sql
INSERT INTO users (email, password_hash, full_name, phone, role, ward_id, lga_id) VALUES
('wdc.chikun.barnawa@kaduna.gov.ng', '$2b$12$hash...', 'Amina Yusuf', '08012345678', 'WDC_SECRETARY', 1, NULL),
('coord.chikun@kaduna.gov.ng', '$2b$12$hash...', 'Ibrahim Suleiman', '08098765432', 'LGA_COORDINATOR', NULL, 1),
('state.admin@kaduna.gov.ng', '$2b$12$hash...', 'Dr. Fatima Abdullahi', '08055555555', 'STATE_OFFICIAL', NULL, NULL);
```

---

### 4. reports

Monthly activity reports submitted by WDC Secretaries.

```sql
CREATE TABLE reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ward_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    report_month VARCHAR(7) NOT NULL,

    -- Form fields
    meetings_held INTEGER DEFAULT 0,
    attendees_count INTEGER DEFAULT 0,
    issues_identified TEXT,
    actions_taken TEXT,
    challenges TEXT,
    recommendations TEXT,
    additional_notes TEXT,

    -- Metadata
    status VARCHAR(20) DEFAULT 'SUBMITTED',
    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    reviewed_by INTEGER,
    reviewed_at DATETIME,

    FOREIGN KEY (ward_id) REFERENCES wards(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
    CHECK (status IN ('DRAFT', 'SUBMITTED', 'REVIEWED', 'FLAGGED')),
    UNIQUE(ward_id, report_month)
);
```

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | INTEGER | PK, AUTO | Unique report identifier |
| ward_id | INTEGER | FK, NOT NULL | Ward this report is for |
| user_id | INTEGER | FK, NOT NULL | WDC Secretary who submitted |
| report_month | VARCHAR(7) | NOT NULL | Format: "YYYY-MM" (e.g., "2026-01") |
| meetings_held | INTEGER | DEFAULT 0 | Number of meetings held |
| attendees_count | INTEGER | DEFAULT 0 | Total attendees across meetings |
| issues_identified | TEXT | NULL | Issues found in the ward |
| actions_taken | TEXT | NULL | Actions taken by WDC |
| challenges | TEXT | NULL | Challenges faced |
| recommendations | TEXT | NULL | Recommendations for improvement |
| additional_notes | TEXT | NULL | Any other information |
| status | VARCHAR(20) | DEFAULT 'SUBMITTED' | Report status (enum) |
| submitted_at | DATETIME | DEFAULT NOW | Submission timestamp |
| reviewed_by | INTEGER | FK, NULL | LGA Coordinator who reviewed |
| reviewed_at | DATETIME | NULL | Review timestamp |

**Composite Unique**: (ward_id, report_month) - One report per ward per month

**Sample Data**:
```sql
INSERT INTO reports (ward_id, user_id, report_month, meetings_held, attendees_count, issues_identified, actions_taken, status) VALUES
(1, 1, '2026-01', 3, 150, 'Road repairs needed on Main St', 'Reported to LGA', 'SUBMITTED'),
(2, 2, '2026-01', 2, 80, 'Water shortage in northern area', 'Organized community meeting', 'REVIEWED');
```

---

### 5. voice_notes

Audio files attached to reports.

```sql
CREATE TABLE voice_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_id INTEGER NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INTEGER,
    duration_seconds INTEGER,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE
);
```

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | INTEGER | PK, AUTO | Unique voice note identifier |
| report_id | INTEGER | FK, NOT NULL | Associated report |
| file_name | VARCHAR(255) | NOT NULL | Original filename |
| file_path | VARCHAR(500) | NOT NULL | Storage path (relative or absolute) |
| file_size | INTEGER | NULL | File size in bytes |
| duration_seconds | INTEGER | NULL | Audio duration (if available) |
| uploaded_at | DATETIME | DEFAULT NOW | Upload timestamp |

**Sample Data**:
```sql
INSERT INTO voice_notes (report_id, file_name, file_path, file_size, duration_seconds) VALUES
(1, 'report_jan_2026.mp3', 'uploads/voice_notes/2026/01/ward_1_abc123.mp3', 524288, 120),
(2, 'additional_context.m4a', 'uploads/voice_notes/2026/01/ward_2_def456.m4a', 312000, 90);
```

---

### 6. notifications

System notifications for users (especially LGA Coordinators and WDC Secretaries).

```sql
CREATE TABLE notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recipient_id INTEGER NOT NULL,
    sender_id INTEGER,
    notification_type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    related_entity_type VARCHAR(50),
    related_entity_id INTEGER,
    is_read BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE SET NULL,
    CHECK (notification_type IN ('REPORT_SUBMITTED', 'REPORT_MISSING', 'FEEDBACK', 'SYSTEM', 'REMINDER'))
);
```

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | INTEGER | PK, AUTO | Unique notification identifier |
| recipient_id | INTEGER | FK, NOT NULL | User receiving the notification |
| sender_id | INTEGER | FK, NULL | User who triggered it (can be system) |
| notification_type | VARCHAR(50) | NOT NULL, CHECK | Type of notification (enum) |
| title | VARCHAR(200) | NOT NULL | Notification title |
| message | TEXT | NOT NULL | Notification body |
| related_entity_type | VARCHAR(50) | NULL | Entity type (e.g., "report", "ward") |
| related_entity_id | INTEGER | NULL | Entity ID for linking |
| is_read | BOOLEAN | DEFAULT FALSE | Read status |
| created_at | DATETIME | DEFAULT NOW | Creation timestamp |

**Notification Types**:
- `REPORT_SUBMITTED`: WDC submits report → notify LGA Coordinator
- `REPORT_MISSING`: System reminds WDC of missing report
- `FEEDBACK`: LGA sends feedback → notify WDC
- `SYSTEM`: System-wide announcements
- `REMINDER`: General reminders

**Sample Data**:
```sql
INSERT INTO notifications (recipient_id, sender_id, notification_type, title, message, related_entity_type, related_entity_id) VALUES
(2, NULL, 'REPORT_MISSING', 'Missing Report', 'Ward Kakau Daji has not submitted January 2026 report', 'ward', 2),
(1, 3, 'FEEDBACK', 'Report Reviewed', 'Your January report has been reviewed by LGA Coordinator', 'report', 1);
```

---

### 7. feedback

Chat/feedback system between LGA Coordinators and WDC Secretaries.

```sql
CREATE TABLE feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ward_id INTEGER NOT NULL,
    sender_id INTEGER NOT NULL,
    recipient_id INTEGER,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    parent_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ward_id) REFERENCES wards(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (parent_id) REFERENCES feedback(id) ON DELETE CASCADE
);
```

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | INTEGER | PK, AUTO | Unique message identifier |
| ward_id | INTEGER | FK, NOT NULL | Ward context for the feedback |
| sender_id | INTEGER | FK, NOT NULL | User sending the message |
| recipient_id | INTEGER | FK, NULL | User receiving (optional for broadcast) |
| message | TEXT | NOT NULL | Message content |
| is_read | BOOLEAN | DEFAULT FALSE | Read status |
| parent_id | INTEGER | FK, NULL | For threaded replies |
| created_at | DATETIME | DEFAULT NOW | Message timestamp |

**Usage**:
- LGA Coordinator sends feedback on a specific ward's report
- WDC Secretary can reply
- Mini chat interface in LGA dashboard

**Sample Data**:
```sql
INSERT INTO feedback (ward_id, sender_id, recipient_id, message, parent_id) VALUES
(1, 3, 1, 'Great work on the January report! Please provide more details on the road repair timeline.', NULL),
(1, 1, 3, 'Thank you! The LGA promised to start repairs by end of February.', 1);
```

---

### 8. investigation_notes

State officials track investigations or special attention items.

```sql
CREATE TABLE investigation_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_by INTEGER NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    investigation_type VARCHAR(50) DEFAULT 'GENERAL',
    priority VARCHAR(20) DEFAULT 'MEDIUM',
    status VARCHAR(20) DEFAULT 'OPEN',

    -- Linkage (can be ward or LGA level)
    ward_id INTEGER,
    lga_id INTEGER,

    -- Metadata
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    closed_at DATETIME,

    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (ward_id) REFERENCES wards(id) ON DELETE CASCADE,
    FOREIGN KEY (lga_id) REFERENCES lgas(id) ON DELETE CASCADE,
    CHECK (investigation_type IN ('GENERAL', 'FINANCIAL', 'COMPLIANCE', 'PERFORMANCE', 'COMPLAINT')),
    CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
    CHECK (status IN ('OPEN', 'IN_PROGRESS', 'PENDING', 'CLOSED'))
);
```

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | INTEGER | PK, AUTO | Unique investigation identifier |
| created_by | INTEGER | FK, NOT NULL | State official who created it |
| title | VARCHAR(200) | NOT NULL | Investigation title |
| description | TEXT | NOT NULL | Detailed notes |
| investigation_type | VARCHAR(50) | DEFAULT 'GENERAL' | Type of investigation (enum) |
| priority | VARCHAR(20) | DEFAULT 'MEDIUM' | Priority level (enum) |
| status | VARCHAR(20) | DEFAULT 'OPEN' | Current status (enum) |
| ward_id | INTEGER | FK, NULL | Linked ward (if ward-level) |
| lga_id | INTEGER | FK, NULL | Linked LGA (if LGA-level) |
| created_at | DATETIME | DEFAULT NOW | Creation timestamp |
| updated_at | DATETIME | DEFAULT NOW | Last update timestamp |
| closed_at | DATETIME | NULL | Closure timestamp |

**Sample Data**:
```sql
INSERT INTO investigation_notes (created_by, title, description, investigation_type, priority, status, lga_id) VALUES
(3, 'Low Submission Rate in Zaria', 'Only 6 out of 13 wards submitted January reports. Need to investigate coordinator effectiveness.', 'PERFORMANCE', 'HIGH', 'OPEN', 2),
(3, 'Budget Discrepancy - Chikun', 'Reported expenditures do not match allocated funds for Q4 2025.', 'FINANCIAL', 'URGENT', 'IN_PROGRESS', 1);
```

---

## Indexes (Performance Optimization)

```sql
-- User lookups
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_ward ON users(ward_id);
CREATE INDEX idx_users_lga ON users(lga_id);

-- Report queries
CREATE INDEX idx_reports_ward_month ON reports(ward_id, report_month);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_submitted_at ON reports(submitted_at);

-- Notification queries
CREATE INDEX idx_notifications_recipient ON notifications(recipient_id, is_read);
CREATE INDEX idx_notifications_created ON notifications(created_at);

-- Feedback queries
CREATE INDEX idx_feedback_ward ON feedback(ward_id);
CREATE INDEX idx_feedback_sender ON feedback(sender_id);

-- Investigation queries
CREATE INDEX idx_investigations_status ON investigation_notes(status);
CREATE INDEX idx_investigations_lga ON investigation_notes(lga_id);
CREATE INDEX idx_investigations_ward ON investigation_notes(ward_id);

-- Voice notes
CREATE INDEX idx_voice_notes_report ON voice_notes(report_id);
```

---

## Database Initialization Script

```sql
-- Create all tables in order (respecting foreign key dependencies)
-- 1. lgas (no dependencies)
-- 2. wards (depends on lgas)
-- 3. users (depends on wards, lgas)
-- 4. reports (depends on wards, users)
-- 5. voice_notes (depends on reports)
-- 6. notifications (depends on users)
-- 7. feedback (depends on wards, users)
-- 8. investigation_notes (depends on users, wards, lgas)

-- Then create indexes
-- Then seed demo data
```

---

## Data Constraints and Validation

### Business Rules

1. **One Report Per Ward Per Month**:
   - Enforced by UNIQUE(ward_id, report_month) on reports table

2. **Role-Ward/LGA Assignment**:
   - WDC_SECRETARY must have ward_id (enforced in application logic)
   - LGA_COORDINATOR must have lga_id (enforced in application logic)
   - STATE_OFFICIAL has neither

3. **Report Status Workflow**:
   - DRAFT → SUBMITTED → REVIEWED (or FLAGGED)
   - Enforced in application logic

4. **Voice Notes Optional**:
   - No foreign key constraint from reports to voice_notes
   - A report can have 0 or more voice notes

5. **Notification Auto-Creation**:
   - Trigger in application code when report is submitted
   - Creates notification for LGA Coordinator

---

## Sample Queries

### Get Missing Reports for an LGA (Current Month)

```sql
SELECT w.id, w.name, w.code
FROM wards w
WHERE w.lga_id = ?
  AND w.id NOT IN (
    SELECT r.ward_id
    FROM reports r
    WHERE r.report_month = '2026-01'
  );
```

### Get All Reports for an LGA (with WDC Details)

```sql
SELECT
    r.id,
    r.report_month,
    w.name AS ward_name,
    u.full_name AS secretary_name,
    r.meetings_held,
    r.status,
    r.submitted_at
FROM reports r
JOIN wards w ON r.ward_id = w.id
JOIN users u ON r.user_id = u.id
WHERE w.lga_id = ?
ORDER BY r.submitted_at DESC;
```

### Get Unread Notifications for a User

```sql
SELECT id, notification_type, title, message, created_at
FROM notifications
WHERE recipient_id = ? AND is_read = FALSE
ORDER BY created_at DESC;
```

### State Analytics: Submission Rate by LGA

```sql
SELECT
    l.name AS lga_name,
    l.num_wards,
    COUNT(r.id) AS reports_submitted,
    ROUND(COUNT(r.id) * 100.0 / l.num_wards, 2) AS submission_rate
FROM lgas l
LEFT JOIN wards w ON w.lga_id = l.id
LEFT JOIN reports r ON r.ward_id = w.id AND r.report_month = '2026-01'
GROUP BY l.id, l.name, l.num_wards
ORDER BY submission_rate DESC;
```

---

## Migration Path (Future)

When moving from SQLite to PostgreSQL:

1. Replace `INTEGER PRIMARY KEY AUTOINCREMENT` with `SERIAL PRIMARY KEY`
2. Replace `DATETIME` with `TIMESTAMP`
3. Replace `VARCHAR` with `TEXT` (PostgreSQL optimizes automatically)
4. Add proper foreign key constraints with ON DELETE behaviors
5. Add table partitioning for large tables (reports, notifications)
6. Use PostgreSQL full-text search for report content

---

**Document Version**: 1.0
**Last Updated**: 2026-01-22
**Database Engine**: SQLite 3.x
**ORM**: SQLAlchemy 2.x
