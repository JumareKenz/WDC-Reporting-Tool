import { useState, useRef } from 'react';
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

const COLORS = ['#16a34a', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

// Demo LGA data for fallback
const DEMO_LGAS = [
  { id: 1, name: 'Birnin Gwari', total_wards: 11, submitted_count: 9, missing_count: 2, reviewed_count: 7, submission_rate: 82 },
  { id: 2, name: 'Chikun', total_wards: 12, submitted_count: 11, missing_count: 1, reviewed_count: 9, submission_rate: 92 },
  { id: 3, name: 'Giwa', total_wards: 11, submitted_count: 8, missing_count: 3, reviewed_count: 6, submission_rate: 73 },
  { id: 4, name: 'Igabi', total_wards: 12, submitted_count: 10, missing_count: 2, reviewed_count: 8, submission_rate: 83 },
  { id: 5, name: 'Ikara', total_wards: 10, submitted_count: 7, missing_count: 3, reviewed_count: 5, submission_rate: 70 },
  { id: 6, name: 'Jaba', total_wards: 9, submitted_count: 9, missing_count: 0, reviewed_count: 8, submission_rate: 100 },
  { id: 7, name: "Jema'a", total_wards: 12, submitted_count: 10, missing_count: 2, reviewed_count: 7, submission_rate: 83 },
  { id: 8, name: 'Kachia', total_wards: 11, submitted_count: 9, missing_count: 2, reviewed_count: 7, submission_rate: 82 },
  { id: 9, name: 'Kaduna North', total_wards: 8, submitted_count: 8, missing_count: 0, reviewed_count: 7, submission_rate: 100 },
  { id: 10, name: 'Kaduna South', total_wards: 9, submitted_count: 8, missing_count: 1, reviewed_count: 6, submission_rate: 89 },
  { id: 11, name: 'Kagarko', total_wards: 10, submitted_count: 7, missing_count: 3, reviewed_count: 5, submission_rate: 70 },
  { id: 12, name: 'Kajuru', total_wards: 10, submitted_count: 8, missing_count: 2, reviewed_count: 6, submission_rate: 80 },
  { id: 13, name: 'Kaura', total_wards: 11, submitted_count: 9, missing_count: 2, reviewed_count: 7, submission_rate: 82 },
  { id: 14, name: 'Kauru', total_wards: 10, submitted_count: 7, missing_count: 3, reviewed_count: 5, submission_rate: 70 },
  { id: 15, name: 'Kubau', total_wards: 12, submitted_count: 10, missing_count: 2, reviewed_count: 8, submission_rate: 83 },
  { id: 16, name: 'Kudan', total_wards: 10, submitted_count: 9, missing_count: 1, reviewed_count: 7, submission_rate: 90 },
  { id: 17, name: 'Lere', total_wards: 11, submitted_count: 8, missing_count: 3, reviewed_count: 6, submission_rate: 73 },
  { id: 18, name: 'Makarfi', total_wards: 10, submitted_count: 8, missing_count: 2, reviewed_count: 6, submission_rate: 80 },
  { id: 19, name: 'Sabon Gari', total_wards: 11, submitted_count: 10, missing_count: 1, reviewed_count: 8, submission_rate: 91 },
  { id: 20, name: 'Sanga', total_wards: 10, submitted_count: 7, missing_count: 3, reviewed_count: 5, submission_rate: 70 },
  { id: 21, name: 'Soba', total_wards: 11, submitted_count: 9, missing_count: 2, reviewed_count: 7, submission_rate: 82 },
  { id: 22, name: 'Zangon Kataf', total_wards: 12, submitted_count: 10, missing_count: 2, reviewed_count: 8, submission_rate: 83 },
  { id: 23, name: 'Zaria', total_wards: 13, submitted_count: 12, missing_count: 1, reviewed_count: 10, submission_rate: 92 },
];

// Demo trends data
const DEMO_TRENDS = [
  { month: 'Aug', submission_rate: 65, submitted: 145, total: 223 },
  { month: 'Sep', submission_rate: 72, submitted: 161, total: 223 },
  { month: 'Oct', submission_rate: 78, submitted: 174, total: 223 },
  { month: 'Nov', submission_rate: 82, submitted: 183, total: 223 },
  { month: 'Dec', submission_rate: 85, submitted: 190, total: 223 },
  { month: 'Jan', submission_rate: 88, submitted: 196, total: 223 },
];

// Demo investigations
const DEMO_INVESTIGATIONS = [
  { id: 1, title: 'Low submission rate in Sanga LGA', description: 'Investigating consistent low submission rates', priority: 'HIGH', status: 'OPEN', lga_name: 'Sanga', created_at: new Date().toISOString() },
  { id: 2, title: 'Report quality review - Chikun', description: 'Reviewing quality of reports submitted', priority: 'MEDIUM', status: 'IN_PROGRESS', lga_name: 'Chikun', created_at: new Date(Date.now() - 86400000).toISOString() },
  { id: 3, title: 'Missing coordinator - Kauru', description: 'LGA coordinator position vacant', priority: 'URGENT', status: 'OPEN', lga_name: 'Kauru', created_at: new Date(Date.now() - 172800000).toISOString() },
];

const StateDashboard = () => {
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
  const [copiedReport, setCopiedReport] = useState(false);

  // Data fetching
  const { data: overviewData, isLoading: loadingOverview, refetch: refetchOverview } = useOverview({ month: currentMonth });
  const { data: comparisonData, isLoading: loadingComparison } = useLGAComparison({ month: currentMonth });
  const { data: trendsData, isLoading: loadingTrends } = useTrends({ months: 6 });
  const { data: investigationsData, isLoading: loadingInvestigations } = useInvestigations({ limit: 20 });

  // Mutations
  const generateAIMutation = useGenerateAIReport();
  const createInvestigationMutation = useCreateInvestigation();
  const updateInvestigationMutation = useUpdateInvestigation();

  // Extract data with fallbacks
  const overview = overviewData?.data || overviewData || {};
  const lgaComparison = comparisonData?.data?.lgas || comparisonData?.lgas || DEMO_LGAS;
  const trends = trendsData?.data?.trends || trendsData?.trends || DEMO_TRENDS;
  const investigations = investigationsData?.data?.investigations || investigationsData?.investigations || DEMO_INVESTIGATIONS;

  // Calculate overview stats
  const totalLGAs = overview.total_lgas || 23;
  const totalWards = overview.total_wards || lgaComparison.reduce((sum, lga) => sum + (lga.total_wards || 0), 0) || 255;
  const totalSubmitted = overview.total_submitted || lgaComparison.reduce((sum, lga) => sum + (lga.submitted_count || 0), 0) || 196;
  const totalMissing = overview.total_missing || totalWards - totalSubmitted;
  const totalReviewed = overview.total_reviewed || lgaComparison.reduce((sum, lga) => sum + (lga.reviewed_count || 0), 0) || 156;
  const totalFlagged = overview.total_flagged || 12;
  const submissionRate = overview.submission_rate || Math.round((totalSubmitted / totalWards) * 100);

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
                        <stop offset="5%" stopColor="#16a34a" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#16a34a" stopOpacity={0}/>
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
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400" />
                  <input
                    type="text"
                    placeholder="Search LGA..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 pr-3 py-1.5 text-sm border border-neutral-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 w-48"
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
                      <tr
                        key={lga.id}
                        className="border-b border-neutral-100 hover:bg-neutral-50 transition-colors cursor-pointer"
                        onClick={() => setExpandedLGA(expandedLGA === lga.id ? null : lga.id)}
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-2 h-2 rounded-full ${
                                lga.submission_rate >= 90 ? 'bg-green-500' :
                                lga.submission_rate >= 70 ? 'bg-blue-500' :
                                lga.submission_rate >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                            />
                            <span className="font-medium text-neutral-900">{lga.name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center text-sm text-neutral-600">{lga.total_wards}</td>
                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex items-center justify-center w-8 h-6 rounded bg-green-100 text-green-700 text-sm font-medium">
                            {lga.submitted_count}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-flex items-center justify-center w-8 h-6 rounded text-sm font-medium ${
                            lga.missing_count > 0 ? 'bg-red-100 text-red-700' : 'bg-neutral-100 text-neutral-500'
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
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            lga.submission_rate >= 90 ? 'bg-green-100 text-green-700' :
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
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          inv.status === 'OPEN' ? 'bg-blue-100 text-blue-700' :
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
                  icon={PlusCircle}
                  onClick={() => setShowInvestigationModal(true)}
                >
                  New Investigation
                </Button>
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
    </div>
  );
};

export default StateDashboard;
