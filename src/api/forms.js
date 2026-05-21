import apiClient, { buildQueryString } from './client';
import { API_ENDPOINTS } from '../utils/constants';

export const getVisibleForms = async () => apiClient.get(API_ENDPOINTS.FORMS_VISIBLE);

// Legacy name — kept so older callers still resolve. /forms/visible is the
// caller-scoped equivalent of "the form the caller can fill right now".
export const getActiveForm = async () => {
  const visible = await getVisibleForms();
  const list = Array.isArray(visible) ? visible : visible?.forms || [];
  return list[0] || null;
};

export const getForms = async (params = {}) => {
  const queryString = buildQueryString(params);
  return apiClient.get(`${API_ENDPOINTS.FORMS}${queryString}`);
};

export const getForm = async (formId) => apiClient.get(API_ENDPOINTS.FORM_BY_ID(formId));

export const createForm = async (data) => apiClient.post(API_ENDPOINTS.FORMS, data);

export const updateForm = async (formId, data) =>
  apiClient.patch(API_ENDPOINTS.FORM_BY_ID(formId), data);

export const deployForm = async (formId) =>
  apiClient.post(API_ENDPOINTS.FORM_DEPLOY(formId));

export const archiveForm = async (formId) =>
  apiClient.post(API_ENDPOINTS.FORM_ARCHIVE(formId));

export const listFormVersions = async (formId) =>
  apiClient.get(API_ENDPOINTS.FORM_VERSIONS(formId));

export const getFormVersion = async (formId, n) =>
  apiClient.get(API_ENDPOINTS.FORM_VERSION_BY_N(formId, n));

export const createFormVersion = async (formId, data) =>
  apiClient.post(API_ENDPOINTS.FORM_VERSIONS(formId), data);
