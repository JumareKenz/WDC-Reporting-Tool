import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { readFileSync } from 'node:fs'

// When VITE_BUILD_TARGET=native the PWA service worker is omitted and asset
// paths are made relative so Capacitor's Android WebView can resolve them.
const isNativeBuild = process.env.VITE_BUILD_TARGET === 'native';

// Inject package.json version at build time so useAppVersion can compare
// against the backend's /app/version endpoint.  Falls back to '0.0.0' in
// environments where the file is unavailable (e.g. Docker layer caching).
let APP_VERSION = '0.0.0';
try {
  const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url)));
  APP_VERSION = pkg.version ?? '0.0.0';
} catch { /* ignore */ }

export default defineConfig({
  // ── Build-time constants ──────────────────────────────────────────────────
  define: {
    // Exposed as import.meta.env.VITE_APP_VERSION inside the app
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(
      process.env.VITE_APP_VERSION ?? APP_VERSION
    ),
  },

  // ── Test configuration ────────────────────────────────────────────────────
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/tests/setup.js'],
    exclude: ['**/e2e/**', '**/node_modules/**'],
  },

  // Use '/' for web (Vercel), './' for Capacitor native builds
  base: process.env.VITE_BUILD_TARGET === 'native' ? './' : '/',

  // ── Plugins ───────────────────────────────────────────────────────────────
  plugins: [
    react(),

    // PWA plugin is only active for web builds.
    // In native builds (Capacitor), the service worker would conflict with the
    // Android WebView's own caching and offline handling.
    !isNativeBuild && VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.svg', 'icons/*.png', 'favicon.svg'],
      devOptions: {
        enabled: true,
        type: 'module',
      },
      manifest: {
        name: 'Kaduna WDC Reporting',
        short_name: 'WDC Reports',
        description: 'Kaduna State Ward Development Committee Digital Reporting System',
        theme_color: '#1F4438',
        background_color: '#1F4438',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/icons/apple-touch-icon.png',
            sizes: '180x180',
            type: 'image/png',
            purpose: 'any',
          },
        ],
      },
      workbox: {
        navigateFallback: 'index.html',
        // Pre-cache the app shell so all routes work offline
        globPatterns: ['**/*.{js,css,html,ico,svg,png,woff2}'],
        // The opencv.js chunk (~7.7MB) powers offline template OCR; precache it
        // so the reader works with no network. Raise the per-file precache cap.
        maximumFileSizeToCacheInBytes: 12 * 1024 * 1024,
        // Prevent caching auth/mutation endpoints that should never be served stale
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          // Static assets – long-lived cache
          {
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 30 * 24 * 60 * 60,
              },
            },
          },
          // Audio / voice notes
          {
            urlPattern: /\/voice-notes\/.+\/download/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'audio-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 7 * 24 * 60 * 60,
              },
            },
          },
          // Safe read-only GET API responses (LGAs, forms, profile, notifications)
          {
            urlPattern: ({ url, request }) =>
              request.method === 'GET' &&
              url.pathname.startsWith('/api') &&
              !url.pathname.includes('/auth/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 8,
              expiration: {
                maxEntries: 150,
                maxAgeSeconds: 15 * 60,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ].filter(Boolean), // Remove falsy entries (VitePWA returns false in native builds)

  // ── Dev server ────────────────────────────────────────────────────────────
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
