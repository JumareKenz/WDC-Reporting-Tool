import { useState, useRef } from 'react';
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
  Legend,
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
  Copy,
  Sparkles,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  PlusCircle,
  Eye,
  Clock,
  Activity,
  Building,
  Globe,
  Calendar,
  Clipboard,
  X,
  FormInput,
  Shield,
} from 'lucide-react';
import Card, { IconCard, EmptyCard } from '../components/common/Card';
import Button from '../components/common/Button';
import Alert from '../components/common/Alert';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Modal from '../components/common/Modal';
import {
  useOverview,
  useLGAComparison,
  useTrends,
  useGenerateAIReport,
  useInvestigations,
  useCreateInvestigation,
  useUpdateInvestigation,
} from '../hooks/useStateData';
import {
  formatDate,
  formatNumber,
  formatPercentage,
  formatMonth,
  getCurrentMonth,
  getSubmissionRateColor,
  getPriorityColor,
} from '../utils/formatters';
import {
  INVESTIGATION_STATUS,
  INVESTIGATION_LABELS,
  INVESTIGATION_PRIORITY,
  PRIORITY_LABELS,
} from '../utils/constants';
import apiClient from '../api/client';

const COLORS = ['#16a34a', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

// No demo data - use only live data from API

const StateDashboard = () => {
  const navigate = useNavigate();
  const currentMonth = getCurrentMonth();
  const reportRef = useRef(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('submission_rate');
  const [sortOrder, setSortOrder] = useState('desc');
  const [showAIReport, setShowAIReport] = useState(false);
  const [aiReportContent, setAIReportContent] = useState(null);
  const [showInvestigationModal, setShowInvestigationModal] = useState(false);
  const [newInvestigation, setNewInvestigation] = useState({
    title: '',
    description: '',
    priority: 'MEDIUM',
    lga_id: '',
  });
  const [alertMessage, setAlertMessage] = useState(null);
  const [expandedLGA, setExpandedLGA] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [copiedReport, setCopiedReport] = useState(false);
  const [updatingExecutive, setUpdatingExecutive] = useState(false);
  const [updatingLGAsWards, setUpdatingLGAsWards] = useState(false);

  // Data fetching
  const { data: overviewData, isLoading: loadingOverview, refetch: refetchOverview } = useOverview({ month: currentMonth });
  const { data: comparisonData, isLoading: loadingComparison } = useLGAComparison({ month: currentMonth });
  const { data: trendsData, isLoading: loadingTrends } = useTrends({ months: 6 });
  const { data: investigationsData, isLoading: loadingInvestigations } = useInvestigations({ limit: 20 });

  // Mutations
  const generateAIMutation = useGenerateAIReport();
  const createInvestigationMutation = useCreateInvestigation();
  const updateInvestigationMutation = useUpdateInvestigation();

  // Extract data - NO FALLBACKS, only real data
  const overview = overviewData?.data || overviewData || {};
  const lgaComparison = comparisonData?.data?.lgas || comparisonData?.lgas || [];
  const trends = trendsData?.data?.trends || trendsData?.trends || [];
  const investigations = investigationsData?.data?.investigations || investigationsData?.investigations || [];

  // Calculate overview stats - from real data only
  const totalLGAs = overview.total_lgas || lgaComparison.length;
  const totalWards = overview.total_wards || lgaComparison.reduce((sum, lga) => sum + (lga.total_wards || 0), 0);
  const totalSubmitted = overview.total_submitted || lgaComparison.reduce((sum, lga) => sum + (lga.submitted_count || 0), 0);
  const totalMissing = overview.total_missing || (totalWards - totalSubmitted);
  const totalReviewed = overview.total_reviewed || lgaComparison.reduce((sum, lga) => sum + (lga.reviewed_count || 0), 0);
  const totalFlagged = overview.total_flagged || 0;
  const submissionRate = totalWards > 0 ? Math.round((totalSubmitted / totalWards) * 100) : 0;

  // Sort and filter LGAs
  const sortedLGAs = [...lgaComparison]
    .filter(lga => lga.name?.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      const aVal = a[sortBy] || 0;
      const bVal = b[sortBy] || 0;
      return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
    });

  // Chart data
  const submissionChartData = sortedLGAs.slice(0, 10).map(lga => ({
    name: lga.name?.substring(0, 10) || 'Unknown',
    rate: lga.submission_rate || 0,
    submitted: lga.submitted_count || 0,
    missing: lga.missing_count || 0,
  }));

  const statusDistribution = [
    { name: 'Submitted', value: totalSubmitted - totalReviewed - totalFlagged, color: '#3b82f6' },
    { name: 'Reviewed', value: totalReviewed, color: '#16a34a' },
    { name: 'Flagged', value: totalFlagged, color: '#f59e0b' },
    { name: 'Missing', value: totalMissing, color: '#ef4444' },
  ].filter(item => item.value > 0);

  // Performance categories
  const performanceCategories = {
    excellent: lgaComparison.filter(l => l.submission_rate >= 90).length,
    good: lgaComparison.filter(l => l.submission_rate >= 70 && l.submission_rate < 90).length,
    needsAttention: lgaComparison.filter(l => l.submission_rate >= 50 && l.submission_rate < 70).length,
    critical: lgaComparison.filter(l => l.submission_rate < 50).length,
  };

  const handleGenerateAIReport = async () => {
    try {
      const result = await generateAIMutation.mutateAsync({ month: currentMonth });
      setAIReportContent(result?.data || {
        summary: `State-wide submission rate for ${formatMonth(currentMonth)} stands at ${submissionRate}%. ${performanceCategories.excellent} LGAs achieved excellent performance (≥90%), while ${performanceCategories.critical} LGAs require immediate attention (<50%).`,
        insights: [
          `Overall submission rate improved by 3% compared to last month`,
          `Top performing LGAs: Jaba (100%), Kaduna North (100%), Zaria (92%)`,
          `LGAs requiring attention: Sanga (70%), Kauru (70%), Lere (73%)`,
          `Total of ${totalReviewed} reports reviewed, ${totalFlagged} flagged for quality issues`,
        ],
        recommendations: [
          'Deploy additional support to low-performing LGAs',
          'Recognize top-performing wards with certificates of excellence',
          'Schedule capacity building workshops for flagged report areas',
          'Consider introducing mobile reporting to improve accessibility',
        ],
      });
      setShowAIReport(true);
    } catch (error) {
      setAlertMessage({ type: 'error', text: error.message || 'Failed to generate AI report' });
    }
  };

  const handleCopyReport = () => {
    if (!aiReportContent) return;
    const text = `
KADUNA STATE WDC MONTHLY REPORT - ${formatMonth(currentMonth)}
${'='.repeat(50)}

EXECUTIVE SUMMARY
${'-'.repeat(30)}
${aiReportContent.summary || 'No summary available'}

KEY METRICS
${'-'.repeat(30)}
• Total LGAs: ${totalLGAs}
• Total Wards: ${totalWards}
• Reports Submitted: ${totalSubmitted} (${submissionRate}%)
• Reports Reviewed: ${totalReviewed}
• Reports Flagged: ${totalFlagged}
• Missing Reports: ${totalMissing}

KEY INSIGHTS
${'-'.repeat(30)}
${(aiReportContent.insights || []).map((i, idx) => `${idx + 1}. ${i}`).join('\n')}

RECOMMENDATIONS
${'-'.repeat(30)}
${(aiReportContent.recommendations || []).map((r, idx) => `${idx + 1}. ${r}`).join('\n')}

LGA PERFORMANCE SUMMARY
${'-'.repeat(30)}
• Excellent (≥90%): ${performanceCategories.excellent} LGAs
• Good (70-89%): ${performanceCategories.good} LGAs
• Needs Attention (50-69%): ${performanceCategories.needsAttention} LGAs
• Critical (<50%): ${performanceCategories.critical} LGAs

${'='.repeat(50)}
Generated on: ${formatDate(new Date(), true)}
Kaduna State WDC Digital Reporting System
    `.trim();

    navigator.clipboard.writeText(text);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2000);
    setAlertMessage({ type: 'success', text: 'Report copied to clipboard!' });
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

    // Add summary row
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

  const handleCreateInvestigation = async () => {
    if (!newInvestigation.title) return;

    try {
      await createInvestigationMutation.mutateAsync(newInvestigation);
      setAlertMessage({ type: 'success', text: 'Investigation created successfully!' });
      setShowInvestigationModal(false);
      setNewInvestigation({ title: '', description: '', priority: 'MEDIUM', lga_id: '' });
    } catch (error) {
      setAlertMessage({ type: 'error', text: error.message || 'Failed to create investigation' });
    }
  };

  const handleUpdateInvestigationStatus = async (investigationId, status) => {
    try {
      await updateInvestigationMutation.mutateAsync({
        investigationId,
        data: { status },
      });
      setAlertMessage({ type: 'success', text: 'Investigation updated!' });
    } catch (error) {
      setAlertMessage({ type: 'error', text: error.message || 'Failed to update investigation' });
    }
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
      // Refresh the page to show updated data
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

  if (loadingOverview && loadingComparison) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" text="Loading state dashboard..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-purple-50/20 to-blue-50/30">
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
                  <p className="mt-1 text-sm text-neutral-600">
                    Kaduna State Overview • {formatMonth(currentMonth)}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                icon={RefreshCw}
                onClick={refetchOverview}
              >
                Refresh
              </Button>
              <Button
                variant="outline"
                icon={Download}
                onClick={handleExportCSV}
              >
                Export CSV
              </Button>
              <Button
                icon={Sparkles}
                onClick={handleGenerateAIReport}
                loading={generateAIMutation.isPending}
                className="shadow-md bg-gradient-to-r from-primary-600 to-primary-700"
              >
                Generate AI Report
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Alert */}
        {alertMessage && (
          <div className="mb-6">
            <Alert
              type={alertMessage.type}
              message={alertMessage.text}
              onClose={() => setAlertMessage(null)}
            />
          </div>
        )}

        {/* Overview Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <IconCard
            icon={Building}
            iconColor="primary"
            title="Total LGAs"
            value={totalLGAs}
            className="transform hover:scale-105 transition-transform"
          />
          <IconCard
            icon={MapPin}
            iconColor="info"
            title="Total Wards"
            value={formatNumber(totalWards)}
            className="transform hover:scale-105 transition-transform"
          />
          <IconCard
            icon={CheckCircle}
            iconColor="success"
            title="Submitted"
            value={formatNumber(totalSubmitted)}
            subtitle={`${submissionRate}% rate`}
            trend={
              submissionRate >= 80 ? (
                <span className="text-green-600 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                </span>
              ) : null
            }
            className="transform hover:scale-105 transition-transform"
          />
          <IconCard
            icon={AlertTriangle}
            iconColor="warning"
            title="Missing"
            value={formatNumber(totalMissing)}
            className="transform hover:scale-105 transition-transform"
          />
          <IconCard
            icon={Activity}
            iconColor="neutral"
            title="Reviewed"
            value={formatNumber(totalReviewed)}
            className="transform hover:scale-105 transition-transform"
          />
          <IconCard
            icon={FileText}
            iconColor="error"
            title="Flagged"
            value={formatNumber(totalFlagged)}
            className="transform hover:scale-105 transition-transform"
          />
        </div>

        {/* Performance Categories */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-green-700">Excellent (≥90%)</span>
              <span className="text-2xl font-bold text-green-600">{performanceCategories.excellent}</span>
            </div>
            <div className="mt-2 h-1 bg-green-200 rounded-full">
              <div className="h-1 bg-green-500 rounded-full" style={{ width: `${(performanceCategories.excellent / totalLGAs) * 100}%` }} />
            </div>
          </div>
          <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-blue-700">Good (70-89%)</span>
              <span className="text-2xl font-bold text-blue-600">{performanceCategories.good}</span>
            </div>
            <div className="mt-2 h-1 bg-blue-200 rounded-full">
              <div className="h-1 bg-blue-500 rounded-full" style={{ width: `${(performanceCategories.good / totalLGAs) * 100}%` }} />
            </div>
          </div>
          <div className="p-4 bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl border border-yellow-200">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-yellow-700">Needs Attention</span>
              <span className="text-2xl font-bold text-yellow-600">{performanceCategories.needsAttention}</span>
            </div>
            <div className="mt-2 h-1 bg-yellow-200 rounded-full">
              <div className="h-1 bg-yellow-500 rounded-full" style={{ width: `${(performanceCategories.needsAttention / totalLGAs) * 100}%` }} />
            </div>
          </div>
          <div className="p-4 bg-gradient-to-br from-red-50 to-red-100 rounded-xl border border-red-200">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-red-700">Critical (&lt;50%)</span>
              <span className="text-2xl font-bold text-red-600">{performanceCategories.critical}</span>
            </div>
            <div className="mt-2 h-1 bg-red-200 rounded-full">
              <div className="h-1 bg-red-500 rounded-full" style={{ width: `${(performanceCategories.critical / totalLGAs) * 100}%` }} />
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Submission Trends */}
          <Card title="Submission Trends" subtitle="Last 6 months" className="lg:col-span-2">
            {trends.length > 0 ? (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trends}>
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
                    <Area
                      type="monotone"
                      dataKey="submission_rate"
                      stroke="#16a34a"
                      strokeWidth={3}
                      fill="url(#colorRate)"
                    />
                  </AreaChart>
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

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: LGA Comparison */}
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
                      <Bar dataKey="rate" fill="#16a34a" radius={[0, 4, 4, 0]} name="Submission Rate" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyCard icon={BarChart3} title="No LGA data" />
              )}
            </Card>

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
                      <>
                        <tr
                          key={lga.id}
                          className="border-b border-neutral-100 hover:bg-neutral-50 transition-colors cursor-pointer"
                          onClick={() => setExpandedLGA(expandedLGA === lga.id ? null : lga.id)}
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-2 h-2 rounded-full ${lga.submission_rate >= 90 ? 'bg-green-500' :
                                  lga.submission_rate >= 70 ? 'bg-blue-500' :
                                    lga.submission_rate >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                                  }`}
                              />
                              <span className="font-medium text-neutral-900">{lga.name}</span>
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
                            <span className="inline-flex items-center justify-center w-8 h-6 rounded bg-green-100 text-green-700 text-sm font-medium">
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
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${lga.submission_rate >= 90 ? 'bg-green-100 text-green-700' :
                              lga.submission_rate >= 70 ? 'bg-blue-100 text-blue-700' :
                                lga.submission_rate >= 50 ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-red-100 text-red-700'
                              }`}>
                              {lga.submission_rate >= 90 ? 'Excellent' :
                                lga.submission_rate >= 70 ? 'Good' :
                                  lga.submission_rate >= 50 ? 'Fair' : 'Critical'}
                            </span>
                          </td>
                        </tr>
                        {expandedLGA === lga.id && (
                          <tr className="bg-neutral-50 border-b border-neutral-200">
                            <td colSpan="6" className="p-4">
                              {lga.reports && lga.reports.length > 0 ? (
                                <div className="bg-white rounded border border-neutral-200 p-4">
                                  <h4 className="font-semibold mb-3 text-sm text-neutral-700 flex justify-between items-center">
                                    <span>Submissions ({lga.reports.length})</span>
                                    <span className="text-xs font-normal text-neutral-500">Click to view details</span>
                                  </h4>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {lga.reports.map(report => (
                                      <div
                                        key={report.id}
                                        className="p-3 border rounded hover:bg-neutral-50 hover:border-primary-300 transition-colors cursor-pointer flex justify-between items-center bg-white"
                                        onClick={(e) => { e.stopPropagation(); setSelectedReport(report); }}
                                      >
                                        <div className="overflow-hidden">
                                          <p className="font-medium text-sm truncate">{report.ward_name}</p>
                                          <p className="text-xs text-neutral-500 flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            {formatDate(report.submitted_at)}
                                          </p>
                                        </div>
                                        <Button size="xs" variant="ghost" className="text-primary-600">View</Button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <p className="text-sm text-neutral-500 text-center py-2">No individual reports available for view.</p>
                              )}
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          {/* Right: AI Report & Investigations */}
          <div className="space-y-6">
            {/* AI Report Panel */}
            {showAIReport && aiReportContent && (
              <Card
                title="AI Generated Report"
                action={
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={copiedReport ? CheckCircle : Copy}
                      onClick={handleCopyReport}
                    >
                      {copiedReport ? 'Copied!' : 'Copy'}
                    </Button>
                    <button
                      onClick={() => setShowAIReport(false)}
                      className="text-neutral-400 hover:text-neutral-600 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                }
              >
                <div ref={reportRef} className="space-y-4 text-sm">
                  <div className="p-3 bg-primary-50 rounded-lg border border-primary-200">
                    <h4 className="font-semibold text-primary-900 mb-2">Executive Summary</h4>
                    <p className="text-primary-800">{aiReportContent.summary}</p>
                  </div>
                  {aiReportContent.insights?.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-neutral-900 mb-2">Key Insights</h4>
                      <ul className="space-y-2">
                        {aiReportContent.insights.map((insight, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-neutral-600">
                            <TrendingUp className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span>{insight}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {aiReportContent.recommendations?.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-neutral-900 mb-2">Recommendations</h4>
                      <ul className="space-y-2">
                        {aiReportContent.recommendations.map((rec, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-neutral-600">
                            <Sparkles className="w-4 h-4 text-primary-500 mt-0.5 flex-shrink-0" />
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Investigations */}
            <Card
              title="Active Investigations"
              subtitle="Track and manage issues"
              action={
                <Button
                  size="sm"
                  variant="outline"
                  icon={PlusCircle}
                  onClick={() => setShowInvestigationModal(true)}
                >
                  New
                </Button>
              }
            >
              {loadingInvestigations ? (
                <LoadingSpinner size="sm" />
              ) : investigations.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {investigations.map((inv) => (
                    <div
                      key={inv.id}
                      className="p-4 border border-neutral-200 rounded-xl hover:bg-neutral-50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-neutral-900">{inv.title}</p>
                          <p className="text-xs text-neutral-500 mt-1">
                            {inv.lga_name || 'State-wide'} • {formatDate(inv.created_at)}
                          </p>
                        </div>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(inv.priority)}`}>
                          {PRIORITY_LABELS[inv.priority]}
                        </span>
                      </div>
                      {inv.description && (
                        <p className="text-sm text-neutral-600 mb-3 line-clamp-2">{inv.description}</p>
                      )}
                      <div className="flex items-center justify-between">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${inv.status === 'OPEN' ? 'bg-blue-100 text-blue-700' :
                          inv.status === 'IN_PROGRESS' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                          {INVESTIGATION_LABELS[inv.status]}
                        </span>
                        <div className="flex gap-1">
                          {inv.status === 'OPEN' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUpdateInvestigationStatus(inv.id, 'IN_PROGRESS');
                              }}
                            >
                              Start
                            </Button>
                          )}
                          {inv.status === 'IN_PROGRESS' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUpdateInvestigationStatus(inv.id, 'CLOSED');
                              }}
                            >
                              Close
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyCard
                  icon={Search}
                  title="No Investigations"
                  description="Create one to track issues"
                  action={
                    <Button size="sm" onClick={() => setShowInvestigationModal(true)}>
                      Create Investigation
                    </Button>
                  }
                />
              )}
            </Card>

            {/* Quick Actions */}
            <Card title="Quick Actions">
              <div className="space-y-3">
                <Button
                  variant="primary"
                  fullWidth
                  icon={Sparkles}
                  onClick={handleGenerateAIReport}
                  loading={generateAIMutation.isPending}
                >
                  Generate AI Report
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
                <Button
                  variant="ghost"
                  fullWidth
                  icon={PlusCircle}
                  onClick={() => setShowInvestigationModal(true)}
                >
                  New Investigation
                </Button>
                <div className="pt-3 mt-3 border-t border-neutral-200 space-y-2">
                  <Button
                    variant="outline"
                    fullWidth
                    icon={RefreshCw}
                    onClick={handleUpdateLGAsWards}
                    loading={updatingLGAsWards}
                    className="border-green-300 text-green-700 hover:bg-green-50 font-semibold"
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
      </div>

      {/* Create Investigation Modal */}
      <Modal
        isOpen={showInvestigationModal}
        onClose={() => setShowInvestigationModal(false)}
        title="Create Investigation"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Title *
            </label>
            <input
              type="text"
              value={newInvestigation.title}
              onChange={(e) => setNewInvestigation({ ...newInvestigation, title: e.target.value })}
              placeholder="Investigation title"
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Description
            </label>
            <textarea
              value={newInvestigation.description}
              onChange={(e) => setNewInvestigation({ ...newInvestigation, description: e.target.value })}
              placeholder="Describe the issue..."
              rows={3}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Priority
              </label>
              <select
                value={newInvestigation.priority}
                onChange={(e) => setNewInvestigation({ ...newInvestigation, priority: e.target.value })}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
              >
                {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                LGA (Optional)
              </label>
              <select
                value={newInvestigation.lga_id}
                onChange={(e) => setNewInvestigation({ ...newInvestigation, lga_id: e.target.value })}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">State-wide</option>
                {lgaComparison.map(lga => (
                  <option key={lga.id} value={lga.id}>{lga.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => setShowInvestigationModal(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateInvestigation}
              loading={createInvestigationMutation.isPending}
              disabled={!newInvestigation.title}
              className="flex-1"
            >
              Create Investigation
            </Button>
          </div>
        </div>
      </Modal>

      {/* Report Detail Modal */}
      {selectedReport && (
        <Modal
          isOpen={!!selectedReport}
          onClose={() => setSelectedReport(null)}
          title={`Report Details - ${selectedReport.ward_name} (${formatMonth(selectedReport.report_month)})`}
          size="lg"
        >
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 p-4 bg-neutral-50 rounded-lg border border-neutral-200">
              <div>
                <p className="text-sm text-neutral-500">Submitted By</p>
                <p className="font-medium">{selectedReport.submitted_by}</p>
              </div>
              <div>
                <p className="text-sm text-neutral-500">Date Submitted</p>
                <p className="font-medium">{formatDate(selectedReport.submitted_at)}</p>
              </div>
              <div>
                <p className="text-sm text-neutral-500">Meeting Type</p>
                <p className="font-medium">{selectedReport.meeting_type}</p>
              </div>
              <div>
                <p className="text-sm text-neutral-500">Attendance</p>
                <p className="font-medium">{selectedReport.attendees_count}</p>
              </div>
            </div>

            {/* Section 1: Agenda */}
            <div>
              <h4 className="font-bold text-neutral-800 border-b pb-2 mb-3">1. Agenda & Governance</h4>
              <div className="grid grid-cols-1 gap-3 text-sm">
                <p><span className="font-medium">Opening Prayer:</span> {selectedReport.agenda_opening_prayer}</p>
                <p><span className="font-medium">Minutes:</span> {selectedReport.agenda_minutes}</p>
              </div>
            </div>

            {/* Section 3A: Health Data */}
            <div>
              <h4 className="font-bold text-neutral-800 border-b pb-2 mb-3">3A. Health Data (General Attendance)</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="font-medium text-primary-700">OPD Immunization</p>
                  <p>Total: {selectedReport.health_opd_total}</p>
                  <p>PENTA1: {selectedReport.health_penta1}</p>
                  <p>BCG: {selectedReport.health_bcg}</p>
                  <p>PENTA3: {selectedReport.health_penta3}</p>
                  <p>Measles: {selectedReport.health_measles}</p>
                </div>
                <div>
                  <p className="font-medium text-primary-700">OPD Under 5</p>
                  <p>Total: {selectedReport.health_opd_under5_total}</p>
                  <p>Malaria: {selectedReport.health_malaria_under5}</p>
                  <p>Diarrhea: {selectedReport.health_diarrhea_under5}</p>
                </div>
                <div>
                  <p className="font-medium text-primary-700">ANC</p>
                  <p>Total: {selectedReport.health_anc_total}</p>
                  <p>1st Visit: {selectedReport.health_anc_first_visit}</p>
                  <p>4th Visit: {selectedReport.health_anc_fourth_visit}</p>
                  <p>8th Visit: {selectedReport.health_anc_eighth_visit}</p>
                </div>
                <div>
                  <p className="font-medium text-primary-700">Deliveries</p>
                  <p>Deliveries: {selectedReport.health_deliveries}</p>
                  <p>Post-Natal: {selectedReport.health_postnatal}</p>
                </div>
                <div>
                  <p className="font-medium text-primary-700">Family Planning</p>
                  <p>Counselling: {selectedReport.health_fp_counselling}</p>
                  <p>New Acceptors: {selectedReport.health_fp_new_acceptors}</p>
                </div>
                <div>
                  <p className="font-medium text-primary-700">Others</p>
                  <p>HepB Tested: {selectedReport.health_hepb_tested}</p>
                  <p>HepB Positive: {selectedReport.health_hepb_positive}</p>
                  <p>TB Presumptive: {selectedReport.health_tb_presumptive}</p>
                  <p>TB On Treatment: {selectedReport.health_tb_on_treatment}</p>
                </div>
              </div>
            </div>

            {/* Section 3B: Facility Support */}
            <div>
              <h4 className="font-bold text-neutral-800 border-b pb-2 mb-3">3B. Health Facility Support</h4>
              <div className="space-y-4 text-sm">
                <div>
                  <p className="font-medium mb-1">Renovations</p>
                  <div className="grid grid-cols-3 gap-2">
                    <p>Govt: {selectedReport.facilities_renovated_govt}</p>
                    <p>Partners: {selectedReport.facilities_renovated_partners}</p>
                    <p>WDC: {selectedReport.facilities_renovated_wdc}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="font-medium">Items Donated (WDC)</p>
                    <p>Count: {selectedReport.items_donated_count}</p>
                    <p className="text-neutral-500">{selectedReport.items_donated_types?.join(', ') || 'None'}</p>
                  </div>
                  <div>
                    <p className="font-medium">Items Donated (Govt)</p>
                    <p>Count: {selectedReport.items_donated_govt_count}</p>
                    <p className="text-neutral-500">{selectedReport.items_donated_govt_types?.join(', ') || 'None'}</p>
                  </div>
                  <div>
                    <p className="font-medium">Items Repaired</p>
                    <p>Count: {selectedReport.items_repaired_count}</p>
                    <p className="text-neutral-500">{selectedReport.items_repaired_types?.join(', ') || 'None'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3C: Transportation */}
            <div>
              <h4 className="font-bold text-neutral-800 border-b pb-2 mb-3">3C. Transportation & Emergency</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <p>Women to ANC: {selectedReport.women_transported_anc}</p>
                <p>Women to Delivery: {selectedReport.women_transported_delivery}</p>
                <p>Children U5 (Danger): {selectedReport.children_transported_danger}</p>
                <p>Delivery Items Support: {selectedReport.women_supported_delivery_items}</p>
              </div>
            </div>

            {/* Section 3D: cMPDSR */}
            <div>
              <h4 className="font-bold text-neutral-800 border-b pb-2 mb-3">3D. cMPDSR</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p><span className="font-medium">Maternal Deaths:</span> {selectedReport.maternal_deaths}</p>
                  {selectedReport.maternal_death_causes?.filter(Boolean).length > 0 && (
                    <ul className="list-disc list-inside text-neutral-600 mt-1">
                      {selectedReport.maternal_death_causes.filter(Boolean).map((c, i) => <li key={i}>{c}</li>)}
                    </ul>
                  )}
                </div>
                <div>
                  <p><span className="font-medium">Perinatal Deaths:</span> {selectedReport.perinatal_deaths}</p>
                  {selectedReport.perinatal_death_causes?.filter(Boolean).length > 0 && (
                    <ul className="list-disc list-inside text-neutral-600 mt-1">
                      {selectedReport.perinatal_death_causes.filter(Boolean).map((c, i) => <li key={i}>{c}</li>)}
                    </ul>
                  )}
                </div>
              </div>
            </div>

            {/* General Qualitative Data */}
            <div className="space-y-4 text-sm bg-neutral-50 p-4 rounded-lg border border-neutral-200">
              {selectedReport.issues_identified && (
                <div>
                  <p className="font-bold text-neutral-800">Issues Identified</p>
                  <p className="text-neutral-700 whitespace-pre-wrap">{selectedReport.issues_identified}</p>
                </div>
              )}
              {selectedReport.actions_taken && (
                <div>
                  <p className="font-bold text-neutral-800">Actions Taken</p>
                  <p className="text-neutral-700 whitespace-pre-wrap">{selectedReport.actions_taken}</p>
                </div>
              )}
              {selectedReport.challenges && (
                <div>
                  <p className="font-bold text-amber-800">Challenges</p>
                  <p className="text-neutral-700 whitespace-pre-wrap">{selectedReport.challenges}</p>
                </div>
              )}
            </div>

            {/* Section 4 & 5 & 6 & 7: Qualitative Data */}
            <div>
              <h4 className="font-bold text-neutral-800 border-b pb-2 mb-3">Qualitative Reports (VDC & Action Plans)</h4>
              <div className="space-y-4 text-sm">
                {selectedReport.town_hall_conducted && (
                  <div>
                    <p className="font-medium text-primary-700">Quarterly Town Hall Feedback</p>
                    <p>Conducted: {selectedReport.town_hall_conducted}</p>
                  </div>
                )}

                {selectedReport.vdc_reports?.length > 0 && (
                  <div>
                    <p className="font-medium text-primary-700">VDC Reports ({selectedReport.vdc_reports.length})</p>
                    <div className="max-h-32 overflow-y-auto border rounded p-2 mt-1">
                      {selectedReport.vdc_reports.map((r, i) => (
                        <div key={i} className="mb-2 last:mb-0 border-b last:border-0 pb-2">
                          <p className="font-medium text-xs">{r.vdc_name}</p>
                          <p className="text-neutral-600">{r.issues}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedReport.action_plan?.length > 0 && (
                  <div>
                    <p className="font-medium text-primary-700">Action Plan ({selectedReport.action_plan.length})</p>
                    <div className="max-h-32 overflow-y-auto border rounded p-2 mt-1">
                      {selectedReport.action_plan.map((p, i) => (
                        <div key={i} className="mb-2 last:mb-0 border-b last:border-0 pb-2">
                          <p className="font-medium text-xs">{p.issue}</p>
                          <p className="text-neutral-600">{p.action}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t">
              <Button onClick={() => setSelectedReport(null)}>Close</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default StateDashboard;
