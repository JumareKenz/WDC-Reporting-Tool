import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
} from 'lucide-react';
import Card, { IconCard, EmptyCard } from '../components/common/Card';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { useMySubmissions } from '../hooks/useWDCData';
import { formatDate, formatMonth, getCurrentMonth } from '../utils/formatters';
import { REPORT_STATUS, STATUS_LABELS } from '../utils/constants';

const MyReportsPage = () => {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const currentMonth = getCurrentMonth();

  const { data: submissionsData, isLoading } = useMySubmissions();

  // Extract reports from submissions data - handle multiple response formats
  let responseData = {};
  if (submissionsData) {
    if (Array.isArray(submissionsData)) {
      responseData = { reports: submissionsData, submitted_months: [] };
    } else if (submissionsData.reports) {
      responseData = submissionsData;
    } else if (submissionsData.data) {
      responseData = submissionsData.data;
    }
  }
  
  const reports = responseData.reports || [];

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

  const handleSelectReport = (report) => {
    navigate(`/reports/${report.id}`);
  };

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
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
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
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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
          icon={Flag}
          iconColor="warning"
          title="Flagged"
          value={flaggedCount}
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
                        onClick={() => handleSelectReport(report)}
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

    </div>
  );
};

export default MyReportsPage;
