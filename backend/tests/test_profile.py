import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from ..app.main import app
from ..app.database import Base, get_db
from ..app.auth import get_password_hash

# Test database setup
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(scope="function")
def client():
    Base.metadata.create_all(bind=engine)
    yield TestClient(app)
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def test_user(client):
    """Create a test WDC_SECRETARY user"""
    from ..app.models import User
    db = TestingSessionLocal()

    user = User(
        email="test@example.com",
        password_hash=get_password_hash("password123"),
        full_name="Test User",
        role="WDC_SECRETARY",
        phone="08012345678",
        ward_id=1,
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Login to get token
    response = client.post("/api/auth/login", json={
        "email": "test@example.com",
        "password": "password123"
    })
    token = response.json()["access_token"]

    db.close()
    return {"user": user, "token": token}


def test_update_profile_success(client, test_user):
    """Test successful profile update"""
    response = client.patch(
        "/api/profile/me",
        json={"full_name": "Updated Name", "phone": "08098765432"},
        headers={"Authorization": f"Bearer {test_user['token']}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["full_name"] == "Updated Name"
    assert data["phone"] == "08098765432"


def test_change_password_success(client, test_user):
    """Test successful password change"""
    response = client.post(
        "/api/profile/change-password",
        json={
            "current_password": "password123",
            "new_password": "newpassword123"
        },
        headers={"Authorization": f"Bearer {test_user['token']}"}
    )
    assert response.status_code == 200
    assert response.json()["message"] == "Password changed successfully"


def test_change_password_invalid_current(client, test_user):
    """Test password change with incorrect current password"""
    response = client.post(
        "/api/profile/change-password",
        json={
            "current_password": "wrongpassword",
            "new_password": "newpassword123"
        },
        headers={"Authorization": f"Bearer {test_user['token']}"}
    )
    assert response.status_code == 401
    assert "incorrect" in response.json()["detail"].lower()


def test_wdc_cannot_change_email(client, test_user):
    """Test that WDC_SECRETARY cannot change email"""
    response = client.patch(
        "/api/profile/email",
        json={"email": "newemail@example.com"},
        headers={"Authorization": f"Bearer {test_user['token']}"}
    )
    assert response.status_code == 403
    assert "cannot change email" in response.json()["detail"].lower()


def test_phone_format_validation(client, test_user):
    """Test phone number format validation"""
    response = client.patch(
        "/api/profile/me",
        json={"phone": "invalid_phone"},
        headers={"Authorization": f"Bearer {test_user['token']}"}
    )
    assert response.status_code == 422
    assert "phone" in str(response.json()).lower()


def test_password_min_length_validation(client, test_user):
    """Test password minimum length validation"""
    response = client.post(
        "/api/profile/change-password",
        json={
            "current_password": "password123",
            "new_password": "short"
        },
        headers={"Authorization": f"Bearer {test_user['token']}"}
    )
    assert response.status_code == 422
    assert "at least 6 characters" in str(response.json()).lower()
