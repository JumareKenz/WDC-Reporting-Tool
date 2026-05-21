import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, ShieldCheck, LogOut } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import apiClient from '../api/client';
import { API_ENDPOINTS, APP_CONFIG } from '../utils/constants';
import Button from '../components/common/Button';
import Logo from '../components/common/Logo';

const PinInput = ({ id, label, value, onChange, disabled, autoFocus }) => (
  <div>
    <label htmlFor={id} className="block text-sm font-medium text-white mb-1.5">{label}</label>
    <div className="relative">
      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
      <input
        id={id}
        type="password"
        inputMode="numeric"
        maxLength={4}
        required
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, ''))}
        placeholder="••••"
        disabled={disabled}
        autoComplete="new-password"
        className="w-full px-4 py-3 pl-10.5 bg-white/80 border border-neutral-200 rounded-xl text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 text-sm disabled:opacity-50 tracking-widest"
      />
    </div>
  </div>
);

const ChangePin = () => {
  const navigate = useNavigate();
  const { user, logout, refreshToken, getDefaultRoute } = useAuth();
  const toast = useToast();

  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin]         = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);

  const isForced = user?.mustChangePin === true;

  const canSubmit = useMemo(() => {
    if (!/^\d{4}$/.test(newPin)) return false;
    if (newPin !== confirmPin) return false;
    if (newPin === '1234') return false;
    if (!isForced && !/^\d{4}$/.test(currentPin)) return false;
    return true;
  }, [currentPin, newPin, confirmPin, isForced]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!/^\d{4}$/.test(newPin)) {
      setError('New PIN must be exactly 4 digits.');
      return;
    }
    if (newPin === '1234') {
      setError('Choose a PIN other than the default 1234.');
      return;
    }
    if (newPin !== confirmPin) {
      setError('PINs do not match.');
      return;
    }

    setLoading(true);
    try {
      const body = isForced ? { pin: newPin } : { currentPin, pin: newPin };
      await apiClient.post(API_ENDPOINTS.SET_CREDENTIALS, body);

      // Refresh tokens so the new JWT no longer carries mustChangePin.
      await refreshToken().catch(() => { /* best-effort */ });

      toast.success('PIN updated successfully.');
      navigate(getDefaultRoute(), { replace: true });
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || 'Could not update PIN.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900">
      <div className="absolute -top-24 left-1/4 w-96 h-96 bg-emerald-500 rounded-full opacity-20 pointer-events-none" style={{ filter: 'blur(100px)' }} />
      <div className="absolute -bottom-32 -right-16 w-96 h-96 bg-teal-500 rounded-full opacity-15 pointer-events-none" style={{ filter: 'blur(120px)' }} />

      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-5">
              <Logo size="xl" showText={false} linkTo={null} />
            </div>
            <h1 className="text-3xl font-bold text-white mb-1.5 tracking-tight">
              {isForced ? 'Set Your PIN' : 'Change PIN'}
            </h1>
            <p className="text-emerald-300 text-sm">
              {isForced
                ? 'For your security, choose a new 4-digit PIN before continuing.'
                : 'Update the PIN you use to sign in.'}
            </p>
          </div>

          <div
            className="rounded-2xl p-8"
            style={{
              background: 'rgba(255,255,255,0.13)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              border: '1px solid rgba(255,255,255,0.18)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
            }}
          >
            {error && (
              <div role="alert" className="mb-5 flex items-start gap-3 px-4 py-3 rounded-xl bg-red-500/20 border border-red-400/40 text-red-100">
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
                <p className="text-sm font-medium flex-1">{error}</p>
                <button type="button" onClick={() => setError(null)} className="text-red-300 hover:text-red-100 transition-colors" aria-label="Dismiss">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {!isForced && (
                <PinInput
                  id="current-pin"
                  label="Current PIN"
                  value={currentPin}
                  onChange={setCurrentPin}
                  disabled={loading}
                  autoFocus
                />
              )}
              <PinInput
                id="new-pin"
                label="New 4-Digit PIN"
                value={newPin}
                onChange={setNewPin}
                disabled={loading}
                autoFocus={isForced}
              />
              <PinInput
                id="confirm-pin"
                label="Confirm New PIN"
                value={confirmPin}
                onChange={setConfirmPin}
                disabled={loading}
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                loading={loading}
                disabled={!canSubmit}
                icon={loading ? undefined : ShieldCheck}
              >
                {loading ? 'Saving…' : 'Save New PIN'}
              </Button>
            </form>

            {isForced && (
              <button
                type="button"
                onClick={handleSignOut}
                className="mt-4 w-full flex items-center justify-center gap-2 text-sm text-emerald-200 hover:text-white transition-colors"
              >
                <LogOut className="w-4 h-4" /> Sign out
              </button>
            )}
          </div>

          <div className="mt-6 text-center">
            <p className="text-xs text-emerald-400/60">Support: {APP_CONFIG.SUPPORT_EMAIL}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChangePin;
