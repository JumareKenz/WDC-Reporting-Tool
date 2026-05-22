import apiClient from './client';
import { API_ENDPOINTS } from '../utils/constants';
import { getReports } from './reports';

// Backend has no dedicated /analytics/* routes yet. We compute lightweight
// aggregates client-side from /reports (RLS-scoped) so the state dashboard
// can still render. Heavier analytics (AI report generation, monthly report,
// service-delivery breakdowns) gracefully degrade to empty results so the UI
// shows "no data" instead of crashing.

const ZERO_OVERVIEW = {
  totalReports: 0,
  submitted: 0,
  inReview: 0,
  approved: 0,
  returned: 0,
  byMonth: [],
};

const summarize = (list) => {
  const arr = Array.isArray(list) ? list : list?.reports || [];
  const overview = { ...ZERO_OVERVIEW, totalReports: arr.length };
  for (const r of arr) {
    const state = r.state || r.status;
    if (state === 'submitted') overview.submitted++;
    else if (state === 'in_review') overview.inReview++;
    else if (state === 'approved' || state === 'sealed') overview.approved++;
    else if (state === 'returned') overview.returned++;
  }
  return overview;
};

export const getOverview = async (params = {}) => {
  try {
    const list = await getReports(params);
    console.log('[Analytics] getReports returned:', list);
    const summary = summarize(list);
    console.log('[Analytics] Overview summary:', summary);
    return summary;
  } catch (error) {
    console.error('[Analytics] getOverview failed:', error.message);
    return ZERO_OVERVIEW;
  }
};

export const getLGAComparison = async () => {
  try {
    const list = await getReports();
    console.log('[Analytics] getLGAComparison - raw reports:', list);
    const arr = Array.isArray(list) ? list : list?.reports || [];
    console.log('[Analytics] getLGAComparison - report count:', arr.length);
    const byLga = new Map();
    for (const r of arr) {
      const lgaId = r.lgaId || r.lga_id || r.lga?.id;
      if (!lgaId) continue;
      if (!byLga.has(lgaId)) byLga.set(lgaId, { lgaId, total: 0, approved: 0 });
      const row = byLga.get(lgaId);
      row.total++;
      if (r.state === 'approved' || r.state === 'sealed') row.approved++;
    }
    const result = Array.from(byLga.values());
    console.log('[Analytics] getLGAComparison - LGA summary:', result);
    return result;
  } catch (error) {
    console.error('[Analytics] getLGAComparison failed:', error.message);
    return [];
  }
};

export const getTrends = async () => [];
export const generateAIReport = async () => ({ report: '', status: 'unsupported' });
export const getServiceDelivery = async () => [];
export const generateMonthlyReport = async () => ({ report: '', status: 'unsupported' });

export const getLGAs = async () => apiClient.get(API_ENDPOINTS.LGAS);

export const getStateSubmissions = async (params = {}) => {
  const list = await getReports({ state: 'submitted', ...params });
  const arr = Array.isArray(list) ? list : list?.reports || [];
  return { submissions: arr, total: arr.length };
};
