import apiClient, { buildQueryString } from './client';
import { API_ENDPOINTS } from '../utils/constants';

/** Director: create a new form. */
export const createForm = (data) =>
  apiClient.post(API_ENDPOINTS.FORMS, data);

/** List all forms (RLS-scoped). */
export const getForms = () =>
  apiClient.get(API_ENDPOINTS.FORMS);

/** List forms the authenticated user can fill. */
export const getVisibleForms = () =>
  apiClient.get(API_ENDPOINTS.FORMS_VISIBLE);

/** Get a single form by ID. */
export const getForm = (id) =>
  apiClient.get(API_ENDPOINTS.FORM_BY_ID(id));

/** Director: update a form's metadata. */
export const updateForm = (id, data) =>
  apiClient.patch(API_ENDPOINTS.FORM_BY_ID(id), data);

/** Director: deploy the latest version of a form. */
export const deployForm = (id) =>
  apiClient.post(API_ENDPOINTS.FORM_DEPLOY(id));

/** Director: archive a form. */
export const archiveForm = (id) =>
  apiClient.post(API_ENDPOINTS.FORM_ARCHIVE(id));

/** Director: create a new version with a schema. */
export const createFormVersion = (id, schema) =>
  apiClient.post(API_ENDPOINTS.FORM_VERSIONS(id), { schema });

/** List all versions of a form. */
export const getFormVersions = (id) =>
  apiClient.get(API_ENDPOINTS.FORM_VERSIONS(id));

/** Get a specific version N of a form. */
export const getFormVersion = (id, n) =>
  apiClient.get(API_ENDPOINTS.FORM_VERSION_BY_N(id, n));
