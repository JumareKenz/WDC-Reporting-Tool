# Fix Mobile Device Connection Issue

## Problem
Metro bundler is connecting to `exp://127.0.0.1:8081` instead of your network IP `192.168.0.105:8081`, preventing other devices from connecting.

## ✅ SOLUTION - Follow These Steps:

### Step 1: Stop the Current App
If the app is running, press `Ctrl+C` to stop it.

### Step 2: Clear Expo Cache
```bash
cd C:\Users\INEWTON\KADWDC\mobile-app
rmdir /s /q .expo
rmdir /s /q node_modules\.cache
```

Or manually delete these folders:
- Delete `.expo` folder
- Delete `node_modules\.cache` folder (if it exists)

### Step 3: Start with LAN Flag
```bash
expo start --lan --clear
```

Or simply double-click: `START_MOBILE_APP.bat` (already updated with --lan flag)

### Step 4: Verify Connection
You should now see:
```
Metro waiting on exp://192.168.0.105:8081
```

Instead of:
```
Metro waiting on exp://127.0.0.1:8081  ❌
```

## Alternative Methods

### Method 1: Press 's' to Switch Connection Type
When the app is running:
1. Press `s` in the terminal
2. Select "Switch to LAN"
3. New QR code will appear with correct IP

### Method 2: Use Tunnel Mode (if LAN doesn't work)
```bash
expo start --tunnel
```
This creates a public URL that works anywhere (slower but more reliable)

### Method 3: Manual Configuration
1. Press `Shift+M` to open developer menu
2. Select connection type: LAN
3. Restart the bundler

## Verify Everything is Working

### Check 1: Terminal Output
You should see:
```
Metro waiting on exp://192.168.0.105:8081
```

### Check 2: QR Code URL
The QR code should point to:
```
exp://192.168.0.105:8081
```

### Check 3: Expo Go App
On your phone, Expo Go should show:
- Server: `192.168.0.105:8081` ✅

## Complete Restart Process

If still not working, do a complete restart:

### 1. Stop Everything
- Stop mobile app (Ctrl+C)
- Stop backend (Ctrl+C)

### 2. Clear All Caches
```bash
cd mobile-app
rmdir /s /q .expo
expo start --clear --lan
```

### 3. Restart Backend
```bash
cd backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 4. Start Mobile App
```bash
cd mobile-app
expo start --lan --clear
```

### 5. Scan QR Code Again
Use Expo Go app to scan the new QR code.

## Windows Firewall Check

If still not connecting, check Windows Firewall:

### Allow Node.js and Expo
1. Open Windows Defender Firewall
2. Click "Allow an app through firewall"
3. Find or add:
   - Node.js
   - Expo CLI
4. Check both "Private" and "Public" networks
5. Click OK

Or temporarily disable firewall to test:
```
Settings > Update & Security > Windows Security > Firewall & network protection
```

## Network Troubleshooting

### Verify Same WiFi Network
Both computer and phone must be on the same WiFi:
- Computer WiFi: `[Your Network Name]`
- Phone WiFi: `[Same Network Name]`

### Check IP Address
```bash
ipconfig
```
Look for "IPv4 Address" under your WiFi adapter.
If it's different from `192.168.0.105`, update:
- `mobile-app/src/utils/constants.js` (line 143)

### Test Network Connectivity
From your phone's browser, visit:
```
http://192.168.0.105:8081
```

You should see the Metro bundler page.

## Quick Fix Commands

### Option 1: LAN Mode (Recommended)
```bash
cd mobile-app
expo start --lan --clear
```

### Option 2: Tunnel Mode (Slower but works everywhere)
```bash
cd mobile-app
expo start --tunnel
```

### Option 3: Complete Reset
```bash
cd mobile-app
rmdir /s /q .expo
rmdir /s /q node_modules
npm install
expo start --lan --clear
```

## What Should Happen

After fixing, you'll see:

### Terminal Output:
```
Starting Metro Bundler
› Metro waiting on exp://192.168.0.105:8081  ✅
› Scan the QR code above with Expo Go (Android) or the Camera app (iOS)

› Press a │ open Android
› Press w │ open web
```

### Expo Go App:
- Shows your app name
- Server: `192.168.0.105:8081` ✅
- Status: Connected ✅

### After Scanning:
- App opens on your phone ✅
- Login screen appears ✅
- Can login with demo credentials ✅

## Still Not Working?

Try this step-by-step:

1. **Stop everything** (Ctrl+C on both terminals)

2. **Clear Expo cache:**
   ```bash
   cd mobile-app
   rmdir /s /q .expo
   ```

3. **Start backend:**
   ```bash
   cd backend
   python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

4. **In new terminal, start app with tunnel:**
   ```bash
   cd mobile-app
   expo start --tunnel
   ```

5. **Wait for tunnel URL** (takes 30-60 seconds)

6. **Scan new QR code**

Tunnel mode is slower but bypasses all network/firewall issues!

## Success Checklist

- ✅ Terminal shows: `exp://192.168.0.105:8081`
- ✅ QR code scans successfully
- ✅ Expo Go connects to server
- ✅ App loads on phone
- ✅ Login screen appears
- ✅ Can login with demo account
- ✅ Dashboard loads with data

If all checked, you're good to go! 🎉

## Files Updated

I've already updated these files for you:
- ✅ `package.json` - Added `--lan` flag to start script
- ✅ `START_MOBILE_APP.bat` - Now uses `expo start --lan --clear`
- ✅ `.expo/settings.json` - Configured for LAN mode

**Just run `START_MOBILE_APP.bat` and it should work!** 🚀
