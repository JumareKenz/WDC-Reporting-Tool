import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle, AlertTriangle } from 'lucide-react';
import { APP_CONFIG } from '../utils/constants';
import Button from '../components/common/Button';
import Alert from '../components/common/Alert';
import Logo from '../components/common/Logo';
import apiClient from '../api/client';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Invalid reset link. Please request a new password reset.');
    }
  }, [token]);

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

    // Validation
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      await apiClient.post('/auth/reset-password', null, {
        params: {
          token,
          new_password: formData.password
        }
      });
      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      setError(err.message || 'Failed to reset password. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
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
                Password Reset Successful!
              </h1>
            </div>

            <div className="rounded-2xl p-8" style={{ background: 'rgba(255,255,255,0.13)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.18)', boxShadow: '0 8px 32px rgba(0,0,0,0.25)' }}>
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500/20 rounded-full mb-4">
                  <CheckCircle className="w-8 h-8 text-green-400" />
                </div>

                <h2 className="text-xl font-semibold text-white mb-3">
                  All Set!
                </h2>

                <p className="text-emerald-200 mb-6">
                  Your password has been reset successfully. You can now login with your new password.
                </p>

                <p className="text-sm text-emerald-300 mb-6">
                  Redirecting to login page...
                </p>

                <Button
                  onClick={() => navigate('/login')}
                  variant="primary"
                  fullWidth
                >
                  Go to Login
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
      <div className="absolute -top-24 left-1/4 w-96 h-96 bg-emerald-500 rounded-full opacity-20 pointer-events-none" style={{ filter: 'blur(100px)' }} />
      <div className="absolute -bottom-32 -right-16 w-96 h-96 bg-teal-500 rounded-full opacity-15 pointer-events-none" style={{ filter: 'blur(120px)' }} />
      <div className="absolute top-1/2 -left-24 w-72 h-72 bg-green-400 rounded-full opacity-10 pointer-events-none" style={{ filter: 'blur(90px)' }} />

      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-5">
              <Logo size="xl" showText={false} linkTo={null} />
            </div>
            <h1 className="text-3xl font-bold text-white mb-1.5 tracking-tight">
              Reset Your Password
            </h1>
            <p className="text-emerald-300 text-sm">
              Enter your new password below
            </p>
          </div>

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
              {/* New Password Field */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-white mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full px-4 py-3 pl-10.5 pr-10.5 bg-white/80 border border-neutral-200 rounded-xl text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 text-sm disabled:opacity-50"
                    placeholder="Enter new password (min 6 characters)"
                    disabled={loading || !token}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password Field */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-white mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="w-full px-4 py-3 pl-10.5 pr-10.5 bg-white/80 border border-neutral-200 rounded-xl text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 text-sm disabled:opacity-50"
                    placeholder="Confirm new password"
                    disabled={loading || !token}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
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
                disabled={!token}
              >
                Reset Password
              </Button>
            </form>
          </div>

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

export default ResetPassword;
