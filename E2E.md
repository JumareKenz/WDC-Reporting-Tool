# E2E Smoke Tests

Playwright smoke tests that exercise real user flows against a running backend + frontend stack.

## Prerequisites

Both servers must be running:

```bash
# Terminal 1 — backend
cd backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000

# Terminal 2 — frontend (proxies /api → localhost:8000)
cd frontend
npm run dev
```

The backend DB must contain the seeded test users (they are created automatically by the ORM on first request if using SQLite; for a fresh DB just hit `/api/health` first).

## Test users

| Email | Password | Role |
|---|---|---|
| state@test.com | Test123!@# | STATE_OFFICIAL |
| lga@test.com | Test123!@# | LGA_COORDINATOR |
| wdc@test.com | Test123!@# | WDC_SECRETARY |
| wdc2@test.com | Test123!@# | WDC_SECRETARY |

## What is tested (12 tests)

| # | Flow | Method |
|---|---|---|
| 1 | STATE login → lands on `/state` | Browser |
| 2 | LGA login → lands on `/lga` | Browser |
| 3 | WDC login → lands on `/wdc` | Browser |
| 4 | Wrong password → error message, stays on login | Browser |
| 5 | Unauthenticated `/wdc` → redirect to `/login` | Browser |
| 6 | Unauthenticated `/state` → redirect to `/login` | Browser |
| 7 | WDC dashboard shows ward name "Magajin Gari" | Browser |
| 8 | WDC notifications page loads | Browser |
| 9 | STATE notifications page loads | Browser |
| 10 | `/api/health` returns `healthy` | API request |
| 11 | Login API returns valid token + user shape | API request |
| 12 | `/auth/me` returns correct user after login | API request |
| 13 | WDC token rejected on STATE-only `/users/summary` | API request |
| 14 | LGA token rejected on STATE-only `/investigations` | API request |

## How to run

```bash
cd frontend

# Install Playwright browsers (first time only)
npx playwright install

# Headless (default — CI mode)
npm run test:e2e

# Headed (local debugging)
npm run test:e2e:headed
```

## CI

The GitHub Actions workflow (`.github/workflows/ci.yml`) seeds the DB, starts both servers, and runs Playwright headless. Artifacts (screenshots, videos) are uploaded on failure.

## Selector strategy

No `data-testid` attributes were added. Tests use:
- `#email` / `#password` — existing `id` attributes on the login form inputs
- `button[type="submit"]` — the login submit button
- `text=...` — visible text content (Playwright's built-in text matcher)
- Direct URL navigation for route-gating tests

This keeps changes surgical. If selectors become fragile, add `data-testid` at that point.
