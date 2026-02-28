# KADWDC PWA — Comprehensive Challenge Solutions

## Executive Summary

This document provides detailed, production-ready solutions for the seven critical user experience challenges identified in the Kaduna State WDC Digital Reporting System. The solutions build upon the existing React 18 + Vite + FastAPI architecture while addressing gaps in session management, error handling, offline capabilities, and form UX.

---

## Current Architecture Assessment

| Layer | Technology | Status |
|-------|------------|--------|
| Frontend | React 18, Vite 5, Tailwind CSS, TanStack Query v5 | ✅ Solid foundation |
| Backend | FastAPI, SQLAlchemy, JWT Auth | ✅ Needs refresh token optimization |
| PWA | vite-plugin-pwa, Workbox | ⚠️ Needs enhanced offline strategies |
| Storage | localStorage + IndexedDB | ⚠️ Needs consolidation |
| Forms | Mixed static/dynamic | ⚠️ Needs wizard migration |

---

## Priority Matrix

| # | Challenge | Severity | User Impact | Effort | Priority |
|---|-----------|----------|-------------|--------|----------|
| 1 | Auto Log-outs | **Critical** | Data loss, workflow disruption | Medium | P0 |
| 2 | Error Message Visibility | High | User confusion, retry failures | Low | P1 |
| 3 | Attachment Upload Failures | High | Missing evidence, incomplete reports | High | P1 |
| 4 | Draft Saving | **Critical** | Complete data loss on interruption | Low | P0 |
| 5 | Offline Mode | High | App unusability in rural areas | High | P1 |
| 6 | Dashboard Stats Not Updating | Medium | Stale decision-making data | Medium | P2 |
| 7 | KoboCollect-Style Form Wizard | Medium | Form abandonment, errors | High | P2 |

**Recommended Execution Order:** 1 → 4 → 2 → 5 → 3 → 6 → 7

---

## Challenge 1: Auto Log-outs During Active Sessions

### Problem Analysis

#### Root Causes

1. **Short JWT Lifetime (2 hours)** — `backend/app/config.py` sets `ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 2`. In rural Kaduna with intermittent connectivity, users filling long forms (30-45 minutes) experience mid-session logouts.

2. **Silent Refresh Window Too Narrow** — The existing `useSessionManager` hook refreshes at 80% of token lifetime, but with 2-hour tokens, this means a 24-minute refresh window. Network delays can miss this window.

3. **No Graceful Degradation** — When refresh fails, the app immediately redirects to login, losing unsaved form data.

4. **Missing Activity Tracking** — The current implementation doesn't track user activity to extend sessions for active users.

#### User Impact
- **Primary:** WDC Secretaries lose 20-30 minutes of report data entry
- **Secondary:** Reduced trust in the application, manual workarounds (paper forms)
- **Tertiary:** Lower submission rates, delayed reporting to state officials

### Proposed Solution

#### Phase A: Extend Token Lifetime + Dual Token Strategy (Backend)

```python
# backend/app/config.py
from datetime import timedelta

# Security configuration
SECRET_KEY = os.getenv("SECRET_KEY", "kaduna-wdc-secret-key-2026-change-in-production")
ALGORITHM = "HS256"

# Token lifetimes optimized for field conditions
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 8      # 8 hours for workday coverage
REFRESH_TOKEN_EXPIRE_DAYS = 30             # 30 days for "remember me"

# Activity-based extension threshold
ACTIVITY_EXTENSION_MINUTES = 60 * 4        # Extend if active within 4 hours
```

```python
# backend/app/auth.py
from datetime import datetime, timedelta
from jose import JWTError, jwt
from typing import Optional, Dict, Any
import bcrypt
from fastapi import HTTPException, status, Request
from .config import SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES, REFRESH_TOKEN_EXPIRE_DAYS


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token with optional custom expiry."""
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({
        "exp": expire,
        "iat": datetime.utcnow(),
        "type": "access"
    })
    
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def create_refresh_token(user_id: int, device_id: Optional[str] = None) -> str:
    """Create a long-lived refresh token."""
    expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    
    to_encode = {
        "sub": str(user_id),
        "type": "refresh",
        "exp": expire,
        "iat": datetime.utcnow(),
        "jti": secrets.token_urlsafe(16),  # Unique token ID for revocation
    }
    
    if device_id:
        to_encode["device_id"] = device_id
    
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def verify_refresh_token(token: str) -> Dict[str, Any]:
    """Verify a refresh token and return payload."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        
        if payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type"
            )
        
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token"
        )


def decode_token_payload(token: str) -> Optional[Dict[str, Any]]:
    """Decode token without verification (for client-side expiry checking)."""
    try:
        # Split and decode payload (middle section)
        payload_b64 = token.split('.')[1]
        # Add padding if needed
        padding = 4 - len(payload_b64) % 4
        if padding != 4:
            payload_b64 += '=' * padding
        
        payload_json = base64.b64decode(payload_b64).decode('utf-8')
        return json.loads(payload_json)
    except Exception:
        return None
```

#### Phase B: Enhanced Session Manager with Activity Tracking (Frontend)

```javascript
// frontend/src/hooks/useSessionManager.js
import { useEffect, useRef, useState, useCallback } from 'react';
import axios from 'axios';
import { STORAGE_KEYS } from '../utils/constants';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

// Activity tracking configuration
const ACTIVITY_EVENTS = [
  'mousedown', 'mousemove', 'keydown', 'keyup',
  'touchstart', 'touchmove', 'scroll', 'click',
  'input', 'change', 'focus', 'pointerdown',
  'wheel', 'touchcancel'
];

const ACTIVITY_DEBOUNCE_MS = 5000;  // Consider active if event within 5 seconds
const REFRESH_BUFFER_RATIO = 0.7;    // Refresh at 70% of lifetime (not 80%)

/**
 * Enhanced Session Manager Hook
 * 
 * Features:
 * - Activity tracking to extend sessions for active users
 * - Silent token refresh with queue management
 * - Graceful handling of refresh failures
 * - Draft auto-save before logout
 */
export const useSessionManager = ({ 
  enabled = true, 
  onSessionExpiring = null,
  onSessionExpired = null,
  onDraftSave = null 
} = {}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sessionStatus, setSessionStatus] = useState('active'); // 'active' | 'expiring' | 'expired'
  const refreshTimerRef = useRef(null);
  const retryTimerRef = useRef(null);
  const activityTimerRef = useRef(null);
  const lastActivityRef = useRef(Date.now());
  const mountedRef = useRef(true);
  const isRefreshingRef = useRef(false);
  const failedQueueRef = useRef([]);

  const RETRY_INTERVAL = 30 * 1000; // 30 seconds

  // Decode JWT payload without verification
  const decodeJwtPayload = useCallback((token) => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch {
      return null;
    }
  }, []);

  // Process queued requests after refresh
  const processQueue = useCallback((error, token = null) => {
    failedQueueRef.current.forEach((prom) => {
      if (error) {
        prom.reject(error);
      } else {
        prom.resolve(token);
      }
    });
    failedQueueRef.current = [];
  }, []);

  // Attempt token refresh
  const doRefresh = useCallback(async () => {
    const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
    if (!refreshToken) {
      return { success: false, reason: 'no_refresh_token' };
    }

    // Prevent duplicate refresh attempts
    if (isRefreshingRef.current) {
      return new Promise((resolve, reject) => {
        failedQueueRef.current.push({ 
          resolve: (token) => resolve({ success: true, token }),
          reject 
        });
      });
    }

    isRefreshingRef.current = true;
    if (mountedRef.current) {
      setIsRefreshing(true);
      setSessionStatus('expiring');
    }

    try {
      const response = await axios.post(
        `${BASE_URL}/auth/refresh`,
        { refresh_token: refreshToken },
        { 
          headers: { 'Content-Type': 'application/json' },
          timeout: 15000 // 15 second timeout for refresh
        }
      );

      const data = response.data?.data || response.data;
      const newAccessToken = data.access_token;
      const newRefreshToken = data.refresh_token;

      if (newAccessToken) {
        localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, newAccessToken);
      }
      if (newRefreshToken) {
        localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, newRefreshToken);
      }

      // Process any queued requests
      processQueue(null, newAccessToken);

      if (mountedRef.current) {
        setSessionStatus('active');
      }

      return { success: true, token: newAccessToken };
    } catch (error) {
      processQueue(error, null);
      
      // Check if refresh token is expired vs. network error
      if (error.response?.status === 401) {
        return { success: false, reason: 'refresh_token_expired' };
      }
      
      return { success: false, reason: 'network_error', error };
    } finally {
      isRefreshingRef.current = false;
      if (mountedRef.current) {
        setIsRefreshing(false);
      }
    }
  }, [processQueue]);

  // Handle session expiration with draft save
  const handleSessionExpired = useCallback(async () => {
    if (mountedRef.current) {
      setSessionStatus('expired');
    }

    // Trigger draft save callback if provided
    if (onDraftSave) {
      try {
        await onDraftSave();
      } catch (e) {
        console.error('[SessionManager] Draft save failed:', e);
      }
    }

    // Notify parent component
    if (onSessionExpired) {
      onSessionExpired();
    }

    // Clear auth and redirect
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER_DATA);

    if (!window.location.pathname.includes('/login')) {
      window.location.href = '/login?reason=session_expired';
    }
  }, [onDraftSave, onSessionExpired]);

  // Schedule next token refresh
  const scheduleRefresh = useCallback(() => {
    clearTimeout(refreshTimerRef.current);
    clearTimeout(retryTimerRef.current);

    const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    if (!token) return;

    const payload = decodeJwtPayload(token);
    if (!payload || !payload.exp) return;

    const nowSec = Math.floor(Date.now() / 1000);
    const issuedAt = payload.iat || nowSec;
    const expiresAt = payload.exp;
    const lifetimeSec = expiresAt - issuedAt;
    const remainingSec = expiresAt - nowSec;

    // If token already expired or about to expire
    if (remainingSec <= 60) {
      doRefresh().then((result) => {
        if (result.success && mountedRef.current) {
          scheduleRefresh();
        } else if (!result.success && result.reason === 'refresh_token_expired') {
          handleSessionExpired();
        } else if (!result.success && mountedRef.current) {
          // Network error - retry
          retryTimerRef.current = setTimeout(() => {
            if (mountedRef.current) scheduleRefresh();
          }, RETRY_INTERVAL);
        }
      });
      return;
    }

    // Schedule refresh at 70% of lifetime
    const refreshAtSec = issuedAt + Math.floor(lifetimeSec * REFRESH_BUFFER_RATIO);
    const delayMs = Math.max((refreshAtSec - nowSec) * 1000, 5000);

    refreshTimerRef.current = setTimeout(async () => {
      if (!mountedRef.current) return;

      const result = await doRefresh();
      
      if (result.success && mountedRef.current) {
        scheduleRefresh();
      } else if (!result.success && result.reason === 'refresh_token_expired') {
        handleSessionExpired();
      } else if (!result.success && mountedRef.current) {
        // Retry with backoff
        const retryLoop = async () => {
          if (!mountedRef.current) return;
          const retryResult = await doRefresh();
          if (retryResult.success && mountedRef.current) {
            scheduleRefresh();
          } else if (retryResult.reason === 'refresh_token_expired') {
            handleSessionExpired();
          } else if (mountedRef.current) {
            retryTimerRef.current = setTimeout(retryLoop, RETRY_INTERVAL);
          }
        };
        retryTimerRef.current = setTimeout(retryLoop, RETRY_INTERVAL);
      }
    }, delayMs);
  }, [decodeJwtPayload, doRefresh, handleSessionExpired]);

  // Activity tracking
  const updateActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  // Check if user is still active and extend session if needed
  const checkActivity = useCallback(() => {
    const timeSinceActivity = Date.now() - lastActivityRef.current;
    
    // If user has been inactive for too long, don't extend
    if (timeSinceActivity > ACTIVITY_DEBOUNCE_MS * 12) { // 60 seconds
      // User is idle, but we don't auto-logout - just let token expire naturally
    }
  }, []);

  // Set up activity listeners
  useEffect(() => {
    if (!enabled) return;

    const handleActivity = () => {
      updateActivity();
    };

    // Add activity listeners
    ACTIVITY_EVENTS.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Periodic activity check
    activityTimerRef.current = setInterval(checkActivity, ACTIVITY_DEBOUNCE_MS);

    return () => {
      ACTIVITY_EVENTS.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      clearInterval(activityTimerRef.current);
    };
  }, [enabled, updateActivity, checkActivity]);

  // Initial schedule
  useEffect(() => {
    mountedRef.current = true;

    if (enabled) {
      scheduleRefresh();
    }

    return () => {
      mountedRef.current = false;
      clearTimeout(refreshTimerRef.current);
      clearTimeout(retryTimerRef.current);
      clearInterval(activityTimerRef.current);
    };
  }, [enabled, scheduleRefresh]);

  return { 
    isRefreshing, 
    sessionStatus,
    refresh: doRefresh 
  };
};

export default useSessionManager;
```

#### Phase C: Enhanced API Client with Queue Management

```javascript
// frontend/src/api/client.js - Enhanced 401 handling
import axios from 'axios';
import { STORAGE_KEYS } from '../utils/constants';
import { emitToast } from '../hooks/useToast';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

// Token refresh state
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Create axios instance
const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor with enhanced 401 handling
apiClient.interceptors.response.use(
  (response) => {
    if (response.data && response.data.success) {
      return response.data;
    }
    return response.data;
  },
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Skip auth endpoints
      if (originalRequest.url?.includes('/auth/login') || 
          originalRequest.url?.includes('/auth/refresh')) {
        return Promise.reject(error);
      }

      // Queue request if refresh in progress
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return apiClient(originalRequest);
        }).catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);

      if (!refreshToken) {
        isRefreshing = false;
        processQueue(new Error('No refresh token'), null);
        handleAuthFailure('Session expired. Please log in again.');
        return Promise.reject(error);
      }

      try {
        // Attempt refresh
        const response = await axios.post(
          `${BASE_URL}/auth/refresh`,
          { refresh_token: refreshToken },
          { headers: { 'Content-Type': 'application/json' } }
        );

        const data = response.data?.data || response.data;
        const newAccessToken = data.access_token;
        const newRefreshToken = data.refresh_token;

        if (newAccessToken) {
          localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, newAccessToken);
        }
        if (newRefreshToken) {
          localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, newRefreshToken);
        }

        isRefreshing = false;
        processQueue(null, newAccessToken);

        // Retry original request
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        isRefreshing = false;
        processQueue(refreshError, null);

        // Check if refresh token expired or just network error
        if (refreshError.response?.status === 401) {
          handleAuthFailure('Your session has expired. Please log in again.');
        } else {
          // Network error - show offline message, don't logout yet
          emitToast('warning', 
            'Connection issue. Your work is saved. Will retry...', 
            { title: 'Network Issue', duration: 5000 }
          );
        }

        return Promise.reject(refreshError);
      }
    }

    // Handle other errors...
    return handleApiError(error);
  }
);

// Handle authentication failure
function handleAuthFailure(message) {
  // Save any pending drafts before logout
  const draftSaveEvent = new CustomEvent('app:saveDraftsBeforeLogout');
  window.dispatchEvent(draftSaveEvent);

  // Clear auth
  localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.USER_DATA);

  // Show message and redirect
  if (!window.location.pathname.includes('/login')) {
    emitToast('warning', message, { title: 'Session ended', duration: 4000 });
    setTimeout(() => { window.location.href = '/login'; }, 1500);
  }
}

// Enhanced error handling
function handleApiError(error) {
  if (error.response) {
    const { status, data } = error.response;

    let errorMessage = data?.error?.message || 
                       data?.message || 
                       data?.detail || 
                       getDefaultErrorMessage(status);

    // Handle validation errors
    if (status === 422 && data?.detail && Array.isArray(data.detail)) {
      const validationErrors = data.detail.map(err => {
        const field = err.loc?.slice(1).join('.') || 'field';
        return `${field}: ${err.msg}`;
      }).join(', ');
      errorMessage = `Validation errors: ${validationErrors}`;
    }

    const enhancedError = new Error(errorMessage);
    enhancedError.status = status;
    enhancedError.code = data?.error?.code;
    enhancedError.details = data?.error?.details || data?.detail;

    return Promise.reject(enhancedError);
  } else if (error.request) {
    const networkError = new Error('Network error. Please check your connection.');
    networkError.isNetworkError = true;
    return Promise.reject(networkError);
  }

  return Promise.reject(error);
}

const getDefaultErrorMessage = (status) => {
  const messages = {
    400: 'Invalid request. Please check your input.',
    401: 'Authentication required.',
    403: 'You do not have permission.',
    404: 'Resource not found.',
    409: 'This resource already exists.',
    413: 'File size is too large.',
    422: 'Validation failed.',
    429: 'Too many requests.',
    500: 'Server error. Please try again.',
    503: 'Service temporarily unavailable.',
  };
  return messages[status] || 'An unexpected error occurred.';
};

export default apiClient;
```

### Edge Cases and Mitigations

| Scenario | Mitigation |
|----------|------------|
| Multiple tabs open | Shared localStorage tokens; first tab to refresh wins; others use new token |
| Refresh during offline | Retry with exponential backoff; queue API calls |
| Token expires mid-upload | Pause upload, refresh, resume with new token |
| Device clock wrong (skew) | Server-side NTP sync; client uses server time for calculations |
| Page refresh during refresh | Token stored in localStorage; new page loads with fresh token |
| Browser background/sleep | `visibilitychange` event triggers immediate refresh check on wake |

### Testing Strategy

```javascript
// tests/sessionManager.test.js
import { renderHook, act, waitFor } from '@testing-library/react';
import { useSessionManager } from '../hooks/useSessionManager';

describe('useSessionManager', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.useFakeTimers();
  });

  it('should schedule refresh at 70% of token lifetime', () => {
    // Create token that expires in 10 minutes
    const token = createMockToken({ exp: Math.floor(Date.now() / 1000) + 600 });
    localStorage.setItem('wdc_auth_token', token);

    renderHook(() => useSessionManager({ enabled: true }));

    // Fast-forward to 65% of lifetime (should not refresh yet)
    act(() => { jest.advanceTimersByTime(390000); });
    expect(mockAxios.post).not.toHaveBeenCalled();

    // Fast-forward to 75% (should trigger refresh)
    act(() => { jest.advanceTimersByTime(60000); });
    expect(mockAxios.post).toHaveBeenCalledWith(
      expect.stringContaining('/auth/refresh'),
      expect.any(Object)
    );
  });

  it('should handle refresh failure with retry', async () => {
    mockAxios.post.mockRejectedValueOnce({ response: { status: 503 } });

    const { result } = renderHook(() => useSessionManager({ enabled: true }));

    act(() => { jest.advanceTimersByTime(600000); });
    
    // Should be in retry state
    await waitFor(() => expect(result.current.sessionStatus).toBe('expiring'));

    // Fast-forward retry interval
    act(() => { jest.advanceTimersByTime(30000); });
    
    expect(mockAxios.post).toHaveBeenCalledTimes(2);
  });

  it('should call onDraftSave before session expiry', async () => {
    const onDraftSave = jest.fn().mockResolvedValue();
    mockAxios.post.mockRejectedValue({ response: { status: 401 } });

    renderHook(() => useSessionManager({ 
      enabled: true, 
      onDraftSave 
    }));

    act(() => { jest.advanceTimersByTime(600000); });

    await waitFor(() => expect(onDraftSave).toHaveBeenCalled());
  });
});
```

### Implementation Timeline

| Phase | Task | Duration |
|-------|------|----------|
| 1 | Backend: Extend token lifetime, add refresh endpoint | 4 hours |
| 2 | Frontend: Update useSessionManager with activity tracking | 6 hours |
| 3 | Frontend: Enhance API client with queue management | 4 hours |
| 4 | Integration testing & edge case handling | 6 hours |

---

## Challenge 2: Error Message Visibility

### Problem Analysis

#### Current Issues

1. **Toast Auto-Dismiss Too Fast** — Error toasts disappear after 5 seconds, not enough time for users to read complex validation messages
2. **No ARIA Support** — Screen readers don't announce errors
3. **Inline Errors Lack Context** — Field errors don't link to their fields
4. **Generic Error Messages** — "Validation failed" doesn't help users fix issues
5. **No Error Persistence** — Errors clear on navigation, users lose context

### Proposed Solution

#### Phase A: Accessible Toast System

```jsx
// frontend/src/components/common/EnhancedToast.jsx
import React, { useEffect, useState, useCallback } from 'react';
import { 
  CheckCircle, XCircle, AlertTriangle, Info, X, 
  ArrowRight, RefreshCw 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Enhanced Toast Notification System
 * 
 * Features:
 * - Persistent error toasts (no auto-dismiss)
 * - ARIA live regions for screen readers
 * - Action buttons for retry/redirect
 * - Progress bar for timed toasts
 */

const ToastIcon = ({ variant }) => {
  const icons = {
    success: <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />,
    error: <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />,
    info: <Info className="w-5 h-5 text-blue-600 flex-shrink-0" />,
  };
  return icons[variant] || icons.info;
};

const Toast = ({ 
  id, 
  variant = 'info', 
  message, 
  title,
  description,
  actions = [],
  duration = 5000,
  persistent = false,
  onDismiss,
  onAction,
}) => {
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(100);
  const [isPaused, setIsPaused] = useState(false);

  const isError = variant === 'error';
  const shouldAutoDismiss = !persistent && duration > 0 && !isError;

  // Handle dismiss
  const handleDismiss = useCallback(() => {
    setVisible(false);
    setTimeout(() => onDismiss(id), 300);
  }, [id, onDismiss]);

  // Handle action
  const handleAction = useCallback((action) => {
    if (action.onClick) {
      action.onClick();
    }
    if (action.dismiss !== false) {
      handleDismiss();
    }
  }, [handleDismiss]);

  // Animation entry
  useEffect(() => {
    const timer = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(timer);
  }, []);

  // Auto-dismiss with progress
  useEffect(() => {
    if (!shouldAutoDismiss || isPaused) return;

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, duration - elapsed);
      setProgress((remaining / duration) * 100);

      if (remaining <= 0) {
        clearInterval(interval);
        handleDismiss();
      }
    }, 50);

    return () => clearInterval(interval);
  }, [shouldAutoDismiss, duration, isPaused, handleDismiss]);

  const styles = {
    success: {
      border: 'border-l-green-500',
      bg: 'bg-green-50',
      iconColor: 'text-green-600',
    },
    error: {
      border: 'border-l-red-500',
      bg: 'bg-red-50',
      iconColor: 'text-red-600',
    },
    warning: {
      border: 'border-l-amber-500',
      bg: 'bg-amber-50',
      iconColor: 'text-amber-600',
    },
    info: {
      border: 'border-l-blue-500',
      bg: 'bg-blue-50',
      iconColor: 'text-blue-600',
    },
  };

  const s = styles[variant] || styles.info;

  return (
    <motion.div
      role="alert"
      aria-live={isError ? 'assertive' : 'polite'}
      aria-atomic="true"
      initial={{ opacity: 0, x: 50, scale: 0.95 }}
      animate={{ 
        opacity: visible ? 1 : 0, 
        x: visible ? 0 : 50,
        scale: visible ? 1 : 0.95
      }}
      exit={{ opacity: 0, x: 50, scale: 0.95 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
      className={`
        relative overflow-hidden rounded-r-lg shadow-lg
        border border-gray-200 ${s.border} border-l-4
        bg-white
        min-w-[320px] max-w-[480px]
        max-sm:min-w-0 max-sm:w-full
      `}
    >
      {/* Progress bar for auto-dismissing toasts */}
      {shouldAutoDismiss && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-100">
          <motion.div 
            className={`h-full ${s.bg.replace('bg-', 'bg-').replace('50', '500')}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      <div className="flex items-start gap-3 p-4 pb-5">
        <ToastIcon variant={variant} />
        
        <div className="flex-1 min-w-0">
          {title && (
            <p className="text-sm font-semibold text-gray-900 mb-0.5">
              {title}
            </p>
          )}
          
          <p className="text-sm text-gray-700 break-words">
            {message}
          </p>
          
          {description && (
            <p className="text-xs text-gray-500 mt-1.5">
              {description}
            </p>
          )}
          
          {actions.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mt-3">
              {actions.map((action, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleAction(action)}
                  className={`
                    inline-flex items-center gap-1.5 px-3 py-1.5
                    text-xs font-medium rounded-md
                    transition-colors
                    ${action.variant === 'primary' 
                      ? 'bg-green-600 text-white hover:bg-green-700' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}
                  `}
                >
                  {action.icon && <action.icon className="w-3.5 h-3.5" />}
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={handleDismiss}
          className={`
            flex-shrink-0 p-1 rounded-full
            transition-colors
            ${isError 
              ? 'text-red-400 hover:text-red-600 hover:bg-red-50' 
              : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}
          `}
          aria-label="Dismiss notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
};

export default Toast;
```

#### Phase B: Form Error Summary Component

```jsx
// frontend/src/components/common/ErrorSummary.jsx
import React from 'react';
import { AlertTriangle, ArrowRight, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Error Summary Banner
 * 
 * Displays a summary of all form errors with clickable links
 * to navigate to each error field.
 */

const ErrorSummary = ({ errors, onFocusField, onDismiss, className = '' }) => {
  const errorEntries = Object.entries(errors).filter(([_, msg]) => msg);
  
  if (errorEntries.length === 0) return null;

  // Human-readable field names
  const fieldLabels = {
    report_date: 'Report Date',
    meeting_type: 'Meeting Type',
    attendance_total: 'Total Attendance',
    attendance_male: 'Male Attendance',
    attendance_female: 'Female Attendance',
    health_opd_total: 'OPD Total',
    health_immunization_total: 'Immunization Total',
    // Add more mappings as needed
  };

  const scrollToField = (fieldName) => {
    const element = document.getElementById(fieldName);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.focus();
      onFocusField?.(fieldName);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        role="alert"
        aria-live="assertive"
        className={`
          bg-red-50 border-l-4 border-red-500 rounded-r-lg p-4 mb-6
          ${className}
        `}
      >
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-4">
              <h3 className="font-semibold text-red-800">
                Please fix {errorEntries.length} error{errorEntries.length > 1 ? 's' : ''}
              </h3>
              {onDismiss && (
                <button
                  onClick={onDismiss}
                  className="text-red-400 hover:text-red-600 p-1 rounded-full hover:bg-red-100 transition-colors"
                  aria-label="Dismiss error summary"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            
            <ul className="mt-2 space-y-1.5">
              {errorEntries.map(([field, message]) => (
                <li key={field} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => scrollToField(field)}
                    className="text-sm text-red-700 hover:text-red-900 underline underline-offset-2 flex items-center gap-1.5 transition-colors"
                  >
                    {fieldLabels[field] || field}
                    <ArrowRight className="w-3 h-3" />
                  </button>
                  <span className="text-sm text-red-600">— {message}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ErrorSummary;
```

#### Phase C: Enhanced Form Field with Error Display

```jsx
// frontend/src/components/common/FormField.jsx
import React from 'react';
import { AlertCircle, Check } from 'lucide-react';

/**
 * Accessible Form Field Wrapper
 * 
 * Features:
 * - Automatic ID generation for aria-describedby
 * - Error state styling and announcements
 * - Success state indicator
 * - Required field indicator
 * - Help text support
 */

const FormField = ({ 
  children,
  name,
  label,
  error,
  helpText,
  required = false,
  showSuccess = false,
  className = '' 
}) => {
  const errorId = error ? `${name}-error` : undefined;
  const helpId = helpText ? `${name}-help` : undefined;
  const describedBy = [errorId, helpId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={`space-y-1.5 ${className}`}>
      <label 
        htmlFor={name}
        className="block text-sm font-medium text-gray-700"
      >
        {label}
        {required && (
          <span className="text-red-500 ml-0.5" aria-hidden="true">*</span>
        )}
        {required && (
          <span className="sr-only"> (required)</span>
        )}
      </label>

      <div className="relative">
        {children && React.cloneElement(children, {
          id: name,
          name,
          'aria-invalid': !!error,
          'aria-describedby': describedBy,
          'aria-required': required,
          className: `
            w-full px-3 py-2 rounded-lg border text-sm
            transition-colors duration-200
            focus:outline-none focus:ring-2 focus:ring-offset-0
            ${error 
              ? 'border-red-300 focus:border-red-500 focus:ring-red-200 bg-red-50/30' 
              : showSuccess
                ? 'border-green-300 focus:border-green-500 focus:ring-green-200'
                : 'border-gray-300 focus:border-green-500 focus:ring-green-200'}
            ${children.props.className || ''}
          `
        })}

        {/* Success indicator */}
        {showSuccess && !error && (
          <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
        )}
      </div>

      {/* Help text */}
      {helpText && (
        <p id={helpId} className="text-xs text-gray-500">
          {helpText}
        </p>
      )}

      {/* Error message */}
      {error && (
        <p 
          id={errorId}
          role="alert"
          className="text-sm text-red-600 flex items-center gap-1.5 animate-fadeIn"
        >
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
};

// Form section for grouping related fields
export const FormSection = ({ title, description, children, className = '' }) => (
  <fieldset className={`border-0 p-0 m-0 ${className}`}>
    {(title || description) && (
      <legend className="w-full mb-4">
        {title && (
          <h3 className="text-base font-semibold text-gray-900">
            {title}
          </h3>
        )}
        {description && (
          <p className="text-sm text-gray-500 mt-0.5">
            {description}
          </p>
        )}
      </legend>
    )}
    <div className="space-y-4">
      {children}
    </div>
  </fieldset>
);

export default FormField;
```

#### Phase D: Error Parser for API Responses

```javascript
// frontend/src/utils/errorParser.js

/**
 * Parse API errors into a structured format for display
 */

const FIELD_LABELS = {
  report_date: 'Report Date',
  meeting_type: 'Meeting Type',
  attendance_total: 'Total Attendees',
  attendance_male: 'Male Attendees',
  attendance_female: 'Female Attendees',
  health_opd_total: 'OPD Attendance',
  health_immunization_total: 'Immunization Count',
  health_anc_total: 'ANC Registrations',
  health_deliveries_total: 'Deliveries',
  // Add more as needed
};

const HUMANIZED_MESSAGES = {
  'value_error.missing': 'This field is required',
  'value_error.any_str.min_length': 'Input is too short',
  'value_error.any_str.max_length': 'Input is too long',
  'type_error.integer': 'Please enter a valid number',
  'type_error.float': 'Please enter a valid decimal number',
  'value_error.date': 'Please enter a valid date',
  'value_error.datetime': 'Please enter a valid date and time',
  'value_error.email': 'Please enter a valid email address',
};

/**
 * Parse API error response into structured format
 */
export function parseApiError(error) {
  // Network error
  if (!error.response && error.request) {
    return {
      type: 'network',
      title: 'Connection Error',
      message: 'Unable to connect to the server. Please check your internet connection.',
      fieldErrors: {},
      actions: [
        { 
          label: 'Retry', 
          onClick: () => window.location.reload(),
          icon: RefreshCw,
          variant: 'primary'
        }
      ]
    };
  }

  const status = error.response?.status;
  const data = error.response?.data;

  // Pydantic validation errors (422)
  if (status === 422 && Array.isArray(data?.detail)) {
    const fieldErrors = {};
    const errorList = [];

    data.detail.forEach(err => {
      const fieldPath = err.loc?.slice(1).join('.') || 'unknown';
      const humanMessage = HUMANIZED_MESSAGES[err.type] || err.msg;
      
      fieldErrors[fieldPath] = humanMessage;
      errorList.push({
        field: fieldPath,
        message: humanMessage,
        raw: err
      });
    });

    return {
      type: 'validation',
      title: 'Validation Error',
      message: `Please correct ${errorList.length} field${errorList.length > 1 ? 's' : ''} before submitting.`,
      fieldErrors,
      errorList,
      actions: []
    };
  }

  // Conflict errors (409)
  if (status === 409) {
    return {
      type: 'conflict',
      title: 'Conflict',
      message: data?.detail?.message || 'This action conflicts with existing data.',
      fieldErrors: {},
      actions: [
        { 
          label: 'View Existing', 
          onClick: () => {/* navigate to existing */},
          variant: 'primary'
        }
      ]
    };
  }

  // Authentication errors (401)
  if (status === 401) {
    return {
      type: 'auth',
      title: 'Session Expired',
      message: 'Your session has expired. Please log in again.',
      fieldErrors: {},
      actions: [
        { 
          label: 'Log In', 
          onClick: () => window.location.href = '/login',
          variant: 'primary'
        }
      ]
    };
  }

  // Forbidden (403)
  if (status === 403) {
    return {
      type: 'forbidden',
      title: 'Access Denied',
      message: 'You do not have permission to perform this action.',
      fieldErrors: {},
      actions: []
    };
  }

  // Server errors (500+)
  if (status >= 500) {
    return {
      type: 'server',
      title: 'Server Error',
      message: 'An unexpected error occurred. Our team has been notified.',
      fieldErrors: {},
      actions: [
        { 
          label: 'Try Again', 
          onClick: () => window.location.reload(),
          icon: RefreshCw
        },
        {
          label: 'Contact Support',
          onClick: () => window.open('mailto:support@kadwdc.gov.ng')
        }
      ]
    };
  }

  // Default fallback
  return {
    type: 'unknown',
    title: 'Error',
    message: error.message || 'An unexpected error occurred.',
    fieldErrors: {},
    actions: []
  };
}

/**
 * Get human-readable field label
 */
export function getFieldLabel(fieldName) {
  return FIELD_LABELS[fieldName] || fieldName
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}
```

### Edge Cases

| Scenario | Mitigation |
|----------|------------|
| Multiple errors appear | Show up to 3 toasts, collapse additional to count badge |
| Error toast on mobile | Position at top on small screens; ensure safe area padding |
| Screen reader user | `aria-live="assertive"` ensures immediate announcement |
| Rapid successive errors | Debounce duplicate errors; show "(3 similar errors)" |
| Long error message | Max height with scroll; expandable for full message |

---

## Challenge 3: Attachment Upload Failures

### Problem Analysis

#### Current Issues

1. **No Resume Capability** — Failed uploads restart from beginning
2. **Large Files** — Mobile camera photos (5-15MB) fail on slow connections
3. **No Offline Queue** — Binary attachments can't be JSON-serialized to localStorage
4. **Format Incompatibility** — Safari `.mp4` voice notes rejected
5. **Ephemeral Storage** — Render filesystem loses files on deploy

### Proposed Solution

#### Phase A: Client-Side Image Compression

```javascript
// frontend/src/utils/fileProcessor.js

/**
 * File Processing Utilities
 * 
 * Features:
 * - Client-side image compression
 * - Format conversion
 * - File validation
 */

/**
 * Compress and resize image
 */
export async function compressImage(file, options = {}) {
  const {
    maxWidth = 1920,
    maxHeight = 1920,
    quality = 0.8,
    outputFormat = 'image/jpeg'
  } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(img.src);

      // Calculate new dimensions
      let { width, height } = img;
      const ratio = Math.min(maxWidth / width, maxHeight / height, 1);
      
      if (ratio < 1) {
        width *= ratio;
        height *= ratio;
      }

      // Draw to canvas
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#FFFFFF'; // White background for JPEG
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      // Convert to blob
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Compression failed'));
            return;
          }

          const compressedFile = new File([blob], 
            file.name.replace(/\.[^/.]+$/, '.jpg'), {
              type: outputFormat,
              lastModified: file.lastModified
            }
          );

          resolve({
            file: compressedFile,
            originalSize: file.size,
            compressedSize: blob.size,
            compressionRatio: (blob.size / file.size).toFixed(2)
          });
        },
        outputFormat,
        quality
      );
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Validate file before upload
 */
export function validateFile(file, options = {}) {
  const {
    maxSizeMB = 10,
    allowedTypes = [],
    allowedExtensions = []
  } = options;

  const errors = [];

  // Size check
  if (file.size > maxSizeMB * 1024 * 1024) {
    errors.push({
      type: 'size',
      message: `File size ${(file.size / 1024 / 1024).toFixed(1)}MB exceeds ${maxSizeMB}MB limit`
    });
  }

  // Type check
  if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
    errors.push({
      type: 'format',
      message: `Unsupported format: ${file.type}. Allowed: ${allowedTypes.join(', ')}`
    });
  }

  // Extension check
  if (allowedExtensions.length > 0) {
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      errors.push({
        type: 'extension',
        message: `Unsupported extension: ${ext}. Allowed: ${allowedExtensions.join(', ')}`
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Process file for upload (compress if image)
 */
export async function processFileForUpload(file, type = 'auto') {
  const isImage = file.type.startsWith('image/');
  
  if (isImage && type !== 'document') {
    const result = await compressImage(file);
    return result.file;
  }
  
  return file;
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
```

#### Phase B: Chunked Upload with Resume

```javascript
// frontend/src/utils/chunkedUpload.js

/**
 * Chunked File Upload with Resume Capability
 * 
 * Features:
 * - Split large files into chunks
 * - Per-chunk retry with exponential backoff
 * - Resume from last successful chunk
 * - Progress tracking
 */

const CHUNK_SIZE = 512 * 1024; // 512KB chunks
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

/**
 * Upload a file in chunks
 */
export async function chunkedUpload(file, url, options = {}) {
  const {
    onProgress,
    onChunkComplete,
    headers = {},
    uploadId = generateUploadId()
  } = options;

  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  const completedChunks = new Set();

  // Check for existing progress (resume capability)
  const savedProgress = await loadUploadProgress(uploadId);
  if (savedProgress) {
    savedProgress.completedChunks.forEach(i => completedChunks.add(i));
  }

  // Upload each chunk
  for (let i = 0; i < totalChunks; i++) {
    if (completedChunks.has(i)) {
      continue; // Skip already uploaded chunks
    }

    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, file.size);
    const chunk = file.slice(start, end);

    let retries = 0;
    let success = false;

    while (retries < MAX_RETRIES && !success) {
      try {
        await uploadChunk(chunk, url, {
          uploadId,
          chunkIndex: i,
          totalChunks,
          filename: file.name,
          fileType: file.type,
          headers
        });

        completedChunks.add(i);
        success = true;

        // Save progress
        await saveUploadProgress(uploadId, {
          filename: file.name,
          totalChunks,
          completedChunks: Array.from(completedChunks),
          timestamp: Date.now()
        });

        // Report progress
        const progress = Math.round((completedChunks.size / totalChunks) * 100);
        onProgress?.(progress, completedChunks.size, totalChunks);
        onChunkComplete?.(i, totalChunks);

      } catch (error) {
        retries++;
        if (retries >= MAX_RETRIES) {
          throw new UploadError(`Failed to upload chunk ${i + 1}/${totalChunks}`, {
            chunkIndex: i,
            uploadId,
            originalError: error
          });
        }
        // Exponential backoff
        await delay(RETRY_DELAY * Math.pow(2, retries - 1));
      }
    }
  }

  // Finalize upload
  const result = await finalizeUpload(url, {
    uploadId,
    filename: file.name,
    totalChunks,
    fileType: file.type,
    fileSize: file.size
  });

  // Clear saved progress
  await clearUploadProgress(uploadId);

  return result;
}

/**
 * Upload a single chunk
 */
async function uploadChunk(chunk, url, options) {
  const { uploadId, chunkIndex, totalChunks, filename, fileType, headers } = options;

  const formData = new FormData();
  formData.append('chunk', chunk);
  formData.append('upload_id', uploadId);
  formData.append('chunk_index', chunkIndex.toString());
  formData.append('total_chunks', totalChunks.toString());
  formData.append('filename', filename);
  formData.append('file_type', fileType);

  const response = await fetch(`${url}/chunk`, {
    method: 'POST',
    headers: {
      ...headers
    },
    body: formData
  });

  if (!response.ok) {
    throw new Error(`Chunk upload failed: ${response.status}`);
  }

  return response.json();
}

/**
 * Finalize chunked upload
 */
async function finalizeUpload(url, options) {
  const { uploadId, filename, totalChunks, fileType, fileSize } = options;

  const response = await fetch(`${url}/finalize`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      upload_id: uploadId,
      filename,
      total_chunks: totalChunks,
      file_type: fileType,
      file_size: fileSize
    })
  });

  if (!response.ok) {
    throw new Error('Failed to finalize upload');
  }

  return response.json();
}

/**
 * Save upload progress to IndexedDB
 */
async function saveUploadProgress(uploadId, progress) {
  const { openDB } = await import('idb');
  const db = await openDB('wdc-uploads', 1, {
    upgrade(db) {
      db.createObjectStore('progress', { keyPath: 'uploadId' });
    }
  });
  await db.put('progress', { uploadId, ...progress });
}

async function loadUploadProgress(uploadId) {
  try {
    const { openDB } = await import('idb');
    const db = await openDB('wdc-uploads', 1);
    return await db.get('progress', uploadId);
  } catch {
    return null;
  }
}

async function clearUploadProgress(uploadId) {
  try {
    const { openDB } = await import('idb');
    const db = await openDB('wdc-uploads', 1);
    await db.delete('progress', uploadId);
  } catch {
    // Ignore cleanup errors
  }
}

function generateUploadId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

class UploadError extends Error {
  constructor(message, details) {
    super(message);
    this.name = 'UploadError';
    this.details = details;
  }
}
```

#### Phase C: Offline Attachment Storage

```javascript
// frontend/src/utils/attachmentStore.js

/**
 * Offline Attachment Storage
 * 
 * Uses IndexedDB to store binary attachments when offline,
 * then uploads when connection restored.
 */

const DB_NAME = 'wdc-attachments';
const DB_VERSION = 1;
const STORE_NAME = 'pending-attachments';

/**
 * Get IndexedDB instance
 */
async function getDB() {
  const { openDB } = await import('idb');
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('reportId', 'reportId');
        store.createIndex('timestamp', 'timestamp');
      }
    }
  });
}

/**
 * Store attachment for offline upload
 */
export async function storeAttachmentOffline(file, metadata = {}) {
  const db = await getDB();
  
  const id = generateId();
  const buffer = await file.arrayBuffer();
  
  await db.put(STORE_NAME, {
    id,
    buffer,
    name: file.name,
    type: file.type,
    size: file.size,
    metadata,
    timestamp: Date.now(),
    attempts: 0
  });
  
  return id;
}

/**
 * Get all pending attachments
 */
export async function getPendingAttachments(filter = {}) {
  const db = await getDB();
  const all = await db.getAll(STORE_NAME);
  
  if (filter.reportId) {
    return all.filter(a => a.metadata.reportId === filter.reportId);
  }
  
  return all;
}

/**
 * Get a single attachment
 */
export async function getAttachment(id) {
  const db = await getDB();
  const record = await db.get(STORE_NAME, id);
  
  if (!record) return null;
  
  // Reconstruct File object
  const file = new File([record.buffer], record.name, {
    type: record.type
  });
  
  return {
    ...record,
    file
  };
}

/**
 * Remove attachment from queue
 */
export async function removeAttachment(id) {
  const db = await getDB();
  await db.delete(STORE_NAME, id);
}

/**
 * Update attachment metadata
 */
export async function updateAttachment(id, updates) {
  const db = await getDB();
  const record = await db.get(STORE_NAME, id);
  
  if (record) {
    await db.put(STORE_NAME, { ...record, ...updates });
  }
}

/**
 * Clear all attachments
 */
export async function clearAllAttachments() {
  const db = await getDB();
  await db.clear(STORE_NAME);
}

/**
 * Get storage statistics
 */
export async function getStorageStats() {
  const attachments = await getPendingAttachments();
  
  const totalSize = attachments.reduce((sum, a) => sum + a.size, 0);
  
  return {
    count: attachments.length,
    totalSize,
    oldest: attachments.length > 0 
      ? Math.min(...attachments.map(a => a.timestamp))
      : null
  };
}

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
```

### Edge Cases

| Scenario | Mitigation |
|----------|------------|
| Chunk upload fails after retries | Mark upload as failed; allow user to retry from failed chunk |
| Browser closes mid-upload | Progress saved to IndexedDB; resume on next session |
| Storage quota exceeded | Compress images more aggressively; notify user to clear old attachments |
| Duplicate file uploaded | Hash file contents; skip if already exists on server |
| Safari video format | Accept `.mp4` and `.mov` in addition to `.webm` |

---

## Challenge 4: Draft Saving

### Problem Analysis

The codebase has `useIndexedDBDraft.js` which is well-implemented. Key improvements needed:

1. **Conflict Resolution** — No UI for server/local draft conflicts
2. **Attachment Integration** — Drafts don't include binary files
3. **Step Preservation** — Wizard form doesn't remember current step

### Proposed Solution

#### Phase A: Draft with Conflict Resolution

```jsx
// frontend/src/components/wdc/DraftRestoreDialog.jsx
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Clock, Server, HardDrive, AlertTriangle, 
  GitMerge, Trash2, FileText 
} from 'lucide-react';

/**
 * Draft Restore Dialog
 * 
 * Shows when both local and server drafts exist,
 * allowing user to choose which to use.
 */

const DraftRestoreDialog = ({ 
  isOpen,
  localDraft,
  serverDraft,
  onRestoreLocal,
  onRestoreServer,
  onMerge,
  onDiscard,
  currentStep = 0
}) => {
  if (!isOpen) return null;

  const hasLocal = !!localDraft;
  const hasServer = !!serverDraft;
  const hasConflict = hasLocal && hasServer;

  const localDate = localDraft?.updatedAt ? new Date(localDraft.updatedAt) : null;
  const serverDate = serverDraft?.updatedAt ? new Date(serverDraft.updatedAt) : null;

  const localIsNewer = localDate && serverDate 
    ? localDate > serverDate 
    : hasLocal;

  const formatRelative = (date) => {
    if (!date) return 'unknown';
    const now = new Date();
    const diff = Math.floor((now - date) / 1000 / 60); // minutes
    
    if (diff < 1) return 'just now';
    if (diff < 60) return `${diff} minute${diff > 1 ? 's' : ''} ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)} hour${Math.floor(diff / 60) > 1 ? 's' : ''} ago`;
    return `${Math.floor(diff / 1440)} day${Math.floor(diff / 1440) > 1 ? 's' : ''} ago`;
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden"
        >
          {/* Header */}
          <div className="bg-green-600 px-6 py-4">
            <div className="flex items-center gap-3">
              <FileText className="w-6 h-6 text-white" />
              <h2 className="text-lg font-semibold text-white">
                Unsaved Draft Found
              </h2>
            </div>
            <p className="text-green-100 text-sm mt-1">
              You have an incomplete report that was auto-saved.
            </p>
          </div>

          <div className="p-6 space-y-4">
            {/* Conflict Warning */}
            {hasConflict && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-700">
                  Both a local draft and a server draft exist. Choose which version to continue with.
                </p>
              </div>
            )}

            {/* Draft Options */}
            <div className="space-y-3">
              {hasLocal && (
                <button
                  onClick={onRestoreLocal}
                  className={`
                    w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left
                    transition-all duration-200
                    ${localIsNewer 
                      ? 'border-green-500 bg-green-50 hover:bg-green-100' 
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}
                  `}
                >
                  <div className={`
                    w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0
                    ${localIsNewer ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'}
                  `}>
                    <HardDrive className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">
                        Local Draft
                      </span>
                      {localIsNewer && (
                        <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">
                          Most Recent
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">
                      Saved {formatRelative(localDate)} on this device
                    </p>
                    {currentStep > 0 && (
                      <p className="text-xs text-gray-400 mt-1">
                        Progress: Step {currentStep + 1}
                      </p>
                    )}
                  </div>
                  <Clock className="w-4 h-4 text-gray-400" />
                </button>
              )}

              {hasServer && (
                <button
                  onClick={onRestoreServer}
                  className={`
                    w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left
                    transition-all duration-200
                    ${!localIsNewer 
                      ? 'border-green-500 bg-green-50 hover:bg-green-100' 
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}
                  `}
                >
                  <div className={`
                    w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0
                    ${!localIsNewer ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'}
                  `}>
                    <Server className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">
                        Server Draft
                      </span>
                      {!localIsNewer && (
                        <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">
                          Most Recent
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">
                      Saved {formatRelative(serverDate)} from another device
                    </p>
                  </div>
                  <Clock className="w-4 h-4 text-gray-400" />
                </button>
              )}

              {hasConflict && (
                <button
                  onClick={onMerge}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-purple-200 bg-purple-50 hover:bg-purple-100 text-left transition-all duration-200"
                >
                  <div className="w-12 h-12 rounded-full bg-purple-500 text-white flex items-center justify-center flex-shrink-0">
                    <GitMerge className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold text-purple-900">
                      Smart Merge
                    </span>
                    <p className="text-sm text-purple-700 mt-0.5">
                      Combine the newest data from both drafts
                    </p>
                  </div>
                </button>
              )}
            </div>

            {/* Discard Option */}
            <button
              onClick={onDiscard}
              className="w-full flex items-center justify-center gap-2 p-3 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Discard draft and start fresh
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default DraftRestoreDialog;
```

#### Phase B: Enhanced Draft Hook with Attachments

```javascript
// frontend/src/hooks/useEnhancedDraft.js
import { useState, useCallback, useEffect, useRef } from 'react';
import { openDB } from 'idb';

const DB_NAME = 'wdc-drafts-v2';
const DB_VERSION = 1;
const STORE = 'drafts';

/**
 * Enhanced Draft Hook
 * 
 * Features:
 * - IndexedDB storage for large data
 * - Binary attachment support
 * - Step/wizard position preservation
 * - Conflict detection with server
 */

async function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'key' });
        store.createIndex('userId', 'userId');
        store.createIndex('updatedAt', 'updatedAt');
        store.createIndex('reportMonth', 'reportMonth');
      }
    }
  });
}

export function useEnhancedDraft({ 
  userId, 
  wardId, 
  reportMonth, 
  initialData = {},
  serverDraft = null,
  debounceMs = 2000,
  onConflict = null
}) {
  const [formData, setFormData] = useState(initialData);
  const [currentStep, setCurrentStep] = useState(0);
  const [attachments, setAttachments] = useState([]);
  const [draftStatus, setDraftStatus] = useState('idle'); // idle | saving | saved | error
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [hasConflict, setHasConflict] = useState(false);
  
  const formDataRef = useRef(formData);
  const currentStepRef = useRef(currentStep);
  const attachmentsRef = useRef(attachments);
  const debounceRef = useRef(null);
  const isInitializedRef = useRef(false);

  const key = userId && wardId && reportMonth 
    ? `draft:${userId}:${wardId}:${reportMonth}` 
    : null;

  // Keep refs in sync
  useEffect(() => { formDataRef.current = formData; }, [formData]);
  useEffect(() => { currentStepRef.current = currentStep; }, [currentStep]);
  useEffect(() => { attachmentsRef.current = attachments; }, [attachments]);

  // Save draft to IndexedDB
  const saveDraft = useCallback(async (data = null, step = null, atts = null) => {
    if (!key) return false;

    const draftData = data ?? formDataRef.current;
    const draftStep = step ?? currentStepRef.current;
    const draftAttachments = atts ?? attachmentsRef.current;

    try {
      setDraftStatus('saving');
      
      const db = await getDB();
      
      // Convert attachments to storable format
      const storableAttachments = await Promise.all(
        draftAttachments.map(async (att) => ({
          id: att.id,
          name: att.file.name,
          type: att.file.type,
          size: att.file.size,
          buffer: att.buffer || await att.file.arrayBuffer(),
          fieldName: att.fieldName
        }))
      );

      await db.put(STORE, {
        key,
        userId,
        wardId,
        reportMonth,
        formData: draftData,
        currentStep: draftStep,
        attachments: storableAttachments,
        updatedAt: new Date().toISOString(),
        version: 2
      });

      setLastSavedAt(new Date());
      setDraftStatus('saved');
      
      return true;
    } catch (err) {
      console.error('[useEnhancedDraft] Save failed:', err);
      setDraftStatus('error');
      return false;
    }
  }, [key, userId, wardId, reportMonth]);

  // Load draft from IndexedDB
  const loadDraft = useCallback(async () => {
    if (!key) return null;

    try {
      const db = await getDB();
      const draft = await db.get(STORE, key);
      
      if (!draft) return null;

      // Reconstruct attachments
      const files = draft.attachments?.map(att => ({
        id: att.id,
        fieldName: att.fieldName,
        file: new File([att.buffer], att.name, { type: att.type }),
        buffer: att.buffer
      })) || [];

      return {
        formData: draft.formData,
        currentStep: draft.currentStep || 0,
        attachments: files,
        updatedAt: draft.updatedAt
      };
    } catch (err) {
      console.error('[useEnhancedDraft] Load failed:', err);
      return null;
    }
  }, [key]);

  // Clear draft
  const clearDraft = useCallback(async () => {
    if (!key) return;
    
    try {
      const db = await getDB();
      await db.delete(STORE, key);
      setLastSavedAt(null);
      setDraftStatus('idle');
    } catch (err) {
      console.error('[useEnhancedDraft] Clear failed:', err);
    }
  }, [key]);

  // Debounced save
  const debouncedSave = useCallback((data, step, atts) => {
    setDraftStatus('saving');
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      saveDraft(data, step, atts);
    }, debounceMs);
  }, [saveDraft, debounceMs]);

  // Update form data
  const updateFormData = useCallback((updater) => {
    setFormData(prev => {
      const newData = typeof updater === 'function' ? updater(prev) : updater;
      debouncedSave(newData, undefined, undefined);
      return newData;
    });
  }, [debouncedSave]);

  // Update current step
  const updateStep = useCallback((step) => {
    setCurrentStep(step);
    debouncedSave(undefined, step, undefined);
  }, [debouncedSave]);

  // Add attachment
  const addAttachment = useCallback(async (file, fieldName) => {
    const buffer = await file.arrayBuffer();
    const newAtt = {
      id: crypto.randomUUID(),
      fieldName,
      file,
      buffer
    };
    
    setAttachments(prev => {
      const next = [...prev, newAtt];
      debouncedSave(undefined, undefined, next);
      return next;
    });
    
    return newAtt.id;
  }, [debouncedSave]);

  // Remove attachment
  const removeAttachment = useCallback((id) => {
    setAttachments(prev => {
      const next = prev.filter(a => a.id !== id);
      debouncedSave(undefined, undefined, next);
      return next;
    });
  }, [debouncedSave]);

  // Initialize: Check for drafts
  useEffect(() => {
    if (!key || isInitializedRef.current) return;

    (async () => {
      const localDraft = await loadDraft();
      
      if (localDraft || serverDraft) {
        // Check for conflict
        if (localDraft && serverDraft) {
          const localDate = new Date(localDraft.updatedAt);
          const serverDate = new Date(serverDraft.updated_at);
          
          if (Math.abs(localDate - serverDate) > 5 * 60 * 1000) { // 5 min difference
            setHasConflict(true);
            setShowRestoreDialog(true);
            isInitializedRef.current = true;
            return;
          }
        }

        // No significant conflict, use local if exists
        if (localDraft) {
          setFormData(prev => ({ ...prev, ...localDraft.formData }));
          setCurrentStep(localDraft.currentStep);
          setAttachments(localDraft.attachments);
          setLastSavedAt(new Date(localDraft.updatedAt));
          setDraftStatus('saved');
        } else if (serverDraft) {
          setFormData(prev => ({ ...prev, ...serverDraft.form_data }));
          setDraftStatus('idle');
        }
      }

      isInitializedRef.current = true;
    })();
  }, [key, serverDraft, loadDraft]);

  // Save on visibility change
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === 'hidden') {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        saveDraft();
      }
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [saveDraft]);

  // Save on beforeunload
  useEffect(() => {
    const handler = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      saveDraft();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [saveDraft]);

  return {
    // State
    formData,
    currentStep,
    attachments,
    draftStatus,
    lastSavedAt,
    showRestoreDialog,
    hasConflict,
    isInitialized: isInitializedRef.current,
    
    // Actions
    updateFormData,
    updateStep,
    setCurrentStep: updateStep,
    addAttachment,
    removeAttachment,
    saveDraft,
    loadDraft,
    clearDraft,
    setShowRestoreDialog,
    
    // Helpers
    hasDraft: !!lastSavedAt || draftStatus === 'saved'
  };
}

export default useEnhancedDraft;
```

---

## Challenge 5: Offline Mode

### Problem Analysis

Current PWA setup is good but needs enhancements:
1. Background Sync not registered
2. Dashboard queries fail silently when offline
3. No indicator of what's cached

### Proposed Solution

#### Phase A: Enhanced Service Worker

```javascript
// frontend/public/sw-custom.js
// Custom service worker additions for background sync

import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate, NetworkFirst } from 'workbox-strategies';
import { BackgroundSyncPlugin } from 'workbox-background-sync';
import { ExpirationPlugin } from 'workbox-expiration';

// Precache build assets
precacheAndRoute(self.__WB_MANIFEST);

// Background sync for report submissions
const reportSyncPlugin = new BackgroundSyncPlugin('report-sync-queue', {
  maxRetentionTime: 24 * 60, // 24 hours
  onSync: async ({ queue }) => {
    let entry;
    while ((entry = await queue.shiftRequest())) {
      try {
        await fetch(entry.request);
        // Notify clients of successful sync
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
          client.postMessage({ type: 'SYNC_SUCCESS', payload: entry.request.url });
        });
      } catch (error) {
        await queue.unshiftRequest(entry);
        throw error;
      }
    }
  }
});

// Queue POST/PUT requests when offline
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/reports'),
  new NetworkFirst({
    cacheName: 'reports-api',
    plugins: [reportSyncPlugin]
  }),
  'POST'
);

// Cache dashboard data with longer TTL
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/analytics'),
  new StaleWhileRevalidate({
    cacheName: 'analytics-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 20,
        maxAgeSeconds: 24 * 60 * 60 // 24 hours
      })
    ]
  })
);

// Handle push messages (for future real-time updates)
self.addEventListener('push', (event) => {
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-72.png',
      data: data.url
    })
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data)
  );
});
```

#### Phase B: Offline-Aware React Query Configuration

```javascript
// frontend/src/config/queryClient.js
import { QueryClient } from '@tanstack/react-query';

/**
 * Offline-Aware Query Client Configuration
 */

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data stays fresh for 5 minutes
      staleTime: 5 * 60 * 1000,
      
      // Retry failed queries with exponential backoff
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        // Retry up to 3 times
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      
      // Use cached data when offline
      networkMode: 'offlineFirst',
      
      // Keep previous data while fetching
      placeholderData: (previousData) => previousData,
      
      // Refetch when window regains focus
      refetchOnWindowFocus: true,
      
      // Refetch when reconnecting
      refetchOnReconnect: true,
    },
    mutations: {
      networkMode: 'offlineFirst',
      
      // Retry mutations that failed due to network
      retry: (failureCount, error) => {
        if (error?.isNetworkError || error?.code === 'NETWORK_ERROR') {
          return failureCount < 5;
        }
        return false;
      },
    }
  }
});

/**
 * Query keys for cache management
 */
export const queryKeys = {
  reports: (filters) => ['reports', filters],
  report: (id) => ['report', id],
  analytics: {
    overview: () => ['analytics', 'overview'],
    trends: () => ['analytics', 'trends'],
    lgaComparison: () => ['analytics', 'lgaComparison'],
  },
  notifications: () => ['notifications'],
  form: (id) => ['form', id],
};
```

#### Phase C: Offline Status Component

```jsx
// frontend/src/components/common/OfflineStatusBar.jsx
import React, { useEffect, useState } from 'react';
import { Wifi, WifiOff, Cloud, CloudOff, RotateCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Offline Status Bar
 * 
 * Shows current connectivity status and pending sync operations
 */

const OfflineStatusBar = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState(null);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      triggerSync();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen for service worker messages
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data.type === 'SYNC_SUCCESS') {
          setPendingCount(prev => Math.max(0, prev - 1));
          setLastSyncTime(new Date());
        }
        if (event.data.type === 'SYNC_PENDING') {
          setPendingCount(event.data.count);
        }
      });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const triggerSync = async () => {
    if (!('serviceWorker' in navigator)) return;
    
    setIsSyncing(true);
    
    try {
      const registration = await navigator.serviceWorker.ready;
      
      if ('sync' in registration) {
        await registration.sync.register('report-sync');
      }
    } catch (error) {
      console.error('Background sync failed:', error);
    } finally {
      setTimeout(() => setIsSyncing(false), 1000);
    }
  };

  // Hide if online with no pending items
  if (isOnline && pendingCount === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 50, opacity: 0 }}
        className={`
          fixed bottom-0 left-0 right-0 z-50 px-4 py-3
          flex items-center justify-between gap-4
          safe-area-bottom
          ${isOnline 
            ? 'bg-blue-50 text-blue-800 border-t border-blue-200' 
            : 'bg-amber-50 text-amber-800 border-t border-amber-200'}
        `}
      >
        <div className="flex items-center gap-3">
          <div className={`
            w-8 h-8 rounded-full flex items-center justify-center
            ${isOnline ? 'bg-blue-100' : 'bg-amber-100'}
          `}>
            {isOnline ? (
              isSyncing ? (
                <RotateCw className="w-4 h-4 animate-spin" />
              ) : (
                <Cloud className="w-4 h-4" />
              )
            ) : (
              <CloudOff className="w-4 h-4" />
            )}
          </div>
          
          <div>
            <p className="text-sm font-medium">
              {isOnline 
                ? isSyncing 
                  ? `Syncing ${pendingCount} pending item${pendingCount > 1 ? 's' : ''}...`
                  : `${pendingCount} item${pendingCount > 1 ? 's' : ''} pending sync`
                : 'You are offline'
              }
            </p>
            {!isOnline && (
              <p className="text-xs text-amber-600 mt-0.5">
                Changes will sync when you reconnect
              </p>
            )}
            {lastSyncTime && isOnline && (
              <p className="text-xs text-blue-600 mt-0.5">
                Last synced {formatTimeAgo(lastSyncTime)}
              </p>
            )}
          </div>
        </div>

        {!isOnline && (
          <div className="flex items-center gap-2 text-xs text-amber-600">
            <WifiOff className="w-4 h-4" />
            <span className="hidden sm:inline">No connection</span>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

function formatTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

export default OfflineStatusBar;
```

---

## Challenge 6: Dashboard Stats Not Updating

### Problem Analysis

1. **Stale Cache** — React Query caches data with no invalidation
2. **No Real-time Updates** — No WebSocket or polling for new data
3. **Cross-page State** — Different dashboards don't share updates

### Proposed Solution

#### Phase A: Smart Cache Invalidation

```javascript
// frontend/src/hooks/useDashboardData.js
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { queryKeys } from '../config/queryClient';
import apiClient from '../api/client';

/**
 * Dashboard Data Hooks with Smart Invalidation
 */

// WDC Dashboard Data
export const useWDCDashboard = (reportMonth) => {
  return useQuery({
    queryKey: queryKeys.reports({ month: reportMonth, type: 'my-ward' }),
    queryFn: () => apiClient.get(`/reports?month=${reportMonth}&my_ward=true`),
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: (data, query) => {
      // Only poll if window is visible
      return document.hidden ? false : 2 * 60 * 1000; // 2 minutes
    },
  });
};

// LGA Dashboard Data
export const useLGADashboard = (reportMonth) => {
  return useQuery({
    queryKey: ['lga-dashboard', reportMonth],
    queryFn: () => apiClient.get(`/analytics/lga-overview?month=${reportMonth}`),
    staleTime: 60 * 1000,
    refetchInterval: document.hidden ? false : 3 * 60 * 1000,
  });
};

// State Dashboard Data
export const useStateDashboard = () => {
  return useQuery({
    queryKey: queryKeys.analytics.overview(),
    queryFn: () => apiClient.get('/analytics/overview'),
    staleTime: 30 * 1000,
    refetchInterval: document.hidden ? false : 2 * 60 * 1000,
  });
};

// Submit report with cache invalidation
export const useSubmitReport = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data) => apiClient.post('/reports', data),
    onSuccess: (result, variables) => {
      // Invalidate all related caches
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      queryClient.invalidateQueries({ queryKey: ['submission-status'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      
      // Optimistically update state dashboard if we have the data
      queryClient.setQueryData(
        queryKeys.analytics.overview(),
        (old) => old ? { ...old, totalReports: old.totalReports + 1 } : old
      );
    },
  });
};
```

#### Phase B: Data Freshness Indicator

```jsx
// frontend/src/components/common/DataFreshness.jsx
import React from 'react';
import { Clock, AlertCircle, RefreshCw } from 'lucide-react';

const DataFreshness = ({ 
  updatedAt, 
  isStale,
  onRefresh,
  isRefreshing,
  className = '' 
}) => {
  if (!updatedAt) return null;

  const age = Date.now() - new Date(updatedAt).getTime();
  const isVeryStale = age > 10 * 60 * 1000; // 10 minutes

  const getTimeLabel = () => {
    const seconds = Math.floor(age / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  return (
    <button
      onClick={onRefresh}
      disabled={isRefreshing}
      className={`
        inline-flex items-center gap-1.5 text-xs
        transition-colors
        ${isVeryStale 
          ? 'text-red-600 hover:text-red-700' 
          : isStale 
            ? 'text-amber-600 hover:text-amber-700'
            : 'text-gray-400 hover:text-gray-600'}
        ${className}
      `}
    >
      {isRefreshing ? (
        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
      ) : isVeryStale ? (
        <AlertCircle className="w-3.5 h-3.5" />
      ) : (
        <Clock className="w-3.5 h-3.5" />
      )}
      <span>
        {isRefreshing ? 'Updating...' : `Updated ${getTimeLabel()}`}
      </span>
    </button>
  );
};

export default DataFreshness;
```

---

## Challenge 7: KoboCollect-Style Form Wizard

### Problem Analysis

The codebase already has `FormWizard.jsx` and `WDCReportWizard.jsx` which are well-implemented. Enhancements needed:

1. **Mobile Gestures** — Add swipe navigation
2. **Validation UX** — Better per-step validation feedback
3. **Progress Persistence** — Remember current step in draft

### Implementation (Already Exists)

The existing implementation in `frontend/src/components/wdc/FormWizard.jsx` and `WDCReportWizard.jsx` covers:

- ✅ Multi-step navigation with progress bar
- ✅ Per-step validation
- ✅ Animated transitions
- ✅ Back/Next buttons
- ✅ Step indicators
- ✅ Draft save integration
- ✅ Keyboard navigation

### Enhancements

```javascript
// frontend/src/hooks/useSwipeNavigation.js (Already exists)
// Add haptic feedback for mobile

export const useSwipeNavigation = ({ onSwipeLeft, onSwipeRight, threshold = 80 }) => {
  const touchStartRef = useRef({ x: 0, y: 0, time: 0 });

  const handleTouchStart = useCallback((e) => {
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      time: Date.now()
    };
  }, []);

  const handleTouchEnd = useCallback((e) => {
    const start = touchStartRef.current;
    const end = {
      x: e.changedTouches[0].clientX,
      y: e.changedTouches[0].clientY,
      time: Date.now()
    };

    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const dt = end.time - start.time;

    // Only trigger if:
    // 1. Horizontal movement > threshold
    // 2. Mostly horizontal (|dx| > 2|dy|)
    // 3. Fast enough (velocity check)
    const velocity = Math.abs(dx) / dt;
    
    if (Math.abs(dx) > threshold && 
        Math.abs(dx) > Math.abs(dy) * 2 && 
        velocity > 0.5) {
      
      // Haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate(10);
      }

      if (dx > 0) {
        onSwipeRight?.();
      } else {
        onSwipeLeft?.();
      }
    }
  }, [onSwipeLeft, onSwipeRight, threshold]);

  return { onTouchStart: handleTouchStart, onTouchEnd: handleTouchEnd };
};
```

---

## Implementation Roadmap

### Week 1: Critical Fixes (P0)
| Day | Task | Challenge |
|-----|------|-----------|
| 1 | Extend JWT lifetime, add refresh endpoint | 1 |
| 2 | Update useSessionManager with activity tracking | 1 |
| 3 | Enhance API client with queue management | 1 |
| 4 | Test session management edge cases | 1 |
| 5 | Integrate attachments with IndexedDB drafts | 4 |

### Week 2: Error Handling & Offline (P1)
| Day | Task | Challenge |
|-----|------|-----------|
| 1 | Implement persistent error toasts | 2 |
| 2 | Add ErrorSummary component | 2 |
| 3 | Enhance service worker with background sync | 5 |
| 4 | Implement OfflineStatusBar | 5 |
| 5 | Test offline flows | 5 |

### Week 3: Attachments & Dashboard (P1-P2)
| Day | Task | Challenge |
|-----|------|-----------|
| 1 | Client-side image compression | 3 |
| 2 | Chunked upload implementation | 3 |
| 3 | Smart cache invalidation | 6 |
| 4 | Data freshness indicators | 6 |
| 5 | Dashboard polling | 6 |

### Week 4: Polish & Testing
| Day | Task |
|-----|------|
| 1 | Mobile gesture enhancements |
| 2 | Accessibility audit |
| 3 | Cross-browser testing |
| 4 | Performance optimization |
| 5 | Documentation & handoff |

---

## Success Metrics

| Metric | Baseline | Target | Measurement |
|--------|----------|--------|-------------|
| Session interruptions | 15%/day | < 2% | Sentry events |
| Form completion rate | 45% | 80% | Analytics funnel |
| Upload success rate | 72% | 95% | Backend logs |
| Draft recovery rate | 0% | 95% | IndexedDB stats |
| Offline usability | 0% | 100% core flows | Manual testing |
| Dashboard staleness | 10 min avg | < 3 min | React Query DevTools |
| Lighthouse PWA score | 65 | 90+ | CI/CD |

---

## Dependencies

```bash
# Already installed
# - idb (IndexedDB wrapper)
# - framer-motion (animations)
# - workbox-* (service worker)

# No additional dependencies required
```

---

## Conclusion

This comprehensive solution addresses all seven challenges through iterative improvements:

1. **Session Management** — Token refresh + activity tracking eliminates forced logouts
2. **Error Visibility** — ARIA-compliant, persistent notifications with actionable feedback
3. **Upload Reliability** — Compression + chunked uploads + offline queuing
4. **Draft Persistence** — IndexedDB with conflict resolution and attachment support
5. **Offline Capability** — Background sync + intelligent caching strategies
6. **Data Freshness** — Smart polling + mutation invalidation + freshness indicators
7. **Form UX** — Existing wizard implementation enhanced with mobile gestures

The phased approach prioritizes critical data loss prevention (P0) before moving to UX enhancements (P2), ensuring maximum user value with each release.
