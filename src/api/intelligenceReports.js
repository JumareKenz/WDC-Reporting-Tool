import apiClient, { buildQueryString } from './client';
import { API_ENDPOINTS } from '../utils/constants';

/**
 * Intelligence Reports API (HIVA Intelligence Engine, director-only).
 *
 * Job-based async flow:
 *   1. POST /intelligence-reports/generate { stateId, month, year, scope, lgaId? }
 *        → 202 { jobId, status: 'pending' }
 *      scope 'state' aggregates the whole state; scope 'lga' (with lgaId) scopes
 *      the analysis to one LGA's ward submissions. State and LGA jobs are
 *      independent and can run concurrently.
 *   2. GET  /intelligence-reports/status?jobId=...
 *        → { jobId, status: 'pending'|'processing'|'completed'|'failed',
 *            result?: { markdown, metadata }, error? }
 *   3. GET  /intelligence-reports/export?jobId=...&format=pdf|docx  (blob download)
 *
 * Jobs persist 7 days in Redis, so a stored jobId can be re-downloaded without
 * regenerating. The LLM prompt/analysis lives entirely server-side.
 */

const STATE_ID = 'kaduna';

/**
 * Kick off report generation for a given month/year.
 * @param {Object} params
 * @param {number} params.month - 1-indexed month (1 = January).
 * @param {number} params.year - Full year (e.g. 2026).
 * @param {'state'|'lga'} [params.scope='state'] - Aggregation scope.
 * @param {string} [params.lgaId] - LGA id; required when scope === 'lga'.
 * @param {string} [params.stateId='kaduna']
 * @returns {Promise<{ jobId: string, status: string }>}
 */
export const generateIntelligenceReport = ({ month, year, scope = 'state', lgaId, stateId = STATE_ID }) => {
  const payload = { stateId, month, year, scope };
  // Backend resolves the LGA name from lgaId, so only the id is sent.
  if (scope === 'lga' && lgaId) payload.lgaId = lgaId;
  return apiClient.post(API_ENDPOINTS.INTEL_REPORT_GENERATE, payload);
};

/**
 * Poll the status of a generation job.
 * @param {string} jobId
 * @returns {Promise<{ jobId, status, result?, error? }>}
 */
export const getIntelligenceReportStatus = (jobId) =>
  apiClient.get(API_ENDPOINTS.INTEL_REPORT_STATUS + buildQueryString({ jobId }));

/**
 * Download the completed report as a branded PDF or Word document.
 * Fetches the file as a blob and triggers a browser download.
 * @param {string} jobId
 * @param {'pdf'|'docx'} format
 * @param {string} [fileName] - Suggested download filename (without extension).
 */
export const downloadIntelligenceReport = async (jobId, format, fileName) => {
  const blob = await apiClient.get(
    API_ENDPOINTS.INTEL_REPORT_EXPORT + buildQueryString({ jobId, format }),
    { responseType: 'blob', timeout: 60000 }
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${fileName || `intelligence-report-${jobId}`}.${format}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
