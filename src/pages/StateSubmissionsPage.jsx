import { useState, useRef, useEffect, useMemo } from 'react';
import {
  FileText,
  ChevronDown,
  ChevronRight,
  Search,
  Play,
  Pause,
  Volume2,
  Eye,
  Activity,
  Users,
  Mic,
  TrendingUp,
  Download,
  ArrowUpDown,
  CheckCircle,
  XCircle,
  AlertTriangle,
  MessageSquare,
} from 'lucide-react';
import Card, { IconCard, EmptyCard } from '../components/common/Card';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Modal from '../components/common/Modal';
import ReportDetailView from '../components/reports/ReportDetailView';
import { useStateSubmissions, useLGAs, useReviewReport } from '../hooks/useStateData';
import { useToast } from '../hooks/useToast';
import {
  formatDate,
  formatMonth,
  getCurrentMonth,
  getStatusColor,
  formatDuration,
  formatFileSize,
  getSubmissionRateColor,
  toTitleCase,
} from '../utils/formatters';
import { REPORT_STATUS, STATUS_LABELS } from '../utils/constants';
import apiClient from '../api/client';

const StateSubmissionsPage = () => {
  const [month, setMonth] = useState(getCurrentMonth());
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [lgaFilter, setLgaFilter] = useState('');
  const [sortField, setSortField] = useState('submitted_at');
  const [sortDir, setSortDir] = useState('desc');
  const [expandedLGAs, setExpandedLGAs] = useState({});
  const [selectedReport, setSelectedReport] = useState(null);
  const [fullReportData, setFullReportData] = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [playingAudio, setPlayingAudio] = useState(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [showReviewNotes, setShowReviewNotes] = useState(false);
  const [reviewAction, setReviewAction] = useState(null);
  const audioUrlCache = useRef({});
  const audioRef = useRef(null);
  const { toast } = useToast();
  const reviewMutation = useReviewReport();

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data: allLGAs } = useLGAs();
  const lgasList = allLGAs?.data?.lgas || allLGAs?.lgas || allLGAs || [];

  const { data, isLoading, refetch } = useStateSubmissions({
    month,
    lga_id: lgaFilter || undefined,
    report_status: statusFilter || undefined,
    search: debouncedSearch || undefined,
  });

  const lgas = data?.lgas || [];
  const totalReports = data?.total_reports || 0;
  const totalWardsReported = data?.total_wards_reported || 0;
  const totalWards = data?.total_wards || 0;
  const totalVoiceNotes = data?.total_voice_notes || 0;
  const submissionRate = totalWards > 0 ? ((totalWardsReported / totalWards) * 100).toFixed(1) : 0;

  // Expand all LGAs when data changes
  useEffect(() => {
    const expanded = {};
    lgas.forEach((lga) => {
      expanded[lga.lga_id] = true;
    });
    setExpandedLGAs(expanded);
  }, [lgas]);

  // Cleanup cached audio URLs on unmount
  useEffect(() => {
    return () => {
      Object.values(audioUrlCache.current).forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const toggleLGA = (lgaId) => {
    setExpandedLGAs((prev) => ({ ...prev, [lgaId]: !prev[lgaId] }));
  };

  const handlePlayAudio = async (vn) => {
    // Toggle off if already playing this note
    if (playingAudio === vn.id) {
      audioRef.current?.pause();
      setPlayingAudio(null);
      return;
    }

    // Stop any currently playing audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    try {
      let audioUrl = audioUrlCache.current[vn.id];
      if (!audioUrl) {
        const blob = await apiClient.get(`/voice-notes/${vn.id}/download`, {
          responseType: 'blob',
        });
        audioUrl = URL.createObjectURL(blob);
        audioUrlCache.current[vn.id] = audioUrl;
      }

      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.play();
        setPlayingAudio(vn.id);
      }
    } catch (err) {
      console.error('Failed to load audio:', err);
    }
  };

  const handleDownload = async (vn) => {
    try {
      const blob = await apiClient.get(`/voice-notes/${vn.id}/download`, {
        responseType: 'blob',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = vn.file_name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  // Toggle sort column; flip direction if same column clicked again
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const fetchFullReportDetails = async (reportId) => {
    setLoadingReport(true);
    try {
      const response = await apiClient.get(`/reports/${reportId}`);
      // The interceptor returns response.data; handle both wrapped { data: {...} } and direct formats
      const reportData = response?.data || response;
      setFullReportData(reportData);
    } catch (err) {
      console.error('Failed to fetch report details:', err);
      toast.error('Could not load the full report. Please try again.');
    } finally {
      setLoadingReport(false);
    }
  };

  const handleViewReport = async (report) => {
    setSelectedReport(report);
    setFullReportData(null);
    setReviewNotes('');
    setShowReviewNotes(false);
    setReviewAction(null);
    setShowModal(true);
    await fetchFullReportDetails(report.id);
  };

  const handleReviewSubmit = async (action) => {
    if (!selectedReport) return;
    try {
      await reviewMutation.mutateAsync({
        reportId: selectedReport.id,
        action,
        notes: reviewNotes || undefined,
      });
      const labels = { REVIEWED: 'approved', DECLINED: 'declined', FLAGGED: 'flagged' };
      toast.success(`Report ${labels[action] || 'reviewed'} successfully.`);
      // Update local selected report status for immediate UI feedback
      setSelectedReport((prev) => prev ? { ...prev, status: action } : prev);
      setShowReviewNotes(false);
      setReviewNotes('');
      setReviewAction(null);
    } catch (err) {
      toast.error(err.message || 'Review action failed. Please try again.');
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedReport(null);
    setFullReportData(null);
    setReviewNotes('');
    setShowReviewNotes(false);
    setReviewAction(null);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setPlayingAudio(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" text="Loading submissions..." />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Hidden audio element for playback */}
      <audio ref={audioRef} onEnded={() => setPlayingAudio(null)} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">All Submissions</h1>
          <p className="text-sm text-neutral-600 mt-1">
            State-wide ward submissions across all 23 LGAs &bull; {formatMonth(month)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="px-3 py-2 border border-neutral-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-sm"
          />
          <Button size="sm" variant="outline" icon={Activity} onClick={refetch}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <IconCard
          icon={FileText}
          iconColor="primary"
          title="Total Submissions"
          value={totalReports}
          subtitle={`from ${totalWardsReported} wards`}
        />
        <IconCard
          icon={Users}
          iconColor="info"
          title="Wards Reported"
          value={`${totalWardsReported} / ${totalWards}`}
          subtitle={`${submissionRate}% coverage`}
        />
        <IconCard
          icon={Mic}
          iconColor="success"
          title="Voice Notes"
          value={totalVoiceNotes}
          subtitle="Audio recordings"
        />
        <IconCard
          icon={TrendingUp}
          iconColor={submissionRate >= 70 ? 'success' : submissionRate >= 50 ? 'warning' : 'error'}
          title="Submission Rate"
          value={`${submissionRate}%`}
          subtitle={submissionRate >= 70 ? 'On track' : 'Needs attention'}
        />
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-48">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                placeholder="Search by ward name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-neutral-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-sm"
              />
            </div>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-neutral-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-sm"
          >
            <option value="">All Status</option>
            <option value={REPORT_STATUS.SUBMITTED}>Submitted</option>
            <option value={REPORT_STATUS.REVIEWED}>Approved</option>
            <option value={REPORT_STATUS.DECLINED}>Declined</option>
            <option value={REPORT_STATUS.FLAGGED}>Flagged</option>
          </select>

          <select
            value={lgaFilter}
            onChange={(e) => setLgaFilter(e.target.value)}
            className="px-3 py-2 border border-neutral-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-sm"
          >
            <option value="">All LGAs</option>
            {lgasList.map((lga) => (
              <option key={lga.id} value={lga.id}>
                {lga.name}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {/* LGA Accordion Groups */}
      {lgas.length > 0 ? (
        <div className="space-y-3">
          {lgas.map((lga) => (
            <div
              key={lga.lga_id}
              className="border border-neutral-200 rounded-xl overflow-hidden bg-white shadow-sm"
            >
              {/* LGA Group Header */}
              <button
                onClick={() => toggleLGA(lga.lga_id)}
                className="w-full flex items-center justify-between p-4 hover:bg-neutral-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {expandedLGAs[lga.lga_id] ? (
                    <ChevronDown className="w-5 h-5 text-neutral-500" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-neutral-500" />
                  )}
                  <div className="text-left">
                    <h3 className="font-semibold text-neutral-900">{lga.lga_name} LGA</h3>
                    <p className="text-xs text-neutral-500">
                      {lga.total_reports} submission{lga.total_reports !== 1 ? 's' : ''} &bull;{' '}
                      {lga.total_wards} wards
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-sm font-semibold ${getSubmissionRateColor(
                      lga.submission_rate
                    )}`}
                  >
                    {lga.submission_rate}%
                  </span>
                  <span
                    className={`px-3 py-1 text-xs font-medium rounded-full ${lga.submission_rate >= 90
                        ? 'bg-green-100 text-green-800'
                        : lga.submission_rate >= 70
                          ? 'bg-blue-100 text-blue-800'
                          : lga.submission_rate >= 50
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                      }`}
                  >
                    {lga.submission_rate >= 90
                      ? 'Excellent'
                      : lga.submission_rate >= 70
                        ? 'Good'
                        : lga.submission_rate >= 50
                          ? 'Fair'
                          : 'Critical'}
                  </span>
                </div>
              </button>

              {/* Submissions Table */}
              {expandedLGAs[lga.lga_id] && (
                <div className="border-t border-neutral-100">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-neutral-50">
                          <th className="text-left py-2.5 px-4 text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                            <button
                              className="flex items-center gap-1 hover:text-neutral-900 transition-colors"
                              onClick={() => handleSort('ward_name')}
                              aria-label="Sort by ward"
                            >
                              Ward
                              <ArrowUpDown className="w-3 h-3" />
                            </button>
                          </th>
                          <th className="text-center py-2.5 px-4 text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                            Meetings
                          </th>
                          <th className="text-center py-2.5 px-4 text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                            Attendees
                          </th>
                          <th className="text-left py-2.5 px-4 text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                            <button
                              className="flex items-center gap-1 hover:text-neutral-900 transition-colors"
                              onClick={() => handleSort('status')}
                              aria-label="Sort by status"
                            >
                              Status
                              <ArrowUpDown className="w-3 h-3" />
                            </button>
                          </th>
                          <th className="text-left py-2.5 px-4 text-xs font-semibold text-neutral-600 uppercase tracking-wider hidden sm:table-cell">
                            <button
                              className="flex items-center gap-1 hover:text-neutral-900 transition-colors"
                              onClick={() => handleSort('submitted_at')}
                              aria-label="Sort by submission date"
                            >
                              Submitted
                              {sortField === 'submitted_at' && (
                                <span className="text-primary-600">
                                  {sortDir === 'asc' ? '↑' : '↓'}
                                </span>
                              )}
                            </button>
                          </th>
                          <th className="text-center py-2.5 px-4 text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                            Audio
                          </th>
                          <th className="text-right py-2.5 px-4 text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...lga.reports]
                          .sort((a, b) => {
                            const aVal = a[sortField] ?? '';
                            const bVal = b[sortField] ?? '';
                            const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
                            return sortDir === 'asc' ? cmp : -cmp;
                          })
                          .map((report) => (
                          <tr
                            key={report.id}
                            className="border-t border-neutral-100 hover:bg-primary-50 transition-colors"
                          >
                            <td className="py-3 px-4">
                              <div>
                                <p className="font-medium text-neutral-900 text-sm">
                                  {report.ward_name}
                                </p>
                                <p className="text-xs text-neutral-500">
                                  {report.ward_code} &bull; {report.submitted_by}
                                </p>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className="text-sm font-semibold text-neutral-700">
                                {report.meetings_held}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className="text-sm font-semibold text-neutral-700">
                                {report.attendees_count}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`px-2.5 py-1 text-xs font-medium rounded-full ${getStatusColor(
                                  report.status
                                )}`}
                              >
                                {STATUS_LABELS[report.status]}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-sm text-neutral-600 hidden sm:table-cell">
                              {formatDate(report.submitted_at)}
                            </td>
                            <td className="py-3 px-4 text-center">
                              {report.voice_notes_count > 0 ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                                  <Mic className="w-3 h-3" />
                                  {report.voice_notes_count}
                                </span>
                              ) : (
                                <span className="text-neutral-400 text-xs">&mdash;</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                onClick={() => handleViewReport(report)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary-600 hover:text-primary-800 hover:bg-primary-50 rounded-lg transition-colors"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                View
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <Card>
          <EmptyCard
            icon={FileText}
            title="No Submissions Found"
            description={
              searchTerm || statusFilter || lgaFilter
                ? 'No submissions match your current filters. Try adjusting them.'
                : `No submissions recorded for ${formatMonth(month)}.`
            }
          />
        </Card>
      )}

      {/* Submission Detail Modal */}
      <Modal isOpen={showModal} onClose={closeModal} title="Complete Report Details" size="xl">
        {selectedReport && (
          <div className="space-y-5">
            {/* Report Header */}
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-primary-50 to-blue-50 rounded-xl">
              <div>
                <h3 className="text-lg font-bold text-neutral-900">
                  {selectedReport.ward_name}
                </h3>
                <p className="text-sm text-neutral-600 mt-0.5">
                  {selectedReport.ward_code} &bull; {formatMonth(selectedReport.report_month)} &bull;{' '}
                  by {selectedReport.submitted_by}
                </p>
              </div>
              <span
                className={`px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(
                  selectedReport.status
                )}`}
              >
                {STATUS_LABELS[selectedReport.status]}
              </span>
            </div>

            {/* Loading State */}
            {loadingReport && (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner size="lg" text="Loading full report details..." />
              </div>
            )}

            {/* Full Report Details */}
            {!loadingReport && fullReportData && (
              <ReportDetailView report={fullReportData} />
            )}

            {/* Voice Notes / Audio Section */}
            {fullReportData && fullReportData.voice_notes && fullReportData.voice_notes.length > 0 && (
              <div className="bg-white rounded-lg border border-neutral-200 p-5">
                <h4 className="font-semibold text-neutral-900 mb-3 flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-purple-600" />
                  Recorded Audio ({fullReportData.voice_notes.length})
                </h4>
                <div className="space-y-2">
                  {fullReportData.voice_notes.map((vn) => (
                    <div
                      key={vn.id}
                      className="flex items-start gap-3 p-3 bg-neutral-50 border border-neutral-200 rounded-lg"
                    >
                      {/* Play / Pause button */}
                      <button
                        onClick={() => handlePlayAudio(vn)}
                        className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-colors ${playingAudio === vn.id
                            ? 'bg-purple-600 text-white hover:bg-purple-700'
                            : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                          }`}
                      >
                        {playingAudio === vn.id ? (
                          <Pause className="w-4 h-4" />
                        ) : (
                          <Play className="w-4 h-4 ml-0.5" />
                        )}
                      </button>

                      {/* Note info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-neutral-900">
                          {vn.field_name ? toTitleCase(vn.field_name) : vn.file_name}
                        </p>
                        <p className="text-xs text-neutral-500">
                          {vn.duration_seconds ? formatDuration(vn.duration_seconds) : '—'}
                          {vn.file_size ? ` \u2022 ${formatFileSize(vn.file_size)}` : ''}
                        </p>
                        {vn.transcription_text && (
                          <p className="text-xs text-neutral-600 mt-1 italic">
                            &ldquo;{vn.transcription_text}&rdquo;
                          </p>
                        )}
                      </div>

                      {/* Download button */}
                      <button
                        onClick={() => handleDownload(vn)}
                        className="flex-shrink-0 text-neutral-400 hover:text-neutral-600 transition-colors p-1"
                        title="Download"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Review Notes Input (shown when a review action is pending) */}
            {showReviewNotes && (
              <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 space-y-3">
                <p className="text-sm font-medium text-neutral-700">
                  Add review notes{reviewAction === 'FLAGGED' ? ' (required for flagging)' : ' (optional)'}:
                </p>
                <textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Enter feedback or reason for this decision…"
                  rows={3}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-primary-500 focus:border-primary-500 resize-none"
                  aria-label="Review notes"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={reviewAction === 'REVIEWED' ? 'primary' : reviewAction === 'DECLINED' ? 'danger' : 'outline'}
                    onClick={() => handleReviewSubmit(reviewAction)}
                    loading={reviewMutation.isPending}
                    disabled={reviewAction === 'FLAGGED' && !reviewNotes.trim()}
                    className={reviewAction === 'FLAGGED' ? 'border-amber-500 text-amber-700' : ''}
                  >
                    Confirm {reviewAction === 'REVIEWED' ? 'Approval' : reviewAction === 'DECLINED' ? 'Decline' : 'Flag'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setShowReviewNotes(false); setReviewAction(null); }}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Footer: meta + review buttons */}
            <div className="space-y-3 pt-3 border-t border-neutral-200">
              <div className="flex items-center justify-between text-xs text-neutral-500">
                <span>Submitted: {formatDate(selectedReport.submitted_at, true)}</span>
                <span>Report ID: #{selectedReport.id}</span>
              </div>

              {/* Review Action Buttons — shown only for submitted/flagged reports */}
              {!loadingReport && selectedReport.status !== REPORT_STATUS.REVIEWED && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="primary"
                    icon={CheckCircle}
                    onClick={() => { setReviewAction('REVIEWED'); setShowReviewNotes(true); }}
                    disabled={reviewMutation.isPending}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    icon={AlertTriangle}
                    className="border-amber-400 text-amber-700 hover:bg-amber-50"
                    onClick={() => { setReviewAction('FLAGGED'); setShowReviewNotes(true); }}
                    disabled={reviewMutation.isPending}
                  >
                    Flag
                  </Button>
                  {selectedReport.status !== REPORT_STATUS.DECLINED && (
                    <Button
                      size="sm"
                      variant="outline"
                      icon={XCircle}
                      className="border-red-300 text-red-600 hover:bg-red-50"
                      onClick={() => { setReviewAction('DECLINED'); setShowReviewNotes(true); }}
                      disabled={reviewMutation.isPending}
                    >
                      Decline
                    </Button>
                  )}
                </div>
              )}
              {!loadingReport && selectedReport.status === REPORT_STATUS.REVIEWED && (
                <p className="text-xs text-green-700 font-medium flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4" />
                  This report has been approved.
                </p>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default StateSubmissionsPage;
