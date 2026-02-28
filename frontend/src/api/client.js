import axios from 'axios';
import { STORAGE_KEYS } from '../utils/constants';
import { emitToast } from '../hooks/useToast';

// Base API URL - can be configured via environment variable
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

// Create axios instance
const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds
});

// ---------- Token-refresh state for 401 interceptor ----------
let isRefreshingToken = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Request interceptor - Add auth token to requests
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors globally with silent token refresh on 401
apiClient.interceptors.response.use(
  (response) => {
    // Extract data from the standardized response format
    if (response.data && response.data.success) {
      return response.data;
    }
    return response.data;
  },
  async (error) => {
    const originalRequest = error.config;

    // ---------- 401 handling with token refresh ----------
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      // Don't attempt refresh for login requests or refresh requests themselves
      if (
        originalRequest.url?.includes('/auth/login') ||
        originalRequest.url?.includes('/auth/refresh')
      ) {
        return Promise.reject(error);
      }

      if (isRefreshingToken) {
        // Another refresh is already in progress — queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshingToken = true;

      const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);

      if (!refreshToken) {
        // No refresh token available — clear auth and redirect
        isRefreshingToken = false;
        processQueue(new Error('No refresh token'), null);
        localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.USER_DATA);
        if (!window.location.pathname.includes('/login')) {
          emitToast('warning', 'Your session has expired. Please log in again.', {
            title: 'Session ended',
            duration: 4000,
          });
          setTimeout(() => { window.location.href = '/login'; }, 1500);
        }
        return Promise.reject(error);
      }

      try {
        // Use raw axios (not apiClient) to avoid interceptor loop
        const response = await axios.post(
          `${BASE_URL}/auth/refresh`,
          { refresh_token: refreshToken },
          { headers: { 'Content-Type': 'application/json' } }
        );

        const data = response.data?.data || response.data;
        const newAccessToken = data.access_token;
        const newRefreshToken = data.refresh_token;

        if (newAccessToken) {
          localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, newAccessToken);
        }
        if (newRefreshToken) {
          localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, newRefreshToken);
        }

        isRefreshingToken = false;
        processQueue(null, newAccessToken);

        // Retry the original request with the new token
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        isRefreshingToken = false;

        // Only force logout if the server explicitly rejected the refresh token (401/403).
        // Network errors (no response) should NOT log the user out — they may just be offline.
        const isServerRejection =
          refreshError.response &&
          (refreshError.response.status === 401 || refreshError.response.status === 403);

        if (isServerRejection) {
          // Refresh token itself is invalid/expired — clear everything and redirect
          processQueue(refreshError, null);
          localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
          localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
          localStorage.removeItem(STORAGE_KEYS.USER_DATA);

          if (!window.location.pathname.includes('/login')) {
            emitToast('warning', 'Your session has expired. Please log in again.', {
              title: 'Session ended',
              duration: 4000,
            });
            setTimeout(() => { window.location.href = '/login'; }, 1500);
          }
        } else {
          // Network error — keep tokens, let the session manager retry later
          processQueue(refreshError, null);
        }

        return Promise.reject(refreshError);
      }
    }

    // ---------- Non-401 error handling ----------
    if (error.response) {
      const { status, data } = error.response;

      // Extract error message from standardized error response
      let errorMessage =
        data?.error?.message ||
        data?.message ||
        data?.detail ||
        getDefaultErrorMessage(status);

      // Handle Pydantic validation errors (422)
      if (status === 422 && data?.detail && Array.isArray(data.detail)) {
        const validationErrors = data.detail.map(err => {
          const field = err.loc?.slice(1).join('.') || 'field';
          return `${field}: ${err.msg}`;
        }).join(', ');
        errorMessage = `Validation errors: ${validationErrors}`;
      }

      // Handle conflict errors (409) with specific message
      if (status === 409 && typeof data?.detail === 'object' && data.detail.message) {
        errorMessage = data.detail.message;
      }

      // Create enhanced error object
      const enhancedError = new Error(errorMessage);
      enhancedError.status = status;
      enhancedError.code = data?.error?.code;
      enhancedError.details = data?.error?.details || data?.detail;

      return Promise.reject(enhancedError);
    } else if (error.request) {
      // Request made but no response received (network / server-down error)
      const networkError = new Error(
        'Network error. Please check your internet connection.'
      );
      networkError.isNetworkError = true;

      // Only show the draft-save toast when the user is already authenticated.
      const isAuthenticated = !!localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      if (isAuthenticated) {
        emitToast('warning', 'No connection – your work has been saved as a draft and will sync when reconnected.', {
          title: 'You are offline',
          duration: 6000,
        });
      }

      return Promise.reject(networkError);
    } else {
      // Something else happened
      return Promise.reject(error);
    }
  }
);

/**
 * Get default error message based on HTTP status code
 */
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
 * Helper function for multipart/form-data requests (file uploads)
 */
export const createFormData = (data) => {
  const formData = new FormData();

  Object.keys(data).forEach((key) => {
    const value = data[key];

    // Handle file objects
    if (value instanceof File || value instanceof Blob) {
      formData.append(key, value);
    }
    // Handle arrays
    else if (Array.isArray(value)) {
      value.forEach((item, index) => {
        formData.append(`${key}[${index}]`, item);
      });
    }
    // Handle null/undefined
    else if (value === null || value === undefined) {
      // Skip null/undefined values
    }
    // Handle other values
    else {
      formData.append(key, value);
    }
  });

  return formData;
};

/**
 * Upload file with multipart/form-data
 */
export const uploadFile = (url, data, onProgress = null) => {
  const formData = createFormData(data);

  const config = {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  };

  // Add upload progress callback if provided
  if (onProgress) {
    config.onUploadProgress = (progressEvent) => {
      const percentCompleted = Math.round(
        (progressEvent.loaded * 100) / progressEvent.total
      );
      onProgress(percentCompleted);
    };
  }

  return apiClient.post(url, formData, config);
};

/**
 * Download file (returns blob)
 */
export const downloadFile = async (url, filename = null) => {
  try {
    const response = await apiClient.get(url, {
      responseType: 'blob',
    });

    // Create blob link to download
    const blob = new Blob([response]);
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;

    // Extract filename from Content-Disposition header or use provided filename
    const contentDisposition = response.headers?.['content-disposition'];
    if (contentDisposition && !filename) {
      const filenameMatch = contentDisposition.match(/filename="?(.+)"?/i);
      if (filenameMatch) {
        filename = filenameMatch[1];
      }
    }

    link.setAttribute('download', filename || 'download');
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);

    return true;
  } catch (error) {
    console.error('Download failed:', error);
    throw error;
  }
};

/**
 * Build query string from object
 */
export const buildQueryString = (params) => {
  const searchParams = new URLSearchParams();

  Object.keys(params).forEach((key) => {
    const value = params[key];
    if (value !== null && value !== undefined && value !== '') {
      searchParams.append(key, value);
    }
  });

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
};

export default apiClient;
