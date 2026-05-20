import apiClient, { buildQueryString } from './client';
import { API_ENDPOINTS } from '../utils/constants';

/**
 * Director: ask an AI question about the reports data.
 * @param {string} question
 * @param {number} [limit=3] - Number of sources to return
 * @returns {{ answer, sources: Array<{ type, snippet }>, cached? }}
 */
export const askAI = (question, limit = 3) =>
  apiClient.post(
    API_ENDPOINTS.AI_ASK + buildQueryString({ limit }),
    { question }
  );
