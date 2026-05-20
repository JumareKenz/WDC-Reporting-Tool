/**
 * Vitest mock for src/plugins/capacitor.js
 *
 * Provides in-memory implementations of all Capacitor abstractions so unit
 * tests run without any native plugins installed.
 *
 * Usage: Vitest will auto-resolve this when tests import
 * '../plugins/capacitor' or '../../plugins/capacitor' via the alias
 * configured in vite.config.js.
 */

export const isNative = false;
export const platform = 'web';

// In-memory backing store shared across storage and secureStorage
const _store = new Map();
const _secStore = new Map();

export const storage = {
  get: vi.fn(async (key) => _store.get(key) ?? null),
  set: vi.fn(async (key, value) => { _store.set(key, String(value)); }),
  remove: vi.fn(async (key) => { _store.delete(key); }),
  clear: vi.fn(async () => { _store.clear(); }),
};

export const secureStorage = {
  get: vi.fn(async (key) => _secStore.get(key) ?? null),
  set: vi.fn(async (key, value) => { _secStore.set(key, String(value)); }),
  remove: vi.fn(async (key) => { _secStore.delete(key); }),
  clear: vi.fn(async () => { _secStore.clear(); }),
};

export const network = {
  getStatus: vi.fn(async () => ({ connected: true, connectionType: 'wifi' })),
  addListener: vi.fn(async () => ({ remove: vi.fn() })),
};

export const appLifecycle = {
  onPause:  vi.fn(async () => ({ remove: vi.fn() })),
  onResume: vi.fn(async () => ({ remove: vi.fn() })),
  getState: vi.fn(async () => ({ isActive: true })),
};

// Helper to reset all mocks and stores between tests
export function resetCapacitorMocks() {
  _store.clear();
  _secStore.clear();
  vi.clearAllMocks();
}
