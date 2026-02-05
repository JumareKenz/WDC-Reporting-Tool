import { useState } from 'react';
import {
  FileText,
  Calendar,
  CheckCircle,
  Clock,
  Flag,
  Eye,
  Mic,
  ChevronRight,
  XCircle,
} from 'lucide-react';
import Button from '../common/Button';
import LoadingSpinner from '../common/LoadingSpinner';
import { EmptyCard } from '../common/Card';
import { REPORT_STATUS, STATUS_COLORS } from '../../utils/constants';

const SubmissionHistory = ({ reports = [], loading = false, showPagination = false }) => {
  const [selectedReport, setSelectedReport] = useState(null);

  // Status badge component
  const StatusBadge = ({ status }) => {
    const config = {
      [REPORT_STATUS.SUBMITTED]: {
        icon: Clock,
        text: 'Submitted',
        className: 'bg-blue-100 text-blue-800 border-blue-200',
      },
      [REPORT_STATUS.REVIEWED]: {
        icon: CheckCircle,
        text: 'Reviewed',
        className: 'bg-green-100 text-green-800 border-green-200',
      },
      [REPORT_STATUS.FLAGGED]: {
        icon: Flag,
        text: 'Flagged',
        className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      },
      [REPORT_STATUS.DRAFT]: {
        icon: FileText,
        text: 'Draft',
        className: 'bg-neutral-100 text-neutral-800 border-neutral-200',
      },
      [REPORT_STATUS.DECLINED]: {
        icon: XCircle,
        text: 'Declined',
        className: 'bg-red-100 text-red-800 border-red-200',
      },
    };

    const { icon: Icon, text, className } = config[status] || config[REPORT_STATUS.DRAFT];

    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${className}`}
      >
        <Icon className="w-3.5 h-3.5" />
        {text}
      </span>
    );
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Format month
  const formatMonth = (monthString) => {
    return new Date(monthString + '-01').toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
  };

  // Handle view details
  const handleViewDetails = (report) => {
    // Navigate to report details page or open modal
    window.location.href = `/reports/${report.id}`;
  };

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
        description="You haven't submitted any reports yet. Click 'Submit Report' to create your first submission."
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Table View for Desktop */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-neutral-200">
          <thead className="bg-neutral-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Month
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Meetings
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Attendees
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Submitted
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Voice Note
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-neutral-200">
            {reports.map((report) => (
              <tr
                key={report.id}
                className="hover:bg-neutral-50 transition-colors cursor-pointer"
                onClick={() => handleViewDetails(report)}
              >
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-neutral-400" />
                    <span className="text-sm font-medium text-neutral-900">
                      {formatMonth(report.report_month)}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <span className="text-sm text-neutral-900">
                    {report.meetings_held || 0}
                  </span>
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <span className="text-sm text-neutral-900">
                    {report.attendees_count || 0}
                  </span>
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <StatusBadge status={report.status} />
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <span className="text-sm text-neutral-600">
                    {formatDate(report.submitted_at)}
                  </span>
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  {report.has_voice_note ? (
                    <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-1 rounded">
                      <Mic className="w-3 h-3" />
                      Yes
                    </span>
                  ) : (
                    <span className="text-xs text-neutral-500">No</span>
                  )}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={Eye}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewDetails(report);
                    }}
                  >
                    View
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Card View for Mobile */}
      <div className="md:hidden space-y-3">
        {reports.map((report) => (
          <div
            key={report.id}
            onClick={() => handleViewDetails(report)}
            className="bg-white border border-neutral-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-neutral-400" />
                <span className="text-sm font-semibold text-neutral-900">
                  {formatMonth(report.report_month)}
                </span>
              </div>
              <StatusBadge status={report.status} />
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
              <div>
                <p className="text-neutral-600 text-xs">Meetings</p>
                <p className="font-medium text-neutral-900">
                  {report.meetings_held || 0}
                </p>
              </div>
              <div>
                <p className="text-neutral-600 text-xs">Attendees</p>
                <p className="font-medium text-neutral-900">
                  {report.attendees_count || 0}
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-neutral-100">
              <div className="flex items-center gap-3 text-xs text-neutral-600">
                <span>{formatDate(report.submitted_at)}</span>
                {report.has_voice_note && (
                  <span className="inline-flex items-center gap-1 text-green-700">
                    <Mic className="w-3 h-3" />
                    Voice Note
                  </span>
                )}
              </div>
              <ChevronRight className="w-4 h-4 text-neutral-400" />
            </div>
          </div>
        ))}
      </div>

      {/* Pagination (if needed) */}
      {showPagination && reports.length > 0 && (
        <div className="flex items-center justify-between pt-4 border-t border-neutral-200">
          <p className="text-sm text-neutral-600">
            Showing {reports.length} of {reports.length} reports
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubmissionHistory;
