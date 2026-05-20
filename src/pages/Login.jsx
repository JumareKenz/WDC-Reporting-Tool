import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, Phone, Lock, Mail, ShieldCheck } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { APP_CONFIG } from '../utils/constants';
import Button from '../components/common/Button';
import Logo from '../components/common/Logo';

const TABS = { MOBILE: 'mobile', CONSOLE: 'console' };

const Login = () => {
  const navigate = useNavigate();
  const { login, getDefaultRoute } = useAuth();

  const [tab, setTab] = useState(TABS.MOBILE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Mobile fields
  const [phone, setPhone] = useState('');
  const [pin, setPin]     = useState('');

  // Console fields
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [totp, setTotp]         = useState('');

  const clearError = () => setError(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const credentials =
        tab === TABS.MOBILE
          ? { phone: phone.trim(), pin: pin.trim() }
          : { email: email.trim(), password, totp: totp.trim() };

      const result = await login(credentials);
      if (result.success) {
        navigate(getDefaultRoute(), { replace: true });
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900">
      {/* Ambient glow */}
      <div className="absolute -top-24 left-1/4 w-96 h-96 bg-emerald-500 rounded-full opacity-20 pointer-events-none" style={{ filter: 'blur(100px)' }} />
      <div className="absolute -bottom-32 -right-16 w-96 h-96 bg-teal-500 rounded-full opacity-15 pointer-events-none" style={{ filter: 'blur(120px)' }} />
      <div className="absolute top-1/2 -left-24 w-72 h-72 bg-green-400 rounded-full opacity-10 pointer-events-none" style={{ filter: 'blur(90px)' }} />

      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-5">
              <Logo size="xl" showText={false} linkTo={null} />
            </div>
            <h1 className="text-3xl font-bold text-white mb-1.5 tracking-tight">{APP_CONFIG.APP_NAME}</h1>
            <p className="text-emerald-300 text-sm">{APP_CONFIG.APP_SUBTITLE}</p>
          </div>

          {/* Card */}
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
            {/* Tab selector */}
            <div className="flex rounded-xl overflow-hidden mb-6 bg-white/10">
              <button
                type="button"
                onClick={() => { setTab(TABS.MOBILE); clearError(); }}
                className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                  tab === TABS.MOBILE
                    ? 'bg-emerald-600 text-white'
                    : 'text-emerald-200 hover:text-white'
                }`}
              >
                Mobile (Phone + PIN)
              </button>
              <button
                type="button"
                onClick={() => { setTab(TABS.CONSOLE); clearError(); }}
                className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                  tab === TABS.CONSOLE
                    ? 'bg-emerald-600 text-white'
                    : 'text-emerald-200 hover:text-white'
                }`}
              >
                Console (Director)
              </button>
            </div>

            {/* Error */}
            {error && (
              <div
                role="alert"
                className="mb-5 flex items-start gap-3 px-4 py-3 rounded-xl bg-red-500/20 border border-red-400/40 text-red-100"
              >
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
                <p className="text-sm font-medium flex-1">{error}</p>
                <button type="button" onClick={clearError} className="text-red-300 hover:text-red-100 transition-colors" aria-label="Dismiss">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {tab === TABS.MOBILE ? (
                <>
                  {/* Phone */}
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-white mb-1.5">Phone Number</label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                      <input
                        id="phone"
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => { setPhone(e.target.value); clearError(); }}
                        placeholder="+2348012345678"
                        disabled={loading}
                        autoComplete="tel"
                        className="w-full px-4 py-3 pl-10.5 bg-white/80 border border-neutral-200 rounded-xl text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 text-sm disabled:opacity-50"
                      />
                    </div>
                  </div>

                  {/* PIN */}
                  <div>
                    <label htmlFor="pin" className="block text-sm font-medium text-white mb-1.5">6-Digit PIN</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                      <input
                        id="pin"
                        type="password"
                        inputMode="numeric"
                        maxLength={6}
                        required
                        value={pin}
                        onChange={(e) => { setPin(e.target.value.replace(/\D/g, '')); clearError(); }}
                        placeholder="••••••"
                        disabled={loading}
                        autoComplete="current-password"
                        className="w-full px-4 py-3 pl-10.5 bg-white/80 border border-neutral-200 rounded-xl text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 text-sm disabled:opacity-50 tracking-widest"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Email */}
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-white mb-1.5">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                      <input
                        id="email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); clearError(); }}
                        placeholder="director@kaduna.gov.ng"
                        disabled={loading}
                        autoComplete="email"
                        className="w-full px-4 py-3 pl-10.5 bg-white/80 border border-neutral-200 rounded-xl text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 text-sm disabled:opacity-50"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-white mb-1.5">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                      <input
                        id="password"
                        type="password"
                        required
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); clearError(); }}
                        placeholder="Enter your password"
                        disabled={loading}
                        autoComplete="current-password"
                        className="w-full px-4 py-3 pl-10.5 bg-white/80 border border-neutral-200 rounded-xl text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 text-sm disabled:opacity-50"
                      />
                    </div>
                  </div>

                  {/* TOTP */}
                  <div>
                    <label htmlFor="totp" className="block text-sm font-medium text-white mb-1.5">Authenticator Code</label>
                    <div className="relative">
                      <ShieldCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                      <input
                        id="totp"
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        required
                        value={totp}
                        onChange={(e) => { setTotp(e.target.value.replace(/\D/g, '')); clearError(); }}
                        placeholder="123456"
                        disabled={loading}
                        autoComplete="one-time-code"
                        className="w-full px-4 py-3 pl-10.5 bg-white/80 border border-neutral-200 rounded-xl text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 text-sm disabled:opacity-50 tracking-widest"
                      />
                    </div>
                    <p className="text-xs text-emerald-300/70 mt-1">6-digit code from your authenticator app</p>
                  </div>
                </>
              )}

              <Button type="submit" variant="primary" size="lg" fullWidth loading={loading} icon={loading ? undefined : LogIn}>
                {loading ? 'Signing in…' : 'Sign In'}
              </Button>
            </form>
          </div>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-sm text-emerald-300">{APP_CONFIG.STATE_NAME}, {APP_CONFIG.COUNTRY}</p>
            <p className="text-xs text-emerald-400/60 mt-1">Support: {APP_CONFIG.SUPPORT_EMAIL}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
