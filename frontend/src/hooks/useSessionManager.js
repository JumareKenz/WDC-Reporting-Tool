import { useEffect, useRef, useCallback, useState } from 'react';
import apiClient from '../api/client';
import { STORAGE_KEYS } from '../utils/constants';

/**
 * Session Manager Hook
 *
 * Handles:
 * - Idle timeout detection (default 25 min idle → 5 min warning → logout)
 * - Activity event listeners (mouse, keyboard, touch, scroll)
 * - Warning modal countdown before auto-logout
 * - Token refresh on continued activity
 * - Multi-tab sync via storage events
 *
 * @param {Object} opts
 * @param {Function} opts.onLogout  - Called to execute logout
 * @param {number}   opts.idleMs   - Idle period before warning (ms, default 25 min)
 * @param {number}   opts.warnMs   - Warning countdown duration (ms, default 5 min)
 * @param {boolean}  opts.enabled  - Enable/disable session management
 */
export const useSessionManager = ({
  onLogout,
  idleMs = 25 * 60 * 1000,
  warnMs = 5 * 60 * 1000,
  enabled = true,
} = {}) => {
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(Math.floor(warnMs / 1000));

  const idleTimerRef = useRef(null);
  const warnTimerRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  const lastActivityRef = useRef(Date.now());
  const isWarningRef = useRef(false);

  const ACTIVITY_STORAGE_KEY = 'wdc_last_activity';

  // Broadcast activity across tabs
  const broadcastActivity = useCallback(() => {
    const now = Date.now();
    try {
      localStorage.setItem(ACTIVITY_STORAGE_KEY, String(now));
    } catch {
      // localStorage unavailable - ignore
    }
  }, []);

  // Clear all timers
  const clearAllTimers = useCallback(() => {
    clearTimeout(idleTimerRef.current);
    clearTimeout(warnTimerRef.current);
    clearInterval(countdownIntervalRef.current);
  }, []);

  // Execute logout
  const doLogout = useCallback(() => {
    clearAllTimers();
    isWarningRef.current = false;
    setShowWarning(false);
    onLogout();
  }, [clearAllTimers, onLogout]);

  // Start warning countdown
  const startWarning = useCallback(() => {
    isWarningRef.current = true;
    setShowWarning(true);
    setCountdown(Math.floor(warnMs / 1000));

    countdownIntervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownIntervalRef.current);
          doLogout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Final logout fallback timer
    warnTimerRef.current = setTimeout(doLogout, warnMs);
  }, [warnMs, doLogout]);

  // Attempt token refresh with backend
  const refreshToken = useCallback(async () => {
    try {
      const response = await apiClient.get('/auth/me');
      const userData = response?.data?.user || response?.user || response;
      if (userData?.id) {
        localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
      }
      return true;
    } catch {
      return false;
    }
  }, []);

  // Reset idle timer (called on user activity)
  const resetIdleTimer = useCallback(() => {
    if (!enabled) return;

    lastActivityRef.current = Date.now();
    broadcastActivity();

    // If warning modal is showing, dismiss it and refresh
    if (isWarningRef.current) {
      isWarningRef.current = false;
      setShowWarning(false);
      clearAllTimers();
      refreshToken();
    } else {
      clearTimeout(idleTimerRef.current);
    }

    // Start fresh idle timer
    idleTimerRef.current = setTimeout(startWarning, idleMs);
  }, [enabled, idleMs, startWarning, clearAllTimers, broadcastActivity, refreshToken]);

  // Continue session (user clicked "Stay logged in")
  const continueSession = useCallback(async () => {
    clearAllTimers();
    isWarningRef.current = false;
    setShowWarning(false);

    const ok = await refreshToken();
    if (!ok) {
      doLogout();
      return;
    }

    // Restart idle timer
    idleTimerRef.current = setTimeout(startWarning, idleMs);
  }, [clearAllTimers, refreshToken, doLogout, startWarning, idleMs]);

  // Setup activity listeners
  useEffect(() => {
    if (!enabled) return;

    const events = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll', 'click'];
    let debounceTimer = null;

    const handleActivity = () => {
      // Debounce to avoid thrashing on rapid events
      if (debounceTimer) return;
      debounceTimer = setTimeout(() => {
        debounceTimer = null;
        resetIdleTimer();
      }, 500);
    };

    events.forEach((evt) => document.addEventListener(evt, handleActivity, { passive: true }));

    // Start initial idle timer
    idleTimerRef.current = setTimeout(startWarning, idleMs);

    return () => {
      events.forEach((evt) => document.removeEventListener(evt, handleActivity));
      clearAllTimers();
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, [enabled, resetIdleTimer, startWarning, idleMs, clearAllTimers]);

  // Multi-tab sync: if another tab shows activity, reset this tab's timer
  useEffect(() => {
    if (!enabled) return;

    const handleStorageChange = (e) => {
      if (e.key === ACTIVITY_STORAGE_KEY && e.newValue) {
        const otherTabActivity = parseInt(e.newValue, 10);
        if (otherTabActivity > lastActivityRef.current) {
          lastActivityRef.current = otherTabActivity;
          if (isWarningRef.current) {
            // Another tab is active - dismiss warning
            isWarningRef.current = false;
            setShowWarning(false);
            clearAllTimers();
            idleTimerRef.current = setTimeout(startWarning, idleMs);
          }
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [enabled, idleMs, startWarning, clearAllTimers]);

  return {
    showWarning,
    countdown,
    continueSession,
    logoutNow: doLogout,
  };
};

export default useSessionManager;
