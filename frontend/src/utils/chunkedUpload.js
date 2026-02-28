/**
 * Chunked File Upload with Resume Capability
 * 
 * Features:
 * - Split large files into chunks
 * - Per-chunk retry with exponential backoff
 * - Resume from last successful chunk
 * - Progress tracking
 */

import apiClient from '../api/client';

const CHUNK_SIZE = 512 * 1024; // 512KB chunks for poor networks
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

/**
 * Generate unique upload ID
 */
function generateUploadId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Delay helper
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Save upload progress to IndexedDB
 */
async function saveUploadProgress(uploadId, progress) {
  try {
    const { openDB } = await import('idb');
    const db = await openDB('wdc-uploads', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('progress')) {
          db.createObjectStore('progress', { keyPath: 'uploadId' });
        }
      }
    });
    await db.put('progress', { uploadId, ...progress, timestamp: Date.now() });
  } catch (e) {
    console.warn('[chunkedUpload] Failed to save progress:', e);
  }
}

/**
 * Load upload progress from IndexedDB
 */
async function loadUploadProgress(uploadId) {
  try {
    const { openDB } = await import('idb');
    const db = await openDB('wdc-uploads', 1);
    return await db.get('progress', uploadId);
  } catch {
    return null;
  }
}

/**
 * Clear upload progress
 */
async function clearUploadProgress(uploadId) {
  try {
    const { openDB } = await import('idb');
    const db = await openDB('wdc-uploads', 1);
    await db.delete('progress', uploadId);
  } catch {
    // Ignore cleanup errors
  }
}

/**
 * Upload a single chunk
 */
async function uploadChunk(chunk, url, options) {
  const { uploadId, chunkIndex, totalChunks, filename, fileType, headers } = options;

  const formData = new FormData();
  formData.append('chunk', chunk);
  formData.append('upload_id', uploadId);
  formData.append('chunk_index', chunkIndex.toString());
  formData.append('total_chunks', totalChunks.toString());
  formData.append('filename', filename);
  formData.append('file_type', fileType);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      ...headers
    },
    body: formData
  });

  if (!response.ok) {
    throw new Error(`Chunk upload failed: ${response.status}`);
  }

  return response.json();
}

/**
 * Finalize chunked upload
 */
async function finalizeUpload(url, options) {
  const { uploadId, filename, totalChunks, fileType, fileSize, metadata = {} } = options;

  const response = await fetch(`${url}/finalize`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    body: JSON.stringify({
      upload_id: uploadId,
      filename,
      total_chunks: totalChunks,
      file_type: fileType,
      file_size: fileSize,
      metadata
    })
  });

  if (!response.ok) {
    throw new Error('Failed to finalize upload');
  }

  return response.json();
}

/**
 * Upload a file in chunks
 * @param {File} file - File to upload
 * @param {string} url - Upload endpoint URL
 * @param {Object} options - Upload options
 * @returns {Promise<Object>}
 */
export async function chunkedUpload(file, url, options = {}) {
  const {
    onProgress,
    onChunkComplete,
    headers = {},
    uploadId = generateUploadId(),
    metadata = {}
  } = options;

  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  const completedChunks = new Set();

  // Check for existing progress (resume capability)
  const savedProgress = await loadUploadProgress(uploadId);
  if (savedProgress && savedProgress.filename === file.name) {
    savedProgress.completedChunks?.forEach(i => completedChunks.add(i));
  }

  // Upload each chunk
  for (let i = 0; i < totalChunks; i++) {
    if (completedChunks.has(i)) {
      continue; // Skip already uploaded chunks
    }

    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, file.size);
    const chunk = file.slice(start, end);

    let retries = 0;
    let success = false;

    while (retries < MAX_RETRIES && !success) {
      try {
        await uploadChunk(chunk, url, {
          uploadId,
          chunkIndex: i,
          totalChunks,
          filename: file.name,
          fileType: file.type,
          headers
        });

        completedChunks.add(i);
        success = true;

        // Save progress
        await saveUploadProgress(uploadId, {
          filename: file.name,
          totalChunks,
          completedChunks: Array.from(completedChunks),
        });

        // Report progress
        const progress = Math.round((completedChunks.size / totalChunks) * 100);
        onProgress?.(progress, completedChunks.size, totalChunks);
        onChunkComplete?.(i, totalChunks);

      } catch (error) {
        retries++;
        if (retries >= MAX_RETRIES) {
          throw new UploadError(`Failed to upload chunk ${i + 1}/${totalChunks}`, {
            chunkIndex: i,
            uploadId,
            originalError: error
          });
        }
        // Exponential backoff
        await delay(RETRY_DELAY * Math.pow(2, retries - 1));
      }
    }
  }

  // Finalize upload
  const result = await finalizeUpload(url, {
    uploadId,
    filename: file.name,
    totalChunks,
    fileType: file.type,
    fileSize: file.size,
    metadata,
    headers
  });

  // Clear saved progress
  await clearUploadProgress(uploadId);

  return result;
}

/**
 * Simple file upload for small files (no chunking)
 * @param {File} file - File to upload
 * @param {string} url - Upload endpoint
 * @param {Object} options - Upload options
 */
export async function simpleUpload(file, url, options = {}) {
  const { onProgress, headers = {}, metadata = {} } = options;

  const formData = new FormData();
  formData.append('file', file);
  formData.append('metadata', JSON.stringify(metadata));

  const config = {
    headers: {
      ...headers,
      'Content-Type': 'multipart/form-data'
    },
    onUploadProgress: onProgress ? (progressEvent) => {
      const percentCompleted = Math.round(
        (progressEvent.loaded * 100) / progressEvent.total
      );
      onProgress(percentCompleted);
    } : undefined
  };

  return apiClient.post(url, formData, config);
}

/**
 * Smart upload - uses chunking for large files, simple upload for small files
 * @param {File} file - File to upload
 * @param {string} url - Upload endpoint
 * @param {Object} options - Upload options
 */
export async function smartUpload(file, url, options = {}) {
  // Use chunking for files > 2MB
  if (file.size > 2 * 1024 * 1024) {
    return chunkedUpload(file, url, options);
  }
  return simpleUpload(file, url, options);
}

class UploadError extends Error {
  constructor(message, details) {
    super(message);
    this.name = 'UploadError';
    this.details = details;
  }
}

export default {
  chunkedUpload,
  simpleUpload,
  smartUpload
};
