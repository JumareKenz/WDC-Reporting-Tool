import { openDB } from 'idb';

const DB_NAME = 'wdc-voice-notes';
const DB_VERSION = 1;
const STORE_NAME = 'pending-voice-notes';

/**
 * Open the IndexedDB database for voice note storage
 * @returns {Promise<IDBPDatabase>}
 */
async function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' });
        store.createIndex('reportId', 'reportId');
        store.createIndex('createdAt', 'createdAt');
      }
    },
  });
}

/**
 * Generate a storage key for a voice note
 * @param {string|number} reportId 
 * @param {string} fieldName 
 * @returns {string}
 */
function generateKey(reportId, fieldName) {
  return `${reportId}_${fieldName}`;
}

/**
 * Save a voice note blob to IndexedDB for offline storage
 * @param {string|number} reportId - Report ID
 * @param {string} fieldName - Field name/key
 * @param {Blob} blob - Audio blob
 * @param {string} mimeType - MIME type of the audio
 * @returns {Promise<boolean>}
 */
export async function saveVoiceNoteBlob(reportId, fieldName, blob, mimeType) {
  try {
    const db = await getDB();
    const key = generateKey(reportId, fieldName);
    
    await db.put(STORE_NAME, {
      key,
      reportId: String(reportId),
      fieldName,
      blob,
      mimeType,
      createdAt: new Date().toISOString(),
    });
    
    return true;
  } catch (error) {
    console.error('[voiceNoteStorage] Failed to save blob:', error);
    return false;
  }
}

/**
 * Retrieve a voice note blob from IndexedDB
 * @param {string|number} reportId - Report ID
 * @param {string} fieldName - Field name/key
 * @returns {Promise<{blob: Blob, mimeType: string}|null>}
 */
export async function getVoiceNoteBlob(reportId, fieldName) {
  try {
    const db = await getDB();
    const key = generateKey(reportId, fieldName);
    const entry = await db.get(STORE_NAME, key);
    
    if (!entry) return null;
    
    return {
      blob: entry.blob,
      mimeType: entry.mimeType,
    };
  } catch (error) {
    console.error('[voiceNoteStorage] Failed to get blob:', error);
    return null;
  }
}

/**
 * Delete a voice note blob from IndexedDB after successful upload
 * @param {string|number} reportId - Report ID
 * @param {string} fieldName - Field name/key
 * @returns {Promise<boolean>}
 */
export async function deleteVoiceNoteBlob(reportId, fieldName) {
  try {
    const db = await getDB();
    const key = generateKey(reportId, fieldName);
    await db.delete(STORE_NAME, key);
    return true;
  } catch (error) {
    console.error('[voiceNoteStorage] Failed to delete blob:', error);
    return false;
  }
}

/**
 * Get all pending voice notes from IndexedDB
 * @returns {Promise<Array<{key: string, reportId: string, fieldName: string, blob: Blob, mimeType: string, createdAt: string}>>}
 */
export async function getPendingVoiceNotes() {
  try {
    const db = await getDB();
    const allEntries = await db.getAll(STORE_NAME);
    return allEntries;
  } catch (error) {
    console.error('[voiceNoteStorage] Failed to get pending notes:', error);
    return [];
  }
}

/**
 * Clear all voice notes from IndexedDB (use with caution)
 * @returns {Promise<boolean>}
 */
export async function clearAllVoiceNotes() {
  try {
    const db = await getDB();
    await db.clear(STORE_NAME);
    return true;
  } catch (error) {
    console.error('[voiceNoteStorage] Failed to clear all notes:', error);
    return false;
  }
}

/**
 * Check if there are any pending voice notes for a specific report
 * @param {string|number} reportId - Report ID
 * @returns {Promise<boolean>}
 */
export async function hasPendingVoiceNotesForReport(reportId) {
  try {
    const db = await getDB();
    const index = db.transaction(STORE_NAME).store.index('reportId');
    const entries = await index.getAll(String(reportId));
    return entries.length > 0;
  } catch (error) {
    console.error('[voiceNoteStorage] Failed to check pending notes:', error);
    return false;
  }
}
