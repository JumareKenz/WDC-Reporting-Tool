import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hook for managing local draft persistence with debounced auto-save.
 * 
 * Features:
 * - Debounced auto-save (1000ms) on every change
 * - Save on visibility change (blur/background)
 * - Save on beforeunload
 * - Scoped draft keys: wdc_draft:{userId}:{wardId}:{reportMonth}
 * - Merge with server drafts when online
 * 
 * @param {Object} options Configuration options
 * @param {number} options.userId User ID for scoping
 * @param {number} options.wardId Ward ID for scoping
 * @param {string} options.reportMonth Report month (YYYY-MM format)
 * @param {Object} options.initialData Default form data
 * @param {Function} options.onServerSync Callback when syncing to server
 * @param {number} options.debounceMs Debounce delay in ms (default: 1000)
 */
export const useLocalDraft = ({
    userId,
    wardId,
    reportMonth,
    initialData = {},
    onServerSync,
    debounceMs = 1000,
}) => {
    const [formData, setFormData] = useState(initialData);
    const [draftStatus, setDraftStatus] = useState('idle'); // idle | saving | saved | error
    const [lastSavedAt, setLastSavedAt] = useState(null);
    const [hasLocalDraft, setHasLocalDraft] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);

    const debounceRef = useRef(null);
    const formDataRef = useRef(formData);

    // Keep ref in sync with state for beforeunload handler
    useEffect(() => {
        formDataRef.current = formData;
    }, [formData]);

    // Generate scoped draft key
    const getDraftKey = useCallback(() => {
        if (!userId || !wardId || !reportMonth) return null;
        return `wdc_draft:${userId}:${wardId}:${reportMonth}`;
    }, [userId, wardId, reportMonth]);

    // Save draft to localStorage
    const saveDraftToLocal = useCallback((data, instant = false) => {
        const key = getDraftKey();
        if (!key) {
            if (process.env.NODE_ENV === 'development') {
                console.warn('[useLocalDraft] Cannot save: missing key components', { userId, wardId, reportMonth });
            }
            return false;
        }

        try {
            const draftPayload = {
                formData: data,
                savedAt: new Date().toISOString(),
                version: 1,
            };

            localStorage.setItem(key, JSON.stringify(draftPayload));
            setLastSavedAt(new Date());
            setDraftStatus('saved');
            setHasLocalDraft(true);

            if (process.env.NODE_ENV === 'development') {
                console.log('[useLocalDraft] Draft saved to localStorage', { key, instant });
            }

            return true;
        } catch (error) {
            setDraftStatus('error');
            if (process.env.NODE_ENV === 'development') {
                console.error('[useLocalDraft] Failed to save draft:', error);
            }
            return false;
        }
    }, [getDraftKey, userId, wardId, reportMonth]);

    // Load draft from localStorage
    const loadDraftFromLocal = useCallback(() => {
        const key = getDraftKey();
        if (!key) return null;

        try {
            const stored = localStorage.getItem(key);
            if (!stored) return null;

            const parsed = JSON.parse(stored);
            if (process.env.NODE_ENV === 'development') {
                console.log('[useLocalDraft] Draft loaded from localStorage', { key, savedAt: parsed.savedAt });
            }
            return parsed;
        } catch (error) {
            if (process.env.NODE_ENV === 'development') {
                console.error('[useLocalDraft] Failed to load draft:', error);
            }
            return null;
        }
    }, [getDraftKey]);

    // Clear local draft
    const clearLocalDraft = useCallback(() => {
        const key = getDraftKey();
        if (!key) return;

        try {
            localStorage.removeItem(key);
            setHasLocalDraft(false);
            setLastSavedAt(null);
            setDraftStatus('idle');

            if (process.env.NODE_ENV === 'development') {
                console.log('[useLocalDraft] Draft cleared', { key });
            }
        } catch (error) {
            if (process.env.NODE_ENV === 'development') {
                console.error('[useLocalDraft] Failed to clear draft:', error);
            }
        }
    }, [getDraftKey]);

    // Debounced save
    const debouncedSave = useCallback((data) => {
        setDraftStatus('saving');

        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        debounceRef.current = setTimeout(() => {
            saveDraftToLocal(data);
        }, debounceMs);
    }, [saveDraftToLocal, debounceMs]);

    // Force immediate save (for "Save Draft" button)
    const forceSave = useCallback(() => {
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }
        return saveDraftToLocal(formDataRef.current, true);
    }, [saveDraftToLocal]);

    // Update formData and trigger auto-save
    const updateFormData = useCallback((updater) => {
        setFormData((prev) => {
            const newData = typeof updater === 'function' ? updater(prev) : updater;
            debouncedSave(newData);
            return newData;
        });
    }, [debouncedSave]);

    // Handle single field change
    const handleChange = useCallback((e) => {
        const { name, value, type, checked } = e.target;
        updateFormData((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
    }, [updateFormData]);

    // Initialize: Load local draft on mount
    useEffect(() => {
        if (!getDraftKey() || isInitialized) return;

        const localDraft = loadDraftFromLocal();
        if (localDraft?.formData) {
            setFormData((prev) => ({
                ...prev,
                ...localDraft.formData,
            }));
            setLastSavedAt(new Date(localDraft.savedAt));
            setHasLocalDraft(true);
            setDraftStatus('saved');
        }
        setIsInitialized(true);
    }, [getDraftKey, loadDraftFromLocal, isInitialized]);

    // Save on visibility change (tab blur / app background)
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                // Cancel debounce and save immediately
                if (debounceRef.current) {
                    clearTimeout(debounceRef.current);
                }
                saveDraftToLocal(formDataRef.current, true);
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [saveDraftToLocal]);

    // Save on beforeunload (page close/refresh)
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            // Cancel debounce and save immediately
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
            saveDraftToLocal(formDataRef.current, true);
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [saveDraftToLocal]);

    // Cleanup debounce on unmount
    useEffect(() => {
        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
                // Save one last time
                saveDraftToLocal(formDataRef.current, true);
            }
        };
    }, [saveDraftToLocal]);

    // Restore draft with confirmation
    const restoreDraft = useCallback((draftData) => {
        if (draftData?.formData) {
            setFormData((prev) => ({
                ...prev,
                ...draftData.formData,
            }));
            setLastSavedAt(draftData.savedAt ? new Date(draftData.savedAt) : null);
            setHasLocalDraft(true);
            setDraftStatus('saved');
        }
    }, []);

    // Check for existing draft without restoring
    const checkForDraft = useCallback(() => {
        return loadDraftFromLocal();
    }, [loadDraftFromLocal]);

    return {
        // State
        formData,
        draftStatus,
        lastSavedAt,
        hasLocalDraft,
        isInitialized,

        // Actions
        updateFormData,
        handleChange,
        forceSave,
        clearLocalDraft,
        restoreDraft,
        checkForDraft,
        setFormData,

        // Utilities
        getDraftKey,
    };
};

export default useLocalDraft;
