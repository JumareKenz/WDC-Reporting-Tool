import apiClient, { buildQueryString } from './client';
import { API_ENDPOINTS } from '../utils/constants';

/** Director: create a user. Returns user + enrolmentToken. */
export const createUser = (data) =>
  apiClient.post(API_ENDPOINTS.USERS, data);

/** List users (RLS-scoped). Query: ?role=&lgaId=&wardId=&cursor=&limit= */
export const getUsers = (params = {}) =>
  apiClient.get(API_ENDPOINTS.USERS + buildQueryString(params));

/** Get a single user by ID. */
export const getUserById = (id) =>
  apiClient.get(API_ENDPOINTS.USER_BY_ID(id));

/** Director: reassign a user to a different LGA / ward. */
export const reassignUser = (id, data) =>
  apiClient.patch(API_ENDPOINTS.USER_ASSIGNMENT(id), data);

/** Director: suspend a user. */
export const suspendUser = (id) =>
  apiClient.post(API_ENDPOINTS.USER_SUSPEND(id));

/** Director: reactivate a suspended user. */
export const reactivateUser = (id) =>
  apiClient.post(API_ENDPOINTS.USER_REACTIVATE(id));

/** Director: soft-delete a user (204). */
export const deleteUser = (id) =>
  apiClient.delete(API_ENDPOINTS.USER_BY_ID(id));
