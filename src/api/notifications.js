import apiClient, { buildQueryString } from './client';
import { API_ENDPOINTS } from '../utils/constants';

// Notifications are exposed via the messages/deliveries API on the backend.
// Mapping:
//   - getNotifications     -> GET /messages/deliveries
//   - markNotificationRead -> POST /messages/deliveries/:id/read
//   - markAllRead          -> client-side loop over unread deliveries
//   - sendNotification     -> POST /messages/broadcast (director only)

export const getNotifications = async (params = {}) => {
  const queryString = buildQueryString(params);
  const response = await apiClient.get(`${API_ENDPOINTS.MESSAGE_DELIVERIES}${queryString}`);
  const list = Array.isArray(response) ? response : response?.deliveries || response?.items || [];
  return { notifications: list, total: list.length };
};

export const markNotificationRead = async (notificationId) =>
  apiClient.post(API_ENDPOINTS.MESSAGE_DELIVERY_READ(notificationId));

export const markAllNotificationsRead = async () => {
  const { notifications } = await getNotifications({ unread: true });
  await Promise.all(
    notifications
      .filter((n) => !n.readAt && !n.read_at)
      .map((n) => markNotificationRead(n.id).catch(() => null))
  );
  return { ok: true, count: notifications.length };
};

export const sendNotification = async (data) =>
  apiClient.post(API_ENDPOINTS.MESSAGES_BROADCAST, data);
