/**
 * useLocalDraft — Debounced Draft Auto-Save
 *
 * Features:
 * - Debounced auto-save (1000 ms) on every field change
 * - Immediate save on visibility change (tab blur / app background)
 * - Immediate save on beforeunload (web page close/refresh)
 * - Scoped draft keys: wdc_draft:{userId}:{wardId}:{reportMonth}
 * - Storage: Capacitor Preferences on native, localStorage on web
 *
 * Because Capacitor storage is async, all save/load operations are async.
 * Internal state is always kept in sync via formDataRef so that the
 * fire-and-forget saves (beforeunload, debounce) always write the latest data.
 *
 * API is fully backward-compatible with the previous localStorage version.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { storage, isNative, appLifecycle } from '../plugins/capacitor';

/**
 * @param {Object}   options
 * @param {number}   options.userId       User ID (for key scoping)
 * @param {number}   options.wardId       Ward ID (for key scoping)
 * @param {string}   options.reportMonth  YYYY-MM (for key scoping)
 * @param {Object}   options.initialData  Default/empty form data
 * @param {Function} options.onServerSync Callback when syncing to server
 * @param {number}   options.debounceMs   Debounce delay (default 1000 ms)
 */
export const useLocalDraft = ({
  userId,
  wardId,
  reportMonth,
  initialData   = {},
  onServerSync,
  debounceMs    = 1000,
}) => {
  const [formData,      setFormData]      = useState(initialData);
  const [draftStatus,   setDraftStatus]   = useState('idle');   // idle | saving | saved | error
  const [lastSavedAt,   setLastSavedAt]   = useState(null);
  const [hasLocalDraft, setHasLocalDraft] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const debounceRef  = useRef(null);
  const formDataRef  = useRef(formData);

  // Keep ref in sync so fire-and-forget handlers always write the latest data
  useEffect(() => { formDataRef.current = formData; }, [formData]);

  // ── Draft key ────────────────────────────────────────────────────────────────
  const getDraftKey = useCallback(() => {
    if (!userId || !wardId || !reportMonth) return null;
    return `wdc_draft:${userId}:${wardId}:${reportMonth}`;
  }, [userId, wardId, reportMonth]);

  // ── Save draft ────────────────────────────────────────────────────────────────
  const saveDraftToLocal = useCallback(async (data) => {
    const key = getDraftKey();
    if (!key) {
      if (import.meta.env.DEV) {
        console.warn('[useLocalDraft] Cannot save: missing key components', { userId, wardId, reportMonth });
      }
      return false;
    }

    try {
      const payload = {
        formData: data,
        savedAt:  new Date().toISOString(),
        version:  1,
      };
      await storage.set(key, JSON.stringify(payload));
      setLastSavedAt(new Date());
      setDraftStatus('saved');
      setHasLocalDraft(true);
      if (import.meta.env.DEV) console.log('[useLocalDraft] Draft saved', { key });
      return true;
    } catch (err) {
      setDraftStatus('error');
      if (import.meta.env.DEV) console.error('[useLocalDraft] Save failed:', err);
      return false;
    }
  }, [getDraftKey, userId, wardId, reportMonth]);

  // ── Load draft ────────────────────────────────────────────────────────────────
  const loadDraftFromLocal = useCallback(async () => {
    const key = getDraftKey();
    if (!key) return null;
    try {
      const raw = await storage.get(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (import.meta.env.DEV) console.log('[useLocalDraft] Draft loaded', { key, savedAt: parsed.savedAt });
      return parsed;
    } catch (err) {
      if (import.meta.env.DEV) console.error('[useLocalDraft] Load failed:', err);
      return null;
    }
  }, [getDraftKey]);

  // ── Clear draft ───────────────────────────────────────────────────────────────
  const clearLocalDraft = useCallback(async () => {
    const key = getDraftKey();
    if (!key) return;
    try {
      await storage.remove(key);
      setHasLocalDraft(false);
      setLastSavedAt(null);
      setDraftStatus('idle');
      if (import.meta.env.DEV) console.log('[useLocalDraft] Draft cleared', { key });
    } catch (err) {
      if (import.meta.env.DEV) console.error('[useLocalDraft] Clear failed:', err);
    }
  }, [getDraftKey]);

  // ── Debounced save ────────────────────────────────────────────────────────────
  const debouncedSave = useCallback((data) => {
    setDraftStatus('saving');
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => saveDraftToLocal(data), debounceMs);
  }, [saveDraftToLocal, debounceMs]);

  // ── Force immediate save (e.g. "Save Draft" button) ──────────────────────────
  const forceSave = useCallback(async () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    return saveDraftToLocal(formDataRef.current);
  }, [saveDraftToLocal]);

  // ── Update form data + trigger auto-save ──────────────────────────────────────
  const updateFormData = useCallback((updater) => {
    setFormData((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      debouncedSave(next);
      return next;
    });
  }, [debouncedSave]);

  // ── Handle individual input change events ─────────────────────────────────────
  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    updateFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  }, [updateFormData]);

  // ── Initialise: load draft from storage on mount ──────────────────────────────
  useEffect(() => {
    if (!getDraftKey() || isInitialized) return;

    let cancelled = false;

    (async () => {
      const draft = await loadDraftFromLocal();
      if (cancelled) return;

      if (draft?.formData) {
        setFormData((prev) => ({ ...prev, ...draft.formData }));
        setLastSavedAt(new Date(draft.savedAt));
        setHasLocalDraft(true);
        setDraftStatus('saved');
      }
      setIsInitialized(true);
    })();

    return () => { cancelled = true; };
  }, [getDraftKey, loadDraftFromLocal, isInitialized]);

  // ── Save on visibility change (web tab blur / native app background) ──────────
  useEffect(() => {
    // Web: visibilitychange is reliable
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        saveDraftToLocal(formDataRef.current);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    let nativePauseHandle = null;
    if (isNative) {
      // Native: additionally hook into the Capacitor pause event for reliability
      appLifecycle.onPause(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        saveDraftToLocal(formDataRef.current);
      }).then((h) => { nativePauseHandle = h; });
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      nativePauseHandle?.remove?.();
    };
  }, [saveDraftToLocal]);

  // ── Save on beforeunload (web page close/refresh) ─────────────────────────────
  // storage.set is async but beforeunload cannot await. We fire-and-forget:
  // on web the sync localStorage path executes synchronously under the hood.
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      saveDraftToLocal(formDataRef.current); // fire-and-forget
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [saveDraftToLocal]);

  // ── Cleanup on unmount: flush pending debounce ────────────────────────────────
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        saveDraftToLocal(formDataRef.current);
      }
    };
  }, [saveDraftToLocal]);

  // ── Restore draft (called programmatically from parent) ───────────────────────
  const restoreDraft = useCallback((draft) => {
    if (draft?.formData) {
      setFormData((prev) => ({ ...prev, ...draft.formData }));
      setLastSavedAt(draft.savedAt ? new Date(draft.savedAt) : null);
      setHasLocalDraft(true);
      setDraftStatus('saved');
    }
  }, []);

  // ── Check for an existing draft without restoring it ─────────────────────────
  const checkForDraft = useCallback(() => loadDraftFromLocal(), [loadDraftFromLocal]);

  return {
    formData,
    draftStatus,
    lastSavedAt,
    hasLocalDraft,
    isInitialized,
    updateFormData,
    handleChange,
    forceSave,
    clearLocalDraft,
    restoreDraft,
    checkForDraft,
    setFormData,
    getDraftKey,
  };
};

export default useLocalDraft;
