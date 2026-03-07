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
export const getSubmissionInfo = async (reportMonth = null) => {
  const queryString = reportMonth ? buildQueryString({ report_month: reportMonth }) : '';
  return apiClient.get(`/reports/submission-info${queryString}`);
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
 * @param {number} timeoutMs - Timeout in milliseconds (default: 10000)
 * @returns {Promise} Response with draft data if exists
 */
export const getExistingDraft = async (reportMonth = null, timeoutMs = 10000) => {
  const queryString = buildQueryString(reportMonth ? { report_month: reportMonth } : {});
  
  // Create an abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await apiClient.get(`/reports/draft/existing${queryString}`, {
      signal: controller.signal,
      timeout: timeoutMs,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    
    // Enhance error message for timeout
    if (error.name === 'AbortError' || error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      const timeoutError = new Error('Request timed out while loading draft. Please try again.');
      timeoutError.isTimeout = true;
      timeoutError.isNetworkError = true;
      throw timeoutError;
    }
    
    // Handle 404 - endpoint not found
    if (error.status === 404) {
      const notFoundError = new Error('Draft service is temporarily unavailable. Please try again later.');
      notFoundError.status = 404;
      notFoundError.isNetworkError = false;
      throw notFoundError;
    }
    
    throw error;
  }
};

/**
 * Delete a draft report
 * @param {number} draftId - Draft report ID
 * @returns {Promise} Response with deletion confirmation
 */
export const deleteDraft = async (draftId) => {
  return apiClient.delete(`/reports/draft/${draftId}`);
};

/**
 * Get all submitted months and reports for the current user (batch)
 * @returns {Promise} Response with submitted_months array and reports array
 */
export const getMySubmissions = async () => {
  console.log('API: getMySubmissions called');
  try {
    const result = await apiClient.get('/reports/my-submissions');
    console.log('API: getMySubmissions success:', result);
    return result;
  } catch (error) {
    console.error('API: getMySubmissions error:', error.message, error.status, error.details);
    throw error;
  }
};

/**
 * Upload attendance photo for a report
 * Backend expects the photo as part of a PUT /reports/{id} with multipart form-data.
 * @param {number} reportId - Report ID
 * @param {File} file - Image file to upload
 * @returns {Promise} Response with updated report (includes attendance_photo_url)
 */
export const uploadAttendancePhoto = async (reportId, file) => {
  const formData = new FormData();
  formData.append('attendance_photo', file);

  return apiClient.put(`/reports/${reportId}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

/**
 * Upload a voice note for a specific field in a report
 * @param {number} reportId - Report ID
 * @param {string} fieldName - Field name/key
 * @param {Blob} audioBlob - Audio blob to upload
 * @param {string} mimeType - MIME type of the audio (e.g., 'audio/webm')
 * @returns {Promise} Response with { id, field_name, status, audio_url }
 */
export const uploadVoiceNote = async (reportId, fieldName, audioBlob, mimeType) => {
  const formData = new FormData();
  formData.append('field_name', fieldName);
  
  // Determine file extension from mimeType
  const extension = mimeType === 'audio/webm' ? 'webm' : 
                    mimeType === 'audio/mp4' ? 'mp4' : 
                    mimeType === 'audio/ogg' ? 'ogg' : 'webm';
  
  const file = new File([audioBlob], `voice_${fieldName}.${extension}`, { type: mimeType });
  formData.append('file', file);
  
  return apiClient.post(`/reports/${reportId}/voice-notes`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

/**
 * Fetch all voice notes for a report
 * @param {number} reportId - Report ID
 * @returns {Promise} Response with array of voice note objects
 */
export const fetchVoiceNotes = async (reportId) => {
  return apiClient.get(`/reports/${reportId}/voice-notes`);
};

/**
 * Trigger transcription for a voice note
 * @param {number} voiceNoteId - Voice note ID
 * @returns {Promise} Response with { id, transcription_text, status }
 */
export const triggerTranscription = async (voiceNoteId) => {
  return apiClient.post(`/voice-notes/${voiceNoteId}/transcribe`);
};

/**
 * Fetch voice note audio as blob URL
 * @param {number} voiceNoteId - Voice note ID
 * @returns {Promise} Blob URL for audio playback
 */
export const fetchVoiceNoteAudio = async (voiceNoteId) => {
  const response = await apiClient.get(`/voice-notes/${voiceNoteId}/audio`, {
    responseType: 'blob',
  });
  
  // The response interceptor returns response.data, so we need to handle the raw response
  // We'll use the apiClient's underlying axios instance for blob requests
  const blob = response instanceof Blob ? response : response.data;
  return URL.createObjectURL(blob);
};
