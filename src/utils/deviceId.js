import { storage } from '../plugins/capacitor';
import { STORAGE_KEYS } from './constants';

let _cachedDeviceId = null;

/**
 * Returns a stable per-install UUID that survives app restarts.
 * Generated once and stored in Capacitor Preferences / localStorage.
 */
export const getDeviceId = async () => {
  if (_cachedDeviceId) return _cachedDeviceId;

  let id = await storage.get(STORAGE_KEYS.DEVICE_ID);
  if (!id) {
    id = crypto.randomUUID();
    await storage.set(STORAGE_KEYS.DEVICE_ID, id);
  }
  _cachedDeviceId = id;
  return id;
};
