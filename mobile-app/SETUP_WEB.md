# Running Mobile App on Web

## Setup

The mobile app uses Expo which supports running on web browsers for testing.

### Step 1: Install Web Dependencies

```bash
cd mobile-app
npm install react-native-web react-dom @expo/webpack-config
```

### Step 2: Update App.json for Web

Add web configuration to app.json:

```json
{
  "expo": {
    "platforms": ["ios", "android", "web"],
    "web": {
      "bundler": "webpack",
      "output": "single"
    }
  }
}
```

### Step 3: Start Web Version

```bash
npm run web
```

Or directly:

```bash
npx expo start --web
```

### Step 4: Access from Browser

The web app will open at: http://localhost:19006

To access from phone on same network:
- Find your computer's IP: `ipconfig`
- On phone browser: `http://YOUR_IP:19006`

## Important Notes

### Limitations on Web

Some native features won't work on web:
- SecureStore (uses localStorage fallback)
- Voice recording (needs MediaRecorder API)
- File system access (limited)
- Push notifications (not supported)

### API Connection

The API URL in `src/utils/constants.js` is already set to:
```javascript
API_BASE_URL: 'http://192.168.0.105:8000/api'
```

Make sure your backend is running with `--host 0.0.0.0` to accept connections.

### CORS

The backend CORS is already configured to allow all origins for development.

## Troubleshooting

### Metro Bundler Issues

If you get bundler errors, clear the cache:
```bash
npx expo start --web --clear
```

### Module Not Found

If you see "Module not found" errors, reinstall dependencies:
```bash
rm -rf node_modules package-lock.json
npm install
```

### Port Already in Use

If port 19006 is in use, Expo will suggest an alternative port.
