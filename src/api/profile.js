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

// Change the calling user's password (console accounts).
export const changePassword = async (currentPassword, newPassword) => {
  return apiClient.post(API_ENDPOINTS.SET_CREDENTIALS, {
    currentPassword,
    newPassword,
  });
};

// Change the calling user's PIN (secretary accounts).
export const changePin = async (currentPin, newPin) => {
  return apiClient.post(API_ENDPOINTS.SET_CREDENTIALS, {
    currentPin,
    newPin,
  });
};
