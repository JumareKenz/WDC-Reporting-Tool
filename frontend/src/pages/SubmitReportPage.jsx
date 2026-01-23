import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Button from '../components/common/Button';
import WDCReportForm from '../components/wdc/WDCReportForm';
import { useAuth } from '../hooks/useAuth';

const SubmitReportPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

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
                {user?.ward_name || 'Your Ward'} • {user?.lga_name || 'Your LGA'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Form Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <WDCReportForm
          onSuccess={handleSuccess}
          onCancel={handleCancel}
          userWard={{ id: user?.ward_id, name: user?.ward_name }}
          userLGA={{ id: user?.lga_id, name: user?.lga_name }}
        />
      </div>
    </div>
  );
};

export default SubmitReportPage;
