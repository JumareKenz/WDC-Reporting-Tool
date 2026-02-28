/**
 * Unit tests — src/utils/formatters.js
 * Pure functions: no DOM, no network, no mocks needed.
 */
import {
  formatDate,
  formatMonth,
  getCurrentMonth,
  getRelativeTime,
  formatNumber,
  formatPercentage,
  formatFileSize,
  formatDuration,
  truncateText,
  capitalize,
  toTitleCase,
  formatPhoneNumber,
  isMonthInFuture,
  isValidMonth,
  getStatusColor,
  getSubmissionRateColor,
  getPriorityColor,
} from '../utils/formatters';

// ---------------------------------------------------------------------------
// formatDate
// ---------------------------------------------------------------------------
describe('formatDate', () => {
  it('returns "-" for null/undefined/empty', () => {
    expect(formatDate(null)).toBe('-');
    expect(formatDate(undefined)).toBe('-');
    expect(formatDate('')).toBe('-');
  });

  it('returns "-" for an invalid date string', () => {
    expect(formatDate('not-a-date')).toBe('-');
  });

  it('formats a valid ISO date without time', () => {
    // Use a fixed UTC date; note: local tz may shift the day,
    // so we construct in local time explicitly.
    const d = new Date(2024, 0, 15); // Jan 15, 2024 local
    const result = formatDate(d);
    expect(result).toBe('Jan 15, 2024');
  });

  it('formats a valid date with time', () => {
    const d = new Date(2024, 5, 3, 14, 5); // Jun 3, 2024 2:05 PM
    const result = formatDate(d, true);
    expect(result).toBe('Jun 3, 2024 2:05 PM');
  });

  it('formats midnight (12 AM)', () => {
    const d = new Date(2024, 2, 10, 0, 30); // Mar 10, 2024 12:30 AM
    const result = formatDate(d, true);
    expect(result).toBe('Mar 10, 2024 12:30 AM');
  });

  it('formats noon (12 PM)', () => {
    const d = new Date(2024, 2, 10, 12, 0); // Mar 10, 2024 12:00 PM
    const result = formatDate(d, true);
    expect(result).toBe('Mar 10, 2024 12:00 PM');
  });
});

// ---------------------------------------------------------------------------
// formatMonth
// ---------------------------------------------------------------------------
describe('formatMonth', () => {
  it('returns "-" for falsy input', () => {
    expect(formatMonth(null)).toBe('-');
    expect(formatMonth('')).toBe('-');
    expect(formatMonth(undefined)).toBe('-');
  });

  it('formats valid YYYY-MM strings', () => {
    expect(formatMonth('2024-01')).toBe('January 2024');
    expect(formatMonth('2024-06')).toBe('June 2024');
    expect(formatMonth('2024-12')).toBe('December 2024');
  });

  it('returns raw string for out-of-range month', () => {
    expect(formatMonth('2024-00')).toBe('2024-00');
    expect(formatMonth('2024-13')).toBe('2024-13');
  });
});

// ---------------------------------------------------------------------------
// getCurrentMonth
// ---------------------------------------------------------------------------
describe('getCurrentMonth', () => {
  it('returns YYYY-MM matching the current date', () => {
    const now = new Date();
    const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    expect(getCurrentMonth()).toBe(expected);
  });

  it('matches the YYYY-MM regex pattern', () => {
    expect(getCurrentMonth()).toMatch(/^\d{4}-\d{2}$/);
  });
});

// ---------------------------------------------------------------------------
// getRelativeTime
// ---------------------------------------------------------------------------
describe('getRelativeTime', () => {
  it('returns "-" for falsy input', () => {
    expect(getRelativeTime(null)).toBe('-');
    expect(getRelativeTime('')).toBe('-');
  });

  it('returns "-" for invalid date', () => {
    expect(getRelativeTime('xyz')).toBe('-');
  });

  it('returns "Just now" for a date < 60 seconds ago', () => {
    const d = new Date(Date.now() - 30 * 1000);
    expect(getRelativeTime(d)).toBe('Just now');
  });

  it('returns "X minutes ago"', () => {
    const d = new Date(Date.now() - 5 * 60 * 1000);
    expect(getRelativeTime(d)).toBe('5 minutes ago');
  });

  it('returns "1 minute ago" (singular)', () => {
    const d = new Date(Date.now() - 90 * 1000); // 1.5 min → floor = 1
    expect(getRelativeTime(d)).toBe('1 minute ago');
  });

  it('returns "X hours ago"', () => {
    const d = new Date(Date.now() - 3 * 60 * 60 * 1000);
    expect(getRelativeTime(d)).toBe('3 hours ago');
  });

  it('returns "X days ago"', () => {
    const d = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000);
    expect(getRelativeTime(d)).toBe('4 days ago');
  });

  it('returns "X weeks ago"', () => {
    const d = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    expect(getRelativeTime(d)).toBe('2 weeks ago');
  });

  it('returns "X months ago"', () => {
    const d = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000);
    expect(getRelativeTime(d)).toBe('1 month ago');
  });

  it('returns "X years ago"', () => {
    const d = new Date(Date.now() - 400 * 24 * 60 * 60 * 1000);
    expect(getRelativeTime(d)).toBe('1 year ago');
  });
});

// ---------------------------------------------------------------------------
// formatNumber
// ---------------------------------------------------------------------------
describe('formatNumber', () => {
  it('returns "0" for null/undefined', () => {
    expect(formatNumber(null)).toBe('0');
    expect(formatNumber(undefined)).toBe('0');
  });

  it('formats numbers with locale separators', () => {
    expect(formatNumber(1000)).toBe('1,000');
    expect(formatNumber(1000000)).toBe('1,000,000');
  });

  it('formats small numbers without separator', () => {
    expect(formatNumber(42)).toBe('42');
  });
});

// ---------------------------------------------------------------------------
// formatPercentage
// ---------------------------------------------------------------------------
describe('formatPercentage', () => {
  it('returns "0%" for null/undefined', () => {
    expect(formatPercentage(null)).toBe('0%');
    expect(formatPercentage(undefined)).toBe('0%');
  });

  it('formats with default 1 decimal', () => {
    expect(formatPercentage(75.678)).toBe('75.7%');
  });

  it('formats with custom decimals', () => {
    expect(formatPercentage(50, 2)).toBe('50.00%');
    expect(formatPercentage(33.333, 0)).toBe('33%');
  });
});

// ---------------------------------------------------------------------------
// formatFileSize
// ---------------------------------------------------------------------------
describe('formatFileSize', () => {
  it('returns "0 Bytes" for 0 or falsy', () => {
    expect(formatFileSize(0)).toBe('0 Bytes');
    expect(formatFileSize(null)).toBe('0 Bytes');
  });

  it('formats bytes', () => {
    expect(formatFileSize(500)).toBe('500 Bytes');
  });

  it('formats kilobytes', () => {
    expect(formatFileSize(1536)).toBe('1.5 KB');
  });

  it('formats megabytes', () => {
    expect(formatFileSize(5 * 1024 * 1024)).toBe('5 MB');
  });

  it('formats gigabytes', () => {
    expect(formatFileSize(2.5 * 1024 * 1024 * 1024)).toBe('2.5 GB');
  });
});

// ---------------------------------------------------------------------------
// formatDuration
// ---------------------------------------------------------------------------
describe('formatDuration', () => {
  it('returns "0:00" for 0 or falsy', () => {
    expect(formatDuration(0)).toBe('0:00');
    expect(formatDuration(null)).toBe('0:00');
  });

  it('formats seconds only', () => {
    expect(formatDuration(45)).toBe('0:45');
  });

  it('formats minutes and seconds', () => {
    expect(formatDuration(150)).toBe('2:30');
  });

  it('pads single-digit seconds', () => {
    expect(formatDuration(61)).toBe('1:01');
  });
});

// ---------------------------------------------------------------------------
// truncateText
// ---------------------------------------------------------------------------
describe('truncateText', () => {
  it('returns "" for falsy input', () => {
    expect(truncateText(null)).toBe('');
    expect(truncateText('')).toBe('');
  });

  it('does not truncate text within limit', () => {
    expect(truncateText('hello', 10)).toBe('hello');
  });

  it('truncates text at maxLength with ellipsis', () => {
    const text = 'a'.repeat(150);
    expect(truncateText(text, 100)).toBe('a'.repeat(100) + '...');
  });

  it('uses default maxLength of 100', () => {
    const text = 'x'.repeat(105);
    expect(truncateText(text)).toBe('x'.repeat(100) + '...');
  });
});

// ---------------------------------------------------------------------------
// capitalize & toTitleCase
// ---------------------------------------------------------------------------
describe('capitalize', () => {
  it('returns "" for falsy input', () => {
    expect(capitalize('')).toBe('');
    expect(capitalize(null)).toBe('');
  });

  it('capitalizes each word', () => {
    expect(capitalize('hello world')).toBe('Hello World');
    expect(capitalize('HELLO WORLD')).toBe('Hello World');
  });
});

describe('toTitleCase', () => {
  it('returns "" for falsy input', () => {
    expect(toTitleCase('')).toBe('');
    expect(toTitleCase(null)).toBe('');
  });

  it('converts snake_case to Title Case', () => {
    expect(toTitleCase('IN_PROGRESS')).toBe('In Progress');
    expect(toTitleCase('ward_development_committee')).toBe('Ward Development Committee');
  });

  it('converts kebab-case to Title Case', () => {
    expect(toTitleCase('state-official')).toBe('State Official');
  });
});

// ---------------------------------------------------------------------------
// formatPhoneNumber
// ---------------------------------------------------------------------------
describe('formatPhoneNumber', () => {
  it('returns "-" for falsy input', () => {
    expect(formatPhoneNumber(null)).toBe('-');
    expect(formatPhoneNumber('')).toBe('-');
  });

  it('formats 11-digit local number', () => {
    expect(formatPhoneNumber('08012345678')).toBe('0801 234 5678');
  });

  it('formats +234 international number', () => {
    // Stripped of '+': 2348012345678 = 13 digits starting with 234
    expect(formatPhoneNumber('+2348012345678')).toBe('+234 801 234 5678');
  });

  it('returns raw string for unrecognized format', () => {
    expect(formatPhoneNumber('12345')).toBe('12345');
  });
});

// ---------------------------------------------------------------------------
// isMonthInFuture & isValidMonth
// ---------------------------------------------------------------------------
describe('isMonthInFuture', () => {
  it('returns false for falsy input', () => {
    expect(isMonthInFuture(null)).toBe(false);
    expect(isMonthInFuture('')).toBe(false);
  });

  it('returns true for a month well in the future', () => {
    expect(isMonthInFuture('2099-06')).toBe(true);
  });

  it('returns false for a month well in the past', () => {
    expect(isMonthInFuture('2020-01')).toBe(false);
  });
});

describe('isValidMonth', () => {
  it('returns false for falsy/malformed strings', () => {
    expect(isValidMonth(null)).toBe(false);
    expect(isValidMonth('')).toBe(false);
    expect(isValidMonth('2024')).toBe(false);
    expect(isValidMonth('2024-1')).toBe(false);
    expect(isValidMonth('abcd-ef')).toBe(false);
  });

  it('returns false for out-of-range month values', () => {
    expect(isValidMonth('2024-00')).toBe(false);
    expect(isValidMonth('2024-13')).toBe(false);
  });

  it('returns false for out-of-range year values', () => {
    expect(isValidMonth('1999-06')).toBe(false);
    expect(isValidMonth('2101-06')).toBe(false);
  });

  it('returns true for valid months', () => {
    expect(isValidMonth('2024-01')).toBe(true);
    expect(isValidMonth('2024-12')).toBe(true);
    expect(isValidMonth('2020-06')).toBe(true);
    expect(isValidMonth('2100-12')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Status / Rate / Priority color helpers
// ---------------------------------------------------------------------------
describe('getStatusColor', () => {
  it('returns correct class for known statuses', () => {
    expect(getStatusColor('SUBMITTED')).toBe('bg-blue-100 text-blue-800');
    expect(getStatusColor('REVIEWED')).toBe('bg-green-100 text-green-800');
    expect(getStatusColor('FLAGGED')).toBe('bg-yellow-100 text-yellow-800');
    expect(getStatusColor('DRAFT')).toBe('bg-neutral-100 text-neutral-800');
  });

  it('returns default class for unknown status', () => {
    expect(getStatusColor('UNKNOWN')).toBe('bg-neutral-100 text-neutral-800');
  });
});

describe('getSubmissionRateColor', () => {
  it('returns green for >= 90', () => {
    expect(getSubmissionRateColor(90)).toBe('text-green-600');
    expect(getSubmissionRateColor(100)).toBe('text-green-600');
  });

  it('returns blue for 70-89', () => {
    expect(getSubmissionRateColor(70)).toBe('text-blue-600');
    expect(getSubmissionRateColor(89)).toBe('text-blue-600');
  });

  it('returns yellow for 50-69', () => {
    expect(getSubmissionRateColor(50)).toBe('text-yellow-600');
    expect(getSubmissionRateColor(69)).toBe('text-yellow-600');
  });

  it('returns red for < 50', () => {
    expect(getSubmissionRateColor(0)).toBe('text-red-600');
    expect(getSubmissionRateColor(49)).toBe('text-red-600');
  });
});

describe('getPriorityColor', () => {
  it('returns correct class for all priorities', () => {
    expect(getPriorityColor('LOW')).toBe('bg-neutral-100 text-neutral-800');
    expect(getPriorityColor('MEDIUM')).toBe('bg-blue-100 text-blue-800');
    expect(getPriorityColor('HIGH')).toBe('bg-yellow-100 text-yellow-800');
    expect(getPriorityColor('URGENT')).toBe('bg-red-100 text-red-800');
  });

  it('returns default for unknown priority', () => {
    expect(getPriorityColor('EXTREME')).toBe('bg-neutral-100 text-neutral-800');
  });
});
