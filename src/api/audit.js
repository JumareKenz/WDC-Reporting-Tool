import apiClient, { downloadFile } from './client';
import { API_ENDPOINTS } from '../utils/constants';

/** Director/system: create an audit anchor (cryptographic checkpoint). */
export const createAnchor = () =>
  apiClient.post(API_ENDPOINTS.AUDIT_ANCHOR);

/** Director/system: list audit anchors. Query: ?limit=50 */
export const getAnchors = (limit = 50) =>
  apiClient.get(`${API_ENDPOINTS.AUDIT_ANCHORS}?limit=${limit}`);

/** Director/system: download the full audit log as CSV. */
export const exportAuditCSV = (filename = 'audit-export.csv') =>
  downloadFile(API_ENDPOINTS.AUDIT_EXPORT, filename);
