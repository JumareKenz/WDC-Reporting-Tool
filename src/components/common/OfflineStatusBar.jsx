import React, { useEffect, useState, useCallback } from 'react';
import { Wifi, WifiOff, Cloud, CloudOff, RotateCw, CheckCircle } from 'lucide-react';
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
  const [showSuccess, setShowSuccess] = useState(false);

  // Check for pending items in storage
  const checkPendingItems = useCallback(async () => {
    try {
      // Check offline queue
      const queueData = localStorage.getItem('wdc_submit_queue');
      const queue = queueData ? JSON.parse(queueData) : [];
      const pendingQueue = queue.filter(item => item.status === 'queued');
      
      // Check attachment store
      const { getPendingAttachments } = await import('../../utils/attachmentStore');
      const attachments = await getPendingAttachments({ status: 'pending' });
      
      setPendingCount(pendingQueue.length + attachments.length);
    } catch {
      setPendingCount(0);
    }
  }, []);

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
          setShowSuccess(true);
          setTimeout(() => setShowSuccess(false), 3000);
        }
        if (event.data.type === 'SYNC_PENDING') {
          setPendingCount(event.data.count);
        }
      });
    }

    // Check pending items periodically
    checkPendingItems();
    const interval = setInterval(checkPendingItems, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [checkPendingItems]);

  const triggerSync = useCallback(async () => {
    if (!('serviceWorker' in navigator)) return;
    
    setIsSyncing(true);
    
    try {
      const registration = await navigator.serviceWorker.ready;
      
      if ('sync' in registration) {
        await registration.sync.register('report-sync');
      }

      // Also try to sync attachments
      const { getPendingAttachments } = await import('../../utils/attachmentStore');
      const attachments = await getPendingAttachments({ status: 'pending' });
      
      if (attachments.length > 0) {
        // Trigger attachment sync
        window.dispatchEvent(new CustomEvent('app:syncAttachments'));
      }
    } catch (error) {
      console.error('Background sync failed:', error);
    } finally {
      setTimeout(() => setIsSyncing(false), 1500);
    }
  }, []);

  // Hide if online with no pending items and not showing success
  if (isOnline && pendingCount === 0 && !showSuccess) return null;

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
            ? showSuccess
              ? 'bg-green-50 text-green-800 border-t border-green-200'
              : 'bg-blue-50 text-blue-800 border-t border-blue-200' 
            : 'bg-amber-50 text-amber-800 border-t border-amber-200'}
        `}
        role="status"
        aria-live="polite"
      >
        <div className="flex items-center gap-3">
          <div className={`
            w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
            ${isOnline 
              ? showSuccess
                ? 'bg-green-100'
                : 'bg-blue-100'
              : 'bg-amber-100'}
          `}>
            {isOnline ? (
              showSuccess ? (
                <CheckCircle className="w-4 h-4 text-green-600" aria-hidden="true" />
              ) : isSyncing ? (
                <RotateCw className="w-4 h-4 animate-spin text-blue-600" aria-hidden="true" />
              ) : (
                <Cloud className="w-4 h-4 text-blue-600" aria-hidden="true" />
              )
            ) : (
              <CloudOff className="w-4 h-4 text-amber-600" aria-hidden="true" />
            )}
          </div>
          
          <div>
            <p className="text-sm font-medium">
              {isOnline 
                ? showSuccess
                  ? 'All changes synced successfully'
                  : isSyncing 
                    ? `Syncing ${pendingCount} pending item${pendingCount !== 1 ? 's' : ''}...`
                    : `${pendingCount} item${pendingCount !== 1 ? 's' : ''} pending sync`
                : 'You are offline'
              }
            </p>
            {!isOnline && (
              <p className="text-xs text-amber-600 mt-0.5">
                Changes will sync automatically when you reconnect
              </p>
            )}
            {lastSyncTime && isOnline && !showSuccess && (
              <p className="text-xs text-blue-600 mt-0.5">
                Last synced {formatTimeAgo(lastSyncTime)}
              </p>
            )}
          </div>
        </div>

        {!isOnline && (
          <div className="flex items-center gap-2 text-xs text-amber-600">
            <WifiOff className="w-4 h-4" aria-hidden="true" />
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
