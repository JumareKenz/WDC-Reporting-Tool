/**
 * usePersistentAuth — Authentication hook for kadwdc backend v2
 *
 * Supports two sign-in modes:
 *   - Mobile: phone + 6-digit PIN  (secretary / coordinator)
 *   - Console: email + password + TOTP  (director)
 *
 * Token storage:
 *   - Access token: in-memory only (XSS-safe)
 *   - Refresh token: Capacitor secureStorage (sessionStorage on web, OS sandbox on native)
 *   - User profile decoded from JWT payload; cached in Capacitor storage
 *
 * Every auth call includes a stable per-device `deviceId` so the backend can
 * scope refresh token revocation to a single device.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { secureStorage, storage } from '../plugins/capacitor';
import { setAuthToken, clearAuthToken, setRefreshFunction } from '../api/client';
import { STORAGE_KEYS, API_ENDPOINTS, USER_ROLES } from '../utils/constants';
import { getDeviceId } from '../utils/deviceId';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://kadwdc.equily.ng/api/v1';

// In-memory access token (never written to any storage)
let _accessToken    = null;
let _tokenExpiresAt = null; // Unix ms from `accessExpiresIn` (seconds)

/** Decode the JWT payload without verifying the signature. */
const decodeJWT = (token) => {
  try {
    const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(b64));
  } catch {
    return null;
  }
};

/** Build a minimal user object from the JWT payload claims. */
const userFromJWT = (token) => {
  const claims = decodeJWT(token);
  if (!claims) return null;
  return {
    id:     claims.sub,
    role:   claims.role,
    lgaId:  claims.lgaId  ?? null,
    wardId: claims.wardId ?? null,
  };
};

/** Route mapping for each role. */
const DEFAULT_ROUTE = {
  [USER_ROLES.SECRETARY]:   '/wdc',
  [USER_ROLES.COORDINATOR]: '/lga',
  [USER_ROLES.DIRECTOR]:    '/state',
};

export const usePersistentAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser]                       = useState(null);
  const [isLoading, setIsLoading]             = useState(true);
  const [isOffline, setIsOffline]             = useState(false);
  const [lastAuthError, setLastAuthError]     = useState(null);

  const isRefreshingRef    = useRef(false);
  const refreshPromiseRef  = useRef(null);

  // ─── Token helpers ──────────────────────────────────────────────────────────

  const _storeSession = useCallback(async (accessToken, refreshToken, refreshExpiresAt) => {
    _accessToken    = accessToken;
    _tokenExpiresAt = Date.now() + (decodeJWT(accessToken)?.exp * 1000 - Date.now());
    setAuthToken(accessToken);

    await secureStorage.set(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);

    const u = userFromJWT(accessToken);
    if (u) {
      await storage.set(STORAGE_KEYS.USER_PROFILE, JSON.stringify(u));
      setUser(u);
    }
    setIsAuthenticated(true);
    setIsOffline(false);
    setLastAuthError(null);
  }, []);

  const _clearSession = useCallback(async () => {
    _accessToken    = null;
    _tokenExpiresAt = null;
    clearAuthToken();
    await secureStorage.remove(STORAGE_KEYS.REFRESH_TOKEN);
    await storage.remove(STORAGE_KEYS.USER_PROFILE);
    setIsAuthenticated(false);
    setUser(null);
  }, []);

  // ─── Refresh ─────────────────────────────────────────────────────────────────

  const refreshAccessToken = useCallback(async () => {
    if (isRefreshingRef.current && refreshPromiseRef.current) {
      return refreshPromiseRef.current;
    }

    isRefreshingRef.current = true;
    refreshPromiseRef.current = (async () => {
      try {
        const refreshToken = await secureStorage.get(STORAGE_KEYS.REFRESH_TOKEN);
        if (!refreshToken) throw new Error('No refresh token');

        const deviceId = await getDeviceId();

        const res = await fetch(`${BASE_URL}${API_ENDPOINTS.REFRESH}`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ refreshToken, deviceId }),
        });

        if (!res.ok) {
          if (res.status === 401) await _clearSession();
          const body = await res.json().catch(() => ({}));
          throw new Error(body.message || 'Token refresh failed');
        }

        const data = await res.json();
        await _storeSession(data.accessToken, data.refreshToken, data.refreshExpiresAt);
        return _accessToken;
      } catch (err) {
        setLastAuthError(err.message);
        if (!navigator.onLine) {
          setIsOffline(true);
          if (_accessToken) return _accessToken; // grace period
        }
        throw err;
      } finally {
        isRefreshingRef.current   = false;
        refreshPromiseRef.current = null;
      }
    })();

    return refreshPromiseRef.current;
  }, [_clearSession, _storeSession]);

  // ─── Init on mount ────────────────────────────────────────────────────────────

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      try {
        const stored = await secureStorage.get(STORAGE_KEYS.REFRESH_TOKEN);
        if (!stored) return;

        const cachedUserJson = await storage.get(STORAGE_KEYS.USER_PROFILE);
        if (cachedUserJson) {
          try { setUser(JSON.parse(cachedUserJson)); } catch { /* ignore */ }
        }

        await refreshAccessToken();
      } catch {
        if (!navigator.onLine) {
          setIsOffline(true);
          // Keep previously set user / isAuthenticated if we have a cached token
          if (_accessToken) setIsAuthenticated(true);
        } else {
          await _clearSession();
        }
      } finally {
        setIsLoading(false);
        // Signal splash screen / auth-ready listeners
        window.dispatchEvent(new CustomEvent('wdc:auth-ready'));
      }
    };
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Wire the refresh callback into the Axios 401-retry interceptor
  useEffect(() => {
    setRefreshFunction(refreshAccessToken);
    return () => setRefreshFunction(null);
  }, [refreshAccessToken]);

  // Network listeners
  useEffect(() => {
    const online  = () => { setIsOffline(false); if (isAuthenticated) refreshAccessToken().catch(() => {}); };
    const offline = () => setIsOffline(true);
    window.addEventListener('online',  online);
    window.addEventListener('offline', offline);
    return () => { window.removeEventListener('online', online); window.removeEventListener('offline', offline); };
  }, [isAuthenticated, refreshAccessToken]);

  // ─── Login ────────────────────────────────────────────────────────────────────

  /**
   * Sign in.
   * Pass `{ phone, pin }` for mobile (secretary/coordinator) or
   * `{ email, password, totp }` for console (director).
   */
  const login = useCallback(async (credentials) => {
    setIsLoading(true);
    setLastAuthError(null);
    try {
      const deviceId  = await getDeviceId();
      const isMobile  = 'phone' in credentials;
      const endpoint  = isMobile ? API_ENDPOINTS.SIGN_IN_MOBILE : API_ENDPOINTS.SIGN_IN_CONSOLE;
      const body      = { ...credentials, deviceId };

      const res = await fetch(`${BASE_URL}${endpoint}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Login failed');
      }

      const data = await res.json();
      await _storeSession(data.accessToken, data.refreshToken, data.refreshExpiresAt);
      return { success: true, user: userFromJWT(data.accessToken) };
    } catch (err) {
      setLastAuthError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [_storeSession]);

  // ─── Logout ───────────────────────────────────────────────────────────────────

  const logout = useCallback(async () => {
    try {
      const deviceId = await getDeviceId();
      if (_accessToken) {
        await fetch(`${BASE_URL}${API_ENDPOINTS.SIGN_OUT}`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${_accessToken}` },
          body:    JSON.stringify({ deviceId }),
        }).catch(() => { /* best-effort */ });
      }
    } finally {
      await _clearSession();
    }
  }, [_clearSession]);

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  const getAccessToken = useCallback(async () => {
    const BUFFER_MS = 60_000;
    if (!_accessToken || (_tokenExpiresAt && Date.now() >= _tokenExpiresAt - BUFFER_MS)) {
      return refreshAccessToken();
    }
    return _accessToken;
  }, [refreshAccessToken]);

  const canUseOffline = useCallback(() => {
    return isAuthenticated && !!_accessToken;
  }, [isAuthenticated]);

  const getDefaultRoute = useCallback(() => {
    if (!user) return '/login';
    return DEFAULT_ROUTE[user.role] || '/';
  }, [user]);

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
    getDefaultRoute,
  };
};

export default usePersistentAuth;
