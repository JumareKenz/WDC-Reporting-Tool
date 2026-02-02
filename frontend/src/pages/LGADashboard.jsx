import { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  MapPin,
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  Bell,
  Send,
  MessageSquare,
  Eye,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Filter,
  Search,
  ChevronDown,
  ChevronUp,
  Calendar,
  Activity,
} from 'lucide-react';
import Card, { IconCard, EmptyCard } from '../components/common/Card';
import Button from '../components/common/Button';
import Alert from '../components/common/Alert';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Modal, { ConfirmModal } from '../components/common/Modal';
import { useAuth } from '../hooks/useAuth';
import {
  useLGAWards,
  useLGAReports,
  useLGAMissingReports,
  useSendNotification,
  useReviewReport,
  useFeedback,
  useSendFeedback,
} from '../hooks/useLGAData';
import { formatDate, getStatusColor, formatMonth, getCurrentMonth, formatPercentage } from '../utils/formatters';
import { getTargetReportMonth, getSubmissionInfo } from '../utils/dateUtils';
import { REPORT_STATUS, STATUS_LABELS } from '../utils/constants';

const COLORS = ['#16a34a', '#3b82f6', '#f59e0b', '#ef4444'];

const LGADashboard = () => {
  const { user } = useAuth();
  const lgaId = user?.lga_id;
  const targetMonth = getTargetReportMonth();
  const submissionInfo = getSubmissionInfo();

  // Get LGA name from user object
  const lgaName = user?.lga?.name || 'Your LGA';

  const [selectedReport, setSelectedReport] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showNotifyModal, setShowNotifyModal] = useState(false);
  const [selectedWards, setSelectedWards] = useState([]);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [alertMessage, setAlertMessage] = useState(null);
  const [expandedWard, setExpandedWard] = useState(null);

  // Data fetching
  const { data: wardsData, isLoading: loadingWards, refetch: refetchWards } = useLGAWards(lgaId, { month: targetMonth });
  const { data: reportsData, isLoading: loadingReports, refetch: refetchReports } = useLGAReports(lgaId, { limit: 100 });
  const { data: missingData, isLoading: loadingMissing } = useLGAMissingReports(lgaId, { month: targetMonth });
  const { data: feedbackData, isLoading: loadingFeedback } = useFeedback({ limit: 10 });

  // Mutations
  const sendNotificationMutation = useSendNotification();
  const reviewMutation = useReviewReport();
  const sendFeedbackMutation = useSendFeedback();

  // Extract data with fallbacks
  const wards = wardsData?.data?.wards || wardsData?.wards || [];
  const reports = reportsData?.data?.reports || reportsData?.reports || [];
  const missingReports = missingData?.data?.missing || missingData?.missing || [];
  const feedback = feedbackData?.data?.messages || feedbackData?.messages || [];

  // Calculate stats - using actual data only
  const totalWards = wards.length;
  const submittedCount = wards.filter(w => w.submitted).length;
  const missingCount = missingReports.length;
  const submissionRate = totalWards > 0 ? Math.round((submittedCount / totalWards) * 100) : 0;
  const reviewedCount = reports.filter(r => r.status === 'REVIEWED').length;
  const flaggedCount = reports.filter(r => r.status === 'FLAGGED').length;

  // Filter reports
  const filteredReports = reports.filter(r => {
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    const matchesSearch = !searchTerm ||
      r.ward_name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Chart data
  const statusDistribution = [
    { name: 'Submitted', value: submittedCount - reviewedCount - flaggedCount, color: '#3b82f6' },
    { name: 'Reviewed', value: reviewedCount, color: '#16a34a' },
    { name: 'Flagged', value: flaggedCount, color: '#f59e0b' },
    { name: 'Missing', value: missingCount, color: '#ef4444' },
  ].filter(item => item.value > 0);

  const wardPerformance = wards.slice(0, 10).map(ward => ({
    name: ward.name?.substring(0, 10) || 'Ward',
    meetings: ward.total_meetings || 0,
    attendees: ward.total_attendees || 0,
  }));

  // Group reports by ward to show submission history
  const reportsByWard = reports.reduce((acc, report) => {
    const wardId = report.ward_id;
    if (!acc[wardId]) {
      acc[wardId] = [];
    }
    acc[wardId].push(report);
    return acc;
  }, {});

  const handleSendReminder = async () => {
    const targetWards = selectedWards.length > 0 ? selectedWards : missingReports.map(m => m.ward_id);
    if (targetWards.length === 0) return;

    try {
      await sendNotificationMutation.mutateAsync({
        ward_ids: targetWards,
        notification_type: 'REMINDER',
        title: 'Report Submission Reminder',
        message: `Please submit your monthly report for ${submissionInfo.month_name}. The deadline is approaching.`,
      });
      setAlertMessage({ type: 'success', text: `Reminders sent to ${targetWards.length} ward(s) successfully!` });
      setShowNotifyModal(false);
      setSelectedWards([]);
    } catch (error) {
      setAlertMessage({ type: 'error', text: error.message || 'Failed to send reminders' });
    }
  };

  const handleReviewReport = async (status) => {
    if (!selectedReport) return;

    try {
      await reviewMutation.mutateAsync({
        reportId: selectedReport.id,
        data: { status, reviewer_notes: '' },
      });
      setAlertMessage({ type: 'success', text: `Report marked as ${STATUS_LABELS[status]}` });
      setShowReviewModal(false);
      setSelectedReport(null);
      refetchReports();
      refetchWards();
    } catch (error) {
      setAlertMessage({ type: 'error', text: error.message || 'Failed to update report' });
    }
  };

  const handleSendFeedback = async () => {
    if (!feedbackMessage.trim()) return;

    try {
      await sendFeedbackMutation.mutateAsync({
        message: feedbackMessage,
        recipient_type: 'WDC',
      });
      setFeedbackMessage('');
      setAlertMessage({ type: 'success', text: 'Message sent!' });
    } catch (error) {
      setAlertMessage({ type: 'error', text: error.message || 'Failed to send message' });
    }
  };

  const toggleWardSelection = (wardId) => {
    setSelectedWards(prev =>
      prev.includes(wardId)
        ? prev.filter(id => id !== wardId)
        : [...prev, wardId]
    );
  };

  const selectAllMissing = () => {
    setSelectedWards(missingReports.map(m => m.ward_id));
  };

  if (loadingWards && loadingReports) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" text="Loading dashboard..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-teal-50 relative">
      {/* Ambient background blobs */}
      <div className="absolute top-0 left-0 w-80 h-80 bg-blue-300 rounded-full opacity-10 pointer-events-none" style={{ filter: 'blur(100px)' }} />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-teal-300 rounded-full opacity-10 pointer-events-none" style={{ filter: 'blur(120px)' }} />

      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-primary-600 to-teal-600 shadow-lg">
        <div className="absolute -top-16 -left-16 w-48 h-48 bg-white rounded-full opacity-5 pointer-events-none" />
        <div className="absolute -bottom-12 right-1/3 w-40 h-40 bg-white rounded-full opacity-5 pointer-events-none" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white">
                LGA Alliance Chairman Dashboard
              </h1>
              <p className="mt-1 text-sm text-blue-200">
                {lgaName} • {submissionInfo.month_name}
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                icon={RefreshCw}
                onClick={() => { refetchWards(); refetchReports(); }}
                className="bg-white/90 text-blue-700 border-white/50 hover:bg-white transition-all"
              >
                Refresh
              </Button>
              <Button
                icon={Bell}
                onClick={() => setShowNotifyModal(true)}
                disabled={missingCount === 0}
                variant="primary"
                size="lg"
                className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40 transition-all font-bold border-2 border-yellow-400"
              >
                Send Reminders ({missingCount})
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <IconCard
            icon={MapPin}
            iconColor="primary"
            title="Total Wards"
            value={totalWards}
            subtitle="In your LGA"
            variant="glass"
            className="card-lift"
          />
          <IconCard
            icon={CheckCircle}
            iconColor="success"
            title="Submitted"
            value={submittedCount}
            subtitle={`${submissionRate}% rate`}
            trend={
              submissionRate >= 80 ? (
                <span className="text-green-600 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> Good
                </span>
              ) : (
                <span className="text-yellow-600 flex items-center gap-1">
                  <TrendingDown className="w-3 h-3" /> Needs attention
                </span>
              )
            }
            variant="glass"
            className="card-lift"
          />
          <IconCard
            icon={AlertTriangle}
            iconColor={missingCount > 0 ? 'warning' : 'success'}
            title="Missing"
            value={missingCount}
            subtitle={missingCount > 0 ? 'Action required' : 'All caught up!'}
            variant="glass"
            className="card-lift"
          />
          <IconCard
            icon={Activity}
            iconColor="info"
            title="Reviewed"
            value={reviewedCount}
            subtitle="Reports reviewed"
            variant="glass"
            className="card-lift"
          />
          <IconCard
            icon={FileText}
            iconColor="neutral"
            title="Flagged"
            value={flaggedCount}
            subtitle="Need attention"
            variant="glass"
            className="card-lift"
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Submission Progress */}
          <Card title="Submission Progress" className="lg:col-span-1">
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-neutral-600">Overall Progress</span>
                  <span className="font-bold text-neutral-900">{submissionRate}%</span>
                </div>
                <div className="w-full bg-neutral-200 rounded-full h-4 overflow-hidden">
                  <div
                    className={`h-4 rounded-full transition-all duration-500 ${
                      submissionRate >= 90 ? 'bg-gradient-to-r from-green-400 to-green-600' :
                      submissionRate >= 70 ? 'bg-gradient-to-r from-blue-400 to-blue-600' :
                      submissionRate >= 50 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' :
                      'bg-gradient-to-r from-red-400 to-red-600'
                    }`}
                    style={{ width: `${submissionRate}%` }}
                  />
                </div>
              </div>

              {/* Status Distribution Pie */}
              {statusDistribution.length > 0 && (
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={70}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {statusDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                {statusDistribution.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-xs text-neutral-600">{item.name}: {item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Ward Performance Chart */}
          <Card title="Ward Performance" subtitle="Meetings & Attendees" className="lg:col-span-2">
            {wardPerformance.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={wardPerformance}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="meetings" fill="#16a34a" name="Meetings" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="attendees" fill="#3b82f6" name="Attendees" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyCard icon={Activity} title="No data" description="Ward performance data will appear here" />
            )}
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Ward Status & Reports */}
          <div className="lg:col-span-2 space-y-6">
            {/* Missing Reports Alert */}
            {missingCount > 0 && (
              <Card
                title="Missing Reports"
                subtitle={`${missingCount} wards have not submitted for ${submissionInfo.month_name}`}
                action={
                  <Button size="sm" variant="outline" onClick={selectAllMissing}>
                    Select All
                  </Button>
                }
              >
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {(missingReports.length > 0 ? missingReports : Array.from({ length: missingCount }, (_, i) => ({
                    ward_id: i + 1,
                    ward_name: `Ward ${i + 1}`,
                    secretary_name: `Secretary ${i + 1}`,
                  }))).map((item) => (
                    <div
                      key={item.ward_id}
                      className={`flex items-center justify-between p-3 rounded-lg border transition-all duration-200 ${
                        selectedWards.includes(item.ward_id)
                          ? 'border-primary-500 bg-primary-50 shadow-sm'
                          : 'border-neutral-200 hover:bg-neutral-50 hover:border-neutral-300'
                      }`}
                    >
                      <label className="flex items-center gap-3 cursor-pointer flex-1">
                        <input
                          type="checkbox"
                          checked={selectedWards.includes(item.ward_id)}
                          onChange={() => toggleWardSelection(item.ward_id)}
                          className="w-4 h-4 text-primary-600 rounded border-neutral-300 focus:ring-primary-500"
                        />
                        <div>
                          <p className="font-medium text-neutral-900">{item.ward_name}</p>
                          <p className="text-sm text-neutral-500">
                            Secretary: {item.secretary_name || 'Not assigned'}
                          </p>
                        </div>
                      </label>
                      <span className="px-3 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-full animate-pulse">
                        Missing
                      </span>
                    </div>
                  ))}
                </div>
                {selectedWards.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-neutral-200">
                    <Button
                      icon={Send}
                      onClick={() => setShowNotifyModal(true)}
                      fullWidth
                      className="shadow-md"
                    >
                      Send Reminder to {selectedWards.length} Ward(s)
                    </Button>
                  </div>
                )}
              </Card>
            )}

            {/* Reports Table */}
            <Card
              title="Submitted Reports"
              subtitle="Review and manage ward submissions"
              action={
                <div className="flex flex-wrap gap-2 w-full">
                  <div className="relative flex-1 min-w-0">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <input
                      type="text"
                      placeholder="Search ward..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 pr-3 py-1.5 text-sm border border-neutral-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 w-full"
                    />
                  </div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-1.5 text-sm border border-neutral-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="all">All Status</option>
                    <option value={REPORT_STATUS.SUBMITTED}>Submitted</option>
                    <option value={REPORT_STATUS.REVIEWED}>Reviewed</option>
                    <option value={REPORT_STATUS.FLAGGED}>Flagged</option>
                  </select>
                </div>
              }
            >
              {loadingReports ? (
                <LoadingSpinner text="Loading reports..." />
              ) : filteredReports.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-neutral-200 bg-neutral-50">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-700">Ward</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-700">Month</th>
                        <th className="text-center py-3 px-4 text-sm font-semibold text-neutral-700">Meetings</th>
                        <th className="text-center py-3 px-4 text-sm font-semibold text-neutral-700">Attendees</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-700">Status</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-700">Submitted</th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-neutral-700">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredReports.map((report) => {
                        const wardReports = reportsByWard[report.ward_id] || [];
                        const isExpanded = expandedWard === report.ward_id;
                        return (
                          <>
                            <tr key={report.id} className="border-b border-neutral-100 hover:bg-neutral-50 transition-colors">
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => setExpandedWard(isExpanded ? null : report.ward_id)}
                                    className="text-neutral-400 hover:text-neutral-600"
                                  >
                                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                  </button>
                                  <div>
                                    <p className="font-medium text-neutral-900">{report.ward_name || 'Unknown Ward'}</p>
                                    {wardReports.length > 1 && (
                                      <p className="text-xs text-neutral-500">{wardReports.length} submissions</p>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-4 text-sm text-neutral-600">
                                {formatMonth(report.report_month)}
                              </td>
                              <td className="py-3 px-4 text-sm text-neutral-600 text-center">
                                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-700 font-medium">
                                  {report.meetings_held || 0}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-sm text-neutral-600 text-center">
                                <span className="inline-flex items-center justify-center w-10 h-8 rounded-full bg-blue-100 text-blue-700 font-medium">
                                  {report.attendees_count || 0}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(report.status)}`}>
                                  {STATUS_LABELS[report.status]}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-sm text-neutral-600">
                                {formatDate(report.submitted_at || report.created_at)}
                              </td>
                              <td className="py-3 px-4 text-right">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  icon={Eye}
                                  onClick={() => {
                                    setSelectedReport(report);
                                    setShowReviewModal(true);
                                  }}
                                >
                                  Review
                                </Button>
                              </td>
                            </tr>
                            {isExpanded && wardReports.length > 1 && (
                              <tr className="bg-blue-50 border-b border-blue-100">
                                <td colSpan="7" className="py-3 px-4">
                                  <div className="pl-8">
                                    <p className="text-sm font-semibold text-neutral-700 mb-2">Submission History:</p>
                                    <div className="flex flex-wrap gap-2">
                                      {wardReports.map((wr) => (
                                        <div
                                          key={wr.id}
                                          className="inline-flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-blue-200 text-sm"
                                        >
                                          <Calendar className="w-3 h-3 text-blue-600" />
                                          <span className="font-medium text-neutral-900">{formatMonth(wr.report_month)}</span>
                                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(wr.status)}`}>
                                            {STATUS_LABELS[wr.status]}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyCard
                  icon={FileText}
                  title="No Reports Found"
                  description={searchTerm || statusFilter !== 'all' ? 'Try changing the filters' : 'No reports submitted yet'}
                />
              )}
            </Card>
          </div>

          {/* Right: Messaging & Quick Stats */}
          <div className="space-y-6">
            {/* Submission Summary */}
            <Card title="This Month Summary">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl">
                    <p className="text-2xl font-bold text-green-600">{submittedCount}</p>
                    <p className="text-xs text-green-700">Submitted</p>
                  </div>
                  <div className="text-center p-4 bg-gradient-to-br from-red-50 to-red-100 rounded-xl">
                    <p className="text-2xl font-bold text-red-600">{missingCount}</p>
                    <p className="text-xs text-red-700">Missing</p>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
                  <span className="text-sm text-neutral-600">Submission Rate</span>
                  <span className={`text-lg font-bold ${
                    submissionRate >= 80 ? 'text-green-600' :
                    submissionRate >= 60 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {submissionRate}%
                  </span>
                </div>
              </div>
            </Card>

            {/* Feedback/Messages */}
            <Card title="Messages" subtitle="Communicate with ward secretaries">
              <div className="space-y-4">
                {/* Message Input */}
                <div>
                  <textarea
                    value={feedbackMessage}
                    onChange={(e) => setFeedbackMessage(e.target.value)}
                    placeholder="Type a message to ward secretaries..."
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 resize-none"
                    rows={3}
                  />
                  <Button
                    size="sm"
                    icon={Send}
                    onClick={handleSendFeedback}
                    disabled={!feedbackMessage.trim() || sendFeedbackMutation.isPending}
                    loading={sendFeedbackMutation.isPending}
                    className="mt-2"
                    fullWidth
                  >
                    Send Message
                  </Button>
                </div>

                {/* Recent Messages */}
                <div className="border-t border-neutral-200 pt-4">
                  <h4 className="text-sm font-medium text-neutral-700 mb-3">Recent Messages</h4>
                  {loadingFeedback ? (
                    <LoadingSpinner size="sm" />
                  ) : feedback.length > 0 ? (
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {feedback.slice(0, 5).map((msg) => (
                        <div key={msg.id} className="p-3 bg-neutral-50 rounded-lg hover:bg-neutral-100 transition-colors">
                          <p className="text-sm text-neutral-900">{msg.message}</p>
                          <p className="text-xs text-neutral-500 mt-1">
                            {formatDate(msg.created_at, true)}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-neutral-500 text-center py-4">No messages yet</p>
                  )}
                </div>
              </div>
            </Card>

            {/* Quick Actions */}
            <Card title="Quick Actions">
              <div className="space-y-2">
                <Button
                  variant="outline"
                  fullWidth
                  icon={Bell}
                  onClick={() => setShowNotifyModal(true)}
                  disabled={missingCount === 0}
                >
                  Send Reminders
                </Button>
                <Button
                  variant="ghost"
                  fullWidth
                  icon={Calendar}
                >
                  View Calendar
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Review Modal */}
      <Modal
        isOpen={showReviewModal}
        onClose={() => {
          setShowReviewModal(false);
          setSelectedReport(null);
        }}
        title="Review Report"
        size="lg"
      >
        {selectedReport && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-neutral-50 rounded-lg">
                <p className="text-sm text-neutral-500">Ward</p>
                <p className="font-medium text-neutral-900">{selectedReport.ward_name}</p>
              </div>
              <div className="p-3 bg-neutral-50 rounded-lg">
                <p className="text-sm text-neutral-500">Month</p>
                <p className="font-medium text-neutral-900">{formatMonth(selectedReport.report_month)}</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-sm text-green-600">Meetings Held</p>
                <p className="font-bold text-2xl text-green-700">{selectedReport.meetings_held || 0}</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-600">Attendees</p>
                <p className="font-bold text-2xl text-blue-700">{selectedReport.attendees_count || 0}</p>
              </div>
            </div>

            {selectedReport.issues_identified && (
              <div>
                <p className="text-sm text-neutral-500 mb-1">Issues Identified</p>
                <p className="text-sm bg-neutral-50 p-3 rounded-lg">{selectedReport.issues_identified}</p>
              </div>
            )}

            {selectedReport.actions_taken && (
              <div>
                <p className="text-sm text-neutral-500 mb-1">Actions Taken</p>
                <p className="text-sm bg-neutral-50 p-3 rounded-lg">{selectedReport.actions_taken}</p>
              </div>
            )}

            {selectedReport.challenges && (
              <div>
                <p className="text-sm text-neutral-500 mb-1">Challenges</p>
                <p className="text-sm bg-yellow-50 p-3 rounded-lg text-yellow-800">{selectedReport.challenges}</p>
              </div>
            )}

            <div className="flex gap-3 pt-4 border-t border-neutral-200">
              <Button
                variant="success"
                icon={CheckCircle}
                onClick={() => handleReviewReport(REPORT_STATUS.REVIEWED)}
                loading={reviewMutation.isPending}
                className="flex-1"
              >
                Mark Reviewed
              </Button>
              <Button
                variant="danger"
                icon={AlertTriangle}
                onClick={() => handleReviewReport(REPORT_STATUS.FLAGGED)}
                loading={reviewMutation.isPending}
                className="flex-1"
              >
                Flag Report
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Notify Modal */}
      <ConfirmModal
        isOpen={showNotifyModal}
        onClose={() => setShowNotifyModal(false)}
        onConfirm={handleSendReminder}
        title="Send Reminder Notifications"
        message={`Are you sure you want to send reminder notifications to ${selectedWards.length || missingCount} ward(s) that have not submitted their reports for ${submissionInfo.month_name}?`}
        confirmText="Send Reminders"
        variant="primary"
        loading={sendNotificationMutation.isPending}
      />
    </div>
  );
};

export default LGADashboard;
