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

const normalizeOverview = (raw) => {
  const d = raw?.data || raw || {};
  return {
    total_lgas: d.total_lgas ?? d.totalLgas ?? 0,
    total_wards: d.total_wards ?? d.totalWards ?? 0,
    total_submitted: d.total_submitted ?? d.totalSubmitted ?? 0,
    total_reviewed: d.total_reviewed ?? d.totalReviewed ?? 0,
    total_flagged: d.total_flagged ?? d.totalFlagged ?? 0,
    total_missing: d.total_missing ?? d.totalMissing ?? 0,
    submission_rate: d.submission_rate ?? d.submissionRate ?? 0,
  };
};

const normalizeLga = (item) => ({
  id: item.lga_id || item.lgaId || item.id,
  lgaId: item.lga_id || item.lgaId || item.id,
  name: item.lga_name || item.lgaName || item.name || '',
  total_wards: item.total_wards ?? item.totalWards ?? item.ward_count ?? item.wardCount ?? 0,
  official_ward_count: item.total_wards ?? item.totalWards ?? item.ward_count ?? item.wardCount ?? 0,
  submitted_count: item.submitted_count ?? item.submittedCount ?? 0,
  reviewed_count: item.reviewed_count ?? item.reviewedCount ?? 0,
  flagged_count: item.flagged_count ?? item.flaggedCount ?? 0,
  missing_count: item.missing_count ?? item.missingCount ?? 0,
  submission_rate: item.submission_rate ?? item.submissionRate ?? 0,
  reports: [],
});

const normalizeTrend = (item) => ({
  month: item.month || item.label || '',
  submission_rate: item.submission_rate ?? item.submissionRate ?? 0,
  submitted: item.submitted ?? item.submittedCount ?? 0,
  total_wards: item.total_wards ?? item.totalWards ?? 0,
});

// Service delivery: the backend may use camelCase sub-keys. Try both.
const normalizeServiceDelivery = (raw) => {
  const d = raw?.data || raw || {};
  if (!d || typeof d !== 'object') return {};

  // Helper: pick first defined value from a list of keys (camelCase + snake_case)
  const pick = (obj, ...keys) => {
    for (const k of keys) {
      const v = obj?.[k];
      if (v !== undefined && v !== null) return Number(v) || 0;
    }
    return 0;
  };

  const hd = d.health_data || d.healthData || d.health || {};
  const fs = d.facility_support || d.facilitySupport || d.facility || {};
  const tr = d.transportation || d.transport || {};
  const cm = d.cmpdsr || d.cMPDSR || d.deaths || {};

  // Detect empty result — backend returned nothing meaningful
  const hasData = Object.keys(hd).length > 0 || Object.keys(fs).length > 0 ||
    Object.keys(tr).length > 0 || Object.keys(cm).length > 0;
  if (!hasData) return null;

  return {
    health_data: {
      general_attendance: pick(hd, 'general_attendance', 'generalAttendance', 'opd', 'opdTotal'),
      routine_immunization: pick(hd, 'routine_immunization', 'routineImmunization', 'immunization'),
      anc_total: pick(hd, 'anc_total', 'ancTotal', 'anc'),
      deliveries: pick(hd, 'deliveries'),
      fp_counselling: pick(hd, 'fp_counselling', 'fpCounselling', 'familyPlanning'),
      hepb_tested: pick(hd, 'hepb_tested', 'hepbTested', 'hepatitisB'),
      tb_presumptive: pick(hd, 'tb_presumptive', 'tbPresumptive', 'tb'),
      postnatal: pick(hd, 'postnatal', 'postNatal'),
    },
    facility_support: {
      facilities_renovated: pick(fs, 'facilities_renovated', 'facilitiesRenovated', 'renovated'),
      items_donated_wdc: pick(fs, 'items_donated_wdc', 'itemsDonatedWdc', 'donatedWdc'),
      items_donated_govt: pick(fs, 'items_donated_govt', 'itemsDonatedGovt', 'donatedGovt'),
      items_repaired: pick(fs, 'items_repaired', 'itemsRepaired', 'repaired'),
    },
    transportation: {
      women_transported_anc: pick(tr, 'women_transported_anc', 'womenTransportedAnc'),
      women_transported_delivery: pick(tr, 'women_transported_delivery', 'womenTransportedDelivery'),
      children_transported_danger: pick(tr, 'children_transported_danger', 'childrenTransportedDanger'),
      women_supported_delivery_items: pick(tr, 'women_supported_delivery_items', 'womenSupportedDeliveryItems'),
    },
    cmpdsr: {
      maternal_deaths: pick(cm, 'maternal_deaths', 'maternalDeaths'),
      perinatal_deaths: pick(cm, 'perinatal_deaths', 'perinatalDeaths'),
    },
  };
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

  const stats = { total_lgas: 23, total_wards: totalWards, total_submitted: 0, total_reviewed: 0, total_flagged: 0, total_missing: 0, submission_rate: 0 };
  for (const r of reports) {
    const st = r.state || r.status;
    if (!st || st === 'draft') continue;
    stats.total_submitted++;
    if (st === 'approved' || st === 'sealed') stats.total_reviewed++;
    if (st === 'returned') stats.total_flagged++;
  }
  stats.total_missing = Math.max(0, totalWards - stats.total_submitted);
  stats.submission_rate = totalWards > 0 ? Math.round((stats.total_submitted / totalWards) * 100) : 0;
  return stats;
};

const clientSideServiceDelivery = async (params) => {
  const rawReports = await getReports();
  const all = (Array.isArray(rawReports) ? rawReports : rawReports?.reports || []).map(flattenReport);
  const month = params.month;
  const reports = (month ? all.filter((r) => normalizeMonth(r.report_month) === month) : all)
    .filter((r) => r.state && r.state !== 'draft');
  if (reports.length === 0) return {};
  const sum = (f) => sumField(reports, f);
  return {
    health_data: {
      general_attendance: sum('health_general_attendance_total'),
      routine_immunization: sum('health_routine_immunization_total'),
      anc_total: sum('health_anc_total'),
      deliveries: sum('health_deliveries'),
      fp_counselling: sum('health_fp_counselling'),
      hepb_tested: sum('health_hepb_tested'),
      tb_presumptive: sum('health_tb_presumptive'),
      postnatal: sum('health_postnatal'),
    },
    facility_support: {
      facilities_renovated: sum('facility_renovated_count'),
      items_donated_wdc: sum('items_donated_count'),
      items_donated_govt: sum('items_donated_govt_count'),
      items_repaired: sum('items_repaired_count'),
    },
    transportation: {
      women_transported_anc: sum('women_transported_anc'),
      women_transported_delivery: sum('women_transported_delivery'),
      children_transported_danger: sum('children_transported_danger'),
      women_supported_delivery_items: sum('women_supported_delivery_items'),
    },
    cmpdsr: {
      maternal_deaths: sum('maternal_deaths'),
      perinatal_deaths: sum('perinatal_deaths'),
    },
  };
};

// ---------------------------------------------------------------------------
// getOverview — hit backend analytics, fall back to client-side
// ---------------------------------------------------------------------------
export const getOverview = async (params = {}) => {
  try {
    const qs = buildQueryString(params.month ? { month: params.month } : {});
    const raw = await apiClient.get(`${API_ENDPOINTS.ANALYTICS_OVERVIEW}${qs}`);
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
      return { total_lgas: 23, total_wards: 255, total_submitted: 0, total_reviewed: 0, total_flagged: 0, total_missing: 255, submission_rate: 0 };
    }
  }
};

// ---------------------------------------------------------------------------
// getLGAComparison — analytics endpoint for stats + ward map for reports[]
// ---------------------------------------------------------------------------
export const getLGAComparison = async (params = {}) => {
  try {
    const qs = buildQueryString(params.month ? { month: params.month } : {});

    // Fetch analytics stats and individual reports in parallel
    const [analyticsRaw, rawReports, { index, wardResults }] = await Promise.all([
      apiClient.get(`${API_ENDPOINTS.ANALYTICS_LGA_COMPARISON}${qs}`).catch(() => null),
      getReports(),
      buildWardLgaIndex(),
    ]);

    const all = (Array.isArray(rawReports) ? rawReports : rawReports?.reports || []).map(flattenReport);
    const month = params.month;
    const filtered = month ? all.filter((r) => normalizeMonth(r.report_month) === month) : all;

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
        attendees_count: r.attendees_count || r.attendance_total,
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
    const months = params.months || 6;
    const qs = buildQueryString({ months });
    const raw = await apiClient.get(`${API_ENDPOINTS.ANALYTICS_TRENDS}${qs}`);
    const arr = Array.isArray(raw) ? raw : raw?.trends || raw?.data?.trends || raw?.data || [];
    if (arr.length > 0) {
      return arr.map(normalizeTrend);
    }
    throw new Error('analytics/trends returned no data');
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
// getServiceDelivery — analytics endpoint, fall back to client-side aggregation
// ---------------------------------------------------------------------------
export const getServiceDelivery = async (params = {}) => {
  try {
    const qs = buildQueryString(params.month ? { month: params.month } : {});
    const raw = await apiClient.get(`${API_ENDPOINTS.ANALYTICS_SERVICE_DELIVERY}${qs}`);
    const normalized = normalizeServiceDelivery(raw);
    if (normalized) return normalized;
    throw new Error('analytics/service-delivery returned no data');
  } catch {
    try {
      return clientSideServiceDelivery(params);
    } catch (err) {
      console.error('[Analytics] getServiceDelivery fallback failed:', err.message);
      return {};
    }
  }
};

export const generateAIReport = async () => ({ report: '', status: 'unsupported' });
export const generateMonthlyReport = async () => ({ report: '', status: 'unsupported' });

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

    const filtered = all.filter((r) => {
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
        attendees_count: r.attendees_count || r.attendance_total,
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
