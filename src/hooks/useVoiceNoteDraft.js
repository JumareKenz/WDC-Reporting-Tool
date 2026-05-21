import { useState, useEffect, useCallback, useRef } from 'react';
import { openDB } from 'idb';

const DB_NAME = 'wdc-voice-note-drafts';
const DB_VERSION = 1;
const STORE_NAME = 'drafts';

/**
 * IndexedDB schema for voice note drafts:
 * - key: `${userId}:${wardId}:${reportMonth}:${fieldName}`
 * - blob: The audio Blob
 * - mimeType: MIME type of the recording
 * - duration: Recording duration in seconds (if available)
 * - createdAt: ISO timestamp
 * - fieldName: Field identifier
 */

async function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' });
        store.createIndex('draftKey', 'draftKey'); // For querying all voice notes for a draft
        store.createIndex('createdAt', 'createdAt');
        store.createIndex('userId', 'userId');
      }
    },
  });
}

/**
 * Generate a unique key for a voice note draft entry
 */
function generateKey(userId, wardId, reportMonth, fieldName) {
  return `${userId}:${wardId}:${reportMonth}:${fieldName}`;
}

/**
 * Generate the parent draft key (without fieldName) for querying
 */
function generateDraftKey(userId, wardId, reportMonth) {
  return `${userId}:${wardId}:${reportMonth}`;
}

/**
 * Hook for managing voice note drafts with IndexedDB persistence
 * 
 * @param {Object} options
 * @param {number|string} options.userId - User ID
 * @param {number|string} options.wardId - Ward ID  
 * @param {string} options.reportMonth - Report month (YYYY-MM)
 * @param {boolean} options.enabled - Whether draft persistence is enabled (default: true)
 */
export function useVoiceNoteDraft({ userId, wardId, reportMonth, enabled = true }) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [voiceNotes, setVoiceNotes] = useState({}); // fieldName -> { blob, url, mimeType, duration }
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const dbRef = useRef(null);
  const voiceNotesRef = useRef(voiceNotes);
  
  // Keep ref in sync with state
  useEffect(() => {
    voiceNotesRef.current = voiceNotes;
  }, [voiceNotes]);

  /**
   * Initialize DB connection
   */
  useEffect(() => {
    if (!enabled) return;
    
    let isMounted = true;
    
    (async () => {
      try {
        dbRef.current = await getDB();
        if (isMounted) setIsInitialized(true);
      } catch (err) {
        console.error('[useVoiceNoteDraft] Failed to initialize DB:', err);
        if (isMounted) setError('Failed to initialize voice note storage');
      }
    })();
    
    return () => {
      isMounted = false;
    };
  }, [enabled]);

  /**
   * Load all voice note drafts for the current draft context
   */
  const loadVoiceNoteDrafts = useCallback(async () => {
    if (!dbRef.current || !userId || !wardId || !reportMonth) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const draftKey = generateDraftKey(userId, wardId, reportMonth);
      const index = dbRef.current.transaction(STORE_NAME).store.index('draftKey');
      const entries = await index.getAll(draftKey);
      
      const loadedNotes = {};
      
      entries.forEach(entry => {
        // Create object URL for the blob
        const url = URL.createObjectURL(entry.blob);
        loadedNotes[entry.fieldName] = {
          blob: entry.blob,
          url,
          mimeType: entry.mimeType,
          duration: entry.duration,
          createdAt: entry.createdAt,
        };
      });
      
      setVoiceNotes(loadedNotes);
      
      if (process.env.NODE_ENV === 'development') {
        console.log('[useVoiceNoteDraft] Loaded voice note drafts:', Object.keys(loadedNotes));
      }
      
      return loadedNotes;
    } catch (err) {
      console.error('[useVoiceNoteDraft] Failed to load drafts:', err);
      setError('Failed to load voice note drafts');
      return {};
    } finally {
      setIsLoading(false);
    }
  }, [userId, wardId, reportMonth]);

  /**
   * Auto-load voice note drafts when context changes
   */
  useEffect(() => {
    if (!isInitialized || !enabled) return;
    if (!userId || !wardId || !reportMonth) return;
    
    loadVoiceNoteDrafts();
  }, [isInitialized, userId, wardId, reportMonth, enabled, loadVoiceNoteDrafts]);

  /**
   * Save a voice note to IndexedDB
   */
  const saveVoiceNote = useCallback(async (fieldName, blob, mimeType, duration = null) => {
    if (!dbRef.current || !userId || !wardId || !reportMonth) {
      console.warn('[useVoiceNoteDraft] Cannot save: missing context');
      return false;
    }
    
    if (!blob || !(blob instanceof Blob)) {
      console.warn('[useVoiceNoteDraft] Cannot save: invalid blob');
      return false;
    }
    
    try {
      const key = generateKey(userId, wardId, reportMonth, fieldName);
      const draftKey = generateDraftKey(userId, wardId, reportMonth);
      
      await dbRef.current.put(STORE_NAME, {
        key,
        draftKey,
        userId: String(userId),
        wardId: String(wardId),
        reportMonth,
        fieldName,
        blob,
        mimeType: mimeType || blob.type || 'audio/webm',
        duration,
        createdAt: new Date().toISOString(),
      });
      
      // Update local state
      const url = URL.createObjectURL(blob);
      setVoiceNotes(prev => ({
        ...prev,
        [fieldName]: { blob, url, mimeType: mimeType || blob.type, duration },
      }));
      
      if (process.env.NODE_ENV === 'development') {
        console.log('[useVoiceNoteDraft] Saved voice note:', fieldName);
      }
      
      return true;
    } catch (err) {
      console.error('[useVoiceNoteDraft] Failed to save voice note:', err);
      setError('Failed to save voice note');
      return false;
    }
  }, [userId, wardId, reportMonth]);

  /**
   * Remove a voice note from IndexedDB and state
   */
  const removeVoiceNote = useCallback(async (fieldName) => {
    if (!dbRef.current || !userId || !wardId || !reportMonth) return false;
    
    try {
      const key = generateKey(userId, wardId, reportMonth, fieldName);
      await dbRef.current.delete(STORE_NAME, key);
      
      // Revoke object URL to prevent memory leak
      setVoiceNotes(prev => {
        const note = prev[fieldName];
        if (note?.url) {
          URL.revokeObjectURL(note.url);
        }
        const { [fieldName]: _, ...rest } = prev;
        return rest;
      });
      
      if (process.env.NODE_ENV === 'development') {
        console.log('[useVoiceNoteDraft] Removed voice note:', fieldName);
      }
      
      return true;
    } catch (err) {
      console.error('[useVoiceNoteDraft] Failed to remove voice note:', err);
      return false;
    }
  }, [userId, wardId, reportMonth]);

  /**
   * Clear ALL voice notes for the current draft context
   * (Call this after successful submission)
   */
  const clearAllVoiceNotes = useCallback(async () => {
    if (!dbRef.current || !userId || !wardId || !reportMonth) return false;
    
    try {
      const draftKey = generateDraftKey(userId, wardId, reportMonth);
      const index = dbRef.current.transaction(STORE_NAME, 'readwrite').store.index('draftKey');
      const entries = await index.getAll(draftKey);
      
      // Delete all entries for this draft
      for (const entry of entries) {
        await dbRef.current.delete(STORE_NAME, entry.key);
      }
      
      // Revoke all object URLs
      Object.values(voiceNotesRef.current).forEach(note => {
        if (note?.url) URL.revokeObjectURL(note.url);
      });
      
      setVoiceNotes({});
      
      if (process.env.NODE_ENV === 'development') {
        console.log('[useVoiceNoteDraft] Cleared all voice notes for draft:', draftKey);
      }
      
      return true;
    } catch (err) {
      console.error('[useVoiceNoteDraft] Failed to clear voice notes:', err);
      return false;
    }
  }, [userId, wardId, reportMonth]);

  /**
   * Check if a voice note exists for a field
   */
  const hasVoiceNote = useCallback((fieldName) => {
    return !!voiceNotes[fieldName]?.blob;
  }, [voiceNotes]);

  /**
   * Get voice note for a field
   */
  const getVoiceNote = useCallback((fieldName) => {
    return voiceNotes[fieldName] || null;
  }, [voiceNotes]);

  /**
   * Cleanup object URLs on unmount
   */
  useEffect(() => {
    return () => {
      // Revoke all object URLs to prevent memory leaks
      Object.values(voiceNotesRef.current).forEach(note => {
        if (note?.url) URL.revokeObjectURL(note.url);
      });
    };
  }, []);

  return {
    // State
    voiceNotes,
    isLoading,
    isInitialized,
    error,
    
    // Actions
    saveVoiceNote,
    removeVoiceNote,
    clearAllVoiceNotes,
    loadVoiceNoteDrafts,
    hasVoiceNote,
    getVoiceNote,
  };
}

/**
 * Standalone function to clear voice notes for a specific draft
 * Useful for calling after successful submission
 */
export async function clearVoiceNoteDrafts(userId, wardId, reportMonth) {
  try {
    const db = await getDB();
    const draftKey = generateDraftKey(userId, wardId, reportMonth);
    const index = db.transaction(STORE_NAME, 'readwrite').store.index('draftKey');
    const entries = await index.getAll(draftKey);
    
    for (const entry of entries) {
      await db.delete(STORE_NAME, entry.key);
    }
    
    return true;
  } catch (err) {
    console.error('[voiceNoteDraft] Failed to clear drafts:', err);
    return false;
  }
}

export default useVoiceNoteDraft;
