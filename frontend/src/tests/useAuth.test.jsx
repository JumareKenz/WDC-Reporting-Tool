/**
 * Unit tests — src/hooks/useAuth.jsx
 * Tests the AuthProvider context: login, logout, hasRole, getDefaultRoute,
 * updateUser, and init-from-localStorage behaviour.
 */
import { renderHook, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../hooks/useAuth';

// ---------------------------------------------------------------------------
// Mock apiClient — fns defined inside factory to avoid hoisting issues
// ---------------------------------------------------------------------------
vi.mock('../api/client', () => ({
  default: {
    post: vi.fn(() => Promise.resolve({})),
    get: vi.fn(() => Promise.resolve({})),
  },
}));

import apiClient from '../api/client';
const mockPost = apiClient.post;
const mockGet = apiClient.get;

// ---------------------------------------------------------------------------
// Stub window.location.href to prevent jsdom navigation errors
// ---------------------------------------------------------------------------
let originalLocation;
beforeAll(() => {
  originalLocation = window.location;
  delete window.location;
  window.location = { href: '', pathname: '/', assign: vi.fn() };
});
afterAll(() => {
  window.location = originalLocation;
});

// ---------------------------------------------------------------------------
// Wrapper that provides AuthContext
// ---------------------------------------------------------------------------
const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;

// ---------------------------------------------------------------------------
// Helper: render the hook inside the provider, wait for effects
// ---------------------------------------------------------------------------
async function renderAuth() {
  const result = renderHook(() => useAuth(), { wrapper });
  await act(async () => {});
  return result;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('useAuth — initial state', () => {
  beforeEach(() => {
    localStorage.clear();
    window.location.href = '';
    mockPost.mockClear();
    mockGet.mockClear();
  });

  it('starts with no user when localStorage is empty', async () => {
    const { result } = await renderAuth();
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('restores user from localStorage on mount', async () => {
    const storedUser = { id: 3, email: 'wdc@test.com', role: 'WDC_SECRETARY' };
    localStorage.setItem('token', 'fake-jwt');
    localStorage.setItem('user', JSON.stringify(storedUser));

    const { result } = await renderAuth();

    expect(result.current.user).toEqual(storedUser);
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('clears state if stored user JSON is corrupt', async () => {
    localStorage.setItem('token', 'fake-jwt');
    localStorage.setItem('user', '{not-valid-json}');

    const { result } = await renderAuth();

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });
});

describe('useAuth — login', () => {
  beforeEach(() => {
    localStorage.clear();
    window.location.href = '';
    mockPost.mockClear();
  });

  it('successful login sets user and stores token', async () => {
    const userData = { id: 1, email: 'state@test.com', role: 'STATE_OFFICIAL' };
    mockPost.mockResolvedValue({
      data: { access_token: 'jwt-abc', user: userData },
    });

    const { result } = await renderAuth();

    let loginResult;
    await act(async () => {
      loginResult = await result.current.login('state@test.com', 'pass');
    });

    expect(loginResult.success).toBe(true);
    expect(result.current.user).toEqual(userData);
    expect(result.current.isAuthenticated).toBe(true);
    expect(localStorage.getItem('token')).toBe('jwt-abc');
  });

  it('login handles unwrapped response format', async () => {
    const userData = { id: 2, email: 'lga@test.com', role: 'LGA_COORDINATOR' };
    mockPost.mockResolvedValue({ access_token: 'jwt-xyz', user: userData });

    const { result } = await renderAuth();

    await act(async () => {
      await result.current.login('lga@test.com', 'pass');
    });

    expect(result.current.user).toEqual(userData);
  });

  it('login failure sets error and throws', async () => {
    mockPost.mockRejectedValue(new Error('Invalid credentials'));

    const { result } = await renderAuth();

    await act(async () => {
      await expect(result.current.login('bad@test.com', 'wrong')).rejects.toThrow('Invalid credentials');
    });

    expect(result.current.error).toBe('Invalid credentials');
    expect(result.current.user).toBeNull();
  });
});

describe('useAuth — logout', () => {
  beforeEach(() => {
    localStorage.setItem('token', 'jwt-token');
    localStorage.setItem('user', JSON.stringify({ id: 1, role: 'STATE_OFFICIAL' }));
    window.location.href = '';
  });

  it('logout clears localStorage and user state', async () => {
    const { result } = await renderAuth();
    expect(result.current.isAuthenticated).toBe(true);

    act(() => {
      result.current.logout();
    });

    expect(result.current.user).toBeNull();
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
    expect(window.location.href).toBe('/login');
  });
});

describe('useAuth — hasRole', () => {
  beforeEach(() => {
    localStorage.setItem('token', 'jwt');
    localStorage.setItem('user', JSON.stringify({ id: 3, role: 'WDC_SECRETARY' }));
  });

  it('hasRole returns true for matching role', async () => {
    const { result } = await renderAuth();
    expect(result.current.hasRole('WDC_SECRETARY')).toBe(true);
  });

  it('hasRole returns false for non-matching role', async () => {
    const { result } = await renderAuth();
    expect(result.current.hasRole('STATE_OFFICIAL')).toBe(false);
  });
});

describe('useAuth — getDefaultRoute', () => {
  afterEach(() => localStorage.clear());

  it('returns /wdc for WDC_SECRETARY', async () => {
    localStorage.setItem('token', 'jwt');
    localStorage.setItem('user', JSON.stringify({ id: 3, role: 'WDC_SECRETARY' }));
    const { result } = await renderAuth();
    expect(result.current.getDefaultRoute()).toBe('/wdc');
  });

  it('returns /lga for LGA_COORDINATOR', async () => {
    localStorage.setItem('token', 'jwt');
    localStorage.setItem('user', JSON.stringify({ id: 2, role: 'LGA_COORDINATOR' }));
    const { result } = await renderAuth();
    expect(result.current.getDefaultRoute()).toBe('/lga');
  });

  it('returns /state for STATE_OFFICIAL', async () => {
    localStorage.setItem('token', 'jwt');
    localStorage.setItem('user', JSON.stringify({ id: 1, role: 'STATE_OFFICIAL' }));
    const { result } = await renderAuth();
    expect(result.current.getDefaultRoute()).toBe('/state');
  });

  it('returns /login when no user', async () => {
    const { result } = await renderAuth();
    expect(result.current.getDefaultRoute()).toBe('/login');
  });
});

describe('useAuth — updateUser', () => {
  beforeEach(() => {
    localStorage.setItem('token', 'jwt');
    localStorage.setItem('user', JSON.stringify({ id: 1, role: 'STATE_OFFICIAL', full_name: 'Old' }));
  });

  it('updateUser changes user state and persists to localStorage', async () => {
    const { result } = await renderAuth();

    const updated = { id: 1, role: 'STATE_OFFICIAL', full_name: 'New Name' };
    act(() => {
      result.current.updateUser(updated);
    });

    expect(result.current.user.full_name).toBe('New Name');
    expect(JSON.parse(localStorage.getItem('user')).full_name).toBe('New Name');
  });
});

describe('useAuth — throws outside provider', () => {
  it('useAuth throws when used outside AuthProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useAuth())).toThrow('useAuth must be used within an AuthProvider');
    spy.mockRestore();
  });
});
