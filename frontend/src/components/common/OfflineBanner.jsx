import { useState, useEffect } from 'react';
import { WifiOff, RefreshCw, CheckCircle } from 'lucide-react';

/**
 * OfflineBanner
 *
 * Shows a persistent banner when the user is offline.
 * Also briefly displays a "back online" confirmation when reconnected.
 * Accepts optional `isSyncing` / `pendingCount` props from the offline queue
 * for richer status messaging (passed down from parent pages).
 */
const OfflineBanner = ({ isSyncing = false, pendingCount = 0 }) => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [justReconnected, setJustReconnected] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setJustReconnected(true);
      const t = setTimeout(() => setJustReconnected(false), 4000);
      return () => clearTimeout(t);
    };
    const handleOffline = () => {
      setIsOffline(true);
      setJustReconnected(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline && !justReconnected) return null;

  // Back-online confirmation
  if (justReconnected && !isOffline) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="fixed top-0 left-0 right-0 z-[9990] bg-green-600 text-white px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-2 animate-fade-in"
      >
        <CheckCircle size={16} aria-hidden="true" />
        {isSyncing
          ? `Back online – syncing ${pendingCount} queued item${pendingCount !== 1 ? 's' : ''}…`
          : 'Back online. All data is up to date.'}
      </div>
    );
  }

  // Offline state
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed top-0 left-0 right-0 z-[9990] bg-amber-600 text-white px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-2 animate-fade-in"
    >
      {isSyncing ? (
        <>
          <RefreshCw size={16} className="animate-spin" aria-hidden="true" />
          Syncing saved data…
        </>
      ) : (
        <>
          <WifiOff size={16} aria-hidden="true" />
          {pendingCount > 0
            ? `Offline – ${pendingCount} item${pendingCount !== 1 ? 's' : ''} saved, will sync when reconnected.`
            : 'You are offline. Changes will be saved and synced when you reconnect.'}
        </>
      )}
    </div>
  );
};

export default OfflineBanner;
