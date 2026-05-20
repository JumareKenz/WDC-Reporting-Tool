/**
 * ML Kit Text Recognition — Capacitor Plugin Wrapper
 *
 * On Android, this calls the native ML Kit Text Recognition API.
 * On web, it throws so the caller falls back to Tesseract.js.
 *
 * To enable on Android, add the following to android/app/build.gradle:
 *   implementation 'com.google.mlkit:text-recognition:16.0.0'
 *
 * And register the native plugin in MainActivity.java.
 * See: docs/MLKIT_SETUP.md for full instructions.
 */

import { isNative } from './capacitor';
import { registerPlugin } from '@capacitor/core';

const MLKitTextRecognition = registerPlugin('MLKitTextRecognition', {
  web: () => {
    return {
      recognizeText: async () => {
        throw new Error('ML Kit is not available on web');
      },
    };
  },
});

/**
 * Recognize text from a base64-encoded image.
 * @param {{ base64: string }} options
 * @returns {Promise<{ text: string, blocks: Array<{ text: string, boundingBox: object }> }>}
 */
export const TextRecognition = {
  async recognizeText({ base64 }) {
    if (!isNative) {
      throw new Error('ML Kit is not available on web');
    }
    const result = await MLKitTextRecognition.recognizeText({ base64 });
    return result;
  },
};
