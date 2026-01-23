import apiClient, { buildQueryString } from './client';
import { API_ENDPOINTS } from '../utils/constants';

/**
 * Get LGA details by ID
 */
export const getLGA = async (lgaId) => {
  const response = await apiClient.get(API_ENDPOINTS.LGA_BY_ID(lgaId));
  return response;
};

/**
 * Get wards for an LGA with submission status
 */
export const getLGAWards = async (lgaId, params = {}) => {
  const queryString = buildQueryString(params);
  const response = await apiClient.get(`${API_ENDPOINTS.LGA_WARDS(lgaId)}${queryString}`);
  return response;
};

/**
 * Get reports for an LGA
 */
export const getLGAReports = async (lgaId, params = {}) => {
  const queryString = buildQueryString(params);
  const response = await apiClient.get(`${API_ENDPOINTS.LGA_REPORTS(lgaId)}${queryString}`);
  return response;
};

/**
 * Get missing reports for an LGA
 */
export const getLGAMissingReports = async (lgaId, params = {}) => {
  const queryString = buildQueryString(params);
  const response = await apiClient.get(`${API_ENDPOINTS.LGA_MISSING_REPORTS(lgaId)}${queryString}`);
  return response;
};

/**
 * Send notification to ward secretaries
 */
export const sendNotification = async (data) => {
  const response = await apiClient.post(API_ENDPOINTS.NOTIFICATIONS_SEND, data);
  return response;
};

/**
 * Review a report (change status)
 */
export const reviewReport = async (reportId, data) => {
  const response = await apiClient.patch(API_ENDPOINTS.REVIEW_REPORT(reportId), data);
  return response;
};

/**
 * Get feedback messages
 */
export const getFeedback = async (params = {}) => {
  const queryString = buildQueryString(params);
  const response = await apiClient.get(`${API_ENDPOINTS.FEEDBACK}${queryString}`);
  return response;
};

/**
 * Send feedback message
 */
export const sendFeedback = async (data) => {
  const response = await apiClient.post(API_ENDPOINTS.FEEDBACK, data);
  return response;
};
