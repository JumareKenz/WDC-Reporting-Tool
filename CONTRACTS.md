# Contract Tests

Contract tests prove the frontend and backend agree on endpoint paths, HTTP methods, auth requirements, and response shapes. They run against a real FastAPI `TestClient` with an in-memory seeded DB — no live server needed.

## What is covered

| Contract file | Endpoint | What is validated |
|---|---|---|
| `auth_login.json` | `POST /api/auth/login` | `access_token`, `token_type`, `user` shape (id, email, role, ward/lga nesting) |
| `auth_me.json` | `GET /api/auth/me` | Full user object including conditional `ward` / `lga` objects per role |
| `reports_submit.json` | `POST /api/reports` (201) | Report object: id, ward_id, report_month pattern, status enum |
| `reports_list.json` | `GET /api/reports` | Array of report summary items |
| `reports_detail.json` | `GET /api/reports/{id}` | Report detail with nested `ward` object |
| `reports_check_submitted.json` | `GET /api/reports/check-submitted` | `submitted` (bool), `report_id` (int\|null) |
| `reports_submission_info.json` | `GET /api/reports/submission-info` | Wrapped response: target_month, is_submission_window, already_submitted |
| `analytics_overview.json` | `GET /api/analytics/overview` | Wrapped: state_summary with totals and submission_rate |
| `notifications_list.json` | `GET /api/notifications` | Wrapped: notifications array, total, unread_count |

A meta-test (`TestOpenAPISchemaAvailable`) also confirms FastAPI's `/openapi.json` is accessible and contains the expected paths.

## Schema design decisions

- Schemas do **not** set `additionalProperties: false`. The backend may add fields over time; contracts enforce the *minimum* surface the frontend depends on.
- All schemas use JSON Schema draft-07.
- Union types (`["string", "null"]`) are used where the backend returns `None` for optional fields.

## How to run

```bash
cd backend
pip install pytest httpx jsonschema "httpx>=0.23.0,<0.28.0"
python -m pytest tests/test_contracts.py -v
```

Or from the frontend:

```bash
cd frontend
npm run test:contract
```

## Files

```
backend/
  contracts/                  ← JSON schema definitions
    auth_login.json
    auth_me.json
    reports_submit.json
    reports_list.json
    reports_detail.json
    reports_check_submitted.json
    reports_submission_info.json
    analytics_overview.json
    notifications_list.json
  tests/
    test_contracts.py         ← pytest suite (26 tests)
```
