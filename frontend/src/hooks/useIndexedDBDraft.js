import { useState, useCallback, useEffect, useRef } from 'react';
import { openDB } from 'idb';

const DB_NAME = 'wdc-drafts';
const DB_VERSION = 1;
const STORE = 'drafts';

async function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'key' });
        store.createIndex('userId', 'userId');
        store.createIndex('updatedAt', 'updatedAt');
      }
    },
  });
}

export function useIndexedDBDraft({ userId, wardId, reportMonth, initialData = {}, debounceMs = 1500 }) {
  const [formData, setFormData] = useState(initialData);
  const [draftStatus, setDraftStatus] = useState('idle');
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [hasExistingDraft, setHasExistingDraft] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const formDataRef = useRef(formData);
  const debounceRef = useRef(null);

  const key = userId && wardId && reportMonth ? `${userId}:${wardId}:${reportMonth}` : null;

  useEffect(() => { formDataRef.current = formData; }, [formData]);

  const saveDraft = useCallback(async (data) => {
    if (!key) return false;
    try {
      setDraftStatus('saving');
      const db = await getDB();
      await db.put(STORE, {
        key,
        userId,
        formData: data,
        updatedAt: new Date().toISOString(),
        version: 1,
      });
      setLastSavedAt(new Date());
      setDraftStatus('saved');
      setHasExistingDraft(true);
      return true;
    } catch (err) {
      console.error('[IndexedDBDraft] Save failed:', err);
      setDraftStatus('error');
      return false;
    }
  }, [key, userId]);

  const loadDraft = useCallback(async () => {
    if (!key) return null;
    try {
      const db = await getDB();
      const draft = await db.get(STORE, key);
      return draft || null;
    } catch (err) {
      console.error('[IndexedDBDraft] Load failed:', err);
      return null;
    }
  }, [key]);

  const clearDraft = useCallback(async () => {
    if (!key) return;
    try {
      const db = await getDB();
      await db.delete(STORE, key);
      setHasExistingDraft(false);
      setLastSavedAt(null);
      setDraftStatus('idle');
    } catch (err) {
      console.error('[IndexedDBDraft] Clear failed:', err);
    }
  }, [key]);

  // Debounced auto-save
  const debouncedSave = useCallback((data) => {
    setDraftStatus('saving');
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => saveDraft(data), debounceMs);
  }, [saveDraft, debounceMs]);

  const updateFormData = useCallback((updater) => {
    setFormData(prev => {
      const newData = typeof updater === 'function' ? updater(prev) : updater;
      debouncedSave(newData);
      return newData;
    });
  }, [debouncedSave]);

  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    updateFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  }, [updateFormData]);

  const forceSave = useCallback(async () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    return saveDraft(formDataRef.current);
  }, [saveDraft]);

  // Initialize: load draft on mount
  useEffect(() => {
    if (!key || isInitialized) return;
    (async () => {
      const draft = await loadDraft();
      if (draft?.formData) {
        setFormData(prev => ({ ...prev, ...draft.formData }));
        setLastSavedAt(draft.updatedAt ? new Date(draft.updatedAt) : null);
        setHasExistingDraft(true);
        setDraftStatus('saved');
      }
      setIsInitialized(true);
    })();
  }, [key, loadDraft, isInitialized]);

  // Save on visibility change (tab blur)
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === 'hidden') {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        saveDraft(formDataRef.current);
      }
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [saveDraft]);

  // Save on beforeunload
  useEffect(() => {
    const handler = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      // Use sync localStorage fallback for beforeunload since IndexedDB is async
      if (key) {
        try {
          localStorage.setItem(`wdc_draft_backup:${key}`, JSON.stringify(formDataRef.current));
        } catch {}
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [key]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        saveDraft(formDataRef.current);
      }
    };
  }, [saveDraft]);

  return {
    formData, setFormData, draftStatus, lastSavedAt, hasExistingDraft, isInitialized,
    updateFormData, handleChange, forceSave, clearDraft, loadDraft,
  };
}

export default useIndexedDBDraft;
