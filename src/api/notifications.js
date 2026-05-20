/**
 * Notifications — backed by the /messages/deliveries API.
 * Re-exported from messages.js for backward compat with existing imports.
 */
export {
  getDeliveries as getNotifications,
  markDeliveryRead as markNotificationRead,
  broadcast as sendNotification,
} from './messages';
