"""
Pytest configuration and fixtures for WDC Reporting System tests
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.database import Base, get_db
from app.models import User, LGA, Ward
from app.auth import get_password_hash

# Test database URL
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

# Create test engine
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db():
    """Create a fresh database for each test"""
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db):
    """Create a test client with database override"""
    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def test_password():
    """Standard test password"""
    return "Test123!@#"


@pytest.fixture
def seeded_db(db, test_password):
    """Database with test data"""
    hashed_password = get_password_hash(test_password)

    # Create LGAs
    lga1 = LGA(id=1, name="Birnin Gwari", code="BGW", population=214000, num_wards=2)
    lga2 = LGA(id=2, name="Chikun", code="CHK", population=372000, num_wards=2)
    db.add_all([lga1, lga2])
    db.commit()

    # Create Wards
    ward1 = Ward(id=1, lga_id=1, name="Magajin Gari I", code="BGW-01", population=15000)
    ward2 = Ward(id=2, lga_id=1, name="Gayam", code="BGW-02", population=17000)
    ward3 = Ward(id=3, lga_id=2, name="Chikun", code="CHK-01", population=20000)
    ward4 = Ward(id=4, lga_id=2, name="Gwagwada", code="CHK-02", population=22000)
    db.add_all([ward1, ward2, ward3, ward4])
    db.commit()

    # Create users
    state_user = User(
        id=1,
        email="state@test.com",
        password_hash=hashed_password,
        full_name="State Official",
        phone="08011111111",
        role="STATE_OFFICIAL",
        is_active=True
    )

    lga_user = User(
        id=2,
        email="lga@test.com",
        password_hash=hashed_password,
        full_name="LGA Coordinator",
        phone="08022222222",
        role="LGA_COORDINATOR",
        lga_id=1,
        is_active=True
    )

    wdc_user = User(
        id=3,
        email="wdc@test.com",
        password_hash=hashed_password,
        full_name="WDC Secretary",
        phone="08033333333",
        role="WDC_SECRETARY",
        ward_id=1,
        is_active=True
    )

    wdc_user2 = User(
        id=4,
        email="wdc2@test.com",
        password_hash=hashed_password,
        full_name="WDC Secretary 2",
        phone="08044444444",
        role="WDC_SECRETARY",
        ward_id=3,
        is_active=True
    )

    db.add_all([state_user, lga_user, wdc_user, wdc_user2])
    db.commit()

    return db


@pytest.fixture
def auth_headers(client, test_password):
    """Factory to get auth headers for different users"""
    def _get_headers(email):
        response = client.post(
            "/api/auth/login",
            json={"email": email, "password": test_password}
        )
        if response.status_code == 200:
            token = response.json()["access_token"]
            return {"Authorization": f"Bearer {token}"}
        return {}
    return _get_headers


@pytest.fixture
def state_headers(auth_headers, seeded_db):
    """Auth headers for state official"""
    return auth_headers("state@test.com")


@pytest.fixture
def lga_headers(auth_headers, seeded_db):
    """Auth headers for LGA coordinator"""
    return auth_headers("lga@test.com")


@pytest.fixture
def wdc_headers(auth_headers, seeded_db):
    """Auth headers for WDC secretary"""
    return auth_headers("wdc@test.com")


@pytest.fixture
def wdc2_headers(auth_headers, seeded_db):
    """Auth headers for second WDC secretary"""
    return auth_headers("wdc2@test.com")


@pytest.fixture
def sample_report_data():
    """Sample report data for testing"""
    from datetime import datetime
    return {
        "report_month": datetime.now().strftime("%Y-%m"),
        "meeting_type": "REGULAR",
        "meeting_date": datetime.now().strftime("%Y-%m-%d"),
        "attendance_male": 15,
        "attendance_female": 20,
        "attendance_total": 35,
        "health_hepb_tested": 10,
        "health_hepb_positive": 2,
        "health_hcg_tested": 8,
        "health_hcg_positive": 1,
        "health_hiv_tested": 12,
        "health_hiv_positive": 0,
        "health_malaria_tested": 15,
        "health_malaria_positive": 3,
        "children_registered": 25,
        "pregnant_women_registered": 8,
        "routine_immunization_done": True,
        "immunization_count": 20,
        "vitamin_a_given": True,
        "vitamin_a_count": 18,
        "deworming_done": True,
        "deworming_count": 22,
        "community_feedback": [
            "Good turnout",
            "Need supplies",
            "Parents cooperative",
            "Health workers present",
            "Venue adequate"
        ],
        "challenges": "Limited medical supplies",
        "action_taken": "Requested supplies",
        "next_meeting_date": "2026-03-15",
        "additional_notes": "Successful meeting"
    }
