/**
 * App.jsx — Root Application Component
 *
 * Features:
 * - Persistent authentication (no automatic logout)
 * - Offline-first data fetching
 * - PWA installability support
 * - Global error handling
 * - Toast notifications
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './hooks/useToast';
import { ErrorProvider } from './components/common/ErrorSystem';
import { USER_ROLES } from './utils/constants';
import { isNative } from './plugins/capacitor';

// Pages
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import WDCDashboard from './pages/WDCDashboard';
import LGADashboard from './pages/LGADashboard';
import StateDashboard from './pages/StateDashboard';
import NotificationsPage from './pages/NotificationsPage';
import MessagesPage from './pages/MessagesPage';
import SettingsPage from './pages/SettingsPage';
import MyReportsPage from './pages/MyReportsPage';
import SubmitReportPage from './pages/SubmitReportPage';
import LGAWardsPage from './pages/LGAWardsPage';
import LGAReportsPage from './pages/LGAReportsPage';
import StateAnalyticsPage from './pages/StateAnalyticsPage';
import StateLGAsPage from './pages/StateLGAsPage';
import StateInvestigationsPage from './pages/StateInvestigationsPage';
import StateFormsPage from './pages/StateFormsPage';
import StateSubmissionsPage from './pages/StateSubmissionsPage';
import StateUsersPage from './pages/StateUsersPage';

// Components
import Layout from './components/common/Layout';
import LoadingSpinner from './components/common/LoadingSpinner';
import PWAInstallPrompt from './components/common/PWAInstallPrompt';
import OfflineBanner from './components/common/OfflineBanner';
import ToastContainer from './components/common/ToastContainer';
import RefreshIndicator from './components/common/RefreshIndicator';
import { useAppVersion } from './hooks/useAppVersion';
import { ensureOfflineSpeechModel } from './services/speechService';
import { loadActiveFieldConfig } from './services/formConfigService';

// ── QueryClient (optimised for mobile / poor-network conditions) ─────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      staleTime: 10 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      networkMode: 'offlineFirst',
    },
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Protected Route — Requires Authentication
// ─────────────────────────────────────────────────────────────────────────────
const ProtectedRoute = ({ children, allowedRoles = null }) => {
  const { user, isLoading, isAuthenticated, isReady } = useAuth();

  // Show loading while auth state initializes
  if (isLoading || !isReady) {
    return <LoadingSpinner fullScreen text="Loading..." />;
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check role permissions
  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    const defaultRoutes = {
      [USER_ROLES.WDC_SECRETARY]: '/wdc',
      [USER_ROLES.LGA_COORDINATOR]: '/lga',
      [USER_ROLES.STATE_OFFICIAL]: '/state',
    };
    return <Navigate to={defaultRoutes[user.role] || '/'} replace />;
  }

  return <Layout>{children}</Layout>;
};

// ─────────────────────────────────────────────────────────────────────────────
// Public Route — Redirects if already authenticated
// ─────────────────────────────────────────────────────────────────────────────
const PublicRoute = ({ children }) => {
  const { isAuthenticated, getDefaultRoute, isLoading, isReady } = useAuth();

  if (isLoading || !isReady) {
    return <LoadingSpinner fullScreen text="Loading..." />;
  }

  if (isAuthenticated) {
    return <Navigate to={getDefaultRoute()} replace />;
  }

  return children;
};

// ─────────────────────────────────────────────────────────────────────────────
// App Routes
// ─────────────────────────────────────────────────────────────────────────────
const AppRoutes = () => (
  <Routes>
    {/* Public Routes */}
    <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
    <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
    <Route path="/reset-password" element={<PublicRoute><ResetPassword /></PublicRoute>} />

    {/* WDC Secretary Routes */}
    <Route path="/wdc" element={<ProtectedRoute allowedRoles={[USER_ROLES.WDC_SECRETARY]}><WDCDashboard /></ProtectedRoute>} />
    <Route path="/wdc/submit" element={<ProtectedRoute allowedRoles={[USER_ROLES.WDC_SECRETARY]}><SubmitReportPage /></ProtectedRoute>} />
    <Route path="/wdc/reports" element={<ProtectedRoute allowedRoles={[USER_ROLES.WDC_SECRETARY]}><MyReportsPage /></ProtectedRoute>} />
    <Route path="/wdc/notifications" element={<ProtectedRoute allowedRoles={[USER_ROLES.WDC_SECRETARY]}><NotificationsPage /></ProtectedRoute>} />
    <Route path="/wdc/feedback" element={<ProtectedRoute allowedRoles={[USER_ROLES.WDC_SECRETARY]}><MessagesPage /></ProtectedRoute>} />

    {/* LGA Coordinator Routes */}
    <Route path="/lga" element={<ProtectedRoute allowedRoles={[USER_ROLES.LGA_COORDINATOR]}><LGADashboard /></ProtectedRoute>} />
    <Route path="/lga/wards" element={<ProtectedRoute allowedRoles={[USER_ROLES.LGA_COORDINATOR]}><LGAWardsPage /></ProtectedRoute>} />
    <Route path="/lga/reports" element={<ProtectedRoute allowedRoles={[USER_ROLES.LGA_COORDINATOR]}><LGAReportsPage /></ProtectedRoute>} />
    <Route path="/lga/notifications" element={<ProtectedRoute allowedRoles={[USER_ROLES.LGA_COORDINATOR]}><NotificationsPage /></ProtectedRoute>} />
    <Route path="/lga/feedback" element={<ProtectedRoute allowedRoles={[USER_ROLES.LGA_COORDINATOR]}><MessagesPage /></ProtectedRoute>} />

    {/* State Official Routes */}
    <Route path="/state" element={<ProtectedRoute allowedRoles={[USER_ROLES.STATE_OFFICIAL]}><StateDashboard /></ProtectedRoute>} />
    <Route path="/state/analytics" element={<ProtectedRoute allowedRoles={[USER_ROLES.STATE_OFFICIAL]}><StateAnalyticsPage /></ProtectedRoute>} />
    <Route path="/state/submissions" element={<ProtectedRoute allowedRoles={[USER_ROLES.STATE_OFFICIAL]}><StateSubmissionsPage /></ProtectedRoute>} />
    <Route path="/state/lgas" element={<ProtectedRoute allowedRoles={[USER_ROLES.STATE_OFFICIAL]}><StateLGAsPage /></ProtectedRoute>} />
    <Route path="/state/investigations" element={<ProtectedRoute allowedRoles={[USER_ROLES.STATE_OFFICIAL]}><StateInvestigationsPage /></ProtectedRoute>} />
    <Route path="/state/forms" element={<ProtectedRoute allowedRoles={[USER_ROLES.STATE_OFFICIAL]}><StateFormsPage /></ProtectedRoute>} />
    <Route path="/state/users" element={<ProtectedRoute allowedRoles={[USER_ROLES.STATE_OFFICIAL]}><StateUsersPage /></ProtectedRoute>} />
    <Route path="/state/notifications" element={<ProtectedRoute allowedRoles={[USER_ROLES.STATE_OFFICIAL]}><NotificationsPage /></ProtectedRoute>} />

    {/* Shared Routes */}
    <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
    <Route path="/profile" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
    <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />

    {/* Root + 404 */}
    <Route path="/" element={<RootRedirect />} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

// ─────────────────────────────────────────────────────────────────────────────
// Root Redirect
// ─────────────────────────────────────────────────────────────────────────────
const RootRedirect = () => {
  const { isAuthenticated, getDefaultRoute, isLoading, isReady } = useAuth();
  
  if (isLoading || !isReady) {
    return <LoadingSpinner fullScreen text="Loading..." />;
  }
  
  return isAuthenticated
    ? <Navigate to={getDefaultRoute()} replace />
    : <Navigate to="/login" replace />;
};

// ─────────────────────────────────────────────────────────────────────────────
// 404 Not Found
// ─────────────────────────────────────────────────────────────────────────────
const NotFound = () => {
  const { isAuthenticated, getDefaultRoute } = useAuth();
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
      <div className="text-center max-w-md">
        <h1 className="text-6xl font-bold text-primary-600 mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-neutral-900 mb-2">Page Not Found</h2>
        <p className="text-neutral-600 mb-6">
          The page you are looking for does not exist or has been moved.
        </p>
        <a
          href={isAuthenticated ? getDefaultRoute() : '/login'}
          className="inline-block px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          Go to {isAuthenticated ? 'Dashboard' : 'Login'}
        </a>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Version Guard
// ─────────────────────────────────────────────────────────────────────────────
const VersionGuard = () => {
  useAppVersion();
  return null;
};

// ─────────────────────────────────────────────────────────────────────────────
// Offline Speech Model Initializer
// Silently ensures the English speech model is available on-device (Android).
// ─────────────────────────────────────────────────────────────────────────────
if (isNative) {
  ensureOfflineSpeechModel('en-US');
}

// Preload the active form config so OCR + Voice can use admin-edited
// voice questions and OCR patterns. Falls back to bundled defaults on failure.
loadActiveFieldConfig().catch(() => { /* defaults will be used */ });

// ─────────────────────────────────────────────────────────────────────────────
// Auth Status Indicator — Shows offline/persistent auth status
// ─────────────────────────────────────────────────────────────────────────────
const AuthStatusIndicator = () => {
  const { isOffline, isAuthenticated, canUseOffline } = useAuth();
  
  if (!isAuthenticated) return null;
  
  if (isOffline) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-white px-4 py-1 text-center text-sm">
        <span className="font-medium">Offline Mode</span> — 
        {canUseOffline() 
          ? ' Using cached session. Changes will sync when you reconnect.'
          : ' Session expired. Please connect to internet to continue.'
        }
      </div>
    );
  }
  
  return null;
};

// ─────────────────────────────────────────────────────────────────────────────
// Root App Component
// ─────────────────────────────────────────────────────────────────────────────
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ErrorProvider>
          <ToastProvider>
            <AuthProvider>
              <VersionGuard />
              <AuthStatusIndicator />
              <AppRoutes />
              <ToastContainer />
              <OfflineBanner />
              <RefreshIndicator />
            </AuthProvider>
          </ToastProvider>
          {!isNative && <PWAInstallPrompt />}
        </ErrorProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
