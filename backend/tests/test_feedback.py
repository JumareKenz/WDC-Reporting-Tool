"""
Feedback (messaging) endpoint tests
Tests: send message, get messages, mark read, role-based access
"""
import pytest


# ---------------------------------------------------------------------------
class TestSendFeedback:
    """POST /api/feedback"""

    def test_wdc_send_to_lga_coordinator(self, client, wdc_headers):
        """WDC sends feedback; ward_id auto-set, recipient resolved via type"""
        response = client.post(
            "/api/feedback",
            json={"message": "Need supplies", "recipient_type": "LGA"},
            headers=wdc_headers,
        )
        assert response.status_code == 201
        data = response.json()["data"]
        assert data["ward_id"] == 1  # auto-set from wdc user
        assert data["message"] == "Need supplies"
        assert data["recipient_id"] == 2  # lga coordinator id

    def test_wdc_send_to_state(self, client, wdc_headers):
        response = client.post(
            "/api/feedback",
            json={"message": "Escalation", "recipient_type": "STATE"},
            headers=wdc_headers,
        )
        assert response.status_code == 201
        assert response.json()["data"]["recipient_id"] == 1  # state user id

    def test_lga_send_to_wdc_in_own_lga(self, client, lga_headers):
        response = client.post(
            "/api/feedback",
            json={
                "message": "Submit your report",
                "ward_id": 1,
                "recipient_type": "WDC",
            },
            headers=lga_headers,
        )
        assert response.status_code == 201
        assert response.json()["data"]["recipient_id"] == 3  # wdc user in ward 1

    def test_lga_cannot_send_to_ward_in_other_lga(self, client, lga_headers):
        """lga_headers is coordinator for lga 1; ward 3 belongs to lga 2"""
        response = client.post(
            "/api/feedback",
            json={"message": "Cross-LGA attempt", "ward_id": 3},
            headers=lga_headers,
        )
        assert response.status_code == 403

    def test_state_send_with_ward_id(self, client, state_headers):
        """State official can send to any ward"""
        response = client.post(
            "/api/feedback",
            json={"message": "State directive", "ward_id": 1},
            headers=state_headers,
        )
        assert response.status_code == 201

    def test_state_send_without_ward_id_rejected(self, client, state_headers):
        """STATE_OFFICIAL must provide ward_id; Feedback.ward_id is NOT NULL."""
        response = client.post(
            "/api/feedback",
            json={"message": "No ward specified"},
            headers=state_headers,
        )
        assert response.status_code == 400

    def test_send_reply(self, client, wdc_headers, lga_headers):
        """Reply to an existing feedback message (parent_id)"""
        # Original message
        orig = client.post(
            "/api/feedback",
            json={"message": "Original", "recipient_type": "LGA"},
            headers=wdc_headers,
        )
        parent_id = orig.json()["data"]["id"]

        # Reply from LGA back to the ward
        response = client.post(
            "/api/feedback",
            json={
                "message": "Reply here",
                "ward_id": 1,
                "parent_id": parent_id,
            },
            headers=lga_headers,
        )
        assert response.status_code == 201
        assert response.json()["data"]["parent_id"] == parent_id

    def test_send_unauthenticated(self, client, seeded_db):
        response = client.post(
            "/api/feedback", json={"message": "No auth"}
        )
        assert response.status_code in [401, 403]


# ---------------------------------------------------------------------------
class TestGetFeedback:
    """GET /api/feedback"""

    def test_wdc_sees_own_ward_messages(self, client, wdc_headers):
        # Send a message first
        client.post(
            "/api/feedback",
            json={"message": "Hello", "recipient_type": "LGA"},
            headers=wdc_headers,
        )

        response = client.get("/api/feedback", headers=wdc_headers)
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["total"] >= 1
        # All returned messages should be for ward 1
        for msg in data["messages"]:
            assert msg["ward_id"] == 1

    def test_lga_sees_own_lga_messages(self, client, lga_headers, wdc_headers):
        # WDC in ward 1 (lga 1) sends
        client.post(
            "/api/feedback",
            json={"message": "LGA msg", "recipient_type": "LGA"},
            headers=wdc_headers,
        )

        response = client.get("/api/feedback", headers=lga_headers)
        assert response.status_code == 200
        assert response.json()["data"]["total"] >= 1

    def test_lga_filter_by_ward(self, client, lga_headers, wdc_headers):
        client.post(
            "/api/feedback",
            json={"message": "Ward 1 msg", "recipient_type": "LGA"},
            headers=wdc_headers,
        )
        response = client.get(
            "/api/feedback?ward_id=1", headers=lga_headers
        )
        assert response.status_code == 200
        for msg in response.json()["data"]["messages"]:
            assert msg["ward_id"] == 1

    def test_state_sees_all_feedback(
        self, client, state_headers, wdc_headers, wdc2_headers
    ):
        client.post(
            "/api/feedback",
            json={"message": "From ward 1", "recipient_type": "LGA"},
            headers=wdc_headers,
        )
        client.post(
            "/api/feedback",
            json={"message": "From ward 3", "recipient_type": "STATE"},
            headers=wdc2_headers,
        )

        response = client.get("/api/feedback", headers=state_headers)
        assert response.status_code == 200
        assert response.json()["data"]["total"] >= 2

    def test_pagination(self, client, wdc_headers):
        # Send 3 messages
        for i in range(3):
            client.post(
                "/api/feedback",
                json={"message": f"Msg {i}", "recipient_type": "LGA"},
                headers=wdc_headers,
            )

        response = client.get(
            "/api/feedback?limit=2&offset=0", headers=wdc_headers
        )
        data = response.json()["data"]
        assert len(data["messages"]) == 2
        assert data["total"] == 3


# ---------------------------------------------------------------------------
class TestMarkFeedbackRead:
    """PATCH /api/feedback/{id}/read"""

    def test_recipient_marks_read(self, client, wdc_headers, lga_headers):
        # WDC sends to LGA (recipient_id = 2)
        send_resp = client.post(
            "/api/feedback",
            json={"message": "Mark me", "recipient_type": "LGA"},
            headers=wdc_headers,
        )
        feedback_id = send_resp.json()["data"]["id"]

        # LGA (id=2) marks as read
        response = client.patch(
            f"/api/feedback/{feedback_id}/read", headers=lga_headers
        )
        assert response.status_code == 200
        assert response.json()["data"]["is_read"] is True

    def test_non_recipient_cannot_mark_read(
        self, client, wdc_headers, state_headers
    ):
        # WDC sends to LGA (recipient = lga user id=2)
        send_resp = client.post(
            "/api/feedback",
            json={"message": "Not for state", "recipient_type": "LGA"},
            headers=wdc_headers,
        )
        feedback_id = send_resp.json()["data"]["id"]

        # State (id=1, not the recipient) tries to mark read
        response = client.patch(
            f"/api/feedback/{feedback_id}/read", headers=state_headers
        )
        assert response.status_code == 403

    def test_nonexistent_feedback(self, client, lga_headers):
        response = client.patch(
            "/api/feedback/9999/read", headers=lga_headers
        )
        assert response.status_code == 404
