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
} from 'lucide-react';
import Card, { IconCard, EmptyCard } from '../components/common/Card';
import Button from '../components/common/Button';
import Alert from '../components/common/Alert';
import LoadingSpinner from '../components/common/LoadingSpinner';
import SubmissionHistory from '../components/wdc/SubmissionHistory';
import {
  useCheckSubmission,
  useReports,
  useNotifications,
} from '../hooks/useWDCData';
import { useAuth } from '../hooks/useAuth';
import { formatDate, formatMonth, getCurrentMonth } from '../utils/formatters';

const WDCDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const currentMonth = getCurrentMonth();

  // Fetch submission status for current month
  const {
    data: submissionStatus,
    isLoading: checkingSubmission,
    refetch: refetchSubmission,
  } = useCheckSubmission(currentMonth);

  // Fetch reports history
  const {
    data: reportsData,
    isLoading: loadingReports,
    refetch: refetchReports,
  } = useReports({ limit: 10 });

  // Fetch notifications
  const { data: notificationsData, isLoading: loadingNotifications } =
    useNotifications({ unread_only: true, limit: 5 });

  const isSubmitted = submissionStatus?.data?.submitted || submissionStatus?.submitted || false;
  const reports = reportsData?.data?.reports || reportsData?.reports || [];
  const notifications = notificationsData?.data?.notifications || notificationsData?.notifications || [];

  // Calculate statistics
  const totalReports = reportsData?.data?.total || reportsData?.total || reports.length;
  const totalMeetings = reports.reduce((sum, report) => sum + (report.meetings_held || 0), 0);
  const totalAttendees = reports.reduce((sum, report) => sum + (report.attendees_count || 0), 0);
  const reviewedCount = reports.filter(r => r.status === 'REVIEWED').length;


  if (checkingSubmission && loadingReports) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" text="Loading dashboard..." />
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
              <p className="mt-1 text-sm text-emerald-200">
                {user?.ward_name || 'Your Ward'} • {user?.lga_name || 'Your LGA'}
              </p>
            </div>
            <Button
              icon={PlusCircle}
              onClick={() => navigate('/wdc/submit')}
              size="lg"
              className="bg-white text-primary-700 hover:bg-emerald-50 shadow-lg shadow-black/20 hover:shadow-xl transition-all font-semibold"
            >
              Submit Monthly Report
            </Button>
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
                message={`Your report for ${formatMonth(currentMonth)} has been submitted successfully. You can view it in your submission history below.`}
              />
            ) : (
              <Alert
                type="warning"
                title="Action Required"
                message={`You have not submitted your report for ${formatMonth(currentMonth)} yet. Click "Submit Monthly Report" to complete your submission.`}
              />
            )}
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <IconCard
            icon={FileText}
            iconColor={isSubmitted ? 'success' : 'warning'}
            title="Current Month"
            value={isSubmitted ? 'Submitted' : 'Pending'}
            subtitle={formatMonth(currentMonth)}
            variant="glass"
            className="card-lift"
          />
          <IconCard
            icon={CheckCircle}
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
            icon={Users}
            iconColor="info"
            title="Meetings Held"
            value={totalMeetings}
            subtitle={`${totalAttendees} total attendees`}
            variant="glass"
            className="card-lift"
          />
          <IconCard
            icon={Bell}
            iconColor={notifications.length > 0 ? 'warning' : 'neutral'}
            title="Notifications"
            value={notifications.length}
            subtitle={
              notifications.length > 0
                ? 'Unread notifications'
                : 'All caught up!'
            }
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
                <p className="text-2xl font-bold text-blue-700">{Math.round(totalAttendees / Math.max(totalMeetings, 1))}</p>
                <p className="text-xs text-blue-600">Avg. Attendees</p>
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
                icon={FileText}
                onClick={() => navigate('/wdc/submit')}
              >
                Submit Report
              </Button>
              <Button
                variant="outline"
                fullWidth
                icon={Eye}
                onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })}
              >
                View History
              </Button>
              <Button
                variant="ghost"
                fullWidth
                icon={Bell}
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
              title="Submission History"
              subtitle="Your recent monthly reports"
              action={
                <span className="text-sm text-neutral-500">
                  {totalReports} total
                </span>
              }
            >
              <SubmissionHistory reports={reports} loading={loadingReports} />
            </Card>
          </div>

          {/* Right Column - Notifications */}
          <div className="lg:col-span-1">
            <Card
              title="Recent Notifications"
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

            {/* Upcoming Deadlines */}
            <Card title="Upcoming" className="mt-6">
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <CalendarDays className="w-5 h-5 text-yellow-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-yellow-800">
                      {formatMonth(currentMonth)} Report
                    </p>
                    <p className="text-xs text-yellow-600">
                      {isSubmitted ? 'Submitted' : 'Due by end of month'}
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

    </div>
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
