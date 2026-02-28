import { useState } from 'react';
import {
  Search,
  AlertCircle,
  Clock,
  CheckCircle,
  PlusCircle,
  Eye,
  Edit,
  Filter,
  FileText,
  MapPin,
  Calendar,
  User,
  X,
} from 'lucide-react';
import Card, { IconCard, EmptyCard } from '../components/common/Card';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Alert from '../components/common/Alert';
import Modal from '../components/common/Modal';
import { useAuth } from '../hooks/useAuth';
import { useInvestigations, useCreateInvestigation, useUpdateInvestigation } from '../hooks/useStateData';
import { formatDate, getPriorityColor } from '../utils/formatters';
import {
  INVESTIGATION_STATUS,
  INVESTIGATION_LABELS,
  INVESTIGATION_PRIORITY,
  PRIORITY_LABELS,
  INVESTIGATION_TYPES,
} from '../utils/constants';

const StateInvestigationsPage = () => {
  const { user } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [selectedInvestigation, setSelectedInvestigation] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newInvestigation, setNewInvestigation] = useState({
    title: '',
    description: '',
    priority: INVESTIGATION_PRIORITY.MEDIUM,
    investigation_type: 'PERFORMANCE',
    lga_id: '',
  });
  const [alertMessage, setAlertMessage] = useState(null);

  const { data: investigationsData, isLoading, refetch } = useInvestigations({ limit: 50 });
  const createMutation = useCreateInvestigation();
  const updateMutation = useUpdateInvestigation();

  const investigations = investigationsData?.data?.investigations || investigationsData?.investigations || [];

  // Filter investigations
  const filteredInvestigations = investigations.filter(inv => {
    const matchesSearch = !searchTerm ||
      inv.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.lga_name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' || inv.status === statusFilter;

    const matchesPriority =
      priorityFilter === 'all' || inv.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  // Calculate statistics
  const totalInvestigations = investigations.length;
  const openCount = investigations.filter(i => i.status === INVESTIGATION_STATUS.OPEN).length;
  const inProgressCount = investigations.filter(i => i.status === INVESTIGATION_STATUS.IN_PROGRESS).length;
  const closedCount = investigations.filter(i => i.status === INVESTIGATION_STATUS.CLOSED).length;
  const urgentCount = investigations.filter(i => i.priority === INVESTIGATION_PRIORITY.URGENT).length;

  const handleCreateInvestigation = async () => {
    if (!newInvestigation.title || !newInvestigation.description) {
      setAlertMessage({ type: 'error', text: 'Please fill in all required fields' });
      return;
    }

    try {
      await createMutation.mutateAsync(newInvestigation);
      setAlertMessage({ type: 'success', text: 'Investigation created successfully!' });
      setShowCreateModal(false);
      setNewInvestigation({
        title: '',
        description: '',
        priority: INVESTIGATION_PRIORITY.MEDIUM,
        investigation_type: 'PERFORMANCE',
        lga_id: '',
      });
      refetch();
    } catch (error) {
      setAlertMessage({ type: 'error', text: error.message || 'Failed to create investigation' });
    }
  };

  const handleUpdateStatus = async (investigationId, newStatus) => {
    try {
      await updateMutation.mutateAsync({
        investigationId,
        data: { status: newStatus },
      });
      setAlertMessage({ type: 'success', text: `Investigation marked as ${INVESTIGATION_LABELS[newStatus]}` });
      setShowDetailsModal(false);
      setSelectedInvestigation(null);
      refetch();
    } catch (error) {
      setAlertMessage({ type: 'error', text: error.message || 'Failed to update investigation' });
    }
  };

  const handleViewDetails = (investigation) => {
    setSelectedInvestigation(investigation);
    setShowDetailsModal(true);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case INVESTIGATION_STATUS.OPEN:
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case INVESTIGATION_STATUS.IN_PROGRESS:
        return <Clock className="w-5 h-5 text-blue-500" />;
      case INVESTIGATION_STATUS.CLOSED:
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      default:
        return <FileText className="w-5 h-5 text-neutral-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case INVESTIGATION_STATUS.OPEN:
        return 'bg-red-100 text-red-700 border-red-200';
      case INVESTIGATION_STATUS.IN_PROGRESS:
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case INVESTIGATION_STATUS.CLOSED:
        return 'bg-green-100 text-green-700 border-green-200';
      default:
        return 'bg-neutral-100 text-neutral-700 border-neutral-200';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" text="Loading investigations..." />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Investigations</h1>
          <p className="text-sm text-neutral-600 mt-1">
            Track and manage investigations across Kaduna State
          </p>
        </div>
        <Button icon={PlusCircle} onClick={() => setShowCreateModal(true)}>
          New Investigation
        </Button>
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
          icon={FileText}
          iconColor="primary"
          title="Total"
          value={totalInvestigations}
          subtitle="All investigations"
          className="transform hover:scale-105 transition-transform"
        />
        <IconCard
          icon={AlertCircle}
          iconColor="error"
          title="Open"
          value={openCount}
          subtitle="Pending action"
          className="transform hover:scale-105 transition-transform"
        />
        <IconCard
          icon={Clock}
          iconColor="info"
          title="In Progress"
          value={inProgressCount}
          subtitle="Under investigation"
          className="transform hover:scale-105 transition-transform"
        />
        <IconCard
          icon={CheckCircle}
          iconColor="success"
          title="Closed"
          value={closedCount}
          subtitle="Completed"
          className="transform hover:scale-105 transition-transform"
        />
        <IconCard
          icon={AlertCircle}
          iconColor="warning"
          title="Urgent"
          value={urgentCount}
          subtitle="High priority"
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
                placeholder="Search investigations or LGAs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-neutral-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-neutral-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="all">All Status</option>
            <option value={INVESTIGATION_STATUS.OPEN}>Open</option>
            <option value={INVESTIGATION_STATUS.IN_PROGRESS}>In Progress</option>
            <option value={INVESTIGATION_STATUS.CLOSED}>Closed</option>
          </select>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-4 py-2 border border-neutral-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="all">All Priority</option>
            <option value={INVESTIGATION_PRIORITY.LOW}>Low</option>
            <option value={INVESTIGATION_PRIORITY.MEDIUM}>Medium</option>
            <option value={INVESTIGATION_PRIORITY.HIGH}>High</option>
            <option value={INVESTIGATION_PRIORITY.URGENT}>Urgent</option>
          </select>
        </div>
      </Card>

      {/* Investigations List */}
      <div className="space-y-4">
        {filteredInvestigations.length > 0 ? (
          filteredInvestigations.map((investigation) => (
            <Card key={investigation.id} className="hover:shadow-lg transition-shadow">
              <div className="flex items-start gap-4">
                {/* Status Icon */}
                <div className={`p-3 rounded-xl ${getStatusColor(investigation.status)}`}>
                  {getStatusIcon(investigation.status)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-2 gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-neutral-900 mb-1">
                        {investigation.title}
                      </h3>
                      <p className="text-sm text-neutral-600 line-clamp-2">
                        {investigation.description}
                      </p>
                    </div>
                    <div className="flex gap-2 sm:ml-4 flex-shrink-0">
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getPriorityColor(investigation.priority)}`}>
                        {PRIORITY_LABELS[investigation.priority]}
                      </span>
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${getStatusColor(investigation.status)}`}>
                        {INVESTIGATION_LABELS[investigation.status]}
                      </span>
                    </div>
                  </div>

                  {/* Meta Info */}
                  <div className="flex flex-wrap items-center gap-4 text-sm text-neutral-500 mt-3">
                    {investigation.lga_name && (
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        <span>{investigation.lga_name}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      <span>{investigation.created_by_name || 'State Official'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(investigation.created_at)}</span>
                    </div>
                    {investigation.investigation_type && (
                      <div className="flex items-center gap-1">
                        <FileText className="w-4 h-4" />
                        <span>{investigation.investigation_type}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <Button
                  size="sm"
                  variant="outline"
                  icon={Eye}
                  onClick={() => handleViewDetails(investigation)}
                >
                  View
                </Button>
              </div>
            </Card>
          ))
        ) : (
          <EmptyCard
            icon={FileText}
            title="No Investigations Found"
            description={searchTerm ? 'Try changing your search term' : 'No investigations match your filters'}
          />
        )}
      </div>

      {/* Create Investigation Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Investigation"
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={newInvestigation.title}
              onChange={(e) => setNewInvestigation({ ...newInvestigation, title: e.target.value })}
              placeholder="Brief title of the investigation"
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={newInvestigation.description}
              onChange={(e) => setNewInvestigation({ ...newInvestigation, description: e.target.value })}
              placeholder="Detailed description of what needs to be investigated"
              rows={4}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Priority
              </label>
              <select
                value={newInvestigation.priority}
                onChange={(e) => setNewInvestigation({ ...newInvestigation, priority: e.target.value })}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
              >
                {Object.entries(PRIORITY_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Type
              </label>
              <select
                value={newInvestigation.investigation_type}
                onChange={(e) => setNewInvestigation({ ...newInvestigation, investigation_type: e.target.value })}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
              >
                {Object.keys(INVESTIGATION_TYPES).map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-neutral-200">
            <Button
              onClick={handleCreateInvestigation}
              loading={createMutation.isPending}
              className="flex-1"
            >
              Create Investigation
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowCreateModal(false)}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      {/* Investigation Details Modal */}
      <Modal
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedInvestigation(null);
        }}
        title="Investigation Details"
        size="lg"
      >
        {selectedInvestigation && (
          <div className="space-y-6">
            {/* Header */}
            <div className={`p-5 rounded-xl ${getStatusColor(selectedInvestigation.status)}`}>
              <div className="flex items-center gap-3 mb-3">
                {getStatusIcon(selectedInvestigation.status)}
                <h3 className="text-xl font-bold text-neutral-900">{selectedInvestigation.title}</h3>
              </div>
              <div className="flex gap-2">
                <span className={`px-3 py-1 text-xs font-semibold rounded-full bg-white`}>
                  {INVESTIGATION_LABELS[selectedInvestigation.status]}
                </span>
                <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getPriorityColor(selectedInvestigation.priority)}`}>
                  {PRIORITY_LABELS[selectedInvestigation.priority]}
                </span>
              </div>
            </div>

            {/* Description */}
            <div className="p-4 bg-neutral-50 rounded-lg">
              <h4 className="font-semibold text-neutral-900 mb-2">Description</h4>
              <p className="text-sm text-neutral-700 leading-relaxed">{selectedInvestigation.description}</p>
            </div>

            {/* Meta Info */}
            <div className="grid grid-cols-2 gap-4">
              {selectedInvestigation.lga_name && (
                <div className="p-3 bg-neutral-50 rounded-lg">
                  <p className="text-xs text-neutral-500 mb-1">LGA</p>
                  <p className="font-medium text-neutral-900">{selectedInvestigation.lga_name}</p>
                </div>
              )}
              <div className="p-3 bg-neutral-50 rounded-lg">
                <p className="text-xs text-neutral-500 mb-1">Created By</p>
                <p className="font-medium text-neutral-900">{selectedInvestigation.created_by_name || 'State Official'}</p>
              </div>
              <div className="p-3 bg-neutral-50 rounded-lg">
                <p className="text-xs text-neutral-500 mb-1">Created On</p>
                <p className="font-medium text-neutral-900">{formatDate(selectedInvestigation.created_at, true)}</p>
              </div>
              {selectedInvestigation.investigation_type && (
                <div className="p-3 bg-neutral-50 rounded-lg">
                  <p className="text-xs text-neutral-500 mb-1">Type</p>
                  <p className="font-medium text-neutral-900">{selectedInvestigation.investigation_type}</p>
                </div>
              )}
            </div>

            {/* Actions */}
            {selectedInvestigation.status !== INVESTIGATION_STATUS.CLOSED && (
              <div className="flex gap-3 pt-4 border-t border-neutral-200">
                {selectedInvestigation.status === INVESTIGATION_STATUS.OPEN && (
                  <Button
                    onClick={() => handleUpdateStatus(selectedInvestigation.id, INVESTIGATION_STATUS.IN_PROGRESS)}
                    loading={updateMutation.isPending}
                    className="flex-1"
                  >
                    Start Investigation
                  </Button>
                )}
                {selectedInvestigation.status === INVESTIGATION_STATUS.IN_PROGRESS && (
                  <Button
                    variant="success"
                    onClick={() => handleUpdateStatus(selectedInvestigation.id, INVESTIGATION_STATUS.CLOSED)}
                    loading={updateMutation.isPending}
                    className="flex-1"
                  >
                    Mark as Closed
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
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default StateInvestigationsPage;
