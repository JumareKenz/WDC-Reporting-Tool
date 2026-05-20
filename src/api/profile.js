/**
 * Profile — reads/updates the current user's record via the users API.
 * The user's ID comes from the JWT sub claim (exposed in AuthContext as user.id).
 */
import apiClient from './client';
import { API_ENDPOINTS } from '../utils/constants';

/** Get the current user's full profile. Pass userId from useAuth().user.id */
export const getProfile = (userId) =>
  apiClient.get(API_ENDPOINTS.USER_BY_ID(userId));

/** Director: reassign themselves or update assignment. Coordinators/secretaries cannot self-assign. */
export const updateAssignment = (userId, data) =>
  apiClient.patch(API_ENDPOINTS.USER_ASSIGNMENT(userId), data);
