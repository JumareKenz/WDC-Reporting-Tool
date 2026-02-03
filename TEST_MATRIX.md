# API Endpoint Test Matrix

## Authentication Endpoints (`auth.py`)

| Method | Path | Auth | Roles | Request Schema | Response | Failure Modes | Status |
|--------|------|------|-------|----------------|----------|---------------|--------|
| POST | /api/auth/register | No | - | email, password, full_name, phone, role | access_token, user | 400: validation, 409: duplicate email | ⏳ |
| POST | /api/auth/login | No | - | email, password | access_token, token_type, user | 401: invalid credentials | ⏳ |
| GET | /api/auth/me | Yes | All | - | user profile | 401: unauthorized | ⏳ |
| POST | /api/auth/forgot-password | No | - | email | message | 404: user not found | ⏳ |
| POST | /api/auth/reset-password | No | - | token, new_password | message | 400: invalid token | ⏳ |

## Profile Endpoints (`profile.py`)

| Method | Path | Auth | Roles | Request Schema | Response | Failure Modes | Status |
|--------|------|------|-------|----------------|----------|---------------|--------|
| GET | /api/profile/me | Yes | All | - | user profile | 401: unauthorized | ⏳ |
| PATCH | /api/profile/me | Yes | All | full_name?, phone? | updated profile | 400: validation | ⏳ |
| PATCH | /api/profile/email | Yes | STATE_OFFICIAL | email | updated profile | 403: wrong role | ⏳ |
| POST | /api/profile/change-password | Yes | All | current_password, new_password | message | 401: wrong password | ⏳ |

## LGA & Ward Endpoints (`lgas.py`)

| Method | Path | Auth | Roles | Request Schema | Response | Failure Modes | Status |
|--------|------|------|-------|----------------|----------|---------------|--------|
| GET | /api/lgas | Yes | All | - | lgas[], total | 401: unauthorized | ⏳ |
| GET | /api/lgas/:id | Yes | All | - | lga details + wards | 404: not found | ⏳ |
| GET | /api/lgas/:id/wards | Yes | LGA/STATE | month? | wards with status | 403: wrong LGA | ⏳ |
| GET | /api/lgas/:id/missing-reports | Yes | LGA/STATE | month? | missing reports | 403: unauthorized | ⏳ |

## Report Endpoints (`reports.py`)

| Method | Path | Auth | Roles | Request Schema | Response | Failure Modes | Status |
|--------|------|------|-------|----------------|----------|---------------|--------|
| GET | /api/reports/submission-info | Yes | WDC | - | target_month, info | 401: unauthorized | ⏳ |
| GET | /api/reports/submission-status | Yes | WDC | month | submitted, report_id | 401: unauthorized | ⏳ |
| GET | /api/reports/my-reports | Yes | WDC | limit?, offset? | reports[], total | 401: unauthorized | ⏳ |
| POST | /api/reports | Yes | WDC | full report schema | report | 409: duplicate, 422: validation | ⏳ |
| GET | /api/reports/:id | Yes | All | - | report details | 404: not found, 403: no access | ⏳ |
| PATCH | /api/reports/:id | Yes | WDC | partial update | updated report | 403: not owner | ⏳ |
| DELETE | /api/reports/:id | Yes | WDC | - | message | 403: not owner | ⏳ |
| POST | /api/reports/:id/voice-note | Yes | WDC | file | voice_note | 413: file too large | ⏳ |
| GET | /api/reports/:id/voice-note | Yes | All | - | audio file | 404: not found | ⏳ |

## Feedback/Messaging Endpoints (`feedback.py`)

| Method | Path | Auth | Roles | Request Schema | Response | Failure Modes | Status |
|--------|------|------|-------|----------------|----------|---------------|--------|
| GET | /api/feedback | Yes | All | ward_id?, limit?, offset? | messages[], total | 401: unauthorized | ⏳ |
| POST | /api/feedback | Yes | All | ward_id?, message, recipient_type?, parent_id? | message | 400: missing ward_id | ⏳ |
| PATCH | /api/feedback/:id/read | Yes | All | - | message | 403: not recipient | ⏳ |

## Notification Endpoints (`notifications.py`)

| Method | Path | Auth | Roles | Request Schema | Response | Failure Modes | Status |
|--------|------|------|-------|----------------|----------|---------------|--------|
| GET | /api/notifications | Yes | WDC | limit?, offset? | notifications[], total | 401: unauthorized | ⏳ |
| POST | /api/notifications | Yes | LGA/STATE | ward_ids[], type, title, message | success | 400: empty ward_ids | ⏳ |

## Analytics Endpoints (`analytics.py`)

| Method | Path | Auth | Roles | Request Schema | Response | Failure Modes | Status |
|--------|------|------|-------|----------------|----------|---------------|--------|
| GET | /api/analytics/overview | Yes | STATE | month? | summary stats | 401: unauthorized | ⏳ |
| GET | /api/analytics/lga-comparison | Yes | STATE | month?, sort_by?, order? | lgas comparison | 401: unauthorized | ⏳ |
| GET | /api/analytics/trends | Yes | STATE | months? | trends data | 401: unauthorized | ⏳ |
| POST | /api/analytics/generate-report | Yes | STATE | month? | AI report | 401: unauthorized | ⏳ |

## Investigation Endpoints (`investigations.py`)

| Method | Path | Auth | Roles | Request Schema | Response | Failure Modes | Status |
|--------|------|------|-------|----------------|----------|---------------|--------|
| GET | /api/investigations | Yes | STATE | limit?, offset? | investigations[] | 401: unauthorized | ⏳ |
| POST | /api/investigations | Yes | STATE | title, description, priority, lga_id? | investigation | 400: validation | ⏳ |
| PATCH | /api/investigations/:id | Yes | STATE | status?, notes? | updated | 404: not found | ⏳ |

## Form Endpoints (`forms.py`)

| Method | Path | Auth | Roles | Request Schema | Response | Failure Modes | Status |
|--------|------|------|-------|----------------|----------|---------------|--------|
| GET | /api/forms | Yes | STATE | - | forms[] | 401: unauthorized | ⏳ |
| POST | /api/forms | Yes | STATE | form schema | form | 400: validation | ⏳ |
| PATCH | /api/forms/:id | Yes | STATE | partial update | updated form | 404: not found | ⏳ |
| POST | /api/forms/:id/deploy | Yes | STATE | - | success | 404: not found | ⏳ |

## User Management Endpoints (`users.py`)

| Method | Path | Auth | Roles | Request Schema | Response | Failure Modes | Status |
|--------|------|------|-------|----------------|----------|---------------|--------|
| GET | /api/users/summary | Yes | STATE | - | user counts by role | 401: unauthorized | ⏳ |
| GET | /api/users/coordinators/:id | Yes | STATE | - | coordinator details | 404: not found | ⏳ |
| GET | /api/users/secretaries/:id | Yes | STATE/LGA | - | secretary details | 403: wrong LGA | ⏳ |
| PATCH | /api/users/:id | Yes | STATE | update data | updated user | 403: unauthorized | ⏳ |
| POST | /api/users/:id/toggle-access | Yes | STATE | - | updated status | 403: unauthorized | ⏳ |

## Admin Endpoints (`admin_utils.py`)

| Method | Path | Auth | Roles | Request Schema | Response | Failure Modes | Status |
|--------|------|------|-------|----------------|----------|---------------|--------|
| POST | /api/admin/update-state-executive-name | Yes | STATE | - | success message | 403: not state official | ⏳ |
| POST | /api/admin/update-lgas-wards | Yes | STATE | - | lgas/wards updated | 403: not state official | ⏳ |

## Test Legend
- ⏳ Not tested yet
- ✅ Passed all tests
- ⚠️ Passed with warnings
- ❌ Failed - needs fix
- 🔧 Fixed and retested

## Critical User Flows

### Flow 1: WDC Secretary Report Submission
1. Login as WDC Secretary
2. Check submission status for current month
3. Submit new report with all required fields
4. Verify report appears in my-reports
5. View report details
6. Upload voice note (optional)
7. Update report if needed

### Flow 2: LGA Coordinator Monitoring
1. Login as LGA Coordinator
2. View dashboard with ward statistics
3. Check which wards submitted reports
4. Send reminder to missing wards
5. View submitted reports
6. Send message to WDC Secretary

### Flow 3: State Official Analytics
1. Login as State Official
2. View state-wide dashboard
3. Check LGA comparison
4. View submission trends
5. Generate AI report
6. Create investigation for low-performing LGA
7. Send broadcast notification

## Edge Cases to Test

### Authentication
- [ ] Login with non-existent email
- [ ] Login with wrong password
- [ ] Access protected endpoint without token
- [ ] Access with expired token
- [ ] Access with tampered token

### Authorization
- [ ] WDC accessing different ward's reports
- [ ] LGA accessing different LGA's data
- [ ] WDC trying to access state endpoints

### Data Validation
- [ ] Submit report with missing required fields
- [ ] Submit report with invalid data types
- [ ] Submit report with out-of-range values
- [ ] Submit duplicate report for same month
- [ ] Upload file exceeding size limit
- [ ] Upload invalid file type

### Concurrency
- [ ] Multiple users submitting reports simultaneously
- [ ] Updating same report from multiple sessions
- [ ] Reading while writing

### Performance
- [ ] Load dashboard with 255 wards
- [ ] Query reports across all 23 LGAs
- [ ] Generate analytics for 12+ months
- [ ] Handle 50+ concurrent users

## Known Gaps (To Investigate)

1. Rate limiting - not visible in code
2. Input sanitization for XSS
3. SQL injection protection (SQLAlchemy should handle)
4. File upload virus scanning
5. Email verification flow
6. Password reset token expiry
7. Audit logging
8. GDPR/data export
