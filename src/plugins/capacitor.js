/**
 * Capacitor Plugin Abstraction Layer
 *
 * Central module that wraps all Capacitor plugins with web fallbacks.
 * Import from this file everywhere — never import Capacitor plugins directly.
 *
 * Security model for storage:
 *   - storage.*       → @capacitor/preferences (Android SharedPreferences / iOS UserDefaults)
 *                       Protected by OS app sandbox. Use for drafts, queue, user profile.
 *   - secureStorage.* → Also uses @capacitor/preferences on native (the Android sandbox
 *                       protects it from other apps). Uses sessionStorage on web (clears
 *                       on tab/browser close — safer than localStorage for tokens).
 *                       TODO: Replace secureStorage native backing with
 *                       @aparajita/capacitor-secure-storage v5+ for Keystore encryption
 *                       on rooted-device threat models.
 */

import { Capacitor } from '@capacitor/core';

/** True when running inside a Capacitor native shell (Android/iOS) */
export const isNative = Capacitor.isNativePlatform();

/** 'android' | 'ios' | 'web' */
export const platform = Capacitor.getPlatform();

// ─────────────────────────────────────────────────────────────────────────────
// Lazy plugin loaders — prevent import errors in browser environments
// ─────────────────────────────────────────────────────────────────────────────
let _Preferences = null;
async function getPreferences() {
  if (!_Preferences) {
    const mod = await import('@capacitor/preferences');
    _Preferences = mod.Preferences;
  }
  return _Preferences;
}

let _Network = null;
async function getNetwork() {
  if (!_Network) {
    const mod = await import('@capacitor/network');
    _Network = mod.Network;
  }
  return _Network;
}

let _App = null;
async function getApp() {
  if (!_App) {
    const mod = await import('@capacitor/app');
    _App = mod.App;
  }
  return _App;
}

// ─────────────────────────────────────────────────────────────────────────────
// GENERAL STORAGE  (non-sensitive: drafts, queue metadata, cached user profile)
// ─────────────────────────────────────────────────────────────────────────────
export const storage = {
  /**
   * Get a value by key. Returns null if not found.
   */
  async get(key) {
    if (isNative) {
      const P = await getPreferences();
      const { value } = await P.get({ key });
      return value; // null if missing
    }
    return localStorage.getItem(key);
  },

  /**
   * Set a string value. Pass JSON.stringify(obj) for objects.
   */
  async set(key, value) {
    if (isNative) {
      const P = await getPreferences();
      await P.set({ key, value: String(value) });
    } else {
      localStorage.setItem(key, String(value));
    }
  },

  /**
   * Remove a key.
   */
  async remove(key) {
    if (isNative) {
      const P = await getPreferences();
      await P.remove({ key });
    } else {
      localStorage.removeItem(key);
    }
  },

  /**
   * Clear all app preferences (use with care — wipes all stored data).
   */
  async clear() {
    if (isNative) {
      const P = await getPreferences();
      await P.clear();
    } else {
      localStorage.clear();
    }
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// SECURE STORAGE  (auth tokens: access token ref, refresh token)
//
// Native: @capacitor/preferences in a separate namespace ('_sec_' prefix).
//   Android sandbox prevents other apps from reading this.
//   On native WebViews, XSS risk is minimal (fixed origin, no arbitrary URLs).
//
// Web: sessionStorage — clears when browser tab/session closes.
//   More secure than localStorage for tokens.
// ─────────────────────────────────────────────────────────────────────────────
const SEC_PREFIX = '_sec_';

export const secureStorage = {
  async get(key) {
    if (isNative) {
      const P = await getPreferences();
      const { value } = await P.get({ key: SEC_PREFIX + key });
      return value;
    }
    return sessionStorage.getItem(key);
  },

  async set(key, value) {
    if (isNative) {
      const P = await getPreferences();
      await P.set({ key: SEC_PREFIX + key, value: String(value) });
    } else {
      sessionStorage.setItem(key, String(value));
    }
  },

  async remove(key) {
    if (isNative) {
      const P = await getPreferences();
      await P.remove({ key: SEC_PREFIX + key });
    } else {
      sessionStorage.removeItem(key);
    }
  },

  async clear() {
    if (isNative) {
      // Only clear sec-prefixed keys, not all preferences
      const P = await getPreferences();
      const { keys } = await P.keys();
      await Promise.all(
        keys
          .filter((k) => k.startsWith(SEC_PREFIX))
          .map((k) => P.remove({ key: k }))
      );
    } else {
      sessionStorage.clear();
    }
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// NETWORK STATUS
// Replaces navigator.onLine which is unreliable inside Android WebViews.
// ─────────────────────────────────────────────────────────────────────────────
export const network = {
  /**
   * Get current network status.
   * @returns {{ connected: boolean, connectionType: string }}
   */
  async getStatus() {
    if (isNative) {
      const N = await getNetwork();
      return N.getStatus();
    }
    return { connected: navigator.onLine, connectionType: 'unknown' };
  },

  /**
   * Listen for network changes.
   * Returns a handle with a .remove() method.
   * @param {(status: { connected: boolean, connectionType: string }) => void} callback
   */
  async addListener(callback) {
    if (isNative) {
      const N = await getNetwork();
      return N.addListener('networkStatusChange', callback);
    }
    // Web fallback: browser online/offline events
    const onOnline  = () => callback({ connected: true,  connectionType: 'unknown' });
    const onOffline = () => callback({ connected: false, connectionType: 'none' });
    window.addEventListener('online',  onOnline);
    window.addEventListener('offline', onOffline);
    return {
      remove: () => {
        window.removeEventListener('online',  onOnline);
        window.removeEventListener('offline', onOffline);
      },
    };
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// CAMERA  (photo capture for OCR feature)
// ─────────────────────────────────────────────────────────────────────────────
let _Camera = null;
async function getCamera() {
  if (!_Camera) {
    const mod = await import('@capacitor/camera');
    _Camera = mod.Camera;
  }
  return _Camera;
}

export const camera = {
  async takePhoto() {
    if (isNative) {
      const Camera = await getCamera();
      const { CameraResultType, CameraSource } = await import('@capacitor/camera');
      const image = await Camera.getPhoto({
        quality: 85,
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera,
        correctOrientation: true,
      });
      return { base64: image.base64String, format: image.format };
    }
    return pickFileAsBase64('image/*');
  },

  async pickFromGallery() {
    if (isNative) {
      const Camera = await getCamera();
      const { CameraResultType, CameraSource } = await import('@capacitor/camera');
      const image = await Camera.getPhoto({
        quality: 85,
        resultType: CameraResultType.Base64,
        source: CameraSource.Photos,
        correctOrientation: true,
      });
      return { base64: image.base64String, format: image.format };
    }
    return pickFileAsBase64('image/*');
  },
};

function pickFileAsBase64(accept) {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return reject(new Error('No file selected'));
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result.split(',')[1];
        const format = file.type.split('/')[1] || 'jpeg';
        resolve({ base64, format, file });
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    };
    input.click();
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// MICROPHONE  (audio recording for voice assistant)
// ─────────────────────────────────────────────────────────────────────────────
export const microphone = {
  _mediaRecorder: null,
  _chunks: [],

  async startRecording() {
    if (typeof navigator.mediaDevices?.getUserMedia === 'function') {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this._chunks = [];
      this._mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4',
      });
      this._mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) this._chunks.push(e.data);
      };
      this._mediaRecorder.start();
      return true;
    }
    throw new Error('Microphone not available');
  },

  async stopRecording() {
    return new Promise((resolve, reject) => {
      if (!this._mediaRecorder) return reject(new Error('No active recording'));
      this._mediaRecorder.onstop = () => {
        const blob = new Blob(this._chunks, { type: this._mediaRecorder.mimeType });
        const tracks = this._mediaRecorder.stream?.getTracks();
        tracks?.forEach((t) => t.stop());
        this._mediaRecorder = null;
        this._chunks = [];
        resolve(blob);
      };
      this._mediaRecorder.stop();
    });
  },

  isRecording() {
    return this._mediaRecorder?.state === 'recording';
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// APP LIFECYCLE  (pause / resume events — no web equivalent)
// ─────────────────────────────────────────────────────────────────────────────
export const appLifecycle = {
  /**
   * Register a callback for when the app is moved to the background (paused).
   * On web, fires when the browser tab becomes hidden.
   * Returns a handle with a .remove() method.
   */
  async onPause(callback) {
    if (isNative) {
      const A = await getApp();
      return A.addListener('pause', callback);
    }
    const handler = () => { if (document.hidden) callback(); };
    document.addEventListener('visibilitychange', handler);
    return { remove: () => document.removeEventListener('visibilitychange', handler) };
  },

  /**
   * Register a callback for when the app returns to the foreground (resumed).
   * On web, fires when the browser tab becomes visible.
   * Returns a handle with a .remove() method.
   */
  async onResume(callback) {
    if (isNative) {
      const A = await getApp();
      return A.addListener('resume', callback);
    }
    const handler = () => { if (!document.hidden) callback(); };
    document.addEventListener('visibilitychange', handler);
    return { remove: () => document.removeEventListener('visibilitychange', handler) };
  },

  /**
   * Get current app state.
   * @returns {{ isActive: boolean }}
   */
  async getState() {
    if (isNative) {
      const A = await getApp();
      return A.getState();
    }
    return { isActive: !document.hidden };
  },
};
