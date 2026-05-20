/**
 * authClient — Axios instance with automatic token refresh
 *
 * Features:
 * - Automatic access token attachment to requests
 * - Silent token refresh on 401 errors
 * - Queue requests during token refresh
 * - Offline detection and handling
 */

import axios from 'axios';
import { openDB } from 'idb';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

// Create axios instance
const authClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
};

// In-memory token storage (sync with usePersistentAuth)
let memoryAccessToken = null;
let isRefreshing = false;
let refreshSubscribers = [];

/**
 * Subscribe to token refresh
 */
const subscribeTokenRefresh = (callback) => {
  refreshSubscribers.push(callback);
};

/**
 * Notify subscribers of new token
 */
const onTokenRefreshed = (token) => {
  refreshSubscribers.forEach((callback) => callback(token));
  refreshSubscribers = [];
};

/**
 * Get access token from memory or trigger refresh
 */
const getValidToken = async () => {
  // If we have a token in memory, use it
  if (memoryAccessToken) {
    return memoryAccessToken;
  }
  
  // Otherwise, try to refresh
  if (!isRefreshing) {
    return await refreshAccessToken();
  }
  
  // Wait for ongoing refresh
  return new Promise((resolve) => {
    subscribeTokenRefresh((token) => {
      resolve(token);
    });
  });
};

/**
 * Refresh access token using stored refresh token
 */
const refreshAccessToken = async () => {
  if (isRefreshing) {
    return new Promise((resolve) => {
      subscribeTokenRefresh((token) => resolve(token));
    });
  }

  isRefreshing = true;

  try {
    // Get refresh token from IndexedDB
    const db = await openDB('wdc-auth-db', 1);
    const tokenData = await db.get('tokens', 'refreshToken');
    
    if (!tokenData?.token) {
      throw new Error('No refresh token available');
    }

    const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
      refresh_token: tokenData.token,
    });

    const { access_token, refresh_token } = response.data.data || response.data;
    
    // Update memory token
    memoryAccessToken = access_token;
    
    // Update refresh token if rotated
    if (refresh_token) {
      await db.put('tokens', {
        token: refresh_token,
        expiresAt: Date.now() + 365 * 24 * 60 * 60 * 1000,
        createdAt: Date.now(),
      }, 'refreshToken');
    }

    onTokenRefreshed(access_token);
    return access_token;
  } catch (error) {
    // Clear auth state on refresh failure
    memoryAccessToken = null;
    
    // If not offline, redirect to login
    if (navigator.onLine) {
      window.location.href = '/login?reason=session_expired';
    }
    
    throw error;
  } finally {
    isRefreshing = false;
  }
};

/**
 * Set access token (called by usePersistentAuth after login)
 */
export const setAccessToken = (token) => {
  memoryAccessToken = token;
};

/**
 * Clear access token (called on logout)
 */
export const clearAccessToken = () => {
  memoryAccessToken = null;
};

// Request interceptor - Add auth header
authClient.interceptors.request.use(
  async (config) => {
    // Skip auth for login/refresh endpoints
    if (config.url?.includes('/auth/login') || config.url?.includes('/auth/refresh')) {
      return config;
    }

    try {
      const token = await getValidToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.warn('[Auth] Failed to get valid token:', error);
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - Handle 401 and refresh
authClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Check if it's a refresh token failure
      if (originalRequest.url?.includes('/auth/refresh')) {
        // Refresh failed, clear auth and redirect
        clearAccessToken();
        if (navigator.onLine) {
          window.location.href = '/login?reason=session_expired';
        }
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      try {
        const newToken = await refreshAccessToken();
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return authClient(originalRequest);
      } catch (refreshError) {
        return Promise.reject(refreshError);
      }
    }

    // Handle network errors (offline)
    if (!error.response && !navigator.onLine) {
      error.isNetworkError = true;
      error.message = 'You are offline. Changes will be saved and synced when you reconnect.';
    }

    // Enhance error with user-friendly messages
    if (error.response) {
      const status = error.response.status;
      const messages = {
        403: 'You do not have permission to perform this action.',
        404: 'The requested resource was not found.',
        409: 'This action conflicts with existing data.',
        422: 'Validation failed. Please check your input.',
        429: 'Too many requests. Please try again later.',
        500: 'Server error. Please try again later.',
        503: 'Service temporarily unavailable.',
      };
      
      if (messages[status]) {
        error.message = messages[status];
      }
    }

    return Promise.reject(error);
  }
);

export default authClient;
