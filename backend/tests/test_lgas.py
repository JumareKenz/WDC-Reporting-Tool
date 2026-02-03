"""
LGA and Ward endpoint tests
Tests: list LGAs, LGA detail, ward status, missing reports, ward detail
"""
import pytest
from unittest.mock import patch

TARGET_MONTH = "2026-01"


@pytest.fixture(autouse=True)
def _mock_report_month_validation():
    with patch(
        "app.routers.reports.validate_report_month", return_value=(True, "")
    ):
        yield


def _submit_report(client, headers, month=TARGET_MONTH):
    return client.post(
        "/api/reports", data={"report_month": month}, headers=headers
    )


# ---------------------------------------------------------------------------
class TestGetAllLGAs:
    """GET /api/lgas"""

    def test_returns_all_lgas(self, client, state_headers):
        response = client.get("/api/lgas", headers=state_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["total"] == 2
        names = [lga["name"] for lga in data["data"]["lgas"]]
        assert "Birnin Gwari" in names
        assert "Chikun" in names

    def test_lgas_sorted_alphabetically(self, client, state_headers):
        response = client.get("/api/lgas", headers=state_headers)
        names = [lga["name"] for lga in response.json()["data"]["lgas"]]
        assert names == sorted(names)

    def test_any_role_can_list_lgas(self, client, wdc_headers, lga_headers):
        for headers in (wdc_headers, lga_headers):
            response = client.get("/api/lgas", headers=headers)
            assert response.status_code == 200

    def test_unauthenticated_cannot_list(self, client, seeded_db):
        response = client.get("/api/lgas")
        assert response.status_code in [401, 403]


# ---------------------------------------------------------------------------
class TestGetLGADetails:
    """GET /api/lgas/{lga_id}"""

    def test_returns_lga_with_wards(self, client, state_headers):
        response = client.get("/api/lgas/1", headers=state_headers)
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["name"] == "Birnin Gwari"
        assert data["num_wards"] == 2
        assert len(data["wards"]) == 2
        ward_names = [w["name"] for w in data["wards"]]
        assert "Magajin Gari I" in ward_names
        assert "Gayam" in ward_names

    def test_nonexistent_lga(self, client, state_headers):
        response = client.get("/api/lgas/999", headers=state_headers)
        assert response.status_code == 404


# ---------------------------------------------------------------------------
class TestLGAWardsStatus:
    """GET /api/lgas/{lga_id}/wards"""

    def test_wards_status_no_submissions(self, client, state_headers):
        response = client.get(
            f"/api/lgas/1/wards?month={TARGET_MONTH}", headers=state_headers
        )
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["lga"]["name"] == "Birnin Gwari"
        summary = data["summary"]
        assert summary["total_wards"] == 2
        assert summary["submitted"] == 0
        assert summary["missing"] == 2
        assert summary["submission_rate"] == 0.0

    def test_wards_status_after_one_submission(
        self, client, state_headers, wdc_headers
    ):
        _submit_report(client, wdc_headers)  # ward 1, lga 1

        response = client.get(
            f"/api/lgas/1/wards?month={TARGET_MONTH}", headers=state_headers
        )
        summary = response.json()["data"]["summary"]
        assert summary["submitted"] == 1
        assert summary["missing"] == 1
        assert summary["submission_rate"] == 50.0

    def test_lga_coordinator_own_lga(self, client, lga_headers):
        # lga_headers is coordinator for lga 1
        response = client.get(
            f"/api/lgas/1/wards?month={TARGET_MONTH}", headers=lga_headers
        )
        assert response.status_code == 200

    def test_lga_coordinator_other_lga_forbidden(self, client, lga_headers):
        # lga_headers is coordinator for lga 1, trying lga 2
        response = client.get(
            f"/api/lgas/2/wards?month={TARGET_MONTH}", headers=lga_headers
        )
        assert response.status_code == 403

    def test_state_can_view_any_lga(self, client, state_headers):
        for lga_id in (1, 2):
            response = client.get(
                f"/api/lgas/{lga_id}/wards?month={TARGET_MONTH}",
                headers=state_headers,
            )
            assert response.status_code == 200

    def test_ward_entry_includes_secretary(self, client, state_headers):
        response = client.get(
            f"/api/lgas/1/wards?month={TARGET_MONTH}", headers=state_headers
        )
        wards = response.json()["data"]["wards"]
        # Ward 1 (Magajin Gari I) has wdc@test.com as secretary
        ward1 = next(w for w in wards if w["id"] == 1)
        assert ward1["secretary"] is not None
        assert ward1["secretary"]["email"] == "wdc@test.com"


# ---------------------------------------------------------------------------
class TestMissingReports:
    """GET /api/lgas/{lga_id}/missing-reports"""

    def test_all_missing_initially(self, client, state_headers):
        response = client.get(
            f"/api/lgas/1/missing-reports?month={TARGET_MONTH}",
            headers=state_headers,
        )
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["count"] == 2
        ward_ids = [r["ward_id"] for r in data["missing_reports"]]
        assert 1 in ward_ids
        assert 2 in ward_ids

    def test_one_submitted_reduces_missing(
        self, client, state_headers, wdc_headers
    ):
        _submit_report(client, wdc_headers)  # ward 1

        response = client.get(
            f"/api/lgas/1/missing-reports?month={TARGET_MONTH}",
            headers=state_headers,
        )
        data = response.json()["data"]
        assert data["count"] == 1
        assert data["missing_reports"][0]["ward_id"] == 2

    def test_lga_coordinator_own_lga(self, client, lga_headers):
        response = client.get(
            f"/api/lgas/1/missing-reports?month={TARGET_MONTH}",
            headers=lga_headers,
        )
        assert response.status_code == 200

    def test_lga_coordinator_other_lga_forbidden(self, client, lga_headers):
        response = client.get(
            f"/api/lgas/2/missing-reports?month={TARGET_MONTH}",
            headers=lga_headers,
        )
        assert response.status_code == 403

    def test_nonexistent_lga(self, client, state_headers):
        response = client.get(
            f"/api/lgas/999/missing-reports?month={TARGET_MONTH}",
            headers=state_headers,
        )
        assert response.status_code == 404


# ---------------------------------------------------------------------------
class TestLGAReports:
    """GET /api/lgas/{lga_id}/reports"""

    def test_empty_reports(self, client, state_headers):
        response = client.get(
            f"/api/lgas/1/reports?month={TARGET_MONTH}", headers=state_headers
        )
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["total"] == 0
        assert data["reports"] == []

    def test_reports_after_submission(
        self, client, state_headers, wdc_headers
    ):
        _submit_report(client, wdc_headers)

        response = client.get(
            f"/api/lgas/1/reports?month={TARGET_MONTH}", headers=state_headers
        )
        data = response.json()["data"]
        assert data["total"] == 1
        assert data["reports"][0]["ward_name"] == "Magajin Gari I"

    def test_filter_by_status(self, client, state_headers, wdc_headers, lga_headers):
        # Submit then review
        create_resp = _submit_report(client, wdc_headers)
        report_id = create_resp.json()["id"]
        client.patch(f"/api/reports/{report_id}/review", headers=lga_headers)

        # Filter REVIEWED
        response = client.get(
            f"/api/lgas/1/reports?month={TARGET_MONTH}&status_filter=REVIEWED",
            headers=state_headers,
        )
        assert response.json()["data"]["total"] == 1

        # Filter SUBMITTED (should be empty now)
        response = client.get(
            f"/api/lgas/1/reports?month={TARGET_MONTH}&status_filter=SUBMITTED",
            headers=state_headers,
        )
        assert response.json()["data"]["total"] == 0


# ---------------------------------------------------------------------------
class TestWardDetails:
    """GET /api/wards/{ward_id}"""

    def test_get_ward(self, client, state_headers):
        response = client.get("/api/wards/1", headers=state_headers)
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["name"] == "Magajin Gari I"
        assert data["lga"]["name"] == "Birnin Gwari"

    def test_get_ward_chikun(self, client, state_headers):
        response = client.get("/api/wards/3", headers=state_headers)
        data = response.json()["data"]
        assert data["name"] == "Chikun"
        assert data["lga"]["name"] == "Chikun"

    def test_nonexistent_ward(self, client, state_headers):
        response = client.get("/api/wards/999", headers=state_headers)
        assert response.status_code == 404
