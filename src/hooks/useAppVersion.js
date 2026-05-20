/**
 * useAppVersion
 *
 * Checks whether a newer version of the app is available by polling
 * GET /app/version on the backend.  On mismatch, emits a persistent toast
 * prompting the user to update.
 *
 * Strategy: Option B — notify + manual restart (not silent auto-update).
 * Rationale: this is a government data-entry app; applying JS updates silently
 * in the middle of a shift risks breaking an in-progress report form. A visible
 * prompt lets the coordinator choose a safe moment to restart.
 *
 * When to run:
 *   • Native (Capacitor) builds only — the web/PWA build is served fresh from
 *     the server; the service worker handles web updates transparently.
 *   • On app resume (appLifecycle.onResume) in addition to initial mount so
 *     long-running sessions also pick up updates.
 *
 * Required env var (set at build time):
 *   VITE_APP_VERSION=1.0.0   (injected by CI; fallback '0.0.0' means dev build)
 *
 * Backend endpoint expected response:
 *   GET /api/app/version → { version: "1.2.0", min_version: "1.0.0", message?: "..." }
 */

import { useEffect, useRef } from 'react';
import axios from 'axios';
import { isNative, appLifecycle } from '../plugins/capacitor';
import { emitToast } from './useToast';

// Build-time constant injected by Vite.  Falls back to '0.0.0' in dev.
const CURRENT_VERSION = import.meta.env.VITE_APP_VERSION ?? '0.0.0';
const API_BASE        = import.meta.env.VITE_API_BASE_URL ?? 'https://kadwdc.equily.ng/api/v1';

/**
 * Compare two semver strings.
 * Returns true if `remote` is strictly newer than `local`.
 */
function isNewer(remote, local) {
  const parse = (v) => String(v ?? '0').split('.').map(Number);
  const [rMaj, rMin, rPat] = parse(remote);
  const [lMaj, lMin, lPat] = parse(local);
  if (rMaj !== lMaj) return rMaj > lMaj;
  if (rMin !== lMin) return rMin > lMin;
  return rPat > lPat;
}

export function useAppVersion() {
  // Track whether we've already shown the update toast this session
  const notifiedRef       = useRef(false);
  const resumeHandleRef   = useRef(null);

  const checkVersion = async () => {
    // Only run version checks inside native builds.
    // Web builds get updates via the Workbox service worker.
    if (!isNative) return;
    // Skip dev builds (version 0.0.0)
    if (CURRENT_VERSION === '0.0.0') return;
    // Don't spam the user with repeated toasts in one session
    if (notifiedRef.current) return;

    try {
      // The new backend doesn't expose /app/version — use the health endpoint
      // to detect if a forced update is needed via a custom header in future.
      const res = await axios.get(`${API_BASE.replace('/api/v1', '')}/health/live`, { timeout: 8000 });
      const data = res.data;
      // If the backend adds a min_version field later, honour it here.
      const { version: remoteVersion, message } = data ?? {};

      if (!remoteVersion) return;

      if (isNewer(remoteVersion, CURRENT_VERSION)) {
        notifiedRef.current = true;
        const updateMsg = message
          || `A new version (${remoteVersion}) is available. Please close and reopen the app to update.`;
        emitToast('info', updateMsg, {
          title: 'Update available',
          duration: 0, // Persistent — user must dismiss manually
        });
      }
    } catch {
      // Version endpoint is optional — a 404 or network error is not an app error
    }
  };

  useEffect(() => {
    checkVersion();

    // Re-check when the app comes back from background (long-running sessions
    // might start a shift on an old version; catch it on next foreground)
    const setupLifecycle = async () => {
      resumeHandleRef.current = await appLifecycle.onResume(() => {
        // Reset the notified flag on resume so a fresh check runs
        notifiedRef.current = false;
        checkVersion();
      });
    };
    setupLifecycle();

    return () => {
      resumeHandleRef.current?.remove?.();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
