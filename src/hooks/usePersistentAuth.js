/**
 * usePersistentAuth — Indefinite/Persistent Authentication
 *
 * Architecture: Option A (Short-lived access token + Long-lived refresh token)
 *
 * Features:
 * - Persistent login across browser/PWA close, device reboot, offline periods
 * - Access token stored in memory (security), refresh token in IndexedDB
 * - Silent auto-refresh on app load and before API calls
 * - Refresh token rotation for security
 * - Server-side revocation support on logout
 * - Offline mode using cached access token with UI indicator
 *
 * Security Considerations:
 * - HTTPS only
 * - XSS protection via memory-only access token
 * - Refresh token rotation prevents replay attacks
 * - Server-side revocation list for logout
 * - User warning for shared device risks
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { openDB } from 'idb';
import { setAuthToken, clearAuthToken, setRefreshFunction } from '../api/client';

// IndexedDB configuration
const AUTH_DB_NAME = 'wdc-auth-db';
const AUTH_STORE_NAME = 'tokens';
const DB_VERSION = 1;

// Token configuration
const TOKEN_CONFIG = {
  accessTokenExpiry: 15 * 60 * 1000, // 15 minutes (client-side buffer)
  refreshTokenExpiry: 365 * 24 * 60 * 60 * 1000, // 1 year (or server-controlled)
  refreshBuffer: 60 * 1000, // Refresh 1 minute before expiry
};

// In-memory access token (never persisted)
let memoryAccessToken = null;
let memoryTokenExpiry = null;

/**
 * Initialize IndexedDB for token storage
 */
const initAuthDB = async () => {
  return openDB(AUTH_DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(AUTH_STORE_NAME)) {
        db.createObjectStore(AUTH_STORE_NAME);
      }
    },
  });
};

/**
 * Store refresh token securely in IndexedDB
 */
const storeRefreshToken = async (token, expiresAt) => {
  const db = await initAuthDB();
  await db.put(AUTH_STORE_NAME, { token, expiresAt, createdAt: Date.now() }, 'refreshToken');
};

/**
 * Retrieve refresh token from IndexedDB
 */
const getRefreshToken = async () => {
  try {
    const db = await initAuthDB();
    const data = await db.get(AUTH_STORE_NAME, 'refreshToken');
    if (!data) return null;
    
    // Check if refresh token is expired
    if (data.expiresAt && Date.now() > data.expiresAt) {
      await clearAuthData();
      return null;
    }
    
    return data.token;
  } catch (error) {
    console.error('[Auth] Failed to retrieve refresh token:', error);
    return null;
  }
};

/**
 * Store user profile in IndexedDB (non-sensitive)
 */
const storeUserProfile = async (user) => {
  const db = await initAuthDB();
  await db.put(AUTH_STORE_NAME, user, 'userProfile');
};

/**
 * Retrieve user profile from IndexedDB
 */
const getUserProfile = async () => {
  try {
    const db = await initAuthDB();
    return await db.get(AUTH_STORE_NAME, 'userProfile');
  } catch (error) {
    return null;
  }
};

/**
 * Clear all auth data (logout)
 */
const clearAuthData = async () => {
  memoryAccessToken = null;
  memoryTokenExpiry = null;
  try {
    const db = await initAuthDB();
    await db.clear(AUTH_STORE_NAME);
  } catch (error) {
    console.error('[Auth] Failed to clear auth data:', error);
  }
  clearAuthToken(); // Also clear API client
};

/**
 * Main authentication hook
 */
export const usePersistentAuth = (apiBaseUrl) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [lastAuthError, setLastAuthError] = useState(null);
  
  const refreshPromiseRef = useRef(null);
  const isRefreshingRef = useRef(false);

  /**
   * Check if access token needs refresh
   */
  const needsRefresh = useCallback(() => {
    if (!memoryAccessToken || !memoryTokenExpiry) return true;
    return Date.now() >= (memoryTokenExpiry - TOKEN_CONFIG.refreshBuffer);
  }, []);

  /**
   * Refresh access token using refresh token
   */
  const refreshAccessToken = useCallback(async () => {
    // Deduplicate concurrent refresh calls
    if (isRefreshingRef.current && refreshPromiseRef.current) {
      return refreshPromiseRef.current;
    }

    isRefreshingRef.current = true;
    
    refreshPromiseRef.current = (async () => {
      try {
        const refreshToken = await getRefreshToken();
        
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        const response = await fetch(`${apiBaseUrl}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });

        if (!response.ok) {
          const error = await response.json();
          
          // Handle revocation
          if (response.status === 401) {
            await clearAuthData();
            setIsAuthenticated(false);
            setUser(null);
            throw new Error('Session revoked. Please log in again.');
          }
          
          throw new Error(error.detail || 'Token refresh failed');
        }

        const data = await response.json();
        
        // Store new access token in memory
        memoryAccessToken = data.data.access_token;
        memoryTokenExpiry = Date.now() + TOKEN_CONFIG.accessTokenExpiry;
        setAuthToken(data.data.access_token); // Sync with API client
        
        // Store new refresh token (rotation)
        if (data.data.refresh_token) {
          const refreshExpiresAt = data.data.refresh_expires_at 
            ? new Date(data.data.refresh_expires_at).getTime()
            : Date.now() + TOKEN_CONFIG.refreshTokenExpiry;
          await storeRefreshToken(data.data.refresh_token, refreshExpiresAt);
        }
        
        // Update user profile if provided
        if (data.data.user) {
          await storeUserProfile(data.data.user);
          setUser(data.data.user);
        }
        
        setIsAuthenticated(true);
        setIsOffline(false);
        setLastAuthError(null);
        
        return memoryAccessToken;
      } catch (error) {
        console.error('[Auth] Refresh failed:', error);
        setLastAuthError(error.message);
        
        // Check if offline
        if (!navigator.onLine) {
          setIsOffline(true);
          // Allow using cached token if not too stale
          if (memoryAccessToken && memoryTokenExpiry && Date.now() < memoryTokenExpiry + 5 * 60 * 1000) {
            return memoryAccessToken; // 5 minute grace period offline
          }
        }
        
        throw error;
      } finally {
        isRefreshingRef.current = false;
        refreshPromiseRef.current = null;
      }
    })();

    return refreshPromiseRef.current;
  }, [apiBaseUrl]);

  /**
   * Initialize auth state on app load
   */
  useEffect(() => {
    const initAuth = async () => {
      try {
        setIsLoading(true);
        
        // Check for stored refresh token
        const refreshToken = await getRefreshToken();
        const cachedUser = await getUserProfile();
        
        if (refreshToken) {
          // Try to refresh access token
          try {
            await refreshAccessToken();
            if (cachedUser) {
              setUser(cachedUser);
            }
          } catch (error) {
            // If offline, check if we can use stale token
            if (!navigator.onLine && cachedUser) {
              setIsOffline(true);
              setUser(cachedUser);
              setIsAuthenticated(true); // Allow offline access
            } else {
              // Clear invalid auth state
              await clearAuthData();
              setIsAuthenticated(false);
            }
          }
        } else {
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('[Auth] Init failed:', error);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, [refreshAccessToken]);

  /**
   * Register refresh function with API client for 401 auto-retry
   */
  useEffect(() => {
    setRefreshFunction(refreshAccessToken);
    return () => setRefreshFunction(null);
  }, [refreshAccessToken]);

  /**
   * Handle online/offline changes
   */
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      // Try to refresh when coming back online
      if (isAuthenticated) {
        refreshAccessToken().catch(console.error);
      }
    };
    
    const handleOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isAuthenticated, refreshAccessToken]);

  /**
   * Login function
   */
  const login = useCallback(async (email, password) => {
    try {
      setIsLoading(true);
      setLastAuthError(null);
      
      const response = await fetch(`${apiBaseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Login failed');
      }

      const data = await response.json();
      const payload = data.data || data;
      
      // Store access token in memory
      memoryAccessToken = payload.access_token;
      memoryTokenExpiry = Date.now() + TOKEN_CONFIG.accessTokenExpiry;
      setAuthToken(payload.access_token); // Sync with API client
      
      // Store refresh token in IndexedDB
      if (payload.refresh_token) {
        const refreshExpiresAt = payload.refresh_expires_at 
          ? new Date(payload.refresh_expires_at).getTime()
          : Date.now() + TOKEN_CONFIG.refreshTokenExpiry;
        await storeRefreshToken(payload.refresh_token, refreshExpiresAt);
      }
      
      // Store user profile
      if (payload.user) {
        await storeUserProfile(payload.user);
        setUser(payload.user);
      }
      
      setIsAuthenticated(true);
      
      return { success: true, user: payload.user };
    } catch (error) {
      setLastAuthError(error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [apiBaseUrl]);

  /**
   * Logout function - Only way to end session!
   */
  const logout = useCallback(async () => {
    try {
      // Call server to revoke refresh token (best effort)
      const refreshToken = await getRefreshToken();
      if (refreshToken) {
        try {
          await fetch(`${apiBaseUrl}/auth/logout`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${memoryAccessToken || ''}`
            },
            body: JSON.stringify({ refresh_token: refreshToken }),
          });
        } catch (error) {
          console.warn('[Auth] Server logout failed (offline?), clearing locally');
        }
      }
    } finally {
      // Always clear local auth state
      await clearAuthData();
      setIsAuthenticated(false);
      setUser(null);
      setIsOffline(false);
      memoryAccessToken = null;
      memoryTokenExpiry = null;
      clearAuthToken(); // Clear API client token
    }
  }, [apiBaseUrl]);

  /**
   * Get current access token (for API calls)
   * Auto-refreshes if needed
   */
  const getAccessToken = useCallback(async () => {
    if (needsRefresh()) {
      return await refreshAccessToken();
    }
    return memoryAccessToken;
  }, [needsRefresh, refreshAccessToken]);

  /**
   * Check if token is valid for offline use
   */
  const canUseOffline = useCallback(() => {
    return isAuthenticated && memoryAccessToken && memoryTokenExpiry && 
           Date.now() < memoryTokenExpiry + 5 * 60 * 1000; // 5 min grace
  }, [isAuthenticated]);

  return {
    isAuthenticated,
    user,
    isLoading,
    isOffline,
    lastAuthError,
    login,
    logout,
    getAccessToken,
    refreshAccessToken,
    canUseOffline,
  };
};

export default usePersistentAuth;
