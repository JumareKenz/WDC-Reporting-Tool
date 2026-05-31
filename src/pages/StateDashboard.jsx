import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  MapPin,
  FileText,
  AlertTriangle,
  CheckCircle,
  Users,
  Download,
  Sparkles,
  Search,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Eye,
  Activity,
  Building,
  Globe,
  Calendar,
  FormInput,
  Shield,
  Heart,
  Truck,
  Hammer,
  Stethoscope,
  Award,
  Target,
  Info,
  Bot,
} from 'lucide-react';
import Card, { IconCard, EmptyCard } from '../components/common/Card';
import Button from '../components/common/Button';
import Alert from '../components/common/Alert';
import LoadingSpinner from '../components/common/LoadingSpinner';
import DataFreshness from '../components/common/DataFreshness';
import Modal from '../components/common/Modal';
import {
  useOverview,
  useLGAComparison,
  useTrends,
  useServiceDelivery,
  useGenerateAIReport,
} from '../hooks/useStateData';
import { generateMonthlyReport } from '../api/analytics';
import {
  formatDate,
  formatNumber,
  formatMonth,
  getCurrentMonth,
  getSubmissionRateColor,
} from '../utils/formatters';
import MonthlyReportModal from '../components/state/MonthlyReportModal';
import AIChatInterface from '../components/state/AIChatInterface';
import ReportDetailView from '../components/reports/ReportDetailView';
import apiClient from '../api/client';

const COLORS = ['#2f6b4d', '#2f6b4d', '#c68043', '#c18a4f', '#3b82f6', '#dc2626'];

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 100,
      damping: 15,
    },
  },
};

const expandVariants = {
  hidden: { opacity: 0, height: 0 },
  visible: {
    opacity: 1,
    height: 'auto',
    transition: {
      type: 'spring',
      stiffness: 200,
      damping: 20,
    },
  },
  exit: {
    opacity: 0,
    height: 0,
    transition: {
      duration: 0.2,
    },
  },
};

// Custom tooltip component for UI elements
const InfoTooltip = ({ children, text }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="relative inline-flex items-center">
      <div
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="cursor-help"
      >
        {children}
      </div>
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, y: 5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-neutral-800 text-white text-xs rounded-lg whitespace-nowrap z-50 pointer-events-none"
          >
            {text}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-neutral-800" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const StateDashboard = () => {
  // Mount diagnostic — appears in browser console so we can confirm the
  // component itself is loading even when the screen renders blank.
  if (typeof window !== 'undefined' && !window.__stateDashboardMounted) {
    window.__stateDashboardMounted = true;
    // eslint-disable-next-line no-console
    console.log('[StateDashboard] mounting');
  }

  const navigate = useNavigate();
  const currentMonth = getCurrentMonth();

  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('submission_rate');
  const [sortOrder, setSortOrder] = useState('desc');
  const [alertMessage, setAlertMessage] = useState(null);
  const [expandedLGA, setExpandedLGA] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [detailReportData, setDetailReportData] = useState(null);
  const [loadingDetailReport, setLoadingDetailReport] = useState(false);
  const [updatingExecutive, setUpdatingExecutive] = useState(false);
  const [updatingLGAsWards, setUpdatingLGAsWards] = useState(false);
  const [showMonthlyReport, setShowMonthlyReport] = useState(false);
  const [monthlyReportData, setMonthlyReportData] = useState(null);
  const [showMonthSelector, setShowMonthSelector] = useState(false);
  const [selectedReportMonth, setSelectedReportMonth] = useState(currentMonth);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  // AI Chat state
  const [showAIChat, setShowAIChat] = useState(false);

  // Chart type & timeframe for trends
  const [chartType, setChartType] = useState('area'); // 'area' | 'line' | 'bar'
  const [trendMonths, setTrendMonths] = useState(6); // 3 | 6 | 12

  // Data fetching
  const { data: overviewData, isLoading: loadingOverview, isError: isOverviewError, error: overviewError, refetch: refetchOverview, dataUpdatedAt: overviewUpdatedAt, isRefetching: isRefetchingOverview } = useOverview({ month: selectedMonth });
  const { data: comparisonData, isLoading: loadingComparison, isError: isComparisonError, refetch: refetchComparison, isRefetching: isRefetchingComparison } = useLGAComparison({ month: selectedMonth });
  const { data: trendsData, isLoading: loadingTrends, refetch: refetchTrends } = useTrends({ months: trendMonths });
  const { data: serviceDeliveryData, isLoading: loadingServiceDelivery } = useServiceDelivery({ month: selectedMonth });

  // Combine refetching state for DataFreshness
  const isRefetchingAny = isRefetchingOverview || isRefetchingComparison;
  const handleRefreshAll = () => {
    refetchOverview();
    refetchComparison();
    refetchTrends();
  };

  // Mutations
  const generateMonthlyMutation = useGenerateAIReport();

  // Extract data (API layer already unwraps { success, data } wrapper).
  // Handle both shapes: array directly, or { lgas: [] } / { trends: [] }.
  const overview = overviewData || {};
  const lgaComparison = Array.isArray(comparisonData)
    ? comparisonData
    : (comparisonData?.lgas || []);
  const trends = Array.isArray(trendsData)
    ? trendsData
    : (trendsData?.trends || []);
  const serviceDelivery = (serviceDeliveryData && !Array.isArray(serviceDeliveryData))
    ? serviceDeliveryData
    : {};

  // Calculate overview stats - prefer overview data, fallback to calculating from LGA comparison
  const totalLGAs = overview.total_lgas || lgaComparison.length || 23; // 23 LGAs in Kaduna
  const totalWards = overview.total_wards || lgaComparison.reduce((sum, lga) => sum + (lga.total_wards || lga.wards_count || 0), 0) || 255; // 255 wards in Kaduna
  const totalSubmitted = (overview.total_submitted !== undefined) ? overview.total_submitted : lgaComparison.reduce((sum, lga) => sum + (lga.submitted_count || lga.reports_count || 0), 0);
  const totalMissing = (overview.total_missing !== undefined) ? overview.total_missing : Math.max(0, totalWards - totalSubmitted);
  const totalReviewed = (overview.total_reviewed !== undefined) ? overview.total_reviewed : lgaComparison.reduce((sum, lga) => sum + (lga.reviewed_count || 0), 0);
  const totalFlagged = (overview.total_flagged !== undefined) ? overview.total_flagged : lgaComparison.reduce((sum, lga) => sum + (lga.flagged_count || 0), 0);
  const submissionRate = overview.submission_rate !== undefined ? overview.submission_rate : (totalWards > 0 ? Math.round((totalSubmitted / totalWards) * 100) : 0);

  // Sort and filter LGAs. Defensive: lga.name may be undefined (analytics layer
  // doesn't always populate it), so guard with String() before .includes().
  const sortedLGAs = useMemo(() => [...lgaComparison]
    .filter(lga => String(lga?.name || '').toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      const aVal = a[sortBy] || 0;
      const bVal = b[sortBy] || 0;
      return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
    }), [lgaComparison, searchTerm, sortBy, sortOrder]);

  // Chart data
  const submissionChartData = sortedLGAs.slice(0, 10).map(lga => ({
    name: lga.name?.substring(0, 10) || 'Unknown',
    rate: lga.submission_rate || 0,
    submitted: lga.submitted_count || 0,
    missing: lga.missing_count || 0,
  }));

  const statusDistribution = [
    { name: 'Submitted', value: totalSubmitted - totalReviewed - totalFlagged, color: '#3b82f6' },
    { name: 'Reviewed', value: totalReviewed, color: '#2f6b4d' },
    { name: 'Flagged', value: totalFlagged, color: '#c68043' },
    { name: 'Missing', value: totalMissing, color: '#dc2626' },
  ].filter(item => item.value > 0);

  // Performance categories
  const performanceCategories = useMemo(() => ({
    excellent: lgaComparison.filter(l => l.submission_rate >= 90).length,
    good: lgaComparison.filter(l => l.submission_rate >= 70 && l.submission_rate < 90).length,
    needsAttention: lgaComparison.filter(l => l.submission_rate >= 50 && l.submission_rate < 70).length,
    critical: lgaComparison.filter(l => l.submission_rate < 50).length,
  }), [lgaComparison]);

  // Analytics: Top 5 / Bottom 5 performers
  const top5 = useMemo(() => [...lgaComparison].sort((a, b) => (b.submission_rate || 0) - (a.submission_rate || 0)).slice(0, 5), [lgaComparison]);
  const bottom5 = useMemo(() => [...lgaComparison].sort((a, b) => (a.submission_rate || 0) - (b.submission_rate || 0)).slice(0, 5), [lgaComparison]);

  // Analytics summary
  const avgRate = useMemo(() => {
    if (lgaComparison.length === 0) return 0;
    return Math.round(lgaComparison.reduce((sum, l) => sum + (l.submission_rate || 0), 0) / lgaComparison.length);
  }, [lgaComparison]);

  // Performance distribution for donut
  const performanceDistribution = useMemo(() => [
    { name: 'Excellent (≥90%)', value: performanceCategories.excellent, color: '#16a34a' },
    { name: 'Good (70-89%)', value: performanceCategories.good, color: '#3b82f6' },
    { name: 'Needs Attention (50-69%)', value: performanceCategories.needsAttention, color: '#f59e0b' },
    { name: 'Critical (<50%)', value: performanceCategories.critical, color: '#ef4444' },
  ].filter(item => item.value > 0), [performanceCategories]);

  // Generate month options for selector (last 12 months)
  const monthOptions = useMemo(() => {
    const options = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const value = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
      const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      options.push({ value, label });
    }
    return options;
  }, []);

  const handleGenerateMonthlyReport = async () => {
    setSelectedReportMonth(selectedMonth);
    setShowMonthSelector(true);
  };

  const handleConfirmGenerateReport = async () => {
    try {
      // Fetch both: the comprehensive monthly report (has all stats, charts, SWOT)
      // and the AI narrative report (has executive summary text)
      const [monthlyRes, aiRes] = await Promise.all([
        generateMonthlyReport({ month: selectedReportMonth }),
        generateMonthlyMutation.mutateAsync({ month: selectedReportMonth }),
      ]);

      const monthlyData = monthlyRes?.report || monthlyRes || {};
      const aiData = aiRes?.report || aiRes || {};

      // Merge: use monthly report for stats/charts/SWOT, AI report for narrative
      const fullReport = {
        ...monthlyData,
        ai_narrative: aiData.executive_summary || aiData.ai_narrative || monthlyData.ai_narrative || '',
        executive_summary: aiData.executive_summary || monthlyData.executive_summary || '',
      };

      setMonthlyReportData(fullReport);
      setShowMonthSelector(false);
      setShowMonthlyReport(true);
    } catch (error) {
      setAlertMessage({ type: 'error', text: error.message || 'Failed to generate monthly report' });
    }
  };

  const handleExportCSV = () => {
    const headers = ['LGA', 'Total Wards', 'Submitted', 'Missing', 'Reviewed', 'Flagged', 'Submission Rate (%)'];
    const rows = lgaComparison.map(lga => [
      lga.name,
      lga.total_wards,
      lga.submitted_count,
      lga.missing_count,
      lga.reviewed_count,
      lga.flagged_count || 0,
      lga.submission_rate,
    ]);

    rows.push([]);
    rows.push(['TOTAL', totalWards, totalSubmitted, totalMissing, totalReviewed, totalFlagged, submissionRate]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kaduna-wdc-report-${currentMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setAlertMessage({ type: 'success', text: 'CSV exported successfully!' });
  };

  const handleUpdateStateExecutiveName = async () => {
    if (!window.confirm('Update state executive name to "Abdulrazak Mukhtar"?')) {
      return;
    }

    try {
      setUpdatingExecutive(true);
      const response = await apiClient.post('/admin/update-state-executive-name');
      setAlertMessage({
        type: 'success',
        text: `Name updated successfully! Changed from "${response.old_name}" to "${response.new_name}"`,
      });
    } catch (error) {
      setAlertMessage({
        type: 'error',
        text: error.message || 'Failed to update state executive name',
      });
    } finally {
      setUpdatingExecutive(false);
    }
  };

  const handleUpdateLGAsWards = async () => {
    if (!window.confirm('Update all LGAs and Wards with accurate Kaduna State data? This will replace all existing ward data. Make sure you have a backup!')) {
      return;
    }

    try {
      setUpdatingLGAsWards(true);
      const response = await apiClient.post('/admin/update-lgas-wards');
      setAlertMessage({
        type: 'success',
        text: `Database updated successfully! ${response.lgas.total} LGAs and ${response.wards.total} wards updated.`,
      });
      setTimeout(() => {
        refetchOverview();
      }, 1000);
    } catch (error) {
      setAlertMessage({
        type: 'error',
        text: error.message || 'Failed to update LGAs and Wards',
      });
    } finally {
      setUpdatingLGAsWards(false);
    }
  };

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const handleViewDetailReport = async (report) => {
    setSelectedReport(report);
    setDetailReportData(null);
    setLoadingDetailReport(true);
    try {
      const response = await apiClient.get(`/reports/${report.id}/detail`);
      const reportData = response?.data || response;
      const flatData = reportData?.fields
        ? { ...reportData, ...reportData.fields }
        : reportData;
      setDetailReportData(flatData);
    } catch {
      // fall back to showing basic fields from the list item
    } finally {
      setLoadingDetailReport(false);
    }
  };

  // Render trend chart based on selected chart type
  const renderTrendChart = () => {
    const commonProps = {
      data: trends,
    };

    if (chartType === 'bar') {
      return (
        <BarChart {...commonProps}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
          <XAxis dataKey="month" tick={{ fontSize: 12 }} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} tickFormatter={(v) => `${v}%`} />
          <Tooltip formatter={(value) => [`${value}%`, 'Submission Rate']} />
          <Bar dataKey="submission_rate" fill="#2f6b4d" radius={[4, 4, 0, 0]} name="Submission Rate" />
        </BarChart>
      );
    }

    if (chartType === 'line') {
      return (
        <LineChart {...commonProps}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
          <XAxis dataKey="month" tick={{ fontSize: 12 }} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} tickFormatter={(v) => `${v}%`} />
          <Tooltip formatter={(value) => [`${value}%`, 'Submission Rate']} />
          <Line type="monotone" dataKey="submission_rate" stroke="#2f6b4d" strokeWidth={3} dot={{ fill: '#16a34a', r: 4 }} />
        </LineChart>
      );
    }

    // Default: area
    return (
      <AreaChart {...commonProps}>
        <defs>
          <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#16a34a" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} tickFormatter={(v) => `${v}%`} />
        <Tooltip formatter={(value) => [`${value}%`, 'Submission Rate']} />
        <Area type="monotone" dataKey="submission_rate" stroke="#2f6b4d" strokeWidth={3} fill="url(#colorRate)" />
      </AreaChart>
    );
  };

  if (loadingOverview && loadingComparison) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" text="Loading state dashboard..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-primary-50/30 to-accent-50/20">
      {/* Header */}
      <div className="bg-white border-b border-neutral-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary-100 rounded-lg">
                  <Globe className="w-6 h-6 text-primary-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-neutral-900">
                    State Official Dashboard
                  </h1>
                  <div className="flex items-center gap-3 mt-1">
                    <p className="text-sm text-neutral-600">
                      Kaduna State Overview
                    </p>
                    <DataFreshness
                      dataUpdatedAt={overviewUpdatedAt}
                      onRefresh={handleRefreshAll}
                      isRefetching={isRefetchingAny}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {/* Month Selector */}
              <div className="flex items-center gap-2 bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-1.5">
                <Calendar className="w-4 h-4 text-neutral-500" />
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-transparent text-sm font-medium text-neutral-700 border-none outline-none cursor-pointer pr-1"
                >
                  {monthOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <InfoTooltip text="Refresh all dashboard data">
                <Button
                  variant="outline"
                  icon={RefreshCw}
                  onClick={handleRefreshAll}
                >
                  Refresh
                </Button>
              </InfoTooltip>
              <InfoTooltip text="Download LGA performance data as CSV">
                <Button
                  variant="outline"
                  icon={Download}
                  onClick={handleExportCSV}
                >
                  Export CSV
                </Button>
              </InfoTooltip>
              <InfoTooltip text="Generate comprehensive AI analysis report">
                <Button
                  icon={Sparkles}
                  onClick={handleGenerateMonthlyReport}
                  loading={generateMonthlyMutation.isPending}
                  className="shadow-md bg-gradient-to-r from-primary-600 to-primary-700"
                >
                  Generate AI Monthly Report
                </Button>
              </InfoTooltip>
              
              <InfoTooltip text="Ask AI Assistant about system data">
                <Button
                  icon={Bot}
                  onClick={() => setShowAIChat(true)}
                  className="shadow-md bg-gradient-to-r from-primary-600 to-accent-600"
                >
                  AI Assistant
                </Button>
              </InfoTooltip>
            </div>
          </div>
        </div>
      </div>

      <motion.div
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Alert */}
        <AnimatePresence>
          {alertMessage && (
            <motion.div
              className="mb-6"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Alert
                type={alertMessage.type}
                message={alertMessage.text}
                onClose={() => setAlertMessage(null)}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* API error indicator */}
        {(isOverviewError || isComparisonError) && !loadingOverview && !loadingComparison && (
          <motion.div
            className="flex items-center gap-2 mb-4 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>Could not load dashboard data. Stats may be inaccurate.</span>
            <button
              onClick={handleRefreshAll}
              className="ml-auto flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-800"
            >
              <RefreshCw className="w-3 h-3" />
              Retry
            </button>
          </motion.div>
        )}

        {/* Month indicator */}
        {selectedMonth !== currentMonth && (
          <motion.div
            className="flex items-center gap-2 mb-4 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Calendar className="w-4 h-4" />
            <span>Showing data for <strong>{monthOptions.find(m => m.value === selectedMonth)?.label}</strong></span>
            <button
              onClick={() => setSelectedMonth(currentMonth)}
              className="ml-auto text-xs font-medium text-blue-600 hover:text-blue-800 underline"
            >
              Back to current month
            </button>
          </motion.div>
        )}

        {/* Executive Summary Banner */}
        {!loadingOverview && !loadingComparison && (overview.total_submitted > 0 || lgaComparison.length > 0) && (
          <motion.div
            className="bg-gradient-to-r from-primary-900 via-primary-800 to-primary-700 rounded-2xl p-6 mb-8 text-white shadow-xl"
            variants={itemVariants}
          >
            <div className="flex flex-col lg:flex-row lg:items-start gap-6">
              {/* Left: State-wide completion */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="w-4 h-4 text-primary-300 flex-shrink-0" />
                  <span className="text-primary-200 text-xs font-semibold uppercase tracking-wider">
                    Executive Summary &mdash; {monthOptions.find(m => m.value === selectedMonth)?.label}
                  </span>
                </div>
                <h2 className="text-3xl font-bold text-white leading-tight">
                  {submissionRate}%&nbsp;
                  <span className="text-xl font-medium text-primary-200">State Coverage</span>
                </h2>
                <p className="text-primary-100 text-sm mt-1">
                  {formatNumber(totalSubmitted)} of {formatNumber(totalWards)} wards submitted
                  {totalReviewed > 0 && ` • ${formatNumber(totalReviewed)} reviewed`}
                  {totalFlagged > 0 && ` • ${formatNumber(totalFlagged)} flagged`}
                  {avgRate > 0 && lgaComparison.length > 0 && ` • ${avgRate}% avg across ${totalLGAs} LGAs`}
                </p>
                {/* State-wide progress bar */}
                <div className="mt-3 h-2.5 bg-primary-950/60 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      submissionRate >= 80 ? 'bg-emerald-400' :
                      submissionRate >= 60 ? 'bg-amber-400' : 'bg-red-400'
                    }`}
                    style={{ width: `${submissionRate}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-primary-300 mt-1">
                  <span>0%</span>
                  <span className={submissionRate >= 80 ? 'text-emerald-300' : submissionRate >= 60 ? 'text-amber-300' : 'text-red-300'}>
                    {submissionRate >= 80 ? 'On track' : submissionRate >= 60 ? 'Progressing' : 'Needs attention'}
                  </span>
                  <span>100%</span>
                </div>
              </div>

              {/* Centre: Attention needed */}
              {(performanceCategories.critical + performanceCategories.needsAttention) > 0 && (
                <div className="flex-shrink-0 px-5 py-4 bg-white/10 rounded-xl border border-white/15 backdrop-blur-sm min-w-[160px]">
                  <p className="text-xs text-primary-200 uppercase tracking-wide mb-2 font-medium">Needs Attention</p>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-bold text-amber-300">
                      {performanceCategories.critical + performanceCategories.needsAttention}
                    </span>
                    <span className="text-white/70 text-sm">LGAs</span>
                  </div>
                  <p className="text-white/60 text-xs mt-0.5">below 70% rate</p>
                  {performanceCategories.critical > 0 && (
                    <p className="text-red-300 text-xs mt-1 font-semibold">
                      {performanceCategories.critical} critical (&lt;50%)
                    </p>
                  )}
                </div>
              )}

              {/* Right: Top performer */}
              {top5[0]?.name && (
                <div className="flex-shrink-0 px-5 py-4 bg-white/10 rounded-xl border border-white/15 backdrop-blur-sm min-w-[160px]">
                  <p className="text-xs text-primary-200 uppercase tracking-wide mb-2 font-medium">Top Performer</p>
                  <p className="text-base font-bold text-white truncate">{top5[0].name}</p>
                  <p className="text-emerald-300 text-lg font-bold">{top5[0].submission_rate}%</p>
                  <p className="text-white/60 text-xs mt-0.5">{top5[0].submitted_count || 0} of {top5[0].total_wards || 0} wards</p>
                </div>
              )}
            </div>

            {/* Bottom row: critical LGAs callout */}
            {performanceCategories.critical > 0 && (
              <div className="mt-4 pt-4 border-t border-primary-700/60">
                <p className="text-xs text-red-300 font-semibold mb-2 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Critical LGAs requiring immediate attention:
                </p>
                <div className="flex flex-wrap gap-2">
                  {[...lgaComparison]
                    .filter((l) => l.submission_rate < 50)
                    .sort((a, b) => a.submission_rate - b.submission_rate)
                    .map((l) => (
                      <span
                        key={l.id}
                        className="px-2.5 py-1 bg-red-500/20 border border-red-400/30 text-red-200 text-xs rounded-full font-medium"
                      >
                        {l.name} ({l.submission_rate}%)
                      </span>
                    ))}
                </div>
              </div>
            )}

            {/* Bottom row: zero-submission note when no data yet */}
            {totalSubmitted === 0 && lgaComparison.length > 0 && (
              <div className="mt-4 pt-4 border-t border-primary-700/60">
                <p className="text-sm text-primary-200 flex items-center gap-2">
                  <Info className="w-4 h-4 flex-shrink-0" />
                  No submissions recorded for this period across {totalLGAs} LGAs and {totalWards} wards.
                </p>
              </div>
            )}
          </motion.div>
        )}

        {/* ROW 1: Overview Stats - Professional Stat Cards */}
        <motion.div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8" variants={itemVariants}>
          {/* Total LGAs */}
          <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary-100 rounded-lg">
                <Building className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">Total LGAs</p>
                <p className="text-2xl font-bold text-neutral-900">
                  {loadingOverview ? '-' : formatNumber(totalLGAs)}
                </p>
              </div>
            </div>
          </div>

          {/* Total Wards */}
          <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-100 rounded-lg">
                <MapPin className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">Total Wards</p>
                <p className="text-2xl font-bold text-neutral-900">
                  {loadingOverview ? '-' : formatNumber(totalWards)}
                </p>
              </div>
            </div>
          </div>

          {/* Submitted - Clickable */}
          <div 
            className="bg-white rounded-xl border border-neutral-200 shadow-sm p-4 hover:shadow-md transition-all cursor-pointer hover:border-green-300 hover:ring-2 hover:ring-green-100"
            onClick={() => navigate('/state/submissions')}
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-primary-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">Submitted</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold text-neutral-900">
                    {loadingOverview ? '-' : formatNumber(totalSubmitted)}
                  </p>
                  {!loadingOverview && (
                    <span className="text-xs font-medium text-primary-600 bg-primary-50 px-1.5 py-0.5 rounded">
                      {submissionRate}%
                    </span>
                  )}
                </div>
              </div>
            </div>
            {/* Progress bar */}
            {!loadingOverview && totalWards > 0 && (
              <div className="mt-3">
                <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary-500 rounded-full transition-all duration-500"
                    style={{ width: `${submissionRate}%` }}
                  />
                </div>
                <p className="text-xs text-neutral-400 mt-1">{totalSubmitted} of {totalWards} wards</p>
              </div>
            )}
          </div>

          {/* Missing */}
          <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-accent-100 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">Missing</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold text-neutral-900">
                    {loadingOverview ? '-' : formatNumber(totalMissing)}
                  </p>
                  {!loadingOverview && totalWards > 0 && (
                    <span className="text-xs font-medium text-amber-600 bg-accent-50 px-1.5 py-0.5 rounded">
                      {Math.round((totalMissing / totalWards) * 100)}%
                    </span>
                  )}
                </div>
              </div>
            </div>
            {/* Progress bar */}
            {!loadingOverview && totalWards > 0 && (
              <div className="mt-3">
                <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-accent-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.round((totalMissing / totalWards) * 100)}%` }}
                  />
                </div>
                <p className="text-xs text-neutral-400 mt-1">Pending submissions</p>
              </div>
            )}
          </div>

          {/* Reviewed */}
          <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-purple-100 rounded-lg">
                <Activity className="w-5 h-5 text-purple-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">Reviewed</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold text-neutral-900">
                    {loadingOverview ? '-' : formatNumber(totalReviewed)}
                  </p>
                  {!loadingOverview && totalSubmitted > 0 && (
                    <span className="text-xs font-medium text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">
                      {Math.round((totalReviewed / totalSubmitted) * 100)}%
                    </span>
                  )}
                </div>
              </div>
            </div>
            {/* Progress bar */}
            {!loadingOverview && totalSubmitted > 0 && (
              <div className="mt-3">
                <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-purple-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.round((totalReviewed / totalSubmitted) * 100)}%` }}
                  />
                </div>
                <p className="text-xs text-neutral-400 mt-1">Of submitted reports</p>
              </div>
            )}
          </div>

          {/* Flagged */}
          <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-red-100 rounded-lg">
                <FileText className="w-5 h-5 text-red-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">Flagged</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold text-neutral-900">
                    {loadingOverview ? '-' : formatNumber(totalFlagged)}
                  </p>
                  {!loadingOverview && totalSubmitted > 0 && totalFlagged > 0 && (
                    <span className="text-xs font-medium text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                      {Math.round((totalFlagged / totalSubmitted) * 100)}%
                    </span>
                  )}
                </div>
              </div>
            </div>
            {/* Progress bar */}
            {!loadingOverview && totalSubmitted > 0 && (
              <div className="mt-3">
                <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-red-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.round((totalFlagged / totalSubmitted) * 100)}%` }}
                  />
                </div>
                <p className="text-xs text-neutral-400 mt-1">Require attention</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* ROW 2: Analytics Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="p-4 bg-white rounded-xl border border-neutral-200 shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-neutral-600">Current Rate</span>
              {submissionRate >= avgRate ? (
                <TrendingUp className="w-4 h-4 text-primary-500" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-500" />
              )}
            </div>
            <p className="text-3xl font-bold text-neutral-900">{submissionRate}%</p>
            <p className="text-xs text-neutral-500 mt-1">This month&apos;s submission rate</p>
          </div>
          <div className="p-4 bg-white rounded-xl border border-neutral-200 shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-neutral-600">Average Rate</span>
              <Target className="w-4 h-4 text-blue-500" />
            </div>
            <p className="text-3xl font-bold text-neutral-900">{avgRate}%</p>
            <p className="text-xs text-neutral-500 mt-1">Across all {totalLGAs} LGAs</p>
          </div>
          <div className="p-4 bg-white rounded-xl border border-neutral-200 shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-neutral-600">Top Performers</span>
              <Award className="w-4 h-4 text-primary-500" />
            </div>
            <p className="text-3xl font-bold text-primary-600">{performanceCategories.excellent + performanceCategories.good}</p>
            <p className="text-xs text-neutral-500 mt-1">LGAs at ≥70% rate</p>
          </div>
          <div className="p-4 bg-white rounded-xl border border-neutral-200 shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-neutral-600">Needs Attention</span>
              <AlertTriangle className="w-4 h-4 text-red-500" />
            </div>
            <p className="text-3xl font-bold text-red-600">{performanceCategories.needsAttention + performanceCategories.critical}</p>
            <p className="text-xs text-neutral-500 mt-1">LGAs below 70% rate</p>
          </div>
        </div>

        {/* ROW 3: Performance Category Banners */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-primary-200">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-primary-700">Excellent (≥90%)</span>
              <span className="text-2xl font-bold text-primary-600">{performanceCategories.excellent}</span>
            </div>
            <div className="mt-2 h-1 bg-primary-200 rounded-full">
              <div className="h-1 bg-primary-500 rounded-full" style={{ width: `${totalLGAs > 0 ? (performanceCategories.excellent / totalLGAs) * 100 : 0}%` }} />
            </div>
          </div>
          <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-blue-700">Good (70-89%)</span>
              <span className="text-2xl font-bold text-blue-600">{performanceCategories.good}</span>
            </div>
            <div className="mt-2 h-1 bg-blue-200 rounded-full">
              <div className="h-1 bg-blue-500 rounded-full" style={{ width: `${totalLGAs > 0 ? (performanceCategories.good / totalLGAs) * 100 : 0}%` }} />
            </div>
          </div>
          <div className="p-4 bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl border border-yellow-200">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-accent-800">Needs Attention</span>
              <span className="text-2xl font-bold text-yellow-600">{performanceCategories.needsAttention}</span>
            </div>
            <div className="mt-2 h-1 bg-yellow-200 rounded-full">
              <div className="h-1 bg-accent-500 rounded-full" style={{ width: `${totalLGAs > 0 ? (performanceCategories.needsAttention / totalLGAs) * 100 : 0}%` }} />
            </div>
          </div>
          <div className="p-4 bg-gradient-to-br from-red-50 to-red-100 rounded-xl border border-red-200">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-red-700">Critical (&lt;50%)</span>
              <span className="text-2xl font-bold text-red-600">{performanceCategories.critical}</span>
            </div>
            <div className="mt-2 h-1 bg-red-200 rounded-full">
              <div className="h-1 bg-red-500 rounded-full" style={{ width: `${totalLGAs > 0 ? (performanceCategories.critical / totalLGAs) * 100 : 0}%` }} />
            </div>
          </div>
        </div>

        {/* ROW 4: Service Delivery Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {/* Health Services */}
          <div className="p-5 bg-white rounded-xl border border-neutral-200 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Stethoscope className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-neutral-900">Health Services</h3>
                <p className="text-xs text-neutral-500">Section 3A - Aggregated Data</p>
              </div>
            </div>
            {loadingServiceDelivery ? (
              <div className="animate-pulse space-y-2">
                {[1,2,3,4].map(i => <div key={i} className="h-4 bg-neutral-200 rounded w-3/4" />)}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <div className="flex justify-between"><span className="text-neutral-600">OPD General Attendance</span><span className="font-semibold">{formatNumber(serviceDelivery.health_data?.general_attendance || 0)}</span></div>
                <div className="flex justify-between"><span className="text-neutral-600">Immunization</span><span className="font-semibold">{formatNumber(serviceDelivery.health_data?.routine_immunization || 0)}</span></div>
                <div className="flex justify-between"><span className="text-neutral-600">ANC Total</span><span className="font-semibold">{formatNumber(serviceDelivery.health_data?.anc_total || 0)}</span></div>
                <div className="flex justify-between"><span className="text-neutral-600">Deliveries</span><span className="font-semibold">{formatNumber(serviceDelivery.health_data?.deliveries || 0)}</span></div>
                <div className="flex justify-between"><span className="text-neutral-600">Family Planning</span><span className="font-semibold">{formatNumber(serviceDelivery.health_data?.fp_counselling || 0)}</span></div>
                <div className="flex justify-between"><span className="text-neutral-600">HepB Tested</span><span className="font-semibold">{formatNumber(serviceDelivery.health_data?.hepb_tested || 0)}</span></div>
                <div className="flex justify-between"><span className="text-neutral-600">TB Presumptive</span><span className="font-semibold">{formatNumber(serviceDelivery.health_data?.tb_presumptive || 0)}</span></div>
                <div className="flex justify-between"><span className="text-neutral-600">Postnatal</span><span className="font-semibold">{formatNumber(serviceDelivery.health_data?.postnatal || 0)}</span></div>
              </div>
            )}
          </div>

          {/* Facility Support */}
          <div className="p-5 bg-white rounded-xl border border-neutral-200 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-primary-100 rounded-lg">
                <Hammer className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <h3 className="font-semibold text-neutral-900">Facility Support</h3>
                <p className="text-xs text-neutral-500">Section 3B - Renovations & Donations</p>
              </div>
            </div>
            {loadingServiceDelivery ? (
              <div className="animate-pulse space-y-2">
                {[1,2,3,4].map(i => <div key={i} className="h-4 bg-neutral-200 rounded w-3/4" />)}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-neutral-600">Facilities Renovated</span>
                  <span className="font-semibold text-lg">{formatNumber(serviceDelivery.facility_support?.facilities_renovated || 0)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-neutral-600">Items Donated (WDC)</span>
                  <span className="font-semibold text-lg">{formatNumber(serviceDelivery.facility_support?.items_donated_wdc || 0)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-neutral-600">Items Donated (Govt)</span>
                  <span className="font-semibold text-lg">{formatNumber(serviceDelivery.facility_support?.items_donated_govt || 0)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-neutral-600">Items Repaired</span>
                  <span className="font-semibold text-lg">{formatNumber(serviceDelivery.facility_support?.items_repaired || 0)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Transportation */}
          <div className="p-5 bg-white rounded-xl border border-neutral-200 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Truck className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-neutral-900">Transportation</h3>
                <p className="text-xs text-neutral-500">Section 3C - Women & Children Transported</p>
              </div>
            </div>
            {loadingServiceDelivery ? (
              <div className="animate-pulse space-y-2">
                {[1,2,3,4].map(i => <div key={i} className="h-4 bg-neutral-200 rounded w-3/4" />)}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-neutral-600">Women for ANC</span>
                  <span className="font-semibold text-lg">{formatNumber(serviceDelivery.transportation?.women_transported_anc || 0)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-neutral-600">Women for Delivery</span>
                  <span className="font-semibold text-lg">{formatNumber(serviceDelivery.transportation?.women_transported_delivery || 0)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-neutral-600">Children (Emergency)</span>
                  <span className="font-semibold text-lg">{formatNumber(serviceDelivery.transportation?.children_transported_danger || 0)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-neutral-600">Delivery Items Support</span>
                  <span className="font-semibold text-lg">{formatNumber(serviceDelivery.transportation?.women_supported_delivery_items || 0)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Maternal & Perinatal Deaths */}
          <div className="p-5 bg-white rounded-xl border border-red-200 shadow-sm bg-gradient-to-br from-white to-red-50">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-red-100 rounded-lg">
                <Heart className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-neutral-900">Maternal & Perinatal Deaths</h3>
                <p className="text-xs text-neutral-500">Section 3D - CMPDSR</p>
              </div>
            </div>
            {loadingServiceDelivery ? (
              <div className="animate-pulse space-y-2">
                {[1,2].map(i => <div key={i} className="h-4 bg-neutral-200 rounded w-3/4" />)}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
                  <p className="text-3xl font-bold text-red-600">{serviceDelivery.cmpdsr?.maternal_deaths || 0}</p>
                  <p className="text-sm text-red-700 mt-1">Maternal Deaths</p>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <p className="text-3xl font-bold text-orange-600">{serviceDelivery.cmpdsr?.perinatal_deaths || 0}</p>
                  <p className="text-sm text-orange-700 mt-1">Perinatal Deaths</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ROW 5: Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Submission Trends with switchable chart type and timeframe */}
          <Card
            title="Submission Trends"
            subtitle={`Last ${trendMonths} months`}
            className="lg:col-span-2"
            action={
              <div className="flex items-center gap-2">
                <select
                  value={trendMonths}
                  onChange={(e) => setTrendMonths(Number(e.target.value))}
                  className="px-2 py-1 text-xs border border-neutral-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value={3}>3 months</option>
                  <option value={6}>6 months</option>
                  <option value={12}>12 months</option>
                </select>
                <div className="flex bg-neutral-100 rounded-lg p-0.5">
                  {[
                    { key: 'area', label: 'Area' },
                    { key: 'line', label: 'Line' },
                    { key: 'bar', label: 'Bar' },
                  ].map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => setChartType(key)}
                      className={`px-2 py-1 text-xs rounded-md transition-colors ${
                        chartType === key
                          ? 'bg-white text-primary-700 shadow-sm font-medium'
                          : 'text-neutral-500 hover:text-neutral-700'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            }
          >
            {trends.length > 0 ? (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  {renderTrendChart()}
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyCard icon={TrendingUp} title="No trend data" description="Trends will appear once data is available" />
            )}
          </Card>

          {/* Status Distribution */}
          <Card title="Status Distribution" subtitle="Current month">
            {statusDistribution.length > 0 ? (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusDistribution}
                      cx="50%"
                      cy="45%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {statusDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value, name) => [formatNumber(value), name]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {statusDistribution.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-neutral-600">{item.name}: {formatNumber(item.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <EmptyCard icon={BarChart3} title="No data" description="Status data will appear here" />
            )}
          </Card>
        </div>

        {/* ROW 6: Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: LGA Charts & Tables */}
          <div className="lg:col-span-2 space-y-6">
            {/* LGA Performance Chart */}
            <Card title="LGA Performance Comparison" subtitle="Top 10 by submission rate">
              {submissionChartData.length > 0 ? (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={submissionChartData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                      <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
                      <YAxis dataKey="name" type="category" width={90} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(value, name) => [name === 'rate' ? `${value}%` : value, name === 'rate' ? 'Submission Rate' : name]} />
                      <Bar dataKey="rate" fill="#2f6b4d" radius={[0, 4, 4, 0]} name="Submission Rate" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyCard icon={BarChart3} title="No LGA data" />
              )}
            </Card>

            {/* Top 5 / Bottom 5 Performers */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Top 5 */}
              <div className="p-5 bg-gradient-to-br from-green-50 to-primary-50 rounded-xl border border-primary-200">
                <h3 className="font-semibold text-primary-800 mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Top 5 Performers
                </h3>
                <div className="space-y-2">
                  {top5.map((lga, idx) => (
                    <div key={lga.id || idx} className="flex items-center gap-3 p-2 bg-white/70 rounded-lg">
                      <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                        idx === 0 ? 'bg-accent-500' : idx === 1 ? 'bg-neutral-400' : idx === 2 ? 'bg-amber-600' : 'bg-primary-500'
                      }`}>
                        {idx + 1}
                      </span>
                      <span className="flex-1 text-sm font-medium text-neutral-900">{lga.name}</span>
                      <span className="text-sm font-bold text-primary-700">{lga.submission_rate}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom 5 */}
              <div className="p-5 bg-gradient-to-br from-red-50 to-orange-50 rounded-xl border border-red-200">
                <h3 className="font-semibold text-red-800 mb-3 flex items-center gap-2">
                  <TrendingDown className="w-4 h-4" />
                  Bottom 5 Performers
                </h3>
                <div className="space-y-2">
                  {bottom5.map((lga, idx) => (
                    <div key={lga.id || idx} className="flex items-center gap-3 p-2 bg-white/70 rounded-lg">
                      <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white bg-red-500">
                        {lgaComparison.length - idx}
                      </span>
                      <span className="flex-1 text-sm font-medium text-neutral-900">{lga.name}</span>
                      <span className="text-sm font-bold text-red-700">{lga.submission_rate}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* LGA Table */}
            <Card
              title="All LGAs Performance"
              subtitle="Click headers to sort"
              action={
                <div className="relative w-full">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400" />
                  <input
                    type="text"
                    placeholder="Search LGA..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 pr-3 py-1.5 text-sm border border-neutral-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 w-full sm:w-48"
                  />
                </div>
              }
            >
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-neutral-50">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-700">LGA</th>
                      <th
                        className="text-center py-3 px-4 text-sm font-semibold text-neutral-700 cursor-pointer hover:bg-neutral-100"
                        onClick={() => toggleSort('total_wards')}
                      >
                        Wards {sortBy === 'total_wards' && (sortOrder === 'desc' ? '↓' : '↑')}
                      </th>
                      <th
                        className="text-center py-3 px-4 text-sm font-semibold text-neutral-700 cursor-pointer hover:bg-neutral-100"
                        onClick={() => toggleSort('submitted_count')}
                      >
                        Submitted {sortBy === 'submitted_count' && (sortOrder === 'desc' ? '↓' : '↑')}
                      </th>
                      <th
                        className="text-center py-3 px-4 text-sm font-semibold text-neutral-700 cursor-pointer hover:bg-neutral-100"
                        onClick={() => toggleSort('missing_count')}
                      >
                        Missing {sortBy === 'missing_count' && (sortOrder === 'desc' ? '↓' : '↑')}
                      </th>
                      <th
                        className="text-center py-3 px-4 text-sm font-semibold text-neutral-700 cursor-pointer hover:bg-neutral-100"
                        onClick={() => toggleSort('submission_rate')}
                      >
                        Rate {sortBy === 'submission_rate' && (sortOrder === 'desc' ? '↓' : '↑')}
                      </th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-neutral-700">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedLGAs.map((lga) => (
                      <React.Fragment key={lga.id}>
                        <tr
                          className="border-b border-neutral-100 hover:bg-neutral-50 transition-colors cursor-pointer"
                          onClick={() => setExpandedLGA(expandedLGA === lga.id ? null : lga.id)}
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-2 h-2 rounded-full ${lga.submission_rate >= 90 ? 'bg-primary-500' :
                                  lga.submission_rate >= 70 ? 'bg-blue-500' :
                                    lga.submission_rate >= 50 ? 'bg-accent-500' : 'bg-red-500'
                                  }`}
                              />
                              <span className="font-medium text-neutral-900">{lga.name}</span>
                              {expandedLGA === lga.id ? (
                                <ChevronUp className="w-3 h-3 text-neutral-400" />
                              ) : (
                                <ChevronDown className="w-3 h-3 text-neutral-400" />
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex flex-col items-center">
                              <span className="text-sm font-medium text-neutral-900">{lga.official_ward_count || lga.total_wards}</span>
                              {lga.official_ward_count && lga.total_wards !== lga.official_ward_count && (
                                <span className="text-xs text-yellow-600">({lga.total_wards} tracked)</span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="inline-flex items-center justify-center w-8 h-6 rounded bg-primary-100 text-primary-700 text-sm font-medium">
                              {lga.submitted_count}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`inline-flex items-center justify-center w-8 h-6 rounded text-sm font-medium ${lga.missing_count > 0 ? 'bg-red-100 text-red-700' : 'bg-neutral-100 text-neutral-500'
                              }`}>
                              {lga.missing_count}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`font-bold ${getSubmissionRateColor(lga.submission_rate)}`}>
                              {lga.submission_rate}%
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${lga.submission_rate >= 90 ? 'bg-primary-100 text-primary-700' :
                              lga.submission_rate >= 70 ? 'bg-blue-100 text-blue-700' :
                                lga.submission_rate >= 50 ? 'bg-accent-50 text-accent-800' :
                                  'bg-red-100 text-red-700'
                              }`}>
                              {lga.submission_rate >= 90 ? 'Excellent' :
                                lga.submission_rate >= 70 ? 'Good' :
                                  lga.submission_rate >= 50 ? 'Fair' : 'Critical'}
                            </span>
                          </td>
                        </tr>
                        <AnimatePresence>
                          {expandedLGA === lga.id && (
                            <motion.tr
                              className="bg-neutral-50 border-b border-neutral-200"
                              variants={expandVariants}
                              initial="hidden"
                              animate="visible"
                              exit="exit"
                            >
                              <td colSpan="6" className="p-4">
                                {lga.reports && lga.reports.length > 0 ? (
                                  <div className="bg-white rounded border border-neutral-200 p-4">
                                    <h4 className="font-semibold mb-3 text-sm text-neutral-700 flex justify-between items-center">
                                      <span>Submissions ({lga.reports.length})</span>
                                      <span className="text-xs font-normal text-neutral-500">Click a ward to view full report</span>
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                      {lga.reports.map(report => (
                                        <motion.div
                                          key={report.id}
                                          className="p-3 border rounded hover:bg-neutral-50 hover:border-primary-300 transition-colors cursor-pointer flex justify-between items-center bg-white"
                                          onClick={(e) => { e.stopPropagation(); handleViewDetailReport(report); }}
                                          whileHover={{ scale: 1.02 }}
                                          whileTap={{ scale: 0.98 }}
                                        >
                                          <div className="overflow-hidden flex-1 min-w-0">
                                            <p className="font-medium text-sm truncate">{report.ward_name}</p>
                                            <p className="text-xs text-neutral-500 flex items-center gap-1 mt-0.5">
                                              <Calendar className="w-3 h-3 flex-shrink-0" />
                                              {formatDate(report.submitted_at)}
                                            </p>
                                            <span className={`mt-1 inline-block px-1.5 py-0.5 text-xs rounded-full ${
                                              report.state === 'approved' || report.state === 'sealed'
                                                ? 'bg-green-100 text-green-700'
                                                : report.state === 'returned'
                                                ? 'bg-amber-100 text-amber-700'
                                                : 'bg-blue-100 text-blue-700'
                                            }`}>
                                              {report.state === 'approved' || report.state === 'sealed' ? 'Approved'
                                                : report.state === 'returned' ? 'Returned'
                                                : report.state === 'in_review' ? 'In Review'
                                                : 'Submitted'}
                                            </span>
                                          </div>
                                          <Button size="xs" variant="ghost" className="text-primary-600 ml-2 flex-shrink-0">View</Button>
                                        </motion.div>
                                      ))}
                                    </div>
                                  </div>
                                ) : (
                                  <p className="text-sm text-neutral-500 text-center py-2">No submissions for this period.</p>
                                )}
                              </td>
                            </motion.tr>
                          )}
                        </AnimatePresence>
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Performance Distribution Donut */}
            <Card title="Performance Distribution" subtitle="LGA categories">
              {performanceDistribution.length > 0 ? (
                <div>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={performanceDistribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={75}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {performanceDistribution.map((entry, index) => (
                            <Cell key={`perf-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value, name) => [value, name]} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2 mt-2">
                    {performanceDistribution.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="text-neutral-600">{item.name}</span>
                        </div>
                        <span className="font-semibold text-neutral-800">{item.value} LGAs</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <EmptyCard icon={BarChart3} title="No data" description="Performance data will appear here" />
              )}
            </Card>

            {/* Quick Actions */}
            <Card title="Quick Actions">
              <div className="space-y-3">
                <Button
                  variant="primary"
                  fullWidth
                  icon={Eye}
                  onClick={() => navigate('/state/submissions')}
                >
                  View All Submissions
                </Button>
                <Button
                  variant="outline"
                  fullWidth
                  icon={Download}
                  onClick={handleExportCSV}
                >
                  Export Data (CSV)
                </Button>
                <Button
                  variant="ghost"
                  fullWidth
                  icon={FormInput}
                  onClick={() => navigate('/state/forms')}
                >
                  Form Builder
                </Button>
                <div className="pt-3 mt-3 border-t border-neutral-200 space-y-2">
                  <Button
                    variant="outline"
                    fullWidth
                    icon={RefreshCw}
                    onClick={handleUpdateLGAsWards}
                    loading={updatingLGAsWards}
                    className="border-green-300 text-primary-700 hover:bg-primary-50 font-semibold"
                  >
                    Update LGAs & Wards Database
                  </Button>
                  <Button
                    variant="outline"
                    fullWidth
                    icon={Shield}
                    onClick={handleUpdateStateExecutiveName}
                    loading={updatingExecutive}
                    className="border-primary-300 text-primary-700 hover:bg-primary-50"
                  >
                    Update State Executive Name
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </motion.div>

      {/* Report Detail Modal — uses ReportDetailView with /detail endpoint data */}
      {selectedReport && (
        <Modal
          isOpen={!!selectedReport}
          onClose={() => { setSelectedReport(null); setDetailReportData(null); }}
          title={`${selectedReport.ward_name}${selectedReport.report_month ? ` — ${formatMonth(selectedReport.report_month)}` : ''}`}
          size="xl"
        >
          <div className="space-y-4">
            {/* Report header */}
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-primary-50 to-blue-50 rounded-xl">
              <div>
                <h3 className="text-base font-bold text-neutral-900">{selectedReport.ward_name}</h3>
                <p className="text-sm text-neutral-600 mt-0.5">
                  {selectedReport.ward_code && `${selectedReport.ward_code} • `}
                  {selectedReport.report_month && `${formatMonth(selectedReport.report_month)} • `}
                  Submitted {formatDate(selectedReport.submitted_at)}
                </p>
              </div>
              <span className={`px-3 py-1 text-sm font-semibold rounded-full ${
                selectedReport.state === 'approved' || selectedReport.state === 'sealed'
                  ? 'bg-green-100 text-green-800'
                  : selectedReport.state === 'returned'
                  ? 'bg-amber-100 text-amber-800'
                  : selectedReport.state === 'in_review'
                  ? 'bg-purple-100 text-purple-800'
                  : 'bg-blue-100 text-blue-800'
              }`}>
                {selectedReport.state === 'approved' || selectedReport.state === 'sealed' ? 'Approved'
                  : selectedReport.state === 'returned' ? 'Returned'
                  : selectedReport.state === 'in_review' ? 'In Review'
                  : 'Submitted'}
              </span>
            </div>

            {/* Loading state */}
            {loadingDetailReport && (
              <div className="flex items-center justify-center py-16">
                <LoadingSpinner size="lg" text="Loading full report..." />
              </div>
            )}

            {/* Full report rendered via ReportDetailView */}
            {!loadingDetailReport && detailReportData && (
              <ReportDetailView report={detailReportData} />
            )}

            {/* Fallback if detail fetch failed */}
            {!loadingDetailReport && !detailReportData && (
              <div className="text-center py-10 text-neutral-500">
                <FileText className="w-10 h-10 mx-auto mb-3 text-neutral-300" />
                <p className="text-sm">Could not load full report details.</p>
                <p className="text-xs mt-1">Report ID: {selectedReport.id}</p>
              </div>
            )}

            <div className="flex justify-end pt-3 border-t">
              <Button onClick={() => { setSelectedReport(null); setDetailReportData(null); }}>Close</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Month Selector Modal */}
      <Modal
        isOpen={showMonthSelector}
        onClose={() => setShowMonthSelector(false)}
        title="Generate AI Monthly Report"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-neutral-600">
            Select the month for which you want to generate the AI analysis report.
          </p>
          
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Select Month
            </label>
            <select
              value={selectedReportMonth}
              onChange={(e) => setSelectedReportMonth(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              {monthOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="ghost"
              onClick={() => setShowMonthSelector(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmGenerateReport}
              loading={generateMonthlyMutation.isPending}
              className="flex-1"
              icon={Sparkles}
            >
              Generate Report
            </Button>
          </div>
        </div>
      </Modal>

      {/* Monthly Report Modal */}
      <MonthlyReportModal
        isOpen={showMonthlyReport}
        onClose={() => setShowMonthlyReport(false)}
        reportData={monthlyReportData}
        month={selectedReportMonth}
      />
      
      {/* AI Chat Interface */}
      <AIChatInterface
        isOpen={showAIChat}
        onClose={() => setShowAIChat(false)}
      />
    </div>
  );
};

export default StateDashboard;
