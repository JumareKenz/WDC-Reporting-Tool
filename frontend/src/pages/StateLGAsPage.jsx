import { useState } from 'react';
import {
  MapPin,
  Users,
  FileText,
  CheckCircle,
  XCircle,
  AlertTriangle,
  TrendingUp,
  Search,
  Filter,
  Eye,
  Send,
  BarChart3,
  Activity,
  Calendar,
} from 'lucide-react';
import Card, { IconCard, EmptyCard } from '../components/common/Card';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Alert from '../components/common/Alert';
import Modal from '../components/common/Modal';
import { useAuth } from '../hooks/useAuth';
import { useLGAComparison } from '../hooks/useStateData';
import { formatDate, formatMonth, getCurrentMonth } from '../utils/formatters';

const StateLGAsPage = () => {
  const { user } = useAuth();
  const currentMonth = getCurrentMonth();

  const [searchTerm, setSearchTerm] = useState('');
  const [performanceFilter, setPerformanceFilter] = useState('all');
  const [selectedLGA, setSelectedLGA] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [alertMessage, setAlertMessage] = useState(null);

  const { data: comparisonData, isLoading } = useLGAComparison({ month: currentMonth });

  const lgas = (comparisonData?.data?.lgas || comparisonData?.lgas || []).map((lga) => ({
    ...lga,
    id: lga.lga_id || lga.id,
    name: lga.lga_name || lga.name,
    code: lga.code || lga.lga_code,
    submitted_count: lga.reports_submitted ?? lga.submitted_count ?? 0,
    missing_count: lga.reports_missing ?? lga.missing_count ?? 0,
  }));

  // Filter LGAs
  const filteredLGAs = lgas.filter(lga => {
    const matchesSearch = !searchTerm ||
      lga.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lga.coordinator_name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesPerformance =
      performanceFilter === 'all' ||
      (performanceFilter === 'excellent' && lga.submission_rate >= 90) ||
      (performanceFilter === 'good' && lga.submission_rate >= 70 && lga.submission_rate < 90) ||
      (performanceFilter === 'attention' && lga.submission_rate >= 50 && lga.submission_rate < 70) ||
      (performanceFilter === 'critical' && lga.submission_rate < 50);

    return matchesSearch && matchesPerformance;
  });

  // Sort by submission rate
  const sortedLGAs = [...filteredLGAs].sort((a, b) => b.submission_rate - a.submission_rate);

  // Calculate statistics
  const totalLGAs = lgas.length;
  const totalWards = lgas.reduce((sum, lga) => sum + (lga.total_wards || 0), 0);
  const totalSubmitted = lgas.reduce((sum, lga) => sum + (lga.submitted_count || 0), 0);
  const avgSubmissionRate = Math.round(lgas.reduce((sum, lga) => sum + (lga.submission_rate || 0), 0) / totalLGAs);
  const excellentCount = lgas.filter(l => l.submission_rate >= 90).length;
  const criticalCount = lgas.filter(l => l.submission_rate < 70).length;

  const handleViewDetails = (lga) => {
    setSelectedLGA(lga);
    setShowDetailsModal(true);
  };

  const getPerformanceColor = (rate) => {
    if (rate >= 90) return 'from-green-50 to-green-100 border-green-300';
    if (rate >= 70) return 'from-blue-50 to-blue-100 border-blue-300';
    if (rate >= 50) return 'from-yellow-50 to-yellow-100 border-yellow-300';
    return 'from-red-50 to-red-100 border-red-300';
  };

  const getPerformanceIcon = (rate) => {
    if (rate >= 90) return <CheckCircle className="w-6 h-6 text-green-500" />;
    if (rate >= 70) return <Activity className="w-6 h-6 text-blue-500" />;
    if (rate >= 50) return <AlertTriangle className="w-6 h-6 text-yellow-500" />;
    return <XCircle className="w-6 h-6 text-red-500" />;
  };

  const getPerformanceLabel = (rate) => {
    if (rate >= 90) return { text: 'Excellent', color: 'bg-green-100 text-green-700' };
    if (rate >= 70) return { text: 'Good', color: 'bg-blue-100 text-blue-700' };
    if (rate >= 50) return { text: 'Needs Attention', color: 'bg-yellow-100 text-yellow-700' };
    return { text: 'Critical', color: 'bg-red-100 text-red-700' };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" text="Loading LGAs..." />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">LGA Directory</h1>
        <p className="text-sm text-neutral-600 mt-1">
          All 23 Kaduna State Local Government Areas • {formatMonth(currentMonth)}
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        <IconCard
          icon={MapPin}
          iconColor="primary"
          title="Total LGAs"
          value={totalLGAs}
          subtitle="In Kaduna State"
          className="transform hover:scale-105 transition-transform"
        />
        <IconCard
          icon={Users}
          iconColor="info"
          title="Total Wards"
          value={totalWards}
          subtitle="Across all LGAs"
          className="transform hover:scale-105 transition-transform"
        />
        <IconCard
          icon={CheckCircle}
          iconColor="success"
          title="Avg. Rate"
          value={`${avgSubmissionRate}%`}
          subtitle="Submission rate"
          className="transform hover:scale-105 transition-transform"
        />
        <IconCard
          icon={TrendingUp}
          iconColor="success"
          title="Excellent LGAs"
          value={excellentCount}
          subtitle="≥90% rate"
          className="transform hover:scale-105 transition-transform"
        />
        <IconCard
          icon={AlertTriangle}
          iconColor="warning"
          title="Critical LGAs"
          value={criticalCount}
          subtitle="<70% rate"
          className="transform hover:scale-105 transition-transform"
        />
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                placeholder="Search LGAs or coordinators..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-neutral-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>
          <select
            value={performanceFilter}
            onChange={(e) => setPerformanceFilter(e.target.value)}
            className="px-4 py-2 border border-neutral-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="all">All Performance</option>
            <option value="excellent">Excellent (≥90%)</option>
            <option value="good">Good (70-89%)</option>
            <option value="attention">Needs Attention (50-69%)</option>
            <option value="critical">Critical (&lt;50%)</option>
          </select>
        </div>
      </Card>

      {/* LGAs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedLGAs.length > 0 ? (
          sortedLGAs.map((lga) => {
            const performanceLabel = getPerformanceLabel(lga.submission_rate);

            return (
              <div
                key={lga.id}
                className={`p-6 rounded-xl border-2 bg-gradient-to-br ${getPerformanceColor(lga.submission_rate)} hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]`}
              >
                {/* LGA Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-white rounded-xl shadow-md">
                      <MapPin className="w-6 h-6 text-primary-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-neutral-900">{lga.name}</h3>
                      <p className="text-xs text-neutral-600">{lga.code || `LGA-${lga.id}`}</p>
                    </div>
                  </div>
                  {getPerformanceIcon(lga.submission_rate)}
                </div>

                {/* Performance Badge */}
                <div className="mb-4">
                  <span className={`inline-block px-3 py-1 text-xs font-semibold rounded-full ${performanceLabel.color}`}>
                    {performanceLabel.text}
                  </span>
                </div>

                {/* Stats */}
                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                    <span className="text-sm text-neutral-600">Submission Rate</span>
                    <span className="text-2xl font-bold text-primary-600">{lga.submission_rate}%</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-2 bg-white rounded-lg text-center">
                      <Users className="w-4 h-4 text-neutral-400 mx-auto mb-1" />
                      <p className="text-sm font-bold text-neutral-900">{lga.total_wards}</p>
                      <p className="text-xs text-neutral-500">Wards</p>
                    </div>
                    <div className="p-2 bg-white rounded-lg text-center">
                      <CheckCircle className="w-4 h-4 text-green-500 mx-auto mb-1" />
                      <p className="text-sm font-bold text-green-600">{lga.submitted_count}</p>
                      <p className="text-xs text-neutral-500">Submitted</p>
                    </div>
                    <div className="p-2 bg-white rounded-lg text-center">
                      <XCircle className="w-4 h-4 text-red-500 mx-auto mb-1" />
                      <p className="text-sm font-bold text-red-600">{lga.missing_count}</p>
                      <p className="text-xs text-neutral-500">Missing</p>
                    </div>
                  </div>

                  {lga.coordinator_name && (
                    <div className="p-3 bg-white rounded-lg">
                      <p className="text-xs text-neutral-500">Coordinator</p>
                      <p className="text-sm font-medium text-neutral-900">{lga.coordinator_name}</p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    icon={Eye}
                    onClick={() => handleViewDetails(lga)}
                    fullWidth
                  >
                    View Details
                  </Button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full">
            <EmptyCard
              icon={MapPin}
              title="No LGAs Found"
              description={searchTerm ? 'Try changing your search term' : 'No LGAs available'}
            />
          </div>
        )}
      </div>

      {/* LGA Details Modal */}
      <Modal
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedLGA(null);
        }}
        title="LGA Details"
        size="lg"
      >
        {selectedLGA && (
          <div className="space-y-6">
            {/* Header */}
            <div className={`p-6 rounded-xl bg-gradient-to-br ${getPerformanceColor(selectedLGA.submission_rate)}`}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-2xl font-bold text-neutral-900">{selectedLGA.name}</h3>
                  <p className="text-sm text-neutral-600 mt-1">{selectedLGA.code || `LGA-${selectedLGA.id}`}</p>
                </div>
                {getPerformanceIcon(selectedLGA.submission_rate)}
              </div>
              <div className="inline-block px-4 py-2 text-sm font-semibold rounded-full bg-white">
                {getPerformanceLabel(selectedLGA.submission_rate).text} Performance
              </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-5 bg-gradient-to-br from-primary-50 to-primary-100 rounded-xl">
                <p className="text-sm text-primary-700 font-medium mb-2">Submission Rate</p>
                <p className="text-4xl font-bold text-primary-700">{selectedLGA.submission_rate}%</p>
              </div>
              <div className="p-5 bg-gradient-to-br from-green-50 to-green-100 rounded-xl">
                <p className="text-sm text-green-700 font-medium mb-2">Reviewed Reports</p>
                <p className="text-4xl font-bold text-green-700">{selectedLGA.reviewed_count || 0}</p>
              </div>
            </div>

            {/* Ward Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-neutral-50 rounded-lg text-center">
                <Users className="w-6 h-6 text-neutral-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-neutral-900">{selectedLGA.total_wards}</p>
                <p className="text-sm text-neutral-600">Total Wards</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg text-center">
                <CheckCircle className="w-6 h-6 text-green-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-green-600">{selectedLGA.submitted_count}</p>
                <p className="text-sm text-green-700">Submitted</p>
              </div>
              <div className="p-4 bg-red-50 rounded-lg text-center">
                <XCircle className="w-6 h-6 text-red-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-red-600">{selectedLGA.missing_count}</p>
                <p className="text-sm text-red-700">Missing</p>
              </div>
            </div>

            {/* Coordinator Info */}
            {selectedLGA.coordinator_name && (
              <div className="p-4 bg-neutral-50 rounded-lg">
                <h4 className="font-semibold text-neutral-900 mb-2">LGA Coordinator</h4>
                <p className="font-medium text-neutral-900">{selectedLGA.coordinator_name}</p>
                {selectedLGA.coordinator_email && (
                  <p className="text-sm text-neutral-600 mt-1">{selectedLGA.coordinator_email}</p>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-neutral-200">
              <Button
                variant="outline"
                onClick={() => setShowDetailsModal(false)}
                fullWidth
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

export default StateLGAsPage;
