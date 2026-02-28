import apiClient, { buildQueryString } from './client';
import { API_ENDPOINTS } from '../utils/constants';

export const getActiveForm = async () => {
  return apiClient.get(API_ENDPOINTS.FORMS_ACTIVE);
};

export const getForms = async (params = {}) => {
  const queryString = buildQueryString(params);
  return apiClient.get(`${API_ENDPOINTS.FORMS}${queryString}`);
};

export const getForm = async (formId) => {
  return apiClient.get(API_ENDPOINTS.FORM_BY_ID(formId));
};

export const createForm = async (data) => {
  return apiClient.post(API_ENDPOINTS.FORMS, data);
};

export const updateForm = async (formId, data) => {
  return apiClient.put(API_ENDPOINTS.FORM_BY_ID(formId), data);
};

export const deployForm = async (formId) => {
  return apiClient.post(API_ENDPOINTS.FORM_DEPLOY(formId));
};
