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

// Response interceptor - Handle errors globally
apiClient.interceptors.response.use(
  (response) => {
    // Extract data from the standardized response format
    if (response.data && response.data.success) {
      return response.data;
    }
    return response.data;
  },
  (error) => {
    // Handle different error scenarios
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;

      // Handle unauthorized - clear auth and redirect to login
      if (status === 401) {
        localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.USER_DATA);

        // Only redirect if not already on login page
        if (!window.location.pathname.includes('/login')) {
          emitToast('warning', 'Your session has expired. Please log in again.', {
            title: 'Session ended',
            duration: 4000,
          });
          setTimeout(() => { window.location.href = '/login'; }, 1500);
        }
      }

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
      // On public pages (login, forgot-password, reset-password) the form's own
      // error state will surface the message — no toast needed there.
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
