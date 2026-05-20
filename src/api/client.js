import axios from 'axios';
import { emitToast } from '../hooks/useToast';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://kadwdc.equily.ng/api/v1';

// ─────────────────────────────────────────────────────────────────────────────
// In-memory token store
//
// The access token lives ONLY in memory (never in localStorage/sessionStorage)
// to eliminate XSS token-theft. AuthProvider calls setAuthToken() after each
// login or token refresh, and clearAuthToken() on logout.
// ─────────────────────────────────────────────────────────────────────────────
let _accessToken = null;

/** Called by AuthProvider after login or token refresh */
export const setAuthToken = (token) => { _accessToken = token; };

/** Called by AuthProvider on logout */
export const clearAuthToken = () => { _accessToken = null; };

// ─────────────────────────────────────────────────────────────────────────────
// Refresh function injection
//
// AuthProvider injects its refreshAccessToken() here so the 401-retry
// interceptor can silently refresh without creating a circular dependency.
// ─────────────────────────────────────────────────────────────────────────────
let _refreshFn = null;

/** Called by AuthProvider to wire up the refresh callback */
export const setRefreshFunction = (fn) => { _refreshFn = fn; };

// ─────────────────────────────────────────────────────────────────────────────
// Refresh activity callbacks
//
// Components can subscribe to silent-refresh start/end events so they can
// display non-blocking loading UI without polling or prop drilling.
// ─────────────────────────────────────────────────────────────────────────────
let _onRefreshStart = null;
let _onRefreshEnd   = null;

/**
 * Register callbacks for silent-refresh start / end events.
 * Called once by <RefreshIndicator> on mount; pass null to unregister.
 */
export const setRefreshCallbacks = (onStart, onEnd) => {
  _onRefreshStart = onStart;
  _onRefreshEnd   = onEnd;
};

// ─────────────────────────────────────────────────────────────────────────────
// Axios instance
// ─────────────────────────────────────────────────────────────────────────────
const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30_000,
});

// ── Request interceptor — attach bearer token ─────────────────────────────
apiClient.interceptors.request.use(
  (config) => {
    if (_accessToken) {
      config.headers.Authorization = `Bearer ${_accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor — handle errors + refresh-on-401 ────────────────
apiClient.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const { response, config } = error;

    // ── 401: try to refresh token once, then retry the original request ──
    if (response?.status === 401 && !config._retried && _refreshFn) {
      config._retried = true;
      try {
        // Notify UI that a silent refresh is starting (non-blocking indicator)
        _onRefreshStart?.();
        const newToken = await _refreshFn();
        _onRefreshEnd?.(true); // success
        if (newToken) {
          config.headers.Authorization = `Bearer ${newToken}`;
          return apiClient(config); // Retry with fresh token
        }
      } catch {
        _onRefreshEnd?.(false); // failure — fall through to logout toast below
      }
    }

    if (response?.status === 401) {
      // At this point either: no refresh fn, refresh failed, or already retried
      if (!window.location.pathname.includes('/login')) {
        emitToast('warning', 'Your session has expired. Please log in again.', {
          title: 'Session ended',
          duration: 4000,
        });
        // Give the toast a moment to appear, then redirect
        setTimeout(() => { window.location.href = '/login'; }, 1500);
      }
    }

    if (!response) {
      // Network / server-down error
      const isAuthenticated = !!_accessToken;
      if (isAuthenticated) {
        emitToast('warning',
          'No connection – your work has been saved as a draft and will sync when reconnected.',
          { title: 'You are offline', duration: 6000 }
        );
      }
    }

    // Extract error message from standardised error response
    const data   = response?.data;
    const status = response?.status;

    let errorMessage =
      data?.error?.message ||
      data?.message ||
      data?.detail ||
      getDefaultErrorMessage(status);

    // Pydantic validation errors (422)
    if (status === 422 && Array.isArray(data?.detail)) {
      errorMessage = 'Validation errors: ' + data.detail
        .map((e) => `${e.loc?.slice(1).join('.') || 'field'}: ${e.msg}`)
        .join(', ');
    }

    // Conflict with structured detail (409)
    if (status === 409 && typeof data?.detail === 'object' && data.detail.message) {
      errorMessage = data.detail.message;
    }

    const enhancedError       = new Error(errorMessage);
    enhancedError.status      = status;
    enhancedError.code        = data?.error?.code;
    enhancedError.details     = data?.error?.details || data?.detail;
    enhancedError.isNetworkError = !response;

    return Promise.reject(enhancedError);
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const getDefaultErrorMessage = (status) => {
  const messages = {
    400: 'Invalid request. Please check your input.',
    401: 'Authentication required. Please log in.',
    403: 'You do not have permission to perform this action.',
    404: 'The requested resource was not found.',
    409: 'This resource already exists.',
    413: 'File size is too large.',
    422: 'Validation failed. Please check your input.',
    429: 'Too many requests. Please try again later.',
    500: 'Internal server error. Please try again later.',
    503: 'Service temporarily unavailable. Please try again later.',
  };
  return messages[status] || 'An unexpected error occurred.';
};

/**
 * Build a FormData object from a plain object.
 * Handles File/Blob, arrays, null/undefined gracefully.
 */
export const createFormData = (data) => {
  const formData = new FormData();
  Object.keys(data).forEach((key) => {
    const value = data[key];
    if (value instanceof File || value instanceof Blob) {
      formData.append(key, value);
    } else if (Array.isArray(value)) {
      value.forEach((item, i) => formData.append(`${key}[${i}]`, item));
    } else if (value !== null && value !== undefined) {
      formData.append(key, value);
    }
  });
  return formData;
};

/**
 * Upload a file using multipart/form-data.
 */
export const uploadFile = (url, data, onProgress = null) => {
  const formData = createFormData(data);
  const config = { headers: { 'Content-Type': 'multipart/form-data' } };
  if (onProgress) {
    config.onUploadProgress = (e) => {
      onProgress(Math.round((e.loaded * 100) / e.total));
    };
  }
  return apiClient.post(url, formData, config);
};

/**
 * Download a file and trigger browser save dialog.
 */
export const downloadFile = async (url, filename = null) => {
  const response = await apiClient.get(url, { responseType: 'blob' });
  const blob        = new Blob([response]);
  const downloadUrl = window.URL.createObjectURL(blob);
  const link        = document.createElement('a');
  link.href = downloadUrl;
  const cd = response.headers?.['content-disposition'];
  if (cd && !filename) {
    const m = cd.match(/filename="?(.+)"?/i);
    if (m) filename = m[1];
  }
  link.setAttribute('download', filename || 'download');
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(downloadUrl);
  return true;
};

/**
 * Serialise a params object into a query string (e.g. "?page=1&limit=10").
 */
export const buildQueryString = (params) => {
  const sp = new URLSearchParams();
  Object.keys(params).forEach((key) => {
    const v = params[key];
    if (v !== null && v !== undefined && v !== '') sp.append(key, v);
  });
  const qs = sp.toString();
  return qs ? `?${qs}` : '';
};

export default apiClient;
