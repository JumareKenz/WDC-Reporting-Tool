import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { Capacitor } from '@capacitor/core';

/**
 * Application entry point.
 *
 * Splash-screen strategy (native builds only):
 *   1. Show splash immediately (autoHide: false — we control dismissal).
 *   2. Mount React and wait for AuthProvider to fire 'wdc:auth-ready' once
 *      restoreSession() completes (success OR failure).
 *   3. Dismiss splash with a short fade.
 *   4. Safety timeout: always hide after SPLASH_MAX_MS even if auth hangs
 *      (e.g. network timeout on first launch).
 *
 * On web (PWA): render immediately — no splash needed.
 */

// Maximum time the splash is shown regardless of auth state.
// 3 s covers the worst-case cold-start on a budget Android device.
const SPLASH_MAX_MS = 3000;

async function initApp() {
  // ── One-time localStorage → Preferences migration (native only) ───────────
  // Must run before any hook tries to read from storage.
  try {
    const { migrateLegacyLocalStorage } = await import('./plugins/migrateLegacyStorage.js');
    await migrateLegacyLocalStorage();
  } catch (err) {
    console.warn('[init] Migration skipped:', err.message);
  }

  // ── Native-only: show splash and configure status bar ─────────────────────
  if (Capacitor.isNativePlatform()) {
    try {
      const [{ SplashScreen }, { StatusBar, Style }] = await Promise.all([
        import('@capacitor/splash-screen'),
        import('@capacitor/status-bar'),
      ]);
      // autoHide: false — we control when it disappears (see wdc:auth-ready below)
      await SplashScreen.show({ autoHide: false });
      await StatusBar.setStyle({ style: Style.Dark });
      await StatusBar.setBackgroundColor({ color: '#1F4031' });
    } catch (err) {
      // Non-fatal: plugins may not register on the very first cold start
      console.warn('[init] Native plugin init error:', err.message);
    }
  }

  // ── Mount React ───────────────────────────────────────────────────────────
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );

  // ── Hide both the native and HTML splash overlay when auth is ready ───────
  const hideHtmlSplash = () => {
    const el = document.getElementById('app-splash');
    if (el && !el.classList.contains('hide')) {
      el.classList.add('hide');
      // Remove from DOM after fade-out completes
      setTimeout(() => el.remove(), 700);
    }
  };

  const hideNativeSplash = async () => {
    if (!Capacitor.isNativePlatform()) return;
    try {
      const { SplashScreen } = await import('@capacitor/splash-screen');
      await SplashScreen.hide({ fadeOutDuration: 300 });
    } catch (err) {
      console.warn('[init] Could not hide splash screen:', err.message);
    }
  };

  const hideAllSplashes = () => {
    hideHtmlSplash();
    hideNativeSplash();
  };

  // AuthProvider dispatches this once restoreSession() settles
  const handleAuthReady = () => {
    clearTimeout(safetyTimer);
    hideAllSplashes();
  };
  window.addEventListener('wdc:auth-ready', handleAuthReady, { once: true });

  // Hard cap so the splash never lingers
  const safetyTimer = setTimeout(() => {
    window.removeEventListener('wdc:auth-ready', handleAuthReady);
    hideAllSplashes();
  }, SPLASH_MAX_MS);
}

initApp().catch(console.error);
