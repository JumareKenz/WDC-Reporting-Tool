/**
 * OfflineBanner
 *
 * Shows a persistent banner when offline and a brief "back online" confirmation
 * when connectivity returns.
 *
 * Platform differences:
 *   Native (Capacitor): banner appears at the BOTTOM of the screen so it
 *     doesn't fight with the Capacitor status bar or the top navigation area.
 *     Copy is app-native ("No internet connection – changes will sync…").
 *   Web (PWA): banner appears at the TOP, same as before.
 *
 * Network detection always uses @capacitor/network — navigator.onLine is
 * unreliable inside Android WebViews.
 */

import { useState, useEffect, useRef } from 'react';
import { WifiOff, RefreshCw, CheckCircle } from 'lucide-react';
import { network, isNative } from '../../plugins/capacitor';

const OfflineBanner = ({ isSyncing = false, pendingCount = 0 }) => {
  const [isOffline,       setIsOffline]       = useState(false);
  const [justReconnected, setJustReconnected] = useState(false);

  const reconnectTimerRef  = useRef(null);
  const networkListenerRef = useRef(null);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      // Real initial status (more reliable than navigator.onLine in WebViews)
      const { connected } = await network.getStatus();
      if (mounted) setIsOffline(!connected);

      // Subscribe to future changes
      networkListenerRef.current = await network.addListener(({ connected: nowOnline }) => {
        if (!mounted) return;

        if (nowOnline) {
          setIsOffline(false);
          setJustReconnected(true);
          if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
          reconnectTimerRef.current = setTimeout(() => {
            if (mounted) setJustReconnected(false);
          }, 4000);
        } else {
          setIsOffline(true);
          setJustReconnected(false);
          if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
        }
      });
    };

    init();

    return () => {
      mounted = false;
      networkListenerRef.current?.remove?.();
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    };
  }, []);

  // Nothing to show while fully online
  if (!isOffline && !justReconnected) return null;

  // On native: bottom banner; on web: top banner (avoids status-bar clash)
  const positionClass = isNative
    ? 'fixed bottom-0 left-0 right-0 z-[9990]'
    : 'fixed top-0 left-0 right-0 z-[9990]';

  // ── Back-online confirmation ──────────────────────────────────────────────
  if (justReconnected && !isOffline) {
    return (
      <div
        role="status"
        aria-live="polite"
        className={`${positionClass} bg-green-600 text-white px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-2`}
      >
        <CheckCircle size={16} aria-hidden="true" />
        {isSyncing
          ? `Back online – syncing ${pendingCount} saved item${pendingCount !== 1 ? 's' : ''}…`
          : 'Back online. All data is up to date.'}
      </div>
    );
  }

  // ── Offline state ─────────────────────────────────────────────────────────
  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`${positionClass} bg-amber-600 text-white px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-2`}
    >
      {isSyncing ? (
        <>
          <RefreshCw size={16} className="animate-spin" aria-hidden="true" />
          {/* Neutral wording that works on both native and web */}
          Syncing saved data…
        </>
      ) : (
        <>
          <WifiOff size={16} aria-hidden="true" />
          {pendingCount > 0
            ? `No internet – ${pendingCount} item${pendingCount !== 1 ? 's' : ''} saved locally, will sync when reconnected.`
            : 'No internet connection \u2013 changes will be saved and synced when back online.'}
        </>
      )}
    </div>
  );
};

export default OfflineBanner;
