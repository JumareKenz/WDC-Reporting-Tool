/**
 * Platform detection and polyfills for web
 */
import { Platform } from 'react-native';

export const isWeb = Platform.OS === 'web';
export const isNative = !isWeb;

// Polyfill for web-specific needs
if (isWeb && typeof window !== 'undefined') {
  // Ensure crypto is available
  if (!window.crypto) {
    window.crypto = {
      getRandomValues: (array) => {
        for (let i = 0; i < array.length; i++) {
          array[i] = Math.floor(Math.random() * 256);
        }
        return array;
      },
    };
  }
}

export default { isWeb, isNative };
