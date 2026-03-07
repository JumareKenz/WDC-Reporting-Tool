import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LogIn, Mail, Lock, AlertCircle, ArrowLeft } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { APP_CONFIG, DEMO_CREDENTIALS } from '../utils/constants';
import Button from '../components/common/Button';
import Alert from '../components/common/Alert';
import Logo from '../components/common/Logo';

const Login = () => {
  const navigate = useNavigate();
  const { login, getDefaultRoute } = useAuth();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    if (error) setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await login(formData.email, formData.password);
      if (result.success) {
        navigate(getDefaultRoute(), { replace: true });
      }
    } catch (err) {
      // ALWAYS ensure we show an error and stop loading
      try {
        let msg;
        
        // Try to get status from various possible locations
        const status = err?.status || err?.response?.status || err?.code;
        const message = err?.message || err?.response?.data?.detail || err?.response?.data?.message || String(err);
        
        // Debug logging - remove in production
        console.log('Login error caught:', { status, message, fullError: err });
        
        if (err?.isNetworkError) {
          msg = 'Cannot reach the server. Make sure the backend is running on port 8000, then try again.';
        } else if (status === 401 || status === 403) {
          // 401 = wrong credentials, 403 = inactive account
          // Check the error message from backend
          if (message?.toLowerCase()?.includes('inactive') || message?.toLowerCase()?.includes('disabled')) {
            msg = 'Your account is inactive. Please contact your administrator.';
          } else {
            msg = 'Incorrect email or password. Please check your credentials and try again.';
          }
        } else {
          msg = message || 'Login failed. Please try again.';
        }
        
        setError(msg);
        toast('error', msg, { title: 'Login Failed', duration: 5000 });
      } catch (handlerError) {
        // Absolute fallback - should never happen
        console.error('Error in error handler:', handlerError);
        setError('An unexpected error occurred. Please try again.');
        toast('error', 'An unexpected error occurred. Please try again.', { title: 'Login Failed' });
      }
      setLoading(false);
    }
  };

  const handleDemoLogin = async (credentials) => {
    setFormData({
      email: credentials.email,
      password: credentials.password,
    });
    setError(null);
    setLoading(true);

    try {
      const result = await login(credentials.email, credentials.password);
      if (result.success) {
        navigate(getDefaultRoute(), { replace: true });
      }
    } catch (err) {
      try {
        let msg;
        const status = err?.status || err?.response?.status;
        
        if (err?.isNetworkError) {
          msg = 'Cannot reach the server. Make sure the backend is running on port 8000, then try again.';
        } else if (status === 401 || status === 403) {
          msg = 'Demo account credentials are incorrect or inactive. Please contact support.';
        } else {
          msg = err?.message || 'Demo login failed. Please try again.';
        }
        
        setError(msg);
        toast('error', msg, { title: 'Login Failed', duration: 5000 });
      } catch (handlerError) {
        setError('An unexpected error occurred. Please try again.');
        toast('error', 'An unexpected error occurred. Please try again.', { title: 'Login Failed' });
      }
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900">
      {/* Ambient glow blobs */}
      <div
        className="absolute -top-24 left-1/4 w-96 h-96 bg-emerald-500 rounded-full opacity-20 pointer-events-none"
        style={{ filter: 'blur(100px)' }}
      />
      <div
        className="absolute -bottom-32 -right-16 w-96 h-96 bg-teal-500 rounded-full opacity-15 pointer-events-none"
        style={{ filter: 'blur(120px)' }}
      />
      <div
        className="absolute top-1/2 -left-24 w-72 h-72 bg-green-400 rounded-full opacity-10 pointer-events-none"
        style={{ filter: 'blur(90px)' }}
      />
      <div
        className="absolute -top-12 -right-24 w-64 h-64 bg-emerald-400 rounded-full opacity-10 pointer-events-none"
        style={{ filter: 'blur(80px)' }}
      />

      {/* Back link */}
      <div className="relative z-10 pt-4 pl-4">
        <Link
          to="/login"
          className="inline-flex items-center gap-1 text-emerald-300 hover:text-white text-sm transition-colors py-2 pr-3"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>
      </div>

      {/* Content */}
      <div className="relative z-10 flex items-center justify-center min-h-screen p-4" style={{ marginTop: -40 }}>
        <div className="w-full max-w-md">
          {/* Logo & Title */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-5">
              <Logo size="xl" showText={false} linkTo={null} />
            </div>
            <h1 className="text-3xl font-bold text-white mb-1.5 tracking-tight">
              {APP_CONFIG.APP_NAME}
            </h1>
            <p className="text-emerald-300 text-sm">{APP_CONFIG.APP_SUBTITLE}</p>
          </div>

          {/* Glass Login Card */}
          <div className="rounded-2xl p-8" style={{ background: 'rgba(255,255,255,0.13)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.18)', boxShadow: '0 8px 32px rgba(0,0,0,0.25)' }}>
            {/* Error Alert */}
            {error && (
              <div
                role="alert"
                className="mb-5 rounded-xl bg-red-500 border border-red-400 shadow-lg shadow-red-500/20 overflow-hidden"
              >
                {/* Error Header */}
                <div className="flex items-center gap-2 px-4 py-2 bg-red-600">
                  <AlertCircle className="w-5 h-5 text-white" />
                  <span className="font-semibold text-white text-sm">Login Failed</span>
                </div>
                
                {/* Error Message */}
                <div className="px-4 py-3">
                  <p className="text-white text-sm leading-relaxed">{error}</p>
                </div>
                
                {/* Dismiss Button */}
                <div className="px-4 pb-3 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setError(null)}
                    className="text-xs text-red-200 hover:text-white underline transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-white mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-4 py-3 pl-10.5 bg-white/80 border border-neutral-200 rounded-xl text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 text-sm disabled:opacity-50"
                    placeholder="your.email@kaduna.gov.ng"
                    disabled={loading}
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-white mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full px-4 py-3 pl-10.5 bg-white/80 border border-neutral-200 rounded-xl text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 text-sm disabled:opacity-50"
                    placeholder="Enter your password"
                    disabled={loading}
                    autoComplete="current-password"
                  />
                </div>
                <div className="flex justify-end mt-1.5">
                  <button
                    type="button"
                    onClick={() => navigate('/forgot-password')}
                    className="text-sm text-emerald-300 hover:text-emerald-200 transition-colors"
                  >
                    Forgot Password?
                  </button>
                </div>
              </div>

              {/* Submit Button */}
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

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/20"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="px-4 bg-black/30 text-sm text-emerald-200 rounded-full">
                  Quick Demo Access
                </span>
              </div>
            </div>

            {/* Demo Credentials */}
            <div className="space-y-2">
              <p className="text-xs text-emerald-300 flex items-start gap-2 mb-3">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-400" />
                <span>
                  Select a demo account to explore the system
                </span>
              </p>

              {DEMO_CREDENTIALS.map((cred, index) => (
                <button
                  key={index}
                  onClick={() => handleDemoLogin(cred)}
                  disabled={loading}
                  className="w-full text-left px-4 py-3 rounded-xl bg-white/10 border border-white/20 hover:bg-white/20 hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group relative overflow-hidden"
                  aria-label={`Sign in as ${cred.name}`}
                >
                  {/* Loading shimmer when this demo is being used */}
                  {loading && (
                    <span className="absolute inset-0 bg-white/5 animate-pulse" aria-hidden="true" />
                  )}
                  <p className="text-sm font-semibold text-white group-hover:text-emerald-200 transition-colors">
                    {cred.name}
                  </p>
                  <p className="text-xs text-emerald-300 mt-0.5">{cred.email}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-sm text-emerald-300">
              {APP_CONFIG.STATE_NAME}, {APP_CONFIG.COUNTRY}
            </p>
            <p className="text-xs text-emerald-400/60 mt-1">
              Support: {APP_CONFIG.SUPPORT_EMAIL}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
