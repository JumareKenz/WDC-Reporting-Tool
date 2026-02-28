"""
Investigation endpoint tests (State Official only)
Tests: CRUD, filters, status lifecycle, role gating
"""
import pytest


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _create_investigation(client, headers, **overrides):
    payload = {
        "title": "Test Investigation",
        "description": "Something to look into",
        "investigation_type": "GENERAL",
        "priority": "MEDIUM",
        "lga_id": 1,
        "ward_id": 1,
    }
    payload.update(overrides)
    return client.post("/api/investigations", json=payload, headers=headers)


# ---------------------------------------------------------------------------
class TestCreateInvestigation:
    """POST /api/investigations"""

    def test_create_basic(self, client, state_headers):
        response = _create_investigation(client, state_headers)
        assert response.status_code == 201
        data = response.json()["data"]
        assert data["title"] == "Test Investigation"
        assert data["status"] == "OPEN"
        assert data["lga_id"] == 1
        assert data["ward_id"] == 1
        assert data["created_by"] == 1  # state user id

    def test_create_all_types(self, client, state_headers):
        for inv_type in ("GENERAL", "FINANCIAL", "COMPLIANCE", "PERFORMANCE", "COMPLAINT"):
            response = _create_investigation(
                client, state_headers, investigation_type=inv_type
            )
            assert response.status_code == 201

    def test_create_all_priorities(self, client, state_headers):
        for priority in ("LOW", "MEDIUM", "HIGH", "URGENT"):
            response = _create_investigation(
                client, state_headers, priority=priority
            )
            assert response.status_code == 201

    def test_create_lga_level_only(self, client, state_headers):
        """Investigation at LGA level without ward"""
        response = _create_investigation(
            client, state_headers, ward_id=None
        )
        assert response.status_code == 201
        assert response.json()["data"]["ward_id"] is None

    def test_create_invalid_lga(self, client, state_headers):
        response = _create_investigation(client, state_headers, lga_id=999)
        assert response.status_code == 404

    def test_create_invalid_ward(self, client, state_headers):
        response = _create_investigation(client, state_headers, ward_id=999)
        assert response.status_code == 404

    def test_create_missing_required(self, client, state_headers):
        response = client.post(
            "/api/investigations",
            json={"title": "No description"},
            headers=state_headers,
        )
        assert response.status_code == 422

    def test_non_state_forbidden(self, client, wdc_headers, lga_headers):
        for headers in (wdc_headers, lga_headers):
            response = _create_investigation(client, headers)
            assert response.status_code == 403


# ---------------------------------------------------------------------------
class TestListInvestigations:
    """GET /api/investigations"""

    def test_list_empty(self, client, state_headers):
        response = client.get("/api/investigations", headers=state_headers)
        assert response.status_code == 200
        assert response.json()["data"]["total"] == 0

    def test_list_after_create(self, client, state_headers):
        _create_investigation(client, state_headers)
        _create_investigation(client, state_headers, title="Second")

        response = client.get("/api/investigations", headers=state_headers)
        assert response.json()["data"]["total"] == 2

    def test_filter_by_status(self, client, state_headers):
        inv_resp = _create_investigation(client, state_headers)
        inv_id = inv_resp.json()["data"]["id"]

        # Update to IN_PROGRESS
        client.patch(
            f"/api/investigations/{inv_id}",
            json={"status": "IN_PROGRESS"},
            headers=state_headers,
        )

        # Filter OPEN (should be 0)
        response = client.get(
            "/api/investigations?status_filter=OPEN", headers=state_headers
        )
        assert response.json()["data"]["total"] == 0

        # Filter IN_PROGRESS (should be 1)
        response = client.get(
            "/api/investigations?status_filter=IN_PROGRESS",
            headers=state_headers,
        )
        assert response.json()["data"]["total"] == 1

    def test_filter_by_lga(self, client, state_headers):
        _create_investigation(client, state_headers, lga_id=1)
        _create_investigation(client, state_headers, lga_id=2)

        response = client.get(
            "/api/investigations?lga_id=1", headers=state_headers
        )
        assert response.json()["data"]["total"] == 1

    def test_filter_by_priority(self, client, state_headers):
        _create_investigation(client, state_headers, priority="URGENT")
        _create_investigation(client, state_headers, priority="LOW")

        response = client.get(
            "/api/investigations?priority=URGENT", headers=state_headers
        )
        assert response.json()["data"]["total"] == 1

    def test_pagination(self, client, state_headers):
        for i in range(5):
            _create_investigation(client, state_headers, title=f"Inv {i}")

        response = client.get(
            "/api/investigations?limit=2&offset=0", headers=state_headers
        )
        data = response.json()["data"]
        assert len(data["investigations"]) == 2
        assert data["total"] == 5

    def test_non_state_forbidden(self, client, lga_headers):
        response = client.get("/api/investigations", headers=lga_headers)
        assert response.status_code == 403


# ---------------------------------------------------------------------------
class TestGetInvestigation:
    """GET /api/investigations/{id}"""

    def test_get_detail(self, client, state_headers):
        inv_resp = _create_investigation(client, state_headers)
        inv_id = inv_resp.json()["data"]["id"]

        response = client.get(
            f"/api/investigations/{inv_id}", headers=state_headers
        )
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["id"] == inv_id
        assert data["lga"] is not None
        assert data["lga"]["name"] == "Birnin Gwari"
        assert data["ward"] is not None
        assert data["ward"]["name"] == "Magajin Gari I"
        assert data["created_by"] is not None

    def test_get_detail_includes_coordinator(self, client, state_headers):
        """LGA-level investigation should include coordinator info"""
        inv_resp = _create_investigation(
            client, state_headers, lga_id=1, ward_id=None
        )
        inv_id = inv_resp.json()["data"]["id"]

        response = client.get(
            f"/api/investigations/{inv_id}", headers=state_headers
        )
        lga_data = response.json()["data"]["lga"]
        assert lga_data["coordinator"] is not None
        assert lga_data["coordinator"]["email"] == "lga@test.com"

    def test_get_nonexistent(self, client, state_headers):
        response = client.get(
            "/api/investigations/9999", headers=state_headers
        )
        assert response.status_code == 404


# ---------------------------------------------------------------------------
class TestUpdateInvestigation:
    """PATCH /api/investigations/{id}"""

    def test_update_title(self, client, state_headers):
        inv_resp = _create_investigation(client, state_headers)
        inv_id = inv_resp.json()["data"]["id"]

        response = client.patch(
            f"/api/investigations/{inv_id}",
            json={"title": "Updated Title"},
            headers=state_headers,
        )
        assert response.status_code == 200
        assert response.json()["data"]["id"] == inv_id

    def test_update_status_to_in_progress(self, client, state_headers):
        inv_resp = _create_investigation(client, state_headers)
        inv_id = inv_resp.json()["data"]["id"]

        response = client.patch(
            f"/api/investigations/{inv_id}",
            json={"status": "IN_PROGRESS"},
            headers=state_headers,
        )
        assert response.json()["data"]["status"] == "IN_PROGRESS"

    def test_close_sets_closed_at(self, client, state_headers):
        inv_resp = _create_investigation(client, state_headers)
        inv_id = inv_resp.json()["data"]["id"]

        client.patch(
            f"/api/investigations/{inv_id}",
            json={"status": "CLOSED"},
            headers=state_headers,
        )

        # Verify via GET
        detail = client.get(
            f"/api/investigations/{inv_id}", headers=state_headers
        )
        assert detail.json()["data"]["status"] == "CLOSED"
        assert detail.json()["data"]["closed_at"] is not None

    def test_update_nonexistent(self, client, state_headers):
        response = client.patch(
            "/api/investigations/9999",
            json={"title": "Ghost"},
            headers=state_headers,
        )
        assert response.status_code == 404

    def test_update_invalid_status(self, client, state_headers):
        inv_resp = _create_investigation(client, state_headers)
        inv_id = inv_resp.json()["data"]["id"]

        response = client.patch(
            f"/api/investigations/{inv_id}",
            json={"status": "INVALID_STATUS"},
            headers=state_headers,
        )
        assert response.status_code == 422


# ---------------------------------------------------------------------------
class TestDeleteInvestigation:
    """DELETE /api/investigations/{id}"""

    def test_delete_existing(self, client, state_headers):
        inv_resp = _create_investigation(client, state_headers)
        inv_id = inv_resp.json()["data"]["id"]

        response = client.delete(
            f"/api/investigations/{inv_id}", headers=state_headers
        )
        assert response.status_code == 204

        # Verify gone
        check = client.get(
            f"/api/investigations/{inv_id}", headers=state_headers
        )
        assert check.status_code == 404

    def test_delete_nonexistent(self, client, state_headers):
        response = client.delete(
            "/api/investigations/9999", headers=state_headers
        )
        assert response.status_code == 404

    def test_non_state_cannot_delete(self, client, state_headers, lga_headers):
        inv_resp = _create_investigation(client, state_headers)
        inv_id = inv_resp.json()["data"]["id"]

        response = client.delete(
            f"/api/investigations/{inv_id}", headers=lga_headers
        )
        assert response.status_code == 403
