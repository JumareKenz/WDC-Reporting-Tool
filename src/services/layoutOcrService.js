/**
 * Layout-aware OCR field extraction.
 *
 * Instead of flattening the OCR output to one text blob and regex-matching it
 * (which interleaves columns and grabs the wrong row/SN number), this works
 * from word bounding boxes. For each form field it:
 *   1. finds the field's printed LABEL on the page (its `ocr.keywords`), and
 *   2. reads the value spatially adjacent to that label — the first value to the
 *      right of the label, on the same horizontal band, before the next label.
 *
 * This mirrors how the voice assistant keys off the question: the label is the
 * anchor, and the page geometry tells us where the answer sits. It needs no
 * template, no fixed coordinates, and no guided capture — only word boxes,
 * which both Tesseract (`data.words`) and ML Kit (block/line/element boxes)
 * provide.
 *
 * Engine-agnostic: callers pass a normalized token list
 *   { text, x0, y0, x1, y1, conf }
 * via the adapters below.
 *
 * @module layoutOcrService
 */

// ────────────────────────────────────────────────────────────────────────────
// Token adapters
// ────────────────────────────────────────────────────────────────────────────

/**
 * Tesseract.js result → normalized tokens.
 * Tesseract v5+ only emits word boxes when `recognize(img, {}, { blocks: true })`
 * is used; words then live under data.blocks[].paragraphs[].lines[].words[].
 * Falls back to a flat data.words array if present.
 */
export function tokensFromTesseract(data) {
  const toTok = (w) => ({
    text: w.text.trim(),
    x0: w.bbox?.x0 ?? 0,
    y0: w.bbox?.y0 ?? 0,
    x1: w.bbox?.x1 ?? 0,
    y1: w.bbox?.y1 ?? 0,
    conf: w.confidence ?? 0,
  });
  const out = [];
  if (Array.isArray(data?.words) && data.words.length) {
    for (const w of data.words) if (w.text && w.text.trim()) out.push(toTok(w));
    return out;
  }
  for (const block of data?.blocks || []) {
    for (const para of block.paragraphs || []) {
      for (const line of para.lines || []) {
        for (const w of line.words || []) {
          if (w.text && w.text.trim()) out.push(toTok(w));
        }
      }
    }
  }
  return out;
}

/**
 * ML Kit text-recognition result → normalized tokens.
 * Accepts the common shape { blocks: [{ lines: [{ elements: [{ text, boundingBox }] }] }] }
 * or a flat { elements:[...] }. boundingBox may be {left,top,right,bottom} or {x,y,width,height}.
 */
export function tokensFromMLKit(result) {
  const out = [];
  const pushEl = (el) => {
    const b = el.boundingBox || el.bounds || el.frame;
    if (!el.text || !b) return;
    let x0, y0, x1, y1;
    if (b.left !== undefined) { x0 = b.left; y0 = b.top; x1 = b.right; y1 = b.bottom; }
    else { x0 = b.x; y0 = b.y; x1 = b.x + b.width; y1 = b.y + b.height; }
    out.push({ text: String(el.text).trim(), x0, y0, x1, y1, conf: el.confidence ?? 80 });
  };
  if (Array.isArray(result?.blocks)) {
    for (const bl of result.blocks) {
      const lines = bl.lines || [];
      if (lines.length === 0 && bl.text) { pushEl(bl); continue; }
      for (const ln of lines) {
        const els = ln.elements || ln.words || [];
        if (els.length === 0 && ln.text) { pushEl(ln); continue; }
        els.forEach(pushEl);
      }
    }
  } else if (Array.isArray(result?.elements)) {
    result.elements.forEach(pushEl);
  }
  return out;
}

// ────────────────────────────────────────────────────────────────────────────
// Text helpers
// ────────────────────────────────────────────────────────────────────────────

const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '');

const isNumericToken = (t) => /^[0-9]{1,6}$/.test(t.replace(/[^0-9]/g, '')) && /[0-9]/.test(t);

// ────────────────────────────────────────────────────────────────────────────
// Line reconstruction
// ────────────────────────────────────────────────────────────────────────────

/**
 * Group tokens into visual lines using vertical overlap, then sort each line
 * left-to-right. Returns array of { tokens, yc, h }.
 */
export function buildLines(tokens) {
  if (!tokens.length) return [];
  const heights = tokens.map((t) => t.y1 - t.y0).filter((h) => h > 0).sort((a, b) => a - b);
  const medH = heights[Math.floor(heights.length / 2)] || 12;
  const tol = medH * 0.6;

  const sorted = [...tokens].sort((a, b) => (a.y0 + a.y1) / 2 - (b.y0 + b.y1) / 2);
  const lines = [];
  for (const t of sorted) {
    const yc = (t.y0 + t.y1) / 2;
    let line = lines[lines.length - 1];
    if (!line || Math.abs(yc - line.yc) > tol) {
      line = { tokens: [], yc, h: medH, _sum: 0, _n: 0 };
      lines.push(line);
    }
    line.tokens.push(t);
    line._n++; line._sum += yc;
    line.yc = line._sum / line._n;
  }
  for (const l of lines) l.tokens.sort((a, b) => a.x0 - b.x0);
  return lines;
}

// ────────────────────────────────────────────────────────────────────────────
// Label matching
// ────────────────────────────────────────────────────────────────────────────

/**
 * Match an anchor against a line by normalized-substring search. Robust to OCR
 * gluing ("PENTA1") and splitting ("PENTA","1") because it ignores token spaces.
 * The match must begin at a token boundary so short anchors don't match
 * mid-word (e.g. "male" must not match inside "female").
 * Returns { rightX, yc, h } of the matched label, or null.
 */
function matchAnchorInLine(line, anchorNorm) {
  let concat = '';
  const owner = []; // token index for each char in concat
  for (let ti = 0; ti < line.tokens.length; ti++) {
    const n = norm(line.tokens[ti].text);
    for (let c = 0; c < n.length; c++) { concat += n[c]; owner.push(ti); }
  }
  if (!concat) return null;

  let from = 0;
  while (true) {
    const idx = concat.indexOf(anchorNorm, from);
    if (idx === -1) return null;
    const startsAtTokenBoundary = idx === 0 || owner[idx - 1] !== owner[idx];
    if (startsAtTokenBoundary) {
      const firstTok = line.tokens[owner[idx]];
      const lastTok = line.tokens[owner[idx + anchorNorm.length - 1]];
      const h = (firstTok.y1 - firstTok.y0) || line.h;
      return { rightX: lastTok.x1, yc: (firstTok.y0 + firstTok.y1) / 2, h };
    }
    from = idx + 1;
  }
}

/** Locate the best label match for a set of anchor phrases across all lines. */
function findLabel(lines, anchors) {
  for (const anchor of anchors) {
    const anchorNorm = norm(anchor);
    if (anchorNorm.length < 2) continue;
    for (const line of lines) {
      const m = matchAnchorInLine(line, anchorNorm);
      if (m) return m;
    }
  }
  return null;
}

// ────────────────────────────────────────────────────────────────────────────
// Value extraction
// ────────────────────────────────────────────────────────────────────────────

/**
 * Tokens to the right of the label, within its horizontal band, sorted by x.
 * The band is generous (±1.5× label height) because value-column entries are
 * often vertically offset from their label; row pitch keeps adjacent rows out.
 */
function valueTokensRightOf(label, tokens) {
  const band = Math.max(label.h * 1.5, 16);
  const bandTop = label.yc - band;
  const bandBot = label.yc + band;
  return tokens
    .filter((t) => {
      const yc = (t.y0 + t.y1) / 2;
      return yc >= bandTop && yc <= bandBot && t.x0 >= label.rightX - 2;
    })
    .sort((a, b) => a.x0 - b.x0);
}

function parseValue(field, valueToks, labelYc) {
  if (!valueToks.length) return { value: undefined, conf: 0 };

  if (field.type === 'number') {
    // Among numeric tokens to the right, prefer the one whose row (y-center) is
    // closest to the label — guards against an adjacent row bleeding in.
    const nums = valueToks.filter((t) => isNumericToken(t.text));
    if (!nums.length) return { value: undefined, conf: 0 };
    nums.sort((a, b) => Math.abs((a.y0 + a.y1) / 2 - labelYc) - Math.abs((b.y0 + b.y1) / 2 - labelYc));
    const t = nums[0];
    return { value: parseInt(t.text.replace(/[^0-9]/g, ''), 10), conf: t.conf };
  }

  if (field.type === 'select') {
    const joined = valueToks.map((t) => t.text).join(' ');
    const jn = norm(joined);
    // Choose the option whose normalized text appears; for Yes/No, prefer a
    // ticked box heuristic is unreliable via OCR, so first present option wins.
    let best = null;
    for (const opt of field.options || []) {
      const on = norm(opt);
      if (jn.includes(on)) { best = opt; break; }
    }
    const conf = valueToks.reduce((s, t) => s + t.conf, 0) / valueToks.length;
    return { value: best || undefined, conf: best ? conf : 0 };
  }

  // date / text — take the run of tokens after the label (trim trailing labels).
  const text = valueToks.map((t) => t.text).join(' ').replace(/\s+/g, ' ').trim();
  const conf = valueToks.reduce((s, t) => s + t.conf, 0) / valueToks.length;
  return { value: text || undefined, conf };
}

// ────────────────────────────────────────────────────────────────────────────
// Public API
// ────────────────────────────────────────────────────────────────────────────

/**
 * Build extraction field defs from the active field config.
 * @param {Object} config - field config keyed by field name
 * @returns {Array<{name,type,options,anchors}>}
 */
export function buildLayoutFieldDefs(config) {
  const defs = [];
  for (const [name, f] of Object.entries(config)) {
    const anchors = (f.ocr?.keywords || []).filter(Boolean);
    if (!anchors.length) continue;
    // Skip array/table fields here — they are handled by row extraction.
    if (/_\d+_/.test(name) || /_has_more$/.test(name)) continue;
    defs.push({ name, type: f.type || 'text', options: f.options, anchors });
  }
  // Match longer/more-specific anchors first to avoid prefix collisions
  // (e.g. "Persons Tested Positive" before "Persons Tested").
  defs.sort((a, b) => Math.max(...b.anchors.map((s) => s.length)) - Math.max(...a.anchors.map((s) => s.length)));
  return defs;
}

/**
 * Extract field values from normalized OCR tokens using label anchoring.
 *
 * @param {Array} tokens - normalized tokens { text, x0, y0, x1, y1, conf }
 * @param {Array} fieldDefs - from buildLayoutFieldDefs()
 * @returns {{ fields: Object, confidence: Object }}
 */
export function extractFieldsByLayout(tokens, fieldDefs) {
  const lines = buildLines(tokens);
  const fields = {};
  const confidence = {};

  for (const def of fieldDefs) {
    const label = findLabel(lines, def.anchors);
    if (!label) continue;
    const valToks = valueTokensRightOf(label, tokens);
    const { value, conf } = parseValue(def, valToks, label.yc);
    if (value !== undefined && value !== '') {
      fields[def.name] = value;
      confidence[def.name] = Math.round(conf);
    }
  }

  return { fields, confidence };
}
