import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Calendar } from 'lucide-react';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import WDCReportForm from '../components/wdc/WDCReportForm';
import DynamicForm from '../components/wdc/DynamicForm';
import { useAuth } from '../hooks/useAuth';
import apiClient from '../api/client';
import { API_ENDPOINTS } from '../utils/constants';
import { getSubmissionInfo as getLocalSubmissionInfo } from '../utils/dateUtils';
import { getSubmissionInfo } from '../api/reports';

const SubmitReportPage = () => {
  const navigate = useNavigate();
  const { user, verifyToken } = useAuth();
  const [activeForm, setActiveForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submissionInfo, setSubmissionInfo] = useState(null);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Refresh user data first to get latest assignments
        await verifyToken().catch(err => console.warn('Background user refresh failed', err));

        // Fetch submission info
        const infoResponse = await getSubmissionInfo();
        const info = infoResponse?.data || getLocalSubmissionInfo();
        setSubmissionInfo(info);
        setAlreadySubmitted(info.already_submitted || false);

        // Fetch active form
        const formResponse = await apiClient.get(API_ENDPOINTS.FORMS_ACTIVE);
        setActiveForm(formResponse?.data || null);
      } catch (error) {
        // Use local submission info if API fails
        const info = getLocalSubmissionInfo();
        setSubmissionInfo(info);
        setActiveForm(null);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [verifyToken]);

  const handleSuccess = () => {
    navigate('/wdc');
  };

  const handleCancel = () => {
    navigate('/wdc');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-primary-50/30">
      {/* Header */}
      <div className="bg-white border-b border-neutral-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              icon={ArrowLeft}
              onClick={handleCancel}
              className="!p-2"
            >
              <span className="hidden sm:inline">Back to Dashboard</span>
            </Button>
            <div className="flex-1">
              <h1 className="text-lg sm:text-xl font-bold text-neutral-900">
                Submit Monthly Report
              </h1>
              <p className="text-xs sm:text-sm text-neutral-600">
                {user?.ward?.name || 'Your Ward'} • {user?.ward?.lga_name || user?.lga?.name || 'Your LGA'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Form Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {loading ? (
          <div className="text-center py-12 text-neutral-500">Loading form...</div>
        ) : alreadySubmitted ? (
          <Card>
            <div className="text-center py-12">
              <CheckCircle className="w-16 h-16 text-success-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-neutral-900 mb-2">
                Report Already Submitted
              </h2>
              <p className="text-neutral-600 mb-6">
                You have already submitted a report for{' '}
                <span className="font-semibold">{submissionInfo?.month_name}</span>.
              </p>
              <div className="flex gap-3 justify-center">
                <Button onClick={() => navigate('/wdc/reports')}>
                  View Reports
                </Button>
                <Button variant="outline" onClick={() => navigate('/wdc')}>
                  Back to Dashboard
                </Button>
              </div>
            </div>
          </Card>
        ) : (
          <WDCReportForm
            onSuccess={handleSuccess}
            onCancel={handleCancel}
            userWard={{ id: user?.ward?.id, name: user?.ward?.name }}
            userLGA={{ id: user?.ward?.lga_id || user?.lga?.id, name: user?.ward?.lga_name || user?.lga?.name }}
            submissionInfo={submissionInfo}
          />
        )}
      </div>
    </div>
  );
};

export default SubmitReportPage;
