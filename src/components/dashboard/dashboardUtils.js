/**
 * Shared helpers for the State dashboard rebuild.
 *
 * Period model — the dashboard's single source of truth for "what window am I
 * looking at". All data hooks take a `month` ("YYYY-MM" or "" for all-time);
 * deltas compare against `priorMonth`. Keeping this here (not duplicated in each
 * widget) is what lets one period selector re-drive every section.
 */
import { formatMonth, formatNumber, getCurrentMonth, getRelativeTime } from '../../utils/formatters';

export const PERIOD_MODES = { THIS: 'this', LAST: 'last', CUSTOM: 'custom', ALL: 'all' };

// Shift a "YYYY-MM" string by `delta` months (negative = earlier).
export const shiftMonth = (ym, delta) => {
  if (!ym) return '';
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

// Is this "YYYY-MM" strictly before the current calendar month?
export const isPastMonth = (ym) => {
  if (!ym) return false;
  return ym < getCurrentMonth();
};

/**
 * Resolve a {mode, customMonth} selection into the full period descriptor the
 * page passes down to every section.
 *   { mode, month, priorMonth, label, monthNum, year, isPast }
 */
export const buildPeriod = (mode, customMonth) => {
  const current = getCurrentMonth();
  let month;
  switch (mode) {
    case PERIOD_MODES.THIS: month = current; break;
    case PERIOD_MODES.LAST: month = shiftMonth(current, -1); break;
    case PERIOD_MODES.CUSTOM: month = customMonth || current; break;
    case PERIOD_MODES.ALL:
    default: month = ''; break;
  }
  const priorMonth = month ? shiftMonth(month, -1) : null;
  const [year, monthNum] = month ? month.split('-').map(Number) : [null, null];
  return {
    mode,
    month,
    priorMonth,
    label: month ? formatMonth(month) : 'All time',
    year,
    monthNum, // 1-indexed, as /intelligence-reports expects
    isPast: isPastMonth(month),
  };
};

// ---------------------------------------------------------------------------
// Formatting — null/undefined render as an em-dash, never a fabricated 0.
// ---------------------------------------------------------------------------
export const formatStat = (n) =>
  (n === null || n === undefined || Number.isNaN(n)) ? '—' : formatNumber(n);

export const formatPct = (n) =>
  (n === null || n === undefined || Number.isNaN(n)) ? '—' : `${Math.round(n)}%`;

export const formatRatio = (a, b) =>
  (a === null || a === undefined || b === null || b === undefined)
    ? '—'
    : `${formatNumber(a)} / ${formatNumber(b)}`;

export { getRelativeTime };

// ---------------------------------------------------------------------------
// Semantic tone — color is functional only (green healthy, amber at-risk,
// red critical, blue informational, neutral inactive). Each tone returns the
// Tailwind classes the widgets compose so the palette stays consistent.
// ---------------------------------------------------------------------------
export const TONE = {
  green: { text: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-500', dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200', row: 'bg-emerald-50/40' },
  amber: { text: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-500', dot: 'bg-amber-500', badge: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200', row: '' },
  red: { text: 'text-red-700', bg: 'bg-red-50', border: 'border-red-500', dot: 'bg-red-500', badge: 'bg-red-50 text-red-700 ring-1 ring-red-200', row: 'bg-red-50/50' },
  blue: { text: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-500', dot: 'bg-blue-500', badge: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200', row: '' },
  neutral: { text: 'text-neutral-600', bg: 'bg-neutral-50', border: 'border-neutral-300', dot: 'bg-neutral-400', badge: 'bg-neutral-100 text-neutral-600 ring-1 ring-neutral-200', row: '' },
};

// Traffic-light tone for a submission/coverage rate.
export const rateTone = (rate) => {
  if (rate === null || rate === undefined) return TONE.neutral;
  if (rate >= 80) return TONE.green;
  if (rate >= 50) return TONE.amber;
  return TONE.red;
};

// Chart colors (kept in sync with TONE; recharts needs hex, not classes).
export const CHART = {
  green: '#10b981',
  amber: '#f59e0b',
  red: '#ef4444',
  blue: '#3b82f6',
  neutral: '#d4d4d4',
  primary: '#2f6b4d',
  primaryBright: '#3f9168',
};

/**
 * Derive an LGA's reporting status from real data only.
 *  - 0 submissions → "Overdue" if the selected month is already past, else
 *    "Not Submitted" (no due-date data exists to distinguish further).
 *  - ≥90% ward coverage → "Complete".
 *  - otherwise → "Partial".
 */
export const lgaStatus = (lga, period) => {
  const submitted = lga.submitted_count ?? 0;
  const rate = lga.submission_rate ?? 0;
  if (submitted === 0) {
    return period?.isPast
      ? { label: 'Overdue', tone: TONE.red }
      : { label: 'Not Submitted', tone: TONE.red };
  }
  if (rate >= 90) return { label: 'Complete', tone: TONE.green };
  return { label: 'Partial', tone: TONE.amber };
};

// Period-over-period delta. Returns null when there's no prior figure to
// compare against (renders grey/no-trend, never a fabricated change).
export const computeDelta = (curr, prior) => {
  if (curr === null || curr === undefined || prior === null || prior === undefined) return null;
  const diff = curr - prior;
  if (prior === 0) {
    if (diff === 0) return { dir: 'flat', pct: 0 };
    return { dir: diff > 0 ? 'up' : 'down', pct: null }; // "new" — no baseline %
  }
  return { dir: diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat', pct: Math.round((diff / prior) * 100) };
};

// Count LGAs that submitted at least one report.
export const countReportingLgas = (lgas = []) =>
  lgas.filter((l) => (l.submitted_count ?? 0) > 0).length;
