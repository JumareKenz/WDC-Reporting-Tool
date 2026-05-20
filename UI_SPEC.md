# KADUNA WDC Digital Reporting System — UI Specification

## Table of Contents
1. [Tech Stack](#tech-stack)
2. [Routes & Access Control](#routes--access-control)
3. [Page Layouts](#page-layouts)
4. [Navigation Structure](#navigation-structure)
5. [Pages & Components](#pages--components)
6. [Report Form (8 Sections)](#report-form-8-sections)
7. [Reusable Components](#reusable-components)
8. [Design System](#design-system)
9. [User Flows](#user-flows)
10. [API Calls](#api-calls)

---

## 1. Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 18 (JSX) |
| Build | Vite 5 |
| Routing | react-router-dom v6 |
| State / Data | @tanstack/react-query v5, React Context |
| HTTP | Axios (custom `apiClient` with interceptors) |
| Styling | TailwindCSS (darkMode: 'media'), custom CSS vars |
| Charts | Recharts (Bar, Line, Pie, Area) |
| Icons | lucide-react |
| Native | Capacitor 6 (Android) |
| PWA | vite-plugin-pwa + Workbox (web only) |
| Auth | JWT access token (in-memory) + refresh token (IndexedDB) |

---

## 2. Routes & Access Control

### Public Routes (redirect to dashboard if authenticated)
| Path | Component | Description |
|------|-----------|-------------|
| `/login` | `Login` | Email/password login + demo credentials |
| `/forgot-password` | `ForgotPassword` | Email-based password reset request |
| `/reset-password` | `ResetPassword` | Token-based password reset form |

### WDC Secretary Routes (`WDC_SECRETARY` role only)
| Path | Component | Description |
|------|-----------|-------------|
| `/wdc` | `WDCDashboard` | Secretary dashboard with stats, submission history |
| `/wdc/submit` | `SubmitReportPage` | Monthly report submission wizard |
| `/wdc/reports` | `MyReportsPage` | View all submitted reports |
| `/wdc/notifications` | `NotificationsPage` | View notifications |
| `/wdc/feedback` | `MessagesPage` | View/send feedback messages |

### LGA Coordinator Routes (`LGA_COORDINATOR` role only)
| Path | Component | Description |
|------|-----------|-------------|
| `/lga` | `LGADashboard` | Ward submission tracking, charts, review |
| `/lga/wards` | `LGAWardsPage` | All wards with submission status |
| `/lga/reports` | `LGAReportsPage` | All reports across wards |
| `/lga/notifications` | `NotificationsPage` | View notifications |
| `/lga/feedback` | `MessagesPage` | Messages to/from ward secretaries |

### State Official Routes (`STATE_OFFICIAL` role only)
| Path | Component | Description |
|------|-----------|-------------|
| `/state` | `StateDashboard` | State-wide overview, AI report gen, investigations |
| `/state/analytics` | `StateAnalyticsPage` | Detailed analytics & trends |
| `/state/submissions` | `StateSubmissionsPage` | All submissions across state |
| `/state/lgas` | `StateLGAsPage` | LGA management |
| `/state/investigations` | `StateInvestigationsPage` | Investigation tracking |
| `/state/forms` | `StateFormsPage` | Dynamic form builder |
| `/state/users` | `StateUsersPage` | User management (assign, password, access) |
| `/state/notifications` | `NotificationsPage` | View notifications |

### Shared Routes (any authenticated user)
| Path | Component | Description |
|------|-----------|-------------|
| `/settings` | `SettingsPage` | Profile, notifications, password |
| `/profile` | `SettingsPage` | Same as settings |
| `/notifications` | `NotificationsPage` | Generic notifications |

### Special Routes
| Path | Behavior |
|------|----------|
| `/` | Redirect to role-based dashboard or `/login` |
| `*` (404) | Inline 404 page with link to dashboard or login |

### Route Guards
- `ProtectedRoute`: requires auth + optional `allowedRoles` array. Shows `LoadingSpinner` during init.
- `PublicRoute`: redirects to dashboard if already authenticated.

---

## 3. Page Layouts

### Authenticated Layout (`Layout.jsx`)
```
┌─────────────────────────────────────────────────────┐
│  Navbar (sticky top, z-40, glassmorphism)            │
│  [Menu toggle] [Logo] ─────── [Dark] [Bell] [User] │
├──────────┬──────────────────────────────────────────┤
│ Sidebar  │  Main Content Area                        │
│ (w-64 or │  (flex-1, min-w-0)                       │
│  w-20    │                                           │
│ collapse)│  {children}                               │
│          │                                           │
│ Nav items│                                           │
│ ─────────│                                           │
│ [AI Chat]│                                           │
│ [Settings]                                           │
│ [Logout] │                                           │
└──────────┴──────────────────────────────────────────┘
```

- **Sidebar**: Collapsible (desktop toggle), slide-out (mobile)
- **Navbar**: Logo, dark mode toggle, notification bell (with red dot), user avatar dropdown
- **User dropdown**: shows name, email, role, ward/LGA; links to Settings; Logout button
- **AI Chat**: Only for `STATE_OFFICIAL` role. Purple gradient button in sidebar footer opens `AIChatInterface` modal.

### Public Layout (Login, ForgotPassword, ResetPassword)
- No sidebar/navbar
- Full-screen dark gradient background (`from-slate-900 via-emerald-950 to-slate-900`)
- Centered glassmorphism card (max-w-md)
- Ambient glow blobs (decorative)

---

## 4. Navigation Structure

### WDC Secretary Sidebar
1. Dashboard (`/wdc`) — LayoutDashboard icon
2. My Reports (`/wdc/reports`) — FileText icon
3. Notifications (`/wdc/notifications`) — Bell icon
4. Messages (`/wdc/feedback`) — MessageSquare icon
5. ---
6. Settings (`/settings`) — Settings icon
7. Logout — LogOut icon (red)

### LGA Coordinator Sidebar
1. Dashboard (`/lga`) — LayoutDashboard icon
2. Wards (`/lga/wards`) — Users icon
3. Reports (`/lga/reports`) — FileText icon
4. Notifications (`/lga/notifications`) — Bell icon
5. Messages (`/lga/feedback`) — MessageSquare icon
6. ---
7. Settings (`/settings`) — Settings icon
8. Logout — LogOut icon (red)

### State Official Sidebar
1. Dashboard (`/state`) — LayoutDashboard icon
2. Analytics (`/state/analytics`) — BarChart3 icon
3. Submissions (`/state/submissions`) — FileText icon
4. LGAs (`/state/lgas`) — Users icon
5. Form Builder (`/state/forms`) — FormInput icon
6. User Management (`/state/users`) — UserCog icon
7. Investigations (`/state/investigations`) — Search icon
8. Notifications (`/state/notifications`) — Bell icon
9. ---
10. Chat with AI (purple gradient button) — Bot + Sparkles icons
11. Settings (`/settings`) — Settings icon
12. Logout — LogOut icon (red)

---

## 5. Pages & Components

### Login Page (`src/pages/Login.jsx`)
- **Fields**: Email (type=email, required), Password (type=password, required)
- **Actions**: Sign In button, Forgot Password link
- **Demo Access**: 3 quick-login buttons (WDC Secretary, LGA Coordinator, State Official)
- **Error display**: Inline alert with dismiss button
- **Loading**: Button shows "Signing in..." with spinner

### Forgot Password Page (`src/pages/ForgotPassword.jsx`)
- **Fields**: Email (type=email, required)
- **Actions**: Send Reset Link, Back to Login
- **Success state**: Shows "Check Your Email" confirmation with timer notice

### WDC Dashboard (`src/pages/WDCDashboard.jsx`)
- **Header**: Gradient banner with ward/LGA name, "Submit Monthly Report" button
- **Status Alert**: Green (submitted) or Yellow (pending) for current month
- **Stats Cards** (4): Current Report status, Total Reports, Meetings Held, Notifications
- **Performance Summary**: 3 metric cards (Reports Reviewed, Avg Attendees, Pending Review)
- **Quick Actions**: Submit Report, View History, View Notifications buttons
- **Submission History**: Table via `SubmissionHistory` component
- **Notifications**: List of recent unread notifications
- **Upcoming**: Deadline card for current month

### LGA Dashboard (`src/pages/LGADashboard.jsx`)
- **Header**: Blue gradient with LGA name, Refresh + Send Reminders buttons
- **Stats Cards** (5): Total Wards, Submitted, Missing, Reviewed, Flagged
- **Charts**: Submission Progress (pie + progress bar), Ward Performance (bar chart)
- **Missing Reports**: Selectable list with Send Reminder button
- **Submitted Reports Table**: Sortable by Ward, Month, Meetings, Attendees, Status; Review action
- **Review Modal**: Shows report details, reviewer notes textarea, Mark Reviewed / Flag buttons
- **Messages Panel**: Send message textarea + recent messages list
- **Notify Modal**: Confirm sending reminders to selected wards

### State Dashboard (`src/pages/StateDashboard.jsx`)
- **Header**: White card with Globe icon, Refresh + Export CSV + Generate AI Report buttons
- **Overview Stats** (6): Total LGAs, Total Wards, Submitted, Missing, Reviewed, Flagged
- **Performance Categories** (4 cards): Excellent ≥90%, Good 70-89%, Needs Attention 50-69%, Critical <50%
- **Charts**: Submission Trends (area chart), Status Distribution (donut)
- **LGA Performance Chart**: Horizontal bar chart (top 10)
- **All LGAs Table**: Sortable columns (Wards, Submitted, Missing, Rate, Status); expandable rows
- **AI Report Panel**: Summary, Key Insights, Recommendations; Copy button
- **Investigations Panel**: Create/Start/Close lifecycle
- **Quick Actions**: AI Report, Export CSV, Form Builder, New Investigation, Update DB buttons
- **Create Investigation Modal**: Title*, Description, Priority dropdown, LGA dropdown

### Settings Page (`src/pages/SettingsPage.jsx`)
- **Tabs**: Profile, Notifications, Security
- **Profile Tab**: Full Name, Email, Phone fields; Save button; read-only Role, Ward, LGA display
- **Notifications Tab**: Toggle switches for email, SMS, report reminders, feedback alerts
- **Security Tab**: Current Password, New Password, Confirm Password; Change Password button

---

## 6. Report Form (8 Sections)

### Component: `WDCReportForm` (`src/components/wdc/WDCReportForm.jsx`)
Each section is a collapsible `FormSection` with numbered badge and icon.

#### Header (always visible, not collapsible)
- **State**: "Kaduna State" (read-only, auto-assigned)
- **LGA**: From user profile (read-only)
- **Ward**: From user profile (read-only)
- **Report Date**: date input (default: today)
- **Report Time**: time input (default: current time)
- **Report Month**: Calculated from `submissionInfo.target_month`

#### Section 1: AGENDA & GOVERNANCE (FileText icon)
| Field | Type | Options/Validation |
|-------|------|-------------------|
| Meeting Type* | Radio | Monthly, Emergency, Quarterly Town Hall |
| Standard Agenda items | 7 Checkboxes | Opening Prayer, Minutes, Action Tracker, Reports, Action Plan, AOB, Closing |

#### Section 2: ACTION TRACKER (CheckCircle icon)
Dynamic table (max 10 rows):
| Column | Type | Placeholder |
|--------|------|-------------|
| Agreed Action Point | textarea | "Enter action..." |
| Status | select | Completed, On-going, Not Started |
| Challenges | textarea | "Any challenges..." |
| Timeline | text | "e.g., 2 weeks" |
| Responsible Person | text | "Name..." |

#### Section 3: REPORT ON HEALTH SYSTEM (Heart icon)
4 sub-sections:

**3A. GENERAL ATTENDANCE**
- OPD Immunization: OPD Total, PENTA1, BCG, PENTA3, MEASLES (all number)
- OPD Under 5: Total, Malaria Under 5, Diarrhea Under 5 (all number)
- ANC: Total, First Visit, Fourth Visit, Eighth Visit (all number)
- Labour & Deliveries: Deliveries, Post-Natal (number)
- Family Planning: Counselling, New Acceptors (number)
- HEP B: Person Tested, Person Tested Positive (number; positive ≤ tested)
- TB: Total Presumptive, Total on Treatment (number)

**3B. Health Facility Support**
- Facilities renovated: By Govt, By Partners, By WDC (3 number fields)
- Items donated by WDC: Count (number) + Type multi-select chips (Hospital beds, Mattresses, Medical equipment, Drugs/Medicines, First aid supplies, Cleaning materials)
- Items donated by Govt: Count (number) + Type multi-select chips (same options)
- Items repaired: Count (number) + Type multi-select chips (Building/Roofing, Plumbing, Electrical, Medical equipment, Furniture, Generator)

**3C. Transportation & Emergency**
- Women transported for ANC (number)
- Women transported for delivery (number)
- Children under 5 with danger signs transported (number)
- Women supported with delivery items (number)

**3D. cMPDSR**
- Maternal Deaths (number)
- Perinatal Deaths (number)
- Causes of maternal deaths (3 text fields)
- Causes of perinatal deaths (3 text fields)

#### Section 4: COMMUNITY INVOLVEMENT & TOWN HALL FEEDBACK (MessageSquare icon)
*Only shown when Meeting Type = "Quarterly Town Hall"*
- Town Hall Conducted: Radio (Yes / No)
- Community Feedback table (5 fixed rows):
  | Indicator (fixed) | Feedback (textarea) | Action Required (textarea) |
  |---|---|---|
  | Health Workers' Attitude | | |
  | Waiting Time | | |
  | Service Charges / Fees | | |
  | Client Satisfaction | | |
  | Others | | |

#### Section 5: REPORTS FROM VDCs (MapPin icon)
Dynamic table (max 10 rows):
| Column | Type | Placeholder |
|--------|------|-------------|
| VDC (Settlement) | text | "VDC name..." |
| Issues | textarea | "Describe issues..." |
| Action Taken / Required | textarea | "Actions..." |

#### Section 6: COMMUNITY MOBILIZATION ACTIVITIES (Users icon)
| Field | Type | Voice Note |
|-------|------|-----------|
| Awareness Creation Theme | text | Yes |
| Traditional Leaders Support Needed | textarea | Yes |
| Religious Leaders Support Needed | textarea | Yes |

#### Section 7: COMMUNITY ACTION PLAN (Calendar icon)
Dynamic table (max 10 rows):
| Column | Type | Placeholder |
|--------|------|-------------|
| Issues Identified | textarea | "Issue..." |
| Actions Agreed | textarea | "Action..." |
| Timeline | text | "Timeline" |
| Responsible Person | text | "Name" |

#### Section 8: SUPPORT REQUIRED & CONCLUSION (AlertTriangle icon)
| Field | Type | Voice Note |
|-------|------|-----------|
| Support Required | textarea (3 rows) | Yes |
| Any Other Business (AOB) | textarea (3 rows) | Yes |
| **Attendance Summary** | | |
| Total | number (min 0) | No |
| Male | number (min 0) | No |
| Female | number (min 0) | No |
| *Validation: Total ≥ Male + Female* | | |
| **Upload Attendance Pictures** | file (image/*, multiple) | No |
| **Upload Group Photo** | file (image/*) | No |
| Adjournment - Date of Next Meeting | date (must be future) | No |
| WDC Chairman Signature | text | No |
| WDC Secretary Signature | text | No |

#### Form Actions (sticky bottom bar)
- **Cancel**: navigates to `/wdc`
- **Save Draft**: saves to localStorage + server (if online)
- **Submit Report** (or "Queue Submission" if offline)

#### Draft Behavior
- Auto-save to localStorage every 1 second (debounced)
- Save on visibility change (tab blur) and beforeunload
- On load: compares local draft vs server draft, uses more recent
- `DraftStatusBar` shows: idle → saving → saved indicators, offline warning, queue stats

---

## 7. Reusable Components

### `Button` (`src/components/common/Button.jsx`)
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| variant | string | 'primary' | primary, secondary, outline, ghost, danger, success |
| size | string | 'md' | sm, md, lg |
| loading | boolean | false | Shows Loader2 spinner |
| disabled | boolean | false | |
| fullWidth | boolean | false | w-full |
| icon | Component | null | Lucide icon component |
| iconPosition | string | 'left' | left or right |
| type | string | 'button' | button, submit |

### `Card` (`src/components/common/Card.jsx`)
| Prop | Type | Description |
|------|------|-------------|
| title | string | Card header title |
| subtitle | string | Sub-heading |
| action | ReactNode | Top-right action area |
| className | string | Additional classes |
| children | ReactNode | Card body |
- Also exports `IconCard` (icon + title + value + subtitle + trend) and `EmptyCard` (icon + title + description + action)

### `Alert` (`src/components/common/Alert.jsx`)
| Prop | Type | Description |
|------|------|-------------|
| type | string | info, success, warning, error |
| title | string | Bold heading |
| message | string | Body text |
| onClose | function | Shows dismiss X if provided |

### `Modal` (`src/components/common/Modal.jsx`)
| Prop | Type | Description |
|------|------|-------------|
| isOpen | boolean | Visibility |
| onClose | function | Close handler |
| title | string | Header text |
| size | string | sm, md, lg |
| children | ReactNode | Modal body |
- Also exports `ConfirmModal` (message, confirmText, variant, loading, onConfirm)

### `LoadingSpinner` (`src/components/common/LoadingSpinner.jsx`)
| Prop | Type | Description |
|------|------|-------------|
| fullScreen | boolean | Centers in viewport |
| size | string | sm, md, lg |
| text | string | Loading message |

### `Tooltip` (`src/components/common/Tooltip.jsx`)
| Prop | Type | Description |
|------|------|-------------|
| text | string | Tooltip content |
| position | string | top, right, bottom, left |

### `Logo` (`src/components/common/Logo.jsx`)
| Prop | Type | Description |
|------|------|-------------|
| size | string | sm, default, xl |
| showText | boolean | Show "KADUNA WDC" text |
| linkTo | string/null | Wrapper link target |

### `OfflineBanner` (`src/components/common/OfflineBanner.jsx`)
- Position: bottom on native, top on web
- Uses `@capacitor/network` for detection
- Shows when offline: "You are offline" with icon

### `RefreshIndicator` (`src/components/common/RefreshIndicator.jsx`)
- Non-blocking pill shown during silent 401 token refresh
- Subscribes via `setRefreshCallbacks(onStart, onEnd)` from client.js

### `PWAInstallPrompt` (`src/components/common/PWAInstallPrompt.jsx`)
- Only mounted on web (`!isNative`)
- Shows install prompt when `beforeinstallprompt` event fires

### `ToastContainer` / `useToast` (`src/components/common/ToastContainer.jsx`, `src/hooks/useToast.jsx`)
- Position: top-right
- Types: success, error, warning, info
- API: `toast.success(msg, opts)`, `emitToast(type, msg, opts)` (outside React)
- Options: `{ title, duration }`

### `SessionWarningModal` (`src/components/common/SessionWarningModal.jsx`)
- Shows when session is about to expire
- Actions: Stay Logged In, Logout

### `DraftStatusBar` (`src/components/wdc/DraftStatusBar.jsx`)
- Shows draft save status (idle/saving/saved/error)
- Shows offline queue stats
- Force Save and Retry Failed actions

### `VoiceRecorder` (`src/components/wdc/VoiceRecorder.jsx`)
- Compact microphone button next to text fields
- Records audio → returns File blob
- Used for AI transcription

### `DynamicTable` (inline in `WDCReportForm.jsx`)
- Desktop: HTML table; Mobile: card layout
- Add Row / Remove Row (min 1, max configurable)
- Supports text, textarea, select column types

### `SubmissionHistory` (`src/components/wdc/SubmissionHistory.jsx`)
- List of past reports with status badges, month, date

### `ReportDetailView` (`src/components/reports/ReportDetailView.jsx`)
- Full read-only view of all 8 report sections

### `FormBuilder` (`src/components/state/FormBuilder.jsx`)
- State officials can create custom forms with fields and conditions

### `AIChatInterface` (`src/components/state/AIChatInterface.jsx`)
- Slide-over chat panel for State Officials
- Connects to AI analytics endpoint

### `ErrorSystem` (`src/components/common/ErrorSystem/index.jsx`)
- `ErrorProvider` context wrapping the app
- Global error boundary

---

## 8. Design System

### Color Palette (TailwindCSS custom theme)
| Token | Usage |
|-------|-------|
| `primary-50` to `primary-900` | Main brand (green/emerald-based) |
| `neutral-50` to `neutral-900` | Text, backgrounds, borders |
| `success-600` | Green for positive states |
| `warning-*` | Amber/yellow for warnings |
| `error-*` | Red for errors |
| `info-*` | Blue for informational |

### Typography
- Font: System font stack (Tailwind default)
- Headings: `text-2xl font-bold` (page), `text-lg font-semibold` (card), `text-sm font-medium` (labels)
- Body: `text-sm` (standard), `text-xs` (captions, help text)

### Spacing
- Page padding: `px-4 sm:px-6 lg:px-8 py-6` or `py-8`
- Card padding: `p-4 sm:p-6`
- Grid gaps: `gap-3 sm:gap-4` (tight), `gap-6` (standard), `gap-8` (sections)
- Form field spacing: `space-y-4` or `space-y-6`

### Border Radius
- Cards: `rounded-xl`
- Buttons: `rounded-lg`
- Inputs: `rounded-lg` or `rounded-xl`
- Avatars: `rounded-full`
- Badges: `rounded-full`

### Shadows
- Cards: `shadow-sm`
- Elevated cards: `shadow-lg`
- Buttons (hover): `hover:shadow-lg`
- Glassmorphism: `backdrop-filter: blur(24px)` + semi-transparent bg

### Dark Mode
- Strategy: `darkMode: 'media'` (follows OS preference)
- CSS variable overrides in `@media (prefers-color-scheme: dark)` in `index.css`
- Glassmorphism dark overrides for sidebar and navbar

### Responsive Breakpoints
- Mobile-first with `sm:` (640px), `md:` (768px), `lg:` (1024px)
- Sidebar hidden on mobile (`hidden lg:block`), slide-out on mobile
- Tables become card stacks on mobile (`hidden sm:block` + `sm:hidden`)
- Grid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` pattern

### Animation
- Transitions: `transition-all duration-200`
- Loading: `animate-spin`, `animate-pulse`
- Card hover: `.card-lift` class (scale + shadow)
- Slide-down: `.animate-slide-down` for dropdown menus

---

## 9. User Flows

### Login Flow
1. User enters email + password (or clicks demo account)
2. POST `/auth/login` → receives `{ access_token, refresh_token, user }`
3. Access token stored in memory, refresh token in IndexedDB
4. Redirect to role-based dashboard (`/wdc`, `/lga`, `/state`)
5. On 401: silent refresh via POST `/auth/refresh` → retry request
6. On refresh failure: toast "Session expired", redirect to `/login`

### Report Submission Flow (WDC Secretary)
1. Navigate to `/wdc/submit`
2. Page checks `GET /reports/submission-info` for target month
3. If already submitted → shows "Already Submitted" card
4. Otherwise loads `WDCReportWizard` (or `WDCReportForm`)
5. Form loads existing draft (localStorage first, then server)
6. User fills 8 sections; auto-save drafts every 1s
7. On Submit (online): POST `/reports` with FormData (report_data JSON + voice notes + photos)
8. On Submit (offline): queued to `wdc_submit_queue`; auto-synced when online
9. Success: toast + navigate to `/wdc`

### Offline Queue Flow
1. Submission added to queue with UUID idempotency key
2. Network listener detects connectivity restoration
3. Queue items processed sequentially with exponential backoff
4. Max 3 retries before marking as failed
5. `DraftStatusBar` shows queue stats; user can retry failed items

### Review Flow (LGA Coordinator)
1. LGA Dashboard shows submitted reports table
2. Click "Review" → opens Review Modal
3. Modal shows report summary + reviewer notes textarea
4. Actions: "Mark Reviewed" (→ REVIEWED) or "Flag Report" (→ FLAGGED)
5. PATCH `/reports/{id}/review` with `{ status, reviewer_notes }`

### State Review Flow (State Official)
1. State Submissions page shows all reports
2. Review actions: Approve (REVIEWED), Decline (DECLINED), Flag (FLAGGED)
3. PATCH `/reports/{id}/review` with `{ action, notes }`

### Send Reminder Flow (LGA Coordinator)
1. Missing reports section shows wards that haven't submitted
2. Select wards (checkboxes) or "Select All"
3. Click "Send Reminders" → confirm modal
4. POST `/notifications/send` with `{ ward_ids, notification_type, title, message }`

### Password Reset Flow
1. Click "Forgot Password?" on login
2. Enter email → POST `/auth/forgot-password?email=...`
3. Success screen: "Check Your Email" with timer notice
4. User clicks link in email → `/reset-password?token=...`
5. Enter new password → POST `/auth/reset-password`

---

## 10. API Calls

Every API call made by the frontend. Base URL: `VITE_API_BASE_URL` (default `http://localhost:8000/api`).

### Authentication
| Method | Endpoint | Request | Response | Used By |
|--------|----------|---------|----------|---------|
| POST | `/auth/login` | `{ email, password }` | `{ data: { access_token, refresh_token, refresh_expires_at, user } }` | Login page |
| POST | `/auth/refresh` | `{ refresh_token }` | `{ data: { access_token, refresh_token, user } }` | Auto-refresh interceptor |
| POST | `/auth/logout` | `{ refresh_token }` + Bearer header | `{ success: true }` | Logout action |
| POST | `/auth/forgot-password?email=X` | (empty body) | `{ success: true }` | ForgotPassword page |
| POST | `/auth/reset-password` | `{ token, new_password }` | `{ success: true }` | ResetPassword page |
| GET | `/auth/me` | Bearer header | `{ data: { user } }` | Token verification |

### Reports
| Method | Endpoint | Request | Response | Used By |
|--------|----------|---------|----------|---------|
| POST | `/reports` | FormData: `report_month`, `report_data` (JSON), `voice_*`, `attendance_picture_*`, `group_photo_*` | `{ data: { id, status, ... } }` | Report submission |
| GET | `/reports?limit=N&offset=N` | Query params | `{ data: { reports: [...], total } }` | MyReportsPage, WDCDashboard |
| GET | `/reports/{id}` | — | `{ data: { ...report } }` | ReportDetailView |
| PUT | `/reports/{id}` | JSON body | `{ data: { ...report } }` | Update report |
| GET | `/reports/check-submitted?month=YYYY-MM` | Query param | `{ data: { submitted: bool } }` | WDCDashboard |
| GET | `/reports/submission-info` | — | `{ data: { target_month, month_name, already_submitted, is_submission_window } }` | SubmitReportPage |
| PATCH | `/reports/{id}/review` | `{ status, reviewer_notes }` or `{ action, notes }` | `{ data: { ...report } }` | LGA/State review |
| GET | `/reports/{id}/ai-suggestions` | — | `{ data: { status, suggestions } }` | AI transcription |
| POST | `/reports/{id}/ai-suggestions/accept` | `{ fields: [...] }` | `{ data: { updated_fields } }` | Accept AI suggestions |
| GET | `/reports/state-submissions?month=X&lga_id=X` | Query params | `{ data: { submissions: [...] } }` | StateSubmissionsPage |

### Drafts
| Method | Endpoint | Request | Response | Used By |
|--------|----------|---------|----------|---------|
| POST | `/reports/draft` | FormData: `report_month`, `report_data`, optional `voice_note` | `{ data: { id, saved_at } }` | Save Draft |
| GET | `/reports/draft/existing?report_month=YYYY-MM` | Query param | `{ has_draft, report_data, saved_at, draft_id }` | Load Draft |
| DELETE | `/reports/draft/{id}` | — | `{ success: true }` | Delete Draft |

### Voice Notes
| Method | Endpoint | Request | Response | Used By |
|--------|----------|---------|----------|---------|
| GET | `/voice-notes/{id}/download` | — | Binary (blob) | Download voice note |
| DELETE | `/voice-notes/{id}` | — | `{ success: true }` | Delete voice note |

### LGA
| Method | Endpoint | Request | Response | Used By |
|--------|----------|---------|----------|---------|
| GET | `/lgas/{id}` | — | `{ data: { id, name, num_wards, ... } }` | LGA details |
| GET | `/lgas/{id}/wards?month=YYYY-MM` | Query param | `{ data: { wards: [...], lga: {...} } }` | LGADashboard |
| GET | `/lgas/{id}/reports?limit=N` | Query params | `{ data: { reports: [...] } }` | LGADashboard |
| GET | `/lgas/{id}/missing-reports?month=YYYY-MM` | Query param | `{ data: { missing: [...] } }` | LGADashboard |
| GET | `/lgas` | — | `{ data: [...lgas] }` | StateDashboard LGA list |

### Notifications
| Method | Endpoint | Request | Response | Used By |
|--------|----------|---------|----------|---------|
| GET | `/notifications?unread_only=true&limit=N` | Query params | `{ data: { notifications: [...] } }` | NotificationsPage, Dashboard |
| PATCH | `/notifications/{id}/read` | — | `{ success: true }` | Mark single as read |
| POST | `/notifications/mark-all-read` | — | `{ success: true }` | Mark all read |
| POST | `/notifications/send` | `{ ward_ids, notification_type, title, message }` | `{ success: true }` | Send reminders |

### Feedback / Messages
| Method | Endpoint | Request | Response | Used By |
|--------|----------|---------|----------|---------|
| GET | `/feedback?limit=N` | Query params | `{ data: { messages: [...] } }` | MessagesPage, LGADashboard |
| POST | `/feedback` | `{ message, recipient_type }` | `{ data: { id, ... } }` | Send message |
| PATCH | `/feedback/{id}/read` | — | `{ success: true }` | Mark read |

### Analytics (State)
| Method | Endpoint | Request | Response | Used By |
|--------|----------|---------|----------|---------|
| GET | `/analytics/overview?month=YYYY-MM` | Query param | `{ data: { total_lgas, total_wards, total_submitted, total_missing, total_reviewed, total_flagged } }` | StateDashboard |
| GET | `/analytics/lga-comparison?month=YYYY-MM` | Query param | `{ data: { lgas: [{ id, name, total_wards, submitted_count, missing_count, reviewed_count, submission_rate, reports }] } }` | StateDashboard |
| GET | `/analytics/trends?months=N` | Query param | `{ data: { trends: [{ month, submission_rate }] } }` | StateDashboard |
| POST | `/analytics/ai-report` | `{ month }` | `{ data: { summary, insights: [...], recommendations: [...] } }` | AI Report generation |

### Investigations
| Method | Endpoint | Request | Response | Used By |
|--------|----------|---------|----------|---------|
| GET | `/investigations?limit=N` | Query params | `{ data: { investigations: [...] } }` | StateDashboard |
| POST | `/investigations` | `{ title, description, priority, lga_id }` | `{ data: { id, ... } }` | Create investigation |
| PATCH | `/investigations/{id}` | `{ status }` | `{ data: { ... } }` | Update status |

### Forms
| Method | Endpoint | Request | Response | Used By |
|--------|----------|---------|----------|---------|
| GET | `/forms/active` | — | `{ data: { id, fields, ... } }` | SubmitReportPage (dynamic form) |
| GET | `/forms?limit=N` | Query params | `{ data: [...forms] }` | StateFormsPage |
| GET | `/forms/{id}` | — | `{ data: { ... } }` | Form detail |
| POST | `/forms` | `{ name, fields, conditions }` | `{ data: { id, ... } }` | Create form |
| PUT | `/forms/{id}` | `{ name, fields, conditions }` | `{ data: { ... } }` | Update form |
| POST | `/forms/{id}/deploy` | — | `{ data: { ... } }` | Deploy form |

### User Management (State)
| Method | Endpoint | Request | Response | Used By |
|--------|----------|---------|----------|---------|
| GET | `/users/summary` | — | `{ data: { ... } }` | StateUsersPage |
| GET | `/users/lga-wards/{lgaId}` | — | `{ data: { wards: [...] } }` | Ward listing for LGA |
| GET | `/users/coordinator/{lgaId}` | — | `{ data: { user } }` | Get LGA coordinator |
| GET | `/users/secretary/{wardId}` | — | `{ data: { user } }` | Get ward secretary |
| PATCH | `/users/{id}` | `{ full_name, email, phone }` | `{ data: { user } }` | Update user |
| PATCH | `/users/{id}/password` | `{ new_password }` | `{ success: true }` | Change password |
| PATCH | `/users/{id}/access` | `{ is_active }` | `{ success: true }` | Enable/disable user |
| POST | `/users/assign` | `{ user_id, ward_id?, lga_id? }` | `{ success: true }` | Assign user to ward/LGA |

### Profile
| Method | Endpoint | Request | Response | Used By |
|--------|----------|---------|----------|---------|
| GET | `/profile/me` | — | `{ data: { user } }` | Settings page |
| PATCH | `/profile/me` | `{ full_name?, phone? }` | `{ data: { user } }` | Update profile |
| PATCH | `/profile/email` | `{ email }` | `{ data: { user } }` | Update email |
| POST | `/profile/change-password` | `{ current_password, new_password }` | `{ success: true }` | Change password |

### Admin (State)
| Method | Endpoint | Request | Response | Used By |
|--------|----------|---------|----------|---------|
| POST | `/admin/update-state-executive-name` | — | `{ old_name, new_name }` | StateDashboard |
| POST | `/admin/update-lgas-wards` | — | `{ lgas: { total }, wards: { total } }` | StateDashboard |

### Health / Version
| Method | Endpoint | Request | Response | Used By |
|--------|----------|---------|----------|---------|
| GET | `/health` | — | `{ status: "ok" }` | Health check |
| GET | `/app/version` | — | `{ version: "X.Y.Z" }` | useAppVersion (native only) |

---

*End of UI Specification*
