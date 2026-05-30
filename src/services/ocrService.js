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

// Table sections present in the paper form. Each entry declares:
//   detect   — regex that identifies the section header line in the OCR text
//   stopAt   — regex for any line that marks the end of this section
//   prefix   — the form array field name prefix
//   cols     — ordered column names matching the paper form's left-to-right layout
//              (SN column is stripped automatically; columns map to form field keys)
const TABLE_SECTIONS = [
  {
    // Section 2 columns (paper form order): Challenges | Agreed Action Point | Timeline | Responsible Person | Status
    detect: /\baction\s*tracker\b/i,
    stopAt: /\b(?:health\s*data|section\s*3|vdc|action\s*plan|mobiliz|transport)\b/i,
    prefix: 'action_tracker',
    cols: ['challenges', 'action_point', 'timeline', 'responsible_person', 'status'],
  },
  {
    detect: /\bvdc\s*report/i,
    stopAt: /\b(?:mobiliz|action\s*plan|section\s*[567]|community\s*action)\b/i,
    prefix: 'vdc_reports',
    cols: ['vdc_name', 'issues', 'action_taken'],
  },
  {
    // Match "Community Action Plan" or "Action Plan" but not "Action Tracker"
    detect: /\baction\s*plan\b(?!\s*tracker)/i,
    stopAt: /\b(?:section\s*8|support\s*required|conclusion|attendance|mobiliz)\b/i,
    prefix: 'action_plan',
    cols: ['issue', 'action', 'timeline', 'responsible_person'],
  },
];

/**
 * Extract table section rows from OCR lines using pipe-delimited cell detection.
 * Handles forms where printed table borders appear as "|" in the OCR output.
 * Returns flat keys like action_tracker_1_challenges for handleBulkFieldsApply.
 * @param {string[]} lines - Trimmed, non-empty lines from OCR output
 * @returns {Object} Flat key-value pairs for table cells
 */
function extractTableSections(lines) {
  const result = {};

  for (const sec of TABLE_SECTIONS) {
    const hIdx = lines.findIndex((l) => sec.detect.test(l));
    if (hIdx === -1) continue;

    let i = hIdx + 1;

    // Skip the column-header row if OCR captured it:
    // detected by ≥2 hits against column keyword stems
    if (i < lines.length) {
      const lc = lines[i].toLowerCase();
      const hits = sec.cols.filter((c) => lc.includes(c.split('_')[0])).length;
      if (hits >= 2) i++;
    }

    let rowNum = 0;
    while (i < lines.length && rowNum < 5) {
      const line = lines[i++];
      if (!line || line.length < 3) continue;
      if (sec.stopAt && sec.stopAt.test(line)) break;
      if (TABLE_SECTIONS.some((s) => s !== sec && s.detect.test(line))) break;

      // Only attempt extraction when OCR produced pipe separators (printed table borders).
      // Without pipes we cannot reliably split columns from unstructured text.
      if (!line.includes('|')) continue;

      const rawCells = line.split('|').map((c) => c.trim()).filter(Boolean);
      // Strip leading serial-number cell (e.g. "1", "2")
      const cells = /^\d+$/.test(rawCells[0]) ? rawCells.slice(1) : rawCells;
      if (cells.length < 2) continue;

      rowNum++;
      sec.cols.forEach((col, ci) => {
        if (cells[ci]) result[`${sec.prefix}_${rowNum}_${col}`] = cells[ci];
      });
    }
  }

  return result;
}

/**
 * Map raw OCR text to WDC report form fields using the active form config.
 * Patterns come from the admin-editable form config (with bundled defaults as fallback).
 *
 * Matching strategy (in order, first match wins):
 *   1. Full joined text  — catches "LABEL: value" on one line
 *   2. Individual lines  — catches when OCR puts label and value on separate lines
 *   3. Consecutive pairs — catches "LABEL\n value" split across two adjacent lines
 *
 * @param {string} rawText - Full text extracted from OCR
 * @returns {Promise<{ fields: Object, totalPatternFields: number }>}
 *   fields             — extracted key-value pairs
 *   totalPatternFields — total fields that had OCR patterns (for partial-match UI)
 */
export async function mapTextToFields(rawText) {
  const config = await loadActiveFieldConfig();
  const patternList = getOcrPatterns(config);

  const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);
  const fullText = lines.join(' ');

  // Build candidate strings: joined text + each line + each consecutive line pair.
  // Duplicates are cheap — regex on short strings is fast.
  const candidates = [
    fullText,
    ...lines,
    ...lines.slice(0, -1).map((l, i) => `${l} ${lines[i + 1]}`),
  ];

  const fields = {};
  for (const { field, patterns, type } of patternList) {
    outer:
    for (const regex of patterns) {
      for (const text of candidates) {
        const match = text.match(regex);
        if (match?.[1] !== undefined) {
          const raw = match[1].trim();
          fields[field] = type === 'number' ? parseInt(raw, 10) : raw;
          break outer;
        }
      }
    }
  }

  // Table section extraction (Sections 2, 5, 7): pipe-delimited rows only
  Object.assign(fields, extractTableSections(lines));

  return { fields, totalPatternFields: patternList.length };
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
