/**
 * On-device OCR Service
 *
 * Strategy:
 * - Native (Android): Uses ML Kit Text Recognition via Capacitor plugin (zero download)
 * - Web: Uses Tesseract.js (WebAssembly, downloads ~4MB language data on first use)
 *
 * Both return raw text blocks. The field mapping logic then extracts structured
 * data from the recognized text.
 */

import { isNative } from '../plugins/capacitor';
import { getOcrPatterns, loadActiveFieldConfig } from './formConfigService';

let _tesseractWorker = null;

/**
 * Perform OCR on an image and return raw text.
 * @param {string} base64Image - Base64-encoded image data (no data URI prefix)
 * @param {string} format - Image format ('jpeg', 'png', etc.)
 * @returns {Promise<string>} Extracted raw text
 */
export async function performOCR(base64Image, format = 'jpeg') {
  if (isNative) {
    return performMLKitOCR(base64Image);
  }
  return performTesseractOCR(base64Image, format);
}

/**
 * ML Kit OCR (Android native) — requires Capacitor plugin
 * Falls back to Tesseract.js if plugin is not available.
 */
async function performMLKitOCR(base64Image) {
  try {
    const { TextRecognition } = await import('../plugins/mlkit');
    const result = await TextRecognition.recognizeText({ base64: base64Image });
    return result.text || '';
  } catch (err) {
    console.warn('[OCR] ML Kit not available, falling back to Tesseract:', err.message);
    return performTesseractOCR(base64Image, 'jpeg');
  }
}

/**
 * Tesseract.js OCR (web / fallback)
 */
async function performTesseractOCR(base64Image, format) {
  const { createWorker } = await import('tesseract.js');

  if (!_tesseractWorker) {
    _tesseractWorker = await createWorker('eng', 1, {
      logger: (m) => {
        if (import.meta.env.DEV) console.log('[Tesseract]', m.status, Math.round((m.progress || 0) * 100) + '%');
      },
    });
  }

  const imageData = `data:image/${format};base64,${base64Image}`;
  const { data } = await _tesseractWorker.recognize(imageData);
  return data.text || '';
}

/**
 * Map raw OCR text to WDC report form fields using the active form config.
 * Patterns come from the admin-editable form config (with bundled defaults as fallback).
 *
 * @param {string} rawText - Full text extracted from OCR
 * @returns {Promise<Object>} Mapping of field names to extracted values
 */
export async function mapTextToFields(rawText) {
  const config = await loadActiveFieldConfig();
  const patternList = getOcrPatterns(config);
  const fullText = rawText.split('\n').map((l) => l.trim()).filter(Boolean).join(' ');

  const fields = {};
  for (const { field, patterns, type } of patternList) {
    for (const regex of patterns) {
      const match = fullText.match(regex);
      if (match && match[1] !== undefined) {
        const raw = match[1].trim();
        fields[field] = type === 'number' ? parseInt(raw, 10) : raw;
        break;
      }
    }
  }
  return fields;
}

/**
 * Terminate the Tesseract worker to free memory.
 */
export async function terminateOCR() {
  if (_tesseractWorker) {
    await _tesseractWorker.terminate();
    _tesseractWorker = null;
  }
}
