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

  it('contains the v1 state-machine states', () => {
    expect(Object.values(REPORT_STATUS)).toEqual(
      expect.arrayContaining(['draft', 'submitted', 'in_review', 'approved', 'returned', 'sealed'])
    );
  });
});

// ---------------------------------------------------------------------------
// API_ENDPOINTS shape
// ---------------------------------------------------------------------------
describe('API_ENDPOINTS', () => {
  it('static endpoints are non-empty strings starting with /', () => {
    const staticKeys = ['REFRESH', 'REPORTS', 'REPORTS_SEAL_DUE', 'LGAS',
      'ATTACHMENTS_UPLOAD', 'FORMS', 'FORMS_VISIBLE', 'USERS',
      'ANALYTICS_OVERVIEW', 'ANALYTICS_LGA_COMPARISON', 'ANALYTICS_TRENDS',
      'ANALYTICS_SERVICE_DELIVERY', 'AI_ASK', 'AI_QUERY', 'AI_CONVERSATIONS',
      'INVESTIGATIONS', 'HEALTH_LIVE'];

    for (const key of staticKeys) {
      expect(typeof API_ENDPOINTS[key]).toBe('string');
      expect(API_ENDPOINTS[key].startsWith('/')).toBe(true);
    }
  });

  it('parameterized endpoints are functions that return strings', () => {
    const funcKeys = ['REPORT_BY_ID', 'REPORT_DETAIL', 'REPORT_FIELDS', 'REPORT_SUBMIT',
      'REPORT_OPEN_REVIEW', 'REPORT_APPROVE', 'REPORT_RETURN', 'LGA_WARDS',
      'FORM_BY_ID', 'USER_BY_ID', 'INVESTIGATION_BY_ID'];

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
