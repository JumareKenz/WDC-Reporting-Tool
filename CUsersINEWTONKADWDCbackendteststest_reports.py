"""
Report endpoint tests
Tests: CRUD operations, submission status, voice notes
"""
import pytest
from datetime import datetime


class TestReportSubmission:
    """Test POST /api/reports"""

    def test_submit_valid_report(self, client, wdc_headers, sample_report_data):
        """Test submitting a valid report"""
        response = client.post(
            "/api/reports",
            json=sample_report_data,
            headers=wdc_headers
        )

        assert response.status_code == 201
        data = response.json()
        assert "data" in data
        report = data["data"]
        assert report["meeting_type"] == "REGULAR"

    def test_submit_duplicate_report_same_month(self, client, wdc_headers, sample_report_data):
        """Test submitting duplicate report for same month"""
        # First submission
        response1 = client.post(
            "/api/reports",
            json=sample_report_data,
            headers=wdc_headers
        )
        assert response1.status_code == 201

        # Second submission for same month
        response2 = client.post(
            "/api/reports",
            json=sample_report_data,
            headers=wdc_headers
        )

        assert response2.status_code in [400, 409]  # Conflict
