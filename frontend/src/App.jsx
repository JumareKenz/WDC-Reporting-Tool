import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { USER_ROLES } from './utils/constants';

// Pages
import Login from './pages/Login';
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

// Create a query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
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
        path="/state/analytics"
        element={
          <ProtectedRoute allowedRoles={[USER_ROLES.STATE_OFFICIAL]}>
            <StateAnalyticsPage />
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
        path="/state/lgas"
        element={
          <ProtectedRoute allowedRoles={[USER_ROLES.STATE_OFFICIAL]}>
            <StateLGAsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/state/investigations"
        element={
          <ProtectedRoute allowedRoles={[USER_ROLES.STATE_OFFICIAL]}>
            <StateInvestigationsPage />
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
 * Main App Component
 */
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
        <PWAInstallPrompt />
        <OfflineBanner />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
