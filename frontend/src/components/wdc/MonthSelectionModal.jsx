import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Calendar,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  Loader2,
  ArrowRight,
  Ban,
} from 'lucide-react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import LoadingSpinner from '../common/LoadingSpinner';
import { formatMonthDisplay } from '../../utils/dateUtils';
import { checkSubmitted, getMySubmissions } from '../../api/reports';

/**
 * MonthSelectionModal - A professional modal for WDC Secretary to select report month
 * 
 * Features:
 * - Clean calendar-style month selection
 * - Validation for future months (rejected with warning)
 * - Validation for already submitted months (rejected with info)
 * - Visual indicators for submitted vs available months
 * - Submission history preview
 */
const MonthSelectionModal = ({
  isOpen,
  onClose,
  submittedMonths: propSubmittedMonths = [],
  reports: propReports = [],
}) => {
  const navigate = useNavigate();
  const [selectedMonth, setSelectedMonth] = useState('');
  const [checkingMonth, setCheckingMonth] = useState(false);
  const [error, setError] = useState('');
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [submittedMonths, setSubmittedMonths] = useState(propSubmittedMonths);
  const [reports, setReports] = useState(propReports);
  const [loading, setLoading] = useState(false);

  // Fetch submissions if not provided via props
  useEffect(() => {
    if (isOpen && propSubmittedMonths.length === 0) {
      setLoading(true);
      getMySubmissions()
        .then((response) => {
          // API returns {submitted_months, reports} directly (no .data wrapper)
          const data = response || {};
          console.log('MonthSelectionModal - fetched data:', data);
          setSubmittedMonths(data.submitted_months || []);
          setReports(data.reports || []);
        })
        .catch((err) => {
          console.error('MonthSelectionModal - fetch error:', err);
          // Silently fail - will rely on server validation
          setSubmittedMonths([]);
          setReports([]);
        })
        .finally(() => setLoading(false));
    } else {
      setSubmittedMonths(propSubmittedMonths);
      setReports(propReports);
    }
  }, [isOpen, propSubmittedMonths, propReports]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedMonth('');
      setError('');
      setCheckingMonth(false);
      setCurrentYear(new Date().getFullYear());
    }
  }, [isOpen]);

  // Generate available months (last 12 months + current)
  const availableMonths = useMemo(() => {
    const months = [];
    const now = new Date();
    
    // Generate last 24 months for selection (more flexibility)
    for (let i = 24; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      months.push({
        value: `${year}-${month}`,
        year,
        month: d.getMonth(),
        monthName: d.toLocaleDateString('en-US', { month: 'long' }),
        isFuture: false,
        isCurrentMonth: i === 0,
      });
    }
    
    return months;
  }, []);

  // Group months by year for display
  const monthsByYear = useMemo(() => {
    const grouped = {};
    availableMonths.forEach((m) => {
      if (!grouped[m.year]) grouped[m.year] = [];
      grouped[m.year].push(m);
    });
    return grouped;
  }, [availableMonths]);

  const years = useMemo(() => Object.keys(monthsByYear).sort((a, b) => b - a), [monthsByYear]);

  // Check if a month is already submitted
  const isMonthSubmitted = (monthValue) => {
    return submittedMonths.includes(monthValue);
  };

  // Check if month is in the future
  const isFutureMonth = (monthValue) => {
    const [year, month] = monthValue.split('-').map(Number);
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const selectedMonthStart = new Date(year, month - 1, 1);
    return selectedMonthStart > currentMonthStart;
  };

  // Get report for a specific month
  const getReportForMonth = (monthValue) => {
    return reports.find((r) => r.report_month === monthValue);
  };

  // Handle month selection
  const handleMonthSelect = (monthValue) => {
    setError('');
    setSelectedMonth(monthValue);
  };

  // Handle continue to form
  const handleContinue = async () => {
    setError('');

    if (!selectedMonth) {
      setError('Please select a month to continue.');
      return;
    }

    // Check if future month
    if (isFutureMonth(selectedMonth)) {
      setError(
        <div className="flex items-start gap-2">
          <Ban className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Cannot Submit for Future Month</p>
            <p className="text-sm opacity-90">
              {formatMonthDisplay(selectedMonth)} has not ended yet. You can only submit reports for previous months that have already passed.
            </p>
          </div>
        </div>
      );
      return;
    }

    // Check if already submitted
    if (isMonthSubmitted(selectedMonth)) {
      const report = getReportForMonth(selectedMonth);
      setError(
        <div className="flex items-start gap-2">
          <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Report Already Submitted</p>
            <p className="text-sm opacity-90">
              A report for {formatMonthDisplay(selectedMonth)} was already submitted on{' '}
              {report?.submitted_at
                ? new Date(report.submitted_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : 'N/A'}
              . Each month can only be reported once.
            </p>
          </div>
        </div>
      );
      return;
    }

    // Verify with server (additional safety check)
    setCheckingMonth(true);
    try {
      const response = await checkSubmitted(selectedMonth);
      const isSubmitted = response?.data?.submitted || response?.submitted;

      if (isSubmitted) {
        setError(
          <div className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Report Already Submitted</p>
              <p className="text-sm opacity-90">
                A report for {formatMonthDisplay(selectedMonth)} has already been submitted. You cannot submit again for the same month.
              </p>
            </div>
          </div>
        );
        setCheckingMonth(false);
        return;
      }

      // Success - navigate to submission form
      onClose();
      navigate('/wdc/submit', { state: { preselectedMonth: selectedMonth } });
    } catch (err) {
      // If check fails, proceed anyway - backend will reject if duplicate
      onClose();
      navigate('/wdc/submit', { state: { preselectedMonth: selectedMonth } });
    } finally {
      setCheckingMonth(false);
    }
  };

  // Get status for a month cell
  const getMonthStatus = (monthValue) => {
    if (isMonthSubmitted(monthValue)) return 'submitted';
    if (isFutureMonth(monthValue)) return 'future';
    return 'available';
  };

  // Render month cell
  const MonthCell = ({ month }) => {
    const status = getMonthStatus(month.value);
    const isSelected = selectedMonth === month.value;

    const statusStyles = {
      submitted: 'bg-green-50 border-green-200 text-green-700 cursor-not-allowed',
      future: 'bg-gray-50 border-gray-100 text-gray-400 cursor-not-allowed',
      available: 'bg-white border-gray-200 text-gray-700 hover:border-primary-400 hover:shadow-sm cursor-pointer',
    };

    const statusIcon = {
      submitted: <CheckCircle className="w-3.5 h-3.5 text-green-600" />,
      future: <Ban className="w-3.5 h-3.5 text-gray-400" />,
      available: null,
    };

    return (
      <button
        onClick={() => status === 'available' && handleMonthSelect(month.value)}
        disabled={status !== 'available'}
        className={`
          relative p-3 rounded-xl border-2 transition-all duration-200 flex flex-col items-center gap-1
          ${statusStyles[status]}
          ${isSelected ? 'ring-2 ring-primary-500 ring-offset-2 border-primary-500' : ''}
        `}
      >
        <span className="text-xs font-medium uppercase tracking-wide opacity-70">
          {month.monthName.slice(0, 3)}
        </span>
        <span className="text-lg font-bold">{month.month + 1}</span>
        {statusIcon[status] && (
          <div className="absolute top-1 right-1">{statusIcon[status]}</div>
        )}
        {status === 'submitted' && (
          <span className="absolute bottom-1 text-[8px] font-medium text-green-600 uppercase">
            Done
          </span>
        )}
      </button>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Select Report Month"
      size="xl"
      className="max-w-4xl"
    >
      <div className="space-y-6">
        {/* Loading State */}
        {loading && (
          <div className="py-8">
            <LoadingSpinner text="Loading your submission history..." />
          </div>
        )}

        {/* Header Info */}
        <div className="bg-gradient-to-r from-primary-50 to-blue-50 rounded-xl p-4 border border-primary-100">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-white rounded-lg shadow-sm flex items-center justify-center flex-shrink-0">
              <Calendar className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900">Submit Monthly Report</h3>
              <p className="text-sm text-neutral-600 mt-0.5">
                Choose the month you want to submit a report for. You can only submit for previous months that haven't been reported yet.
              </p>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-white border-2 border-gray-200" />
            <span className="text-neutral-600">Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-green-50 border-2 border-green-200" />
            <CheckCircle className="w-3.5 h-3.5 text-green-600" />
            <span className="text-neutral-600">Submitted</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-gray-50 border-2 border-gray-100" />
            <Ban className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-neutral-600">Future Month</span>
          </div>
        </div>

        {/* Year Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setCurrentYear((y) => Math.max(...years.map(Number), y - 1))}
            disabled={currentYear <= Math.min(...years.map(Number))}
            className="p-2 rounded-lg hover:bg-neutral-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-lg font-bold text-neutral-900">{currentYear}</span>
          <button
            onClick={() => setCurrentYear((y) => Math.min(...years.map(Number), y + 1))}
            disabled={currentYear >= Math.max(...years.map(Number))}
            className="p-2 rounded-lg hover:bg-neutral-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Months Grid */}
        {monthsByYear[currentYear] ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {monthsByYear[currentYear].map((month) => (
              <MonthCell key={month.value} month={month} />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-neutral-500">
            No months available for {currentYear}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="rounded-xl p-4 bg-red-50 border border-red-200 text-red-800">
            {error}
          </div>
        )}

        {/* Selected Month Preview */}
        {selectedMonth && !error && (
          <div className="rounded-xl p-4 bg-primary-50 border border-primary-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-primary-700 font-medium">Selected Month</p>
                <p className="text-lg font-bold text-primary-900">
                  {formatMonthDisplay(selectedMonth)}
                </p>
              </div>
              <Button
                onClick={handleContinue}
                disabled={checkingMonth}
                icon={checkingMonth ? Loader2 : ArrowRight}
                iconPosition="right"
                className={checkingMonth ? '[&_svg]:animate-spin' : ''}
              >
                {checkingMonth ? 'Checking...' : 'Continue to Form'}
              </Button>
            </div>
          </div>
        )}

        {/* Submission History Summary */}
        {submittedMonths.length > 0 && (
          <div className="border-t border-neutral-200 pt-4">
            <h4 className="text-sm font-semibold text-neutral-700 mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Your Submission History ({submittedMonths.length} reports)
            </h4>
            <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
              {submittedMonths
                .slice()
                .sort()
                .reverse()
                .map((month) => {
                  const report = getReportForMonth(month);
                  return (
                    <button
                      key={month}
                      onClick={() => report && navigate(`/reports/${report.id}`)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm hover:bg-green-100 transition-colors"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      {formatMonthDisplay(month)}
                      {report?.status === 'REVIEWED' && (
                        <span className="text-xs bg-green-200 text-green-800 px-1.5 py-0.5 rounded">
                          Reviewed
                        </span>
                      )}
                    </button>
                  );
                })}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-neutral-200">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleContinue}
            disabled={!selectedMonth || checkingMonth || !!error}
            icon={checkingMonth ? Loader2 : ArrowRight}
            iconPosition="right"
            className={checkingMonth ? '[&_svg]:animate-spin' : ''}
          >
            {checkingMonth ? 'Checking...' : 'Continue'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default MonthSelectionModal;
