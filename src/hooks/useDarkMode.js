/**
 * useDarkMode
 *
 * Manages the dark/light mode preference for the app.
 *
 * Priority order (highest → lowest):
 *   1. User's saved choice in localStorage ('dark' | 'light')
 *   2. OS / browser prefers-color-scheme (auto-detected on first visit)
 *
 * Applies the `dark` class to <html> so Tailwind's darkMode:'class' strategy
 * picks it up across every component in the tree.
 */

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'wdc_color_scheme';

function getInitialMode() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'dark' || saved === 'light') return saved === 'dark';
  } catch { /* localStorage unavailable */ }
  // Fall back to OS preference
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function applyMode(isDark) {
  document.documentElement.classList.toggle('dark', isDark);
}

export function useDarkMode() {
  const [isDark, setIsDark] = useState(() => {
    const initial = getInitialMode();
    // Apply immediately so there's no flash before first render
    applyMode(initial);
    return initial;
  });

  // Keep <html> class and localStorage in sync whenever state changes
  useEffect(() => {
    applyMode(isDark);
    try {
      localStorage.setItem(STORAGE_KEY, isDark ? 'dark' : 'light');
    } catch { /* ignore */ }
  }, [isDark]);

  // Also follow OS changes if the user hasn't saved an explicit preference
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handleOsChange = (e) => {
      try {
        if (!localStorage.getItem(STORAGE_KEY)) setIsDark(e.matches);
      } catch { setIsDark(e.matches); }
    };
    mq.addEventListener('change', handleOsChange);
    return () => mq.removeEventListener('change', handleOsChange);
  }, []);

  const toggle = useCallback(() => setIsDark((d) => !d), []);

  return { isDark, toggle };
}
