import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { APP_CONFIG } from '../utils/constants';
import Button from '../components/common/Button';
import Alert from '../components/common/Alert';
import Logo from '../components/common/Logo';
import apiClient from '../api/client';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await apiClient.post('/auth/forgot-password', null, {
        params: { email }
      });
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Failed to send reset link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900">
        {/* Ambient glow blobs */}
        <div className="absolute -top-24 left-1/4 w-96 h-96 bg-emerald-500 rounded-full opacity-20 pointer-events-none" style={{ filter: 'blur(100px)' }} />
        <div className="absolute -bottom-32 -right-16 w-96 h-96 bg-teal-500 rounded-full opacity-15 pointer-events-none" style={{ filter: 'blur(120px)' }} />

        <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <div className="flex justify-center mb-5">
                <Logo size="xl" showText={false} linkTo={null} />
              </div>
              <h1 className="text-3xl font-bold text-white mb-1.5 tracking-tight">
                Check Your Email
              </h1>
            </div>

            <div className="rounded-2xl p-8" style={{ background: 'rgba(255,255,255,0.13)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.18)', boxShadow: '0 8px 32px rgba(0,0,0,0.25)' }}>
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500/20 rounded-full mb-4">
                  <CheckCircle className="w-8 h-8 text-green-400" />
                </div>

                <h2 className="text-xl font-semibold text-white mb-3">
                  Reset Link Sent
                </h2>

                <p className="text-emerald-200 mb-6">
                  If an account exists with <strong>{email}</strong>, you will receive a password reset link shortly.
                </p>

                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mb-6">
                  <p className="text-sm text-amber-200">
                    <strong>⏰ Link expires in 1 hour</strong>
                  </p>
                  <p className="text-xs text-amber-300 mt-1">
                    Check your spam folder if you don't see it
                  </p>
                </div>

                <Button
                  onClick={() => navigate('/login')}
                  variant="primary"
                  fullWidth
                  icon={ArrowLeft}
                >
                  Back to Login
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900">
      {/* Ambient glow blobs */}
      <div className="absolute -top-24 left-1/4 w-96 h-96 bg-emerald-500 rounded-full opacity-20 pointer-events-none" style={{ filter: 'blur(100px)' }} />
      <div className="absolute -bottom-32 -right-16 w-96 h-96 bg-teal-500 rounded-full opacity-15 pointer-events-none" style={{ filter: 'blur(120px)' }} />
      <div className="absolute top-1/2 -left-24 w-72 h-72 bg-green-400 rounded-full opacity-10 pointer-events-none" style={{ filter: 'blur(90px)' }} />

      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-md">
          {/* Logo & Title */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-5">
              <Logo size="xl" showText={false} linkTo={null} />
            </div>
            <h1 className="text-3xl font-bold text-white mb-1.5 tracking-tight">
              Forgot Password?
            </h1>
            <p className="text-emerald-300 text-sm">
              Enter your email to receive a reset link
            </p>
          </div>

          {/* Glass Card */}
          <div className="rounded-2xl p-8" style={{ background: 'rgba(255,255,255,0.13)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.18)', boxShadow: '0 8px 32px rgba(0,0,0,0.25)' }}>
            {error && (
              <Alert
                type="error"
                message={error}
                onClose={() => setError(null)}
                className="mb-5"
              />
            )}

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
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 pl-10.5 bg-white/80 border border-neutral-200 rounded-xl text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 text-sm disabled:opacity-50"
                    placeholder="your.email@kaduna.gov.ng"
                    disabled={loading}
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                loading={loading}
                icon={Mail}
              >
                Send Reset Link
              </Button>

              {/* Back to Login */}
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="w-full text-center text-sm text-emerald-300 hover:text-emerald-200 transition-colors flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Login
              </button>
            </form>
          </div>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-sm text-emerald-300">
              {APP_CONFIG.STATE_NAME}, {APP_CONFIG.COUNTRY}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
