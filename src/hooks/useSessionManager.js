/**
 * useSessionManager — Idle Timeout + Session Warning
 *
 * Handles:
 * - Idle timeout detection (mouse/keyboard/touch/scroll activity)
 * - Warning modal countdown before auto-logout
 * - Token keep-alive on continued activity (via apiClient GET /auth/me;
 *   the Axios interceptor silently refreshes if the access token has expired)
 * - Multi-tab sync on web (via storage events)
 * - App lifecycle on native: checks elapsed idle time when resuming from background
 *
 * Storage: uses the Capacitor storage abstraction so activity timestamp is
 * persisted in SharedPreferences on Android (survives process kill/resume).
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import apiClient from '../api/client';
import { storage, appLifecycle, isNative } from '../plugins/capacitor';

const ACTIVITY_KEY = 'wdc_last_activity';

/**
 * @param {Object} opts
 * @param {Function} opts.onLogout  Called to execute logout
 * @param {number}   opts.idleMs   Idle period before warning (default 25 min)
 * @param {number}   opts.warnMs   Warning countdown duration (default 5 min)
 * @param {boolean}  opts.enabled  Enable/disable session management
 */
export const useSessionManager = ({
  onLogout,
  idleMs = 25 * 60 * 1000,
  warnMs =  5 * 60 * 1000,
  enabled = true,
} = {}) => {
  const [showWarning, setShowWarning] = useState(false);
  const [countdown,   setCountdown]   = useState(Math.floor(warnMs / 1000));

  const idleTimerRef         = useRef(null);
  const warnTimerRef         = useRef(null);
  const countdownIntervalRef = useRef(null);
  const lastActivityRef      = useRef(Date.now());
  const isWarningRef         = useRef(false);

  // ── Clear all timers ────────────────────────────────────────────────────────
  const clearAllTimers = useCallback(() => {
    clearTimeout(idleTimerRef.current);
    clearTimeout(warnTimerRef.current);
    clearInterval(countdownIntervalRef.current);
  }, []);

  // ── Execute logout ───────────────────────────────────────────────────────────
  const doLogout = useCallback(() => {
    clearAllTimers();
    isWarningRef.current = false;
    setShowWarning(false);
    onLogout();
  }, [clearAllTimers, onLogout]);

  // ── Start warning countdown ─────────────────────────────────────────────────
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

    warnTimerRef.current = setTimeout(doLogout, warnMs);
  }, [warnMs, doLogout]);

  // ── Keep session alive — calls GET /auth/me ──────────────────────────────────
  // The Axios 401 interceptor will silently refresh the access token if needed,
  // so this works regardless of whether the access token is still valid.
  const refreshToken = useCallback(async () => {
    try {
      await apiClient.get('/auth/me');
      return true;
    } catch {
      return false;
    }
  }, []);

  // ── Broadcast activity timestamp ─────────────────────────────────────────────
  // On native: persisted to Preferences so resume handler can compute elapsed time.
  // On web: written to localStorage for cross-tab sync (storage event).
  const broadcastActivity = useCallback(async () => {
    const now = Date.now().toString();
    await storage.set(ACTIVITY_KEY, now);
  }, []);

  // ── Reset idle timer ──────────────────────────────────────────────────────────
  const resetIdleTimer = useCallback(() => {
    if (!enabled) return;

    lastActivityRef.current = Date.now();
    broadcastActivity(); // fire-and-forget async call

    if (isWarningRef.current) {
      // Warning was showing — user acted; dismiss and refresh session
      isWarningRef.current = false;
      setShowWarning(false);
      clearAllTimers();
      refreshToken();
    } else {
      clearTimeout(idleTimerRef.current);
    }

    idleTimerRef.current = setTimeout(startWarning, idleMs);
  }, [enabled, idleMs, startWarning, clearAllTimers, broadcastActivity, refreshToken]);

  // ── Continue session (user clicked "Stay logged in") ────────────────────────
  const continueSession = useCallback(async () => {
    clearAllTimers();
    isWarningRef.current = false;
    setShowWarning(false);

    const ok = await refreshToken();
    if (!ok) { doLogout(); return; }

    idleTimerRef.current = setTimeout(startWarning, idleMs);
  }, [clearAllTimers, refreshToken, doLogout, startWarning, idleMs]);

  // ── Activity listeners (mouse / keyboard / touch / scroll) ──────────────────
  useEffect(() => {
    if (!enabled) return;

    const events = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll', 'click'];
    let debounce = null;

    const handleActivity = () => {
      if (debounce) return;
      debounce = setTimeout(() => {
        debounce = null;
        resetIdleTimer();
      }, 500);
    };

    events.forEach((e) => document.addEventListener(e, handleActivity, { passive: true }));
    idleTimerRef.current = setTimeout(startWarning, idleMs);

    return () => {
      events.forEach((e) => document.removeEventListener(e, handleActivity));
      clearAllTimers();
      if (debounce) clearTimeout(debounce);
    };
  }, [enabled, resetIdleTimer, startWarning, idleMs, clearAllTimers]);

  // ── Cross-tab sync (web) / background-resume check (native) ─────────────────
  useEffect(() => {
    if (!enabled) return;

    if (isNative) {
      // Native: no tabs. When app resumes from background, check how long it
      // was idle. If longer than the idle timeout → logout immediately.
      let handle = null;
      appLifecycle.onResume(async () => {
        const lastStr = await storage.get(ACTIVITY_KEY);
        if (!lastStr) return;

        const elapsed = Date.now() - parseInt(lastStr, 10);

        if (elapsed >= idleMs + warnMs) {
          // Has been idle past the full timeout + warning period
          doLogout();
        } else if (elapsed >= idleMs) {
          // Within the warning window — show warning with adjusted countdown
          const remaining = Math.max(0, idleMs + warnMs - elapsed);
          isWarningRef.current = true;
          setShowWarning(true);
          setCountdown(Math.floor(remaining / 1000));

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
          warnTimerRef.current = setTimeout(doLogout, remaining);
        } else {
          // Still within idle period — reset the timer
          clearAllTimers();
          const remaining = idleMs - elapsed;
          idleTimerRef.current = setTimeout(startWarning, remaining);
        }
      }).then((h) => { handle = h; });

      return () => handle?.remove?.();
    } else {
      // Web: listen for localStorage changes from other tabs
      const handleStorage = (e) => {
        if (e.key !== ACTIVITY_KEY || !e.newValue) return;
        const otherTabTs = parseInt(e.newValue, 10);
        if (otherTabTs > lastActivityRef.current) {
          lastActivityRef.current = otherTabTs;
          if (isWarningRef.current) {
            // Another tab is still active — dismiss warning
            isWarningRef.current = false;
            setShowWarning(false);
            clearAllTimers();
            idleTimerRef.current = setTimeout(startWarning, idleMs);
          }
        }
      };
      window.addEventListener('storage', handleStorage);
      return () => window.removeEventListener('storage', handleStorage);
    }
  }, [enabled, idleMs, warnMs, startWarning, clearAllTimers, doLogout]);

  return { showWarning, countdown, continueSession, logoutNow: doLogout };
};

export default useSessionManager;
