# Mobile App Setup Instructions - READY TO GO! 🚀

## Your Configuration

✅ **Computer IP**: `192.168.0.105`
✅ **API URL**: `http://192.168.0.105:8000/api` (already configured!)
✅ **Backend CORS**: Already configured to accept mobile connections

## Step-by-Step Setup

### 1️⃣ Start the Backend Server

Open a terminal and run:

```bash
cd C:\Users\INEWTON\KADWDC\backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Important**: The `--host 0.0.0.0` flag allows connections from any device on your network!

You should see:
```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

### 2️⃣ Install Mobile App Dependencies

Open a **NEW** terminal and run:

```bash
cd C:\Users\INEWTON\KADWDC\mobile-app
npm install
```

This will install all required packages (React Native, Expo, etc.)

### 3️⃣ Start the Mobile App

In the same terminal:

```bash
npm start
```

You'll see a QR code and options like:
```
› Press a │ open Android
› Press i │ open iOS simulator
› Press w │ open web

› Press r │ reload app
› Press m │ toggle menu
```

### 4️⃣ Run the App

Choose one option:

#### Option A: Android Emulator
1. Make sure Android Studio is installed with an emulator
2. Press `a` in the terminal

#### Option B: iOS Simulator (Mac only)
1. Make sure Xcode is installed
2. Press `i` in the terminal

#### Option C: Physical Device (Recommended! 📱)
1. Install **Expo Go** app from:
   - Google Play Store (Android)
   - App Store (iOS)

2. **Android**: Open Expo Go and scan the QR code
3. **iOS**: Open Camera app and scan the QR code, then tap the notification

### 5️⃣ Login & Test

Use any of these demo accounts:

**WDC Secretary** (for submitting reports):
- Email: `wdc.chikun.barnawa@kaduna.gov.ng`
- Password: `demo123`

**LGA Coordinator** (for reviewing reports):
- Email: `coord.chikun@kaduna.gov.ng`
- Password: `demo123`

**State Official** (for analytics):
- Email: `state.official@kaduna.gov.ng`
- Password: `demo123`

## Testing Checklist

After login, test these features:

### WDC Secretary Role:
- ✅ View dashboard with statistics
- ✅ Tap "Submit" tab to create a report
- ✅ Record a voice note (tap microphone icon)
- ✅ Submit the report
- ✅ View report in "Reports" tab
- ✅ Check notifications

### LGA Coordinator Role:
- ✅ View dashboard with ward statistics
- ✅ Browse wards
- ✅ Review submitted reports
- ✅ Send messages

### State Official Role:
- ✅ View state-wide dashboard
- ✅ Check analytics
- ✅ Browse LGAs
- ✅ View investigations

## Troubleshooting

### "Network Error" or "Cannot connect"

1. **Verify backend is running**:
   - Open browser: http://192.168.0.105:8000/docs
   - You should see the API documentation

2. **Check firewall**:
   - Windows Firewall might be blocking port 8000
   - Add exception for Python or disable firewall temporarily

3. **Verify devices are on same WiFi**:
   - Computer and phone must be on the same network
   - Check WiFi network name on both devices

4. **Restart backend with correct host**:
   ```bash
   python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

### "Expo Go not loading"

1. Clear Expo cache:
   ```bash
   expo start --clear
   ```

2. Reinstall Expo Go app on your phone

3. Try scanning QR code again

### "Module not found" errors

```bash
cd mobile-app
rm -rf node_modules
npm install
expo start --clear
```

### Android Emulator Can't Connect

If using Android Emulator (not physical device):
1. Edit `src/utils/constants.js`
2. Change API_BASE_URL to: `http://10.0.2.2:8000/api`
3. Restart the app

## Network Setup

Make sure:
- ✅ Computer IP: `192.168.0.105`
- ✅ Backend running on: `http://0.0.0.0:8000`
- ✅ Mobile device connected to same WiFi
- ✅ Windows Firewall allows port 8000

## Test Backend Connection

From your phone's browser, visit:
```
http://192.168.0.105:8000/api/health
```

You should see: `{"status":"healthy"}`

If this works, the mobile app will work too! ✅

## Next Steps

1. ✅ Backend is running
2. ✅ Mobile app is running
3. ✅ Login with demo credentials
4. ✅ Test features:
   - Submit a report with voice notes
   - View dashboard statistics
   - Check notifications
   - Browse reports

## Support

If you encounter any issues:
1. Check backend terminal for errors
2. Check Expo terminal for errors
3. Verify IP address: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
4. Ensure firewall allows connections on port 8000

## Success Indicators

You'll know everything is working when:
- ✅ Backend shows: "Application startup complete"
- ✅ Expo shows QR code
- ✅ Mobile app opens and shows login screen
- ✅ Login succeeds with demo credentials
- ✅ Dashboard loads with data

---

**Your Configuration is READY! 🎉**

Just run:
1. `python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000` (in backend folder)
2. `npm start` (in mobile-app folder)
3. Scan QR code with Expo Go app
4. Login and enjoy! 🚀
