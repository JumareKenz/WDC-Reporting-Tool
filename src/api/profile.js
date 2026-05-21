import apiClient from './client';
import { API_ENDPOINTS, STORAGE_KEYS } from '../utils/constants';

/**
 * Profile API
 *
 * Backend exposes no /profile namespace. User identity lives in the JWT
 * (sub, role, lgaId, wardId, mustChangePin) and credential changes route
 * through POST /auth/set-credentials.
 *
 * The legacy helpers below preserve their old signatures so the existing
 * SettingsPage keeps working, but they now talk to real endpoints.
 */

// Reconstruct a profile object from the in-memory user (stored at login by
// useAuth). No round-trip — the backend has nothing more to give us here.
export const getProfile = async () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USER_DATA);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

// Editable profile fields (full_name, phone) are not exposed on the backend
// for self-service. Surface this clearly instead of silently 404ing.
export const updateProfile = async (_data) => {
  const err = new Error('Profile edits are managed centrally — contact your LGA coordinator or state office to update your name or phone number.');
  err.status = 405;
  err.code = 'PROFILE_EDIT_NOT_SUPPORTED';
  throw err;
};

export const updateEmail = async (_email) => {
  const err = new Error('Email changes are managed centrally — contact the state office to update your email.');
  err.status = 405;
  err.code = 'EMAIL_EDIT_NOT_SUPPORTED';
  throw err;
};

// Console password changes have no dedicated endpoint. Initial credentials
// are set via POST /auth/enrol with a one-time enrolment token. Surface a
// clear message instead of pretending to hit a non-existent route.
export const changePassword = async (_currentPassword, _newPassword) => {
  const err = new Error('Password changes for console accounts must be requested from the state office (no self-service endpoint).');
  err.status = 405;
  err.code = 'PASSWORD_CHANGE_NOT_SUPPORTED';
  throw err;
};

/**
 * Change a secretary PIN.
 *
 * Backend contract (POST /auth/set-credentials):
 *   - First-time set (JWT carries mustChangePin: true):  { pin }
 *   - Voluntary change after first-time is done:         { currentPin, pin }
 *   - `pin` must be exactly 4 digits and cannot be "1234"
 *
 * Pass `null`/empty `currentPin` for the first-time path.
 */
export const changePin = async (currentPin, newPin) => {
  const body = currentPin ? { currentPin, pin: newPin } : { pin: newPin };
  return apiClient.post(API_ENDPOINTS.SET_CREDENTIALS, body);
};
