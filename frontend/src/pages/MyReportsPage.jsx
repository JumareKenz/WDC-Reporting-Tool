import { useState } from 'react';
import {
  FileText,
  Calendar,
  CheckCircle,
  Clock,
  Flag,
  Eye,
  Download,
  Search,
  Filter,
  PlusCircle,
  Mic,
  Users,
  BarChart3,
} from 'lucide-react';
import Card, { IconCard, EmptyCard } from '../components/common/Card';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Modal from '../components/common/Modal';
import { useReports } from '../hooks/useWDCData';
import { formatDate, formatMonth, getCurrentMonth } from '../utils/formatters';
import { REPORT_STATUS, STATUS_LABELS } from '../utils/constants';

const MyReportsPage = () => {
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReport, setSelectedReport] = useState(null);
  const currentMonth = getCurrentMonth();

  const { data: reportsData, isLoading } = useReports({ limit: 100 });

  const reports = reportsData?.data?.reports || reportsData?.reports || [];

  const filteredReports = reports.filter(r => {
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    const matchesSearch = !searchTerm ||
      formatMonth(r.report_month)?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Statistics
  const totalReports = reports.length;
  const submittedCount = reports.filter(r => r.status === REPORT_STATUS.SUBMITTED).length;
  const reviewedCount = reports.filter(r => r.status === REPORT_STATUS.REVIEWED).length;
  const flaggedCount = reports.filter(r => r.status === REPORT_STATUS.FLAGGED).length;
  const totalMeetings = reports.reduce((sum, r) => sum + (r.meetings_held || 0), 0);
  const totalAttendees = reports.reduce((sum, r) => sum + (r.attendees_count || 0), 0);

  const getStatusBadge = (status) => {
    const config = {
      [REPORT_STATUS.SUBMITTED]: { color: 'bg-blue-100 text-blue-800', icon: Clock },
      [REPORT_STATUS.REVIEWED]: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      [REPORT_STATUS.FLAGGED]: { color: 'bg-yellow-100 text-yellow-800', icon: Flag },
      [REPORT_STATUS.DRAFT]: { color: 'bg-neutral-100 text-neutral-800', icon: FileText },
    };
    const { color, icon: Icon } = config[status] || config[REPORT_STATUS.DRAFT];

    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${color}`}>
        <Icon className="w-3.5 h-3.5" />
        {STATUS_LABELS[status]}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" text="Loading your reports..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">My Reports</h1>
          <p className="text-sm text-neutral-600 mt-1">
            View and manage all your submitted monthly reports
          </p>
        </div>
        <Button
          icon={PlusCircle}
          onClick={() => window.location.href = '/wdc'}
        >
          Submit New Report
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <IconCard
          icon={FileText}
          iconColor="primary"
          title="Total Reports"
          value={totalReports}
          className="transform hover:scale-105 transition-transform"
        />
        <IconCard
          icon={CheckCircle}
          iconColor="success"
          title="Reviewed"
          value={reviewedCount}
          className="transform hover:scale-105 transition-transform"
        />
        <IconCard
          icon={Users}
          iconColor="info"
          title="Total Meetings"
          value={totalMeetings}
          className="transform hover:scale-105 transition-transform"
        />
        <IconCard
          icon={BarChart3}
          iconColor="warning"
          title="Total Attendees"
          value={totalAttendees}
          className="transform hover:scale-105 transition-transform"
        />
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Search by month..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-neutral-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            {['all', REPORT_STATUS.SUBMITTED, REPORT_STATUS.REVIEWED, REPORT_STATUS.FLAGGED].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  statusFilter === status
                    ? 'bg-primary-600 text-white'
                    : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                }`}
              >
                {status === 'all' ? 'All' : STATUS_LABELS[status]}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Reports Table */}
      <Card>
        {filteredReports.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-700">Month</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-neutral-700">Meetings</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-neutral-700">Attendees</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-neutral-700">Voice Notes</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-700">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-700">Submitted</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-neutral-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredReports.map((report) => (
                  <tr key={report.id} className="border-b border-neutral-100 hover:bg-neutral-50 transition-colors">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-neutral-400" />
                        <span className="font-medium text-neutral-900">
                          {formatMonth(report.report_month)}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="inline-flex items-center justify-center w-10 h-8 rounded-full bg-green-100 text-green-700 font-medium">
                        {report.meetings_held || 0}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="inline-flex items-center justify-center w-12 h-8 rounded-full bg-blue-100 text-blue-700 font-medium">
                        {report.attendees_count || 0}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      {report.has_voice_note || report.voice_notes_count > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-medium">
                          <Mic className="w-3 h-3" />
                          {report.voice_notes_count || 1}
                        </span>
                      ) : (
                        <span className="text-neutral-400 text-xs">None</span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      {getStatusBadge(report.status)}
                    </td>
                    <td className="py-4 px-4 text-sm text-neutral-600">
                      {formatDate(report.submitted_at || report.created_at)}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={Eye}
                        onClick={() => setSelectedReport(report)}
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
            description={statusFilter !== 'all' || searchTerm ? 'Try changing the filters' : 'You haven\'t submitted any reports yet'}
            action={
              <Button icon={PlusCircle} onClick={() => window.location.href = '/wdc'}>
                Submit Your First Report
              </Button>
            }
          />
        )}
      </Card>

      {/* Report Details Modal */}
      <Modal
        isOpen={!!selectedReport}
        onClose={() => setSelectedReport(null)}
        title={`Report: ${formatMonth(selectedReport?.report_month)}`}
        size="lg"
      >
        {selectedReport && (
          <div className="space-y-6">
            {/* Status Banner */}
            <div className={`p-4 rounded-xl ${
              selectedReport.status === REPORT_STATUS.REVIEWED
                ? 'bg-green-50 border border-green-200'
                : selectedReport.status === REPORT_STATUS.FLAGGED
                ? 'bg-yellow-50 border border-yellow-200'
                : 'bg-blue-50 border border-blue-200'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-neutral-900">Report Status</p>
                  {getStatusBadge(selectedReport.status)}
                </div>
                <p className="text-sm text-neutral-600">
                  Submitted: {formatDate(selectedReport.submitted_at, true)}
                </p>
              </div>
            </div>

            {/* Report Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-green-50 rounded-xl text-center">
                <p className="text-2xl font-bold text-green-700">{selectedReport.meetings_held || 0}</p>
                <p className="text-xs text-green-600">Meetings Held</p>
              </div>
              <div className="p-4 bg-blue-50 rounded-xl text-center">
                <p className="text-2xl font-bold text-blue-700">{selectedReport.attendees_count || 0}</p>
                <p className="text-xs text-blue-600">Total Attendees</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-xl text-center">
                <p className="text-2xl font-bold text-purple-700">{selectedReport.voice_notes_count || 0}</p>
                <p className="text-xs text-purple-600">Voice Notes</p>
              </div>
              <div className="p-4 bg-yellow-50 rounded-xl text-center">
                <p className="text-2xl font-bold text-yellow-700">{selectedReport.issues_count || 0}</p>
                <p className="text-xs text-yellow-600">Issues Reported</p>
              </div>
            </div>

            {/* Details */}
            {selectedReport.issues_identified && (
              <div>
                <h4 className="text-sm font-semibold text-neutral-700 mb-2">Issues Identified</h4>
                <p className="text-sm text-neutral-600 bg-neutral-50 p-3 rounded-lg">
                  {selectedReport.issues_identified}
                </p>
              </div>
            )}

            {selectedReport.actions_taken && (
              <div>
                <h4 className="text-sm font-semibold text-neutral-700 mb-2">Actions Taken</h4>
                <p className="text-sm text-neutral-600 bg-neutral-50 p-3 rounded-lg">
                  {selectedReport.actions_taken}
                </p>
              </div>
            )}

            {selectedReport.challenges && (
              <div>
                <h4 className="text-sm font-semibold text-neutral-700 mb-2">Challenges</h4>
                <p className="text-sm text-yellow-800 bg-yellow-50 p-3 rounded-lg">
                  {selectedReport.challenges}
                </p>
              </div>
            )}

            {selectedReport.reviewer_notes && (
              <div>
                <h4 className="text-sm font-semibold text-neutral-700 mb-2">Reviewer Notes</h4>
                <p className="text-sm text-primary-800 bg-primary-50 p-3 rounded-lg border border-primary-200">
                  {selectedReport.reviewer_notes}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-neutral-200">
              <Button variant="outline" onClick={() => setSelectedReport(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default MyReportsPage;
