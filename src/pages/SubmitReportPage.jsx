import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Camera, Mic } from 'lucide-react';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import WDCReportWizard from '../components/wdc/WDCReportWizard';
import DynamicForm from '../components/wdc/DynamicForm';
import OCRSubmitModal from '../components/wdc/OCRSubmitModal';
import VoiceAssistantModal from '../components/wdc/VoiceAssistantModal';
import { useAuth } from '../hooks/useAuth';
import apiClient from '../api/client';
import { API_ENDPOINTS } from '../utils/constants';
import { getSubmissionInfo as getLocalSubmissionInfo } from '../utils/dateUtils';

const SubmitReportPage = () => {
  const navigate = useNavigate();
  const { user, verifyToken } = useAuth();
  const [activeForm, setActiveForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submissionInfo, setSubmissionInfo] = useState(null);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [showOCRModal, setShowOCRModal] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [ocrFields, setOcrFields] = useState(null);
  const [voiceFields, setVoiceFields] = useState(null);
  // Track which mode the secretary used. Backend accepts: 'wizard' | 'amira' | 'snap'.
  // OCR (photo) → 'snap'; Voice Assistant → 'amira'; manual entry → 'wizard'.
  const submissionMethod = ocrFields ? 'snap' : voiceFields ? 'amira' : 'wizard';

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Refresh user data first to get latest assignments
        await verifyToken().catch(err => console.warn('Background user refresh failed', err));

        // Use local submission info (period calculation)
        const info = getLocalSubmissionInfo();
        setSubmissionInfo(info);

        // Fetch forms visible to this secretary
        const forms = await apiClient.get(API_ENDPOINTS.FORMS_VISIBLE);
        const form = Array.isArray(forms) ? forms[0] : null;
        setActiveForm(form || null);
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
              <h1 className="text-lg sm:text-xl font-bold text-neutral-900 flex items-center gap-2">
                Submit Monthly Report <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full">v2.5</span>
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
        {/* OCR & Voice Assistant Buttons */}
        {!loading && !alreadySubmitted && (
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="outline"
                icon={Camera}
                onClick={() => setShowOCRModal(true)}
                className="flex-1"
              >
                Submit via Photo
              </Button>
              <Button
                variant="outline"
                icon={Mic}
                onClick={() => setShowVoiceModal(true)}
                className="flex-1"
              >
                Submit via Voice Assistant
              </Button>
            </div>
            {(ocrFields || voiceFields) && (
              <div className="mt-3 px-4 py-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                Please review the auto-filled fields before submitting.
              </div>
            )}
          </div>
        )}

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
          <WDCReportWizard
            onSuccess={handleSuccess}
            onCancel={handleCancel}
            userWard={{ id: user?.ward?.id, name: user?.ward?.name }}
            userLGA={{ id: user?.ward?.lga_id || user?.lga?.id, name: user?.ward?.lga_name || user?.lga?.name }}
            submissionInfo={submissionInfo}
            injectedFields={ocrFields || voiceFields}
            submissionMethod={submissionMethod}
          />
        )}
      </div>

      {/* OCR Modal */}
      <OCRSubmitModal
        isOpen={showOCRModal}
        onClose={() => setShowOCRModal(false)}
        onFieldsExtracted={(fields) => setOcrFields(fields)}
      />

      {/* Voice Assistant Modal */}
      <VoiceAssistantModal
        isOpen={showVoiceModal}
        onClose={() => setShowVoiceModal(false)}
        formData={{}}
        onFieldsCollected={(fields) => setVoiceFields(fields)}
      />
    </div>
  );
};

export default SubmitReportPage;
