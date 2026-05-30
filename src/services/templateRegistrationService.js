/**
 * Template Registration Service (document-scanner approach)
 *
 * Aligns a user's photo of a WDC form page to the canonical template page so
 * that value cells can be cropped at known pixel coordinates and OCR'd in
 * isolation. This eliminates the structural errors (row-number vs value, wrong
 * column) that full-page pattern matching suffers from.
 *
 * Algorithm (per captured page):
 *   1. Detect the document boundary — Canny edges + contour search for the
 *      largest 4-corner quadrilateral.
 *   2. Order its corners and perspective-warp the photo to the template page
 *      size (getPerspectiveTransform + warpPerspective).
 *   3. If no clean quad is found, fall back to a plain resize (assumes the photo
 *      is already roughly cropped to the page — guided capture frames it).
 *   4. Crop each field's value cell at template coordinates and hand the small
 *      crop to the supplied OCR function.
 *
 * Why not ORB/homography: the installed opencv.js build lacks findHomography,
 * BFMatcher and the RANSAC constant, and ORB keypoint matching is unreliable on
 * sparse line-art forms anyway. Contour-based perspective warp is both
 * available and more robust for documents.
 *
 * Runs 100% on-device. No network.
 *
 * @module templateRegistrationService
 */

import {
  FIELD_COORDINATES,
  FIELDS_BY_TEMPLATE,
  TEMPLATE_PAGES,
  TEMPLATE_PAGE_WIDTH,
  TEMPLATE_PAGE_HEIGHT,
} from '../data/formTemplateCoordinates.js';

// ────────────────────────────────────────────────────────────────────────────
// OpenCV detection
// ────────────────────────────────────────────────────────────────────────────

let _cv = null;
let _ready = false;

/**
 * Initialize OpenCV.js. Resolves true when cv is usable.
 * Supports both the global (CDN) build and the npm module.
 * @returns {Promise<boolean>}
 */
export async function initializeOpenCV() {
  if (_ready) return true;

  // Global build (e.g. CDN <script>), possibly still initializing.
  // eslint-disable-next-line no-undef
  if (typeof cv !== 'undefined' && cv) {
    // eslint-disable-next-line no-undef
    _cv = cv;
    if (_cv.Mat) { _ready = true; return true; }
    if (typeof _cv.then === 'function') { _cv = await _cv; }
    if (_cv?.Mat) { _ready = true; return true; }
    return await waitForRuntime(_cv);
  }

  // npm module
  try {
    const mod = await import('opencv.js');
    _cv = mod.default || mod;
    if (_cv?.Mat) { _ready = true; return true; }
    return await waitForRuntime(_cv);
  } catch (err) {
    console.warn('[TemplateReg] OpenCV.js unavailable:', err?.message);
    return false;
  }
}

function waitForRuntime(cvObj) {
  return new Promise((resolve) => {
    let settled = false;
    const done = (ok) => { if (!settled) { settled = true; resolve(ok); } };
    if (cvObj && 'onRuntimeInitialized' in cvObj) {
      cvObj.onRuntimeInitialized = () => { _ready = true; done(true); };
    }
    setTimeout(() => {
      if (cvObj && cvObj.Mat) { _ready = true; done(true); } else { done(false); }
    }, 6000);
  });
}

/** @returns {boolean} */
export function isTemplateRegistrationAvailable() {
  return _ready && !!_cv && !!_cv.Mat;
}

// Allow tests / non-browser callers to inject a cv instance and Mat loader.
export function __setOpenCVForTest(cvInstance) {
  _cv = cvInstance;
  _ready = !!(cvInstance && cvInstance.Mat);
}

// ────────────────────────────────────────────────────────────────────────────
// Image loading
// ────────────────────────────────────────────────────────────────────────────

/**
 * Load an image (base64 / data URL / element) into a cv.Mat (browser only).
 * @param {string|HTMLImageElement|HTMLCanvasElement} src
 * @returns {Promise<any>} cv.Mat
 */
function loadToMat(src) {
  return new Promise((resolve, reject) => {
    if (typeof HTMLCanvasElement !== 'undefined' && src instanceof HTMLCanvasElement) {
      try { resolve(_cv.imread(src)); } catch (e) { reject(e); }
      return;
    }
    const toMat = (img) => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        canvas.getContext('2d').drawImage(img, 0, 0);
        resolve(_cv.imread(canvas));
      } catch (e) { reject(e); }
    };
    if (typeof HTMLImageElement !== 'undefined' && src instanceof HTMLImageElement) {
      if (src.complete) toMat(src); else { src.onload = () => toMat(src); src.onerror = reject; }
      return;
    }
    const img = new Image();
    img.onload = () => toMat(img);
    img.onerror = reject;
    img.src = (typeof src === 'string' && src.startsWith('data:'))
      ? src : `data:image/jpeg;base64,${src}`;
  });
}

/** Convert a cv.Mat to a base64 PNG (no data-URI prefix). Browser only. */
function matToBase64(mat) {
  const canvas = document.createElement('canvas');
  _cv.imshow(canvas, mat);
  return canvas.toDataURL('image/png').split(',')[1];
}

// ────────────────────────────────────────────────────────────────────────────
// Document boundary detection + perspective warp
// ────────────────────────────────────────────────────────────────────────────

/**
 * Order 4 corner points as [topLeft, topRight, bottomRight, bottomLeft].
 * @param {Array<{x:number,y:number}>} pts
 */
function orderCorners(pts) {
  const bySum = [...pts].sort((a, b) => (a.x + a.y) - (b.x + b.y));
  const byDiff = [...pts].sort((a, b) => (a.y - a.x) - (b.y - b.x));
  return [bySum[0], byDiff[0], bySum[3], byDiff[3]]; // tl, tr, br, bl
}

/**
 * Find the largest 4-corner quadrilateral (the page) in an image.
 * Returns corners in full-resolution coordinates, or null if none found.
 * @param {any} srcMat - cv.Mat (RGBA)
 * @returns {Array<{x:number,y:number}>|null}
 */
function detectPageQuad(srcMat) {
  const cv = _cv;
  const W = srcMat.cols;
  const H = srcMat.rows;
  const area = W * H;

  const targetW = 900;
  const scale = W > targetW ? targetW / W : 1;
  const small = new cv.Mat();
  cv.resize(srcMat, small, new cv.Size(Math.round(W * scale), Math.round(H * scale)));

  const gray = new cv.Mat();
  cv.cvtColor(small, gray, cv.COLOR_RGBA2GRAY);
  const blur = new cv.Mat();
  cv.GaussianBlur(gray, blur, new cv.Size(5, 5), 0);
  const edges = new cv.Mat();
  cv.Canny(blur, edges, 50, 150);
  const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(5, 5));
  cv.dilate(edges, edges, kernel);

  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();
  cv.findContours(edges, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);

  let best = null;
  let bestArea = 0;
  const smallArea = small.cols * small.rows;
  for (let i = 0; i < contours.size(); i++) {
    const c = contours.get(i);
    const cArea = cv.contourArea(c);
    if (cArea < smallArea * 0.25) { c.delete(); continue; }
    const peri = cv.arcLength(c, true);
    const approx = new cv.Mat();
    cv.approxPolyDP(c, approx, 0.02 * peri, true);
    if (approx.rows === 4 && cArea > bestArea) {
      bestArea = cArea;
      if (best) best.delete();
      best = approx;
    } else {
      approx.delete();
    }
    c.delete();
  }

  let corners = null;
  if (best) {
    // approxPolyDP returns CV_32SC2 points; read them from data32S as [x,y,x,y...]
    const d = best.data32S;
    const pts = [];
    for (let i = 0; i < 4; i++) {
      pts.push({ x: d[i * 2] / scale, y: d[i * 2 + 1] / scale });
    }
    corners = orderCorners(pts);
    best.delete();
  }

  small.delete(); gray.delete(); blur.delete(); edges.delete();
  kernel.delete(); contours.delete(); hierarchy.delete();

  if (corners) {
    const quadArea = bestArea / (scale * scale);
    if (quadArea < area * 0.2) return null;
  }
  return corners;
}

/**
 * Warp a user photo to the canonical template page size.
 * @param {string} userPhotoBase64
 * @param {string} templateKey - key into TEMPLATE_PAGES (e.g. 'page2')
 * @param {{loadMat?:Function, toBase64?:Function}} [io] - optional IO overrides (tests)
 * @returns {Promise<{registered:any, method:'warp'|'resize', corners:Array|null}>}
 */
export async function registerToTemplate(userPhotoBase64, templateKey, io = {}) {
  if (!isTemplateRegistrationAvailable()) {
    throw new Error('OpenCV not initialized. Call initializeOpenCV() first.');
  }
  const tpl = TEMPLATE_PAGES[templateKey];
  const dstW = tpl?.width || TEMPLATE_PAGE_WIDTH;
  const dstH = tpl?.height || TEMPLATE_PAGE_HEIGHT;

  const cv = _cv;
  const load = io.loadMat || loadToMat;
  const src = await load(userPhotoBase64);
  const corners = detectPageQuad(src);
  const registered = new cv.Mat();

  if (corners) {
    const [tl, tr, br, bl] = corners;
    const srcTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
      tl.x, tl.y, tr.x, tr.y, br.x, br.y, bl.x, bl.y,
    ]);
    const dstTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
      0, 0, dstW, 0, dstW, dstH, 0, dstH,
    ]);
    const M = cv.getPerspectiveTransform(srcTri, dstTri);
    cv.warpPerspective(src, registered, M, new cv.Size(dstW, dstH),
      cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar(255, 255, 255, 255));
    srcTri.delete(); dstTri.delete(); M.delete(); src.delete();
    return { registered, method: 'warp', corners };
  }

  cv.resize(src, registered, new cv.Size(dstW, dstH));
  src.delete();
  return { registered, method: 'resize', corners: null };
}

// ────────────────────────────────────────────────────────────────────────────
// Field cropping
// ────────────────────────────────────────────────────────────────────────────

/**
 * Crop a value cell from a registered image. A small inward inset trims printed
 * cell borders that would otherwise confuse OCR.
 * @returns {string} base64 PNG crop
 */
export function cropFieldCell(registered, x, y, w, h, inset = 6, toBase64 = matToBase64) {
  const cv = _cv;
  const rx = Math.max(0, x + inset);
  const ry = Math.max(0, y + inset);
  const rw = Math.min(registered.cols - rx, w - inset * 2);
  const rh = Math.min(registered.rows - ry, h - inset * 2);
  const rect = new cv.Rect(rx, ry, Math.max(1, rw), Math.max(1, rh));
  const roi = registered.roi(rect);
  const out = roi.clone();
  roi.delete();
  const b64 = toBase64(out);
  out.delete();
  return b64;
}

/**
 * Extract every field on a template page from a user photo.
 *
 * @param {string} userPhotoBase64
 * @param {string} templateKey - 'page2' | 'page3' | 'page4' | 'page6'
 * @param {(cropBase64:string, opts:{numeric:boolean, field:string})=>Promise<string>} ocrFn
 * @param {{loadMat?:Function, toBase64?:Function}} [io] - optional IO overrides (tests)
 * @returns {Promise<{fields:Object, crops:Object, info:Object}>}
 */
export async function extractFieldsFromPhoto(userPhotoBase64, templateKey, ocrFn, io = {}) {
  const fieldNames = FIELDS_BY_TEMPLATE[templateKey] || [];
  if (fieldNames.length === 0) {
    throw new Error(`No fields mapped for template page: ${templateKey}`);
  }

  const { registered, method, corners } = await registerToTemplate(userPhotoBase64, templateKey, io);

  const fields = {};
  const crops = {};
  let extracted = 0;

  try {
    for (const field of fieldNames) {
      const c = FIELD_COORDINATES[field];
      try {
        const crop = cropFieldCell(registered, c.x, c.y, c.w, c.h, 6, io.toBase64 || matToBase64);
        crops[field] = crop;
        const raw = await ocrFn(crop, { numeric: !!c.numeric, field });
        const value = cleanValue(raw, c.numeric);
        if (value !== '' && value != null) {
          fields[field] = value;
          extracted++;
        }
      } catch (err) {
        console.warn(`[TemplateReg] field ${field} failed:`, err?.message);
      }
    }
  } finally {
    registered.delete();
  }

  return {
    fields,
    crops,
    info: {
      template: templateKey,
      method,
      hasPerspectiveCorrection: !!corners,
      extracted,
      total: fieldNames.length,
    },
  };
}

/**
 * Clean an OCR result for a value cell.
 * @param {string} raw
 * @param {boolean} numeric
 */
export function cleanValue(raw, numeric) {
  if (raw == null) return '';
  const s = String(raw).trim().split('\n')[0].trim();
  if (numeric) {
    const m = s.replace(/[^\d]/g, '');
    return m === '' ? '' : parseInt(m, 10);
  }
  return s;
}

/**
 * Assess registration quality for UI feedback.
 * @param {Object} info - the `info` object from extractFieldsFromPhoto
 */
export function assessRegistrationQuality(info) {
  const rate = info.total ? info.extracted / info.total : 0;
  if (info.hasPerspectiveCorrection && rate >= 0.8) {
    return { quality: 'good', message: `Aligned and read ${info.extracted}/${info.total} fields.` };
  }
  if (rate >= 0.5) {
    return { quality: 'acceptable', message: `Read ${info.extracted}/${info.total} fields — please review.` };
  }
  return { quality: 'poor', message: `Only read ${info.extracted}/${info.total} fields. Consider retaking the photo.` };
}

export { FIELD_COORDINATES, FIELDS_BY_TEMPLATE, TEMPLATE_PAGES };
