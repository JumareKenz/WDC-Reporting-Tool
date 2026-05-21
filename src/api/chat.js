/**
 * Chat API Client
 *
 * Backend exposes only POST /ai/ask (director role). There is no session
 * persistence — each call is stateless. We keep an in-memory session cache so
 * the existing UI (which expects sessions + history) keeps working.
 */

import apiClient from './client';
import { API_ENDPOINTS } from '../utils/constants';

const sessions = new Map(); // sessionId -> { id, title, messages: [{ role, content, createdAt }] }

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

export const getChatSessions = async () => ({ sessions: Array.from(sessions.values()) });

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
  return { messages: s?.messages || [] };
};

export const sendMessage = async (message, sessionId = null) => {
  const s = ensureSession(sessionId);
  s.messages.push({ role: 'user', content: message, createdAt: new Date().toISOString() });
  const response = await apiClient.post(
    API_ENDPOINTS.AI_ASK,
    { question: message, sessionId: s.id },
    { timeout: 60000 }
  );
  const answer = response?.answer || response?.message || response?.content || '';
  s.messages.push({ role: 'assistant', content: answer, createdAt: new Date().toISOString() });
  return { sessionId: s.id, message: answer, raw: response };
};

export const clearAllChatHistory = async () => {
  sessions.clear();
  return { ok: true };
};
