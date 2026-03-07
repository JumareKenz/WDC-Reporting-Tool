import { useState, useEffect, useCallback, useRef } from 'react';
import { openDB } from 'idb';

const DB_NAME = 'wdc-image-drafts';
const DB_VERSION = 1;
const STORE_NAME = 'drafts';

/**
 * IndexedDB schema for image drafts:
 * - key: `${userId}:${wardId}:${reportMonth}:${fieldName}:${index}`
 * - draftKey: `${userId}:${wardId}:${reportMonth}`
 * - fieldName: 'attendance_pictures' | 'group_photos'
 * - blob: The image Blob
 * - mimeType: MIME type of the image
 * - name: Original file name
 * - index: Position in the array
 * - createdAt: ISO timestamp
 */

async function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' });
        store.createIndex('draftKey', 'draftKey');
        store.createIndex('fieldName', 'fieldName');
        store.createIndex('createdAt', 'createdAt');
        store.createIndex('userId', 'userId');
      }
    },
  });
}

function generateKey(userId, wardId, reportMonth, fieldName, index) {
  return `${userId}:${wardId}:${reportMonth}:${fieldName}:${index}`;
}

function generateDraftKey(userId, wardId, reportMonth) {
  return `${userId}:${wardId}:${reportMonth}`;
}

/**
 * Hook for managing image file drafts with IndexedDB persistence
 * 
 * @param {Object} options
 * @param {number|string} options.userId - User ID
 * @param {number|string} options.wardId - Ward ID  
 * @param {string} options.reportMonth - Report month (YYYY-MM)
 * @param {boolean} options.enabled - Whether draft persistence is enabled
 */
export function useImageDraft({ userId, wardId, reportMonth, enabled = true }) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [images, setImages] = useState({}); // fieldName -> [{ blob, url, name, mimeType }]
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const dbRef = useRef(null);
  const imagesRef = useRef(images);
  
  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  useEffect(() => {
    if (!enabled) return;
    
    let isMounted = true;
    
    (async () => {
      try {
        dbRef.current = await getDB();
        if (isMounted) setIsInitialized(true);
      } catch (err) {
        console.error('[useImageDraft] Failed to initialize DB:', err);
        if (isMounted) setError('Failed to initialize image storage');
      }
    })();
    
    return () => {
      isMounted = false;
    };
  }, [enabled]);

  /**
   * Load all image drafts for the current draft context
   */
  const loadImageDrafts = useCallback(async () => {
    if (!dbRef.current || !userId || !wardId || !reportMonth) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const draftKey = generateDraftKey(userId, wardId, reportMonth);
      const index = dbRef.current.transaction(STORE_NAME).store.index('draftKey');
      const entries = await index.getAll(draftKey);
      
      // Group by fieldName
      const loadedImages = {};
      
      entries.forEach(entry => {
        if (!loadedImages[entry.fieldName]) {
          loadedImages[entry.fieldName] = [];
        }
        
        const url = URL.createObjectURL(entry.blob);
        loadedImages[entry.fieldName].push({
          blob: entry.blob,
          url,
          name: entry.name,
          mimeType: entry.mimeType,
          index: entry.index,
          createdAt: entry.createdAt,
        });
      });
      
      // Sort by index within each field
      Object.keys(loadedImages).forEach(fieldName => {
        loadedImages[fieldName].sort((a, b) => a.index - b.index);
      });
      
      setImages(loadedImages);
      
      if (process.env.NODE_ENV === 'development') {
        console.log('[useImageDraft] Loaded image drafts:', Object.keys(loadedImages));
      }
      
      return loadedImages;
    } catch (err) {
      console.error('[useImageDraft] Failed to load drafts:', err);
      setError('Failed to load image drafts');
      return {};
    } finally {
      setIsLoading(false);
    }
  }, [userId, wardId, reportMonth]);

  /**
   * Auto-load image drafts when context changes
   */
  useEffect(() => {
    if (!isInitialized || !enabled) return;
    if (!userId || !wardId || !reportMonth) return;
    
    loadImageDrafts();
  }, [isInitialized, userId, wardId, reportMonth, enabled, loadImageDrafts]);

  /**
   * Save images for a field to IndexedDB
   */
  const saveImages = useCallback(async (fieldName, fileList) => {
    if (!dbRef.current || !userId || !wardId || !reportMonth) {
      console.warn('[useImageDraft] Cannot save: missing context');
      return false;
    }
    
    try {
      const draftKey = generateDraftKey(userId, wardId, reportMonth);
      
      // First, delete existing entries for this field
      const index = dbRef.current.transaction(STORE_NAME, 'readwrite').store.index('fieldName');
      const allEntries = await index.getAll();
      const entriesToDelete = allEntries.filter(
        entry => entry.draftKey === draftKey && entry.fieldName === fieldName
      );
      
      for (const entry of entriesToDelete) {
        await dbRef.current.delete(STORE_NAME, entry.key);
      }
      
      // Then save new entries
      const savedImages = [];
      
      for (let i = 0; i < fileList.length; i++) {
        const item = fileList[i];
        const file = item.file || item;
        
        if (!(file instanceof Blob)) continue;
        
        const key = generateKey(userId, wardId, reportMonth, fieldName, i);
        
        await dbRef.current.put(STORE_NAME, {
          key,
          draftKey,
          userId: String(userId),
          wardId: String(wardId),
          reportMonth,
          fieldName,
          index: i,
          blob: file,
          mimeType: file.type || 'image/jpeg',
          name: file.name || `image_${i}.jpg`,
          createdAt: new Date().toISOString(),
        });
        
        const url = URL.createObjectURL(file);
        savedImages.push({
          blob: file,
          url,
          name: file.name || `image_${i}.jpg`,
          mimeType: file.type || 'image/jpeg',
          index: i,
        });
      }
      
      setImages(prev => ({
        ...prev,
        [fieldName]: savedImages,
      }));
      
      if (process.env.NODE_ENV === 'development') {
        console.log('[useImageDraft] Saved images for:', fieldName, savedImages.length);
      }
      
      return true;
    } catch (err) {
      console.error('[useImageDraft] Failed to save images:', err);
      setError('Failed to save images');
      return false;
    }
  }, [userId, wardId, reportMonth]);

  /**
   * Add a single image to a field
   */
  const addImage = useCallback(async (fieldName, file) => {
    if (!dbRef.current || !userId || !wardId || !reportMonth) return false;
    if (!(file instanceof Blob)) return false;
    
    try {
      const currentImages = imagesRef.current[fieldName] || [];
      const newIndex = currentImages.length;
      const key = generateKey(userId, wardId, reportMonth, fieldName, newIndex);
      const draftKey = generateDraftKey(userId, wardId, reportMonth);
      
      await dbRef.current.put(STORE_NAME, {
        key,
        draftKey,
        userId: String(userId),
        wardId: String(wardId),
        reportMonth,
        fieldName,
        index: newIndex,
        blob: file,
        mimeType: file.type || 'image/jpeg',
        name: file.name || `image_${newIndex}.jpg`,
        createdAt: new Date().toISOString(),
      });
      
      const url = URL.createObjectURL(file);
      const newImage = {
        blob: file,
        url,
        name: file.name || `image_${newIndex}.jpg`,
        mimeType: file.type || 'image/jpeg',
        index: newIndex,
      };
      
      setImages(prev => ({
        ...prev,
        [fieldName]: [...(prev[fieldName] || []), newImage],
      }));
      
      return true;
    } catch (err) {
      console.error('[useImageDraft] Failed to add image:', err);
      return false;
    }
  }, [userId, wardId, reportMonth, images]);

  /**
   * Remove all images for a field
   */
  const removeImages = useCallback(async (fieldName) => {
    if (!dbRef.current || !userId || !wardId || !reportMonth) return false;
    
    try {
      const draftKey = generateDraftKey(userId, wardId, reportMonth);
      const index = dbRef.current.transaction(STORE_NAME, 'readwrite').store.index('draftKey');
      const allEntries = await index.getAll(draftKey);
      const entriesToDelete = allEntries.filter(entry => entry.fieldName === fieldName);
      
      for (const entry of entriesToDelete) {
        await dbRef.current.delete(STORE_NAME, entry.key);
      }
      
      // Revoke object URLs
      const fieldImages = imagesRef.current[fieldName] || [];
      fieldImages.forEach(img => {
        if (img?.url) URL.revokeObjectURL(img.url);
      });
      
      setImages(prev => {
        const { [fieldName]: _, ...rest } = prev;
        return rest;
      });
      
      return true;
    } catch (err) {
      console.error('[useImageDraft] Failed to remove images:', err);
      return false;
    }
  }, [userId, wardId, reportMonth]);

  /**
   * Clear ALL images for the current draft context
   */
  const clearAllImages = useCallback(async () => {
    if (!dbRef.current || !userId || !wardId || !reportMonth) return false;
    
    try {
      const draftKey = generateDraftKey(userId, wardId, reportMonth);
      const index = dbRef.current.transaction(STORE_NAME, 'readwrite').store.index('draftKey');
      const entries = await index.getAll(draftKey);
      
      for (const entry of entries) {
        await dbRef.current.delete(STORE_NAME, entry.key);
      }
      
      // Revoke all object URLs
      Object.values(imagesRef.current).forEach(fieldImages => {
        fieldImages.forEach(img => {
          if (img?.url) URL.revokeObjectURL(img.url);
        });
      });
      
      setImages({});
      
      if (process.env.NODE_ENV === 'development') {
        console.log('[useImageDraft] Cleared all images for draft:', draftKey);
      }
      
      return true;
    } catch (err) {
      console.error('[useImageDraft] Failed to clear images:', err);
      return false;
    }
  }, [userId, wardId, reportMonth]);

  /**
   * Get images for a field
   */
  const getImages = useCallback((fieldName) => {
    return images[fieldName] || [];
  }, [images]);

  /**
   * Check if field has images
   */
  const hasImages = useCallback((fieldName) => {
    return !!(images[fieldName]?.length > 0);
  }, [images]);

  /**
   * Cleanup object URLs on unmount
   */
  useEffect(() => {
    return () => {
      Object.values(imagesRef.current).forEach(fieldImages => {
        fieldImages.forEach(img => {
          if (img?.url) URL.revokeObjectURL(img.url);
        });
      });
    };
  }, []);

  return {
    images,
    isLoading,
    isInitialized,
    error,
    saveImages,
    addImage,
    removeImages,
    clearAllImages,
    loadImageDrafts,
    getImages,
    hasImages,
  };
}

/**
 * Standalone function to clear image drafts for a specific draft
 */
export async function clearImageDrafts(userId, wardId, reportMonth) {
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
    console.error('[imageDraft] Failed to clear drafts:', err);
    return false;
  }
}

export default useImageDraft;
