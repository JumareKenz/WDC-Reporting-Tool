/**
 * Analytics — derived from reports data via the AI endpoint and reports queries.
 *
 * The new backend has no dedicated analytics endpoints. Director analytics come from:
 *   - POST /ai/ask  — ask AI questions about reports data
 *   - GET /reports  — filter/aggregate client-side or via AI
 *
 * The functions below delegate to the appropriate endpoints.
 */
import apiClient, { buildQueryString } from './client';
import { API_ENDPOINTS } from '../utils/constants';
import { askAI } from './ai';

/** Ask the AI for an analytics overview summary. */
export const getOverview = (params = {}) =>
  askAI(`Give me a state-wide overview of WDC report submissions${params.month ? ` for ${params.month}` : ''}.`);

/** Ask the AI for LGA comparison. */
export const getLGAComparison = (params = {}) =>
  askAI(`Compare submission rates across all LGAs${params.month ? ` for ${params.month}` : ''}.`);

/** Ask the AI for submission trends. */
export const getTrends = (params = {}) =>
  askAI(`Show submission trends over time${params.months ? ` for the last ${params.months} months` : ''}.`);

/** Ask the AI for a custom report based on a question. */
export const generateAIReport = ({ question }) =>
  askAI(question || 'Summarize the overall performance of WDC secretaries.');

/** Get all reports for state-level view (RLS-scoped as director). */
export const getStateSubmissions = (params = {}) =>
  apiClient.get(API_ENDPOINTS.REPORTS + buildQueryString(params));

/** Get users (RLS-scoped as director — sees all). */
export const getLGAUsers = (params = {}) =>
  apiClient.get(API_ENDPOINTS.USERS + buildQueryString(params));
