import '@testing-library/jest-dom';

// ── localStorage mock ─────────────────────────────────────────────────────────
const localStorageMock = (() => {
  let store = {};
  return {
    getItem:    (key)        => store[key] ?? null,
    setItem:    (key, value) => { store[key] = String(value); },
    removeItem: (key)        => { delete store[key]; },
    clear:      ()           => { store = {}; },
    get length()             { return Object.keys(store).length; },
    key:        (i)          => Object.keys(store)[i] ?? null,
  };
})();
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true });

// ── sessionStorage mock ───────────────────────────────────────────────────────
// Used by secureStorage fallback on web (stores auth tokens — cleared on session end).
const sessionStorageMock = (() => {
  let store = {};
  return {
    getItem:    (key)        => store[key] ?? null,
    setItem:    (key, value) => { store[key] = String(value); },
    removeItem: (key)        => { delete store[key]; },
    clear:      ()           => { store = {}; },
    get length()             { return Object.keys(store).length; },
    key:        (i)          => Object.keys(store)[i] ?? null,
  };
})();
Object.defineProperty(globalThis, 'sessionStorage', { value: sessionStorageMock, writable: true });

// ── crypto.randomUUID mock ────────────────────────────────────────────────────
if (!globalThis.crypto) {
  globalThis.crypto = {};
}
if (!globalThis.crypto.randomUUID) {
  globalThis.crypto.randomUUID = () =>
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
}

// ── Reset storage mocks between tests ────────────────────────────────────────
beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});
