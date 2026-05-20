import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Users,
  FileText,
  Download,
  CheckCircle,
  Clock,
  Flag,
  Mic,
} from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Alert from '../components/common/Alert';
import { useReportById, useDownloadVoiceNote } from '../hooks/useWDCData';
import { REPORT_STATUS } from '../utils/constants';

const ReportDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const {
    data: reportData,
    isLoading,
    error,
  } = useReportById(id);

  const downloadMutation = useDownloadVoiceNote();

  const report = reportData?.data;

  // Handle voice note download
  const handleDownloadVoiceNote = (voiceNote) => {
    downloadMutation.mutate({
      voiceNoteId: voiceNote.id,
      filename: voiceNote.file_name,
    });
  };

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
    };

    const { icon: Icon, text, className } = config[status] || config[REPORT_STATUS.DRAFT];

    return (
      <span
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border ${className}`}
      >
        <Icon className="w-4 h-4" />
        {text}
      </span>
    );
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" text="Loading report details..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-neutral-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Alert
            type="error"
            title="Error Loading Report"
            message={error.message || 'Failed to load report details.'}
          />
          <Button
            variant="outline"
            icon={ArrowLeft}
            onClick={() => navigate(-1)}
            className="mt-4"
          >
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-neutral-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Alert type="warning" message="Report not found." />
          <Button
            variant="outline"
            icon={ArrowLeft}
            onClick={() => navigate(-1)}
            className="mt-4"
          >
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <div className="bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                icon={ArrowLeft}
                onClick={() => navigate(-1)}
                size="sm"
              >
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-neutral-900">
                  Report Details
                </h1>
                <p className="mt-1 text-sm text-neutral-600">
                  {formatMonth(report.report_month)} - {report.ward?.name} Ward
                </p>
              </div>
            </div>
            <StatusBadge status={report.status} />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary-100 rounded-lg">
                <Calendar className="w-6 h-6 text-primary-600" />
              </div>
              <div>
                <p className="text-sm text-neutral-600">Meetings Held</p>
                <p className="text-2xl font-bold text-neutral-900">
                  {report.meetings_held}
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-lg">
                <Users className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-neutral-600">Total Attendees</p>
                <p className="text-2xl font-bold text-neutral-900">
                  {report.attendees_count}
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-neutral-600">Submitted</p>
                <p className="text-sm font-medium text-neutral-900">
                  {formatDate(report.submitted_at)}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Report Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Issues Identified */}
            <Card title="Issues Identified">
              <p className="text-neutral-700 whitespace-pre-wrap">
                {report.issues_identified}
              </p>
            </Card>

            {/* Actions Taken */}
            <Card title="Actions Taken">
              <p className="text-neutral-700 whitespace-pre-wrap">
                {report.actions_taken}
              </p>
            </Card>

            {/* Challenges */}
            <Card title="Challenges Faced">
              <p className="text-neutral-700 whitespace-pre-wrap">
                {report.challenges || 'None reported'}
              </p>
            </Card>

            {/* Recommendations */}
            <Card title="Recommendations">
              <p className="text-neutral-700 whitespace-pre-wrap">
                {report.recommendations || 'None provided'}
              </p>
            </Card>

            {/* Additional Notes */}
            {report.additional_notes && (
              <Card title="Additional Notes">
                <p className="text-neutral-700 whitespace-pre-wrap">
                  {report.additional_notes}
                </p>
              </Card>
            )}
          </div>

          {/* Right Column - Metadata & Voice Notes */}
          <div className="lg:col-span-1 space-y-6">
            {/* Report Information */}
            <Card title="Report Information">
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-neutral-600 mb-1">Ward</p>
                  <p className="text-sm font-medium text-neutral-900">
                    {report.ward?.name} ({report.ward?.lga_name})
                  </p>
                </div>

                <div>
                  <p className="text-xs text-neutral-600 mb-1">Submitted By</p>
                  <p className="text-sm font-medium text-neutral-900">
                    {report.submitted_by?.full_name}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-neutral-600 mb-1">Submitted At</p>
                  <p className="text-sm font-medium text-neutral-900">
                    {formatDate(report.submitted_at)}
                  </p>
                </div>

                {report.reviewed_at && (
                  <div>
                    <p className="text-xs text-neutral-600 mb-1">Reviewed At</p>
                    <p className="text-sm font-medium text-neutral-900">
                      {formatDate(report.reviewed_at)}
                    </p>
                  </div>
                )}

                {report.reviewed_by && (
                  <div>
                    <p className="text-xs text-neutral-600 mb-1">Reviewed By</p>
                    <p className="text-sm font-medium text-neutral-900">
                      {report.reviewed_by?.full_name}
                    </p>
                  </div>
                )}
              </div>
            </Card>

            {/* Voice Notes */}
            {report.voice_notes && report.voice_notes.length > 0 && (
              <Card
                title="Voice Notes"
                subtitle={`${report.voice_notes.length} attached`}
              >
                <div className="space-y-3">
                  {report.voice_notes.map((voiceNote) => (
                    <div
                      key={voiceNote.id}
                      className="border border-neutral-200 rounded-lg p-4 bg-neutral-50"
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <div className="flex-shrink-0 w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                          <Mic className="w-5 h-5 text-primary-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-neutral-900 truncate">
                            {voiceNote.file_name}
                          </p>
                          <div className="flex items-center gap-2 mt-1 text-xs text-neutral-600">
                            <span>
                              {(voiceNote.file_size / 1024 / 1024).toFixed(2)} MB
                            </span>
                            {voiceNote.duration_seconds && (
                              <>
                                <span>•</span>
                                <span>
                                  {Math.floor(voiceNote.duration_seconds / 60)}:
                                  {(voiceNote.duration_seconds % 60)
                                    .toString()
                                    .padStart(2, '0')}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        icon={Download}
                        fullWidth
                        onClick={() => handleDownloadVoiceNote(voiceNote)}
                        loading={downloadMutation.isPending}
                      >
                        Download
                      </Button>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportDetails;
