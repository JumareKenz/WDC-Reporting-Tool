"""
Comprehensive endpoint testing for WDC Reporting System
Tests all endpoints with real data
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))

import requests
import json
from datetime import datetime

BASE_URL = "http://localhost:8000/api"

# Test credentials
TEST_USERS = {
    "wdc": {"email": "wdc.bgw.1@kaduna.gov.ng", "password": "demo123"},
    "lga": {"email": "coord.bgw@kaduna.gov.ng", "password": "demo123"},
    "state": {"email": "state.admin@kaduna.gov.ng", "password": "demo123"}
}

tokens = {}
test_data = {}

def test(name, func):
    """Test wrapper"""
    try:
        print(f"\n{'='*60}")
        print(f"TEST: {name}")
        print('='*60)
        func()
        print(f"[PASS] {name}")
        return True
    except Exception as e:
        print(f"[FAIL] {name}: {str(e)}")
        return False

def login_all_users():
    """Login all test users"""
    print("\n=== AUTHENTICATION TESTS ===")
    for role, creds in TEST_USERS.items():
        response = requests.post(f"{BASE_URL}/auth/login", json=creds)
        assert response.status_code == 200, f"Login failed for {role}"
        data = response.json()
        tokens[role] = data["access_token"]
        print(f"[OK] Logged in as {role}: {creds['email']}")

def get_headers(role):
    """Get auth headers for role"""
    return {"Authorization": f"Bearer {tokens[role]}"}

# =============================================================================
# AUTHENTICATION TESTS
# =============================================================================

def test_login_success():
    """Test successful login"""
    response = requests.post(f"{BASE_URL}/auth/login", json=TEST_USERS["wdc"])
    assert response.status_code == 200
    assert "access_token" in response.json()
    print("[OK] Login successful")

def test_login_invalid():
    """Test login with invalid credentials"""
    response = requests.post(f"{BASE_URL}/auth/login", json={
        "email": "invalid@test.com",
        "password": "wrong"
    })
    assert response.status_code == 401
    print("[OK] Invalid login rejected")

def test_me_endpoint():
    """Test /me endpoint"""
    response = requests.get(f"{BASE_URL}/auth/me", headers=get_headers("wdc"))
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["role"] == "WDC_SECRETARY"
    print(f"[OK] User profile retrieved: {data['full_name']}")

# =============================================================================
# LGA & WARD TESTS
# =============================================================================

def test_get_all_lgas():
    """Test getting all LGAs"""
    response = requests.get(f"{BASE_URL}/lgas", headers=get_headers("state"))
    assert response.status_code == 200
    data = response.json()["data"]
    assert len(data["lgas"]) == 23
    print(f"[OK] Retrieved {len(data['lgas'])} LGAs")

def test_get_lga_details():
    """Test getting specific LGA details"""
    response = requests.get(f"{BASE_URL}/lgas/1", headers=get_headers("state"))
    assert response.status_code == 200
    data = response.json()["data"]
    assert "wards" in data
    assert data["num_wards"] == len(data["wards"])
    print(f"[OK] Retrieved LGA: {data['name']} with {len(data['wards'])} wards")

def test_get_lga_wards_status():
    """Test getting LGA wards with status"""
    month = datetime.now().strftime("%Y-%m")
    response = requests.get(
        f"{BASE_URL}/lgas/1/wards?month={month}",
        headers=get_headers("lga")
    )
    assert response.status_code == 200
    data = response.json()["data"]
    assert "wards" in data
    assert "summary" in data
    print(f"[OK] Retrieved wards status: {data['summary']}")

# =============================================================================
# REPORT SUBMISSION TESTS
# =============================================================================

def test_check_submission_status():
    """Test checking submission status"""
    month = datetime.now().strftime("%Y-%m")
    response = requests.get(
        f"{BASE_URL}/reports/submission-status?month={month}",
        headers=get_headers("wdc")
    )
    assert response.status_code == 200
    data = response.json()["data"]
    print(f"[OK] Submission status: {data}")

def test_submit_report():
    """Test submitting a report"""
    report_data = {
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
        "community_feedback": ["Good turnout", "Need more supplies", "Parents cooperative", "Health workers present", "Venue adequate"],
        "challenges": "Limited medical supplies",
        "action_taken": "Requested additional supplies from LGA",
        "next_meeting_date": "2026-02-15",
        "additional_notes": "Successful meeting with good participation"
    }

    response = requests.post(
        f"{BASE_URL}/reports",
        json=report_data,
        headers=get_headers("wdc")
    )
    assert response.status_code == 201
    data = response.json()["data"]
    test_data["report_id"] = data["id"]
    print(f"[OK] Report submitted successfully: ID {data['id']}")

def test_get_my_reports():
    """Test getting my reports"""
    response = requests.get(
        f"{BASE_URL}/reports/my-reports",
        headers=get_headers("wdc")
    )
    assert response.status_code == 200
    data = response.json()["data"]
    assert len(data["reports"]) > 0
    print(f"[OK] Retrieved {len(data['reports'])} reports")

def test_get_report_details():
    """Test getting specific report details"""
    report_id = test_data.get("report_id")
    if not report_id:
        print("[SKIP] No report ID available")
        return

    response = requests.get(
        f"{BASE_URL}/reports/{report_id}",
        headers=get_headers("wdc")
    )
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["id"] == report_id
    print(f"[OK] Retrieved report details: {data['meeting_type']}")

def test_update_report():
    """Test updating a report"""
    report_id = test_data.get("report_id")
    if not report_id:
        print("[SKIP] No report ID available")
        return

    update_data = {
        "additional_notes": "Updated: Meeting was very successful with excellent participation"
    }

    response = requests.patch(
        f"{BASE_URL}/reports/{report_id}",
        json=update_data,
        headers=get_headers("wdc")
    )
    assert response.status_code == 200
    print(f"[OK] Report updated successfully")

# =============================================================================
# MESSAGING TESTS
# =============================================================================

def test_send_message_wdc_to_lga():
    """Test sending message from WDC to LGA"""
    message_data = {
        "message": "Test message from WDC Secretary to LGA Coordinator",
        "recipient_type": "LGA"
    }

    response = requests.post(
        f"{BASE_URL}/feedback",
        json=message_data,
        headers=get_headers("wdc")
    )
    assert response.status_code == 201
    data = response.json()["data"]
    test_data["message_id"] = data["id"]
    print(f"[OK] Message sent: ID {data['id']}")

def test_get_messages():
    """Test getting messages"""
    response = requests.get(
        f"{BASE_URL}/feedback",
        headers=get_headers("lga")
    )
    assert response.status_code == 200
    data = response.json()["data"]
    print(f"[OK] Retrieved {len(data['messages'])} messages")

def test_reply_to_message():
    """Test replying to a message"""
    message_id = test_data.get("message_id")
    if not message_id:
        print("[SKIP] No message ID available")
        return

    reply_data = {
        "message": "Reply: Thank you for your message",
        "parent_id": message_id
    }

    response = requests.post(
        f"{BASE_URL}/feedback",
        json=reply_data,
        headers=get_headers("lga")
    )
    assert response.status_code == 201
    print(f"[OK] Reply sent successfully")

def test_mark_message_read():
    """Test marking message as read"""
    message_id = test_data.get("message_id")
    if not message_id:
        print("[SKIP] No message ID available")
        return

    response = requests.patch(
        f"{BASE_URL}/feedback/{message_id}/read",
        headers=get_headers("lga")
    )
    assert response.status_code == 200
    print(f"[OK] Message marked as read")

# =============================================================================
# NOTIFICATION TESTS
# =============================================================================

def test_send_notification():
    """Test sending notification"""
    notification_data = {
        "ward_ids": [1, 2],
        "notification_type": "REMINDER",
        "title": "Test Reminder",
        "message": "This is a test reminder notification"
    }

    response = requests.post(
        f"{BASE_URL}/notifications",
        json=notification_data,
        headers=get_headers("lga")
    )
    assert response.status_code == 201
    print(f"[OK] Notification sent to 2 wards")

def test_get_notifications():
    """Test getting notifications"""
    response = requests.get(
        f"{BASE_URL}/notifications",
        headers=get_headers("wdc")
    )
    assert response.status_code == 200
    data = response.json()["data"]
    print(f"[OK] Retrieved {len(data['notifications'])} notifications")

# =============================================================================
# ANALYTICS TESTS
# =============================================================================

def test_state_overview():
    """Test state overview"""
    month = datetime.now().strftime("%Y-%m")
    response = requests.get(
        f"{BASE_URL}/analytics/overview?month={month}",
        headers=get_headers("state")
    )
    assert response.status_code == 200
    data = response.json()["data"]
    print(f"[OK] State overview: {data}")

def test_lga_comparison():
    """Test LGA comparison"""
    month = datetime.now().strftime("%Y-%m")
    response = requests.get(
        f"{BASE_URL}/analytics/lga-comparison?month={month}",
        headers=get_headers("state")
    )
    assert response.status_code == 200
    data = response.json()["data"]
    assert len(data["lgas"]) == 23
    print(f"[OK] LGA comparison retrieved for {len(data['lgas'])} LGAs")

def test_trends():
    """Test submission trends"""
    response = requests.get(
        f"{BASE_URL}/analytics/trends?months=6",
        headers=get_headers("state")
    )
    assert response.status_code == 200
    data = response.json()["data"]
    print(f"[OK] Trends retrieved: {len(data['trends'])} months")

# =============================================================================
# USER MANAGEMENT TESTS
# =============================================================================

def test_get_users_summary():
    """Test getting users summary"""
    response = requests.get(
        f"{BASE_URL}/users/summary",
        headers=get_headers("state")
    )
    assert response.status_code == 200
    data = response.json()["data"]
    print(f"[OK] Users summary: {data}")

# =============================================================================
# PROFILE TESTS
# =============================================================================

def test_get_profile():
    """Test getting profile"""
    response = requests.get(
        f"{BASE_URL}/profile/me",
        headers=get_headers("wdc")
    )
    assert response.status_code == 200
    data = response.json()["data"]
    print(f"[OK] Profile retrieved: {data['email']}")

def test_update_profile():
    """Test updating profile"""
    update_data = {
        "phone": "08012345678"
    }

    response = requests.patch(
        f"{BASE_URL}/profile/me",
        json=update_data,
        headers=get_headers("wdc")
    )
    assert response.status_code == 200
    print(f"[OK] Profile updated successfully")

# =============================================================================
# ERROR HANDLING TESTS
# =============================================================================

def test_unauthorized_access():
    """Test unauthorized access"""
    response = requests.get(f"{BASE_URL}/reports/my-reports")
    assert response.status_code == 401
    print("[OK] Unauthorized access blocked")

def test_invalid_ward_access():
    """Test accessing ward from different LGA"""
    response = requests.get(
        f"{BASE_URL}/lgas/99/wards",
        headers=get_headers("lga")
    )
    assert response.status_code in [403, 404]
    print("[OK] Invalid ward access blocked")

def test_duplicate_report_submission():
    """Test submitting duplicate report for same month"""
    report_data = {
        "report_month": datetime.now().strftime("%Y-%m"),
        "meeting_type": "REGULAR",
        "meeting_date": datetime.now().strftime("%Y-%m-%d"),
        "attendance_male": 10,
        "attendance_female": 15,
        "attendance_total": 25,
    }

    response = requests.post(
        f"{BASE_URL}/reports",
        json=report_data,
        headers=get_headers("wdc")
    )
    # Should fail with 409 or 400
    assert response.status_code in [400, 409]
    print("[OK] Duplicate report blocked")

# =============================================================================
# RUN ALL TESTS
# =============================================================================

def run_all_tests():
    """Run all tests"""
    print("\n" + "="*80)
    print("COMPREHENSIVE ENDPOINT TESTING")
    print("="*80)

    # Login first
    login_all_users()

    # Track results
    results = []

    # Authentication Tests
    results.append(test("Login Success", test_login_success))
    results.append(test("Login Invalid", test_login_invalid))
    results.append(test("Me Endpoint", test_me_endpoint))

    # LGA & Ward Tests
    results.append(test("Get All LGAs", test_get_all_lgas))
    results.append(test("Get LGA Details", test_get_lga_details))
    results.append(test("Get LGA Wards Status", test_get_lga_wards_status))

    # Report Tests
    results.append(test("Check Submission Status", test_check_submission_status))
    results.append(test("Submit Report", test_submit_report))
    results.append(test("Get My Reports", test_get_my_reports))
    results.append(test("Get Report Details", test_get_report_details))
    results.append(test("Update Report", test_update_report))

    # Messaging Tests
    results.append(test("Send Message WDC to LGA", test_send_message_wdc_to_lga))
    results.append(test("Get Messages", test_get_messages))
    results.append(test("Reply to Message", test_reply_to_message))
    results.append(test("Mark Message Read", test_mark_message_read))

    # Notification Tests
    results.append(test("Send Notification", test_send_notification))
    results.append(test("Get Notifications", test_get_notifications))

    # Analytics Tests
    results.append(test("State Overview", test_state_overview))
    results.append(test("LGA Comparison", test_lga_comparison))
    results.append(test("Trends", test_trends))

    # User Management Tests
    results.append(test("Get Users Summary", test_get_users_summary))

    # Profile Tests
    results.append(test("Get Profile", test_get_profile))
    results.append(test("Update Profile", test_update_profile))

    # Error Handling Tests
    results.append(test("Unauthorized Access", test_unauthorized_access))
    results.append(test("Invalid Ward Access", test_invalid_ward_access))
    results.append(test("Duplicate Report", test_duplicate_report_submission))

    # Summary
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    passed = sum(results)
    total = len(results)
    print(f"Passed: {passed}/{total}")
    print(f"Failed: {total - passed}/{total}")
    print(f"Success Rate: {(passed/total)*100:.1f}%")

    if passed == total:
        print("\n[SUCCESS] All tests passed!")
    else:
        print("\n[WARNING] Some tests failed. Check output above.")

if __name__ == "__main__":
    run_all_tests()
