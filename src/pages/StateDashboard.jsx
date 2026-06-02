import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../components/common/Modal';
import Button from '../components/common/Button';
import { useToast } from '../hooks/useToast';
import {
  useOverview,
  useLGAComparison,
  useTrends,
  useServiceDelivery,
  useStateSubmissions,
  useGenerateAIReport,
} from '../hooks/useStateData';
import { getCurrentMonth, formatMonth } from '../utils/formatters';

import { PERIOD_MODES, buildPeriod } from '../components/dashboard/dashboardUtils';
import DashboardHeader from '../components/dashboard/DashboardHeader';
import AlertBanner from '../components/dashboard/AlertBanner';
import KpiStrip from '../components/dashboard/KpiStrip';
import SubmissionTrendChart from '../components/dashboard/SubmissionTrendChart';
import CoverageDonut from '../components/dashboard/CoverageDonut';
import TopPerformers from '../components/dashboard/TopPerformers';
import NeedsAttention from '../components/dashboard/NeedsAttention';
import RecentActivity from '../components/dashboard/RecentActivity';
import QuickStats from '../components/dashboard/QuickStats';
import LgaTable from '../components/dashboard/LgaTable';
import ServiceDeliveryMetrics from '../components/state/ServiceDeliveryMetrics';
import MonthlyReportModal from '../components/state/MonthlyReportModal';
import AIChatInterface from '../components/state/AIChatInterface';
import { Sparkles } from 'lucide-react';

/**
 * State Official Dashboard — enterprise intelligence layout.
 *
 * Single source of truth for the reporting period is lifted here; every section
 * receives the same period + already-fetched data as props, so changing the
 * period re-drives the whole page without per-widget fetch logic.
 *
 * Default period = Last Month: the most recent fully-closed reporting cycle. It
 * always has real data (unlike the in-progress current month) and gives the
 * per-LGA AI report column a concrete month to work with.
 */
const StateDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  // --- Period (lifted state) ----------------------------------------------
  const [periodMode, setPeriodMode] = useState(PERIOD_MODES.LAST);
  const [customMonth, setCustomMonth] = useState(getCurrentMonth());
  const period = useMemo(() => buildPeriod(periodMode, customMonth), [periodMode, customMonth]);

  // --- AI report / chat modals --------------------------------------------
  const [showAIChat, setShowAIChat] = useState(false);
  const [showMonthSelector, setShowMonthSelector] = useState(false);
  const [reportMonth, setReportMonth] = useState(period.month || getCurrentMonth());
  const [showMonthlyReport, setShowMonthlyReport] = useState(false);
  const [monthlyReportData, setMonthlyReportData] = useState(null);
  const generateMonthlyMutation = useGenerateAIReport();

  // --- Data fetching (one place; flows down as props) ---------------------
  const overviewQ = useOverview({ month: period.month });
  // Prior period for KPI deltas. In all-time mode priorMonth is null → reuse the
  // same ({month:''}) query key so React Query dedupes (no extra request).
  const priorQ = useOverview({ month: period.priorMonth || '' });
  const comparisonQ = useLGAComparison({ month: period.month });
  const trendsQ = useTrends({ months: 6 });
  const serviceQ = useServiceDelivery({ month: period.month });
  const submissionsQ = useStateSubmissions({ month: period.month });

  const overview = overviewQ.data || {};
  const lgas = Array.isArray(comparisonQ.data) ? comparisonQ.data : (comparisonQ.data?.lgas || []);
  const trends = Array.isArray(trendsQ.data) ? trendsQ.data : (trendsQ.data?.trends || []);
  const serviceMetrics = Array.isArray(serviceQ.data?.metrics) ? serviceQ.data.metrics : [];
  const prior = period.priorMonth ? priorQ.data : null;

  const submissionRate = overview.submission_rate ?? null;
  const lastUpdated = overviewQ.dataUpdatedAt || null;
  const isRefreshing =
    overviewQ.isRefetching || comparisonQ.isRefetching || trendsQ.isRefetching || submissionsQ.isRefetching;

  // Recent-activity feed — flatten the LGA-grouped submissions, newest first.
  const activityItems = useMemo(() => {
    const groups = submissionsQ.data?.lgas || [];
    const items = [];
    for (const g of groups) {
      for (const r of g.reports || []) {
        items.push({
          id: r.id,
          ward_name: r.ward_name,
          lga_name: g.lga_name,
          report_month: r.report_month,
          submitted_at: r.submitted_at,
          state: r.state,
        });
      }
    }
    return items.sort((a, b) => new Date(b.submitted_at || 0) - new Date(a.submitted_at || 0));
  }, [submissionsQ.data]);

  // --- Handlers ------------------------------------------------------------
  const handleRefreshAll = () => {
    overviewQ.refetch();
    comparisonQ.refetch();
    trendsQ.refetch();
    serviceQ.refetch();
    submissionsQ.refetch();
  };

  const goToSubmissions = (lga) => {
    const params = new URLSearchParams();
    if (lga?.id ?? lga?.lgaId) params.set('lga', lga.id ?? lga.lgaId);
    if (period.month) params.set('month', period.month);
    const qs = params.toString();
    navigate(`/state/submissions${qs ? `?${qs}` : ''}`);
  };

  const handleExport = () => {
    if (!lgas.length) {
      toast.warning('No LGA data to export for this period.');
      return;
    }
    const headers = ['LGA', 'Total Wards', 'Submitted', 'Missing', 'Reviewed', 'Returned', 'Submission Rate (%)'];
    const rows = lgas.map((l) => [
      l.name, l.total_wards, l.submitted_count, l.missing_count, l.reviewed_count, l.flagged_count || 0, l.submission_rate,
    ]);
    rows.push([]);
    rows.push([
      'TOTAL', overview.total_wards, overview.total_submitted, overview.total_missing,
      overview.total_reviewed, overview.total_flagged, overview.submission_rate,
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kaduna-wdc-overview-${period.month || 'all-time'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Overview exported as CSV.');
  };

  // Assemble the AI monthly report from already-loaded data; HIVA supplies prose.
  const buildMonthlyReportData = (narrative) => {
    const sorted = [...lgas].sort((a, b) => (b.submission_rate || 0) - (a.submission_rate || 0));
    const top5 = sorted.slice(0, 5);
    const bottom5 = [...sorted].reverse().slice(0, 5);
    const critical = lgas.filter((l) => (l.submission_rate || 0) < 50);
    const lastT = trends[trends.length - 1];
    const prevT = trends[trends.length - 2];
    const rateChange = prevT && prevT.submitted
      ? Math.round(((lastT.submitted - prevT.submitted) / prevT.submitted) * 100) : 0;

    const recommendations = [];
    bottom5.filter((l) => (l.submission_rate || 0) < 70).forEach((l) =>
      recommendations.push(`Follow up with ${l.name} (currently ${l.submission_rate}% ward coverage) to close reporting gaps.`));
    if (lastT && prevT && rateChange < 0) {
      recommendations.push(`Submissions fell ${Math.abs(rateChange)}% versus the previous period — investigate blockers in low-activity LGAs.`);
    }
    if ((overview.total_flagged || 0) > 0) {
      recommendations.push(`${overview.total_flagged} report(s) were returned — reinforce data-quality guidance with affected secretaries.`);
    }

    return {
      state_overview: {
        total_lgas: overview.total_lgas,
        total_wards: overview.total_wards,
        reports_submitted: overview.total_submitted,
        reports_missing: overview.total_missing,
        submission_rate: overview.submission_rate,
        prev_rate: Math.max(0, (overview.submission_rate || 0) - rateChange),
        rate_change: rateChange,
      },
      service_delivery: { metrics: serviceMetrics },
      key_issues: [],
      recommendations,
      swot: {
        strengths: top5.filter((l) => (l.submission_rate || 0) >= 70).map((l) => `${l.name} performing well at ${l.submission_rate}%`),
        weaknesses: bottom5.filter((l) => (l.submission_rate || 0) < 50).map((l) => `${l.name} critically low at ${l.submission_rate}%`),
        opportunities: [],
        threats: critical.length ? [`${critical.length} LGA(s) below 50% coverage risk missing the reporting cycle`] : [],
      },
      charts: {
        lga_rates: sorted.map((l) => ({ name: l.name, rate: l.submission_rate || 0, submitted: l.submitted_count || 0, total: l.total_wards || 0 })),
        service_metrics: serviceMetrics.map((m) => ({ name: m.category, value: m.avg_value || 0 })),
      },
      ai_narrative: narrative,
      executive_summary: narrative,
    };
  };

  const handleConfirmGenerateReport = async () => {
    try {
      const aiRes = await generateMonthlyMutation.mutateAsync({ month: reportMonth });
      const narrative = aiRes?.ai_narrative || aiRes?.executive_summary || '';
      if (aiRes?.status === 'error') {
        toast.warning('AI narrative unavailable right now — showing the data report without it.');
      }
      setMonthlyReportData(buildMonthlyReportData(narrative));
      setShowMonthSelector(false);
      setShowMonthlyReport(true);
    } catch (err) {
      toast.error(err.message || 'Failed to generate monthly report.');
    }
  };

  // Month options for the AI-report selector (last 12 months).
  const monthOptions = useMemo(() => {
    const opts = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      opts.push({ value, label: formatMonth(value) });
    }
    return opts;
  }, []);

  const kpiLoading = overviewQ.isLoading || comparisonQ.isLoading;

  return (
    <div className="min-h-screen bg-neutral-50">
      <DashboardHeader
        period={period}
        customMonth={customMonth}
        onChangeMode={setPeriodMode}
        onChangeCustomMonth={setCustomMonth}
        lastUpdated={lastUpdated}
        isRefreshing={isRefreshing}
        onRefresh={handleRefreshAll}
        onExport={handleExport}
        onGenerateReport={() => { setReportMonth(period.month || getCurrentMonth()); setShowMonthSelector(true); }}
        onOpenAIChat={() => setShowAIChat(true)}
      />

      <main className="mx-auto max-w-screen-2xl space-y-4 px-4 py-4 sm:px-6">
        {/* Critical / at-risk banner — hidden when there is nothing to flag */}
        {!kpiLoading && (
          <AlertBanner
            lgas={lgas}
            submissionRate={submissionRate}
            period={period}
            onViewDetails={() => navigate('/state/submissions')}
          />
        )}

        {/* KPI strip */}
        <KpiStrip
          overview={overview}
          prior={prior}
          lgas={lgas}
          loading={kpiLoading}
          error={overviewQ.isError && !overviewQ.data}
          onRetry={handleRefreshAll}
        />

        {/* Main two-column section (collapses below 1280px) */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <div className="space-y-4 xl:col-span-8">
            <SubmissionTrendChart
              trends={trends}
              expected={overview.total_wards}
              loading={trendsQ.isLoading}
              error={trendsQ.isError && !trends.length}
              onRetry={() => trendsQ.refetch()}
            />
            <LgaTable
              lgas={lgas}
              period={period}
              loading={comparisonQ.isLoading}
              error={comparisonQ.isError && !lgas.length}
              onOpenLga={goToSubmissions}
              onRetry={() => comparisonQ.refetch()}
            />
          </div>

          <div className="space-y-4 xl:col-span-4">
            <CoverageDonut
              lgas={lgas}
              submissionRate={submissionRate}
              loading={comparisonQ.isLoading}
              error={comparisonQ.isError && !lgas.length}
              onRetry={() => comparisonQ.refetch()}
            />
            <TopPerformers
              lgas={lgas}
              loading={comparisonQ.isLoading}
              error={comparisonQ.isError && !lgas.length}
              onRetry={() => comparisonQ.refetch()}
            />
            <NeedsAttention
              lgas={lgas}
              period={period}
              loading={comparisonQ.isLoading}
              error={comparisonQ.isError && !lgas.length}
              onViewLga={goToSubmissions}
              onRetry={() => comparisonQ.refetch()}
            />
          </div>
        </div>

        {/* Service delivery (health indicators) — data-driven from form fields.
            Renders its own titled card (reused as-is). */}
        <ServiceDeliveryMetrics metrics={serviceMetrics} loading={serviceQ.isLoading} />

        {/* Activity & summary strip */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <div className="xl:col-span-7">
            <RecentActivity
              items={activityItems.slice(0, 12)}
              loading={submissionsQ.isLoading}
              error={submissionsQ.isError && !activityItems.length}
              onViewAll={() => navigate('/state/submissions')}
              onRetry={() => submissionsQ.refetch()}
            />
          </div>
          <div className="xl:col-span-5">
            <QuickStats
              lgas={lgas}
              activityItems={activityItems}
              lastUpdated={lastUpdated}
              loading={comparisonQ.isLoading}
              error={comparisonQ.isError && !lgas.length}
              onRetry={handleRefreshAll}
            />
          </div>
        </div>
      </main>

      {/* AI monthly report — month selector */}
      <Modal isOpen={showMonthSelector} onClose={() => setShowMonthSelector(false)} title="Generate AI Monthly Report" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-neutral-600">Select the month to generate the AI analysis report for.</p>
          <select
            value={reportMonth}
            onChange={(e) => setReportMonth(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
          >
            {monthOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <div className="flex gap-3 pt-2">
            <Button variant="ghost" className="flex-1" onClick={() => setShowMonthSelector(false)}>Cancel</Button>
            <Button className="flex-1" icon={Sparkles} loading={generateMonthlyMutation.isPending} onClick={handleConfirmGenerateReport}>
              Generate
            </Button>
          </div>
        </div>
      </Modal>

      <MonthlyReportModal
        isOpen={showMonthlyReport}
        onClose={() => setShowMonthlyReport(false)}
        reportData={monthlyReportData}
        month={reportMonth}
      />

      <AIChatInterface isOpen={showAIChat} onClose={() => setShowAIChat(false)} />
    </div>
  );
};

export default StateDashboard;
