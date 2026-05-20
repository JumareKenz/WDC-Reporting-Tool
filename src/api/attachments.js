import apiClient, { uploadFile } from './client';
import { API_ENDPOINTS } from '../utils/constants';

/**
 * Upload an attachment for a report.
 * @param {{ file: File, reportId: string, kind: 'image'|'audio'|'document', caption?: string }} data
 * @param {(pct: number) => void} [onProgress]
 */
export const uploadAttachment = (data, onProgress = null) =>
  uploadFile(API_ENDPOINTS.ATTACHMENTS_UPLOAD, data, onProgress);

/** Get all attachments for a report. */
export const getReportAttachments = (reportId) =>
  apiClient.get(API_ENDPOINTS.ATTACHMENTS_BY_REPORT(reportId));
