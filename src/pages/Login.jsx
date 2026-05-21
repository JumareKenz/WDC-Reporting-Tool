import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck, Building2, ArrowLeft, Search, Loader2, Delete,
  Mail, Lock, KeyRound, ChevronRight,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { APP_CONFIG, API_ENDPOINTS } from '../utils/constants';
import { LogoIcon } from '../components/common/Logo';

// ──────────────────────────────────────────────────────────────────────────────
// View state machine
//   role    → landing: choose Secretary or Console
//   lga     → secretary step 1: pick LGA
//   ward    → secretary step 2: pick ward
//   pin     → secretary step 3: enter 4-digit PIN
//   console → director / coordinator email + password + TOTP
// ──────────────────────────────────────────────────────────────────────────────
const VIEW = {
  ROLE:    'role',
  LGA:     'lga',
  WARD:    'ward',
  PIN:     'pin',
  CONSOLE: 'console',
};

const normalizeBaseUrl = (raw) => {
  if (!raw) return 'https://kadwdc.equily.ng/api/v1';
  const trimmed = raw.replace(/\/$/, '');
  if (/\/api\/v\d+$/.test(trimmed)) return trimmed;
  if (/\/api$/.test(trimmed)) return `${trimmed}/v1`;
  return trimmed;
};
const BASE_URL = normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL);

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

// Cream/parchment surface — warm contrast against the deep emerald background.
const CARD_STYLE = {
  background: 'linear-gradient(180deg, #FFFBF0 0%, #FCEFCF 100%)',
  borderRadius: '28px',
  border: '1px solid rgba(255,255,255,0.5)',
  boxShadow:
    '0 30px 70px -20px rgba(6, 41, 30, 0.65), 0 12px 32px -10px rgba(6, 41, 30, 0.4), inset 0 1px 0 rgba(255,255,255,0.7)',
};

const Login = () => {
  const navigate = useNavigate();
  const { login, loginWithPin, getDefaultRoute } = useAuth();

  const [view, setView]       = useState(VIEW.ROLE);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  // Secretary data
  const [lgas, setLgas]                 = useState([]);
  const [loadingLgas, setLoadingLgas]   = useState(false);
  const [wards, setWards]               = useState([]);
  const [loadingWards, setLoadingWards] = useState(false);
  const [selectedLga, setSelectedLga]   = useState(null);
  const [selectedWard, setSelectedWard] = useState(null);
  const [lgaQuery, setLgaQuery]         = useState('');
  const [wardQuery, setWardQuery]       = useState('');
  const [pin, setPin]                   = useState('');

  // Console data
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [totp, setTotp]         = useState('');

  const clearError = () => setError(null);

  // Prefetch LGAs on mount so they're ready when the user taps "Ward Secretary"
  useEffect(() => {
    if (lgas.length > 0) return;
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
  }, [lgas.length]);

  // Load wards whenever the LGA changes
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

  // ── Navigation helpers ─────────────────────────────────────────────────────
  const goRole    = () => { setView(VIEW.ROLE); clearError(); };
  const goLga     = () => { setView(VIEW.LGA); clearError(); };
  const goWard    = () => { setView(VIEW.WARD); clearError(); };
  const goPin     = () => { setView(VIEW.PIN); setPin(''); clearError(); };
  const goConsole = () => { setView(VIEW.CONSOLE); clearError(); };

  const selectLga = (lga) => {
    setSelectedLga(lga);
    setSelectedWard(null);
    setWardQuery('');
    goWard();
  };

  const selectWard = (ward) => {
    setSelectedWard(ward);
    goPin();
  };

  // ── PIN handling ───────────────────────────────────────────────────────────
  const submittingRef = useRef(false);

  const submitMobile = async (fullPin) => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const result = await loginWithPin(selectedLga.id, selectedWard.id, fullPin);
      if (result?.success) {
        navigate(getDefaultRoute(), { replace: true });
      }
    } catch (err) {
      setError(err.message || 'Sign-in failed. Please check your PIN.');
      setPin('');
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  };

  const pushDigit = (d) => {
    if (loading) return;
    setError(null);
    setPin((prev) => {
      if (prev.length >= 4) return prev;
      const next = prev + d;
      if (next.length === 4 && selectedLga && selectedWard) {
        setTimeout(() => submitMobile(next), 80);
      }
      return next;
    });
  };

  const popDigit = () => {
    if (loading) return;
    setError(null);
    setPin((prev) => prev.slice(0, -1));
  };

  // Physical-keyboard support for the PIN view
  useEffect(() => {
    if (view !== VIEW.PIN) return;
    const onKey = (e) => {
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        pushDigit(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        popDigit();
      } else if (e.key === 'Escape') {
        goWard();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, loading, selectedLga, selectedWard]);

  // ── Console submit ─────────────────────────────────────────────────────────
  const submitConsole = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await login({
        email:    email.trim(),
        password,
        totp:     totp.trim(),
      });
      if (result?.success) {
        navigate(getDefaultRoute(), { replace: true });
      }
    } catch (err) {
      setError(err.message || 'Sign-in failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const stepIndex =
    view === VIEW.LGA  ? 0 :
    view === VIEW.WARD ? 1 :
    view === VIEW.PIN  ? 2 : -1;

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{
        background:
          'radial-gradient(120% 80% at 50% 0%, #1F7A52 0%, #0F4F3A 45%, #06291E 100%)',
      }}
    >
      {/* Ambient highlights — brand greens for depth */}
      <div
        className="absolute -top-32 left-1/4 w-[28rem] h-[28rem] rounded-full pointer-events-none"
        style={{ background: 'rgba(74, 222, 128, 0.22)', filter: 'blur(120px)' }}
      />
      <div
        className="absolute -bottom-40 -right-20 w-[30rem] h-[30rem] rounded-full pointer-events-none"
        style={{ background: 'rgba(22, 163, 74, 0.28)', filter: 'blur(140px)' }}
      />
      <div
        className="absolute top-1/2 -left-32 w-80 h-80 rounded-full pointer-events-none"
        style={{ background: 'rgba(134, 239, 172, 0.18)', filter: 'blur(110px)' }}
      />
      {/* Subtle texture grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.25]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.07) 1px, transparent 0)',
          backgroundSize: '32px 32px',
        }}
      />

      <div className="relative z-10 flex items-center justify-center min-h-screen p-4 py-6">
        <div className="w-full max-w-md">
          <div className="p-6 sm:p-8" style={CARD_STYLE}>
            {view === VIEW.ROLE && <RoleView onSecretary={goLga} onConsole={goConsole} />}
            {view === VIEW.LGA && (
              <LgaView
                stepIndex={stepIndex}
                lgas={filteredLgas}
                rawCount={lgas.length}
                loading={loadingLgas}
                query={lgaQuery}
                onQuery={setLgaQuery}
                onPick={selectLga}
                onBack={goRole}
                error={error}
                clearError={clearError}
              />
            )}
            {view === VIEW.WARD && (
              <WardView
                stepIndex={stepIndex}
                lga={selectedLga}
                wards={filteredWards}
                rawCount={wards.length}
                loading={loadingWards}
                query={wardQuery}
                onQuery={setWardQuery}
                onPick={selectWard}
                onBack={goLga}
                error={error}
                clearError={clearError}
              />
            )}
            {view === VIEW.PIN && (
              <PinView
                stepIndex={stepIndex}
                lga={selectedLga}
                ward={selectedWard}
                pin={pin}
                loading={loading}
                onPush={pushDigit}
                onPop={popDigit}
                onBack={goWard}
                error={error}
                clearError={clearError}
              />
            )}
            {view === VIEW.CONSOLE && (
              <ConsoleView
                email={email}
                password={password}
                totp={totp}
                onEmail={setEmail}
                onPassword={setPassword}
                onTotp={setTotp}
                onSubmit={submitConsole}
                loading={loading}
                onBack={goRole}
                error={error}
                clearError={clearError}
              />
            )}
          </div>

          {/* Footer */}
          <div className="mt-5 text-center">
            <p className="text-sm text-emerald-100/90 font-medium">
              {APP_CONFIG.STATE_NAME}, {APP_CONFIG.COUNTRY}
            </p>
            <p className="text-xs text-emerald-200/60 mt-1">
              Support: {APP_CONFIG.SUPPORT_EMAIL}
            </p>
          </div>
        </div>
      </div>

      <style>{`
        .wdc-scroll::-webkit-scrollbar { width: 6px; }
        .wdc-scroll::-webkit-scrollbar-track { background: transparent; }
        .wdc-scroll::-webkit-scrollbar-thumb {
          background: rgba(20, 83, 45, 0.18);
          border-radius: 9999px;
        }
        .wdc-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(20, 83, 45, 0.32);
        }
        @keyframes wdc-fade-in {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .wdc-fade-in { animation: wdc-fade-in 220ms ease-out; }
      `}</style>
    </div>
  );
};

// ──────────────────────────────────────────────────────────────────────────────
// Shared bits
// ──────────────────────────────────────────────────────────────────────────────
const Brand = ({ size = 'lg' }) => (
  <div className="flex justify-center">
    <LogoIcon className={size === 'lg' ? 'w-20 h-20' : 'w-14 h-14'} />
  </div>
);

const StepDots = ({ activeIndex }) => (
  <div className="flex items-center gap-1.5">
    {[0, 1, 2].map((i) => {
      const active = i <= activeIndex;
      return (
        <span
          key={i}
          className="rounded-full transition-all"
          style={{
            width:  active ? '18px' : '8px',
            height: '8px',
            background: active ? '#16A34A' : '#D6D3D1',
          }}
        />
      );
    })}
  </div>
);

const TopBar = ({ onBack, stepIndex }) => (
  <div className="flex items-center justify-between mb-5">
    <button
      type="button"
      onClick={onBack}
      className="inline-flex items-center gap-1 text-sm font-medium text-stone-700 hover:text-emerald-700 transition-colors"
    >
      <ArrowLeft className="w-4 h-4" />
      Back
    </button>
    <StepDots activeIndex={stepIndex} />
  </div>
);

const ErrorBanner = ({ error, onDismiss }) => {
  if (!error) return null;
  return (
    <div
      role="alert"
      className="mt-4 flex items-start gap-2.5 px-3.5 py-2.5 rounded-xl bg-red-50 border border-red-200 text-red-800 wdc-fade-in"
    >
      <span className="flex-1 text-sm">{error}</span>
      <button
        type="button"
        onClick={onDismiss}
        className="text-red-500 hover:text-red-700 text-lg leading-none -mt-0.5"
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
};

// ──────────────────────────────────────────────────────────────────────────────
// View: role landing
// ──────────────────────────────────────────────────────────────────────────────
const RoleView = ({ onSecretary, onConsole }) => (
  <div className="wdc-fade-in">
    <div className="pt-2 pb-4">
      <Brand />
      <h1 className="mt-5 text-center text-2xl font-bold text-stone-900 tracking-tight">
        {APP_CONFIG.APP_NAME.toUpperCase()}
      </h1>
      <p className="mt-1 text-center text-sm text-stone-500">
        {APP_CONFIG.APP_SUBTITLE}
      </p>
    </div>

    <div className="mt-6 space-y-3">
      <button
        type="button"
        onClick={onSecretary}
        className="w-full group flex items-center gap-4 p-4 rounded-2xl bg-white/90 border-2 border-emerald-500 hover:border-emerald-600 hover:bg-white active:scale-[0.99] transition-all shadow-sm hover:shadow-md text-left"
      >
        <div className="w-12 h-12 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center flex-shrink-0">
          <ShieldCheck className="w-6 h-6 text-emerald-700" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-base font-semibold text-stone-900">Ward Secretary</div>
          <div className="text-xs text-stone-500 mt-0.5">Log in with your ward PIN</div>
        </div>
        <ChevronRight className="w-5 h-5 text-emerald-500 group-hover:translate-x-0.5 transition-all" />
      </button>

      <button
        type="button"
        onClick={onConsole}
        className="w-full group flex items-center gap-4 p-4 rounded-2xl bg-white/90 border border-stone-200 hover:border-stone-300 hover:bg-white active:scale-[0.99] transition-all shadow-sm hover:shadow-md text-left"
      >
        <div className="w-12 h-12 rounded-xl bg-stone-100 border border-stone-200 flex items-center justify-center flex-shrink-0">
          <Building2 className="w-6 h-6 text-stone-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-base font-semibold text-stone-900">LGA / State Official</div>
          <div className="text-xs text-stone-500 mt-0.5">Log in with email &amp; password</div>
        </div>
        <ChevronRight className="w-5 h-5 text-stone-400 group-hover:text-stone-600 group-hover:translate-x-0.5 transition-all" />
      </button>
    </div>
  </div>
);

// ──────────────────────────────────────────────────────────────────────────────
// View: LGA picker
// ──────────────────────────────────────────────────────────────────────────────
const LgaView = ({ stepIndex, lgas, rawCount, loading, query, onQuery, onPick, onBack, error, clearError }) => (
  <div className="wdc-fade-in">
    <TopBar onBack={onBack} stepIndex={stepIndex} />
    <Brand size="sm" />
    <h2 className="mt-4 text-2xl font-bold text-stone-900 tracking-tight">Select your LGA</h2>
    <p className="text-sm text-stone-500 mt-1">Choose your Local Government Area</p>

    {rawCount > 10 && (
      <div className="relative mt-4">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Search LGAs…"
          className="w-full pl-10 pr-3 py-2.5 bg-white/95 border border-stone-200 rounded-xl text-stone-900 placeholder-stone-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/60 focus:border-transparent"
        />
      </div>
    )}

    <ErrorBanner error={error} onDismiss={clearError} />

    <div className="mt-4 max-h-80 overflow-y-auto pr-1 -mr-1 space-y-2 wdc-scroll">
      {loading ? (
        <div className="flex items-center justify-center py-12 text-stone-500">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          <span className="text-sm">Loading LGAs…</span>
        </div>
      ) : lgas.length === 0 ? (
        <div className="text-center py-10 text-sm text-stone-500">
          {rawCount === 0 ? 'No LGAs available right now.' : 'No LGAs match your search.'}
        </div>
      ) : (
        lgas.map((lga) => (
          <button
            key={lga.id}
            type="button"
            onClick={() => onPick(lga)}
            className="w-full px-4 py-3 rounded-xl bg-white border border-stone-200 hover:border-emerald-500 hover:bg-emerald-50/50 active:scale-[0.99] transition-all text-left text-stone-900 font-medium text-[15px] shadow-sm"
          >
            {lga.name}
          </button>
        ))
      )}
    </div>
  </div>
);

// ──────────────────────────────────────────────────────────────────────────────
// View: Ward picker
// ──────────────────────────────────────────────────────────────────────────────
const WardView = ({ stepIndex, lga, wards, rawCount, loading, query, onQuery, onPick, onBack, error, clearError }) => (
  <div className="wdc-fade-in">
    <TopBar onBack={onBack} stepIndex={stepIndex} />
    <Brand size="sm" />
    <h2 className="mt-4 text-2xl font-bold text-stone-900 tracking-tight">Select your Ward</h2>
    <p className="text-sm text-stone-500 mt-1">{lga?.name} LGA</p>

    <div className="relative mt-4">
      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
      <input
        type="text"
        value={query}
        onChange={(e) => onQuery(e.target.value)}
        placeholder="Search wards…"
        className="w-full pl-10 pr-3 py-2.5 bg-white/95 border border-stone-200 rounded-xl text-stone-900 placeholder-stone-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/60 focus:border-transparent"
      />
    </div>

    <ErrorBanner error={error} onDismiss={clearError} />

    <div className="mt-4 max-h-80 overflow-y-auto pr-1 -mr-1 space-y-2 wdc-scroll">
      {loading ? (
        <div className="flex items-center justify-center py-12 text-stone-500">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          <span className="text-sm">Loading wards…</span>
        </div>
      ) : wards.length === 0 ? (
        <div className="text-center py-10 text-sm text-stone-500">
          {rawCount === 0 ? 'No wards found for this LGA.' : 'No wards match your search.'}
        </div>
      ) : (
        wards.map((ward) => (
          <button
            key={ward.id}
            type="button"
            onClick={() => onPick(ward)}
            className="w-full px-4 py-3 rounded-xl bg-white border border-stone-200 hover:border-emerald-500 hover:bg-emerald-50/50 active:scale-[0.99] transition-all text-left text-stone-900 font-medium text-[15px] shadow-sm"
          >
            {ward.name}
          </button>
        ))
      )}
    </div>
  </div>
);

// ──────────────────────────────────────────────────────────────────────────────
// View: PIN entry (on-screen numeric keypad)
// ──────────────────────────────────────────────────────────────────────────────
const PinView = ({ stepIndex, lga, ward, pin, loading, onPush, onPop, onBack, error, clearError }) => (
  <div className="wdc-fade-in">
    <TopBar onBack={onBack} stepIndex={stepIndex} />
    <Brand size="sm" />

    <p className="mt-4 text-center text-sm text-stone-500">
      {lga?.name} LGA — {ward?.name} Ward
    </p>
    <h2 className="mt-1 text-center text-2xl font-bold text-stone-900 tracking-tight">
      Enter your 4-digit PIN
    </h2>

    {/* PIN progress dots */}
    <div className="mt-5 flex justify-center gap-4">
      {[0, 1, 2, 3].map((i) => {
        const filled = i < pin.length;
        return (
          <span
            key={i}
            className="w-3.5 h-3.5 rounded-full transition-all border-2"
            style={{
              borderColor: filled ? '#16A34A' : '#D6D3D1',
              background:  filled ? '#16A34A' : 'transparent',
            }}
          />
        );
      })}
    </div>

    <ErrorBanner error={error} onDismiss={clearError} />

    {/* Numeric keypad */}
    <div className="mt-6 grid grid-cols-3 gap-3">
      {['1','2','3','4','5','6','7','8','9'].map((d) => (
        <KeyButton key={d} onClick={() => onPush(d)} disabled={loading}>
          {d}
        </KeyButton>
      ))}
      <span />
      <KeyButton onClick={() => onPush('0')} disabled={loading}>0</KeyButton>
      <KeyButton onClick={onPop} disabled={loading || pin.length === 0} variant="secondary" aria-label="Delete">
        <Delete className="w-6 h-6 mx-auto" />
      </KeyButton>
    </div>

    <div className="mt-5 min-h-[1.5rem] flex items-center justify-center">
      {loading && (
        <div className="inline-flex items-center gap-2 text-sm text-emerald-700">
          <Loader2 className="w-4 h-4 animate-spin" />
          Signing in…
        </div>
      )}
    </div>

    <p className="mt-1 text-center text-xs text-stone-500 leading-relaxed">
      Forgotten your PIN? Contact your LGA coordinator to reset it.
    </p>
  </div>
);

const KeyButton = ({ children, onClick, disabled, variant = 'primary', ...rest }) => {
  const base =
    'flex items-center justify-center h-14 rounded-2xl text-2xl font-semibold transition-all select-none active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed';
  const styles = variant === 'secondary'
    ? 'bg-stone-200 text-stone-700 hover:bg-stone-300 shadow-sm'
    : 'bg-white text-stone-900 hover:bg-emerald-50 hover:border-emerald-300 border border-stone-200 shadow-sm';
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`${base} ${styles}`} {...rest}>
      {children}
    </button>
  );
};

// ──────────────────────────────────────────────────────────────────────────────
// View: Console sign-in (Director / Coordinator)
// ──────────────────────────────────────────────────────────────────────────────
const ConsoleView = ({
  email, password, totp, onEmail, onPassword, onTotp,
  onSubmit, loading, onBack, error, clearError,
}) => (
  <form onSubmit={onSubmit} className="wdc-fade-in">
    <div className="flex items-center justify-between mb-5">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1 text-sm font-medium text-stone-700 hover:text-emerald-700 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>
    </div>

    <Brand size="sm" />
    <h2 className="mt-4 text-2xl font-bold text-stone-900 tracking-tight">Director / Coordinator</h2>
    <p className="text-sm text-stone-500 mt-1">Sign in with your console credentials</p>

    <ErrorBanner error={error} onDismiss={clearError} />

    <div className="mt-4 space-y-4">
      <Field label="Email" icon={Mail}>
        <input
          type="email"
          value={email}
          onChange={(e) => { onEmail(e.target.value); clearError(); }}
          required
          disabled={loading}
          autoComplete="email"
          placeholder="director@kaduna.gov.ng"
          className="w-full pl-10 pr-3 py-2.5 bg-white/95 border border-stone-200 rounded-xl text-stone-900 placeholder-stone-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/60 focus:border-transparent disabled:opacity-60"
        />
      </Field>

      <Field label="Password" icon={Lock}>
        <input
          type="password"
          value={password}
          onChange={(e) => { onPassword(e.target.value); clearError(); }}
          required
          disabled={loading}
          autoComplete="current-password"
          placeholder="••••••••••••"
          className="w-full pl-10 pr-3 py-2.5 bg-white/95 border border-stone-200 rounded-xl text-stone-900 placeholder-stone-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/60 focus:border-transparent disabled:opacity-60"
        />
      </Field>

      <Field label="Authenticator code" icon={KeyRound}>
        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={totp}
          onChange={(e) => { onTotp(e.target.value.replace(/\D/g, '')); clearError(); }}
          required
          disabled={loading}
          autoComplete="one-time-code"
          placeholder="123456"
          className="w-full pl-10 pr-3 py-2.5 bg-white/95 border border-stone-200 rounded-xl text-stone-900 placeholder-stone-400 text-sm tracking-widest focus:outline-none focus:ring-2 focus:ring-emerald-400/60 focus:border-transparent disabled:opacity-60"
        />
      </Field>
    </div>

    <button
      type="submit"
      disabled={loading || !email || !password || totp.length !== 6}
      className="mt-6 w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-semibold transition-all shadow-md shadow-emerald-700/30 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {loading ? 'Signing in…' : 'Sign in'}
    </button>
  </form>
);

const Field = ({ label, icon: Icon, children }) => (
  <div>
    <label className="block text-xs font-semibold text-stone-700 mb-1.5 uppercase tracking-wide">{label}</label>
    <div className="relative">
      <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
      {children}
    </div>
  </div>
);

export default Login;
