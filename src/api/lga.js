/**
 * LGA-scoped API helpers.
 *
 * The new backend has no explicit /lgas endpoints.
 * All data is fetched through RLS-scoped generic endpoints:
 *   - Reports:  GET /reports  (returns coordinator's LGA reports automatically)
 *   - Users:    GET /users?role=secretary  (returns coordinator's LGA secretaries)
 *   - Messages: POST /messages/broadcast
 */

import apiClient, { buildQueryString } from './client';
import { API_ENDPOINTS } from '../utils/constants';

/** Get all reports for the coordinator's LGA (RLS-scoped). */
export const getLGAReports = (params = {}) =>
  apiClient.get(API_ENDPOINTS.REPORTS + buildQueryString(params));

/** Get secretaries in the coordinator's LGA. */
export const getLGASecretaries = (params = {}) =>
  apiClient.get(API_ENDPOINTS.USERS + buildQueryString({ role: 'secretary', ...params }));

/** Coordinator opens a submitted report for review. */
export const openReview = (reportId) =>
  apiClient.post(API_ENDPOINTS.REPORT_OPEN_REVIEW(reportId));

/** Coordinator approves a report. */
export const approveReport = (reportId) =>
  apiClient.post(API_ENDPOINTS.REPORT_APPROVE(reportId));

/** Coordinator returns a report with notes. */
export const returnReport = (reportId, notes) =>
  apiClient.post(API_ENDPOINTS.REPORT_RETURN(reportId), { notes });

/** Director: send a broadcast message. */
export const sendNotification = (data) =>
  apiClient.post(API_ENDPOINTS.MESSAGES_BROADCAST, data);

/** Get message deliveries (in-app notifications) for the current user. */
export const getFeedback = (params = {}) =>
  apiClient.get(API_ENDPOINTS.MESSAGE_DELIVERIES + buildQueryString(params));

/** Mark a delivery as read. */
export const markFeedbackRead = (id) =>
  apiClient.post(API_ENDPOINTS.MESSAGE_DELIVERY_READ(id));
