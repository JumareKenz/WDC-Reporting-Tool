#!/usr/bin/env python3
"""
Test script to verify all challenge implementations
"""

import json
import urllib.request
import urllib.error
import sys

BASE_URL = "http://localhost:8000/api"

def test_backend_config():
    """Test Challenge 1: Token configuration"""
    print("\n=== Testing Challenge 1: Auto Logouts ===")
    
    # Check token expiry configuration
    try:
        import sys
        sys.path.insert(0, 'backend')
        from app.config import ACCESS_TOKEN_EXPIRE_MINUTES, REFRESH_TOKEN_EXPIRE_DAYS
        
        print(f"[OK] Access token expiry: {ACCESS_TOKEN_EXPIRE_MINUTES} minutes (expected: 480)")
        assert ACCESS_TOKEN_EXPIRE_MINUTES == 480, f"Expected 480, got {ACCESS_TOKEN_EXPIRE_MINUTES}"
        
        print(f"[OK] Refresh token expiry: {REFRESH_TOKEN_EXPIRE_DAYS} days (expected: 365)")
        assert REFRESH_TOKEN_EXPIRE_DAYS == 365, f"Expected 365, got {REFRESH_TOKEN_EXPIRE_DAYS}"
        
        print("[OK] Token configuration CORRECT")
        return True
    except Exception as e:
        print(f"[FAIL] Token configuration ERROR: {e}")
        return False

def test_auth_flow():
    """Test authentication flow"""
    print("\n=== Testing Authentication Flow ===")
    
    # Test login
    login_data = json.dumps({
        "email": "wdc.chk.1@kaduna.gov.ng",
        "password": "demo123"
    }).encode()
    
    try:
        req = urllib.request.Request(
            f"{BASE_URL}/auth/login",
            data=login_data,
            headers={'Content-Type': 'application/json'},
            method='POST'
        )
        response = urllib.request.urlopen(req)
        data = json.loads(response.read().decode())
        
        if data.get('success'):
            print("[OK] Login successful")
            print(f"[OK] Access token received: {data['access_token'][:20]}...")
            print(f"[OK] Refresh token received: {data['refresh_token'][:20]}...")
            
            # Test token refresh
            refresh_data = json.dumps({
                "refresh_token": data['refresh_token']
            }).encode()
            
            req = urllib.request.Request(
                f"{BASE_URL}/auth/refresh",
                data=refresh_data,
                headers={'Content-Type': 'application/json'},
                method='POST'
            )
            response = urllib.request.urlopen(req)
            refresh_result = json.loads(response.read().decode())
            
            if refresh_result.get('success'):
                print("[OK] Token refresh successful")
                print(f"[OK] New access token: {refresh_result['access_token'][:20]}...")
                print("[OK] Challenge 1 PASSED: Token refresh working")
                return True
            else:
                print("[FAIL] Token refresh failed")
                return False
        else:
            print("[FAIL] Login failed")
            return False
    except Exception as e:
        print(f"[FAIL] Auth flow ERROR: {e}")
        return False

def test_health_endpoint():
    """Test API health"""
    print("\n=== Testing API Health ===")
    
    try:
        response = urllib.request.urlopen(f"{BASE_URL}/health")
        data = json.loads(response.read().decode())
        
        if data.get('success') and data['data']['status'] == 'healthy':
            print(f"[OK] API is healthy")
            print(f"[OK] Database: {data['data']['database']}")
            print(f"[OK] CORS enabled: {data['data']['cors_enabled']}")
            return True
        else:
            print("[FAIL] API not healthy")
            return False
    except Exception as e:
        print(f"[FAIL] Health check ERROR: {e}")
        return False

def test_audio_extensions():
    """Test Challenge 3: Audio file extensions"""
    print("\n=== Testing Challenge 3: Audio Extensions ===")
    
    try:
        sys.path.insert(0, 'backend')
        from app.config import ALLOWED_AUDIO_EXTENSIONS
        
        expected = {".mp3", ".m4a", ".wav", ".ogg", ".webm", ".mp4", ".mov"}
        
        print(f"[OK] Allowed extensions: {ALLOWED_AUDIO_EXTENSIONS}")
        
        if expected.issubset(ALLOWED_AUDIO_EXTENSIONS):
            print("[OK] Challenge 3 PASSED: All required audio extensions supported")
            return True
        else:
            missing = expected - ALLOWED_AUDIO_EXTENSIONS
            print(f"[FAIL] Missing extensions: {missing}")
            return False
    except Exception as e:
        print(f"[FAIL] Audio extensions ERROR: {e}")
        return False

def test_frontend_files():
    """Test that frontend files exist"""
    print("\n=== Testing Frontend Files ===")
    
    import os
    
    files_to_check = [
        "frontend/src/components/common/ErrorSummary.jsx",
        "frontend/src/components/common/FormField.jsx",
        "frontend/src/components/common/DataFreshness.jsx",
        "frontend/src/components/common/OfflineStatusBar.jsx",
        "frontend/src/components/wdc/DraftRestoreDialog.jsx",
        "frontend/src/utils/errorParser.js",
        "frontend/src/utils/fileProcessor.js",
        "frontend/src/utils/chunkedUpload.js",
        "frontend/src/utils/attachmentStore.js",
        "frontend/src/hooks/useEnhancedDraft.js",
        "frontend/src/hooks/useDashboardQueries.js",
    ]
    
    all_exist = True
    for file in files_to_check:
        if os.path.exists(file):
            print(f"[OK] {file}")
        else:
            print(f"[FAIL] {file} MISSING")
            all_exist = False
    
    if all_exist:
        print("[OK] All frontend implementation files present")
    
    return all_exist

def main():
    print("=" * 60)
    print("KADWDC Implementation Test Suite")
    print("=" * 60)
    
    results = []
    
    # Run all tests
    results.append(("Backend Config", test_backend_config()))
    results.append(("Health Endpoint", test_health_endpoint()))
    results.append(("Auth Flow", test_auth_flow()))
    results.append(("Audio Extensions", test_audio_extensions()))
    results.append(("Frontend Files", test_frontend_files()))
    
    # Summary
    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for name, result in results:
        status = "[OK] PASSED" if result else "[FAIL] FAILED"
        print(f"{name:.<30} {status}")
    
    print("=" * 60)
    print(f"Total: {passed}/{total} tests passed")
    
    if passed == total:
        print("\nSUCCESS: ALL IMPLEMENTATIONS VERIFIED SUCCESSFULLY!")
        return 0
    else:
        print(f"\nWARNING:  {total - passed} test(s) failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())
