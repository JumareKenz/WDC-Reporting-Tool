/**
 * Unit tests — src/utils/dateUtils.js
 * Time-dependent functions are tested using vitest's built-in fake timers.
 */
import {
  getTargetReportMonth,
  getSubmissionInfo,
  formatMonthDisplay,
  getSubmissionPeriodDescription,
} from '../utils/dateUtils';

// ---------------------------------------------------------------------------
// getTargetReportMonth
// ---------------------------------------------------------------------------
describe('getTargetReportMonth', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('days 1-23: returns previous month', () => {
    vi.setSystemTime(new Date(2026, 1, 10)); // Feb 10, 2026
    expect(getTargetReportMonth()).toBe('2026-01');
  });

  it('day 23: still previous month (boundary)', () => {
    vi.setSystemTime(new Date(2026, 1, 23)); // Feb 23
    expect(getTargetReportMonth()).toBe('2026-01');
  });

  it('day 24: switches to current month', () => {
    vi.setSystemTime(new Date(2026, 1, 24)); // Feb 24
    expect(getTargetReportMonth()).toBe('2026-02');
  });

  it('days 24-end: returns current month', () => {
    vi.setSystemTime(new Date(2026, 2, 28)); // Mar 28
    expect(getTargetReportMonth()).toBe('2026-03');
  });

  it('Jan 1-23: wraps back to previous year December', () => {
    vi.setSystemTime(new Date(2026, 0, 5)); // Jan 5, 2026
    expect(getTargetReportMonth()).toBe('2025-12');
  });

  it('Jan 24+: returns January of current year', () => {
    vi.setSystemTime(new Date(2026, 0, 25)); // Jan 25, 2026
    expect(getTargetReportMonth()).toBe('2026-01');
  });

  it('Dec 24+: returns December of current year', () => {
    vi.setSystemTime(new Date(2026, 11, 30)); // Dec 30, 2026
    expect(getTargetReportMonth()).toBe('2026-12');
  });
});

// ---------------------------------------------------------------------------
// getSubmissionInfo
// ---------------------------------------------------------------------------
describe('getSubmissionInfo', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns correct structure', () => {
    vi.setSystemTime(new Date(2026, 1, 10));
    const info = getSubmissionInfo();
    expect(info).toHaveProperty('target_month');
    expect(info).toHaveProperty('month_name');
    expect(info).toHaveProperty('is_submission_window');
    expect(info).toHaveProperty('current_day');
  });

  it('day 5: is_submission_window = true (days 1-7 window)', () => {
    vi.setSystemTime(new Date(2026, 1, 5)); // Feb 5
    const info = getSubmissionInfo();
    expect(info.is_submission_window).toBe(true);
    expect(info.current_day).toBe(5);
    expect(info.target_month).toBe('2026-01'); // previous month
  });

  it('day 7: is_submission_window = true (boundary)', () => {
    vi.setSystemTime(new Date(2026, 1, 7));
    expect(getSubmissionInfo().is_submission_window).toBe(true);
  });

  it('day 8: is_submission_window = false (mid-month gap)', () => {
    vi.setSystemTime(new Date(2026, 1, 8));
    expect(getSubmissionInfo().is_submission_window).toBe(false);
  });

  it('day 15: is_submission_window = false', () => {
    vi.setSystemTime(new Date(2026, 1, 15));
    expect(getSubmissionInfo().is_submission_window).toBe(false);
  });

  it('day 23: is_submission_window = false (boundary before late window)', () => {
    vi.setSystemTime(new Date(2026, 1, 23));
    expect(getSubmissionInfo().is_submission_window).toBe(false);
  });

  it('day 24: is_submission_window = true (late window opens)', () => {
    vi.setSystemTime(new Date(2026, 1, 24));
    const info = getSubmissionInfo();
    expect(info.is_submission_window).toBe(true);
    expect(info.target_month).toBe('2026-02'); // current month
  });

  it('day 31: is_submission_window = true', () => {
    vi.setSystemTime(new Date(2026, 2, 31)); // Mar 31
    expect(getSubmissionInfo().is_submission_window).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// formatMonthDisplay
// ---------------------------------------------------------------------------
describe('formatMonthDisplay', () => {
  it('formats valid YYYY-MM to readable month name', () => {
    const result = formatMonthDisplay('2026-01');
    expect(result).toMatch(/January/);
    expect(result).toMatch(/2026/);
  });

  it('formats December', () => {
    const result = formatMonthDisplay('2025-12');
    expect(result).toMatch(/December/);
    expect(result).toMatch(/2025/);
  });

  it('does not crash on malformed input', () => {
    // The try/catch in formatMonthDisplay catches thrown errors,
    // but NaN dates produce 'Invalid Date' from toLocaleDateString
    // without throwing. Either way the function must not throw.
    expect(() => formatMonthDisplay('garbage')).not.toThrow();
    expect(() => formatMonthDisplay('')).not.toThrow();
    expect(() => formatMonthDisplay(null)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// getSubmissionPeriodDescription
// ---------------------------------------------------------------------------
describe('getSubmissionPeriodDescription', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('day <= 23: description references "Days 1-23" and previous month', () => {
    vi.setSystemTime(new Date(2026, 1, 10)); // Feb 10 → target Jan
    const desc = getSubmissionPeriodDescription();
    expect(desc).toMatch(/Days 1-23/);
    expect(desc).toMatch(/previous month/);
  });

  it('day >= 24: description references "Days 24-end" and current month', () => {
    vi.setSystemTime(new Date(2026, 1, 25)); // Feb 25 → target Feb
    const desc = getSubmissionPeriodDescription();
    expect(desc).toMatch(/Days 24-end/);
    expect(desc).toMatch(/current month/);
  });
});
