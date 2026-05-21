import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, RefreshCw, ChevronLeft, AlertCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { fetchLgas, fetchWards } from '../api/auth';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Alert from '../components/common/Alert';
import Logo from '../components/common/Logo';
import LgaSelector from '../components/secretary-login/LgaSelector';
import WardSelector from '../components/secretary-login/WardSelector';
import PinDots from '../components/secretary-login/PinDots';
import PinKeypad from '../components/secretary-login/PinKeypad';

const LAST_LGA_KEY = 'wdc_last_lga';
const LAST_WARD_KEY = 'wdc_last_ward';

const stepVariants = {
  enter: (direction) => ({ x: direction > 0 ? 80 : -80, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction) => ({ x: direction > 0 ? -80 : 80, opacity: 0 }),
};

const SecretaryLogin = () => {
  const navigate = useNavigate();
  const { loginWithPin, getDefaultRoute } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);

  // Data
  const [lgas, setLgas] = useState([]);
  const [wards, setWards] = useState([]);
  const [selectedLga, setSelectedLga] = useState(null);
  const [selectedWard, setSelectedWard] = useState(null);
  const [pin, setPin] = useState('');

  // Loading / error
  const [loadingLgas, setLoadingLgas] = useState(true);
  const [loadingWards, setLoadingWards] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Remembered selections
  const [lastLga, setLastLga] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LAST_LGA_KEY)); } catch { return null; }
  });
  const [lastWard, setLastWard] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LAST_WARD_KEY)); } catch { return null; }
  });

  // Step 1: load LGAs
  const loadLgas = useCallback(async () => {
    setLoadingLgas(true);
    setError(null);
    try {
      const data = await fetchLgas();
      setLgas(data);
    } catch {
      setError('Unable to load LGAs. Please check your connection and try again.');
    } finally {
      setLoadingLgas(false);
    }
  }, []);

  useEffect(() => { loadLgas(); }, [loadLgas]);

  // Step 2: load wards when LGA selected
  const loadWards = useCallback(async (lgaId) => {
    setLoadingWards(true);
    setError(null);
    try {
      const data = await fetchWards(lgaId);
      setWards(data);
    } catch {
      setError('Unable to load wards. Please check your connection and try again.');
    } finally {
      setLoadingWards(false);
    }
  }, []);

  const handleSelectLga = (lga) => {
    setSelectedLga(lga);
    localStorage.setItem(LAST_LGA_KEY, JSON.stringify({ id: lga.id, name: lga.name }));
    setLastLga({ id: lga.id, name: lga.name });
    setError(null);
    setDirection(1);
    setStep(2);
    loadWards(lga.id);
  };

  const handleSelectWard = (ward) => {
    setSelectedWard(ward);
    localStorage.setItem(LAST_WARD_KEY, JSON.stringify({ id: ward.id, name: ward.name, lga_id: selectedLga.id }));
    setLastWard({ id: ward.id, name: ward.name, lga_id: selectedLga.id });
    setError(null);
    setPin('');
    setDirection(1);
    setStep(3);
  };

  const handleDigit = (digit) => {
    if (pin.length >= 4) return;
    const newPin = pin + digit;
    setPin(newPin);
    setError(null);
    if (newPin.length === 4) {
      handleSubmitPin(newPin);
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setError(null);
  };

  const handleSubmitPin = async (submittedPin) => {
    setSubmitting(true);
    setError(null);
    try {
      const result = await loginWithPin(selectedLga.id, selectedWard.id, submittedPin);
      if (result.success) {
        navigate(getDefaultRoute(), { replace: true });
      }
    } catch (err) {
      setPin('');
      setSubmitting(false);

      // Debug logging
      console.log('Secretary login error:', { err, status: err?.status, message: err?.message, response: err?.response });

      // Try to extract status from various locations
      const status = err?.status || err?.response?.status;
      const message = err?.message || err?.response?.data?.detail;

      let errorMsg;
      if (err?.isNetworkError) {
        errorMsg = 'Unable to reach the server. Please check your connection and try again.';
      } else if (status === 401) {
        errorMsg = 'Incorrect PIN. Please try again.';
      } else if (status === 404) {
        errorMsg = 'No secretary is assigned to this ward. Contact your LGA coordinator.';
      } else if (status === 403) {
        errorMsg = 'PIN not set for this account. Contact your LGA coordinator.';
      } else if (status === 409) {
        errorMsg = 'Multiple secretaries found for this ward. Contact your state administrator.';
      } else {
        errorMsg = message || 'Something went wrong. Please try again.';
      }

      // Show error in UI state
      setError(errorMsg);
      
      // Also show as toast for visibility
      toast.error(errorMsg, { 
        title: 'Login Failed',
        duration: 0 // Don't auto-dismiss error toasts
      });
    }
  };

  const goBack = () => {
    setError(null);
    setDirection(-1);
    if (step === 3) {
      setPin('');
      setStep(2);
    } else if (step === 2) {
      setStep(1);
    }
  };

  // Valid lastWardId only if LGA matches
  const validLastWardId =
    lastWard && selectedLga && String(lastWard.lga_id) === String(selectedLga.id)
      ? lastWard.id
      : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-orange-50 to-white flex flex-col">
      {/* Top bar */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        {step === 1 ? (
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="flex items-center gap-1 text-neutral-600 hover:text-neutral-800 text-base py-2 pr-3"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={goBack}
            className="flex items-center gap-1 text-neutral-600 hover:text-neutral-800 text-base py-2 pr-3"
          >
            <ChevronLeft className="w-5 h-5" />
            <span>Back</span>
          </button>
        )}

        {/* Step indicator */}
        <div className="flex gap-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`w-2.5 h-2.5 rounded-full transition-colors ${
                s === step
                  ? 'bg-amber-600'
                  : s < step
                  ? 'bg-amber-400'
                  : 'bg-neutral-300'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Logo */}
      <div className="flex justify-center pt-2 pb-4">
        <Logo size="default" showText={false} linkTo={null} />
      </div>

      {/* Content */}
      <div className="flex-1 px-5 pb-8 max-w-md mx-auto w-full">
        <AnimatePresence mode="wait" custom={direction}>
          {step === 1 && (
            <motion.div
              key="step1"
              custom={direction}
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.2 }}
              className="flex flex-col h-full"
            >
              <h1 className="text-2xl font-bold text-neutral-900 mb-1">
                Select your LGA
              </h1>
              <p className="text-base text-neutral-500 mb-5">
                Choose your Local Government Area
              </p>

              {error && (
                <Alert
                  type="error"
                  message={error}
                  onClose={() => setError(null)}
                  className="mb-4"
                />
              )}

              {loadingLgas ? (
                <div className="flex-1 flex items-center justify-center py-12">
                  <LoadingSpinner size="lg" text="Loading LGAs..." />
                </div>
              ) : error && lgas.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-12 gap-4">
                  <button
                    type="button"
                    onClick={loadLgas}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-base font-medium transition-colors active:scale-95"
                  >
                    <RefreshCw className="w-5 h-5" />
                    Try again
                  </button>
                </div>
              ) : (
                <LgaSelector
                  lgas={lgas}
                  onSelect={handleSelectLga}
                  lastLgaId={lastLga?.id ?? null}
                />
              )}
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              custom={direction}
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.2 }}
              className="flex flex-col h-full"
            >
              <h1 className="text-2xl font-bold text-neutral-900 mb-1">
                Select your Ward
              </h1>
              <p className="text-base text-neutral-500 mb-5">
                {selectedLga?.name} LGA
              </p>

              {error && (
                <Alert
                  type="error"
                  message={error}
                  onClose={() => setError(null)}
                  className="mb-4"
                />
              )}

              {loadingWards ? (
                <div className="flex-1 flex items-center justify-center py-12">
                  <LoadingSpinner size="lg" text="Loading wards..." />
                </div>
              ) : error && wards.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-12 gap-4">
                  <button
                    type="button"
                    onClick={() => loadWards(selectedLga.id)}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-base font-medium transition-colors active:scale-95"
                  >
                    <RefreshCw className="w-5 h-5" />
                    Try again
                  </button>
                </div>
              ) : (
                <WardSelector
                  wards={wards}
                  onSelect={handleSelectWard}
                  lastWardId={validLastWardId}
                />
              )}
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              custom={direction}
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.2 }}
              className="flex flex-col items-center"
            >
              <p className="text-base text-neutral-500 mb-2 text-center">
                {selectedLga?.name} LGA &mdash; {selectedWard?.name} Ward
              </p>
              <h1 className="text-2xl font-bold text-neutral-900 mb-6 text-center">
                Enter your 4-digit PIN
              </h1>

              {error && (
                <div className="mb-4 w-full rounded-xl bg-red-500 border border-red-400 shadow-lg shadow-red-500/20 overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-2 bg-red-600">
                    <AlertCircle className="w-5 h-5 text-white" />
                    <span className="font-semibold text-white text-sm">Login Failed</span>
                  </div>
                  <div className="px-4 py-3">
                    <p className="text-white text-sm leading-relaxed">{error}</p>
                  </div>
                </div>
              )}

              <PinDots
                filledCount={pin.length}
                isError={!!error}
                isLoading={submitting}
              />

              <div className="mt-6 w-full">
                <PinKeypad
                  onDigit={handleDigit}
                  onBackspace={handleBackspace}
                  disabled={submitting}
                />
              </div>

              <p className="text-sm text-neutral-500 mt-8 text-center px-4">
                Forgotten your PIN? Contact your LGA coordinator to reset it.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default SecretaryLogin;
