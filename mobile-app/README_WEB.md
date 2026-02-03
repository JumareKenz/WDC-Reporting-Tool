# Kaduna WDC Mobile App - Web Version

This mobile app can also run in a web browser for testing purposes.

## Quick Start

### Option 1: Run Web Version (Easiest)

Double-click **`START_WEB.bat`** or run:

```bash
cd mobile-app
npm run web
```

Then open: http://localhost:19006

### Option 2: For Phone Testing

1. Start web version:
   ```bash
   cd mobile-app
   npm run web
   ```

2. Find your computer's IP:
   ```bash
   ipconfig
   ```

3. On your phone browser, go to:
   ```
   http://YOUR_IP:19006
   ```

## Features on Web

✅ **Working:**
- Login/Authentication
- Dashboard navigation
- Form submissions (all sections)
- Report history
- Profile management
- Notifications display

⚠️ **Limited:**
- Secure storage (uses localStorage fallback)
- Voice recording (may need manual file upload)
- Camera access (file picker instead)
- Offline sync (browser dependent)

❌ **Not Available:**
- Push notifications
- Native sharing
- Background sync

## Demo Credentials

Use these to test:

**WDC Secretary:**
- Email: `wdc.chikun.barnawa@kaduna.gov.ng`
- Password: `demo123`

**LGA Coordinator:**
- Email: `coord.chikun@kaduna.gov.ng`
- Password: `demo123`

**State Official:**
- Email: `state.official@kaduna.gov.ng`
- Password: `demo123`

## Troubleshooting

### White Screen / Not Loading

1. Clear browser cache (Ctrl+Shift+R)
2. Check console for errors (F12)
3. Ensure backend is running:
   ```bash
   cd backend
   uvicorn app.main:app --host 0.0.0.0 --port 8000
   ```

### CORS Errors

Backend CORS is already configured. If you see CORS errors:
1. Check backend is running on `0.0.0.0`
2. Verify `API_BASE_URL` in `src/utils/constants.js`
3. Ensure firewall allows port 8000

### Module Not Found Errors

Clear Metro bundler cache:
```bash
npx expo start --web --clear
```

### Port Already in Use

Expo will automatically suggest an alternative port.

## Comparing PWA vs Mobile App Web

| Feature | PWA (pwa/) | Mobile App Web (mobile-app/) |
|---------|------------|------------------------------|
| **Size** | ~200KB | ~5MB+ |
| **Load Time** | Instant | 10-30s |
| **Offline** | Full support | Limited |
| **Bundle** | Simple JS | Complex webpack |
| **Forms** | Comprehensive | Comprehensive |
| **Best For** | Production | Development/Testing |

## Recommendation

For **production deployment** to WDC secretaries in rural areas, use the **PWA version** (`pwa/` directory):
- Faster loading
- Better offline support
- Smaller bundle size
- Easier updates

For **development and testing**, use the **Mobile App Web version** (`mobile-app/` directory):
- Same codebase as native apps
- Easier to maintain consistency
- More features for debugging

## Backend Connection

Both versions connect to the same backend:
```
http://192.168.0.105:8000/api
```

Make sure the backend is started with:
```bash
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000
```
