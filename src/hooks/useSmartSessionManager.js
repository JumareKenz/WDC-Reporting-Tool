/**
 * useSmartSessionManager — Context-aware Idle Timeout + Session Warning
 *
 * Features:
 * - Extended timeout when editing forms (60 min vs 25 min base)
 * - Smart activity detection (input events vs general activity)
 * - Network error handling with graceful degradation
 * - Cross-tab session sync
 * - Mobile lifecycle handling (pause/resume)
 * - Draft auto-save on session expiry warning
 *
 * @param {Object} options
 * @param {Function} options.onLogout - Called to execute logout
 * @param {number} options.baseIdleMs - Base idle timeout (default: 25 min)
 * @param {number} options.formIdleMs - Timeout when editing forms (default: 60 min)
 * @param {number} options.warnMs - Warning countdown duration (default: 5 min)
 * @param {boolean} options.enabled - Enable/disable session management
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import apiClient from '../api/client';
import { storage, appLifecycle, isNative } from '../plugins/capacitor';

const ACTIVITY_KEY = 'wdc_last_activity';
const FORM_ACTIVITY_KEY = 'wdc_form_activity';

export const useSmartSessionManager = ({
  onLogout,
  baseIdleMs = 25 * 60 * 1000,
  formIdleMs = 60 * 60 * 1000,
  warnMs = 5 * 60 * 1000,
  enabled = true,
} = {}) => {
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(Math.floor(warnMs / 1000));
  const [isFormEditing, setIsFormEditing] = useState(false);

  const idleTimerRef = useRef(null);
  const warnTimerRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  const lastActivityRef = useRef(Date.now());
  const isWarningRef = useRef(false);
  const formActivityRef = useRef(false);

  // Calculate current idle timeout based on activity
  const getCurrentIdleMs = useCallback(() => {
    return formActivityRef.current ? formIdleMs : baseIdleMs;
  }, [baseIdleMs, formIdleMs]);

  // Clear all timers
  const clearAllTimers = useCallback(() => {
    clearTimeout(idleTimerRef.current);
    clearTimeout(warnTimerRef.current);
    clearInterval(countdownIntervalRef.current);
  }, []);

  // Execute logout with data preservation
  const doLogout = useCallback(async (preserveDraft = true) => {
    clearAllTimers();
    isWarningRef.current = false;
    setShowWarning(false);

    // Fire event to allow components to save state
    if (preserveDraft) {
      window.dispatchEvent(new CustomEvent('wdc:session-expiring', {
        detail: { preserveDraft: true }
      }));
      // Give components 2 seconds to save
      await new Promise(r => setTimeout(r, 2000));
    }

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
          doLogout(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    warnTimerRef.current = setTimeout(() => doLogout(true), warnMs);
  }, [warnMs, doLogout]);

  // Refresh session token with network error handling
  const refreshToken = useCallback(async () => {
    try {
      await apiClient.get('/auth/me');
      return true;
    } catch (err) {
      // If network error, don't immediately logout - allow retry
      if (!err.response && err.isNetworkError) {
        console.warn('[SmartSession] Network error during refresh, will retry');
        return 'network-error';
      }
      return false;
    }
  }, []);

  // Broadcast activity timestamp
  const broadcastActivity = useCallback(async () => {
    const now = Date.now().toString();
    await storage.set(ACTIVITY_KEY, now);
    await storage.set(FORM_ACTIVITY_KEY, formActivityRef.current.toString());
  }, []);

  // Reset idle timer
  const resetIdleTimer = useCallback(() => {
    if (!enabled) return;

    lastActivityRef.current = Date.now();
    broadcastActivity();

    const currentIdleMs = getCurrentIdleMs();

    if (isWarningRef.current) {
      isWarningRef.current = false;
      setShowWarning(false);
      clearAllTimers();
      refreshToken();
    } else {
      clearTimeout(idleTimerRef.current);
    }

    idleTimerRef.current = setTimeout(startWarning, currentIdleMs);
  }, [enabled, getCurrentIdleMs, startWarning, clearAllTimers, broadcastActivity, refreshToken]);

  // Continue session
  const continueSession = useCallback(async () => {
    clearAllTimers();
    isWarningRef.current = false;
    setShowWarning(false);

    const ok = await refreshToken();
    if (ok === false) {
      doLogout(false);
      return;
    }

    // If network error, still extend session client-side
    idleTimerRef.current = setTimeout(startWarning, getCurrentIdleMs());
  }, [clearAllTimers, refreshToken, doLogout, startWarning, getCurrentIdleMs]);

  // Track form activity from other components
  useEffect(() => {
    const handleFormActivity = (e) => {
      const isEditing = e.detail?.isEditing || false;
      formActivityRef.current = isEditing;
      setIsFormEditing(isEditing);
      resetIdleTimer();
    };

    window.addEventListener('wdc:form-activity', handleFormActivity);
    return () => window.removeEventListener('wdc:form-activity', handleFormActivity);
  }, [resetIdleTimer]);

  // General activity listeners
  useEffect(() => {
    if (!enabled) return;

    const events = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll', 'click', 'input'];
    let debounce = null;
    let inputDebounce = null;

    const handleActivity = (e) => {
      if (debounce) return;
      debounce = setTimeout(() => {
        debounce = null;
        resetIdleTimer();
      }, 500);
    };

    // Higher sensitivity for form inputs
    const handleInputActivity = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        if (inputDebounce) clearTimeout(inputDebounce);
        inputDebounce = setTimeout(() => {
          resetIdleTimer();
        }, 100);
      }
    };

    events.forEach((e) => document.addEventListener(e, handleActivity, { passive: true }));
    document.addEventListener('input', handleInputActivity, { passive: true });

    idleTimerRef.current = setTimeout(startWarning, getCurrentIdleMs());

    return () => {
      events.forEach((e) => document.removeEventListener(e, handleActivity));
      document.removeEventListener('input', handleInputActivity);
      clearAllTimers();
      if (debounce) clearTimeout(debounce);
      if (inputDebounce) clearTimeout(inputDebounce);
    };
  }, [enabled, resetIdleTimer, startWarning, clearAllTimers, getCurrentIdleMs]);

  // Handle app lifecycle (native)
  useEffect(() => {
    if (!enabled || !isNative) return;

    let pauseHandle = null;
    let resumeHandle = null;

    const setup = async () => {
      pauseHandle = await appLifecycle.onPause(async () => {
        await storage.set(`${ACTIVITY_KEY}_paused`, Date.now().toString());
      });

      resumeHandle = await appLifecycle.onResume(async () => {
        const pausedAt = await storage.get(`${ACTIVITY_KEY}_paused`);
        const lastActivity = await storage.get(ACTIVITY_KEY);
        const wasEditing = (await storage.get(FORM_ACTIVITY_KEY)) === 'true';

        if (!lastActivity) return;

        const elapsed = Date.now() - parseInt(lastActivity, 10);
        const effectiveTimeout = wasEditing ? formIdleMs : baseIdleMs;

        if (elapsed >= effectiveTimeout + warnMs) {
          doLogout(true);
        } else if (elapsed >= effectiveTimeout) {
          const remaining = Math.max(0, effectiveTimeout + warnMs - elapsed);
          isWarningRef.current = true;
          setShowWarning(true);
          setCountdown(Math.floor(remaining / 1000));
          warnTimerRef.current = setTimeout(() => doLogout(true), remaining);
        } else {
          resetIdleTimer();
        }
      });
    };

    setup();
    return () => {
      pauseHandle?.remove?.();
      resumeHandle?.remove?.();
    };
  }, [enabled, isNative, baseIdleMs, formIdleMs, warnMs, doLogout, resetIdleTimer]);

  return {
    showWarning,
    countdown,
    continueSession,
    logoutNow: () => doLogout(false),
    isFormEditing,
    resetIdleTimer,
  };
};

export default useSmartSessionManager;
