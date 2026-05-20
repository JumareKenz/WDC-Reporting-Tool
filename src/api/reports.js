import apiClient, { buildQueryString } from './client';
import { API_ENDPOINTS } from '../utils/constants';

/** Create a new report (state: draft). */
export const createReport = (data) =>
  apiClient.post(API_ENDPOINTS.REPORTS, data);

/** List reports. Optionally filter by ?state= */
export const getReports = (params = {}) =>
  apiClient.get(API_ENDPOINTS.REPORTS + buildQueryString(params));

/** Get a single report by ID. */
export const getReportById = (id) =>
  apiClient.get(API_ENDPOINTS.REPORT_BY_ID(id));

/** Get the append-only operation log for a report. */
export const getReportOps = (id) =>
  apiClient.get(API_ENDPOINTS.REPORT_OPS(id));

/**
 * Set a single field on a draft report.
 * @param {string} id
 * @param {{ key, value, source: 'typed'|'voiced'|'scanned', confidence?, opId?, wallClockTs? }} data
 */
export const setReportField = (id, data) =>
  apiClient.post(API_ENDPOINTS.REPORT_FIELDS(id), data);

/** Secretary submits a draft report. */
export const submitReport = (id) =>
  apiClient.post(API_ENDPOINTS.REPORT_SUBMIT(id));

/** Coordinator opens a submitted report for review. */
export const openReview = (id) =>
  apiClient.post(API_ENDPOINTS.REPORT_OPEN_REVIEW(id));

/** Coordinator approves a report in review. */
export const approveReport = (id) =>
  apiClient.post(API_ENDPOINTS.REPORT_APPROVE(id));

/**
 * Coordinator returns a report with notes.
 * @param {string} id
 * @param {string} notes
 */
export const returnReport = (id, notes) =>
  apiClient.post(API_ENDPOINTS.REPORT_RETURN(id), { notes });

/** Secretary re-opens a returned report for editing. */
export const editReturnedReport = (id) =>
  apiClient.post(API_ENDPOINTS.REPORT_EDIT_RETURNED(id));

/** Director/system triggers the sealing pass for due reports. */
export const sealDueReports = () =>
  apiClient.post(API_ENDPOINTS.REPORTS_SEAL_DUE);
