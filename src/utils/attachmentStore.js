/**
 * Offline Attachment Storage
 * 
 * Uses IndexedDB to store binary attachments when offline,
 * then uploads when connection restored.
 */

const DB_NAME = 'wdc-attachments';
const DB_VERSION = 1;
const STORE_NAME = 'pending-attachments';

/**
 * Get IndexedDB instance
 */
async function getDB() {
  const { openDB } = await import('idb');
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('reportId', 'reportId');
        store.createIndex('timestamp', 'timestamp');
      }
    }
  });
}

/**
 * Store attachment for offline upload
 * @param {File} file - File to store
 * @param {Object} metadata - Attachment metadata
 * @returns {Promise<string>} - Attachment ID
 */
export async function storeAttachmentOffline(file, metadata = {}) {
  const db = await getDB();
  
  const id = generateId();
  const buffer = await file.arrayBuffer();
  
  await db.put(STORE_NAME, {
    id,
    buffer,
    name: file.name,
    type: file.type,
    size: file.size,
    metadata,
    timestamp: Date.now(),
    attempts: 0,
    status: 'pending' // pending | uploading | failed
  });
  
  return id;
}

/**
 * Store multiple attachments
 * @param {Array<{file: File, metadata: Object}>} attachments 
 * @returns {Promise<string[]>} - Attachment IDs
 */
export async function storeAttachmentsOffline(attachments) {
  const ids = [];
  for (const { file, metadata } of attachments) {
    const id = await storeAttachmentOffline(file, metadata);
    ids.push(id);
  }
  return ids;
}

/**
 * Get all pending attachments
 * @param {Object} filter - Filter options
 * @returns {Promise<Array>}
 */
export async function getPendingAttachments(filter = {}) {
  const db = await getDB();
  const all = await db.getAll(STORE_NAME);
  
  if (filter.reportId) {
    return all.filter(a => a.metadata.reportId === filter.reportId);
  }
  
  if (filter.status) {
    return all.filter(a => a.status === filter.status);
  }
  
  return all;
}

/**
 * Get a single attachment
 * @param {string} id - Attachment ID
 * @returns {Promise<Object|null>}
 */
export async function getAttachment(id) {
  const db = await getDB();
  const record = await db.get(STORE_NAME, id);
  
  if (!record) return null;
  
  // Reconstruct File object
  const file = new File([record.buffer], record.name, {
    type: record.type
  });
  
  return {
    ...record,
    file
  };
}

/**
 * Remove attachment from queue
 * @param {string} id - Attachment ID
 */
export async function removeAttachment(id) {
  const db = await getDB();
  await db.delete(STORE_NAME, id);
}

/**
 * Update attachment metadata
 * @param {string} id - Attachment ID
 * @param {Object} updates - Updates to apply
 */
export async function updateAttachment(id, updates) {
  const db = await getDB();
  const record = await db.get(STORE_NAME, id);
  
  if (record) {
    await db.put(STORE_NAME, { ...record, ...updates });
  }
}

/**
 * Mark attachment as uploaded
 * @param {string} id - Attachment ID
 */
export async function markAttachmentUploaded(id) {
  await updateAttachment(id, { status: 'uploaded', uploadedAt: Date.now() });
  await removeAttachment(id); // Remove from pending queue
}

/**
 * Mark attachment as failed
 * @param {string} id - Attachment ID
 * @param {string} error - Error message
 */
export async function markAttachmentFailed(id, error) {
  const db = await getDB();
  const record = await db.get(STORE_NAME, id);
  
  if (record) {
    await db.put(STORE_NAME, {
      ...record,
      status: 'failed',
      attempts: (record.attempts || 0) + 1,
      lastError: error,
      failedAt: Date.now()
    });
  }
}

/**
 * Clear all attachments
 */
export async function clearAllAttachments() {
  const db = await getDB();
  await db.clear(STORE_NAME);
}

/**
 * Get storage statistics
 * @returns {Promise<Object>}
 */
export async function getStorageStats() {
  const attachments = await getPendingAttachments();
  
  const totalSize = attachments.reduce((sum, a) => sum + (a.size || 0), 0);
  const byStatus = attachments.reduce((acc, a) => {
    acc[a.status || 'pending'] = (acc[a.status || 'pending'] || 0) + 1;
    return acc;
  }, {});
  
  return {
    count: attachments.length,
    totalSize,
    byStatus,
    oldest: attachments.length > 0 
      ? Math.min(...attachments.map(a => a.timestamp))
      : null
  };
}

/**
 * Check if storage is nearing quota
 * @returns {Promise<boolean>}
 */
export async function isStorageLow() {
  try {
    const stats = await getStorageStats();
    // Consider storage low if > 100MB
    return stats.totalSize > 100 * 1024 * 1024;
  } catch {
    return false;
  }
}

/**
 * Clean up old failed attachments
 * @param {number} maxAge - Max age in milliseconds (default 7 days)
 */
export async function cleanupOldAttachments(maxAge = 7 * 24 * 60 * 60 * 1000) {
  const db = await getDB();
  const all = await db.getAll(STORE_NAME);
  const now = Date.now();
  
  for (const attachment of all) {
    if (attachment.status === 'failed' && 
        attachment.failedAt && 
        now - attachment.failedAt > maxAge) {
      await db.delete(STORE_NAME, attachment.id);
    }
  }
}

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export default {
  storeAttachmentOffline,
  storeAttachmentsOffline,
  getPendingAttachments,
  getAttachment,
  removeAttachment,
  updateAttachment,
  markAttachmentUploaded,
  markAttachmentFailed,
  clearAllAttachments,
  getStorageStats,
  isStorageLow,
  cleanupOldAttachments
};
