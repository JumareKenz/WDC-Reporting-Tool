import { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '../api/client';
import { secretaryLogin, fetchLgas, fetchWards } from '../api/auth';
import { API_ENDPOINTS, STORAGE_KEYS, USER_ROLES } from '../utils/constants';

// Map backend role strings (any casing/spelling) to canonical USER_ROLES values
const ROLE_ALIASES = {
  secretary: USER_ROLES.WDC_SECRETARY,
  wdc_secretary: USER_ROLES.WDC_SECRETARY,
  wdcsecretary: USER_ROLES.WDC_SECRETARY,
  coordinator: USER_ROLES.LGA_COORDINATOR,
  lga_coordinator: USER_ROLES.LGA_COORDINATOR,
  lgacoordinator: USER_ROLES.LGA_COORDINATOR,
  official: USER_ROLES.STATE_OFFICIAL,
  state_official: USER_ROLES.STATE_OFFICIAL,
  stateofficial: USER_ROLES.STATE_OFFICIAL,
};

const normalizeRole = (role) => {
  if (!role) return role;
  const key = String(role).toLowerCase().replace(/[-\s]/g, '_');
  return ROLE_ALIASES[key] || ROLE_ALIASES[key.replace(/_/g, '')] || role;
};

// Create Auth Context
const AuthContext = createContext(null);

/**
 * Auth Provider Component
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if user is authenticated on mount
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      const userData = localStorage.getItem(STORAGE_KEYS.USER_DATA);

      if (token && userData) {
        try {
          // Parse stored user data
          const parsedUser = JSON.parse(userData);
          if (parsedUser?.role) {
            parsedUser.role = normalizeRole(parsedUser.role);
          }
          setUser(parsedUser);
        } catch (err) {
          console.error('Failed to parse user data:', err);
          logout();
        }
      }

      setLoading(false);
    };

    initAuth();
  }, []);

  // Backfill LGA/ward names when the user object only has IDs (e.g. an
  // existing session from before names were captured at login, or a JWT
  // re-hydration). Runs once after auth resolves and rewrites the cached
  // user object so subsequent reloads start with names already populated.
  useEffect(() => {
    if (!user?.id) return;
    const lgaId = user?.lga?.id || user?.ward?.lga_id;
    const wardId = user?.ward?.id;
    const hasLgaName = !!user?.lga?.name;
    const hasWardName = !!user?.ward?.name;
    if (!lgaId || (hasLgaName && hasWardName)) return;

    let cancelled = false;
    (async () => {
      try {
        const updates = {};
        if (!hasLgaName) {
          const lgas = await fetchLgas();
          const lga = (Array.isArray(lgas) ? lgas : []).find((l) => String(l.id) === String(lgaId));
          if (lga?.name) updates.lgaName = lga.name;
        }
        if (!hasWardName && wardId) {
          const wards = await fetchWards(lgaId);
          const ward = (Array.isArray(wards) ? wards : []).find((w) => String(w.id) === String(wardId));
          if (ward?.name) updates.wardName = ward.name;
        }
        if (cancelled || (!updates.lgaName && !updates.wardName)) return;
        const next = {
          ...user,
          lga: { ...(user.lga || {}), id: lgaId, name: updates.lgaName || user?.lga?.name },
          ward: {
            ...(user.ward || {}),
            id: wardId,
            name: updates.wardName || user?.ward?.name,
            lga_id: lgaId,
            lga_name: updates.lgaName || user?.ward?.lga_name,
          },
        };
        localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(next));
        setUser(next);
      } catch (err) {
        console.warn('Failed to hydrate LGA/ward names:', err?.message || err);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.lga?.id, user?.ward?.id]);

  /**
   * Login function
   */
  const login = async (credentials) => {
    setError(null);
    setLoading(true);

    try {
      const response = await apiClient.post(API_ENDPOINTS.SIGN_IN_CONSOLE, {
        email: credentials.email,
        password: credentials.password,
        totp: credentials.totp,
        deviceId: credentials.deviceId,
      });

      const data = response.data || response;
      const accessToken = data.accessToken || data.access_token;
      const refreshToken = data.refreshToken || data.refresh_token;

      if (accessToken) {
        localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, accessToken);
        if (refreshToken) {
          localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
        }

        // Decode JWT payload (no /auth/me endpoint exists)
        const payload = JSON.parse(atob(accessToken.split('.')[1]));
        const userData = {
          id: payload.sub,
          role: normalizeRole(payload.role),
          ward: { id: payload.wardId, lga_id: payload.lgaId },
          lga: { id: payload.lgaId },
          mustChangePin: payload.mustChangePin,
        };
        localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));

        setUser(userData);
        setLoading(false);

        return {
          success: true,
          user: userData,
        };
      }

      // If response format is unexpected, treat as failure
      setLoading(false);
      throw new Error('Invalid login response');
    } catch (err) {
      setLoading(false);
      setError(err.message || 'Login failed');
      throw err;
    }
  };

  /**
   * Logout function
   */
  const logout = () => {
    // Clear local storage — both access and refresh tokens
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER_DATA);

    // Clear user state
    setUser(null);
    setError(null);

    // Redirect to login
    window.location.href = '/login';
  };

  /**
   * Re-verify the JWT locally (no /auth/me endpoint on backend).
   * Decodes the stored access token and rebuilds the user object.
   */
  const verifyToken = async () => {
    try {
      const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      if (!token) throw new Error('No access token');

      const payload = JSON.parse(atob(token.split('.')[1]));
      const userData = {
        id: payload.sub,
        role: normalizeRole(payload.role),
        ward: { id: payload.wardId, lga_id: payload.lgaId },
        lga: { id: payload.lgaId },
        mustChangePin: payload.mustChangePin,
      };

      localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
      setUser(userData);
      return userData;
    } catch (err) {
      console.error('Token verification failed:', err);
      logout();
      throw err;
    }
  };

  /**
   * Update user data in state and storage
   */
  const updateUser = (userData) => {
    localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
    setUser(userData);
  };

  /**
   * Check if user has specific role
   */
  const hasRole = (role) => {
    return user?.role === role;
  };

  /**
   * Get redirect path based on user role
   */
  const getDefaultRoute = () => {
    if (!user) return '/login';

    switch (user.role) {
      case USER_ROLES.WDC_SECRETARY:
        return '/wdc';
      case USER_ROLES.LGA_COORDINATOR:
        return '/lga';
      case USER_ROLES.STATE_OFFICIAL:
        return '/state';
      default:
        return '/';
    }
  };

  // Accepts either bare IDs or `{ id, name }` objects. When objects are passed
  // (the secretary picked them from the LGA/ward lists on Login), we stash the
  // names into the user object so the wizard/dashboard can display them
  // instead of "Not assigned".
  const loginWithPin = async (lgaArg, wardArg, pin) => {
    setError(null);
    setLoading(true);

    const lgaId = lgaArg?.id ?? lgaArg;
    const wardId = wardArg?.id ?? wardArg;
    const lgaName = typeof lgaArg === 'object' ? lgaArg?.name : undefined;
    const wardName = typeof wardArg === 'object' ? wardArg?.name : undefined;

    try {
      const data = await secretaryLogin(lgaId, wardId, pin);
      const accessToken = data.accessToken || data.access_token;
      const refreshToken = data.refreshToken || data.refresh_token;

      if (accessToken) {
        localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, accessToken);
        if (refreshToken) {
          localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
        }

        // Decode JWT payload to get user info
        const payload = JSON.parse(atob(accessToken.split('.')[1]));
        const userData = {
          id: payload.sub,
          role: normalizeRole(payload.role),
          ward: { id: payload.wardId, name: wardName, lga_id: payload.lgaId, lga_name: lgaName },
          lga: { id: payload.lgaId, name: lgaName },
          mustChangePin: payload.mustChangePin,
        };

        localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
        setUser(userData);
        setLoading(false);

        return { success: true, user: userData };
      }

      setLoading(false);
      throw new Error('Invalid login response');
    } catch (err) {
      setLoading(false);
      const message =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        err.message ||
        'Login failed';
      const enhanced = new Error(message);
      enhanced.status = err.response?.status;
      enhanced.isNetworkError = !err.response && !err.status;
      setError(message);
      throw enhanced;
    }
  };

  const value = {
    user,
    loading,
    error,
    login,
    loginWithPin,
    logout,
    verifyToken,
    updateUser,
    hasRole,
    isAuthenticated: !!user,
    getDefaultRoute,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * Custom hook to use auth context
 */
export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};

/**
 * Higher-order component to protect routes
 */
export const withAuth = (Component, allowedRoles = null) => {
  return (props) => {
    const { user, loading, isAuthenticated } = useAuth();

    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-neutral-600">Loading...</p>
          </div>
        </div>
      );
    }

    if (!isAuthenticated) {
      window.location.href = '/login';
      return null;
    }

    // Check role-based access
    if (allowedRoles && !allowedRoles.includes(user?.role)) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-neutral-900 mb-2">
              Access Denied
            </h1>
            <p className="text-neutral-600">
              You do not have permission to access this page.
            </p>
          </div>
        </div>
      );
    }

    return <Component {...props} />;
  };
};

export default useAuth;
