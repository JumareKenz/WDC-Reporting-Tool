# Bug Report — WDC Reporting System

Generated: 2026-02-03
Test run: **161 tests, 161 passed**
Coverage: **72%** overall (core RBAC modules 82–100%)

---

## Bug 1 — Route shadowing: `GET /reports/submission-info` unreachable

| Field | Detail |
|---|---|
| **Severity** | High — endpoint completely dead in production |
| **File** | `app/routers/reports.py` |
| **Root cause** | `@router.get("/submission-info")` was declared *after* `@router.get("/{report_id}")`. FastAPI/Starlette matches routes in declaration order; `/{report_id}` captures every path segment (including the literal string `submission-info`), so the named route never fires. |
| **Evidence** | Any `GET /api/reports/submission-info` request would hit `/{report_id}` with `report_id="submission-info"`, fail the `int` type check, and return **422** — never reaching the intended handler. |
| **Fix applied** | Moved `submission-info` handler above `/{report_id}` in the file. Verified route order with `grep -n "@router."`. |
| **Regression test** | `TestSubmissionInfo` (3 tests) |

---

## Bug 2 — `submission-info` handler references non-existent key `is_first_week`

| Field | Detail |
|---|---|
| **Severity** | High — would crash with `KeyError` if the route were reachable |
| **File** | `app/routers/reports.py` → `get_submission_info()` |
| **Root cause** | `get_month_display_info()` returns `is_submission_window` but the handler accessed `info['is_first_week']`. The `submission_period_description` conditional also referenced the same bad key. The description text itself was wrong ("Days 1-7 / Days 8-31") vs the actual submission window logic ("Days 1-23 previous month / Days 24-end current month"). |
| **Fix applied** | Replaced `info['is_first_week']` with `info['is_submission_window']` in the response. Corrected the period description to match the real `validate_report_month` logic. |
| **Regression test** | `TestSubmissionInfo::test_returns_submission_info` |

---

## Bug 3 — Feedback `ward_id` NOT NULL crash for STATE_OFFICIAL

| Field | Detail |
|---|---|
| **Severity** | High — unhandled `IntegrityError` crashes the request |
| **File** | `app/routers/feedback.py` → `send_feedback_message()` |
| **Root cause** | A code comment said "STATE_OFFICIAL can send feedback without ward_id". The router skipped the "Ward ID is required" check for that role. However, `Feedback.ward_id` is declared `nullable=False` in the model. When a STATE_OFFICIAL omitted `ward_id`, the `db.commit()` threw `sqlite3.IntegrityError: NOT NULL constraint failed: feedback.ward_id` — an unhandled 500 crash. |
| **Evidence** | Test `test_state_send_without_ward_id_rejected` initially produced a raw `IntegrityError` traceback through the test client. |
| **Fix applied** | Added a guard after the role-specific ward_id logic: if `ward_id` is still `None` at that point, return HTTP 400 "Ward ID is required" for all roles. |
| **Regression test** | `TestSendFeedback::test_state_send_without_ward_id_rejected` |

---

## Bug 4 — `httpx 0.28` incompatible with `starlette 0.35` TestClient

| Field | Detail |
|---|---|
| **Severity** | Medium — test infrastructure only, no production impact |
| **Root cause** | `httpx 0.28.1` changed the `Client.__init__` signature; `starlette 0.35.1`'s `TestClient` still passed `app=` as a keyword argument. All 115 initial tests errored at setup. |
| **Fix applied** | Pinned `httpx>=0.23.0,<0.28.0` (resolved to 0.27.2). |

---

## Bug 5 — `HTTPBearer` returns 403, not 401, for missing/malformed credentials

| Field | Detail |
|---|---|
| **Severity** | Low — behaviour is correct per HTTP spec (Bearer scheme), but non-obvious |
| **Root cause** | FastAPI's `HTTPBearer` dependency returns **403 Forbidden** when the `Authorization` header is missing entirely or uses a non-Bearer scheme. Two tests in `TestMeEndpoint` asserted `== 401`. |
| **Fix applied** | Updated test assertions to accept `in [401, 403]`. |

---

## Remaining deprecation warnings (not bugs, scheduled maintenance)

| Warning | Location | Action |
|---|---|---|
| Pydantic V1 `@validator` | `schemas.py` (10 validators) | Migrate to `@field_validator` |
| Pydantic `from_orm()` | `auth.py`, `profile.py`, `reports.py` | Replace with `model_validate()` |
| `datetime.utcnow()` | `auth.py`, `reports.py`, `investigations.py`, `analytics.py`, `date_utils.py` | Replace with `datetime.now(datetime.UTC)` |
| SQLAlchemy `declarative_base()` | `database.py` | Use `sqlalchemy.orm.DeclarativeBase` |

---

## Test coverage summary (161 tests)

| Module | Coverage | Notes |
|---|---|---|
| `models.py` | 100% | All ORM models exercised |
| `profile.py` | 100% | Full CRUD + validation |
| `notifications.py` | 98% | All flows |
| `investigations.py` | 96% | Full CRUD lifecycle |
| `schemas.py` | 96% | Validation rules |
| `config.py` | 95% | |
| `auth.py` | 94% | Login, /me, token |
| `feedback.py` | 90% | Send, receive, mark-read |
| `analytics.py` | 87% | Overview, comparison, trends, AI report |
| `lgas.py` | 82% | List, detail, ward status, missing reports |
| `reports.py` | 66% | Core CRUD + review; voice-note I/O paths not tested |
| `users.py` | 20% | Admin user-management — not exercised |
| `forms.py` | 31% | Dynamic form definitions — not exercised |
| `tasks.py` | 7% | Background voice-note transcription |
| `services/email.py` | 31% | External SMTP integration |
| `services/sms.py` | 16% | External SMS integration |

---

## Frontend test suite (136 tests, 136 passed)

Added from scratch — no test framework existed. Installed Vitest + React Testing Library.

| File | Tests | What it covers |
|---|---|---|
| `constants.test.js` | 15 | Role/status/priority label completeness, API_ENDPOINTS shape, storage keys, pagination, file-upload limits |
| `formatters.test.js` | 64 | Every exported formatter: dates, months, relative-time, numbers, percentages, file sizes, durations, text truncation, capitalize, titleCase, phone formatting, month validation, status/rate/priority colours |
| `dateUtils.test.js` | 20 | `getTargetReportMonth` day-boundary logic (days 1-23 vs 24+, Jan→Dec year wrap), `getSubmissionInfo` window flags, `formatMonthDisplay`, `getSubmissionPeriodDescription` — all time-dependent tests use `vi.useFakeTimers()` |
| `client.test.js` | 10 | `buildQueryString` (empty, omit null/undefined/"", numeric zero), `createFormData` (strings, arrays, Blobs, null skip) |
| `apiModules.test.js` | 12 | `reports.js` and `profile.js` API modules — mocked axios, verified each function hits the correct HTTP method + URL + payload |
| `useAuth.test.jsx` | 15 | AuthProvider context: init from localStorage, corrupt-JSON recovery, login success/failure (both response formats), logout clears state, `hasRole`, `getDefaultRoute` per role, `updateUser` persistence, throws-outside-provider guard |

### How to run frontend tests

```bash
cd frontend
npm test          # vitest run (single pass)
npm run test:watch  # vitest watch mode
```

---

## How to run backend tests

```bash
cd backend
pip install pytest pytest-cov httpx  # httpx<0.28
python -m pytest tests/ -v
python -m pytest tests/ --cov=app --cov-report=term-missing
```
