import { useState } from 'react';
import {
  MapPin,
  Users,
  CheckCircle,
  XCircle,
  Calendar,
  TrendingUp,
  Search,
  Filter,
  Eye,
  Send,
  BarChart3,
  Activity,
} from 'lucide-react';
import Card, { IconCard, EmptyCard } from '../components/common/Card';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Alert from '../components/common/Alert';
import Modal from '../components/common/Modal';
import { useAuth } from '../hooks/useAuth';
import { useLGAWards, useSendNotification } from '../hooks/useLGAData';
import { formatDate, formatMonth, getCurrentMonth, formatPercentage } from '../utils/formatters';

const LGAWardsPage = () => {
  const { user } = useAuth();
  const lgaId = user?.lga_id;
  const currentMonth = getCurrentMonth();

  const [searchTerm, setSearchTerm] = useState('');
  const [submissionFilter, setSubmissionFilter] = useState('all');
  const [selectedWard, setSelectedWard] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [alertMessage, setAlertMessage] = useState(null);

  const { data: wardsData, isLoading, refetch } = useLGAWards(lgaId, { month: currentMonth });
  const sendNotificationMutation = useSendNotification();

  const wards = wardsData?.data?.wards || wardsData?.wards || [];

  // Filter wards
  const filteredWards = wards.filter(ward => {
    const matchesSearch = !searchTerm ||
      ward.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ward.secretary_name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesSubmission =
      submissionFilter === 'all' ||
      (submissionFilter === 'submitted' && ward.submitted) ||
      (submissionFilter === 'missing' && !ward.submitted);

    return matchesSearch && matchesSubmission;
  });

  // Calculate statistics
  const totalWards = wards.length;
  const submittedWards = wards.filter(w => w.submitted).length;
  const missingWards = totalWards - submittedWards;
  const submissionRate = totalWards > 0 ? Math.round((submittedWards / totalWards) * 100) : 0;

  const handleSendReminder = async (wardId) => {
    try {
      await sendNotificationMutation.mutateAsync({
        ward_ids: [wardId],
        notification_type: 'REMINDER',
        title: 'Report Submission Reminder',
        message: `Please submit your monthly report for ${formatMonth(currentMonth)}.`,
      });
      setAlertMessage({ type: 'success', text: 'Reminder sent successfully!' });
      refetch();
    } catch (error) {
      setAlertMessage({ type: 'error', text: error.message || 'Failed to send reminder' });
    }
  };

  const handleViewDetails = (ward) => {
    setSelectedWard(ward);
    setShowDetailsModal(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" text="Loading wards..." />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Ward Management</h1>
        <p className="text-sm text-neutral-600 mt-1">
          {user?.lga_name} • {totalWards} Wards • {formatMonth(currentMonth)}
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <IconCard
          icon={MapPin}
          iconColor="primary"
          title="Total Wards"
          value={totalWards}
          subtitle="In your LGA"
          className="transform hover:scale-105 transition-transform"
        />
        <IconCard
          icon={CheckCircle}
          iconColor="success"
          title="Submitted Reports"
          value={submittedWards}
          subtitle={`${submissionRate}% rate`}
          trend={
            submissionRate >= 80 ? (
              <span className="text-green-600 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> Excellent
              </span>
            ) : (
              <span className="text-yellow-600 flex items-center gap-1">
                <Activity className="w-3 h-3" /> Needs improvement
              </span>
            )
          }
          className="transform hover:scale-105 transition-transform"
        />
        <IconCard
          icon={XCircle}
          iconColor={missingWards > 0 ? 'error' : 'success'}
          title="Missing Reports"
          value={missingWards}
          subtitle={missingWards > 0 ? 'Action required' : 'All caught up!'}
          className="transform hover:scale-105 transition-transform"
        />
        <IconCard
          icon={Users}
          iconColor="info"
          title="Avg Population"
          value={Math.round(wards.reduce((sum, w) => sum + (w.population || 0), 0) / totalWards || 0).toLocaleString()}
          subtitle="Per ward"
          className="transform hover:scale-105 transition-transform"
        />
      </div>

      {/* Main Card */}
      <Card
        title="Ward Directory"
        subtitle="View and manage all wards in your LGA"
        action={
          <div className="flex flex-wrap gap-2 w-full">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                placeholder="Search wards or secretaries..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-3 py-2 text-sm border border-neutral-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 w-full"
              />
            </div>
            <select
              value={submissionFilter}
              onChange={(e) => setSubmissionFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="all">All Wards</option>
              <option value="submitted">Submitted</option>
              <option value="missing">Missing Reports</option>
            </select>
          </div>
        }
      >
        {filteredWards.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredWards.map((ward) => (
              <div
                key={ward.id}
                className={`p-5 rounded-xl border-2 transition-all duration-200 hover:shadow-lg ${
                  ward.submitted
                    ? 'border-green-200 bg-gradient-to-br from-green-50 to-white hover:border-green-300'
                    : 'border-red-200 bg-gradient-to-br from-red-50 to-white hover:border-red-300 animate-pulse-subtle'
                }`}
              >
                {/* Ward Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${ward.submitted ? 'bg-green-100' : 'bg-red-100'}`}>
                      <MapPin className={`w-5 h-5 ${ward.submitted ? 'text-green-600' : 'text-red-600'}`} />
                    </div>
                    <div>
                      <h3 className="font-bold text-neutral-900">{ward.name}</h3>
                      <p className="text-xs text-neutral-500">{ward.code}</p>
                    </div>
                  </div>
                  {ward.submitted ? (
                    <CheckCircle className="w-6 h-6 text-green-500" />
                  ) : (
                    <XCircle className="w-6 h-6 text-red-500" />
                  )}
                </div>

                {/* Ward Info */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="w-4 h-4 text-neutral-400" />
                    <span className="text-neutral-600">
                      Pop: {(ward.population || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="w-4 h-4 text-neutral-400" />
                    <span className="text-neutral-600 truncate">
                      {ward.secretary_name || 'No secretary assigned'}
                    </span>
                  </div>
                  {ward.submitted && ward.submitted_at && (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-green-600" />
                      <span className="text-green-600 font-medium">
                        {formatDate(ward.submitted_at)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Status Badge */}
                <div className="mb-4">
                  <span
                    className={`inline-block px-3 py-1 text-xs font-semibold rounded-full ${
                      ward.submitted
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {ward.submitted ? 'Report Submitted' : 'Report Missing'}
                  </span>
                </div>

                {/* Ward Stats */}
                {ward.submitted && (
                  <div className="grid grid-cols-2 gap-2 mb-4 p-3 bg-white rounded-lg border border-neutral-200">
                    <div className="text-center">
                      <p className="text-lg font-bold text-green-600">{ward.total_meetings || 0}</p>
                      <p className="text-xs text-neutral-600">Meetings</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-blue-600">{ward.total_attendees || 0}</p>
                      <p className="text-xs text-neutral-600">Attendees</p>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    icon={Eye}
                    onClick={() => handleViewDetails(ward)}
                    className="flex-1"
                  >
                    View
                  </Button>
                  {!ward.submitted && (
                    <Button
                      size="sm"
                      variant="primary"
                      icon={Send}
                      onClick={() => handleSendReminder(ward.id)}
                      loading={sendNotificationMutation.isPending}
                      className="flex-1"
                    >
                      Remind
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyCard
            icon={MapPin}
            title="No Wards Found"
            description={searchTerm ? 'Try changing your search term' : 'No wards available'}
          />
        )}
      </Card>

      {/* Ward Details Modal */}
      <Modal
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedWard(null);
        }}
        title="Ward Details"
        size="lg"
      >
        {selectedWard && (
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-primary-50 to-blue-50 rounded-xl">
              <div>
                <h3 className="text-xl font-bold text-neutral-900">{selectedWard.name}</h3>
                <p className="text-sm text-neutral-600">{selectedWard.code}</p>
              </div>
              <div className={`p-3 rounded-lg ${selectedWard.submitted ? 'bg-green-100' : 'bg-red-100'}`}>
                <MapPin className={`w-8 h-8 ${selectedWard.submitted ? 'text-green-600' : 'text-red-600'}`} />
              </div>
            </div>

            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-neutral-50 rounded-lg">
                <p className="text-sm text-neutral-500">Population</p>
                <p className="text-2xl font-bold text-neutral-900">
                  {(selectedWard.population || 0).toLocaleString()}
                </p>
              </div>
              <div className="p-4 bg-neutral-50 rounded-lg">
                <p className="text-sm text-neutral-500">Status</p>
                <p className={`text-2xl font-bold ${selectedWard.submitted ? 'text-green-600' : 'text-red-600'}`}>
                  {selectedWard.submitted ? 'Submitted' : 'Missing'}
                </p>
              </div>
            </div>

            {/* Secretary Info */}
            <div className="p-4 bg-neutral-50 rounded-lg">
              <p className="text-sm text-neutral-500 mb-2">WDC Secretary</p>
              <p className="font-medium text-neutral-900">{selectedWard.secretary_name || 'Not assigned'}</p>
              {selectedWard.secretary_email && (
                <p className="text-sm text-neutral-600 mt-1">{selectedWard.secretary_email}</p>
              )}
            </div>

            {/* Report Stats */}
            {selectedWard.submitted && (
              <div className="p-4 bg-gradient-to-br from-primary-50 to-blue-50 rounded-lg">
                <h4 className="font-semibold text-neutral-900 mb-3">Current Month Report</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-neutral-600">Meetings Held</p>
                    <p className="text-3xl font-bold text-green-600">{selectedWard.total_meetings || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-neutral-600">Total Attendees</p>
                    <p className="text-3xl font-bold text-blue-600">{selectedWard.total_attendees || 0}</p>
                  </div>
                </div>
                {selectedWard.submitted_at && (
                  <div className="mt-3 pt-3 border-t border-neutral-200">
                    <p className="text-sm text-neutral-600">
                      Submitted on {formatDate(selectedWard.submitted_at, true)}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-neutral-200">
              {!selectedWard.submitted && (
                <Button
                  icon={Send}
                  onClick={() => handleSendReminder(selectedWard.id)}
                  loading={sendNotificationMutation.isPending}
                  className="flex-1"
                >
                  Send Reminder
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => setShowDetailsModal(false)}
                className="flex-1"
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default LGAWardsPage;
