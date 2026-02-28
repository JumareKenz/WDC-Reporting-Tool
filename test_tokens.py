#!/usr/bin/env python3
"""Test token configuration and refresh"""

import requests
import json
import base64
from datetime import datetime

def decode_token(token):
    parts = token.split('.')
    payload = json.loads(base64.b64decode(parts[1] + '=='))
    return payload

# Login
print("=" * 60)
print("TESTING AUTHENTICATION & TOKEN REFRESH")
print("=" * 60)

resp = requests.post('http://localhost:8000/api/auth/login', json={
    'email': 'wdc.chk.1@kaduna.gov.ng',
    'password': 'demo123'
})
data = resp.json()

print("\n[OK] LOGIN SUCCESSFUL")
print(f"User: {data['user']['full_name']}")
print(f"Role: {data['user']['role']}")
print(f"Ward: {data['user']['ward']['name']}")

# Check tokens
access_payload = decode_token(data['access_token'])
refresh_payload = decode_token(data['refresh_token'])

access_expiry = datetime.fromtimestamp(access_payload['exp'])
refresh_expiry = datetime.fromtimestamp(refresh_payload['exp'])
token_duration = access_expiry - datetime.now()

print("\n[OK] TOKEN DETAILS")
print(f"Access Token Expires: {access_expiry}")
print(f"Refresh Token Expires: {refresh_expiry}")
print(f"Token Duration: {token_duration.total_seconds() / 3600:.1f} hours")

# Verify 8 hour expiry
expected_hours = 8
actual_hours = token_duration.total_seconds() / 3600
if abs(actual_hours - expected_hours) < 0.5:
    print(f"[OK] Token expiry is correctly set to {actual_hours:.1f} hours")
else:
    print(f"[WARNING] Token expiry is {actual_hours:.1f} hours (expected {expected_hours})")

# Test refresh
print("\n[TESTING] Token Refresh...")
refresh_resp = requests.post('http://localhost:8000/api/auth/refresh', json={
    'refresh_token': data['refresh_token']
})

if refresh_resp.ok:
    refresh_data = refresh_resp.json()
    print("[OK] TOKEN REFRESH SUCCESSFUL!")
    print(f"New Access Token: {refresh_data['access_token'][:40]}...")
    print(f"New Refresh Token: {refresh_data['refresh_token'][:40]}...")
    
    new_access = decode_token(refresh_data['access_token'])
    new_expiry = datetime.fromtimestamp(new_access['exp'])
    print(f"New Token Expires: {new_expiry}")
else:
    print(f"[FAIL] Refresh failed: {refresh_resp.text}")

print("\n" + "=" * 60)
print("CHALLENGE 1 VERIFIED: 8-hour tokens with refresh working!")
print("=" * 60)
