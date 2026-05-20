/**
 * RefreshIndicator
 *
 * Shows a small, non-blocking overlay when the Axios 401 interceptor is
 * silently refreshing the access token.  The user can still see the current
 * screen (report form, dashboard, etc.) — we never block interaction.
 *
 * Lifecycle:
 *   • Mounts → registers callbacks with setRefreshCallbacks()
 *   • onStart → sets visible=true after MIN_SHOW_MS to avoid flash on fast nets
 *   • onEnd(success) → hides after MIN_SHOW_MS guarantee; success keeps session,
 *                       failure lets the 401 handler's toast + redirect run.
 *   • Unmounts → unregisters callbacks
 *
 * Placement: rendered in App.jsx inside ToastProvider so it can call useToast.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { setRefreshCallbacks } from '../../api/client';
import { useToast } from '../../hooks/useToast';

// Minimum display time (ms) — prevents a distracting flash on fast networks
const MIN_SHOW_MS = 1200;

const RefreshIndicator = () => {
  const [visible, setVisible]     = useState(false);
  const startTimeRef              = useRef(null);
  const hideTimerRef              = useRef(null);
  const { toast }                 = useToast();

  const scheduleHide = useCallback(() => {
    const elapsed  = Date.now() - (startTimeRef.current ?? Date.now());
    const remaining = Math.max(0, MIN_SHOW_MS - elapsed);
    clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setVisible(false), remaining);
  }, []);

  useEffect(() => {
    const handleStart = () => {
      clearTimeout(hideTimerRef.current);
      startTimeRef.current = Date.now();
      setVisible(true);
      // Show a non-intrusive info toast — auto-dismisses when hide runs
      toast.info('Verifying session…', { duration: MIN_SHOW_MS + 500, title: 'Session' });
    };

    const handleEnd = (success) => {
      if (!success) {
        // Failure path: 401 handler will emit its own warning toast + redirect.
        // Just hide the indicator immediately (no extra delay needed).
        clearTimeout(hideTimerRef.current);
        setVisible(false);
      } else {
        scheduleHide();
      }
    };

    setRefreshCallbacks(handleStart, handleEnd);
    return () => setRefreshCallbacks(null, null); // Clean up on unmount
  }, [scheduleHide, toast]);

  if (!visible) return null;

  return (
    /*
     * Fixed overlay at the bottom-right — out of the way of content.
     * Semi-transparent card so the user can see they're still on the same page.
     * z-index below modals (z-[9000]) but above most content (z-[200]).
     */
    <div
      role="status"
      aria-live="polite"
      aria-label="Verifying session"
      className="fixed bottom-20 right-4 z-[200] flex items-center gap-2 bg-white/90 dark:bg-neutral-800/90 backdrop-blur-sm border border-neutral-200 dark:border-neutral-700 shadow-lg rounded-full px-4 py-2 text-sm text-neutral-700 dark:text-neutral-200 pointer-events-none"
    >
      <Loader2 size={15} className="animate-spin text-primary-600 flex-shrink-0" aria-hidden="true" />
      <span>Verifying session…</span>
    </div>
  );
};

export default RefreshIndicator;
