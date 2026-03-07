# WDC Form Loading Fix - Summary

## Problem
The WDC form was getting stuck on "Loading saved draft..." indefinitely, preventing users from accessing the submission form.

## Root Causes Identified
1. **No timeout mechanism** - Draft loading could hang indefinitely if the server didn't respond
2. **Missing user data checks** - The form would try to load before user authentication was complete
3. **No error recovery** - If server request failed, there was no way to retry or skip
4. **Silent failures** - Errors were caught but not shown to users

## Changes Implemented

### 1. SubmitReportPage.jsx
**New Features:**
- **Timeout handling**: Draft loading now times out after 10 seconds max
- **User readiness check**: Waits for auth to complete before attempting draft load
- **Retry mechanism**: Users can retry loading or skip to a fresh form
- **Visual error states**: Clear UI when errors occur (offline vs server error)
- **AbortController**: Properly cancels in-flight requests on cleanup
- **Timeout warning**: Shows "skip" option if loading takes too long

**New States:**
- `isUserReady`: Tracks when user auth data is available
- `draftLoadError`: Stores error details for display
- `draftLoadRetryCount`: Tracks retry attempts

**New Handlers:**
- `handleRetryDraftLoad()`: Retry loading the draft
- `handleSkipDraftLoad()`: Skip draft loading and start fresh
- `withTimeout()`: Helper for adding timeouts to promises

### 2. api/reports.js
**Enhanced `getExistingDraft()`:**
- Added configurable timeout parameter (default 10s)
- Uses AbortController for proper cancellation
- Enhanced error messages:
  - Timeout errors: "Request timed out while loading draft..."
  - 404 errors: "Draft service is temporarily unavailable..."
- Adds `isTimeout` flag to errors for better handling

### 3. api/client.js
**New `makeRequest()` helper:**
- Standardized request making with timeout support
- Better error categorization:
  - `isTimeout`: Request took too long
  - `isNetworkError`: No connection to server
  - `userMessage`: Human-readable error message

## UI Improvements

### Loading States
1. **Waiting for profile**: Shows when auth data isn't ready yet
2. **Loading draft (normal)**: Standard spinner with "taking longer" warning
3. **Error state**: Shows icon, message, and action buttons

### Error Handling
When draft loading fails after retries:
- **Offline**: Shows WiFi-off icon, suggests waiting or starting fresh
- **Server error**: Shows file-x icon, offers retry or fresh start
- **Always allows**: Users can always skip and start with a fresh form

## API Endpoints (Verified Correct)
All frontend API calls already use the correct endpoints:
- `POST /api/reports` - Submit report ✓
- `POST /api/reports/draft` - Save draft ✓
- `GET /api/reports/draft/existing` - Get draft ✓
- `GET /api/reports/submission-info` - Check submission status ✓

## Testing Recommendations
1. **Slow network**: Test with 3G throttling to verify timeout works
2. **Offline mode**: Disconnect internet to see offline error state
3. **Server down**: Stop backend to test server error handling
4. **Fresh user**: Clear localStorage to test no-draft scenario
5. **Auth delay**: Slow down auth response to test user readiness check

## Backward Compatibility
- All changes are backward compatible
- Existing drafts in localStorage still load correctly
- Server draft loading still works if endpoint is available
- No breaking changes to component props or API
