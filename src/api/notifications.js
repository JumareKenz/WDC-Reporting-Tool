import apiClient, { buildQueryString } from './client';
import { API_ENDPOINTS } from '../utils/constants';

/**
 * Get notifications for current user
 * @param {Object} params - Query parameters (unread_only, limit, offset)
 * @returns {Promise} Response with notifications array
 */
export const getNotifications = async (params = {}) => {
  const queryString = buildQueryString(params);
  return apiClient.get(`${API_ENDPOINTS.NOTIFICATIONS}${queryString}`);
};

/**
 * Mark notification as read
 * @param {number} notificationId - Notification ID
 * @returns {Promise} Response
 */
export const markNotificationRead = async (notificationId) => {
  return apiClient.patch(API_ENDPOINTS.NOTIFICATION_READ(notificationId));
};

/**
 * Mark all notifications as read
 * @returns {Promise} Response
 */
export const markAllNotificationsRead = async () => {
  return apiClient.post(API_ENDPOINTS.NOTIFICATIONS_MARK_ALL_READ);
};

/**
 * Send notification to specific users (LGA Coordinator/State Official)
 * @param {Object} data - Notification data
 * @returns {Promise} Response
 */
export const sendNotification = async (data) => {
  return apiClient.post(API_ENDPOINTS.NOTIFICATIONS_SEND, data);
};
