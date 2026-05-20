import apiClient, { buildQueryString } from './client';
import { API_ENDPOINTS } from '../utils/constants';

/**
 * Director: broadcast a message to a scoped audience.
 * @param {{ body, channels, scopeKind, scopeIds?, urgent? }} data
 */
export const broadcast = (data) =>
  apiClient.post(API_ENDPOINTS.MESSAGES_BROADCAST, data);

/** List message deliveries for the current user. Query: ?cursor=&limit= */
export const getDeliveries = (params = {}) =>
  apiClient.get(API_ENDPOINTS.MESSAGE_DELIVERIES + buildQueryString(params));

/** Get a single delivery by ID. */
export const getDelivery = (id) =>
  apiClient.get(API_ENDPOINTS.MESSAGE_DELIVERY_BY_ID(id));

/** Mark a delivery as read (204). */
export const markDeliveryRead = (id) =>
  apiClient.post(API_ENDPOINTS.MESSAGE_DELIVERY_READ(id));
