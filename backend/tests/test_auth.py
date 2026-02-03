"""
Authentication endpoint tests
Tests: login, register, me, token validation
"""
import pytest


class TestLogin:
    """Test /api/auth/login endpoint"""

    def test_login_success(self, client, seeded_db, test_password):
        """Test successful login with valid credentials"""
        response = client.post(
            "/api/auth/login",
            json={"email": "wdc@test.com", "password": test_password}
        )

        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert "user" in data
        assert data["user"]["email"] == "wdc@test.com"
        assert data["user"]["role"] == "WDC_SECRETARY"

    def test_login_wrong_password(self, client, seeded_db):
        """Test login with incorrect password"""
        response = client.post(
            "/api/auth/login",
            json={"email": "wdc@test.com", "password": "wrongpassword"}
        )

        assert response.status_code == 401
        assert "detail" in response.json()

    def test_login_nonexistent_user(self, client, seeded_db):
        """Test login with non-existent email"""
        response = client.post(
            "/api/auth/login",
            json={"email": "notexist@test.com", "password": "anything"}
        )

        assert response.status_code == 401

    def test_login_missing_fields(self, client, seeded_db):
        """Test login with missing required fields"""
        response = client.post(
            "/api/auth/login",
            json={"email": "wdc@test.com"}
        )

        assert response.status_code == 422  # Validation error

    def test_login_invalid_email_format(self, client, seeded_db, test_password):
        """Test login with invalid email format"""
        response = client.post(
            "/api/auth/login",
            json={"email": "not-an-email", "password": test_password}
        )

        assert response.status_code in [401, 422]

    def test_login_inactive_user(self, client, seeded_db, test_password):
        """Test login with inactive user account"""
        # First, deactivate the user
        from app.models import User
        user = seeded_db.query(User).filter(User.email == "wdc@test.com").first()
        user.is_active = False
        seeded_db.commit()

        response = client.post(
            "/api/auth/login",
            json={"email": "wdc@test.com", "password": test_password}
        )

        assert response.status_code in [401, 403]


class TestMeEndpoint:
    """Test /api/auth/me endpoint"""

    def test_me_with_valid_token(self, client, wdc_headers):
        """Test getting current user profile with valid token"""
        response = client.get("/api/auth/me", headers=wdc_headers)

        assert response.status_code == 200
        data = response.json()
        assert "data" in data or "email" in data
        # Handle both response formats
        user = data.get("data", data)
        assert user["email"] == "wdc@test.com"
        assert user["role"] == "WDC_SECRETARY"

    def test_me_without_token(self, client, seeded_db):
        """Test accessing /me without authentication"""
        response = client.get("/api/auth/me")

        # HTTPBearer returns 403 when credentials are missing entirely
        assert response.status_code in [401, 403]

    def test_me_with_invalid_token(self, client, seeded_db):
        """Test accessing /me with invalid token"""
        response = client.get(
            "/api/auth/me",
            headers={"Authorization": "Bearer invalid_token"}
        )

        assert response.status_code == 401

    def test_me_with_malformed_header(self, client, seeded_db):
        """Test accessing /me with malformed auth header"""
        response = client.get(
            "/api/auth/me",
            headers={"Authorization": "NotBearer token"}
        )

        # HTTPBearer returns 403 when scheme is not "Bearer"
        assert response.status_code in [401, 403]


class TestRegister:
    """Test /api/auth/register endpoint (if it exists)"""

    def test_register_new_user(self, client, seeded_db):
        """Test registering a new user"""
        response = client.post(
            "/api/auth/register",
            json={
                "email": "newuser@test.com",
                "password": "NewPass123!",
                "full_name": "New User",
                "phone": "08099999999",
                "role": "WDC_SECRETARY"
            }
        )

        # Registration might be disabled or require admin approval
        assert response.status_code in [200, 201, 403, 404]

    def test_register_duplicate_email(self, client, seeded_db, test_password):
        """Test registering with existing email"""
        response = client.post(
            "/api/auth/register",
            json={
                "email": "wdc@test.com",
                "password": test_password,
                "full_name": "Duplicate User",
                "phone": "08088888888",
                "role": "WDC_SECRETARY"
            }
        )

        # Should fail if endpoint exists
        assert response.status_code in [400, 409, 404]


class TestTokenValidation:
    """Test JWT token behavior"""

    def test_token_works_across_requests(self, client, wdc_headers):
        """Test that token works for multiple requests"""
        # First request
        response1 = client.get("/api/auth/me", headers=wdc_headers)
        assert response1.status_code == 200

        # Second request with same token
        response2 = client.get("/api/auth/me", headers=wdc_headers)
        assert response2.status_code == 200

    def test_different_users_different_tokens(self, client, wdc_headers, lga_headers):
        """Test that different users get different data"""
        wdc_response = client.get("/api/auth/me", headers=wdc_headers)
        lga_response = client.get("/api/auth/me", headers=lga_headers)

        assert wdc_response.status_code == 200
        assert lga_response.status_code == 200

        wdc_data = wdc_response.json()
        lga_data = lga_response.json()

        wdc_user = wdc_data.get("data", wdc_data)
        lga_user = lga_data.get("data", lga_data)

        assert wdc_user["role"] == "WDC_SECRETARY"
        assert lga_user["role"] == "LGA_COORDINATOR"
