/**
 * Unit tests — src/api/reports.js & src/api/profile.js
 * Mocks the axios apiClient instance; verifies that each API function
 * calls the correct HTTP method + URL with expected arguments.
 */
import { vi, describe, it, expect, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock the axios client before importing API modules
// ---------------------------------------------------------------------------
const mockGet = vi.fn(() => Promise.resolve({ data: {} }));
const mockPost = vi.fn(() => Promise.resolve({ data: {} }));
const mockPatch = vi.fn(() => Promise.resolve({ data: {} }));
const mockPut = vi.fn(() => Promise.resolve({ data: {} }));
const mockDelete = vi.fn(() => Promise.resolve({ data: {} }));

vi.mock('../api/client', () => ({
  default: {
    get: mockGet,
    post: mockPost,
    patch: mockPatch,
    put: mockPut,
    delete: mockDelete,
  },
  uploadFile: vi.fn(() => Promise.resolve({ data: {} })),
  downloadFile: vi.fn(() => Promise.resolve(true)),
  buildQueryString: (params) => {
    // Real implementation for correct URL construction
    const sp = new URLSearchParams();
    Object.keys(params).forEach((k) => {
      if (params[k] != null && params[k] !== '') sp.append(k, params[k]);
    });
    const qs = sp.toString();
    return qs ? `?${qs}` : '';
  },
}));

// Import after mock is set up
const { submitReport, getReports, getReportById, updateReport,
  checkSubmitted, getSubmissionInfo, reviewReport } = await import('../api/reports');
const { getProfile, updateProfile, updateEmail, changePassword } = await import('../api/profile');
const { uploadFile, downloadFile } = await import('../api/client');

// ---------------------------------------------------------------------------
// reports.js
// ---------------------------------------------------------------------------
describe('reports API module', () => {
  beforeEach(() => {
    mockGet.mockClear();
    mockPost.mockClear();
    mockPatch.mockClear();
    mockPut.mockClear();
    uploadFile.mockClear();
    downloadFile.mockClear();
  });

  it('submitReport calls uploadFile with /reports endpoint', async () => {
    const payload = { report_month: '2026-01', meetings_held: '2' };
    await submitReport(payload);
    expect(uploadFile).toHaveBeenCalledWith('/reports', payload);
  });

  it('getReports calls GET /reports (no params)', async () => {
    await getReports();
    expect(mockGet).toHaveBeenCalledWith('/reports');
  });

  it('getReports appends query string when params given', async () => {
    await getReports({ limit: 5, offset: 10 });
    expect(mockGet).toHaveBeenCalledWith('/reports?limit=5&offset=10');
  });

  it('getReportById calls GET /reports/:id', async () => {
    await getReportById(42);
    expect(mockGet).toHaveBeenCalledWith('/reports/42');
  });

  it('updateReport calls PUT /reports/:id', async () => {
    const data = { meetings_held: '3' };
    await updateReport(7, data);
    expect(mockPut).toHaveBeenCalledWith('/reports/7', data);
  });

  it('checkSubmitted calls GET /reports/check-submitted?month=...', async () => {
    await checkSubmitted('2026-01');
    expect(mockGet).toHaveBeenCalledWith('/reports/check-submitted?month=2026-01');
  });

  it('getSubmissionInfo calls GET /reports/submission-info', async () => {
    await getSubmissionInfo();
    expect(mockGet).toHaveBeenCalledWith('/reports/submission-info');
  });

  it('reviewReport calls PATCH /reports/:id/review with status', async () => {
    await reviewReport(12, 'REVIEWED');
    expect(mockPatch).toHaveBeenCalledWith('/reports/12/review', { status: 'REVIEWED' });
  });
});

// ---------------------------------------------------------------------------
// profile.js
// ---------------------------------------------------------------------------
describe('profile API module', () => {
  beforeEach(() => {
    mockGet.mockClear();
    mockPost.mockClear();
    mockPatch.mockClear();
  });

  it('getProfile calls GET /profile/me', async () => {
    await getProfile();
    expect(mockGet).toHaveBeenCalledWith('/profile/me');
  });

  it('updateProfile calls PATCH /profile/me with data', async () => {
    const data = { full_name: 'Amina Yusuf', phone: '08012345678' };
    await updateProfile(data);
    expect(mockPatch).toHaveBeenCalledWith('/profile/me', data);
  });

  it('updateEmail calls PATCH /profile/email with email object', async () => {
    await updateEmail('new@test.com');
    expect(mockPatch).toHaveBeenCalledWith('/profile/email', { email: 'new@test.com' });
  });

  it('changePassword calls POST /profile/change-password', async () => {
    await changePassword('oldpass', 'newpass');
    expect(mockPost).toHaveBeenCalledWith('/profile/change-password', {
      current_password: 'oldpass',
      new_password: 'newpass',
    });
  });
});
