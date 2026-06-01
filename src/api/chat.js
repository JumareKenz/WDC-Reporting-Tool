/**
 * Chat API Client
 *
 * Backend AI (HIVA) endpoints:
 *   - POST /ai/query        — synchronous JSON: { answer, sql, rowCount, sources, conversationId }
 *   - GET  /ai/conversations — list: { conversations: [{ id, preview, createdAt, turnCount }] }
 *   - POST /ai/ask          — SSE streaming (NOT used here)
 *
 * There is NO per-conversation history endpoint — history lives in Redis (24h)
 * and is reachable only by replaying `conversationId` into /ai/query. We keep an
 * in-memory session cache so the existing sidebar UI keeps working within a load.
 */

import apiClient, { buildQueryString } from './client';
import { API_ENDPOINTS } from '../utils/constants';

const sessions = new Map(); // conversationId -> { id, title, messages: [{ role, content, createdAt }] }

const newSessionId = () =>
  (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : `sess_${Date.now()}_${Math.random().toString(36).slice(2)}`;

const ensureSession = (sessionId, title = null) => {
  let s = sessions.get(sessionId);
  if (!s) {
    const id = sessionId || newSessionId();
    s = { id, title: title || 'New chat', messages: [], createdAt: new Date().toISOString() };
    sessions.set(id, s);
  }
  return s;
};

export const getChatSessions = async () => {
  // Merge backend conversation list with any in-memory sessions started this load.
  let remote = [];
  try {
    const res = await apiClient.get(
      API_ENDPOINTS.AI_CONVERSATIONS + buildQueryString({ limit: 20 })
    );
    const list = res?.conversations || res?.data?.conversations || [];
    remote = list.map((c) => ({
      id: c.id,
      title: c.preview || 'Conversation',
      created_at: c.createdAt,
      turnCount: c.turnCount,
    }));
  } catch {
    // Backend list unavailable — fall back to in-memory only.
  }
  const local = Array.from(sessions.values());
  const byId = new Map();
  for (const s of [...remote, ...local]) byId.set(s.id, { ...byId.get(s.id), ...s });
  return { sessions: Array.from(byId.values()) };
};

export const createChatSession = async (title = null) => {
  const id = newSessionId();
  return ensureSession(id, title);
};

export const deleteChatSession = async (sessionId) => {
  sessions.delete(sessionId);
  return { ok: true };
};

export const getChatHistory = async (sessionId, _limit = 50, _offset = 0) => {
  const s = sessions.get(sessionId);
  // No backend history endpoint: only in-memory turns from this load are available.
  if (!s) return { messages: [], unavailable: true };
  return { messages: s.messages || [] };
};

export const sendMessage = async (message, conversationId = null) => {
  const s = ensureSession(conversationId);
  s.messages.push({ role: 'user', content: message, createdAt: new Date().toISOString() });

  const response = await apiClient.post(
    API_ENDPOINTS.AI_QUERY,
    { question: message, ...(conversationId ? { conversationId } : {}) },
    { timeout: 60000 }
  );

  // /ai/query → { answer, sql, rowCount, sources, conversationId }
  const answer = response?.answer || response?.message || response?.content || '';
  const returnedId = response?.conversationId || s.id;

  // Re-key the in-memory session to the backend conversationId if it differs.
  if (returnedId && returnedId !== s.id) {
    sessions.delete(s.id);
    s.id = returnedId;
    sessions.set(returnedId, s);
  }
  s.messages.push({ role: 'assistant', content: answer, createdAt: new Date().toISOString() });

  return { conversationId: returnedId, sessionId: returnedId, message: answer, answer, raw: response };
};

export const clearAllChatHistory = async () => {
  sessions.clear();
  return { ok: true };
};
