/**
 * AuthContext — Global Authentication State
 *
 * Provides persistent authentication state to the entire app.
 * Uses usePersistentAuth hook for token management.
 */

import React, { createContext, useContext, useCallback, useMemo } from 'react';
import { usePersistentAuth } from '../hooks/usePersistentAuth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

// Create context
const AuthContext = createContext(null);

/**
 * AuthProvider - Wraps the app with authentication
 */
export const AuthProvider = ({ children }) => {
  const auth = usePersistentAuth(API_BASE_URL);

  // Computed values
  const isReady = !auth.isLoading;
  const canSubmit = auth.isAuthenticated && (!auth.isOffline || auth.canUseOffline());

  // Get default route based on user role
  const getDefaultRoute = useCallback(() => {
    if (!auth.user) return '/login';
    
    const routes = {
      'WDC_SECRETARY': '/wdc',
      'LGA_COORDINATOR': '/lga',
      'STATE_OFFICIAL': '/state',
    };
    
    return routes[auth.user.role] || '/';
  }, [auth.user]);

  // Check if user has specific role
  const hasRole = useCallback((role) => {
    return auth.user?.role === role;
  }, [auth.user]);

  // Context value
  const value = useMemo(() => ({
    // State
    isAuthenticated: auth.isAuthenticated,
    user: auth.user,
    isLoading: auth.isLoading,
    isOffline: auth.isOffline,
    isReady,
    canSubmit,
    lastError: auth.lastAuthError,
    
    // Actions
    login: auth.login,
    logout: auth.logout,
    getAccessToken: auth.getAccessToken,
    refreshToken: auth.refreshAccessToken,
    
    // Helpers
    getDefaultRoute,
    hasRole,
    canUseOffline: auth.canUseOffline,
  }), [auth, isReady, canSubmit, getDefaultRoute, hasRole]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * useAuth hook - Access authentication context
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

/**
 * withAuth HOC - Protect components that require authentication
 */
export const withAuth = (Component, allowedRoles = null) => {
  return (props) => {
    const { isAuthenticated, isLoading, user, hasRole } = useAuth();

    if (isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
        </div>
      );
    }

    if (!isAuthenticated) {
      window.location.href = '/login';
      return null;
    }

    if (allowedRoles && !allowedRoles.some(role => hasRole(role))) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center max-w-md">
            <h1 className="text-2xl font-bold text-neutral-900 mb-2">Access Denied</h1>
            <p className="text-neutral-600">
              You don't have permission to access this page.
            </p>
          </div>
        </div>
      );
    }

    return <Component {...props} />;
  };
};

export default AuthContext;
