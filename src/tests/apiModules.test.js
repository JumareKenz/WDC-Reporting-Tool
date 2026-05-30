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
const { submitReport, getReports, getReportById, getReportDetail, createReport,
  appendFieldOp, updateReport, checkSubmitted, getSubmissionInfo, reviewReport } = await import('../api/reports');
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

  it('createReport POSTs /reports with { formVersionId, submissionMethod }', async () => {
    await createReport({ formVersionId: 'v-uuid', submissionMethod: 'wizard' });
    expect(mockPost).toHaveBeenCalledWith('/reports', { submissionMethod: 'wizard', formVersionId: 'v-uuid' });
  });

  it('appendFieldOp POSTs one /reports/:id/fields request per field { key, value, source }', async () => {
    await appendFieldOp('r1', { report_date: '2026-05-30', health_bcg: 29 });
    expect(mockPost).toHaveBeenCalledWith('/reports/r1/fields', { key: 'report_date', value: '2026-05-30', source: 'typed' });
    expect(mockPost).toHaveBeenCalledWith('/reports/r1/fields', { key: 'health_bcg', value: 29, source: 'typed' });
  });

  it('submitReport POSTs /reports/:id/submit', async () => {
    await submitReport('r5');
    expect(mockPost).toHaveBeenCalledWith('/reports/r5/submit');
  });

  it('getReports calls GET /reports (no params)', async () => {
    await getReports();
    expect(mockGet).toHaveBeenCalledWith('/reports');
  });

  it('getReports appends query string when params given', async () => {
    await getReports({ state: 'submitted' });
    expect(mockGet).toHaveBeenCalledWith('/reports?state=submitted');
  });

  it('getReportById calls GET /reports/:id', async () => {
    await getReportById(42);
    expect(mockGet).toHaveBeenCalledWith('/reports/42');
  });

  it('getReportDetail calls GET /reports/:id/detail', async () => {
    await getReportDetail(42);
    expect(mockGet).toHaveBeenCalledWith('/reports/42/detail');
  });

  it('reviewReport approve runs open-review then approve', async () => {
    await reviewReport(12, 'REVIEWED');
    expect(mockPost).toHaveBeenCalledWith('/reports/12/open-review');
    expect(mockPost).toHaveBeenCalledWith('/reports/12/approve', {});
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

  it('getProfile reads cached user data without an HTTP call (identity lives in the JWT)', async () => {
    const result = await getProfile();
    expect(mockGet).not.toHaveBeenCalled();
    expect(result === null || typeof result === 'object').toBe(true);
  });

  it('updateProfile rejects — profile edits are managed centrally (no endpoint)', async () => {
    await expect(updateProfile({ full_name: 'Amina Yusuf' })).rejects.toThrow(/managed centrally/i);
    expect(mockPatch).not.toHaveBeenCalledWith('/profile/me', expect.anything());
  });

  it('updateEmail rejects — email changes are managed centrally (no endpoint)', async () => {
    await expect(updateEmail('new@test.com')).rejects.toThrow(/managed centrally/i);
    expect(mockPatch).not.toHaveBeenCalledWith('/profile/email', expect.anything());
  });

  it('changePassword rejects — no self-service endpoint for console accounts', async () => {
    await expect(changePassword('oldpass', 'newpass')).rejects.toThrow(/state office/i);
    expect(mockPost).not.toHaveBeenCalledWith('/profile/change-password', expect.anything());
  });
});
