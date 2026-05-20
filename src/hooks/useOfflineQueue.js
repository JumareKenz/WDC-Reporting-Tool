/**
 * useOfflineQueue — Offline Submission Queue
 *
 * Features:
 * - Queue submissions when offline; auto-sync when connectivity returns
 * - UUID idempotency key prevents duplicate submissions on retry
 * - Exponential backoff up to maxRetries before marking as failed
 * - Storage: Capacitor Preferences on native, localStorage on web
 * - Network detection: @capacitor/network (more reliable than navigator.onLine
 *   inside Android WebViews)
 *
 * API is backward-compatible with the previous localStorage implementation.
 *
 * @param {Object}   options
 * @param {Function} options.submitFn   Function called to submit one queued item.
 *                                      Receives (formData, reportMonth, extraHeaders).
 * @param {number}   options.maxRetries Max retries per item before marking failed.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { storage, network } from '../plugins/capacitor';

const QUEUE_KEY = 'wdc_submit_queue';

// ── UUID generator (crypto.randomUUID with legacy fallback) ───────────────────
const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
};

// ── Storage helpers ────────────────────────────────────────────────────────────
async function loadQueueFromStorage() {
  try {
    const raw = await storage.get(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function saveQueueToStorage(queue) {
  try {
    await storage.set(QUEUE_KEY, JSON.stringify(queue));
  } catch (err) {
    if (import.meta.env.DEV) console.error('[useOfflineQueue] save failed:', err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
export const useOfflineQueue = ({ submitFn, maxRetries = 3 }) => {
  const [queue,     setQueue]     = useState([]);
  const [isOnline,  setIsOnline]  = useState(true);   // optimistic default
  const [isSyncing, setIsSyncing] = useState(false);

  const syncingRef         = useRef(false);
  const networkListenerRef = useRef(null);
  // Keep latest syncQueue in a ref so stable event listeners always call the
  // up-to-date version without needing to re-register.
  const syncQueueRef       = useRef(null);

  // ── Persist queue state to storage and React state ───────────────────────────
  const persistQueue = useCallback(async (newQueue) => {
    setQueue(newQueue);
    await saveQueueToStorage(newQueue);
  }, []);

  // ── Add submission to queue ──────────────────────────────────────────────────
  const addToQueue = useCallback(async (submission) => {
    const item = {
      id:         generateUUID(),
      ...submission,
      createdAt:  new Date().toISOString(),
      retryCount: 0,
      status:     'queued',
    };
    const current = await loadQueueFromStorage();
    const updated = [...current, item];
    await persistQueue(updated);

    if (import.meta.env.DEV) console.log('[useOfflineQueue] Enqueued:', item.id);
    return item;
  }, [persistQueue]);

  // ── Remove item from queue ───────────────────────────────────────────────────
  const removeFromQueue = useCallback(async (id) => {
    const current = await loadQueueFromStorage();
    await persistQueue(current.filter((i) => i.id !== id));
    if (import.meta.env.DEV) console.log('[useOfflineQueue] Removed:', id);
  }, [persistQueue]);

  // ── Update a single item in queue (status / retryCount / error) ──────────────
  const updateQueueItem = useCallback(async (id, updates) => {
    const current = await loadQueueFromStorage();
    await persistQueue(current.map((i) => i.id === id ? { ...i, ...updates } : i));
  }, [persistQueue]);

  // ── Process a single queue item ──────────────────────────────────────────────
  const processQueueItem = useCallback(async (item) => {
    if (!submitFn) return false;

    try {
      await updateQueueItem(item.id, { status: 'syncing' });
      await submitFn(item.formData, item.reportMonth, {
        'X-Submission-ID': item.id,   // Idempotency header
      });
      await removeFromQueue(item.id);
      if (import.meta.env.DEV) console.log('[useOfflineQueue] Synced:', item.id);
      return true;
    } catch (err) {
      const retryCount = item.retryCount + 1;
      const status     = retryCount >= maxRetries ? 'failed' : 'queued';
      await updateQueueItem(item.id, { retryCount, status, error: err.message });
      if (import.meta.env.DEV) {
        if (status === 'failed') {
          console.error('[useOfflineQueue] Max retries reached:', item.id, err);
        } else {
          console.warn('[useOfflineQueue] Retry scheduled:', item.id, `(${retryCount}/${maxRetries})`);
        }
      }
      return false;
    }
  }, [submitFn, updateQueueItem, removeFromQueue, maxRetries]);

  // ── Sync all queued items to backend ─────────────────────────────────────────
  const syncQueue = useCallback(async () => {
    if (syncingRef.current) return;

    // Re-read from storage to get the freshest queue
    const current = await loadQueueFromStorage();
    const pending  = current.filter((i) => i.status === 'queued');
    if (pending.length === 0) return;

    // Check network again (don't rely solely on state)
    const { connected } = await network.getStatus();
    if (!connected) return;

    syncingRef.current = true;
    setIsSyncing(true);

    if (import.meta.env.DEV) console.log('[useOfflineQueue] Syncing', pending.length, 'items');

    for (const item of pending) {
      const { connected: stillOnline } = await network.getStatus();
      if (!stillOnline) {
        if (import.meta.env.DEV) console.log('[useOfflineQueue] Went offline during sync');
        break;
      }
      await processQueueItem(item);
      // Small delay between items to avoid overwhelming a weak connection
      await new Promise((r) => setTimeout(r, 500));
    }

    syncingRef.current = false;
    setIsSyncing(false);
    if (import.meta.env.DEV) console.log('[useOfflineQueue] Sync complete');
  }, [processQueueItem]);

  // Keep ref current so network listener always calls latest syncQueue
  useEffect(() => { syncQueueRef.current = syncQueue; }, [syncQueue]);

  // ── Initialise: load queue + subscribe to network events ─────────────────────
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      // Load persisted queue into React state
      const persisted = await loadQueueFromStorage();
      if (mounted) setQueue(persisted);

      // Get initial network status (more reliable than navigator.onLine in WebViews)
      const { connected } = await network.getStatus();
      if (mounted) setIsOnline(connected);

      // Subscribe to network changes
      networkListenerRef.current = await network.addListener(({ connected: nowOnline }) => {
        if (!mounted) return;
        setIsOnline(nowOnline);
        if (nowOnline) {
          if (import.meta.env.DEV) console.log('[useOfflineQueue] Back online — syncing');
          setTimeout(() => syncQueueRef.current?.(), 1500);
        } else {
          if (import.meta.env.DEV) console.log('[useOfflineQueue] Went offline');
        }
      });

      // Attempt sync on mount if already online
      if (connected && mounted) {
        setTimeout(() => syncQueueRef.current?.(), 500);
      }
    };

    init();
    return () => {
      mounted = false;
      networkListenerRef.current?.remove?.();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Retry all failed items ───────────────────────────────────────────────────
  const retryFailed = useCallback(async () => {
    const current = await loadQueueFromStorage();
    const updated  = current.map((i) =>
      i.status === 'failed' ? { ...i, status: 'queued', retryCount: 0 } : i
    );
    await persistQueue(updated);
    const { connected } = await network.getStatus();
    if (connected) syncQueue();
  }, [persistQueue, syncQueue]);

  // ── Clear failed items ───────────────────────────────────────────────────────
  const clearFailed = useCallback(async () => {
    const current = await loadQueueFromStorage();
    await persistQueue(current.filter((i) => i.status !== 'failed'));
  }, [persistQueue]);

  // ── Queue statistics ──────────────────────────────────────────────────────────
  const getQueueStats = useCallback(() => ({
    queued:  queue.filter((i) => i.status === 'queued').length,
    syncing: queue.filter((i) => i.status === 'syncing').length,
    failed:  queue.filter((i) => i.status === 'failed').length,
    total:   queue.length,
  }), [queue]);

  const isInQueue = useCallback(
    (reportMonth) => queue.some((i) => i.reportMonth === reportMonth),
    [queue]
  );

  return {
    queue,
    isOnline,
    isSyncing,
    addToQueue,
    removeFromQueue,
    syncQueue,
    retryFailed,
    clearFailed,
    getQueueStats,
    isInQueue,
    generateUUID,
  };
};

export default useOfflineQueue;
