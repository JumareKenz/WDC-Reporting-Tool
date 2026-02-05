import { useState } from 'react';
import {
  FileText,
  CheckCircle,
  AlertTriangle,
  Clock,
  Eye,
  Filter,
  Search,
  Calendar,
  Users,
  Activity,
  TrendingUp,
  Download,
  BarChart3,
  XCircle,
} from 'lucide-react';
import Card, { IconCard, EmptyCard } from '../components/common/Card';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Alert from '../components/common/Alert';
import Modal from '../components/common/Modal';
import { useAuth } from '../hooks/useAuth';
import { useLGAReports, useReviewReport } from '../hooks/useLGAData';
import { formatDate, formatMonth, getStatusColor } from '../utils/formatters';
import { REPORT_STATUS, STATUS_LABELS } from '../utils/constants';

const LGAReportsPage = () => {
  const { user } = useAuth();
  const lgaId = user?.lga_id;

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState('all');
  const [selectedReport, setSelectedReport] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [alertMessage, setAlertMessage] = useState(null);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineReason, setDeclineReason] = useState('');

  const { data: reportsData, isLoading, refetch } = useLGAReports(lgaId, { limit: 100 });
  const reviewMutation = useReviewReport();

  const reports = reportsData?.data?.reports || reportsData?.reports || [];

  // Filter reports
  const filteredReports = reports.filter(report => {
    const matchesSearch = !searchTerm ||
      report.ward_name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' || report.status === statusFilter;

    const matchesMonth =
      monthFilter === 'all' || report.report_month === monthFilter;

    return matchesSearch && matchesStatus && matchesMonth;
  });

  // Get unique months for filter
  const uniqueMonths = [...new Set(reports.map(r => r.report_month))].sort().reverse();

  // Calculate statistics
  const totalReports = reports.length;
  const submittedCount = reports.filter(r => r.status === REPORT_STATUS.SUBMITTED).length;
  const reviewedCount = reports.filter(r => r.status === REPORT_STATUS.REVIEWED).length;
  const flaggedCount = reports.filter(r => r.status === REPORT_STATUS.FLAGGED).length;
  const declinedCount = reports.filter(r => r.status === REPORT_STATUS.DECLINED).length;
  const totalMeetings = reports.reduce((sum, r) => sum + (r.meetings_held || 0), 0);
  const totalAttendees = reports.reduce((sum, r) => sum + (r.attendees_count || 0), 0);

  const handleReviewReport = async (reportId, action, reason = null) => {
    try {
      await reviewMutation.mutateAsync({
        reportId,
        data: { action, decline_reason: reason },
      });
      const actionLabel = action === 'approve' ? 'approved' : 'declined';
      setAlertMessage({ type: 'success', text: `Report ${actionLabel} successfully` });
      setShowDetailsModal(false);
      setShowDeclineModal(false);
      setSelectedReport(null);
      setDeclineReason('');
      refetch();
    } catch (error) {
      setAlertMessage({ type: 'error', text: error.message || 'Failed to update report' });
    }
  };

  const handleApprove = () => {
    if (selectedReport) {
      handleReviewReport(selectedReport.id, 'approve');
    }
  };

  const handleDeclineClick = () => {
    setShowDeclineModal(true);
  };

  const handleDeclineSubmit = () => {
    if (!declineReason.trim()) {
      setAlertMessage({ type: 'error', text: 'Please provide a reason for declining' });
      return;
    }
    if (selectedReport) {
      handleReviewReport(selectedReport.id, 'decline', declineReason.trim());
    }
  };

  const handleViewDetails = (report) => {
    setSelectedReport(report);
    setShowDetailsModal(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" text="Loading reports..." />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Reports Management</h1>
        <p className="text-sm text-neutral-600 mt-1">
          {user?.lga_name} • {totalReports} Total Reports
        </p>
      </div>

      {/* Alert */}
      {alertMessage && (
        <Alert
          type={alertMessage.type}
          message={alertMessage.text}
          onClose={() => setAlertMessage(null)}
        />
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <IconCard
          icon={FileText}
          iconColor="primary"
          title="Total Reports"
          value={totalReports}
          subtitle="All submissions"
          className="transform hover:scale-105 transition-transform"
        />
        <IconCard
          icon={Clock}
          iconColor="info"
          title="Pending Review"
          value={submittedCount}
          subtitle="Needs attention"
          className="transform hover:scale-105 transition-transform"
        />
        <IconCard
          icon={CheckCircle}
          iconColor="success"
          title="Reviewed"
          value={reviewedCount}
          subtitle="Completed"
          className="transform hover:scale-105 transition-transform"
        />
        <IconCard
          icon={AlertTriangle}
          iconColor="warning"
          title="Flagged"
          value={flaggedCount}
          subtitle="Requires action"
          className="transform hover:scale-105 transition-transform"
        />
        <IconCard
          icon={Activity}
          iconColor="info"
          title="Total Meetings"
          value={totalMeetings}
          subtitle="Across all wards"
          className="transform hover:scale-105 transition-transform"
        />
        <IconCard
          icon={Users}
          iconColor="success"
          title="Total Attendees"
          value={totalAttendees}
          subtitle="Community engagement"
          className="transform hover:scale-105 transition-transform"
        />
      </div>

      {/* Filters and Search */}
      <Card
        title="Report Filters"
        action={
          <Button
            size="sm"
            variant="outline"
            icon={Download}
            onClick={() => alert('Export feature coming soon!')}
          >
            Export
          </Button>
        }
      >
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-0">
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Search Ward
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                placeholder="Search by ward name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-neutral-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-neutral-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="all">All Status</option>
              <option value={REPORT_STATUS.SUBMITTED}>Submitted</option>
              <option value={REPORT_STATUS.REVIEWED}>Reviewed</option>
              <option value={REPORT_STATUS.FLAGGED}>Flagged</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Month
            </label>
            <select
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="px-4 py-2 border border-neutral-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="all">All Months</option>
              {uniqueMonths.map(month => (
                <option key={month} value={month}>
                  {formatMonth(month)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Reports Table */}
      <Card
        title={`Reports (${filteredReports.length})`}
        subtitle="View and manage submitted reports"
      >
        {filteredReports.length > 0 ? (
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
                {filteredReports.map((report) => (
                  <tr
                    key={report.id}
                    className="border-b border-neutral-100 hover:bg-neutral-50 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${report.status === REPORT_STATUS.REVIEWED ? 'bg-green-500' :
                          report.status === REPORT_STATUS.FLAGGED ? 'bg-red-500' :
                            'bg-blue-500'
                          }`} />
                        <p className="font-medium text-neutral-900">{report.ward_name || 'Unknown Ward'}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-neutral-600">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {formatMonth(report.report_month)}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-green-100 text-green-700 font-bold">
                        {report.meetings_held || 0}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center justify-center w-12 h-10 rounded-full bg-blue-100 text-blue-700 font-bold">
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
                        onClick={() => handleViewDetails(report)}
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyCard
            icon={FileText}
            title="No Reports Found"
            description={searchTerm || statusFilter !== 'all' || monthFilter !== 'all' ? 'Try changing the filters' : 'No reports submitted yet'}
          />
        )}
      </Card>

      {/* Report Details Modal */}
      <Modal
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedReport(null);
        }}
        title="Report Details"
        size="xl"
      >
        {selectedReport && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between p-5 bg-gradient-to-r from-primary-50 to-blue-50 rounded-xl">
              <div>
                <h3 className="text-xl font-bold text-neutral-900">{selectedReport.ward_name}</h3>
                <p className="text-sm text-neutral-600 mt-1">
                  {formatMonth(selectedReport.report_month)} • Submitted {formatDate(selectedReport.submitted_at || selectedReport.created_at)}
                </p>
              </div>
              <span className={`px-4 py-2 text-sm font-semibold rounded-full ${getStatusColor(selectedReport.status)}`}>
                {STATUS_LABELS[selectedReport.status]}
              </span>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-5 bg-gradient-to-br from-green-50 to-green-100 rounded-xl">
                <div className="flex items-center gap-3 mb-2">
                  <Activity className="w-5 h-5 text-green-600" />
                  <p className="text-sm text-green-700 font-medium">Meetings Held</p>
                </div>
                <p className="text-4xl font-bold text-green-700">{selectedReport.meetings_held || 0}</p>
              </div>
              <div className="p-5 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl">
                <div className="flex items-center gap-3 mb-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  <p className="text-sm text-blue-700 font-medium">Total Attendees</p>
                </div>
                <p className="text-4xl font-bold text-blue-700">{selectedReport.attendees_count || 0}</p>
              </div>
            </div>

            {/* Report Content */}
            <div className="space-y-4">
              {selectedReport.issues_identified && (
                <div className="p-4 bg-neutral-50 rounded-lg border border-neutral-200">
                  <h4 className="font-semibold text-neutral-900 mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-600" />
                    Issues Identified
                  </h4>
                  <p className="text-sm text-neutral-700 leading-relaxed">{selectedReport.issues_identified}</p>
                </div>
              )}

              {selectedReport.actions_taken && (
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <h4 className="font-semibold text-neutral-900 mb-2 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    Actions Taken
                  </h4>
                  <p className="text-sm text-neutral-700 leading-relaxed">{selectedReport.actions_taken}</p>
                </div>
              )}

              {selectedReport.challenges && (
                <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <h4 className="font-semibold text-neutral-900 mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-600" />
                    Challenges
                  </h4>
                  <p className="text-sm text-neutral-700 leading-relaxed">{selectedReport.challenges}</p>
                </div>
              )}

              {selectedReport.recommendations && (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-neutral-900 mb-2 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-blue-600" />
                    Recommendations
                  </h4>
                  <p className="text-sm text-neutral-700 leading-relaxed">{selectedReport.recommendations}</p>
                </div>
              )}

              {selectedReport.additional_notes && (
                <div className="p-4 bg-neutral-50 rounded-lg border border-neutral-200">
                  <h4 className="font-semibold text-neutral-900 mb-2">Additional Notes</h4>
                  <p className="text-sm text-neutral-700 leading-relaxed">{selectedReport.additional_notes}</p>
                </div>
              )}
            </div>

            {/* Decline Reason Display (for declined reports) */}
            {selectedReport.status === REPORT_STATUS.DECLINED && selectedReport.decline_reason && (
              <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                <h4 className="font-semibold text-red-900 mb-2 flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-red-600" />
                  Decline Reason
                </h4>
                <p className="text-sm text-red-700 leading-relaxed">{selectedReport.decline_reason}</p>
                {selectedReport.reviewer_name && (
                  <p className="text-xs text-red-500 mt-2">
                    Declined by: {selectedReport.reviewer_name}
                  </p>
                )}
              </div>
            )}

            {/* Actions */}
            {selectedReport.status === REPORT_STATUS.SUBMITTED && (
              <div className="space-y-4 pt-4 border-t border-neutral-200">
                {showDeclineModal ? (
                  <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                    <h4 className="font-semibold text-red-900 mb-3">Decline Report</h4>
                    <textarea
                      value={declineReason}
                      onChange={(e) => setDeclineReason(e.target.value)}
                      placeholder="Please provide a reason for declining this report (required)..."
                      className="w-full p-3 border border-red-300 rounded-lg text-sm focus:ring-red-500 focus:border-red-500"
                      rows={3}
                    />
                    <div className="flex gap-2 mt-3">
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={handleDeclineSubmit}
                        loading={reviewMutation.isPending}
                        disabled={!declineReason.trim()}
                      >
                        Confirm Decline
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setShowDeclineModal(false);
                          setDeclineReason('');
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <Button
                      variant="success"
                      icon={CheckCircle}
                      onClick={handleApprove}
                      loading={reviewMutation.isPending}
                      className="flex-1"
                    >
                      Approve Report
                    </Button>
                    <Button
                      variant="danger"
                      icon={XCircle}
                      onClick={handleDeclineClick}
                      loading={reviewMutation.isPending}
                      className="flex-1"
                    >
                      Decline Report
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default LGAReportsPage;
