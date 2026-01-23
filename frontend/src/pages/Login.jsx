import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, Mail, Lock, AlertCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { APP_CONFIG, DEMO_CREDENTIALS } from '../utils/constants';
import Button from '../components/common/Button';
import Alert from '../components/common/Alert';

/**
 * Login Page Component
 */
const Login = () => {
  const navigate = useNavigate();
  const { login, getDefaultRoute } = useAuth();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Handle input change
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    // Clear error when user starts typing
    if (error) setError(null);
  };

  // Handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await login(formData.email, formData.password);

      if (result.success) {
        // Get the default route for the user's role
        const defaultRoute = getDefaultRoute();
        navigate(defaultRoute, { replace: true });
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
      setLoading(false);
    }
  };

  // Quick demo login
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
        const defaultRoute = getDefaultRoute();
        navigate(defaultRoute, { replace: true });
      }
    } catch (err) {
      setError(err.message || 'Demo login failed.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          {/* Logo */}
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-full mb-4 shadow-lg">
            <span className="text-white font-bold text-2xl">K</span>
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-neutral-900 mb-2">
            {APP_CONFIG.APP_NAME}
          </h1>
          <p className="text-neutral-600">{APP_CONFIG.APP_SUBTITLE}</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-neutral-200 p-8">
          {/* Error Alert */}
          {error && (
            <Alert
              type="error"
              message={error}
              onClose={() => setError(null)}
              className="mb-6"
            />
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="label-base">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="input-base pl-10"
                  placeholder="your.email@kaduna.gov.ng"
                  disabled={loading}
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="label-base">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="input-base pl-10"
                  placeholder="Enter your password"
                  disabled={loading}
                  autoComplete="current-password"
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
              icon={LogIn}
            >
              Sign In
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-3 bg-white text-neutral-600">
                Demo Access
              </span>
            </div>
          </div>

          {/* Demo Credentials */}
          <div className="space-y-2">
            <p className="text-xs text-neutral-600 mb-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>
                Use these demo accounts to explore the system as different user
                types
              </span>
            </p>

            {DEMO_CREDENTIALS.map((cred, index) => (
              <button
                key={index}
                onClick={() => handleDemoLogin(cred)}
                disabled={loading}
                className="w-full text-left px-4 py-3 rounded-lg border border-neutral-200 hover:border-primary-300 hover:bg-primary-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <p className="text-sm font-medium text-neutral-900">
                  {cred.name}
                </p>
                <p className="text-xs text-neutral-600 mt-0.5">{cred.email}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-sm text-neutral-600">
            {APP_CONFIG.STATE_NAME}, {APP_CONFIG.COUNTRY}
          </p>
          <p className="text-xs text-neutral-500 mt-1">
            For support: {APP_CONFIG.SUPPORT_EMAIL}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
