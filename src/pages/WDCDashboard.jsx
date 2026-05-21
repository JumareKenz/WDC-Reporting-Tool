import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  CheckCircle,
  Clock,
  Users,
  CalendarDays,
  PlusCircle,
  AlertCircle,
  Bell,
  TrendingUp,
  Activity,
  BarChart3,
  Eye,
  ChevronRight,
  History,
  Award,
  Mic,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import Card, { IconCard, EmptyCard } from '../components/common/Card';
import Button from '../components/common/Button';
import Alert from '../components/common/Alert';
import LoadingSpinner from '../components/common/LoadingSpinner';
import DataFreshness from '../components/common/DataFreshness';
import SubmissionHistory from '../components/wdc/SubmissionHistory';
import MonthSelectionModal from '../components/wdc/MonthSelectionModal';
import {
  useCheckSubmission,
  useReports,
  useNotifications,
  useMySubmissions,
} from '../hooks/useWDCData';
import { useAuth } from '../hooks/useAuth';
import { formatDate, formatMonth, getCurrentMonth } from '../utils/formatters';
import { getTargetReportMonth, getSubmissionInfo, formatMonthDisplay } from '../utils/dateUtils';

const WDCDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Modal state
  const [showMonthModal, setShowMonthModal] = useState(false);
  const [showAllHistory, setShowAllHistory] = useState(false);

  // Get target report month based on current date
  const targetMonth = getTargetReportMonth();
  const submissionInfo = getSubmissionInfo();

  // Fetch submission status for target month
  const {
    data: submissionStatus,
    isLoading: checkingSubmission,
    refetch: refetchSubmission,
    dataUpdatedAt: submissionUpdatedAt,
    isRefetching: isRefetchingSubmission,
    error: checkSubmissionError,
  } = useCheckSubmission(targetMonth);

  // Fetch reports history using my-submissions endpoint (more reliable)
  const {
    data: submissionsData,
    isLoading: loadingReports,
    refetch: refetchReports,
    dataUpdatedAt: reportsUpdatedAt,
    isRefetching: isRefetchingReports,
    error: submissionsError,
  } = useMySubmissions();

  // Fetch notifications
  const {
    data: notificationsData,
    isLoading: loadingNotifications,
    refetch: refetchNotifications,
  } = useNotifications({ unread_only: true, limit: 5 });

  // Combine refetching state for DataFreshness
  const latestUpdatedAt = Math.max(submissionUpdatedAt || 0, reportsUpdatedAt || 0);
  const isRefetchingAny = isRefetchingSubmission || isRefetchingReports;
  const handleRefreshAll = () => {
    refetchSubmission();
    refetchReports();
    refetchNotifications();
  };

  const isSubmitted = submissionStatus?.submitted || false;
  
  // Extract reports from submissions data - handle multiple response formats
  // The API might return: {submitted_months, reports} or {data: {submitted_months, reports}}
  let responseData = {};
  if (submissionsData) {
    if (Array.isArray(submissionsData)) {
      // Direct array response
      responseData = { reports: submissionsData, submitted_months: [] };
    } else if (submissionsData.reports) {
      // Direct object response
      responseData = submissionsData;
    } else if (submissionsData.data) {
      // Nested data response
      responseData = submissionsData.data;
    }
  }
  
  const reports = responseData.reports || [];
  const submittedMonths = responseData.submitted_months || [];
  
  // Check auth token
  const authToken = localStorage.getItem('token');
  
  // Debug logging
  console.log('WDCDashboard Debug:', {
    targetMonth,
    hasAuthToken: !!authToken,
    submissionStatus,
    submissionsData,
    reportsCount: reports.length,
    submittedMonthsCount: submittedMonths.length,
    userWardId: user?.ward?.id,
    loadingReports,
    submissionsError: submissionsError?.message,
    checkSubmissionError: checkSubmissionError?.message,
  });
  
  const notifications = notificationsData?.data?.notifications || notificationsData?.notifications || [];

  // Calculate statistics
  const totalReports = reports.length;
  const totalAttendees = reports.reduce((sum, report) => sum + (report.attendees_count || 0), 0);
  const reviewedCount = reports.filter(r => r.status === 'REVIEWED').length;

  // Get ward and LGA names from user object
  const wardName = user?.ward?.name || 'Your Ward';
  const lgaName = user?.ward?.lga_name || user?.lga?.name || 'Your LGA';

  // Handle submit report - now always opens month selection modal
  const handleSubmitReport = () => {
    setShowMonthModal(true);
  };

  // Get recent reports for history preview
  const recentReports = reports.slice(0, showAllHistory ? reports.length : 5);

  if (checkingSubmission || loadingReports) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" text="Loading dashboard..." />
      </div>
    );
  }
  
  // Show error state if data failed to load
  if (submissionsError) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <Alert
            type="error"
            title="Failed to Load Reports"
            message={submissionsError.message || 'Could not load your reports. Please try refreshing the page.'}
          />
          <Button 
            onClick={() => window.location.reload()} 
            className="mt-4 w-full"
          >
            Refresh Page
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50 relative">
      {/* Ambient background blobs */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-300 rounded-full opacity-10 pointer-events-none" style={{ filter: 'blur(120px)' }} />
      <div className="absolute bottom-1/2 left-0 w-80 h-80 bg-teal-200 rounded-full opacity-10 pointer-events-none" style={{ filter: 'blur(100px)' }} />

      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-primary-600 via-emerald-600 to-teal-600 shadow-lg">
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-white rounded-full opacity-5 pointer-events-none" />
        <div className="absolute -bottom-12 left-1/3 w-40 h-40 bg-white rounded-full opacity-5 pointer-events-none" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white">
                WDC Secretary Dashboard
              </h1>
              <div className="flex items-center gap-3 mt-1">
                <p className="text-sm text-emerald-200">
                  {wardName} • {lgaName}
                </p>
                <DataFreshness
                  dataUpdatedAt={latestUpdatedAt}
                  onRefresh={handleRefreshAll}
                  isRefetching={isRefetchingAny}
                />
              </div>
            </div>
            {/* Submit Button - Always Active */}
            <button
              onClick={handleSubmitReport}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-yellow-400 hover:bg-yellow-300 active:bg-yellow-500 text-neutral-900 font-bold text-base shadow-lg shadow-yellow-500/30 hover:shadow-xl hover:shadow-yellow-400/40 transition-all duration-200 border-2 border-yellow-300"
            >
              <PlusCircle className="w-5 h-5" />
              Submit New Report
            </button>
          </div>
        </div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Current Month Status Alert */}
        {!checkingSubmission && (
          <div className="mb-6">
            {isSubmitted ? (
              <Alert
                type="success"
                title="Report Submitted"
                message={`Your report for ${submissionInfo.month_name} has been submitted successfully. You can view it in your submission history below.`}
              />
            ) : (
              <Alert
                type="warning"
                title="Action Required"
                message={`You have not submitted your report for ${submissionInfo.month_name} yet. Click "Submit New Report" to complete your submission.`}
              />
            )}
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <IconCard
            icon={FileText}
            iconColor={isSubmitted ? 'success' : 'warning'}
            title="Current Report"
            value={isSubmitted ? 'Submitted' : 'Pending'}
            subtitle={submissionInfo.month_name}
            variant="glass"
            className="card-lift"
          />
          <IconCard
            icon={History}
            iconColor="primary"
            title="Total Reports"
            value={totalReports}
            subtitle="All time submissions"
            trend={
              <span className="text-green-600 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                {reviewedCount} reviewed
              </span>
            }
            variant="glass"
            className="card-lift"
          />
          <IconCard
            icon={Award}
            iconColor={totalReports > 0 ? 'success' : 'neutral'}
            title="Submission Rate"
            value={`${Math.min(totalReports, 12)}/12`}
            subtitle={totalReports >= 12 ? 'Excellent! Keep it up!' : `${12 - totalReports} more to reach yearly target`}
            variant="glass"
            className="card-lift"
          />
        </div>

        {/* Performance Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <Card className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-neutral-900">Performance Summary</h3>
              <span className="text-sm text-neutral-500">Last 6 months</span>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl">
                <Activity className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-green-700">{reviewedCount}</p>
                <p className="text-xs text-green-600">Reports Reviewed</p>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl">
                <BarChart3 className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-blue-700">{reports.filter(r => r.status === 'SUBMITTED').length + reviewedCount}</p>
                <p className="text-xs text-blue-600">Total Submitted</p>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl">
                <Clock className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-purple-700">{reports.filter(r => r.status === 'SUBMITTED').length}</p>
                <p className="text-xs text-purple-600">Pending Review</p>
              </div>
            </div>
          </Card>

          {/* Quick Actions */}
          <Card title="Quick Actions">
            <div className="space-y-3">
              <Button
                variant="primary"
                fullWidth
                icon={PlusCircle}
                onClick={handleSubmitReport}
              >
                Submit New Report
              </Button>
              <Button
                variant="outline"
                fullWidth
                icon={Eye}
                onClick={() => navigate('/wdc/reports')}
              >
                View All Reports
              </Button>
              <Button
                variant="ghost"
                fullWidth
                icon={Bell}
                onClick={() => navigate('/wdc/notifications')}
              >
                View Notifications ({notifications.length})
              </Button>
            </div>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Submission History */}
          <div className="lg:col-span-2">
            <Card
              title={
                <div className="flex items-center gap-2">
                  <History className="w-5 h-5 text-primary-600" />
                  Submission History
                </div>
              }
              subtitle={`${totalReports} reports submitted • Showing ${showAllHistory ? 'all' : 'recent 5'}`}
              action={
                reports.length > 5 && (
                  <button
                    onClick={() => setShowAllHistory(!showAllHistory)}
                    className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
                  >
                    {showAllHistory ? (
                      <>
                        Show Less <ChevronUp className="w-4 h-4" />
                      </>
                    ) : (
                      <>
                        View All <ChevronDown className="w-4 h-4" />
                      </>
                    )}
                  </button>
                )
              }
            >
              <EnhancedSubmissionHistory 
                reports={recentReports} 
                loading={loadingReports}
                onViewReport={(id) => navigate(`/reports/${id}`)}
              />
            </Card>
          </div>

          {/* Right Column - Notifications & Stats */}
          <div className="lg:col-span-1 space-y-6">
            {/* Notifications Card */}
            <Card
              title={
                <div className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-primary-600" />
                  Recent Notifications
                </div>
              }
              subtitle="Latest updates"
              action={
                notifications.length > 0 && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 animate-pulse">
                    {notifications.length} new
                  </span>
                )
              }
            >
              {loadingNotifications ? (
                <div className="py-8">
                  <LoadingSpinner text="Loading notifications..." />
                </div>
              ) : notifications.length > 0 ? (
                <div className="space-y-3">
                  {notifications.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                    />
                  ))}
                  <Button
                    variant="ghost"
                    fullWidth
                    icon={ChevronRight}
                    iconPosition="right"
                    onClick={() => navigate('/wdc/notifications')}
                  >
                    View All Notifications
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Bell className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
                  <p className="text-neutral-500">No new notifications</p>
                </div>
              )}
            </Card>

            {/* Submission Timeline */}
            <Card
              title={
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-primary-600" />
                  Submission Timeline
                </div>
              }
            >
              <div className="space-y-3">
                {submittedMonths.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {submittedMonths
                      .slice()
                      .sort()
                      .reverse()
                      .slice(0, 12)
                      .map((month) => (
                        <span
                          key={month}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-green-50 border border-green-200 text-green-700 text-xs font-medium"
                        >
                          <CheckCircle className="w-3 h-3" />
                          {formatMonthDisplay(month)}
                        </span>
                      ))}
                  </div>
                ) : (
                  <p className="text-sm text-neutral-500 text-center py-4">
                    No submissions yet. Start by submitting your first report!
                  </p>
                )}
                
                {/* Missing months indicator */}
                {submittedMonths.length < 12 && (
                  <div className="pt-3 border-t border-neutral-100">
                    <p className="text-xs text-neutral-500 mb-2">
                      Missing reports for:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {getMissingMonths(submittedMonths).slice(0, 6).map((month) => (
                        <span
                          key={month}
                          className="px-2 py-0.5 rounded bg-gray-100 text-gray-500 text-xs"
                        >
                          {formatMonthDisplay(month)}
                        </span>
                      ))}
                      {getMissingMonths(submittedMonths).length > 6 && (
                        <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-500 text-xs">
                          +{getMissingMonths(submittedMonths).length - 6} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Upcoming Deadlines */}
            <Card title="Current Status">
              <div className="space-y-3">
                <div className={`flex items-center gap-3 p-3 rounded-lg border ${
                  isSubmitted
                    ? 'bg-green-50 border-green-200'
                    : 'bg-yellow-50 border-yellow-200'
                }`}>
                  <CalendarDays className={`w-5 h-5 ${isSubmitted ? 'text-green-600' : 'text-yellow-600'}`} />
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${isSubmitted ? 'text-green-800' : 'text-yellow-800'}`}>
                      {submissionInfo.month_name} Report
                    </p>
                    <p className={`text-xs ${isSubmitted ? 'text-green-600' : 'text-yellow-600'}`}>
                      {isSubmitted ? '✓ Submitted successfully' : 'Submission pending'}
                    </p>
                  </div>
                  {isSubmitted ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-yellow-500" />
                  )}
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Month Selection Modal */}
      <MonthSelectionModal
        isOpen={showMonthModal}
        onClose={() => setShowMonthModal(false)}
        submittedMonths={submittedMonths}
        reports={reports}
      />
    </div>
  );
};

// Helper function to get missing months in the last 12 months
const getMissingMonths = (submittedMonths) => {
  const missing = [];
  const now = new Date();
  
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!submittedMonths.includes(monthStr)) {
      missing.push(monthStr);
    }
  }
  
  return missing;
};

// Enhanced Submission History Component
const EnhancedSubmissionHistory = ({ reports, loading, onViewReport }) => {
  if (loading) {
    return (
      <div className="py-12">
        <LoadingSpinner text="Loading submission history..." />
      </div>
    );
  }

  if (!reports || reports.length === 0) {
    return (
      <EmptyCard
        icon={FileText}
        title="No Submissions Yet"
        description="You haven't submitted any reports yet. Click 'Submit New Report' to create your first submission."
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-neutral-200">
          <thead className="bg-neutral-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Month
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Attendees
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Voice
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Submitted
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-neutral-200">
            {reports.map((report) => (
              <tr
                key={report.id}
                className="hover:bg-neutral-50 transition-colors"
              >
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center">
                      <CalendarDays className="w-4 h-4 text-primary-600" />
                    </div>
                    <span className="text-sm font-medium text-neutral-900">
                      {formatMonthDisplay(report.report_month)}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-center">
                  <span className="inline-flex items-center justify-center w-12 h-8 rounded-full bg-blue-50 text-blue-700 font-medium text-sm">
                    {report.attendees_count || 0}
                  </span>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-center">
                  {report.has_voice_note || report.voice_notes_count > 0 ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-medium">
                      <Mic className="w-3 h-3" />
                      {report.voice_notes_count || 1}
                    </span>
                  ) : (
                    <span className="text-neutral-400 text-xs">—</span>
                  )}
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <StatusBadge status={report.status} />
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-neutral-600">
                  {formatDate(report.submitted_at || report.created_at)}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={Eye}
                    onClick={() => onViewReport(report.id)}
                  >
                    View
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {reports.map((report) => (
          <div
            key={report.id}
            className="bg-white border border-neutral-200 rounded-xl p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center">
                  <CalendarDays className="w-4 h-4 text-primary-600" />
                </div>
                <span className="font-semibold text-neutral-900">
                  {formatMonthDisplay(report.report_month)}
                </span>
              </div>
              <StatusBadge status={report.status} />
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="text-center p-2 bg-blue-50 rounded-lg">
                <p className="text-lg font-bold text-blue-700">{report.attendees_count || 0}</p>
                <p className="text-xs text-blue-600">Attendees</p>
              </div>
              <div className="text-center p-2 bg-purple-50 rounded-lg">
                <p className="text-lg font-bold text-purple-700">{report.voice_notes_count || (report.has_voice_note ? 1 : 0)}</p>
                <p className="text-xs text-purple-600">Voice Notes</p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-neutral-100">
              <span className="text-xs text-neutral-500">
                {formatDate(report.submitted_at || report.created_at)}
              </span>
              <Button
                variant="ghost"
                size="sm"
                icon={Eye}
                onClick={() => onViewReport(report.id)}
              >
                View
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Status Badge Component
const StatusBadge = ({ status }) => {
  const config = {
    SUBMITTED: {
      icon: Clock,
      text: 'Submitted',
      className: 'bg-blue-50 text-blue-700 border-blue-200',
    },
    REVIEWED: {
      icon: CheckCircle,
      text: 'Reviewed',
      className: 'bg-green-50 text-green-700 border-green-200',
    },
    FLAGGED: {
      icon: AlertCircle,
      text: 'Flagged',
      className: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    },
    DRAFT: {
      icon: FileText,
      text: 'Draft',
      className: 'bg-neutral-100 text-neutral-700 border-neutral-200',
    },
    DECLINED: {
      icon: AlertCircle,
      text: 'Declined',
      className: 'bg-red-50 text-red-700 border-red-200',
    },
  };

  const { icon: Icon, text, className } = config[status] || config.DRAFT;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${className}`}>
      <Icon className="w-3.5 h-3.5" />
      {text}
    </span>
  );
};

// Notification Item Component
const NotificationItem = ({ notification }) => {
  const getIcon = () => {
    switch (notification.notification_type) {
      case 'REPORT_MISSING':
        return AlertCircle;
      case 'REPORT_SUBMITTED':
        return CheckCircle;
      case 'REPORT_REVIEWED':
        return FileText;
      case 'FEEDBACK':
        return Bell;
      case 'REMINDER':
        return Clock;
      default:
        return Bell;
    }
  };

  const getIconColor = () => {
    switch (notification.notification_type) {
      case 'REPORT_MISSING':
        return 'text-red-500 bg-red-50';
      case 'REPORT_SUBMITTED':
        return 'text-green-500 bg-green-50';
      case 'REPORT_REVIEWED':
        return 'text-blue-500 bg-blue-50';
      default:
        return 'text-primary-500 bg-primary-50';
    }
  };

  const Icon = getIcon();

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-neutral-50 transition-colors cursor-pointer group">
      <div className={`flex-shrink-0 p-2 rounded-lg ${getIconColor()}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-neutral-900 group-hover:text-primary-600 transition-colors">
          {notification.title}
        </p>
        <p className="text-sm text-neutral-600 mt-1 line-clamp-2">
          {notification.message}
        </p>
        <p className="text-xs text-neutral-400 mt-1">
          {formatDate(notification.created_at, true)}
        </p>
      </div>
    </div>
  );
};

export default WDCDashboard;
