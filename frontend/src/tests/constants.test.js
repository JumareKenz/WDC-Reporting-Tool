/**
 * Unit tests — src/utils/constants.js
 * Validates that constant maps are consistent and complete.
 */
import {
  USER_ROLES,
  ROLE_LABELS,
  REPORT_STATUS,
  STATUS_LABELS,
  API_ENDPOINTS,
  STORAGE_KEYS,
  PAGINATION,
  FILE_UPLOAD,
} from '../utils/constants';

// ---------------------------------------------------------------------------
// Role / Label completeness
// ---------------------------------------------------------------------------
describe('USER_ROLES and ROLE_LABELS', () => {
  it('every role has a label', () => {
    for (const role of Object.values(USER_ROLES)) {
      expect(ROLE_LABELS[role]).toBeDefined();
      expect(typeof ROLE_LABELS[role]).toBe('string');
      expect(ROLE_LABELS[role].length).toBeGreaterThan(0);
    }
  });

  it('contains the three expected roles', () => {
    expect(Object.keys(USER_ROLES)).toHaveLength(3);
    expect(USER_ROLES.WDC_SECRETARY).toBe('WDC_SECRETARY');
    expect(USER_ROLES.LGA_COORDINATOR).toBe('LGA_COORDINATOR');
    expect(USER_ROLES.STATE_OFFICIAL).toBe('STATE_OFFICIAL');
  });
});

// ---------------------------------------------------------------------------
// Report status / label completeness
// ---------------------------------------------------------------------------
describe('REPORT_STATUS and STATUS_LABELS', () => {
  it('every status has a label', () => {
    for (const status of Object.values(REPORT_STATUS)) {
      expect(STATUS_LABELS[status]).toBeDefined();
    }
  });

  it('contains DRAFT, SUBMITTED, REVIEWED, FLAGGED', () => {
    expect(Object.values(REPORT_STATUS)).toEqual(
      expect.arrayContaining(['DRAFT', 'SUBMITTED', 'REVIEWED', 'FLAGGED'])
    );
  });
});

// Investigation constants removed - feature deprecated

// ---------------------------------------------------------------------------
// API_ENDPOINTS shape
// ---------------------------------------------------------------------------
describe('API_ENDPOINTS', () => {
  it('static endpoints are non-empty strings', () => {
    const staticKeys = ['LOGIN', 'ME', 'REPORTS', 'CHECK_SUBMITTED', 'LGAS',
      'NOTIFICATIONS', 'FEEDBACK', 'STATE_SUBMISSIONS',
      'ANALYTICS_OVERVIEW', 'ANALYTICS_LGA_COMPARISON',
      'ANALYTICS_TRENDS', 'ANALYTICS_AI_REPORT',
      'FORMS', 'FORMS_ACTIVE', 'HEALTH'];

    for (const key of staticKeys) {
      expect(typeof API_ENDPOINTS[key]).toBe('string');
      expect(API_ENDPOINTS[key].startsWith('/')).toBe(true);
    }
  });

  it('parameterized endpoints are functions that return strings', () => {
    const funcKeys = ['REPORT_BY_ID', 'REVIEW_REPORT', 'LGA_WARDS', 'LGA_REPORTS',
      'LGA_BY_ID', 'NOTIFICATION_READ', 'FORM_BY_ID'];

    for (const key of funcKeys) {
      expect(typeof API_ENDPOINTS[key]).toBe('function');
      const result = API_ENDPOINTS[key](42);
      expect(typeof result).toBe('string');
      expect(result).toContain('42');
    }
  });
});

// ---------------------------------------------------------------------------
// Storage keys
// ---------------------------------------------------------------------------
describe('STORAGE_KEYS', () => {
  it('has AUTH_TOKEN and USER_DATA keys defined', () => {
    expect(STORAGE_KEYS.AUTH_TOKEN).toBeDefined();
    expect(STORAGE_KEYS.USER_DATA).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Pagination defaults
// ---------------------------------------------------------------------------
describe('PAGINATION', () => {
  it('has sensible defaults', () => {
    expect(PAGINATION.DEFAULT_LIMIT).toBeGreaterThan(0);
    expect(PAGINATION.DEFAULT_OFFSET).toBe(0);
    expect(PAGINATION.MAX_LIMIT).toBeGreaterThanOrEqual(PAGINATION.DEFAULT_LIMIT);
  });
});

// ---------------------------------------------------------------------------
// File upload constraints
// ---------------------------------------------------------------------------
describe('FILE_UPLOAD', () => {
  it('voice note max size is 10 MB', () => {
    expect(FILE_UPLOAD.VOICE_NOTE_MAX_SIZE).toBe(10 * 1024 * 1024);
  });

  it('voice note formats include common audio extensions', () => {
    expect(FILE_UPLOAD.VOICE_NOTE_FORMATS).toContain('.mp3');
    expect(FILE_UPLOAD.VOICE_NOTE_FORMATS).toContain('.wav');
  });

  it('voice note MIME types include common audio types', () => {
    expect(FILE_UPLOAD.VOICE_NOTE_MIME_TYPES).toContain('audio/mpeg');
    expect(FILE_UPLOAD.VOICE_NOTE_MIME_TYPES).toContain('audio/wav');
  });
});
