
import pytest
import json
from unittest.mock import patch
from app.models import Report

# Target month for tests
TARGET_MONTH = "2026-01"

@pytest.fixture(autouse=True)
def _mock_report_month_validation():
    with patch("app.routers.reports.validate_report_month", return_value=(True, "")):
        yield

class TestOfflineSync:
    """Tests for offline sync capabilities and idempotency"""

    def _submit_with_id(self, client, headers, submission_id, month=TARGET_MONTH, extra_data=None):
        data = {"report_month": month, "meetings_held": "1"}
        if extra_data:
            data.update(extra_data)
        
        headers_with_id = headers.copy()
        if submission_id:
            headers_with_id["X-Submission-ID"] = submission_id
            
        return client.post("/api/reports", data=data, headers=headers_with_id)

    def test_submission_saves_id(self, client, wdc_headers, db):
        """Test that X-Submission-ID is saved to the database"""
        sub_id = "test-uuid-123456"
        response = self._submit_with_id(client, wdc_headers, sub_id)
        
        assert response.status_code == 201
        data = response.json()
        assert data["submission_id"] == sub_id
        
        # Verify in DB
        report = db.query(Report).filter(Report.id == data["id"]).first()
        assert report.submission_id == sub_id

    def test_idempotent_retry(self, client, wdc_headers):
        """Test that retrying with same submission ID returns existing report (200/201)"""
        sub_id = "test-uuid-retry-123"
        
        # First attempt
        r1 = self._submit_with_id(client, wdc_headers, sub_id)
        assert r1.status_code == 201
        r1_id = r1.json()["id"]

        # Second attempt (simulate offline queue retry)
        r2 = self._submit_with_id(client, wdc_headers, sub_id)
        
        # Should succeed and return same object
        # Note: status code might be 201 or 200 depending on impl, currently returns object so likely 201 or 200
        # The endpoint returns the model, FastAPI default implementation for POST is 201.
        # Since we return the object directly, it will likely be serialized with 201 unless we change response.
        assert r2.status_code == 201 
        assert r2.json()["id"] == r1_id
        assert r2.json()["submission_id"] == sub_id

    def test_conflict_different_ids(self, client, wdc_headers):
        """Test that submitting different IDs for same month causes conflict"""
        # First submission
        r1 = self._submit_with_id(client, wdc_headers, "uuid-1")
        assert r1.status_code == 201

        # Second submission, different ID (implies different attempt/form)
        r2 = self._submit_with_id(client, wdc_headers, "uuid-2")
        assert r2.status_code == 409
        assert "already been submitted" in r2.json()["detail"]["message"]

    def test_legacy_backfill(self, client, wdc_headers, db):
        """Test that submitting with ID matching an existing report without ID backfills it"""
        # 1. Submit WITHOUT ID (simulating old app version or manual DB insert)
        r1 = self._submit_with_id(client, wdc_headers, None)
        assert r1.status_code == 201
        res1 = r1.json()
        assert res1["submission_id"] is None
        
        # 2. Submit WITH ID for same month
        # This simulates a race condition or sync recovery where the server got the first one 
        # but client didn't get ack, so client retries with its generated ID.
        sub_id = "uuid-recovery"
        r2 = self._submit_with_id(client, wdc_headers, sub_id)
        
        # Should succeed and update the existing report
        assert r2.status_code == 201
        res2 = r2.json()
        assert res2["id"] == res1["id"]
        assert res2["submission_id"] == sub_id
        
        # Verify DB updated
        report = db.query(Report).filter(Report.id == res1["id"]).first()
        assert report.submission_id == sub_id
