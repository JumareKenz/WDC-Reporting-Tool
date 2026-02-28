import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ToastProvider } from './hooks/useToast';
import { USER_ROLES } from './utils/constants';
import { useSessionManager } from './hooks/useSessionManager';
import ToastContainer from './components/common/ToastContainer';

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
import StateFormsPage from './pages/StateFormsPage';
import StateSubmissionsPage from './pages/StateSubmissionsPage';
import StateUsersPage from './pages/StateUsersPage';
import ReportDetails from './pages/ReportDetails';

// Components
import Layout from './components/common/Layout';
import LoadingSpinner from './components/common/LoadingSpinner';
import PWAInstallPrompt from './components/common/PWAInstallPrompt';
import OfflineBanner from './components/common/OfflineBanner';
import OfflineStatusBar from './components/common/OfflineStatusBar';

// Create a query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,           // 1 minute
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      refetchInterval: false,
      networkMode: 'offlineFirst',
      placeholderData: (previousData) => previousData, // Keep previous data while fetching
    },
    mutations: {
      networkMode: 'offlineFirst',
      retry: (failureCount, error) => {
        // Retry network errors up to 5 times
        if (error?.isNetworkError && failureCount < 5) {
          return true;
        }
        return false;
      },
    },
  },
});

/**
 * Protected Route Component
 */
const ProtectedRoute = ({ children, allowedRoles = null }) => {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return <LoadingSpinner fullScreen text="Loading..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check role-based access
  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    // Redirect to user's default dashboard
    const defaultRoutes = {
      [USER_ROLES.WDC_SECRETARY]: '/wdc',
      [USER_ROLES.LGA_COORDINATOR]: '/lga',
      [USER_ROLES.STATE_OFFICIAL]: '/state',
    };
    return <Navigate to={defaultRoutes[user.role] || '/login'} replace />;
  }

  return <Layout>{children}</Layout>;
};

/**
 * Public Route Component (redirects if already authenticated)
 */
const PublicRoute = ({ children }) => {
  const { isAuthenticated, getDefaultRoute, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner fullScreen text="Loading..." />;
  }

  if (isAuthenticated) {
    return <Navigate to={getDefaultRoute()} replace />;
  }

  return children;
};

/**
 * App Routes Component
 */
const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        path="/forgot-password"
        element={
          <PublicRoute>
            <ForgotPassword />
          </PublicRoute>
        }
      />
      <Route
        path="/reset-password"
        element={
          <PublicRoute>
            <ResetPassword />
          </PublicRoute>
        }
      />

      {/* ==================== WDC Secretary Routes ==================== */}
      <Route
        path="/wdc"
        element={
          <ProtectedRoute allowedRoles={[USER_ROLES.WDC_SECRETARY]}>
            <WDCDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/wdc/submit"
        element={
          <ProtectedRoute allowedRoles={[USER_ROLES.WDC_SECRETARY]}>
            <SubmitReportPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/wdc/reports"
        element={
          <ProtectedRoute allowedRoles={[USER_ROLES.WDC_SECRETARY]}>
            <MyReportsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/wdc/notifications"
        element={
          <ProtectedRoute allowedRoles={[USER_ROLES.WDC_SECRETARY]}>
            <NotificationsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/wdc/feedback"
        element={
          <ProtectedRoute allowedRoles={[USER_ROLES.WDC_SECRETARY]}>
            <MessagesPage />
          </ProtectedRoute>
        }
      />

      {/* ==================== LGA Coordinator Routes ==================== */}
      <Route
        path="/lga"
        element={
          <ProtectedRoute allowedRoles={[USER_ROLES.LGA_COORDINATOR]}>
            <LGADashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/lga/wards"
        element={
          <ProtectedRoute allowedRoles={[USER_ROLES.LGA_COORDINATOR]}>
            <LGAWardsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/lga/reports"
        element={
          <ProtectedRoute allowedRoles={[USER_ROLES.LGA_COORDINATOR]}>
            <LGAReportsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/lga/notifications"
        element={
          <ProtectedRoute allowedRoles={[USER_ROLES.LGA_COORDINATOR]}>
            <NotificationsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/lga/feedback"
        element={
          <ProtectedRoute allowedRoles={[USER_ROLES.LGA_COORDINATOR]}>
            <MessagesPage />
          </ProtectedRoute>
        }
      />

      {/* ==================== State Official Routes ==================== */}
      <Route
        path="/state"
        element={
          <ProtectedRoute allowedRoles={[USER_ROLES.STATE_OFFICIAL]}>
            <StateDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/state/submissions"
        element={
          <ProtectedRoute allowedRoles={[USER_ROLES.STATE_OFFICIAL]}>
            <StateSubmissionsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/state/forms"
        element={
          <ProtectedRoute allowedRoles={[USER_ROLES.STATE_OFFICIAL]}>
            <StateFormsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/state/users"
        element={
          <ProtectedRoute allowedRoles={[USER_ROLES.STATE_OFFICIAL]}>
            <StateUsersPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/state/notifications"
        element={
          <ProtectedRoute allowedRoles={[USER_ROLES.STATE_OFFICIAL]}>
            <NotificationsPage />
          </ProtectedRoute>
        }
      />

      {/* ==================== Shared Routes ==================== */}
      <Route
        path="/reports/:id"
        element={
          <ProtectedRoute>
            <ReportDetails />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/notifications"
        element={
          <ProtectedRoute>
            <NotificationsPage />
          </ProtectedRoute>
        }
      />

      {/* Root Route - Redirect based on auth */}
      <Route
        path="/"
        element={
          <RootRedirect />
        }
      />

      {/* 404 Route */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

/**
 * Root Redirect Component
 */
const RootRedirect = () => {
  const { isAuthenticated, getDefaultRoute, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner fullScreen text="Loading..." />;
  }

  if (isAuthenticated) {
    return <Navigate to={getDefaultRoute()} replace />;
  }

  return <Navigate to="/login" replace />;
};

/**
 * 404 Not Found Component
 */
const NotFound = () => {
  const { isAuthenticated, getDefaultRoute } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
      <div className="text-center max-w-md">
        <h1 className="text-6xl font-bold text-primary-600 mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-neutral-900 mb-2">
          Page Not Found
        </h2>
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

/**
 * Session guard: only active when user is authenticated.
 * Mounts the idle-timeout warning modal.
 */
const SessionGuard = () => {
  const { isAuthenticated } = useAuth();
  useSessionManager({ enabled: isAuthenticated });
  return null;
};

/**
 * Main App Component
 */
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ToastProvider>
          <AuthProvider>
            <SessionGuard />
            <AppRoutes />
            <ToastContainer />
          </AuthProvider>
        </ToastProvider>
        <PWAInstallPrompt />
        <OfflineBanner />
        <OfflineStatusBar />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
