import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LogIn, MapPin, Lock, Mail, ShieldCheck, Building2,
  ArrowLeft, ArrowRight, Search, Check, ChevronRight, Loader2,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { APP_CONFIG, API_ENDPOINTS } from '../utils/constants';
import Button from '../components/common/Button';
import Logo from '../components/common/Logo';

const TABS = { MOBILE: 'mobile', CONSOLE: 'console' };
const STEPS = { LGA: 1, WARD: 2, PIN: 3 };
const STEP_LABELS = { 1: 'Local Government', 2: 'Ward', 3: 'Sign In' };

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://kadwdc.equily.ng/api/v1';

const fetchJSON = async (path) => {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Request failed (${res.status})`);
  }
  const body = await res.json();
  return body?.data ?? body;
};

const Login = () => {
  const navigate = useNavigate();
  const { login, getDefaultRoute } = useAuth();

  const [tab, setTab] = useState(TABS.MOBILE);
  const [step, setStep] = useState(STEPS.LGA);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Secretary flow state
  const [lgas, setLgas] = useState([]);
  const [loadingLgas, setLoadingLgas] = useState(false);
  const [lgaQuery, setLgaQuery] = useState('');
  const [selectedLga, setSelectedLga] = useState(null);

  const [wards, setWards] = useState([]);
  const [loadingWards, setLoadingWards] = useState(false);
  const [wardQuery, setWardQuery] = useState('');
  const [selectedWard, setSelectedWard] = useState(null);

  const [pinDigits, setPinDigits] = useState(['', '', '', '']);
  const pinRefs = useRef([]);

  // Console flow state
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [totp, setTotp]         = useState('');

  const clearError = () => setError(null);

  // Load LGAs on first entry to secretary tab
  useEffect(() => {
    if (tab !== TABS.MOBILE || lgas.length > 0) return;
    let cancelled = false;
    setLoadingLgas(true);
    fetchJSON(API_ENDPOINTS.LGAS)
      .then((data) => {
        if (cancelled) return;
        const list = Array.isArray(data) ? data : (data?.lgas ?? []);
        setLgas(list);
      })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoadingLgas(false); });
    return () => { cancelled = true; };
  }, [tab, lgas.length]);

  // Load wards when LGA selected
  useEffect(() => {
    if (!selectedLga) { setWards([]); return; }
    let cancelled = false;
    setLoadingWards(true);
    setWards([]);
    fetchJSON(API_ENDPOINTS.LGA_WARDS(selectedLga.id))
      .then((data) => {
        if (cancelled) return;
        const list = Array.isArray(data) ? data : (data?.wards ?? []);
        setWards(list);
      })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoadingWards(false); });
    return () => { cancelled = true; };
  }, [selectedLga]);

  const filteredLgas = useMemo(() => {
    const q = lgaQuery.trim().toLowerCase();
    return q ? lgas.filter((l) => l.name?.toLowerCase().includes(q)) : lgas;
  }, [lgas, lgaQuery]);

  const filteredWards = useMemo(() => {
    const q = wardQuery.trim().toLowerCase();
    return q ? wards.filter((w) => w.name?.toLowerCase().includes(q)) : wards;
  }, [wards, wardQuery]);

  const pin = pinDigits.join('');
  const canSubmitMobile = selectedLga && selectedWard && /^\d{4}$/.test(pin);

  const handlePinChange = (idx, value) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...pinDigits];
    next[idx] = digit;
    setPinDigits(next);
    clearError();
    if (digit && idx < 3) pinRefs.current[idx + 1]?.focus();
  };

  const handlePinKey = (idx, e) => {
    if (e.key === 'Backspace' && !pinDigits[idx] && idx > 0) {
      pinRefs.current[idx - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && idx > 0) {
      pinRefs.current[idx - 1]?.focus();
    } else if (e.key === 'ArrowRight' && idx < 3) {
      pinRefs.current[idx + 1]?.focus();
    }
  };

  const handlePinPaste = (e) => {
    e.preventDefault();
    const text = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 4);
    if (!text) return;
    const next = ['', '', '', ''];
    for (let i = 0; i < text.length; i++) next[i] = text[i];
    setPinDigits(next);
    const focusIdx = Math.min(text.length, 3);
    pinRefs.current[focusIdx]?.focus();
  };

  const selectLga = (lga) => {
    setSelectedLga(lga);
    setSelectedWard(null);
    setWardQuery('');
    setStep(STEPS.WARD);
    clearError();
  };

  const selectWard = (ward) => {
    setSelectedWard(ward);
    setStep(STEPS.PIN);
    setPinDigits(['', '', '', '']);
    clearError();
    setTimeout(() => pinRefs.current[0]?.focus(), 80);
  };

  const goBack = () => {
    if (step === STEPS.WARD) setStep(STEPS.LGA);
    else if (step === STEPS.PIN) setStep(STEPS.WARD);
    clearError();
  };

  const switchTab = (newTab) => {
    if (newTab === tab) return;
    setTab(newTab);
    setError(null);
    setStep(STEPS.LGA);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (tab === TABS.MOBILE && !canSubmitMobile) {
      setError('Please complete every step before signing in.');
      return;
    }

    setLoading(true);
    try {
      const credentials =
        tab === TABS.MOBILE
          ? { lgaId: Number(selectedLga.id), wardId: Number(selectedWard.id), pin }
          : { email: email.trim(), password, totp: totp.trim() };

      const result = await login(credentials);
      if (result?.success) {
        navigate(getDefaultRoute(), { replace: true });
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-950 via-emerald-950 to-slate-950">
      {/* Ambient glow */}
      <div
        className="absolute -top-32 left-1/4 w-[28rem] h-[28rem] bg-emerald-500 rounded-full opacity-25 pointer-events-none animate-pulse-soft"
        style={{ filter: 'blur(120px)', animationDuration: '8s' }}
      />
      <div
        className="absolute -bottom-40 -right-20 w-[28rem] h-[28rem] bg-teal-500 rounded-full opacity-20 pointer-events-none animate-pulse-soft"
        style={{ filter: 'blur(140px)', animationDuration: '10s' }}
      />
      <div
        className="absolute top-1/2 -left-32 w-80 h-80 bg-green-400 rounded-full opacity-15 pointer-events-none animate-pulse-soft"
        style={{ filter: 'blur(100px)', animationDuration: '12s' }}
      />
      {/* Subtle grid texture */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.35]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.06) 1px, transparent 0)',
          backgroundSize: '32px 32px',
        }}
      />

      <div className="relative z-10 flex items-center justify-center min-h-screen p-4 py-8">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="flex justify-center mb-4">
              <Logo size="xl" showText={false} linkTo={null} />
            </div>
            <h1 className="text-3xl font-bold text-white mb-1 tracking-tight">
              {APP_CONFIG.APP_NAME}
            </h1>
            <p className="text-emerald-300/90 text-sm">{APP_CONFIG.APP_SUBTITLE}</p>
          </div>

          {/* Card */}
          <div
            className="rounded-3xl p-6 sm:p-8"
            style={{
              background:
                'linear-gradient(180deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.07) 100%)',
              backdropFilter: 'blur(28px)',
              WebkitBackdropFilter: 'blur(28px)',
              border: '1px solid rgba(255,255,255,0.18)',
              boxShadow:
                '0 20px 60px -10px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.12)',
            }}
          >
            {/* Tab selector */}
            <div className="flex rounded-2xl mb-6 bg-white/5 border border-white/10 p-1">
              <button
                type="button"
                onClick={() => switchTab(TABS.MOBILE)}
                className={`flex-1 py-2.5 text-sm font-medium rounded-xl transition-all ${
                  tab === TABS.MOBILE
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-600/30'
                    : 'text-emerald-200/70 hover:text-white'
                }`}
              >
                WDC Secretary
              </button>
              <button
                type="button"
                onClick={() => switchTab(TABS.CONSOLE)}
                className={`flex-1 py-2.5 text-sm font-medium rounded-xl transition-all ${
                  tab === TABS.CONSOLE
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-600/30'
                    : 'text-emerald-200/70 hover:text-white'
                }`}
              >
                Director / Coordinator
              </button>
            </div>

            {/* Stepper (secretary only) */}
            {tab === TABS.MOBILE && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  {[STEPS.LGA, STEPS.WARD, STEPS.PIN].map((s, i) => {
                    const active = step === s;
                    const done = step > s;
                    return (
                      <div key={s} className="flex items-center flex-1">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                            done
                              ? 'bg-emerald-500 text-white'
                              : active
                              ? 'bg-emerald-500 text-white ring-4 ring-emerald-500/30'
                              : 'bg-white/10 text-emerald-200/60 border border-white/15'
                          }`}
                        >
                          {done ? <Check className="w-3.5 h-3.5" /> : s}
                        </div>
                        {i < 2 && (
                          <div
                            className={`flex-1 h-0.5 mx-2 rounded-full transition-all ${
                              step > s ? 'bg-emerald-500' : 'bg-white/10'
                            }`}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-emerald-300/70 text-center mt-1">
                  Step {step} of 3 · {STEP_LABELS[step]}
                </p>
              </div>
            )}

            {/* Error */}
            {error && (
              <div
                role="alert"
                className="mb-5 flex items-start gap-3 px-4 py-3 rounded-xl bg-red-500/15 border border-red-400/30 text-red-100 animate-slide-down"
              >
                <svg
                  className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-300"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                  />
                </svg>
                <p className="text-sm font-medium flex-1">{error}</p>
                <button
                  type="button"
                  onClick={clearError}
                  className="text-red-300 hover:text-red-100 transition-colors"
                  aria-label="Dismiss"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            )}

            {tab === TABS.MOBILE ? (
              <form onSubmit={handleSubmit}>
                {/* STEP 1 — LGA */}
                {step === STEPS.LGA && (
                  <div key="lga-step" className="animate-fade-in">
                    <div className="mb-4">
                      <h2 className="text-xl font-semibold text-white mb-1">
                        Select your Local Government
                      </h2>
                      <p className="text-sm text-emerald-200/70">
                        Find your LGA from the list to continue.
                      </p>
                    </div>

                    {/* Search */}
                    <div className="relative mb-3">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-200/60 pointer-events-none" />
                      <input
                        type="text"
                        value={lgaQuery}
                        onChange={(e) => setLgaQuery(e.target.value)}
                        placeholder="Search LGAs…"
                        className="w-full pl-10 pr-3 py-2.5 bg-white/8 border border-white/15 rounded-xl text-white placeholder-emerald-200/50 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/50 focus:border-transparent transition-all"
                      />
                    </div>

                    {/* List */}
                    <div className="max-h-72 overflow-y-auto pr-1 -mr-1 space-y-1.5 login-scroll">
                      {loadingLgas ? (
                        <div className="flex items-center justify-center py-12 text-emerald-200/70">
                          <Loader2 className="w-5 h-5 animate-spin mr-2" />
                          <span className="text-sm">Loading LGAs…</span>
                        </div>
                      ) : filteredLgas.length === 0 ? (
                        <div className="text-center py-10 text-sm text-emerald-200/60">
                          {lgas.length === 0
                            ? 'No LGAs available right now.'
                            : 'No LGAs match your search.'}
                        </div>
                      ) : (
                        filteredLgas.map((lga) => (
                          <button
                            key={lga.id}
                            type="button"
                            onClick={() => selectLga(lga)}
                            className="w-full group flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-emerald-400/40 transition-all text-left"
                          >
                            <div className="w-9 h-9 rounded-lg bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center flex-shrink-0">
                              <Building2 className="w-4 h-4 text-emerald-300" />
                            </div>
                            <span className="flex-1 text-sm font-medium text-white">
                              {lga.name}
                            </span>
                            <ChevronRight className="w-4 h-4 text-emerald-300/60 group-hover:text-emerald-300 group-hover:translate-x-0.5 transition-all" />
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* STEP 2 — WARD */}
                {step === STEPS.WARD && (
                  <div key="ward-step" className="animate-fade-in">
                    <button
                      type="button"
                      onClick={goBack}
                      className="inline-flex items-center gap-1.5 text-sm text-emerald-300/80 hover:text-white mb-3 transition-colors"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Back
                    </button>

                    <div className="mb-4">
                      <h2 className="text-xl font-semibold text-white mb-1">
                        Select your Ward
                      </h2>
                      <p className="text-sm text-emerald-200/70 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5" />
                        {selectedLga?.name}
                      </p>
                    </div>

                    {/* Search */}
                    <div className="relative mb-3">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-200/60 pointer-events-none" />
                      <input
                        type="text"
                        value={wardQuery}
                        onChange={(e) => setWardQuery(e.target.value)}
                        placeholder="Search wards…"
                        className="w-full pl-10 pr-3 py-2.5 bg-white/8 border border-white/15 rounded-xl text-white placeholder-emerald-200/50 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/50 focus:border-transparent transition-all"
                      />
                    </div>

                    <div className="max-h-72 overflow-y-auto pr-1 -mr-1 space-y-1.5 login-scroll">
                      {loadingWards ? (
                        <div className="flex items-center justify-center py-12 text-emerald-200/70">
                          <Loader2 className="w-5 h-5 animate-spin mr-2" />
                          <span className="text-sm">Loading wards…</span>
                        </div>
                      ) : filteredWards.length === 0 ? (
                        <div className="text-center py-10 text-sm text-emerald-200/60">
                          {wards.length === 0
                            ? 'No wards found for this LGA.'
                            : 'No wards match your search.'}
                        </div>
                      ) : (
                        filteredWards.map((ward) => (
                          <button
                            key={ward.id}
                            type="button"
                            onClick={() => selectWard(ward)}
                            className="w-full group flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-emerald-400/40 transition-all text-left"
                          >
                            <div className="w-9 h-9 rounded-lg bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center flex-shrink-0">
                              <MapPin className="w-4 h-4 text-emerald-300" />
                            </div>
                            <span className="flex-1 text-sm font-medium text-white">
                              {ward.name}
                            </span>
                            <ChevronRight className="w-4 h-4 text-emerald-300/60 group-hover:text-emerald-300 group-hover:translate-x-0.5 transition-all" />
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* STEP 3 — PIN */}
                {step === STEPS.PIN && (
                  <div key="pin-step" className="animate-fade-in">
                    <button
                      type="button"
                      onClick={goBack}
                      className="inline-flex items-center gap-1.5 text-sm text-emerald-300/80 hover:text-white mb-3 transition-colors"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Back
                    </button>

                    <div className="mb-5">
                      <h2 className="text-xl font-semibold text-white mb-1">
                        Enter your PIN
                      </h2>
                      <p className="text-sm text-emerald-200/70">
                        Signing in as WDC Secretary for
                      </p>
                    </div>

                    {/* Selection summary */}
                    <div className="mb-6 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-400/20">
                      <div className="flex items-center gap-2 text-sm text-white">
                        <Building2 className="w-4 h-4 text-emerald-300 flex-shrink-0" />
                        <span className="truncate">{selectedLga?.name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-white/90 mt-1.5">
                        <MapPin className="w-4 h-4 text-emerald-300 flex-shrink-0" />
                        <span className="truncate">{selectedWard?.name}</span>
                      </div>
                    </div>

                    {/* PIN boxes */}
                    <label className="block text-sm font-medium text-white mb-2.5 text-center">
                      4-Digit PIN
                    </label>
                    <div className="flex justify-center gap-3 mb-2" onPaste={handlePinPaste}>
                      {pinDigits.map((d, i) => (
                        <input
                          key={i}
                          ref={(el) => (pinRefs.current[i] = el)}
                          type="password"
                          inputMode="numeric"
                          autoComplete={i === 0 ? 'current-password' : 'off'}
                          maxLength={1}
                          value={d}
                          onChange={(e) => handlePinChange(i, e.target.value)}
                          onKeyDown={(e) => handlePinKey(i, e)}
                          onFocus={(e) => e.target.select()}
                          disabled={loading}
                          aria-label={`PIN digit ${i + 1}`}
                          className={`w-14 h-16 text-center text-2xl font-semibold rounded-2xl bg-white/10 border-2 transition-all text-white caret-emerald-300 focus:outline-none focus:bg-white/15 disabled:opacity-50 ${
                            d
                              ? 'border-emerald-400/70 shadow-lg shadow-emerald-500/10'
                              : 'border-white/15 focus:border-emerald-400/70'
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-emerald-300/60 text-center mb-6">
                      Default PIN is <span className="text-emerald-200 font-medium">1234</span>.
                      Change it after first sign-in.
                    </p>

                    <Button
                      type="submit"
                      variant="primary"
                      size="lg"
                      fullWidth
                      loading={loading}
                      disabled={!canSubmitMobile}
                      icon={loading ? undefined : LogIn}
                    >
                      {loading ? 'Signing in…' : 'Sign In'}
                    </Button>
                  </div>
                )}
              </form>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5 animate-fade-in">
                {/* Email */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-white mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-200/70" />
                    <input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); clearError(); }}
                      placeholder="director@kaduna.gov.ng"
                      disabled={loading}
                      autoComplete="email"
                      className="w-full pl-11 pr-4 py-3 bg-white/10 border border-white/15 rounded-xl text-white placeholder-emerald-200/40 focus:outline-none focus:ring-2 focus:ring-emerald-400/50 focus:border-transparent transition-all text-sm disabled:opacity-50"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-white mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-200/70" />
                    <input
                      id="password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); clearError(); }}
                      placeholder="Enter your password"
                      disabled={loading}
                      autoComplete="current-password"
                      className="w-full pl-11 pr-4 py-3 bg-white/10 border border-white/15 rounded-xl text-white placeholder-emerald-200/40 focus:outline-none focus:ring-2 focus:ring-emerald-400/50 focus:border-transparent transition-all text-sm disabled:opacity-50"
                    />
                  </div>
                </div>

                {/* TOTP */}
                <div>
                  <label htmlFor="totp" className="block text-sm font-medium text-white mb-1.5">
                    Authenticator Code
                  </label>
                  <div className="relative">
                    <ShieldCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-200/70" />
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
                      className="w-full pl-11 pr-4 py-3 bg-white/10 border border-white/15 rounded-xl text-white placeholder-emerald-200/40 focus:outline-none focus:ring-2 focus:ring-emerald-400/50 focus:border-transparent transition-all text-sm disabled:opacity-50 tracking-widest"
                    />
                  </div>
                  <p className="text-xs text-emerald-300/60 mt-1.5">
                    6-digit code from your authenticator app
                  </p>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  fullWidth
                  loading={loading}
                  icon={loading ? undefined : LogIn}
                >
                  {loading ? 'Signing in…' : 'Sign In'}
                </Button>
              </form>
            )}
          </div>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-sm text-emerald-300/90">
              {APP_CONFIG.STATE_NAME}, {APP_CONFIG.COUNTRY}
            </p>
            <p className="text-xs text-emerald-400/50 mt-1">
              Support: {APP_CONFIG.SUPPORT_EMAIL}
            </p>
          </div>
        </div>
      </div>

      {/* Custom scrollbar inside the login card */}
      <style>{`
        .login-scroll::-webkit-scrollbar { width: 6px; }
        .login-scroll::-webkit-scrollbar-track { background: transparent; }
        .login-scroll::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.15);
          border-radius: 9999px;
        }
        .login-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.25);
        }
      `}</style>
    </div>
  );
};

export default Login;
