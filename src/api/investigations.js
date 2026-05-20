import apiClient, { buildQueryString } from './client';
import { API_ENDPOINTS } from '../utils/constants';

/** Director: create a new investigation. */
export const createInvestigation = (data) =>
  apiClient.post(API_ENDPOINTS.INVESTIGATIONS, data);

/** List investigations. Query: ?cursor=&limit= */
export const getInvestigations = (params = {}) =>
  apiClient.get(API_ENDPOINTS.INVESTIGATIONS + buildQueryString(params));

/** Get a single investigation + its evidence. */
export const getInvestigation = (id) =>
  apiClient.get(API_ENDPOINTS.INVESTIGATION_BY_ID(id));

/** Director: update investigation metadata or status. */
export const updateInvestigation = (id, data) =>
  apiClient.patch(API_ENDPOINTS.INVESTIGATION_BY_ID(id), data);

/** Director: close an investigation. */
export const closeInvestigation = (id) =>
  apiClient.post(API_ENDPOINTS.INVESTIGATION_CLOSE(id));

/** Director: reopen a closed investigation. */
export const reopenInvestigation = (id) =>
  apiClient.post(API_ENDPOINTS.INVESTIGATION_REOPEN(id));

/** Director: add evidence to an investigation. */
export const addEvidence = (id, data) =>
  apiClient.post(API_ENDPOINTS.INVESTIGATION_EVIDENCE(id), data);

/** Director: remove a piece of evidence. */
export const removeEvidence = (id, evidenceId) =>
  apiClient.delete(API_ENDPOINTS.INVESTIGATION_EVIDENCE_DEL(id, evidenceId));

/** Get the activity timeline for an investigation. */
export const getInvestigationTimeline = (id) =>
  apiClient.get(API_ENDPOINTS.INVESTIGATION_TIMELINE(id));
