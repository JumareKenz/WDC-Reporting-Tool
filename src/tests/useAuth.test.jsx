/**
 * Unit tests — src/hooks/useAuth.jsx
 *
 * Post-Capacitor migration architecture:
 * - useAuth calls axios directly for login/refresh (avoids apiClient circular dep).
 * - Token storage uses Capacitor secureStorage / storage (mocked via vi.mock below).
 * - apiClient module must expose setAuthToken, clearAuthToken, setRefreshFunction.
 */

import { renderHook, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../hooks/useAuth';

// ── Mock @capacitor/core (imported by plugins/capacitor.js) ───────────────────
vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => false, getPlatform: () => 'web' },
}));

// ── Mock plugins/capacitor — in-memory storage ────────────────────────────────
// vi.mock is hoisted; vi.fn() is available inside the factory.
vi.mock('../plugins/capacitor', () => {
  const _store    = new Map();
  const _secStore = new Map();
  return {
    isNative: false,
    platform: 'web',
    storage: {
      get:    vi.fn(async (k)    => _store.get(k) ?? null),
      set:    vi.fn(async (k, v) => { _store.set(k, String(v)); }),
      remove: vi.fn(async (k)    => { _store.delete(k); }),
      clear:  vi.fn(async ()     => { _store.clear(); }),
    },
    secureStorage: {
      get:    vi.fn(async (k)    => _secStore.get(k) ?? null),
      set:    vi.fn(async (k, v) => { _secStore.set(k, String(v)); }),
      remove: vi.fn(async (k)    => { _secStore.delete(k); }),
      clear:  vi.fn(async ()     => { _secStore.clear(); }),
    },
    appLifecycle: {
      onPause:  vi.fn(async () => ({ remove: vi.fn() })),
      onResume: vi.fn(async () => ({ remove: vi.fn() })),
      getState: vi.fn(async () => ({ isActive: true })),
    },
    network: {
      getStatus:   vi.fn(async () => ({ connected: true, connectionType: 'wifi' })),
      addListener: vi.fn(async () => ({ remove: vi.fn() })),
    },
  };
});

// Import the mocked capacitor module so tests can configure return values
import { storage, secureStorage } from '../plugins/capacitor';

// ── Mock axios (used directly in useAuth for login/refresh calls) ─────────────
vi.mock('axios', () => ({
  default: {
    post: vi.fn(),
    get:  vi.fn(),
    create: vi.fn(() => ({
      interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
      post: vi.fn(),
      get:  vi.fn(),
    })),
  },
}));
import axios from 'axios';

// ── Mock apiClient — expose ALL named exports used by AuthProvider ─────────────
vi.mock('../api/client', () => ({
  default:             { post: vi.fn(async () => ({})), get: vi.fn(async () => ({})) },
  setAuthToken:        vi.fn(),
  clearAuthToken:      vi.fn(),
  setRefreshFunction:  vi.fn(),
}));
import { setAuthToken, clearAuthToken, setRefreshFunction } from '../api/client';

// ── Stub window.location (prevents jsdom navigation errors) ──────────────────
let originalLocation;
beforeAll(() => {
  originalLocation = window.location;
  delete window.location;
  window.location = { href: '', pathname: '/', assign: vi.fn() };
});
afterAll(() => { window.location = originalLocation; });

// ── Reset between tests ───────────────────────────────────────────────────────
beforeEach(() => {
  // resetAllMocks clears the mockOnce queue in addition to call history,
  // preventing stale queued values from leaking across tests.
  vi.resetAllMocks();
  window.location.href     = '';
  window.location.pathname = '/';
  // Default: no stored tokens
  secureStorage.get.mockResolvedValue(null);
  storage.get.mockResolvedValue(null);
  // Default: refresh call fails (no session) — individual tests override this
  axios.post.mockRejectedValue(new Error('no session'));
});

// ── Wrapper + render helper ───────────────────────────────────────────────────
const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;

async function renderAuth() {
  const result = renderHook(() => useAuth(), { wrapper });
  // Allow all async effects (restoreSession + lifecycle setup) to settle
  await act(async () => { await new Promise(r => setTimeout(r, 10)); });
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Initial state — no stored tokens
// ─────────────────────────────────────────────────────────────────────────────
describe('useAuth — initial state', () => {
  it('starts unauthenticated when no tokens are stored', async () => {
    const { result } = await renderAuth();
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.loading).toBe(false);
  });

  it('wires setRefreshFunction into apiClient on mount', async () => {
    await renderAuth();
    expect(setRefreshFunction).toHaveBeenCalledWith(expect.any(Function));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Session restore — refresh token present in secureStorage
// ─────────────────────────────────────────────────────────────────────────────
describe('useAuth — session restore', () => {
  it('restores user from cached profile when refresh succeeds', async () => {
    const cachedUser = { id: 1, email: 'state@test.com', role: 'STATE_OFFICIAL' };
    secureStorage.get.mockResolvedValue('stored-refresh-token');
    storage.get.mockResolvedValue(JSON.stringify(cachedUser));
    axios.post.mockResolvedValue({ data: { access_token: 'new-access-token' } });

    const { result } = await renderAuth();

    expect(result.current.user).toEqual(cachedUser);
    expect(result.current.isAuthenticated).toBe(true);
    expect(setAuthToken).toHaveBeenCalledWith('new-access-token');
  });

  it('stays unauthenticated when no refresh token is stored', async () => {
    secureStorage.get.mockResolvedValue(null);
    storage.get.mockResolvedValue(null);

    const { result } = await renderAuth();
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('clears user when the refresh call fails (expired token)', async () => {
    secureStorage.get.mockResolvedValue('expired-refresh');
    storage.get.mockResolvedValue(JSON.stringify({ id: 1, role: 'STATE_OFFICIAL' }));
    axios.post.mockRejectedValue(new Error('401 Unauthorized'));

    const { result } = await renderAuth();
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Login
// ─────────────────────────────────────────────────────────────────────────────
describe('useAuth — login', () => {
  it('successful login stores tokens, updates state, calls setAuthToken', async () => {
    const userData = { id: 1, email: 'state@test.com', role: 'STATE_OFFICIAL' };
    // restoreSession won't call axios.post when no refresh token is stored,
    // so only mock the login response.
    axios.post
      .mockResolvedValueOnce({
        data: {
          data: { access_token: 'jwt-access', refresh_token: 'jwt-refresh', user: userData },
        },
      });

    const { result } = await renderAuth();

    let loginResult;
    await act(async () => {
      loginResult = await result.current.login('state@test.com', 'pass');
    });

    expect(loginResult.success).toBe(true);
    expect(result.current.user).toEqual(userData);
    expect(result.current.isAuthenticated).toBe(true);
    expect(secureStorage.set).toHaveBeenCalledWith('wdc_refresh_token', 'jwt-refresh');
    expect(storage.set).toHaveBeenCalledWith('wdc_user_profile', JSON.stringify(userData));
    expect(setAuthToken).toHaveBeenCalledWith('jwt-access');
  });

  it('handles flat response format (no data envelope)', async () => {
    const userData = { id: 2, email: 'lga@test.com', role: 'LGA_COORDINATOR' };
    axios.post
      .mockResolvedValueOnce({
        data: { access_token: 'jwt-lga', refresh_token: 'ref-lga', user: userData },
      });

    const { result } = await renderAuth();
    await act(async () => { await result.current.login('lga@test.com', 'pass'); });

    expect(result.current.user).toEqual(userData);
  });

  it('sets error state and throws on login failure', async () => {
    const err = Object.assign(new Error('Invalid credentials'), {
      response: { data: { detail: 'Invalid email or password' } },
    });
    axios.post
      .mockRejectedValueOnce(err);  // login (restoreSession won't call axios — no refresh token)

    const { result } = await renderAuth();

    await act(async () => {
      await expect(result.current.login('bad@test.com', 'wrong')).rejects.toThrow();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.error).toBeTruthy();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Logout
// ─────────────────────────────────────────────────────────────────────────────
describe('useAuth — logout', () => {
  it('clears secureStorage, storage, Axios token, and React state', async () => {
    const userData = { id: 1, role: 'STATE_OFFICIAL' };
    secureStorage.get.mockResolvedValue('stored-refresh');
    storage.get.mockResolvedValue(JSON.stringify(userData));
    axios.post.mockResolvedValue({ data: { access_token: 'acc' } });

    const { result } = await renderAuth();
    expect(result.current.isAuthenticated).toBe(true);

    await act(async () => {
      result.current.logout();
      await new Promise(r => setTimeout(r, 10));
    });

    expect(secureStorage.remove).toHaveBeenCalledWith('wdc_refresh_token');
    expect(storage.remove).toHaveBeenCalledWith('wdc_user_profile');
    expect(clearAuthToken).toHaveBeenCalled();
    expect(result.current.user).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// hasRole
// ─────────────────────────────────────────────────────────────────────────────
describe('useAuth — hasRole', () => {
  beforeEach(() => {
    secureStorage.get.mockResolvedValue('rt');
    storage.get.mockResolvedValue(JSON.stringify({ id: 3, role: 'WDC_SECRETARY' }));
    axios.post.mockResolvedValue({ data: { access_token: 'tok' } });
  });

  it("returns true for the user's own role", async () => {
    const { result } = await renderAuth();
    expect(result.current.hasRole('WDC_SECRETARY')).toBe(true);
  });

  it('returns false for a different role', async () => {
    const { result } = await renderAuth();
    expect(result.current.hasRole('STATE_OFFICIAL')).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getDefaultRoute
// ─────────────────────────────────────────────────────────────────────────────
describe('useAuth — getDefaultRoute', () => {
  async function authAs(role) {
    secureStorage.get.mockResolvedValue('rt');
    storage.get.mockResolvedValue(JSON.stringify({ id: 1, role }));
    axios.post.mockResolvedValue({ data: { access_token: 'at' } });
    return renderAuth();
  }

  afterEach(() => { vi.clearAllMocks(); });

  it('returns /wdc for WDC_SECRETARY',   async () => {
    const { result } = await authAs('WDC_SECRETARY');
    expect(result.current.getDefaultRoute()).toBe('/wdc');
  });

  it('returns /lga for LGA_COORDINATOR', async () => {
    const { result } = await authAs('LGA_COORDINATOR');
    expect(result.current.getDefaultRoute()).toBe('/lga');
  });

  it('returns /state for STATE_OFFICIAL', async () => {
    const { result } = await authAs('STATE_OFFICIAL');
    expect(result.current.getDefaultRoute()).toBe('/state');
  });

  it('returns /login when no user', async () => {
    const { result } = await renderAuth();
    expect(result.current.getDefaultRoute()).toBe('/login');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// updateUser
// ─────────────────────────────────────────────────────────────────────────────
describe('useAuth — updateUser', () => {
  it('updates React state and persists to Capacitor storage', async () => {
    secureStorage.get.mockResolvedValue('rt');
    storage.get.mockResolvedValue(JSON.stringify({ id: 1, role: 'STATE_OFFICIAL', full_name: 'Old' }));
    axios.post.mockResolvedValue({ data: { access_token: 'at' } });

    const { result } = await renderAuth();
    const updated = { id: 1, role: 'STATE_OFFICIAL', full_name: 'New Name' };

    await act(async () => { await result.current.updateUser(updated); });

    expect(result.current.user.full_name).toBe('New Name');
    expect(storage.set).toHaveBeenCalledWith('wdc_user_profile', JSON.stringify(updated));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Guard: throws outside provider
// ─────────────────────────────────────────────────────────────────────────────
describe('useAuth — throws outside provider', () => {
  it('throws when used outside AuthProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useAuth())).toThrow('useAuth must be used within an AuthProvider');
    spy.mockRestore();
  });
});
