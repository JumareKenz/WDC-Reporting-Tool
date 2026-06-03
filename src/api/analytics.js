import apiClient, { buildQueryString } from './client';
import { API_ENDPOINTS } from '../utils/constants';
import { getReports } from './reports';

// Normalize any month-ish value to "YYYY-MM".
const normalizeMonth = (m) => {
  if (!m) return null;
  const s = String(m).trim();
  const ym = s.match(/(\d{4})-(\d{1,2})/);
  if (ym) return `${ym[1]}-${ym[2].padStart(2, '0')}`;
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  return s;
};

// Convert a "YYYY-MM" month into the backend's { startDate, endDate } range
// (first and last calendar day). Returns null for a missing/invalid month, in
// which case callers omit the params and the backend returns all-time stats.
const monthToRange = (month) => {
  if (!month) return null;
  const m = String(month).match(/(\d{4})-(\d{1,2})/);
  if (!m) return null;
  const year = Number(m[1]);
  const mon = Number(m[2]);
  const mm = String(mon).padStart(2, '0');
  const lastDay = new Date(year, mon, 0).getDate(); // day 0 of next month = last day of this month
  return { startDate: `${m[1]}-${mm}-01`, endDate: `${m[1]}-${mm}-${String(lastDay).padStart(2, '0')}` };
};

// Flatten canonical.fields op-log entries onto the report object so callers
// can read report_month, health_bcg, meetings_held, etc. directly.
const flattenReport = (r) => {
  const cf = r?.canonical?.fields;
  if (!cf || typeof cf !== 'object') return r;
  const flat = {};
  for (const [key, entry] of Object.entries(cf)) {
    flat[key] = entry?.value ?? entry;
  }
  return { ...r, ...flat };
};

// Sum a numeric field across an array of flattened reports.
const sumField = (reports, field) =>
  reports.reduce((acc, r) => acc + (Number(r[field]) || 0), 0);

// Total meeting attendance for a report. The stored `attendance_total` is often
// absent/zero, so derive Total = Male + Female when it is not a positive number.
const attendanceTotalOf = (r) => {
  const stored = Number(r.attendance_total) || 0;
  if (stored > 0) return stored;
  return (Number(r.attendance_male) || 0) + (Number(r.attendance_female) || 0);
};

// Collapse duplicate reports to one per (wardId, reportMonth), keeping the most
// recently submitted. Guards the UI/counts against duplicate submissions until
// the backend enforces a uniqueness constraint (see api/reports.js).
const dedupeByWardMonth = (reports) => {
  const latest = new Map();
  for (const r of reports) {
    const key = `${r.wardId}::${normalizeMonth(r.report_month)}`;
    const ts = new Date(r.submittedAt || r.submitted_at || r.createdAt || 0).getTime() || 0;
    const prev = latest.get(key);
    if (!prev || ts >= prev.ts) latest.set(key, { r, ts });
  }
  return [...latest.values()].map((x) => x.r);
};

// ---------------------------------------------------------------------------
// Ward–LGA index: { wardId → { lgaId, lgaName, wardName, wardCode } }
//
// The /reports list gives wardId but not lgaId/lga_name/ward_name. We build
// this index once by calling /lgas (all LGAs) + /lgas/:id/wards in parallel,
// then cache for 5 minutes to avoid redundant calls across concurrent hooks.
// Used by getStateSubmissions and the LGA drill-down in getLGAComparison.
// ---------------------------------------------------------------------------
let _wardIndexPromise = null;
let _wardIndexData = null;
let _wardIndexExpiry = 0;
const WARD_INDEX_TTL = 5 * 60 * 1000;

const fetchWardIndex = async () => {
  const lgaRes = await apiClient.get(API_ENDPOINTS.LGAS);
  const lgas = Array.isArray(lgaRes)
    ? lgaRes
    : lgaRes?.lgas || lgaRes?.data?.lgas || [];

  const wardResults = await Promise.all(
    lgas.map(async (lga) => {
      try {
        const res = await apiClient.get(API_ENDPOINTS.LGA_WARDS(lga.id));
        const wards = Array.isArray(res) ? res : res?.wards || res?.data?.wards || [];
        return { lga, wards };
      } catch {
        return { lga, wards: [] };
      }
    })
  );

  const index = {};
  for (const { lga, wards } of wardResults) {
    for (const w of wards) {
      if (!w?.id) continue;
      index[w.id] = {
        lgaId: lga.id,
        lgaName: lga.name,
        wardName: w.name,
        wardCode: w.code || w.ward_code || '',
      };
    }
  }

  return { index, lgas, wardResults };
};

const buildWardLgaIndex = async () => {
  if (_wardIndexData && Date.now() < _wardIndexExpiry) return _wardIndexData;
  if (_wardIndexPromise) return _wardIndexPromise;

  _wardIndexPromise = fetchWardIndex()
    .then((data) => {
      _wardIndexData = data;
      _wardIndexExpiry = Date.now() + WARD_INDEX_TTL;
      _wardIndexPromise = null;
      return data;
    })
    .catch((err) => {
      _wardIndexPromise = null;
      console.error('[Analytics] buildWardLgaIndex failed:', err.message);
      return { index: {}, lgas: [], wardResults: [] };
    });

  return _wardIndexPromise;
};

// ---------------------------------------------------------------------------
// Response normalizers — backend returns camelCase; dashboard reads snake_case
// ---------------------------------------------------------------------------

// Backend /analytics/overview (all-time, RLS-scoped, camelCase, { data } wrapped):
//   { totalReports, submittedReports, approvedReports, sealedReports,
//     returnedReports, avgSubmissionTime, approvalRate, totalLgas, activeLgas,
//     totalWards, activeWards }
// The dashboard is ward-coverage oriented ("X of Y wards submitted"), so
// submitted/missing/rate are ward-based (activeWards) — bounded 0–100% and
// coherent (submitted + missing = wards). reviewed = approvedReports (verified:
// approvedReports/submittedReports === approvalRate), flagged = returnedReports.
// snake_case fallbacks kept for resilience / client-side fallback shape.
const normalizeOverview = (raw) => {
  const d = raw?.data || raw || {};
  const totalWards = d.totalWards ?? d.total_wards ?? 0;
  const submittedWards = d.activeWards ?? d.active_wards ?? d.total_submitted ?? 0;
  const approved = d.approvedReports ?? d.total_reviewed ?? 0;
  const returned = d.returnedReports ?? d.total_flagged ?? 0;
  return {
    total_lgas: d.totalLgas ?? d.total_lgas ?? 0,
    total_wards: totalWards,
    total_submitted: submittedWards,
    total_reviewed: approved,
    total_flagged: returned,
    total_missing: Math.max(0, totalWards - submittedWards),
    submission_rate: totalWards > 0 ? Math.round((submittedWards / totalWards) * 100) : 0,
    // extras surfaced for richer widgets (Phase 2)
    total_reports: d.totalReports ?? 0,
    submitted_reports: d.submittedReports ?? 0,
    approval_rate: d.approvalRate ?? 0,
    active_lgas: d.activeLgas ?? 0,
    avg_submission_time: d.avgSubmissionTime ?? null,
  };
};

// Backend /analytics/lga-comparison item (camelCase, { data } wrapped):
//   { lgaId, lgaName, totalReports, submittedReports, approvedReports,
//     sealedReports, returnedReports, avgSubmissionTime, approvalRate,
//     activeWards, totalWards, lastReportAt }
// submitted/missing/rate are ward-based (activeWards) so the table stays
// coherent (Submitted + Missing = Wards). reviewed = approvedReports.
const normalizeLga = (item) => {
  const totalWards = item.totalWards ?? item.total_wards ?? item.wardCount ?? item.ward_count ?? 0;
  const submittedWards = item.activeWards ?? item.active_wards ?? item.submitted_count ?? 0;
  const approved = item.approvedReports ?? item.reviewed_count ?? 0;
  const returned = item.returnedReports ?? item.flagged_count ?? 0;
  return {
    id: item.lgaId ?? item.lga_id ?? item.id,
    lgaId: item.lgaId ?? item.lga_id ?? item.id,
    name: item.lgaName ?? item.lga_name ?? item.name ?? '',
    total_wards: totalWards,
    official_ward_count: totalWards,
    submitted_count: submittedWards,
    reviewed_count: approved,
    flagged_count: returned,
    missing_count: Math.max(0, totalWards - submittedWards),
    submission_rate: totalWards > 0 ? Math.round((submittedWards / totalWards) * 100) : 0,
    // extras surfaced for richer widgets (Phase 2)
    total_reports: item.totalReports ?? 0,
    submitted_reports: item.submittedReports ?? 0,
    approval_rate: item.approvalRate ?? 0,
    last_report_at: item.lastReportAt ?? null,
    reports: [],
  };
};

// /analytics/trends → TrendDataPointDto[]: { date, submitted, approved, returned }
// (camelCase, numeric; `date` is ISO truncated to granularity). We expose the
// three count series + a readable period label. `submission_rate` is derived
// only if a ward total is present (it isn't on this endpoint).
const normalizeTrend = (item) => {
  const submitted = item.submitted ?? item.submittedReports ?? item.submittedCount ?? item.count ?? 0;
  const approved = item.approved ?? item.approvedReports ?? 0;
  const returned = item.returned ?? item.returnedReports ?? 0;
  const totalWards = item.total_wards ?? item.totalWards ?? 0;

  // Period label from `date` (ISO, truncated to granularity).
  let label = item.month || item.label || item.period || item.bucket || '';
  const rawDate = item.date || item.periodStart || '';
  if (!label && rawDate) {
    const d = new Date(rawDate);
    label = Number.isNaN(d.getTime())
      ? String(rawDate)
      : d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  }

  let rate = item.submission_rate ?? item.submissionRate ?? item.rate ?? null;
  if (rate == null && totalWards > 0) rate = Math.round((submitted / totalWards) * 100);

  return { month: label, submitted, approved, returned, submission_rate: rate, total_wards: totalWards };
};

// /analytics/service-delivery → ServiceDeliveryMetricDto[]:
//   { category, totalReports, avgValue, minValue, maxValue }
// `category` is the user-defined form field_key (snake_case, e.g. anc_visits).
// Returns { metrics: [...] } or null when nothing usable.
const normalizeServiceDelivery = (raw) => {
  const d = raw?.data ?? raw;
  const arr = Array.isArray(d) ? d : (Array.isArray(raw) ? raw : null);
  if (!arr) return null;

  const num = (v) => (v === undefined || v === null ? null : Number(v));

  // The backend aggregates every numeric canonical field, which includes
  // identifiers and bookkeeping fields that are not service-delivery metrics
  // (e.g. lga_id, ward_id, report_month). Exclude those so the table shows only
  // meaningful indicators.
  const EXCLUDED = new Set(['lga_id', 'ward_id', 'id', 'report_month', 'form_version_id']);
  const isMetric = (cat) => cat && !EXCLUDED.has(cat) && !/(^|_)id$/i.test(cat);

  const metrics = arr
    .map((m) => ({
      category: m.category ?? m.field_key ?? m.fieldKey ?? '',
      total_reports: m.totalReports ?? m.total_reports ?? 0,
      avg_value: num(m.avgValue ?? m.avg_value),
      min_value: num(m.minValue ?? m.min_value),
      max_value: num(m.maxValue ?? m.max_value),
    }))
    .filter((m) => isMetric(m.category));

  return metrics.length ? { metrics } : null;
};

// ---------------------------------------------------------------------------
// Client-side fallback aggregators (used when backend endpoints fail or return
// empty data — shares logic with the primary implementations below)
// ---------------------------------------------------------------------------

const clientSideOverview = async (params, wardResults) => {
  const rawReports = await getReports();
  const all = (Array.isArray(rawReports) ? rawReports : rawReports?.reports || []).map(flattenReport);
  const month = params.month;
  const reports = month ? all.filter((r) => normalizeMonth(r.report_month) === month) : all;
  const totalWards = wardResults.reduce((s, { wards }) => s + wards.length, 0) || 255;

  const stats = { total_lgas: wardResults.length || 0, total_wards: totalWards, total_submitted: 0, total_reviewed: 0, total_flagged: 0, total_missing: 0, submission_rate: 0 };
  // Collapse duplicate ward+month submissions so coverage counts aren't inflated.
  const nonDraft = reports.filter((r) => { const st = r.state || r.status; return st && st !== 'draft'; });
  for (const r of dedupeByWardMonth(nonDraft)) {
    const st = r.state || r.status;
    stats.total_submitted++;
    if (st === 'approved' || st === 'sealed') stats.total_reviewed++;
    if (st === 'returned') stats.total_flagged++;
  }
  stats.total_missing = Math.max(0, totalWards - stats.total_submitted);
  stats.submission_rate = totalWards > 0 ? Math.round((stats.total_submitted / totalWards) * 100) : 0;
  return stats;
};

// ---------------------------------------------------------------------------
// getOverview — hit backend analytics, fall back to client-side
// ---------------------------------------------------------------------------
export const getOverview = async (params = {}) => {
  // When a specific month is selected, stats must reflect the reporting PERIOD
  // (report_month), not when reports were submitted. The backend /analytics/overview
  // filters by a submission-date range (startDate/endDate), so it would lump every
  // report submitted that month under that month regardless of the period it covers
  // (e.g. 8 reports submitted in June that actually cover Jan/Feb/May). Compute
  // client-side from report_month for correctness and consistency with
  // getLGAComparison / getStateSubmissions, which already filter by report_month.
  // See ESCALATION: backend should add a reportMonth filter to /analytics/overview.
  if (params.month) {
    try {
      const { wardResults } = await buildWardLgaIndex();
      return await clientSideOverview(params, wardResults);
    } catch (err) {
      console.error('[Analytics] getOverview (report_month) failed:', err.message);
      return { total_lgas: 0, total_wards: 0, total_submitted: 0, total_reviewed: 0, total_flagged: 0, total_missing: 0, submission_rate: 0 };
    }
  }

  // All-time (no month): use the live backend analytics endpoint, fall back to client-side.
  try {
    const raw = await apiClient.get(API_ENDPOINTS.ANALYTICS_OVERVIEW);
    const result = normalizeOverview(raw);
    // If analytics returned real data, use it
    if (result.total_lgas > 0 || result.total_wards > 0 || result.total_submitted > 0) {
      return result;
    }
    // Empty response — fall through to client-side
    throw new Error('analytics/overview returned no data');
  } catch {
    // Client-side fallback
    try {
      const { wardResults } = await buildWardLgaIndex();
      return clientSideOverview(params, wardResults);
    } catch (err) {
      console.error('[Analytics] getOverview fallback failed:', err.message);
      return { total_lgas: 0, total_wards: 0, total_submitted: 0, total_reviewed: 0, total_flagged: 0, total_missing: 0, submission_rate: 0 };
    }
  }
};

// ---------------------------------------------------------------------------
// getLGAComparison — analytics endpoint for stats + ward map for reports[]
// ---------------------------------------------------------------------------
export const getLGAComparison = async (params = {}) => {
  try {
    // lga-comparison accepts startDate/endDate + sortBy/order/limit.
    const range = monthToRange(params.month);
    const qs = buildQueryString({ ...(range || {}), limit: 100 });

    // Fetch analytics stats and individual reports in parallel
    const [analyticsRaw, rawReports, { index, wardResults }] = await Promise.all([
      apiClient.get(`${API_ENDPOINTS.ANALYTICS_LGA_COMPARISON}${qs}`).catch(() => null),
      getReports(),
      buildWardLgaIndex(),
    ]);

    const all = (Array.isArray(rawReports) ? rawReports : rawReports?.reports || []).map(flattenReport);
    const month = params.month;
    const monthFiltered = month ? all.filter((r) => normalizeMonth(r.report_month) === month) : all;
    // Drop duplicate submissions (one per ward+month) so drill-down lists and the
    // client-side fallback counts aren't inflated. Drafts are filtered downstream.
    const filtered = dedupeByWardMonth(monthFiltered.filter((r) => (r.state || r.status) && (r.state || r.status) !== 'draft'));

    // Build per-LGA report lists from the report data (needed for drill-down)
    const reportsByLga = new Map();
    for (const r of filtered) {
      const st = r.state || r.status;
      if (!st || st === 'draft') continue;
      const wardInfo = index[r.wardId];
      if (!wardInfo) continue;
      if (!reportsByLga.has(wardInfo.lgaId)) reportsByLga.set(wardInfo.lgaId, []);
      reportsByLga.get(wardInfo.lgaId).push({
        id: r.id,
        wardId: r.wardId,
        ward_name: wardInfo.wardName,
        ward_code: wardInfo.wardCode,
        report_month: r.report_month,
        state: r.state,
        status: r.state,
        submitted_at: r.submittedAt || r.submitted_at || null,
        submitted_by: r.submittedBy || r.submitted_by || '',
        meetings_held: r.meetings_held,
        attendees_count: attendanceTotalOf(r),
      });
    }

    // If analytics endpoint returned data, normalize and attach reports[]
    const analyticsArr = analyticsRaw
      ? (Array.isArray(analyticsRaw) ? analyticsRaw : analyticsRaw?.lgas || analyticsRaw?.data?.lgas || analyticsRaw?.data || [])
      : [];

    if (analyticsArr.length > 0) {
      return analyticsArr.map((item) => {
        const lga = normalizeLga(item);
        lga.reports = reportsByLga.get(lga.id) || reportsByLga.get(lga.lgaId) || [];
        return lga;
      });
    }

    // Fallback: compute everything client-side from ward map + reports
    const lgaMap = new Map();
    for (const { lga, wards } of wardResults) {
      lgaMap.set(lga.id, {
        id: lga.id,
        lgaId: lga.id,
        name: lga.name,
        total_wards: wards.length,
        official_ward_count: wards.length,
        submitted_count: 0,
        reviewed_count: 0,
        flagged_count: 0,
        missing_count: 0,
        submission_rate: 0,
        reports: reportsByLga.get(lga.id) || [],
      });
    }

    for (const r of filtered) {
      const st = r.state || r.status;
      if (!st || st === 'draft') continue;
      const wardInfo = index[r.wardId];
      if (!wardInfo) continue;
      const stat = lgaMap.get(wardInfo.lgaId);
      if (!stat) continue;
      stat.submitted_count++;
      if (st === 'approved' || st === 'sealed') stat.reviewed_count++;
      if (st === 'returned') stat.flagged_count++;
    }

    return Array.from(lgaMap.values()).map((stat) => {
      stat.missing_count = Math.max(0, stat.total_wards - stat.submitted_count);
      stat.submission_rate = stat.total_wards > 0
        ? Math.round((stat.submitted_count / stat.total_wards) * 100) : 0;
      return stat;
    });
  } catch (error) {
    console.error('[Analytics] getLGAComparison failed:', error.message);
    return [];
  }
};

// ---------------------------------------------------------------------------
// getTrends — analytics endpoint, fall back to client-side month grouping
// ---------------------------------------------------------------------------
export const getTrends = async (params = {}) => {
  try {
    // Backend /trends wants startDate, endDate, granularity (NOT ?months=).
    const months = params.months || 6;
    const end = new Date();
    const start = new Date(end.getFullYear(), end.getMonth() - (months - 1), 1);
    const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const qs = buildQueryString({ startDate: fmt(start), endDate: fmt(end), granularity: 'month' });
    const raw = await apiClient.get(`${API_ENDPOINTS.ANALYTICS_TRENDS}${qs}`);
    const arr = Array.isArray(raw) ? raw : raw?.trends || raw?.data?.trends || raw?.data || [];
    const mapped = arr.map(normalizeTrend);
    // Use backend data only if it has recognizable period labels; otherwise the
    // DTO shape didn't match — fall back to client-side aggregation (real data).
    if (mapped.length > 0 && mapped.every((t) => t.month)) {
      return mapped;
    }
    throw new Error('analytics/trends returned no usable data');
  } catch {
    // Client-side fallback
    try {
      const [rawReports, { wardResults }] = await Promise.all([
        getReports(),
        buildWardLgaIndex(),
      ]);
      const all = (Array.isArray(rawReports) ? rawReports : rawReports?.reports || []).map(flattenReport);
      const totalWards = wardResults.reduce((s, { wards }) => s + wards.length, 0) || 255;
      const months = params.months || 6;

      const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const now = new Date();
      const monthList = [];
      for (let i = months - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        monthList.push({ key, label: `${MONTH_LABELS[d.getMonth()]} ${String(d.getFullYear()).slice(-2)}` });
      }

      const countsByMonth = Object.fromEntries(monthList.map(({ key }) => [key, 0]));
      for (const r of all) {
        if (r.state === 'draft') continue;
        const m = normalizeMonth(r.report_month);
        if (m && Object.hasOwn(countsByMonth, m)) countsByMonth[m]++;
      }

      return monthList.map(({ key, label }) => ({
        month: label,
        submission_rate: totalWards > 0 ? Math.round((countsByMonth[key] / totalWards) * 100) : 0,
        submitted: countsByMonth[key],
        total_wards: totalWards,
      }));
    } catch (err) {
      console.error('[Analytics] getTrends fallback failed:', err.message);
      return [];
    }
  }
};

// ---------------------------------------------------------------------------
// getServiceDelivery — returns { metrics: [{ category, total_reports, avg_value,
// min_value, max_value }] }. Backend aggregates approved/sealed reports; no month
// param. On failure returns empty metrics (component renders an empty state).
// ---------------------------------------------------------------------------
export const getServiceDelivery = async () => {
  try {
    const raw = await apiClient.get(API_ENDPOINTS.ANALYTICS_SERVICE_DELIVERY);
    return normalizeServiceDelivery(raw) || { metrics: [] };
  } catch (err) {
    console.error('[Analytics] getServiceDelivery failed:', err.message);
    return { metrics: [] };
  }
};

// ---------------------------------------------------------------------------
// generateAIReport — narrative monthly report via HIVA (/ai/query). HIVA has
// direct DB access (NL→SQL), so it composes the executive summary itself; the
// dashboard supplies the quantitative stats/charts client-side. Returns
// { executive_summary, ai_narrative, conversationId, status }.
// ---------------------------------------------------------------------------
export const generateAIReport = async ({ month, prompt } = {}) => {
  const period = month ? `for ${month}` : 'for the current reporting period';
  const question = prompt ||
    `Generate a concise executive monthly report ${period} for the Kaduna State WDC ` +
    `digital reporting system. Cover: overall ward submission coverage, approvals and ` +
    `returns, the best and worst performing LGAs, any notable changes versus the prior ` +
    `period, and 2–3 specific, actionable recommendations. Write in clear prose with ` +
    `short paragraphs and no markdown tables.`;
  try {
    const res = await apiClient.post(API_ENDPOINTS.AI_QUERY, { question }, { timeout: 60000 });
    const answer = res?.answer || res?.message || '';
    return {
      executive_summary: answer,
      ai_narrative: answer,
      conversationId: res?.conversationId || null,
      status: answer ? 'ok' : 'empty',
    };
  } catch (err) {
    // Surface a clear message; the dashboard still renders the quantitative report.
    return { executive_summary: '', ai_narrative: '', status: 'error', error: err.message };
  }
};

// Legacy export kept for callers that still import it; the comprehensive report
// stats are now assembled client-side in StateDashboard, so this just defers to
// the AI narrative generator.
export const generateMonthlyReport = async (params = {}) => generateAIReport(params);

export const getLGAs = async () => apiClient.get(API_ENDPOINTS.LGAS);

// ---------------------------------------------------------------------------
// getStateSubmissions — LGA-grouped submissions for StateSubmissionsPage.
// Returns { lgas, total_reports, total_wards_reported, total_wards }
// submittedBy is top-level camelCase on the list item per the backend contract.
// ---------------------------------------------------------------------------
export const getStateSubmissions = async (params = {}) => {
  try {
    const [rawReports, { index, wardResults }] = await Promise.all([
      getReports(),
      buildWardLgaIndex(),
    ]);

    const all = (Array.isArray(rawReports) ? rawReports : rawReports?.reports || [])
      .map(flattenReport)
      .filter((r) => r.state && r.state !== 'draft');

    const { month, lga_id, report_status, search } = params;

    const matched = all.filter((r) => {
      if (month && normalizeMonth(r.report_month) !== month) return false;
      if (report_status && r.state !== report_status) return false;
      if (lga_id) {
        const info = index[r.wardId];
        if (!info || info.lgaId !== lga_id) return false;
      }
      if (search) {
        const info = index[r.wardId];
        if (!info?.wardName?.toLowerCase().includes(search.toLowerCase())) return false;
      }
      return true;
    });

    // Collapse duplicate submissions. The backend currently allows multiple
    // non-draft reports for the same ward+month (see "REQUIRED BACKEND FIX" in
    // api/reports.js), which otherwise shows the same ward several times and
    // inflates total_reports / submission_rate. Keep only the most recent report
    // per (wardId, reportMonth).
    const filtered = dedupeByWardMonth(matched);

    // Build per-LGA groups, seeded with all known (or the filtered) LGAs.
    const lgaMap = new Map();
    for (const { lga, wards } of wardResults) {
      if (lga_id && lga.id !== lga_id) continue;
      lgaMap.set(lga.id, {
        lga_id: lga.id,
        lga_name: lga.name,
        total_wards: wards.length,
        total_reports: 0,
        submission_rate: 0,
        reports: [],
      });
    }

    for (const r of filtered) {
      const wardInfo = index[r.wardId];
      if (!wardInfo) continue;
      const lgaStat = lgaMap.get(wardInfo.lgaId);
      if (!lgaStat) continue;

      lgaStat.total_reports++;
      lgaStat.reports.push({
        id: r.id,
        wardId: r.wardId,
        ward_name: wardInfo.wardName,
        ward_code: wardInfo.wardCode,
        report_month: r.report_month,
        status: r.state,
        state: r.state,
        submitted_at: r.submittedAt || r.submitted_at || null,
        submitted_by: r.submittedBy || r.submitted_by || '',
        meetings_held: r.meetings_held,
        attendees_count: attendanceTotalOf(r),
      });
    }

    const lgaList = Array.from(lgaMap.values())
      .map((stat) => {
        stat.submission_rate = stat.total_wards > 0
          ? Math.round((stat.total_reports / stat.total_wards) * 100) : 0;
        return stat;
      })
      .filter((stat) => stat.total_reports > 0 || !!lga_id);

    const totalWards = wardResults.reduce((sum, { lga, wards }) => {
      if (lga_id && lga.id !== lga_id) return sum;
      return sum + wards.length;
    }, 0);

    return {
      lgas: lgaList,
      total_reports: filtered.length,
      total_wards_reported: new Set(filtered.map((r) => r.wardId)).size,
      total_wards: totalWards || 255,
    };
  } catch (error) {
    console.error('[Analytics] getStateSubmissions failed:', error.message);
    return { lgas: [], total_reports: 0, total_wards_reported: 0, total_wards: 0 };
  }
};
