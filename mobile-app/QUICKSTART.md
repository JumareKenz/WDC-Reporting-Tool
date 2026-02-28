# Quick Start Guide - KADUNA WDC Mobile App

## Get Started in 5 Minutes

### Step 1: Install Dependencies

```bash
cd mobile-app
npm install
```

### Step 2: Update API URL

Edit `src/utils/constants.js` line 66:

```javascript
// Change this line:
API_BASE_URL: 'http://localhost:8000/api',

// To your backend IP (find it using ipconfig on Windows or ifconfig on Mac/Linux):
API_BASE_URL: 'http://192.168.1.100:8000/api',  // Use your actual IP
```

### Step 3: Start Backend

In a separate terminal:

```bash
cd backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Step 4: Start Mobile App

```bash
cd mobile-app
npm start
```

### Step 5: Run on Device

Choose one:
- Press `i` for iOS Simulator (Mac only)
- Press `a` for Android Emulator
- Scan QR code with Expo Go app on your phone

### Step 6: Login

Use any demo account:
- **WDC Secretary**: `wdc.chikun.barnawa@kaduna.gov.ng` / `demo123`
- **LGA Coordinator**: `coord.chikun@kaduna.gov.ng` / `demo123`
- **State Official**: `state.official@kaduna.gov.ng` / `demo123`

## Common Issues

### "Network Error"
- Check backend is running on port 8000
- Update API_BASE_URL with correct IP
- Ensure device and computer are on same WiFi

### "Cannot find module"
- Run `npm install` again
- Clear cache: `expo start --clear`

### Android Emulator Can't Connect
- Use `http://10.0.2.2:8000/api` instead of localhost

## What's Next?

1. Explore the dashboard for your role
2. Submit a test report (WDC Secretary role)
3. Review reports (LGA Coordinator role)
4. View analytics (State Official role)

## Need Help?

Check the full README.md for detailed documentation.
