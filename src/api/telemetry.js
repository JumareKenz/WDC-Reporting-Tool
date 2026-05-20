import apiClient from './client';
import { API_ENDPOINTS } from '../utils/constants';

/**
 * Send a telemetry event to the backend.
 * Note: the endpoint uses a doubled /api/v1 prefix due to a backend bug;
 * `API_ENDPOINTS.TELEMETRY` accounts for this.
 *
 * @param {'error'|'warn'|'debug'|'info'} level
 * @param {string} message
 * @param {object} [metadata]
 */
export const sendTelemetry = (level, message, metadata = {}) =>
  apiClient.post(API_ENDPOINTS.TELEMETRY, { level, message, metadata }).catch(() => {
    // Best-effort — never throw from telemetry
  });
