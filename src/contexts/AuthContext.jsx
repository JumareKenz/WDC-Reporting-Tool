import React, { createContext, useContext, useCallback, useMemo } from 'react';
import { usePersistentAuth } from '../hooks/usePersistentAuth';
import { USER_ROLES } from '../utils/constants';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const auth = usePersistentAuth();

  const isReady  = !auth.isLoading;
  const canSubmit = auth.isAuthenticated && (!auth.isOffline || auth.canUseOffline());

  const hasRole = useCallback((role) => auth.user?.role === role, [auth.user]);

  const value = useMemo(() => ({
    isAuthenticated: auth.isAuthenticated,
    user:            auth.user,
    isLoading:       auth.isLoading,
    isOffline:       auth.isOffline,
    isReady,
    canSubmit,
    lastError:       auth.lastAuthError,

    login:           auth.login,
    logout:          auth.logout,
    getAccessToken:  auth.getAccessToken,
    refreshToken:    auth.refreshAccessToken,

    getDefaultRoute: auth.getDefaultRoute,
    hasRole,
    canUseOffline:   auth.canUseOffline,
  }), [auth, isReady, canSubmit, hasRole]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

/**
 * HOC that guards a component to authenticated users with an optional role list.
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

    if (allowedRoles && !allowedRoles.some((r) => hasRole(r))) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center max-w-md">
            <h1 className="text-2xl font-bold text-neutral-900 mb-2">Access Denied</h1>
            <p className="text-neutral-600">You don't have permission to access this page.</p>
          </div>
        </div>
      );
    }

    return <Component {...props} />;
  };
};

export default AuthContext;
