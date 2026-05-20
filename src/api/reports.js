import apiClient, { uploadFile, downloadFile, buildQueryString } from './client';
import { API_ENDPOINTS } from '../utils/constants';

/**
 * Submit a new report
 * @param {Object} data - Report data including voice note
 * @returns {Promise} Response with report data
 */
export const submitReport = async (data) => {
  // Use uploadFile helper for multipart/form-data
  return uploadFile(API_ENDPOINTS.REPORTS, data);
};

/**
 * Get reports for current user's ward
 * @param {Object} params - Query parameters (limit, offset)
 * @returns {Promise} Response with reports array
 */
export const getReports = async (params = {}) => {
  const queryString = buildQueryString(params);
  return apiClient.get(`${API_ENDPOINTS.REPORTS}${queryString}`);
};

/**
 * Get report by ID
 * @param {number} reportId - Report ID
 * @returns {Promise} Response with report details
 */
export const getReportById = async (reportId) => {
  return apiClient.get(API_ENDPOINTS.REPORT_BY_ID(reportId));
};

/**
 * Update an existing report
 * @param {number} reportId - Report ID
 * @param {Object} data - Updated report data
 * @returns {Promise} Response with updated report
 */
export const updateReport = async (reportId, data) => {
  return apiClient.put(API_ENDPOINTS.REPORT_BY_ID(reportId), data);
};

/**
 * Check if report has been submitted for a given month
 * @param {string} month - Month in YYYY-MM format
 * @returns {Promise} Response with submission status
 */
export const checkSubmitted = async (month) => {
  const queryString = buildQueryString({ month });
  return apiClient.get(`${API_ENDPOINTS.CHECK_SUBMITTED}${queryString}`);
};

/**
 * Get submission info for current period
 * @returns {Promise} Response with target month, period info, and submission status
 */
export const getSubmissionInfo = async () => {
  return apiClient.get('/reports/submission-info');
};

/**
 * Review a report (LGA Coordinator/State Official)
 * @param {number} reportId - Report ID
 * @param {string} status - New status (REVIEWED, FLAGGED)
 * @returns {Promise} Response with updated report
 */
export const reviewReport = async (reportId, status) => {
  return apiClient.patch(API_ENDPOINTS.REVIEW_REPORT(reportId), { status });
};

/**
 * Download voice note
 * @param {number} voiceNoteId - Voice note ID
 * @param {string} filename - Optional filename
 * @returns {Promise} Download result
 */
export const downloadVoiceNote = async (voiceNoteId, filename = null) => {
  return downloadFile(API_ENDPOINTS.VOICE_NOTE_DOWNLOAD(voiceNoteId), filename);
};

/**
 * Delete voice note
 * @param {number} voiceNoteId - Voice note ID
 * @returns {Promise} Response
 */
export const deleteVoiceNote = async (voiceNoteId) => {
  return apiClient.delete(API_ENDPOINTS.VOICE_NOTE_DELETE(voiceNoteId));
};

/**
 * Get AI suggestions for a report's voice note
 * @param {number} reportId - Report ID
 * @returns {Promise} Response with transcription status and suggestions
 */
export const getAISuggestions = async (reportId) => {
  return apiClient.get(API_ENDPOINTS.AI_SUGGESTIONS(reportId));
};

/**
 * Accept selected AI suggestions and apply to report
 * @param {number} reportId - Report ID
 * @param {string[]} fields - Array of field names to accept
 * @returns {Promise} Response with update confirmation
 */
export const acceptAISuggestions = async (reportId, fields) => {
  return apiClient.post(API_ENDPOINTS.AI_SUGGESTIONS_ACCEPT(reportId), { fields });
};

/**
 * Save a draft report
 * @param {Object} data - Draft report data including report_month and report_data
 * @returns {Promise} Response with saved draft data
 */
export const saveDraft = async (data) => {
  return uploadFile('/reports/draft', data);
};

/**
 * Get existing draft for a specific month
 * @param {string} reportMonth - Month in YYYY-MM format (optional, defaults to current month)
 * @returns {Promise} Response with draft data if exists
 */
export const getExistingDraft = async (reportMonth = null) => {
  const queryString = buildQueryString(reportMonth ? { report_month: reportMonth } : {});
  return apiClient.get(`/reports/draft/existing${queryString}`);
};

/**
 * Delete a draft report
 * @param {number} draftId - Draft report ID
 * @returns {Promise} Response with deletion confirmation
 */
export const deleteDraft = async (draftId) => {
  return apiClient.delete(`/reports/draft/${draftId}`);
};
