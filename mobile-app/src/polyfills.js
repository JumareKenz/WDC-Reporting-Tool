/**
 * Polyfills for web compatibility
 */

// Polyfill for process
if (typeof window !== 'undefined' && !window.process) {
  window.process = {
    env: { NODE_ENV: 'development' },
    version: '',
    platform: 'web',
  };
}

// Polyfill for global
if (typeof window !== 'undefined' && !window.global) {
  window.global = window;
}

// Polyfill for Buffer
if (typeof window !== 'undefined' && !window.Buffer) {
  window.Buffer = {
    from: (data) => data,
    isBuffer: () => false,
  };
}

// Ensure __DEV__ is defined
if (typeof __DEV__ === 'undefined') {
  window.__DEV__ = true;
}

console.log('Polyfills loaded');
