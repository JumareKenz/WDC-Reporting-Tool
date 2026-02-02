import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from datetime import datetime
from ..app.main import app
from ..app.database import Base, get_db
from ..app.auth import get_password_hash

# Test database setup
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_reports.db"
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
def test_setup(client):
    """Create test user, ward, and LGA"""
    from ..app.models import User, Ward, LGA
    db = TestingSessionLocal()

    # Create LGA
    lga = LGA(id=1, name="Test LGA", code="TLGA", num_wards=1)
    db.add(lga)

    # Create Ward
    ward = Ward(id=1, name="Test Ward", code="TW01", lga_id=1)
    db.add(ward)

    # Create User
    user = User(
        email="secretary@example.com",
        password_hash=get_password_hash("password123"),
        full_name="Test Secretary",
        role="WDC_SECRETARY",
        phone="08012345678",
        ward_id=1,
        is_active=True
    )
    db.add(user)

    db.commit()

    # Login to get token
    response = client.post("/api/auth/login", json={
        "email": "secretary@example.com",
        "password": "password123"
    })
    token = response.json()["access_token"]

    db.close()
    return {"token": token, "ward_id": 1}


def test_duplicate_submission(client, test_setup):
    """Test that duplicate submissions are rejected with 409"""
    token = test_setup["token"]
    report_month = "2024-01"

    # First submission
    form_data = {
        "report_month": report_month,
        "report_data": '{"meeting_type": "Monthly"}',
    }
    response1 = client.post(
        "/api/reports",
        data=form_data,
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response1.status_code == 201

    # Second submission (should fail)
    response2 = client.post(
        "/api/reports",
        data=form_data,
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response2.status_code == 409
    assert "already been submitted" in str(response2.json()).lower()


def test_attendance_validation(client, test_setup):
    """Test that attendance_total >= male + female"""
    token = test_setup["token"]

    form_data = {
        "report_month": "2024-02",
        "report_data": '''{
            "meeting_type": "Monthly",
            "attendance_total": 10,
            "attendance_male": 8,
            "attendance_female": 5
        }''',
    }
    response = client.post(
        "/api/reports",
        data=form_data,
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 422
    assert "attendance" in str(response.json()).lower()


def test_hepb_validation(client, test_setup):
    """Test that hepb_positive <= hepb_tested"""
    token = test_setup["token"]

    form_data = {
        "report_month": "2024-03",
        "report_data": '''{
            "meeting_type": "Monthly",
            "health_hepb_tested": 5,
            "health_hepb_positive": 10
        }''',
    }
    response = client.post(
        "/api/reports",
        data=form_data,
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 422
    assert "hepatitis" in str(response.json()).lower()


def test_action_tracker_size_limit(client, test_setup):
    """Test action_tracker max size validation"""
    token = test_setup["token"]

    # Create more than 10 items
    action_tracker = [
        {"action_point": f"Action {i}", "status": "Pending"}
        for i in range(11)
    ]

    form_data = {
        "report_month": "2024-04",
        "report_data": f'{{"meeting_type": "Monthly", "action_tracker": {action_tracker}}}',
    }
    response = client.post(
        "/api/reports",
        data=form_data,
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 422
    assert "action tracker" in str(response.json()).lower()


def test_next_meeting_date_future(client, test_setup):
    """Test that next_meeting_date must be in the future"""
    token = test_setup["token"]

    form_data = {
        "report_month": "2024-05",
        "report_data": '''{
            "meeting_type": "Monthly",
            "next_meeting_date": "2020-01-01"
        }''',
    }
    response = client.post(
        "/api/reports",
        data=form_data,
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 422
    assert "future" in str(response.json()).lower()


def test_valid_report_submission(client, test_setup):
    """Test successful report submission with valid data"""
    token = test_setup["token"]

    form_data = {
        "report_month": "2024-06",
        "report_data": '''{
            "meeting_type": "Monthly",
            "attendance_total": 20,
            "attendance_male": 12,
            "attendance_female": 8,
            "health_hepb_tested": 10,
            "health_hepb_positive": 2
        }''',
    }
    response = client.post(
        "/api/reports",
        data=form_data,
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 201
    data = response.json()
    assert data["report_month"] == "2024-06"
