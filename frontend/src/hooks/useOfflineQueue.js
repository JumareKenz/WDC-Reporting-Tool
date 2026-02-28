import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hook for managing offline submission queue.
 * 
 * Features:
 * - Queue submissions with client-generated UUID for idempotency
 * - Store in localStorage
 * - Auto-sync when navigator.onLine becomes true
 * - Retry with exponential backoff
 * - Remove from queue after successful submit
 * 
 * @param {Object} options Configuration options
 * @param {Function} options.submitFn Function to call for submission
 * @param {number} options.maxRetries Maximum retry attempts (default: 3)
 */
export const useOfflineQueue = ({
    submitFn,
    maxRetries = 3,
}) => {
    const [queue, setQueue] = useState([]);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [isSyncing, setIsSyncing] = useState(false);
    const syncingRef = useRef(false);

    const QUEUE_KEY = 'wdc_submit_queue';

    // Generate UUID v4
    const generateUUID = () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0;
            const v = c === 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
        });
    };

    // Load queue from localStorage
    const loadQueue = useCallback(() => {
        try {
            const stored = localStorage.getItem(QUEUE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                setQueue(parsed);
                return parsed;
            }
        } catch (error) {
            if (process.env.NODE_ENV === 'development') {
                console.error('[useOfflineQueue] Failed to load queue:', error);
            }
        }
        return [];
    }, []);

    // Save queue to localStorage
    const saveQueue = useCallback((newQueue) => {
        try {
            localStorage.setItem(QUEUE_KEY, JSON.stringify(newQueue));
            setQueue(newQueue);
        } catch (error) {
            if (process.env.NODE_ENV === 'development') {
                console.error('[useOfflineQueue] Failed to save queue:', error);
            }
        }
    }, []);

    // Add submission to queue
    const addToQueue = useCallback((submission) => {
        const queueItem = {
            id: generateUUID(),
            ...submission,
            createdAt: new Date().toISOString(),
            retryCount: 0,
            status: 'queued',
        };

        const newQueue = [...queue, queueItem];
        saveQueue(newQueue);

        if (process.env.NODE_ENV === 'development') {
            console.log('[useOfflineQueue] Added to queue:', queueItem.id);
        }

        return queueItem;
    }, [queue, saveQueue]);

    // Remove item from queue
    const removeFromQueue = useCallback((id) => {
        const newQueue = queue.filter((item) => item.id !== id);
        saveQueue(newQueue);

        if (process.env.NODE_ENV === 'development') {
            console.log('[useOfflineQueue] Removed from queue:', id);
        }
    }, [queue, saveQueue]);

    // Update item in queue
    const updateQueueItem = useCallback((id, updates) => {
        const newQueue = queue.map((item) =>
            item.id === id ? { ...item, ...updates } : item
        );
        saveQueue(newQueue);
    }, [queue, saveQueue]);

    // Process a single queue item
    const processQueueItem = useCallback(async (item) => {
        if (!submitFn) return false;

        try {
            updateQueueItem(item.id, { status: 'syncing' });

            // Add submission ID header for idempotency
            await submitFn(item.formData, item.reportMonth, {
                'X-Submission-ID': item.id,
            });

            // Success - remove from queue
            removeFromQueue(item.id);

            if (process.env.NODE_ENV === 'development') {
                console.log('[useOfflineQueue] Successfully synced:', item.id);
            }

            return true;
        } catch (error) {
            const newRetryCount = item.retryCount + 1;

            if (newRetryCount >= maxRetries) {
                updateQueueItem(item.id, {
                    status: 'failed',
                    retryCount: newRetryCount,
                    error: error.message,
                });

                if (process.env.NODE_ENV === 'development') {
                    console.error('[useOfflineQueue] Max retries reached:', item.id, error);
                }
            } else {
                updateQueueItem(item.id, {
                    status: 'queued',
                    retryCount: newRetryCount,
                });

                if (process.env.NODE_ENV === 'development') {
                    console.warn('[useOfflineQueue] Retry scheduled:', item.id, `(${newRetryCount}/${maxRetries})`);
                }
            }

            return false;
        }
    }, [submitFn, updateQueueItem, removeFromQueue, maxRetries]);

    // Process all queued items
    const syncQueue = useCallback(async () => {
        if (syncingRef.current || !isOnline) return;

        const currentQueue = loadQueue();
        const queuedItems = currentQueue.filter((item) => item.status === 'queued');

        if (queuedItems.length === 0) return;

        syncingRef.current = true;
        setIsSyncing(true);

        if (process.env.NODE_ENV === 'development') {
            console.log('[useOfflineQueue] Starting sync, items:', queuedItems.length);
        }

        for (const item of queuedItems) {
            if (!navigator.onLine) {
                if (process.env.NODE_ENV === 'development') {
                    console.log('[useOfflineQueue] Went offline during sync, stopping');
                }
                break;
            }
            await processQueueItem(item);
            // Small delay between items
            await new Promise((resolve) => setTimeout(resolve, 500));
        }

        syncingRef.current = false;
        setIsSyncing(false);

        if (process.env.NODE_ENV === 'development') {
            console.log('[useOfflineQueue] Sync complete');
        }
    }, [isOnline, loadQueue, processQueueItem]);

    // Load queue on mount
    useEffect(() => {
        loadQueue();
    }, [loadQueue]);

    // Handle online/offline events
    // Note: we use a ref for syncQueue to avoid re-registering listeners on every render
    const syncQueueRef = useRef(syncQueue);
    useEffect(() => { syncQueueRef.current = syncQueue; }, [syncQueue]);

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            if (process.env.NODE_ENV === 'development') {
                console.log('[useOfflineQueue] Back online, triggering sync');
            }
            // Delay sync slightly to ensure connection is stable
            setTimeout(() => syncQueueRef.current(), 1500);
        };

        const handleOffline = () => {
            setIsOnline(false);
            if (process.env.NODE_ENV === 'development') {
                console.log('[useOfflineQueue] Went offline');
            }
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []); // stable listener – uses ref to access latest syncQueue

    // Try to sync on mount if online
    useEffect(() => {
        if (isOnline) {
            syncQueue();
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Get queue stats
    const getQueueStats = useCallback(() => {
        const queued = queue.filter((item) => item.status === 'queued').length;
        const syncing = queue.filter((item) => item.status === 'syncing').length;
        const failed = queue.filter((item) => item.status === 'failed').length;
        return { queued, syncing, failed, total: queue.length };
    }, [queue]);

    // Check if a specific report month is in queue
    const isInQueue = useCallback((reportMonth) => {
        return queue.some((item) => item.reportMonth === reportMonth);
    }, [queue]);

    // Retry failed items
    const retryFailed = useCallback(() => {
        const newQueue = queue.map((item) =>
            item.status === 'failed' ? { ...item, status: 'queued', retryCount: 0 } : item
        );
        saveQueue(newQueue);
        if (isOnline) {
            syncQueue();
        }
    }, [queue, saveQueue, isOnline, syncQueue]);

    // Clear failed items
    const clearFailed = useCallback(() => {
        const newQueue = queue.filter((item) => item.status !== 'failed');
        saveQueue(newQueue);
    }, [queue, saveQueue]);

    return {
        // State
        queue,
        isOnline,
        isSyncing,

        // Actions
        addToQueue,
        removeFromQueue,
        syncQueue,
        retryFailed,
        clearFailed,

        // Utilities
        getQueueStats,
        isInQueue,
        generateUUID,
    };
};

export default useOfflineQueue;
