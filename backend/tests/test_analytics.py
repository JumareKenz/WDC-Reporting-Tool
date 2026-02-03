"""
Analytics endpoint tests (State Official only)
Tests: overview, lga-comparison, trends, ai-report, role gating
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


def _submit_report(client, headers, month=TARGET_MONTH, extra=None):
    data = {"report_month": month, "meetings_held": "2", "attendees_count": "25"}
    if extra:
        data.update(extra)
    return client.post("/api/reports", data=data, headers=headers)


# ---------------------------------------------------------------------------
class TestAnalyticsOverview:
    """GET /api/analytics/overview"""

    def test_overview_empty(self, client, state_headers):
        response = client.get(
            f"/api/analytics/overview?month={TARGET_MONTH}",
            headers=state_headers,
        )
        assert response.status_code == 200
        summary = response.json()["data"]["state_summary"]
        assert summary["total_lgas"] == 2
        assert summary["total_wards"] == 4
        assert summary["reports_submitted"] == 0
        assert summary["reports_missing"] == 4
        assert summary["submission_rate"] == 0.0

    def test_overview_with_submissions(
        self, client, state_headers, wdc_headers, wdc2_headers
    ):
        _submit_report(client, wdc_headers)
        _submit_report(client, wdc2_headers)

        response = client.get(
            f"/api/analytics/overview?month={TARGET_MONTH}",
            headers=state_headers,
        )
        summary = response.json()["data"]["state_summary"]
        assert summary["reports_submitted"] == 2
        assert summary["reports_missing"] == 2
        assert summary["submission_rate"] == 50.0
        assert summary["total_meetings_held"] == 4  # 2 per report
        assert summary["total_attendees"] == 50  # 25 per report

    def test_overview_includes_lga_performance(
        self, client, state_headers, wdc_headers
    ):
        _submit_report(client, wdc_headers)

        response = client.get(
            f"/api/analytics/overview?month={TARGET_MONTH}",
            headers=state_headers,
        )
        data = response.json()["data"]
        assert "top_performing_lgas" in data
        assert "low_performing_lgas" in data
        # Birnin Gwari has 1/2 submitted = 50%, Chikun has 0/2 = 0%
        top_names = [l["lga_name"] for l in data["top_performing_lgas"]]
        assert "Birnin Gwari" in top_names

    def test_non_state_forbidden(self, client, wdc_headers, lga_headers):
        for headers in (wdc_headers, lga_headers):
            response = client.get(
                f"/api/analytics/overview?month={TARGET_MONTH}", headers=headers
            )
            assert response.status_code == 403


# ---------------------------------------------------------------------------
class TestLGAComparison:
    """GET /api/analytics/lga-comparison"""

    def test_comparison_empty(self, client, state_headers):
        response = client.get(
            f"/api/analytics/lga-comparison?month={TARGET_MONTH}",
            headers=state_headers,
        )
        assert response.status_code == 200
        lgas = response.json()["data"]["lgas"]
        assert len(lgas) == 2
        for lga in lgas:
            assert lga["reports_submitted"] == 0
            assert lga["submission_rate"] == 0.0

    def test_comparison_with_submissions(
        self, client, state_headers, wdc_headers
    ):
        _submit_report(client, wdc_headers)  # ward 1 -> lga 1

        response = client.get(
            f"/api/analytics/lga-comparison?month={TARGET_MONTH}",
            headers=state_headers,
        )
        lgas = response.json()["data"]["lgas"]
        bgw = next(l for l in lgas if l["lga_name"] == "Birnin Gwari")
        chk = next(l for l in lgas if l["lga_name"] == "Chikun")
        assert bgw["reports_submitted"] == 1
        assert bgw["submission_rate"] == 50.0
        assert chk["reports_submitted"] == 0

    def test_comparison_includes_official_ward_count(
        self, client, state_headers
    ):
        response = client.get(
            f"/api/analytics/lga-comparison?month={TARGET_MONTH}",
            headers=state_headers,
        )
        for lga in response.json()["data"]["lgas"]:
            assert "official_ward_count" in lga

    def test_comparison_sort_asc(self, client, state_headers, wdc_headers):
        _submit_report(client, wdc_headers)

        response = client.get(
            f"/api/analytics/lga-comparison?month={TARGET_MONTH}&sort_by=submission_rate&order=asc",
            headers=state_headers,
        )
        lgas = response.json()["data"]["lgas"]
        rates = [l["submission_rate"] for l in lgas]
        assert rates == sorted(rates)

    def test_non_state_forbidden(self, client, lga_headers):
        response = client.get(
            f"/api/analytics/lga-comparison?month={TARGET_MONTH}",
            headers=lga_headers,
        )
        assert response.status_code == 403


# ---------------------------------------------------------------------------
class TestTrends:
    """GET /api/analytics/trends"""

    def test_trends_returns_monthly_data(self, client, state_headers):
        response = client.get(
            "/api/analytics/trends?start_month=2025-10&end_month=2026-01",
            headers=state_headers,
        )
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["period"]["start"] == "2025-10"
        assert data["period"]["end"] == "2026-01"
        assert len(data["trends"]) == 4  # Oct, Nov, Dec, Jan

    def test_trends_shows_submission_for_month(
        self, client, state_headers, wdc_headers
    ):
        _submit_report(client, wdc_headers)  # TARGET_MONTH = 2026-01

        response = client.get(
            "/api/analytics/trends?start_month=2025-12&end_month=2026-01",
            headers=state_headers,
        )
        trends = response.json()["data"]["trends"]
        jan = next(t for t in trends if t["month"] == "2026-01")
        dec = next(t for t in trends if t["month"] == "2025-12")
        assert jan["reports_submitted"] == 1
        assert dec["reports_submitted"] == 0

    def test_trends_filter_by_lga(
        self, client, state_headers, wdc_headers
    ):
        _submit_report(client, wdc_headers)  # ward 1 -> lga 1

        response = client.get(
            f"/api/analytics/trends?start_month=2026-01&end_month=2026-01&lga_id=1",
            headers=state_headers,
        )
        trends = response.json()["data"]["trends"]
        assert trends[0]["reports_submitted"] == 1
        # Only lga 1 wards (2 wards)
        assert trends[0]["total_wards"] == 2

    def test_non_state_forbidden(self, client, wdc_headers):
        response = client.get(
            "/api/analytics/trends?months=3", headers=wdc_headers
        )
        assert response.status_code == 403


# ---------------------------------------------------------------------------
class TestAIReport:
    """POST /api/analytics/ai-report"""

    def test_ai_report_no_submissions(self, client, state_headers):
        response = client.post(
            "/api/analytics/ai-report",
            json={"month": TARGET_MONTH},
            headers=state_headers,
        )
        assert response.status_code == 200
        report = response.json()["data"]["report"]
        assert "executive_summary" in report
        assert "key_findings" in report
        assert "recommendations" in report
        assert report["month"] == TARGET_MONTH

    def test_ai_report_with_submissions(
        self, client, state_headers, wdc_headers, wdc2_headers
    ):
        _submit_report(client, wdc_headers)
        _submit_report(client, wdc2_headers)

        response = client.post(
            "/api/analytics/ai-report",
            json={"month": TARGET_MONTH},
            headers=state_headers,
        )
        report = response.json()["data"]["report"]
        assert "50.00%" in report["executive_summary"]
        assert len(report["key_findings"]) >= 2
        assert len(report["lga_highlights"]) >= 1

    def test_ai_report_invalid_month_format(self, client, state_headers):
        response = client.post(
            "/api/analytics/ai-report",
            json={"month": "not-a-month"},
            headers=state_headers,
        )
        assert response.status_code == 422

    def test_non_state_forbidden(self, client, lga_headers):
        response = client.post(
            "/api/analytics/ai-report",
            json={"month": TARGET_MONTH},
            headers=lga_headers,
        )
        assert response.status_code == 403
