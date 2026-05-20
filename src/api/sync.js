import apiClient from './client';
import { API_ENDPOINTS } from '../utils/constants';

/**
 * Offline-first batch sync. Replays queued operations to the server.
 *
 * @param {{
 *   idempotencyKey: string,
 *   ops: Array<{ reportId, opKind, payload, opId?, wallClockTs?, deviceId? }>,
 *   sinceCursor?: string
 * }} body
 */
export const syncBatch = (body) =>
  apiClient.post(API_ENDPOINTS.SYNC_BATCH, body);
