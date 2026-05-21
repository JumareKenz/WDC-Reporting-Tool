import apiClient, { buildQueryString } from './client';

/**
 * Threaded Messaging API — backend v1 threaded conversations.
 * All endpoints are /messages/* and require JWT auth.
 *
 * Permission matrix (server-enforced):
 * - Secretary → own-LGA coordinator, director
 * - Coordinator → secretaries in own LGA, director
 * - Director → anyone
 *
 * Cross-boundary messages return 403.
 */

/**
 * Compose a new message or reply in a thread.
 * POST /messages
 * Body:
 *   New conversation: { recipientId, body, subject? }
 *   Reply: { conversationId, body, parentMessageId? }
 */
export const sendMessage = async (data) =>
  apiClient.post('/messages', data);

/**
 * List caller's conversations (inbox).
 * GET /messages/conversations?state=all|unread&limit=20&offset=0
 */
export const getConversations = async (params = {}) => {
  const queryString = buildQueryString(params);
  return apiClient.get(`/messages/conversations${queryString}`);
};

/**
 * Get all messages in a conversation.
 * GET /messages/conversations/:id/messages?limit=50&offset=0
 */
export const getConversationMessages = async (conversationId, params = {}) => {
  const queryString = buildQueryString(params);
  return apiClient.get(`/messages/conversations/${conversationId}/messages${queryString}`);
};

/**
 * Mark all unread messages in a conversation as read.
 * POST /messages/conversations/:id/read
 */
export const markConversationRead = async (conversationId) =>
  apiClient.post(`/messages/conversations/${conversationId}/read`);

// ───────────────────────────────────────────────────────────────────────────
// Legacy broadcast endpoints (preserved for backwards compat)
// ───────────────────────────────────────────────────────────────────────────

/**
 * Broadcast a message to all users matching a scope (director only).
 * POST /messages/broadcast
 * Body: { body, scope, lgaId?, wardId? }
 */
export const broadcastMessage = async (data) =>
  apiClient.post('/messages/broadcast', data);

/**
 * List deliveries for the caller (legacy inbox for broadcasts).
 * GET /messages/deliveries?state=all|unread&limit=20&offset=0
 */
export const getDeliveries = async (params = {}) => {
  const queryString = buildQueryString(params);
  return apiClient.get(`/messages/deliveries${queryString}`);
};

/**
 * Mark a single delivery as read.
 * POST /messages/deliveries/:id/read
 */
export const markDeliveryRead = async (deliveryId) =>
  apiClient.post(`/messages/deliveries/${deliveryId}/read`);
