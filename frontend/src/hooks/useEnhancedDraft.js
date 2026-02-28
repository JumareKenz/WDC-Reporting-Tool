import { useState, useCallback, useEffect, useRef } from 'react';
import { openDB } from 'idb';

const DB_NAME = 'wdc-drafts-v2';
const DB_VERSION = 1;
const STORE = 'drafts';

/**
 * Enhanced Draft Hook with Attachments
 * 
 * Features:
 * - IndexedDB storage for large data
 * - Binary attachment support
 * - Step/wizard position preservation
 * - Conflict detection with server
 */

async function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'key' });
        store.createIndex('userId', 'userId');
        store.createIndex('updatedAt', 'updatedAt');
        store.createIndex('reportMonth', 'reportMonth');
      }
    }
  });
}

export function useEnhancedDraft({ 
  userId, 
  wardId, 
  reportMonth, 
  initialData = {},
  serverDraft = null,
  debounceMs = 2000,
  onConflict = null
}) {
  const [formData, setFormData] = useState(initialData);
  const [currentStep, setCurrentStep] = useState(0);
  const [attachments, setAttachments] = useState([]);
  const [draftStatus, setDraftStatus] = useState('idle'); // idle | saving | saved | error
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [hasConflict, setHasConflict] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  
  const formDataRef = useRef(formData);
  const currentStepRef = useRef(currentStep);
  const attachmentsRef = useRef(attachments);
  const debounceRef = useRef(null);
  const isInitializedRef = useRef(false);

  const key = userId && wardId && reportMonth 
    ? `draft:${userId}:${wardId}:${reportMonth}` 
    : null;

  // Keep refs in sync
  useEffect(() => { formDataRef.current = formData; }, [formData]);
  useEffect(() => { currentStepRef.current = currentStep; }, [currentStep]);
  useEffect(() => { attachmentsRef.current = attachments; }, [attachments]);

  // Save draft to IndexedDB
  const saveDraft = useCallback(async (data = null, step = null, atts = null) => {
    if (!key) return false;

    const draftData = data ?? formDataRef.current;
    const draftStep = step ?? currentStepRef.current;
    const draftAttachments = atts ?? attachmentsRef.current;

    try {
      setDraftStatus('saving');
      
      const db = await getDB();
      
      // Convert attachments to storable format
      const storableAttachments = await Promise.all(
        draftAttachments.map(async (att) => ({
          id: att.id,
          name: att.file.name,
          type: att.file.type,
          size: att.file.size,
          buffer: att.buffer || await att.file.arrayBuffer(),
          fieldName: att.fieldName
        }))
      );

      await db.put(STORE, {
        key,
        userId,
        wardId,
        reportMonth,
        formData: draftData,
        currentStep: draftStep,
        attachments: storableAttachments,
        updatedAt: new Date().toISOString(),
        version: 2
      });

      setLastSavedAt(new Date());
      setDraftStatus('saved');
      
      return true;
    } catch (err) {
      console.error('[useEnhancedDraft] Save failed:', err);
      setDraftStatus('error');
      return false;
    }
  }, [key, userId, wardId, reportMonth]);

  // Load draft from IndexedDB
  const loadDraft = useCallback(async () => {
    if (!key) return null;

    try {
      const db = await getDB();
      const draft = await db.get(STORE, key);
      
      if (!draft) return null;

      // Reconstruct attachments
      const files = draft.attachments?.map(att => ({
        id: att.id,
        fieldName: att.fieldName,
        file: new File([att.buffer], att.name, { type: att.type }),
        buffer: att.buffer
      })) || [];

      return {
        formData: draft.formData,
        currentStep: draft.currentStep || 0,
        attachments: files,
        updatedAt: draft.updatedAt
      };
    } catch (err) {
      console.error('[useEnhancedDraft] Load failed:', err);
      return null;
    }
  }, [key]);

  // Clear draft
  const clearDraft = useCallback(async () => {
    if (!key) return;
    
    try {
      const db = await getDB();
      await db.delete(STORE, key);
      setLastSavedAt(null);
      setDraftStatus('idle');
      setFormData(initialData);
      setCurrentStep(0);
      setAttachments([]);
    } catch (err) {
      console.error('[useEnhancedDraft] Clear failed:', err);
    }
  }, [key, initialData]);

  // Debounced save
  const debouncedSave = useCallback((data, step, atts) => {
    setDraftStatus('saving');
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      saveDraft(data, step, atts);
    }, debounceMs);
  }, [saveDraft, debounceMs]);

  // Update form data
  const updateFormData = useCallback((updater) => {
    setFormData(prev => {
      const newData = typeof updater === 'function' ? updater(prev) : updater;
      debouncedSave(newData, undefined, undefined);
      return newData;
    });
  }, [debouncedSave]);

  // Update current step
  const updateStep = useCallback((step) => {
    setCurrentStep(step);
    debouncedSave(undefined, step, undefined);
  }, [debouncedSave]);

  // Add attachment
  const addAttachment = useCallback(async (file, fieldName) => {
    const buffer = await file.arrayBuffer();
    const newAtt = {
      id: crypto.randomUUID(),
      fieldName,
      file,
      buffer
    };
    
    setAttachments(prev => {
      const next = [...prev, newAtt];
      debouncedSave(undefined, undefined, next);
      return next;
    });
    
    return newAtt.id;
  }, [debouncedSave]);

  // Remove attachment
  const removeAttachment = useCallback((id) => {
    setAttachments(prev => {
      const next = prev.filter(a => a.id !== id);
      debouncedSave(undefined, undefined, next);
      return next;
    });
  }, [debouncedSave]);

  // Initialize: Check for drafts
  useEffect(() => {
    if (!key || isInitializedRef.current) return;

    (async () => {
      const localDraft = await loadDraft();
      
      if (localDraft || serverDraft) {
        // Check for conflict
        if (localDraft && serverDraft) {
          const localDate = new Date(localDraft.updatedAt);
          const serverDate = new Date(serverDraft.updated_at || serverDraft.updatedAt);
          
          // Significant time difference = potential conflict
          if (Math.abs(localDate - serverDate) > 5 * 60 * 1000) { // 5 min difference
            setHasConflict(true);
            setShowRestoreDialog(true);
            if (onConflict) {
              onConflict({ local: localDraft, server: serverDraft });
            }
            isInitializedRef.current = true;
            setIsInitialized(true);
            return;
          }
        }

        // No significant conflict, use local if exists (it's newer or only one)
        if (localDraft) {
          setFormData(prev => ({ ...prev, ...localDraft.formData }));
          setCurrentStep(localDraft.currentStep);
          setAttachments(localDraft.attachments);
          setLastSavedAt(new Date(localDraft.updatedAt));
          setDraftStatus('saved');
        } else if (serverDraft) {
          setFormData(prev => ({ ...prev, ...serverDraft.form_data }));
          setDraftStatus('idle');
        }
      }

      isInitializedRef.current = true;
      setIsInitialized(true);
    })();
  }, [key, serverDraft, loadDraft, onConflict]);

  // Save on visibility change (tab switch)
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === 'hidden') {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        saveDraft();
      }
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [saveDraft]);

  // Save on beforeunload
  useEffect(() => {
    const handler = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      saveDraft();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [saveDraft]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        saveDraft();
      }
    };
  }, [saveDraft]);

  // Handle restore choice
  const restoreLocalDraft = useCallback(async () => {
    const localDraft = await loadDraft();
    if (localDraft) {
      setFormData(prev => ({ ...prev, ...localDraft.formData }));
      setCurrentStep(localDraft.currentStep);
      setAttachments(localDraft.attachments);
      setLastSavedAt(new Date(localDraft.updatedAt));
      setDraftStatus('saved');
    }
    setShowRestoreDialog(false);
    setHasConflict(false);
  }, [loadDraft]);

  const restoreServerDraft = useCallback(() => {
    if (serverDraft) {
      setFormData(prev => ({ ...prev, ...serverDraft.form_data }));
      setCurrentStep(0);
      setAttachments([]);
      setDraftStatus('idle');
    }
    setShowRestoreDialog(false);
    setHasConflict(false);
  }, [serverDraft]);

  const mergeDrafts = useCallback(async () => {
    const localDraft = await loadDraft();
    if (localDraft && serverDraft) {
      // Merge: prefer local for most fields, but could be smarter
      const merged = {
        ...serverDraft.form_data,
        ...localDraft.formData // Local takes precedence
      };
      setFormData(merged);
      setCurrentStep(localDraft.currentStep);
      setAttachments(localDraft.attachments);
      setLastSavedAt(new Date());
      setDraftStatus('saved');
    }
    setShowRestoreDialog(false);
    setHasConflict(false);
  }, [loadDraft, serverDraft]);

  return {
    // State
    formData,
    currentStep,
    attachments,
    draftStatus,
    lastSavedAt,
    showRestoreDialog,
    hasConflict,
    isInitialized,
    
    // Actions
    updateFormData,
    updateStep,
    setCurrentStep: updateStep,
    addAttachment,
    removeAttachment,
    saveDraft,
    loadDraft,
    clearDraft,
    setShowRestoreDialog,
    restoreLocalDraft,
    restoreServerDraft,
    mergeDrafts,
    
    // Helpers
    hasDraft: !!lastSavedAt || draftStatus === 'saved'
  };
}

export default useEnhancedDraft;
