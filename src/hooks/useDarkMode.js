import { useCallback } from 'react';

export function useDarkMode() {
  // Dark mode disabled — always light
  if (typeof document !== 'undefined') {
    document.documentElement.classList.remove('dark');
  }

  const toggle = useCallback(() => {}, []);

  return { isDark: false, toggle };
}
