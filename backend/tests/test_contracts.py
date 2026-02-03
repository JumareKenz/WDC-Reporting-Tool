"""
Contract tests for the WDC Reporting System.

Purpose
-------
Every test in this file loads a JSON Schema from contracts/ and validates a
REAL HTTP response body against it.  If the backend changes the shape of a
response without updating the matching contract the test fails, which is the
entire point of contract testing.

Additionally, a meta-test confirms that FastAPI's auto-generated OpenAPI
descriptor is reachable, giving the frontend a second, machine-readable
source of truth.

Conventions
-----------
* ``load_contract(name)`` reads ``contracts/{name}.json`` relative to the
  backend root directory (one level up from this tests/ directory).
* ``_login(client, email, password)`` is a thin wrapper around the raw POST so
  that individual tests do not need to repeat the request boilerplate.
* Classes that exercise report-submission endpoints carry an ``autouse``
  fixture that patches ``validate_report_month`` to always succeed.  The real
  function rejects any month that does not match today's submission window;
  mocking it lets us use a fixed, deterministic month value.
"""

import json
import os
from unittest.mock import patch

import pytest
from jsonschema import validate

# ---------------------------------------------------------------------------
# Path resolution
# ---------------------------------------------------------------------------
# contracts/ sits one directory above tests/.  Resolve once so every helper
# and test body can reference it without repeating the calculation.
CONTRACTS_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "contracts"
)

# The fixed month used whenever we need to submit a report without the
# real submission-window check interfering.
TARGET_MONTH = "2026-01"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def load_contract(name: str) -> dict:
    """Read and parse a single contract JSON file.

    Parameters
    ----------
    name : str
        Filename *without* the ``.json`` extension, e.g. ``"auth_login"``.

    Returns
    -------
    dict
        Parsed JSON Schema ready to pass to ``jsonschema.validate``.
    """
    path = os.path.join(CONTRACTS_DIR, f"{name}.json")
    with open(path, "r", encoding="utf-8") as fh:
        return json.load(fh)


def _login(client, email: str, password: str) -> dict:
    """POST to /api/auth/login and return the parsed JSON body.

    The caller is responsible for ensuring the database contains the
    requested user before calling this helper.
    """
    response = client.post(
        "/api/auth/login",
        json={"email": email, "password": password},
    )
    assert response.status_code == 200, (
        f"Login failed for {email}: {response.status_code} {response.text}"
    )
    return response.json()


def _submit_report(client, headers, month=TARGET_MONTH):
    """POST a minimal valid report via multipart form data.

    The reports endpoint accepts Form fields, not a JSON body.  This
    mirrors the pattern used in test_reports.py.
    """
    return client.post(
        "/api/reports",
        data={"report_month": month, "meetings_held": "1"},
        headers=headers,
    )


# ===========================================================================
# Auth – login
# ===========================================================================
class TestLoginContract:
    """POST /api/auth/login response shape and selected field values."""

    def test_login_response_shape(self, client, seeded_db, test_password):
        """Full response validates against auth_login.json."""
        body = _login(client, "state@test.com", test_password)
        validate(instance=body, schema=load_contract("auth_login"))

    def test_login_user_has_role(self, client, seeded_db, test_password):
        """The state user's role field is STATE_OFFICIAL."""
        body = _login(client, "state@test.com", test_password)
        assert body["user"]["role"] == "STATE_OFFICIAL"

    def test_login_wdc_has_ward(self, client, seeded_db, test_password):
        """A WDC secretary's ward object is populated with id, name, and code."""
        body = _login(client, "wdc@test.com", test_password)
        validate(instance=body, schema=load_contract("auth_login"))

        ward = body["user"]["ward"]
        assert ward is not None, "ward must be populated for WDC_SECRETARY"
        assert "id" in ward
        assert "name" in ward
        assert "code" in ward


# ===========================================================================
# Auth – me
# ===========================================================================
class TestMeContract:
    """GET /api/auth/me response shape and role-specific nested objects."""

    def test_me_state_shape(self, client, state_headers):
        """State official profile validates against auth_me.json."""
        response = client.get("/api/auth/me", headers=state_headers)
        assert response.status_code == 200
        validate(instance=response.json(), schema=load_contract("auth_me"))

    def test_me_wdc_includes_ward(self, client, wdc_headers):
        """WDC secretary profile contains a ward object with the expected name."""
        response = client.get("/api/auth/me", headers=wdc_headers)
        assert response.status_code == 200
        body = response.json()
        validate(instance=body, schema=load_contract("auth_me"))

        assert body["ward"] is not None
        assert body["ward"]["name"] == "Magajin Gari I"

    def test_me_lga_includes_lga(self, client, lga_headers):
        """LGA coordinator profile contains an lga object with the expected name."""
        response = client.get("/api/auth/me", headers=lga_headers)
        assert response.status_code == 200
        body = response.json()
        validate(instance=body, schema=load_contract("auth_me"))

        assert body["lga"] is not None
        assert body["lga"]["name"] == "Birnin Gwari"


# ===========================================================================
# Reports – submit, list, detail
# ===========================================================================
class TestReportsContract:
    """POST /api/reports (201), GET /api/reports, GET /api/reports/{id}."""

    @pytest.fixture(autouse=True)
    def _mock_report_month_validation(self):
        """Bypass the date-window check so TARGET_MONTH is always accepted."""
        with patch(
            "app.routers.reports.validate_report_month",
            return_value=(True, ""),
        ):
            yield

    def test_submit_response_shape(self, client, wdc_headers):
        """201 body from POST /api/reports validates against reports_submit.json."""
        response = _submit_report(client, wdc_headers)
        assert response.status_code == 201
        validate(instance=response.json(), schema=load_contract("reports_submit"))

    def test_list_response_shape(self, client, wdc_headers):
        """After a submission, GET /api/reports returns an array that validates
        against reports_list.json.  The empty-array case is also structurally
        valid, but we test the non-empty path here for richer coverage."""
        _submit_report(client, wdc_headers)

        response = client.get("/api/reports", headers=wdc_headers)
        assert response.status_code == 200
        validate(instance=response.json(), schema=load_contract("reports_list"))

        # Sanity: at least one item present so the array-items sub-schema
        # was actually exercised by the validator.
        assert len(response.json()) >= 1

    def test_detail_response_shape(self, client, wdc_headers):
        """GET /api/reports/{id} body validates against reports_detail.json."""
        create_resp = _submit_report(client, wdc_headers)
        report_id = create_resp.json()["id"]

        response = client.get(f"/api/reports/{report_id}", headers=wdc_headers)
        assert response.status_code == 200
        validate(instance=response.json(), schema=load_contract("reports_detail"))

    def test_detail_includes_ward_info(self, client, wdc_headers):
        """The ward sub-object in the detail response carries the correct name."""
        create_resp = _submit_report(client, wdc_headers)
        report_id = create_resp.json()["id"]

        response = client.get(f"/api/reports/{report_id}", headers=wdc_headers)
        assert response.status_code == 200
        body = response.json()

        assert body["ward"] is not None
        assert body["ward"]["name"] == "Magajin Gari I"


# ===========================================================================
# Reports – check-submitted
# ===========================================================================
class TestCheckSubmittedContract:
    """GET /api/reports/check-submitted response shape and boolean semantics."""

    @pytest.fixture(autouse=True)
    def _mock_report_month_validation(self):
        """Bypass the date-window check so TARGET_MONTH is always accepted."""
        with patch(
            "app.routers.reports.validate_report_month",
            return_value=(True, ""),
        ):
            yield

    def test_not_submitted_shape(self, client, wdc_headers):
        """Before any submission the response validates and submitted is False."""
        response = client.get(
            f"/api/reports/check-submitted?month={TARGET_MONTH}",
            headers=wdc_headers,
        )
        assert response.status_code == 200
        body = response.json()
        validate(instance=body, schema=load_contract("reports_check_submitted"))

        assert body["submitted"] is False
        assert body["report_id"] is None

    def test_submitted_shape(self, client, wdc_headers):
        """After submission the response validates and submitted is True with
        an integer report_id."""
        _submit_report(client, wdc_headers)

        response = client.get(
            f"/api/reports/check-submitted?month={TARGET_MONTH}",
            headers=wdc_headers,
        )
        assert response.status_code == 200
        body = response.json()
        validate(instance=body, schema=load_contract("reports_check_submitted"))

        assert body["submitted"] is True
        assert isinstance(body["report_id"], int)


# ===========================================================================
# Reports – submission-info
# ===========================================================================
class TestSubmissionInfoContract:
    """GET /api/reports/submission-info response shape."""

    def test_shape(self, client, wdc_headers):
        """Response validates against reports_submission_info.json regardless of
        the current calendar day, because the contract only constrains types
        and required keys, not the specific month value."""
        response = client.get(
            "/api/reports/submission-info", headers=wdc_headers
        )
        assert response.status_code == 200
        validate(
            instance=response.json(),
            schema=load_contract("reports_submission_info"),
        )


# ===========================================================================
# Analytics – overview
# ===========================================================================
class TestAnalyticsContract:
    """GET /api/analytics/overview response shape."""

    def test_overview_shape(self, client, state_headers):
        """Response validates against analytics_overview.json.  No reports
        exist in the seeded DB for the queried month; that is intentional --
        the contract must hold for zero-submission states as well."""
        response = client.get(
            f"/api/analytics/overview?month={TARGET_MONTH}",
            headers=state_headers,
        )
        assert response.status_code == 200
        validate(
            instance=response.json(),
            schema=load_contract("analytics_overview"),
        )


# ===========================================================================
# Notifications – list
# ===========================================================================
class TestNotificationsContract:
    """GET /api/notifications response shape."""

    def test_list_shape(self, client, state_headers):
        """An empty notification list is a valid response.  The contract
        requires the envelope (success + data with notifications/total/
        unread_count) regardless of list length."""
        response = client.get("/api/notifications", headers=state_headers)
        assert response.status_code == 200
        validate(
            instance=response.json(),
            schema=load_contract("notifications_list"),
        )


# ===========================================================================
# Meta – OpenAPI schema accessibility
# ===========================================================================
class TestOpenAPISchemaAvailable:
    """Verify that FastAPI's auto-generated OpenAPI JSON is reachable.

    This does not require authentication.  If this test fails the frontend
    tooling that consumes /openapi.json for code-gen or runtime validation
    is broken."""

    def test_openapi_json_accessible(self, client, seeded_db):
        """GET /openapi.json returns 200 with the expected top-level keys."""
        response = client.get("/openapi.json")
        assert response.status_code == 200

        schema = response.json()
        assert "paths" in schema, "OpenAPI response must contain 'paths'"
        assert "/api/auth/login" in schema["paths"], (
            "/api/auth/login must appear in the OpenAPI path index"
        )
