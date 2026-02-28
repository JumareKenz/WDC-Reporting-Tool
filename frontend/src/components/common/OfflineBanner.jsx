import { useState, useEffect, useRef } from 'react';
import { WifiOff, Wifi, RefreshCw, CheckCircle, Upload } from 'lucide-react';

/**
 * OfflineBanner
 *
 * Shows a persistent banner when the user is offline.
 * Displays current queue count and sync progress when coming back online.
 * Animates smoothly between online/offline states.
 */
const OfflineBanner = ({ isSyncing = false, pendingCount = 0 }) => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [justReconnected, setJustReconnected] = useState(false);
  const [visible, setVisible] = useState(false);
  const [animateOut, setAnimateOut] = useState(false);
  const reconnectTimerRef = useRef(null);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setJustReconnected(true);
      setAnimateOut(false);

      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = setTimeout(() => {
        setAnimateOut(true);
        setTimeout(() => {
          setJustReconnected(false);
          setAnimateOut(false);
        }, 400);
      }, 5000);
    };

    const handleOffline = () => {
      setIsOffline(true);
      setJustReconnected(false);
      setAnimateOut(false);
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    };
  }, []);

  // Control visibility with a slight delay for mount animation
  useEffect(() => {
    if (isOffline || justReconnected) {
      // Small delay so the element mounts before animating in
      const t = setTimeout(() => setVisible(true), 20);
      return () => clearTimeout(t);
    } else {
      setVisible(false);
    }
  }, [isOffline, justReconnected]);

  if (!isOffline && !justReconnected) return null;

  // Back-online confirmation (syncing or done)
  if (justReconnected && !isOffline) {
    const isSyncingNow = isSyncing && pendingCount > 0;
    return (
      <div
        role="status"
        aria-live="polite"
        className={`fixed top-0 left-0 right-0 z-[9990] transition-all duration-400 ease-out ${
          visible && !animateOut
            ? 'translate-y-0 opacity-100'
            : '-translate-y-full opacity-0'
        }`}
      >
        <div className={`px-4 py-3 text-sm font-medium shadow-lg ${
          isSyncingNow
            ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white'
            : 'bg-gradient-to-r from-emerald-500 to-green-500 text-white'
        }`}>
          <div className="max-w-3xl mx-auto flex items-center justify-center gap-3">
            {isSyncingNow ? (
              <>
                <Upload size={18} className="animate-pulse flex-shrink-0" aria-hidden="true" />
                <span>
                  Back online — syncing {pendingCount} queued item{pendingCount !== 1 ? 's' : ''}...
                </span>
                <RefreshCw size={14} className="animate-spin flex-shrink-0" aria-hidden="true" />
              </>
            ) : (
              <>
                <Wifi size={18} className="flex-shrink-0" aria-hidden="true" />
                <span>Back online. All data is up to date.</span>
                <CheckCircle size={16} className="flex-shrink-0" aria-hidden="true" />
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Offline state
  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`fixed top-0 left-0 right-0 z-[9990] transition-all duration-400 ease-out ${
        visible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
      }`}
    >
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-3 text-sm font-medium shadow-lg">
        <div className="max-w-3xl mx-auto flex items-center justify-center gap-3">
          <WifiOff size={18} className="flex-shrink-0" aria-hidden="true" />
          {pendingCount > 0 ? (
            <span>
              You are offline — {pendingCount} item{pendingCount !== 1 ? 's' : ''} saved locally, will sync when reconnected.
            </span>
          ) : (
            <span>You are offline. Changes will be saved locally and synced when you reconnect.</span>
          )}
          <span className="w-2 h-2 rounded-full bg-white/60 animate-pulse flex-shrink-0" />
        </div>
      </div>
    </div>
  );
};

export default OfflineBanner;
