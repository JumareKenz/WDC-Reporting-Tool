import apiClient, { buildQueryString } from './client';
import { API_ENDPOINTS } from '../utils/constants';
import { getReports, approveReport, returnReport, openReview } from './reports';

// Geography is RLS-scoped on the backend; there's no /lgas/:id endpoint.
// We synthesize the small bits of legacy shape we need from /lgas list lookups.

export const getLGAs = async () => apiClient.get(API_ENDPOINTS.LGAS);

export const getLGA = async (lgaId) => {
  const list = await getLGAs();
  const arr = Array.isArray(list) ? list : list?.lgas || [];
  return arr.find((l) => String(l.id) === String(lgaId)) || null;
};

export const getLGAWards = async (lgaId, params = {}) => {
  const queryString = buildQueryString(params);
  return apiClient.get(`${API_ENDPOINTS.LGA_WARDS(lgaId)}${queryString}`);
};

// Reports for an LGA / missing reports — backend lists are RLS-scoped, so the
// LGA filter happens server-side based on the caller's JWT. We just pass the
// state filter through.
export const getLGAReports = async (_lgaId, params = {}) =>
  getReports({ ...params });

export const getLGAMissingReports = async (_lgaId, params = {}) =>
  getReports({ ...params, state: 'draft' });

export const reviewReport = async (reportId, data = {}) => {
  const { action, notes = '' } = data;
  if (action === 'approve' || action === 'approved' || action === 'REVIEWED') return approveReport(reportId, notes);
  if (action === 'return' || action === 'returned' || action === 'FLAGGED' || action === 'DECLINED') return returnReport(reportId, notes);
  return openReview(reportId);
};

// Notifications / feedback now live under /messages. Director role can broadcast;
// non-directors should not be calling sendNotification / sendFeedback. Provide
// stubs that return a resolved-but-empty result so old UI paths don't crash.
export const sendNotification = async (data) =>
  apiClient.post(API_ENDPOINTS.MESSAGES_BROADCAST, data).catch(() => ({ ok: false, status: 'unsupported' }));

export const getFeedback = async (params = {}) => {
  const queryString = buildQueryString(params);
  return apiClient.get(`${API_ENDPOINTS.MESSAGE_DELIVERIES}${queryString}`);
};

export const sendFeedback = async (data) =>
  apiClient.post(API_ENDPOINTS.MESSAGES_BROADCAST, data).catch(() => ({ ok: false, status: 'unsupported' }));
