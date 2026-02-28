/**
 * Cross-platform storage utility
 * Uses SecureStore on native, localStorage on web
 */

import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const isWeb = Platform.OS === 'web';

/**
 * Store item securely (or in localStorage on web)
 */
export const setItem = async (key, value) => {
  try {
    if (isWeb) {
      localStorage.setItem(key, value);
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  } catch (error) {
    console.error('Storage setItem error:', error);
    throw error;
  }
};

/**
 * Retrieve item from storage
 */
export const getItem = async (key) => {
  try {
    if (isWeb) {
      return localStorage.getItem(key);
    } else {
      return await SecureStore.getItemAsync(key);
    }
  } catch (error) {
    console.error('Storage getItem error:', error);
    return null;
  }
};

/**
 * Remove item from storage
 */
export const deleteItem = async (key) => {
  try {
    if (isWeb) {
      localStorage.removeItem(key);
    } else {
      await SecureStore.deleteItemAsync(key);
    }
  } catch (error) {
    console.error('Storage deleteItem error:', error);
    throw error;
  }
};

/**
 * Storage utility object (drop-in replacement for SecureStore)
 */
export const crossPlatformStorage = {
  setItemAsync: setItem,
  getItemAsync: getItem,
  deleteItemAsync: deleteItem,
};

export default crossPlatformStorage;
