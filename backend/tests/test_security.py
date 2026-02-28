"""
Security regression suite for the WDC backend.

Coverage:
  1.  Unauthenticated access to every protected route family.
  2.  RBAC on /users/* (STATE_OFFICIAL only).
  3.  RBAC on /analytics/* (STATE_OFFICIAL only).
  4.  RBAC on /investigations/* (STATE_OFFICIAL only).
  5.  IDOR on individual reports (cross-ward WDC, LGA scope, STATE scope).
  6.  IDOR on individual investigations (non-STATE blocked).
  7.  Input validation -- missing/malformed payloads.
  8.  Token tampering -- garbage, empty, fabricated user-id tokens.
  9.  STATE_OFFICIAL self-modification guard in user management.
  10. Error-response shape consistency ({detail: ...}).

Every class uses only fixtures declared in conftest.py.  No custom DB setup.
"""

import pytest
from unittest.mock import patch
from jose import jwt as jose_jwt

from app.config import SECRET_KEY, ALGORITHM


# ---------------------------------------------------------------------------
# 1.  Unauthenticated access
# ---------------------------------------------------------------------------
class TestUnauthenticatedAccess:
    """Every protected route family must reject requests without a token."""

    # seeded_db is pulled in implicitly through the client fixture chain when
    # we need data, but for pure "no token" probes we only need a client with
    # tables created.  Accepting seeded_db explicitly keeps things explicit and
    # consistent with the rest of the suite.

    def test_auth_me(self, client, seeded_db):
        r = client.get("/api/auth/me")
        assert r.status_code in (401, 403)

    def test_profile_me(self, client, seeded_db):
        r = client.get("/api/profile/me")
        assert r.status_code in (401, 403)

    def test_reports_list(self, client, seeded_db):
        r = client.get("/api/reports")
        assert r.status_code in (401, 403)

    def test_notifications(self, client, seeded_db):
        r = client.get("/api/notifications")
        assert r.status_code in (401, 403)

    def test_investigations(self, client, seeded_db):
        r = client.get("/api/investigations")
        assert r.status_code in (401, 403)

    def test_analytics_overview(self, client, seeded_db):
        r = client.get("/api/analytics/overview?month=2026-01")
        assert r.status_code in (401, 403)

    def test_users_summary(self, client, seeded_db):
        r = client.get("/api/users/summary")
        assert r.status_code in (401, 403)

    def test_lgas(self, client, seeded_db):
        r = client.get("/api/lgas")
        assert r.status_code in (401, 403)


# ---------------------------------------------------------------------------
# 2.  RBAC -- User Management  (STATE_OFFICIAL only)
# ---------------------------------------------------------------------------
class TestRBACUserManagement:
    """All /api/users/* endpoints gate on get_state_official."""

    # -- GET /api/users/summary ------------------------------------------

    def test_wdc_cannot_get_summary(self, client, wdc_headers):
        r = client.get("/api/users/summary", headers=wdc_headers)
        assert r.status_code == 403

    def test_lga_cannot_get_summary(self, client, lga_headers):
        r = client.get("/api/users/summary", headers=lga_headers)
        assert r.status_code == 403

    def test_state_can_get_summary(self, client, state_headers):
        r = client.get("/api/users/summary", headers=state_headers)
        assert r.status_code == 200

    # -- PATCH /api/users/{id} --------------------------------------------
    # Target user 3 (wdc@test.com).  Role check fires before body parsing,
    # so an empty JSON body is fine for the 403 assertions.

    def test_wdc_cannot_patch_user(self, client, wdc_headers):
        r = client.patch("/api/users/3", json={}, headers=wdc_headers)
        assert r.status_code == 403

    def test_lga_cannot_patch_user(self, client, lga_headers):
        r = client.patch("/api/users/3", json={}, headers=lga_headers)
        assert r.status_code == 403

    # -- PATCH /api/users/{id}/password ------------------------------------

    def test_wdc_cannot_patch_password(self, client, wdc_headers):
        r = client.patch(
            "/api/users/3/password",
            json={"new_password": "anything1"},
            headers=wdc_headers,
        )
        assert r.status_code == 403

    # -- PATCH /api/users/{id}/access --------------------------------------

    def test_wdc_cannot_patch_access(self, client, wdc_headers):
        r = client.patch(
            "/api/users/3/access",
            json={"is_active": True},
            headers=wdc_headers,
        )
        assert r.status_code == 403

    # -- POST /api/users/assign --------------------------------------------

    def test_wdc_cannot_assign_user(self, client, wdc_headers):
        r = client.post("/api/users/assign", json={}, headers=wdc_headers)
        assert r.status_code == 403


# ---------------------------------------------------------------------------
# 3.  RBAC -- Analytics  (STATE_OFFICIAL only)
# ---------------------------------------------------------------------------
class TestRBACAnalytics:
    """All /api/analytics/* endpoints gate on get_state_official."""

    def test_wdc_cannot_get_overview(self, client, wdc_headers):
        r = client.get(
            "/api/analytics/overview?month=2026-01", headers=wdc_headers
        )
        assert r.status_code == 403

    def test_lga_cannot_get_overview(self, client, lga_headers):
        r = client.get(
            "/api/analytics/overview?month=2026-01", headers=lga_headers
        )
        assert r.status_code == 403

    def test_wdc_cannot_get_lga_comparison(self, client, wdc_headers):
        r = client.get(
            "/api/analytics/lga-comparison?month=2026-01", headers=wdc_headers
        )
        assert r.status_code == 403

    def test_wdc_cannot_get_trends(self, client, wdc_headers):
        r = client.get(
            "/api/analytics/trends?start_month=2025-12&end_month=2026-01",
            headers=wdc_headers,
        )
        assert r.status_code == 403

    def test_wdc_cannot_post_ai_report(self, client, wdc_headers):
        r = client.post(
            "/api/analytics/ai-report",
            json={"month": "2026-01"},
            headers=wdc_headers,
        )
        assert r.status_code == 403


# ---------------------------------------------------------------------------
# 4.  RBAC -- Investigations  (STATE_OFFICIAL only)
# ---------------------------------------------------------------------------
class TestRBACInvestigations:
    """All /api/investigations/* endpoints gate on get_state_official."""

    def test_wdc_cannot_list_investigations(self, client, wdc_headers):
        r = client.get("/api/investigations", headers=wdc_headers)
        assert r.status_code == 403

    def test_lga_cannot_list_investigations(self, client, lga_headers):
        r = client.get("/api/investigations", headers=lga_headers)
        assert r.status_code == 403

    def test_wdc_cannot_create_investigation(self, client, wdc_headers):
        r = client.post(
            "/api/investigations",
            json={"title": "t", "description": "d"},
            headers=wdc_headers,
        )
        assert r.status_code == 403

    def test_lga_cannot_create_investigation(self, client, lga_headers):
        r = client.post(
            "/api/investigations",
            json={"title": "t", "description": "d"},
            headers=lga_headers,
        )
        assert r.status_code == 403


# ---------------------------------------------------------------------------
# 5.  IDOR -- Reports  (object-level access)
# ---------------------------------------------------------------------------
class TestIDORReports:
    """
    wdc  -> ward 1 (LGA 1, Birnin Gwari)
    wdc2 -> ward 3 (LGA 2, Chikun)
    lga  -> LGA 1 coordinator

    A report created by wdc lives in ward 1 / LGA 1.
    """

    @pytest.fixture(autouse=True)
    def _mock_validate(self):
        with patch(
            "app.routers.reports.validate_report_month", return_value=(True, "")
        ):
            yield

    @pytest.fixture()
    def ward1_report_id(self, client, wdc_headers):
        """Submit a report as wdc (ward 1) and return its id."""
        r = client.post(
            "/api/reports",
            data={"report_month": "2026-01", "meetings_held": "1"},
            headers=wdc_headers,
        )
        assert r.status_code == 201
        return r.json()["id"]

    def test_wdc2_cannot_read_ward1_report(
        self, client, wdc2_headers, ward1_report_id
    ):
        """Cross-ward read must be denied for WDC_SECRETARY."""
        r = client.get(
            f"/api/reports/{ward1_report_id}", headers=wdc2_headers
        )
        assert r.status_code == 403

    def test_lga_can_read_report_in_own_lga(
        self, client, lga_headers, ward1_report_id
    ):
        """LGA coordinator for LGA 1 may read ward 1 reports."""
        r = client.get(
            f"/api/reports/{ward1_report_id}", headers=lga_headers
        )
        assert r.status_code == 200

    def test_state_can_read_any_report(
        self, client, state_headers, ward1_report_id
    ):
        """STATE_OFFICIAL has no object-level restriction on reports."""
        r = client.get(
            f"/api/reports/{ward1_report_id}", headers=state_headers
        )
        assert r.status_code == 200


# ---------------------------------------------------------------------------
# 6.  IDOR -- Investigations  (only STATE_OFFICIAL can touch them at all)
# ---------------------------------------------------------------------------
class TestIDORInvestigations:
    """
    STATE creates an investigation.  Non-STATE roles cannot retrieve it
    because get_state_official fires before the DB lookup.
    """

    @pytest.fixture()
    def investigation_id(self, client, state_headers):
        r = client.post(
            "/api/investigations",
            json={
                "title": "Security audit",
                "description": "Routine check",
                "lga_id": 1,
            },
            headers=state_headers,
        )
        assert r.status_code == 201
        return r.json()["data"]["id"]

    def test_wdc_cannot_read_investigation(
        self, client, wdc_headers, investigation_id
    ):
        r = client.get(
            f"/api/investigations/{investigation_id}", headers=wdc_headers
        )
        assert r.status_code == 403

    def test_lga_cannot_read_investigation(
        self, client, lga_headers, investigation_id
    ):
        r = client.get(
            f"/api/investigations/{investigation_id}", headers=lga_headers
        )
        assert r.status_code == 403

    def test_state_can_read_investigation(
        self, client, state_headers, investigation_id
    ):
        r = client.get(
            f"/api/investigations/{investigation_id}", headers=state_headers
        )
        assert r.status_code == 200


# ---------------------------------------------------------------------------
# 7.  Input validation
# ---------------------------------------------------------------------------
class TestInputValidation:
    """Malformed or incomplete payloads must be rejected with 422."""

    # -- POST /api/auth/login ----------------------------------------------
    # LoginRequest requires both email (EmailStr) and password.

    def test_login_missing_email(self, client, seeded_db):
        r = client.post("/api/auth/login", json={"password": "Test123!@#"})
        assert r.status_code == 422

    def test_login_missing_password(self, client, seeded_db):
        r = client.post(
            "/api/auth/login", json={"email": "state@test.com"}
        )
        assert r.status_code == 422

    def test_login_empty_body(self, client, seeded_db):
        r = client.post("/api/auth/login", json={})
        assert r.status_code == 422

    # -- POST /api/investigations ------------------------------------------
    # InvestigationNoteCreate: title (str, required), description (str, required),
    # investigation_type (enum, default GENERAL), priority (enum, default MEDIUM).

    def test_investigation_missing_description(self, client, state_headers):
        """Only title supplied -- description is required."""
        r = client.post(
            "/api/investigations",
            json={"title": "x"},
            headers=state_headers,
        )
        assert r.status_code == 422

    def test_investigation_invalid_type(self, client, state_headers):
        r = client.post(
            "/api/investigations",
            json={
                "title": "x",
                "description": "y",
                "investigation_type": "NOT_A_REAL_TYPE",
            },
            headers=state_headers,
        )
        assert r.status_code == 422

    def test_investigation_invalid_priority(self, client, state_headers):
        r = client.post(
            "/api/investigations",
            json={
                "title": "x",
                "description": "y",
                "priority": "CRITICAL",  # not in enum
            },
            headers=state_headers,
        )
        assert r.status_code == 422

    # -- PATCH /api/profile/me ---------------------------------------------
    # ProfileUpdateRequest.phone validator: ^(\+234|0)[789]\d{9}$

    def test_profile_invalid_phone(self, client, wdc_headers):
        r = client.patch(
            "/api/profile/me",
            json={"phone": "not-a-phone"},
            headers=wdc_headers,
        )
        assert r.status_code == 422


# ---------------------------------------------------------------------------
# 8.  Token security
# ---------------------------------------------------------------------------
class TestTokenSecurity:
    """Garbage, empty, and fabricated tokens must not grant access."""

    def test_garbage_token(self, client, seeded_db):
        headers = {"Authorization": "Bearer garbage123"}
        r = client.get("/api/auth/me", headers=headers)
        assert r.status_code == 401

    def test_empty_bearer_value(self, client, seeded_db):
        # "Bearer " with nothing after the space -- HTTPBearer rejects this.
        headers = {"Authorization": "Bearer "}
        r = client.get("/api/auth/me", headers=headers)
        assert r.status_code in (401, 403)

    def test_no_authorization_header(self, client, seeded_db):
        # Completely absent header.
        r = client.get("/api/auth/me")
        assert r.status_code in (401, 403)

    def test_fabricated_token_nonexistent_user(self, client, seeded_db):
        """
        A structurally valid JWT signed with the real SECRET_KEY but referencing
        a user_id that does not exist in the database.  verify_token will decode
        successfully; get_current_user will then raise 401 ("User not found").
        """
        payload = {
            "user_id": 9999,
            "email": "ghost@test.com",
            "role": "STATE_OFFICIAL",
        }
        token = jose_jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
        headers = {"Authorization": f"Bearer {token}"}
        r = client.get("/api/auth/me", headers=headers)
        assert r.status_code == 401


# ---------------------------------------------------------------------------
# 9.  STATE_OFFICIAL self-modification guard
# ---------------------------------------------------------------------------
class TestStateCannotModifyItself:
    """
    The /api/users/{user_id} family explicitly blocks modifications when the
    target user's role is STATE_OFFICIAL.  User id=1 is the STATE_OFFICIAL
    in seed data.
    """

    def test_state_cannot_patch_own_profile(self, client, state_headers):
        r = client.patch(
            "/api/users/1",
            json={"full_name": "New Name"},
            headers=state_headers,
        )
        assert r.status_code == 403

    def test_state_cannot_patch_own_password(self, client, state_headers):
        r = client.patch(
            "/api/users/1/password",
            json={"new_password": "NewPass1!"},
            headers=state_headers,
        )
        assert r.status_code == 403

    def test_state_cannot_patch_own_access(self, client, state_headers):
        r = client.patch(
            "/api/users/1/access",
            json={"is_active": False},
            headers=state_headers,
        )
        assert r.status_code == 403


# ---------------------------------------------------------------------------
# 10.  Error-response shape consistency
# ---------------------------------------------------------------------------
class TestErrorFormatConsistency:
    """
    FastAPI and the application both produce {"detail": ...} for errors.
    Confirm the key is present in 401 / 403 / 404 / 422 responses.
    """

    @pytest.fixture(autouse=True)
    def _mock_validate(self):
        with patch(
            "app.routers.reports.validate_report_month", return_value=(True, "")
        ):
            yield

    def test_wrong_password_has_detail(self, client, seeded_db):
        r = client.post(
            "/api/auth/login",
            json={"email": "state@test.com", "password": "WrongPassword1"},
        )
        assert r.status_code == 401
        assert "detail" in r.json()

    def test_report_not_found_has_detail(self, client, wdc_headers):
        """
        GET a report that does not exist.  The router returns 404 with detail
        before any ward-ownership check can run.
        """
        r = client.get("/api/reports/9999", headers=wdc_headers)
        assert r.status_code == 404
        assert "detail" in r.json()

    def test_investigation_bad_body_has_detail(self, client, state_headers):
        r = client.post(
            "/api/investigations",
            json={"title": "only-title"},  # missing description
            headers=state_headers,
        )
        assert r.status_code == 422
        assert "detail" in r.json()

    def test_users_summary_forbidden_has_detail(self, client, wdc_headers):
        r = client.get("/api/users/summary", headers=wdc_headers)
        assert r.status_code == 403
        assert "detail" in r.json()
