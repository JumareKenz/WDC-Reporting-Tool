"""
Notification endpoint tests
Tests: get notifications, send, mark read, mark all read, role gating
"""
import pytest


# ---------------------------------------------------------------------------
class TestGetNotifications:
    """GET /api/notifications"""

    def test_empty_notifications(self, client, wdc_headers):
        response = client.get("/api/notifications", headers=wdc_headers)
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["total"] == 0
        assert data["unread_count"] == 0
        assert data["notifications"] == []

    def test_notifications_after_send(
        self, client, state_headers, wdc_headers
    ):
        # State sends to WDC (id=3)
        client.post(
            "/api/notifications/send",
            json={
                "recipient_ids": [3],
                "title": "Test",
                "message": "Hello WDC",
                "notification_type": "REMINDER",
            },
            headers=state_headers,
        )

        response = client.get("/api/notifications", headers=wdc_headers)
        data = response.json()["data"]
        assert data["total"] == 1
        assert data["unread_count"] == 1
        assert data["notifications"][0]["title"] == "Test"
        assert data["notifications"][0]["is_read"] is False

    def test_unread_only_filter(self, client, state_headers, wdc_headers):
        # Send two notifications
        client.post(
            "/api/notifications/send",
            json={
                "recipient_ids": [3],
                "title": "Notif A",
                "message": "A",
                "notification_type": "REMINDER",
            },
            headers=state_headers,
        )
        client.post(
            "/api/notifications/send",
            json={
                "recipient_ids": [3],
                "title": "Notif B",
                "message": "B",
                "notification_type": "REMINDER",
            },
            headers=state_headers,
        )

        # Mark first as read
        all_resp = client.get("/api/notifications", headers=wdc_headers)
        first_id = all_resp.json()["data"]["notifications"][-1]["id"]
        client.patch(f"/api/notifications/{first_id}/read", headers=wdc_headers)

        # Unread only
        response = client.get(
            "/api/notifications?unread_only=true", headers=wdc_headers
        )
        data = response.json()["data"]
        assert data["unread_count"] == 1
        assert len(data["notifications"]) == 1

    def test_each_user_sees_own_notifications(
        self, client, state_headers, wdc_headers, lga_headers
    ):
        # Send to WDC only
        client.post(
            "/api/notifications/send",
            json={
                "recipient_ids": [3],
                "title": "For WDC",
                "message": "...",
                "notification_type": "REMINDER",
            },
            headers=state_headers,
        )

        # LGA should see none
        lga_resp = client.get("/api/notifications", headers=lga_headers)
        assert lga_resp.json()["data"]["total"] == 0

        # WDC should see one
        wdc_resp = client.get("/api/notifications", headers=wdc_headers)
        assert wdc_resp.json()["data"]["total"] == 1


# ---------------------------------------------------------------------------
class TestSendNotifications:
    """POST /api/notifications/send"""

    def test_state_sends_to_multiple(self, client, state_headers):
        response = client.post(
            "/api/notifications/send",
            json={
                "recipient_ids": [3, 4],
                "title": "Bulk",
                "message": "Submit reports",
                "notification_type": "REMINDER",
            },
            headers=state_headers,
        )
        assert response.status_code == 201
        data = response.json()["data"]
        assert data["sent_count"] == 2
        assert len(data["notification_ids"]) == 2

    def test_lga_can_send(self, client, lga_headers):
        response = client.post(
            "/api/notifications/send",
            json={
                "recipient_ids": [3],
                "title": "LGA Reminder",
                "message": "Please submit",
                "notification_type": "REMINDER",
            },
            headers=lga_headers,
        )
        assert response.status_code == 201

    def test_wdc_cannot_send(self, client, wdc_headers):
        response = client.post(
            "/api/notifications/send",
            json={
                "recipient_ids": [1],
                "title": "Unauthorized",
                "message": "Test",
                "notification_type": "REMINDER",
            },
            headers=wdc_headers,
        )
        assert response.status_code == 403

    def test_send_to_nonexistent_user(self, client, state_headers):
        response = client.post(
            "/api/notifications/send",
            json={
                "recipient_ids": [999],
                "title": "Bad",
                "message": "Test",
                "notification_type": "REMINDER",
            },
            headers=state_headers,
        )
        assert response.status_code == 400

    def test_invalid_notification_type(self, client, state_headers):
        response = client.post(
            "/api/notifications/send",
            json={
                "recipient_ids": [3],
                "title": "Bad Type",
                "message": "Test",
                "notification_type": "INVALID_TYPE",
            },
            headers=state_headers,
        )
        assert response.status_code == 422

    def test_missing_required_fields(self, client, state_headers):
        response = client.post(
            "/api/notifications/send",
            json={"recipient_ids": [3]},  # missing title, message
            headers=state_headers,
        )
        assert response.status_code == 422


# ---------------------------------------------------------------------------
class TestMarkNotificationRead:
    """PATCH /api/notifications/{id}/read"""

    def test_mark_single_read(self, client, state_headers, wdc_headers):
        send_resp = client.post(
            "/api/notifications/send",
            json={
                "recipient_ids": [3],
                "title": "Mark Me",
                "message": "Read this",
                "notification_type": "REMINDER",
            },
            headers=state_headers,
        )
        notif_id = send_resp.json()["data"]["notification_ids"][0]

        response = client.patch(
            f"/api/notifications/{notif_id}/read", headers=wdc_headers
        )
        assert response.status_code == 200
        assert response.json()["data"]["is_read"] is True

    def test_non_owner_cannot_mark_read(
        self, client, state_headers, wdc_headers, lga_headers
    ):
        # Send to WDC (id=3)
        send_resp = client.post(
            "/api/notifications/send",
            json={
                "recipient_ids": [3],
                "title": "For WDC",
                "message": "...",
                "notification_type": "REMINDER",
            },
            headers=state_headers,
        )
        notif_id = send_resp.json()["data"]["notification_ids"][0]

        # LGA (id=2) tries to mark it
        response = client.patch(
            f"/api/notifications/{notif_id}/read", headers=lga_headers
        )
        assert response.status_code == 403

    def test_nonexistent_notification(self, client, wdc_headers):
        response = client.patch(
            "/api/notifications/9999/read", headers=wdc_headers
        )
        assert response.status_code == 404


# ---------------------------------------------------------------------------
class TestMarkAllRead:
    """POST /api/notifications/mark-all-read"""

    def test_mark_all_read(self, client, state_headers, wdc_headers):
        # Send 3 notifications to WDC
        for i in range(3):
            client.post(
                "/api/notifications/send",
                json={
                    "recipient_ids": [3],
                    "title": f"Notif {i}",
                    "message": f"Message {i}",
                    "notification_type": "REMINDER",
                },
                headers=state_headers,
            )

        response = client.post(
            "/api/notifications/mark-all-read", headers=wdc_headers
        )
        assert response.status_code == 200
        assert response.json()["data"]["marked_read"] == 3

        # Verify unread count is 0
        check = client.get("/api/notifications", headers=wdc_headers)
        assert check.json()["data"]["unread_count"] == 0

    def test_mark_all_read_when_none(self, client, wdc_headers):
        response = client.post(
            "/api/notifications/mark-all-read", headers=wdc_headers
        )
        assert response.status_code == 200
        assert response.json()["data"]["marked_read"] == 0
