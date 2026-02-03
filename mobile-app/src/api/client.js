import axios from 'axios';
import { crossPlatformStorage } from '../utils/storage';
import { APP_CONFIG, STORAGE_KEYS } from '../utils/constants';

// Create axios instance
const apiClient = axios.create({
  baseURL: APP_CONFIG.API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds
});

// Request interceptor - Add auth token to requests
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await crossPlatformStorage.getItemAsync(STORAGE_KEYS.AUTH_TOKEN);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error getting auth token:', error);
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
    if (response.data && response.data.success) {
      return response.data;
    }
    return response.data;
  },
  async (error) => {
    if (error.response) {
      const { status, data } = error.response;

      // Handle unauthorized - clear auth
      if (status === 401) {
        await crossPlatformStorage.deleteItemAsync(STORAGE_KEYS.AUTH_TOKEN);
        await crossPlatformStorage.deleteItemAsync(STORAGE_KEYS.USER_DATA);
      }

      const errorMessage =
        data?.error?.message ||
        data?.message ||
        getDefaultErrorMessage(status);

      const enhancedError = new Error(errorMessage);
      enhancedError.status = status;
      enhancedError.code = data?.error?.code;
      enhancedError.details = data?.error?.details;

      return Promise.reject(enhancedError);
    } else if (error.request) {
      const networkError = new Error(
        'Network error. Please check your internet connection.'
      );
      networkError.isNetworkError = true;
      return Promise.reject(networkError);
    } else {
      return Promise.reject(error);
    }
  }
);

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
