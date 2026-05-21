/**
 * File Processing Utilities
 * 
 * Features:
 * - Client-side image compression
 * - Format conversion
 * - File validation
 */

/**
 * Compress and resize image
 * @param {File} file - Original image file
 * @param {Object} options - Compression options
 * @returns {Promise<{file: File, originalSize: number, compressedSize: number, compressionRatio: string}>}
 */
export async function compressImage(file, options = {}) {
  const {
    maxWidth = 1920,
    maxHeight = 1920,
    quality = 0.8,
    outputFormat = 'image/jpeg'
  } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(img.src);

      // Calculate new dimensions
      let { width, height } = img;
      const ratio = Math.min(maxWidth / width, maxHeight / height, 1);
      
      if (ratio < 1) {
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      // Draw to canvas
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      
      // Fill white background for JPEG (prevents transparency issues)
      if (outputFormat === 'image/jpeg') {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
      }
      
      ctx.drawImage(img, 0, 0, width, height);

      // Convert to blob
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Compression failed'));
            return;
          }

          const compressedFile = new File([blob], 
            file.name.replace(/\.[^/.]+$/, '.jpg'), {
              type: outputFormat,
              lastModified: file.lastModified
            }
          );

          resolve({
            file: compressedFile,
            originalSize: file.size,
            compressedSize: blob.size,
            compressionRatio: (blob.size / file.size).toFixed(2)
          });
        },
        outputFormat,
        quality
      );
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Validate file before upload
 * @param {File} file - File to validate
 * @param {Object} options - Validation options
 * @returns {{valid: boolean, errors: Array<{type: string, message: string}>}}
 */
export function validateFile(file, options = {}) {
  const {
    maxSizeMB = 10,
    allowedTypes = [],
    allowedExtensions = [],
    minSizeKB = 0
  } = options;

  const errors = [];

  // Size checks
  if (file.size > maxSizeMB * 1024 * 1024) {
    errors.push({
      type: 'size',
      message: `File size ${(file.size / 1024 / 1024).toFixed(1)}MB exceeds ${maxSizeMB}MB limit`
    });
  }

  if (file.size < minSizeKB * 1024) {
    errors.push({
      type: 'size_min',
      message: `File size must be at least ${minSizeKB}KB`
    });
  }

  // Type check
  if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
    errors.push({
      type: 'format',
      message: `Unsupported format: ${file.type}. Allowed: ${allowedTypes.join(', ')}`
    });
  }

  // Extension check
  if (allowedExtensions.length > 0) {
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      errors.push({
        type: 'extension',
        message: `Unsupported extension: ${ext}. Allowed: ${allowedExtensions.join(', ')}`
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Process file for upload (compress if image)
 * @param {File} file - Original file
 * @param {string} type - File type category ('image', 'document', 'audio')
 * @returns {Promise<File>}
 */
export async function processFileForUpload(file, type = 'auto') {
  // Auto-detect type
  if (type === 'auto') {
    if (file.type.startsWith('image/')) {
      type = 'image';
    } else if (file.type.startsWith('audio/')) {
      type = 'audio';
    } else {
      type = 'document';
    }
  }

  // Process based on type
  if (type === 'image') {
    // Skip compression for small images
    if (file.size < 500 * 1024) { // < 500KB
      return file;
    }
    const result = await compressImage(file);
    return result.file;
  }
  
  // Return as-is for other types
  return file;
}

/**
 * Process multiple files
 * @param {FileList|Array<File>} files - Files to process
 * @param {Object} options - Processing options
 * @returns {Promise<Array<{original: File, processed: File, error?: string}>>}
 */
export async function processMultipleFiles(files, options = {}) {
  const { compress = true, validate = true } = options;
  const fileArray = Array.from(files);
  
  const results = await Promise.all(
    fileArray.map(async (file) => {
      try {
        // Validate first
        if (validate) {
          const validation = validateFile(file, options.validation);
          if (!validation.valid) {
            return {
              original: file,
              processed: null,
              error: validation.errors.map(e => e.message).join(', ')
            };
          }
        }

        // Process
        const processed = compress 
          ? await processFileForUpload(file, options.type)
          : file;

        return { original: file, processed };
      } catch (error) {
        return {
          original: file,
          processed: null,
          error: error.message
        };
      }
    })
  );

  return results;
}

/**
 * Format file size for display
 * @param {number} bytes - Size in bytes
 * @returns {string}
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Get file type category
 * @param {File} file 
 * @returns {string}
 */
export function getFileCategory(file) {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('audio/')) return 'audio';
  if (file.type.startsWith('video/')) return 'video';
  if (file.type.includes('pdf')) return 'pdf';
  return 'document';
}

/**
 * Create thumbnail for image (for preview)
 * @param {File} file - Image file
 * @param {number} maxSize - Max width/height
 * @returns {Promise<string>} - Data URL
 */
export function createThumbnail(file, maxSize = 200) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(img.src);

      let { width, height } = img;
      const ratio = Math.min(maxSize / width, maxSize / height);
      
      if (ratio < 1) {
        width *= ratio;
        height *= ratio;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };

    img.onerror = () => reject(new Error('Failed to create thumbnail'));
    img.src = URL.createObjectURL(file);
  });
}
