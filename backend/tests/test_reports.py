"""
Report endpoint tests
Tests: submit, retrieve, update, review, check-submitted, state-submissions
"""
import pytest
import json
from unittest.mock import patch

# Patch validate_report_month for all tests in this module so month values are
# date-independent.  The real function rejects any month that doesn't match today's
# submission window; mocking it lets us use a fixed month across the suite.
TARGET_MONTH = "2026-01"


@pytest.fixture(autouse=True)
def _mock_report_month_validation():
    with patch(
        "app.routers.reports.validate_report_month", return_value=(True, "")
    ):
        yield


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _submit_report(client, headers, month=TARGET_MONTH, extra_data=None):
    """Helper: POST a minimal valid report, return response."""
    data = {"report_month": month, "meetings_held": "1"}
    if extra_data:
        data.update(extra_data)
    return client.post("/api/reports", data=data, headers=headers)


# ---------------------------------------------------------------------------
# Submission
# ---------------------------------------------------------------------------
class TestReportSubmission:
    """POST /api/reports"""

    def test_submit_minimal_report(self, client, wdc_headers):
        response = _submit_report(client, wdc_headers)
        assert response.status_code == 201
        body = response.json()
        assert body["report_month"] == TARGET_MONTH
        assert body["status"] == "SUBMITTED"
        assert body["ward_id"] == 1  # wdc user is in ward 1

    def test_submit_with_comprehensive_data(self, client, wdc_headers):
        report_data = json.dumps(
            {
                "meeting_type": "Monthly",
                "attendance_total": 30,
                "attendance_male": 18,
                "attendance_female": 12,
                "health_hepb_tested": 10,
                "health_hepb_positive": 2,
                "meetings_held": 2,
                "attendees_count": 30,
            }
        )
        response = client.post(
            "/api/reports",
            data={"report_month": TARGET_MONTH, "report_data": report_data},
            headers=wdc_headers,
        )
        assert response.status_code == 201
        body = response.json()
        assert body["attendance_total"] == 30
        assert body["health_hepb_tested"] == 10
        assert body["health_hepb_positive"] == 2

    def test_duplicate_submission_rejected(self, client, wdc_headers):
        _submit_report(client, wdc_headers)
        response = _submit_report(client, wdc_headers)  # same month, same ward
        assert response.status_code == 409

    def test_duplicate_detail_contains_report_id(self, client, wdc_headers):
        first = _submit_report(client, wdc_headers)
        first_id = first.json()["id"]
        second = _submit_report(client, wdc_headers)
        # Detail is a dict with existing_report_id
        detail = second.json()["detail"]
        assert detail["existing_report_id"] == first_id

    def test_different_wards_same_month_ok(self, client, wdc_headers, wdc2_headers):
        """Two different WDC secretaries can both submit for the same month"""
        r1 = _submit_report(client, wdc_headers)
        r2 = _submit_report(client, wdc2_headers)
        assert r1.status_code == 201
        assert r2.status_code == 201

    def test_non_wdc_cannot_submit(self, client, lga_headers):
        response = _submit_report(client, lga_headers)
        assert response.status_code == 403

    def test_state_cannot_submit(self, client, state_headers):
        response = _submit_report(client, state_headers)
        assert response.status_code == 403

    def test_submit_unauthenticated(self, client, seeded_db):
        response = client.post(
            "/api/reports", data={"report_month": TARGET_MONTH}
        )
        assert response.status_code in [401, 403]

    def test_submit_invalid_report_data_json(self, client, wdc_headers):
        response = client.post(
            "/api/reports",
            data={
                "report_month": TARGET_MONTH,
                "report_data": "not-valid-json{{{",
            },
            headers=wdc_headers,
        )
        assert response.status_code == 400


# ---------------------------------------------------------------------------
# Retrieval
# ---------------------------------------------------------------------------
class TestReportRetrieval:
    """GET /api/reports and GET /api/reports/{id}"""

    def test_get_reports_empty(self, client, wdc_headers):
        response = client.get("/api/reports", headers=wdc_headers)
        assert response.status_code == 200
        assert response.json() == []

    def test_get_reports_after_submit(self, client, wdc_headers):
        _submit_report(client, wdc_headers)
        response = client.get("/api/reports", headers=wdc_headers)
        assert response.status_code == 200
        reports = response.json()
        assert len(reports) == 1
        assert reports[0]["report_month"] == TARGET_MONTH

    def test_get_report_detail(self, client, wdc_headers):
        create_resp = _submit_report(client, wdc_headers)
        report_id = create_resp.json()["id"]

        response = client.get(f"/api/reports/{report_id}", headers=wdc_headers)
        assert response.status_code == 200
        assert response.json()["id"] == report_id
        assert response.json()["ward_id"] == 1

    def test_get_report_detail_includes_ward_info(self, client, wdc_headers):
        create_resp = _submit_report(client, wdc_headers)
        report_id = create_resp.json()["id"]

        response = client.get(f"/api/reports/{report_id}", headers=wdc_headers)
        body = response.json()
        assert body["ward"] is not None
        assert body["ward"]["name"] == "Magajin Gari I"

    def test_get_nonexistent_report(self, client, wdc_headers):
        response = client.get("/api/reports/9999", headers=wdc_headers)
        assert response.status_code == 404

    def test_lga_cannot_list_my_reports(self, client, lga_headers):
        response = client.get("/api/reports", headers=lga_headers)
        assert response.status_code == 403

    def test_wdc_cannot_see_other_ward_report(self, client, wdc_headers, wdc2_headers):
        """wdc (ward 1) should not be able to GET a report from wdc2 (ward 3)"""
        create_resp = _submit_report(client, wdc2_headers)
        other_report_id = create_resp.json()["id"]

        response = client.get(f"/api/reports/{other_report_id}", headers=wdc_headers)
        assert response.status_code == 403


# ---------------------------------------------------------------------------
# Review workflow
# ---------------------------------------------------------------------------
class TestReportReview:
    """PATCH /api/reports/{id}/review"""

    def test_lga_can_review_own_lga_report(self, client, wdc_headers, lga_headers):
        # wdc is in ward 1 (lga 1); lga_headers is coordinator for lga 1
        create_resp = _submit_report(client, wdc_headers)
        report_id = create_resp.json()["id"]

        response = client.patch(
            f"/api/reports/{report_id}/review", headers=lga_headers
        )
        assert response.status_code == 200
        assert response.json()["data"]["status"] == "REVIEWED"

    def test_state_can_review_any_report(self, client, wdc_headers, state_headers):
        create_resp = _submit_report(client, wdc_headers)
        report_id = create_resp.json()["id"]

        response = client.patch(
            f"/api/reports/{report_id}/review", headers=state_headers
        )
        assert response.status_code == 200

    def test_wdc_cannot_review(self, client, wdc_headers):
        create_resp = _submit_report(client, wdc_headers)
        report_id = create_resp.json()["id"]

        response = client.patch(
            f"/api/reports/{report_id}/review", headers=wdc_headers
        )
        assert response.status_code == 403

    def test_review_nonexistent_report(self, client, lga_headers):
        response = client.patch("/api/reports/9999/review", headers=lga_headers)
        assert response.status_code == 404

    def test_decline_requires_reason(self, client, wdc_headers, lga_headers):
        """Declining without a reason should return 400"""
        create_resp = _submit_report(client, wdc_headers)
        report_id = create_resp.json()["id"]

        response = client.patch(
            f"/api/reports/{report_id}/review",
            headers=lga_headers,
            json={"action": "decline"}  # No decline_reason
        )
        assert response.status_code == 400
        assert "reason is required" in response.json()["detail"].lower()

    def test_decline_stores_reason(self, client, wdc_headers, lga_headers):
        """Declining with a reason should store it correctly"""
        create_resp = _submit_report(client, wdc_headers)
        report_id = create_resp.json()["id"]

        decline_reason = "Report missing required data"
        response = client.patch(
            f"/api/reports/{report_id}/review",
            headers=lga_headers,
            json={"action": "decline", "decline_reason": decline_reason}
        )
        assert response.status_code == 200
        assert response.json()["data"]["status"] == "DECLINED"
        assert response.json()["data"]["decline_reason"] == decline_reason

    def test_approve_clears_decline_reason(self, client, wdc_headers, lga_headers):
        """Approving should clear any previous decline reason"""
        create_resp = _submit_report(client, wdc_headers)
        report_id = create_resp.json()["id"]

        response = client.patch(
            f"/api/reports/{report_id}/review",
            headers=lga_headers,
            json={"action": "approve"}
        )
        assert response.status_code == 200
        assert response.json()["data"]["status"] == "REVIEWED"
        assert response.json()["data"]["decline_reason"] is None

    def test_invalid_action_rejected(self, client, wdc_headers, lga_headers):
        """Invalid action should return 400"""
        create_resp = _submit_report(client, wdc_headers)
        report_id = create_resp.json()["id"]

        response = client.patch(
            f"/api/reports/{report_id}/review",
            headers=lga_headers,
            json={"action": "invalid_action"}
        )
        assert response.status_code == 400


# ---------------------------------------------------------------------------
# Check submitted
# ---------------------------------------------------------------------------
class TestCheckSubmitted:
    """GET /api/reports/check-submitted"""

    def test_not_submitted(self, client, wdc_headers):
        response = client.get(
            f"/api/reports/check-submitted?month={TARGET_MONTH}",
            headers=wdc_headers,
        )
        assert response.status_code == 200
        assert response.json()["submitted"] is False
        assert response.json()["report_id"] is None

    def test_submitted(self, client, wdc_headers):
        _submit_report(client, wdc_headers)
        response = client.get(
            f"/api/reports/check-submitted?month={TARGET_MONTH}",
            headers=wdc_headers,
        )
        assert response.status_code == 200
        assert response.json()["submitted"] is True
        assert response.json()["report_id"] is not None

    def test_check_submitted_wrong_role(self, client, lga_headers):
        response = client.get(
            f"/api/reports/check-submitted?month={TARGET_MONTH}",
            headers=lga_headers,
        )
        assert response.status_code == 403


# ---------------------------------------------------------------------------
# State-level submissions view
# ---------------------------------------------------------------------------
class TestStateSubmissions:
    """GET /api/reports/state-submissions"""

    def test_state_sees_submitted_reports(self, client, state_headers, wdc_headers):
        _submit_report(client, wdc_headers)
        response = client.get(
            f"/api/reports/state-submissions?month={TARGET_MONTH}",
            headers=state_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total_reports"] == 1
        assert data["total_wards_reported"] == 1

    def test_state_empty_when_no_submissions(self, client, state_headers):
        response = client.get(
            f"/api/reports/state-submissions?month={TARGET_MONTH}",
            headers=state_headers,
        )
        assert response.status_code == 200
        assert response.json()["total_reports"] == 0

    def test_non_state_cannot_view(self, client, wdc_headers):
        response = client.get(
            f"/api/reports/state-submissions?month={TARGET_MONTH}",
            headers=wdc_headers,
        )
        assert response.status_code == 403

    def test_lga_filter(self, client, state_headers, wdc_headers, wdc2_headers):
        """Filter state-submissions by lga_id"""
        _submit_report(client, wdc_headers)   # ward 1 -> lga 1
        _submit_report(client, wdc2_headers)  # ward 3 -> lga 2

        # Only lga 1
        response = client.get(
            f"/api/reports/state-submissions?month={TARGET_MONTH}&lga_id=1",
            headers=state_headers,
        )
        assert response.status_code == 200
        assert response.json()["total_reports"] == 1
        assert response.json()["lgas"][0]["lga_name"] == "Birnin Gwari"


# ---------------------------------------------------------------------------
# Submission info (was route-shadowed, now fixed)
# ---------------------------------------------------------------------------
class TestSubmissionInfo:
    """GET /api/reports/submission-info"""

    def test_returns_submission_info(self, client, wdc_headers):
        response = client.get("/api/reports/submission-info", headers=wdc_headers)
        assert response.status_code == 200
        data = response.json()["data"]
        assert "target_month" in data
        assert "month_name" in data
        assert "is_submission_window" in data
        assert "current_day" in data
        assert "already_submitted" in data
        assert data["already_submitted"] is False

    def test_already_submitted_true_after_report(self, client, wdc_headers):
        """After submitting for the target month, already_submitted should be True"""
        # Get target month from the endpoint itself
        info_resp = client.get("/api/reports/submission-info", headers=wdc_headers)
        target_month = info_resp.json()["data"]["target_month"]

        # Submit a report for that target month
        _submit_report(client, wdc_headers, month=target_month)

        # Check again
        response = client.get("/api/reports/submission-info", headers=wdc_headers)
        assert response.json()["data"]["already_submitted"] is True

    def test_state_can_access(self, client, state_headers):
        response = client.get("/api/reports/submission-info", headers=state_headers)
        assert response.status_code == 200
