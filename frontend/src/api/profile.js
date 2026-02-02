import apiClient from './client';

/**
 * Get current user profile
 */
export const getProfile = async () => {
  const response = await apiClient.get('/profile/me');
  return response;
};

/**
 * Update user profile (full_name, phone)
 */
export const updateProfile = async (data) => {
  const response = await apiClient.patch('/profile/me', data);
  return response;
};

/**
 * Update user email (STATE_OFFICIAL only)
 */
export const updateEmail = async (email) => {
  const response = await apiClient.patch('/profile/email', { email });
  return response;
};

/**
 * Change user password
 */
export const changePassword = async (currentPassword, newPassword) => {
  const response = await apiClient.post('/profile/change-password', {
    current_password: currentPassword,
    new_password: newPassword,
  });
  return response;
};
