# Kaduna State WDC Digital Reporting System

Frontend for the Ward Development Committee (WDC) Digital Reporting System used by the Kaduna State Ministry of Health. Secretaries submit monthly health-system reports from the field; LGA Coordinators review them; State Officials track the whole state.

## Tech Stack

- **React 18** + **Vite 5** + **TailwindCSS** + **TanStack Query v5**
- **Capacitor 6** for the Android app (camera, microphone, network, secure storage)
- **Recharts** for analytics dashboards
- **lucide-react** for icons
- **PWA** via `vite-plugin-pwa` (web builds only)

## Features

- **Persistent auth** — JWT access token (memory) + refresh token (IndexedDB)
- **On-device OCR** — ML Kit (Android) with Tesseract.js fallback for web
- **Voice Assistant** — Android `SpeechRecognizer` (offline) with Web Speech API fallback; English + Hausa
- **Offline-first** — drafts auto-saved, submissions queued and synced on reconnect
- **Dynamic form config** — admins edit voice questions and OCR patterns per field
- **Animated splash** — branded loading overlay matches native splash

## Getting started

```bash
npm install
npm run dev          # local dev server (proxies /api → http://localhost:3000)
npm run build        # production web build
npm run test         # vitest unit suite
```

Set `VITE_API_BASE_URL` in `.env` to point at your backend (default: `http://localhost:3000/api`).

## Android (Capacitor)

```bash
npm run android:build    # build web, sync, open Android Studio
npm run android:preview  # build web, sync, run on connected device/emulator
npx cap sync             # re-sync without rebuilding
```

## Documentation

- [`UI_SPEC.md`](./UI_SPEC.md) — every route, page, component, form field
- [`BACKEND_CONTRACT.md`](./BACKEND_CONTRACT.md) — every API endpoint the frontend calls
