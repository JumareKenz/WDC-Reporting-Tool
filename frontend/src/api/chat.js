/**
 * Chat API Client
 * Interfaces with backend AI chat endpoints (Groq-powered)
 */

import apiClient, { buildQueryString } from './client';
import { API_ENDPOINTS } from '../utils/constants';

// ==================== Session Management ====================

/**
 * Get all chat sessions for current user
 * GET /api/chat/sessions
 */
export const getChatSessions = async () => {
  const response = await apiClient.get(API_ENDPOINTS.CHAT_SESSIONS);
  return response;
};

/**
 * Create a new chat session
 * POST /api/chat/sessions
 */
export const createChatSession = async (title = null) => {
  const response = await apiClient.post(API_ENDPOINTS.CHAT_SESSIONS, { title });
  return response;
};

/**
 * Delete a chat session
 * DELETE /api/chat/sessions/{id}
 */
export const deleteChatSession = async (sessionId) => {
  const response = await apiClient.delete(`${API_ENDPOINTS.CHAT_SESSIONS}/${sessionId}`);
  return response;
};

// ==================== Message Management ====================

/**
 * Get chat message history for a session
 * GET /api/chat/sessions/{id}/messages
 */
export const getChatHistory = async (sessionId, limit = 50, offset = 0) => {
  const queryString = buildQueryString({ limit, offset });
  const response = await apiClient.get(`${API_ENDPOINTS.CHAT_HISTORY(sessionId)}${queryString}`);
  return response;
};

/**
 * Send a message and get AI response
 * POST /api/chat/message
 */
export const sendMessage = async (message, sessionId = null) => {
  const payload = { message };
  if (sessionId) {
    payload.session_id = sessionId;
  }
  // Longer timeout for AI processing (NLQ-to-SQL + Groq inference)
  const response = await apiClient.post(API_ENDPOINTS.CHAT_SEND, payload, { timeout: 60000 });
  return response;
};

// ==================== Cleanup ====================

/**
 * Clear all chat history for current user
 * DELETE /api/chat/history
 */
export const clearAllChatHistory = async () => {
  const response = await apiClient.delete(API_ENDPOINTS.CHAT_CLEAR);
  return response;
};
