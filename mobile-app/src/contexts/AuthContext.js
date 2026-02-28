import React, { createContext, useState, useContext, useEffect } from 'react';
import { crossPlatformStorage } from '../utils/storage';
import apiClient from '../api/client';
import { STORAGE_KEYS, USER_ROLES } from '../utils/constants';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Load user data on app start
  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const token = await crossPlatformStorage.getItemAsync(STORAGE_KEYS.AUTH_TOKEN);
      const userData = await crossPlatformStorage.getItemAsync(STORAGE_KEYS.USER_DATA);

      if (token && userData) {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      await logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      setLoading(true);
      const response = await apiClient.post('/auth/login', { email, password });

      if (response.success && response.data) {
        const { access_token, user: userData } = response.data;

        // Store token and user data securely
        await crossPlatformStorage.setItemAsync(STORAGE_KEYS.AUTH_TOKEN, access_token);
        await crossPlatformStorage.setItemAsync(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));

        setUser(userData);
        setIsAuthenticated(true);

        return { success: true, user: userData };
      }

      throw new Error('Login failed');
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      await crossPlatformStorage.deleteItemAsync(STORAGE_KEYS.AUTH_TOKEN);
      await crossPlatformStorage.deleteItemAsync(STORAGE_KEYS.USER_DATA);

      setUser(null);
      setIsAuthenticated(false);

      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const getDefaultRoute = () => {
    if (!user) return 'Login';

    const routes = {
      [USER_ROLES.WDC_SECRETARY]: 'WDCDashboard',
      [USER_ROLES.LGA_COORDINATOR]: 'LGADashboard',
      [USER_ROLES.STATE_OFFICIAL]: 'StateDashboard',
    };

    return routes[user.role] || 'Login';
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    logout,
    getDefaultRoute,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
