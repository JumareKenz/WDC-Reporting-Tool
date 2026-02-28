import apiClient, { buildQueryString } from './client';
import { API_ENDPOINTS } from '../utils/constants';

/**
 * Get state-wide overview statistics
 */
export const getOverview = async (params = {}) => {
  const queryString = buildQueryString(params);
  const response = await apiClient.get(`${API_ENDPOINTS.ANALYTICS_OVERVIEW}${queryString}`);
  return response;
};

/**
 * Get LGA comparison data
 */
export const getLGAComparison = async (params = {}) => {
  const queryString = buildQueryString(params);
  const response = await apiClient.get(`${API_ENDPOINTS.ANALYTICS_LGA_COMPARISON}${queryString}`);
  return response;
};

/**
 * Get submission trends over time
 */
export const getTrends = async (params = {}) => {
  const queryString = buildQueryString(params);
  const response = await apiClient.get(`${API_ENDPOINTS.ANALYTICS_TRENDS}${queryString}`);
  return response;
};

/**
 * Generate AI-powered report
 */
export const generateAIReport = async (data = {}) => {
  const response = await apiClient.post(API_ENDPOINTS.ANALYTICS_AI_REPORT, data);
  return response;
};

/**
 * Get aggregated service delivery data
 */
export const getServiceDelivery = async (params = {}) => {
  const queryString = buildQueryString(params);
  const response = await apiClient.get(`${API_ENDPOINTS.ANALYTICS_SERVICE_DELIVERY}${queryString}`);
  return response;
};

/**
 * Generate comprehensive monthly report
 */
export const generateMonthlyReport = async (data = {}) => {
  const response = await apiClient.post(API_ENDPOINTS.ANALYTICS_MONTHLY_REPORT, data);
  return response;
};

/**
 * Get all LGAs
 */
export const getLGAs = async () => {
  const response = await apiClient.get(API_ENDPOINTS.LGAS);
  return response;
};

/**
 * Get all submissions across all wards grouped by LGA
 */
export const getStateSubmissions = async (params = {}) => {
  const queryString = buildQueryString(params);
  const response = await apiClient.get(`${API_ENDPOINTS.STATE_SUBMISSIONS}${queryString}`);
  return response;
};
