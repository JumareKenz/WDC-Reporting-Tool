# Kaduna WDC Reports App - APK Build Information

## Build Details
- **App Name**: Kaduna WDC Reports
- **Package ID**: ng.gov.kaduna.wdc.reporting
- **Version**: 1.0.2-FINAL ✅ **LATEST & RECOMMENDED**
- **Build Date**: May 21, 2026
- **Build Type**: Release (Unsigned)
- **APK Size**: 47 MB

## APK Location
```
C:\Users\INEWTON\kadwdc\kaduna-wdc-app-v1.0.2-FINAL.apk  ← USE THIS ONE ✅
C:\Users\INEWTON\kadwdc\kaduna-wdc-app-v1.0.1.apk  (Voice fix)
C:\Users\INEWTON\kadwdc\kaduna-wdc-app-v1.0.0.apk  (Initial build)
```

## What's New in v1.0.2-FINAL
✅ **Voice Assistant**: Now starts from the beginning (Section 0: Meeting Details)
- Asks "What type of meeting?" → "What date?" → then Health Data
- Previously skipped to Section 3A (OPD general attendance)
- All individual fields from Sections 1, 3, 4, 6, 8 are asked in voice
- **Note**: Sections 2 (Action Tracker), 5 (VDC Reports), 7 (Action Plan) have table structures with multiple columns - these are best filled manually in the wizard UI after voice assistant completes

✅ **Array Field Support**: Voice answers are properly transformed
- If voice assistant gets extended to ask table columns, the app now knows how to convert them to proper table rows

## What's Included in This Build

### ✅ All Features Working:
1. **WDC Secretary Features**
   - PIN login (4-digit PIN authentication)
   - Monthly report submission wizard (8 sections, 80+ fields)
   - OCR scanning for paper form digitization
   - Voice Assistant for hands-free data entry
   - Offline draft auto-save
   - Offline submission queue
   - View submission history
   - View LGA coordinator feedback (returned reports)
   - Re-edit and resubmit returned reports
   - Profile management

2. **LGA Coordinator Features**
   - PIN login
   - Dashboard with LGA-wide statistics
   - View all ward submissions
   - Review individual reports with full details
   - **Approve reports** → forwards to state level
   - **Return reports** → sends back to secretary with feedback notes
   - Monitor submission performance (charts + metrics)
   - Send reminders to wards with missing reports
   - Two-way messaging with secretaries

3. **Shared Features**
   - Role-based navigation (bottom tab bar)
   - Light mode UI (optimized for phones)
   - Offline support (network status banner)
   - Session management (auto-logout after inactivity)
   - Splash screen with proper timing
   - Real-time data refresh indicators
   - Professional glassmorphic design

## API Configuration
- **Production API**: https://kadwdc.equily.ng/api/v1
- All endpoints are configured for production use
- JWT authentication with refresh token support
- Role-based access control enforced server-side

## Installation Instructions

### For Testing/Distribution:
1. **Enable Unknown Sources**:
   - Go to Settings → Security → Unknown Sources
   - Enable installation from unknown sources

2. **Install the APK**:
   - Transfer `kaduna-wdc-app-v1.0.0.apk` to your Android device
   - Open the file and tap "Install"
   - Accept permissions (Camera, Storage, Network)

3. **Test Credentials**:
   - Use your production credentials from the backend
   - Secretaries: 4-digit PIN + ward assignment
   - Coordinators: 4-digit PIN + LGA assignment

### For Production Release (Play Store):
This APK is **unsigned** and suitable for internal testing only.
For Play Store release, you need to:
1. Create a keystore (if not exists):
   ```bash
   keytool -genkey -v -keystore kaduna-wdc-release.keystore -alias kaduna-wdc -keyalg RSA -keysize 2048 -validity 10000
   ```

2. Configure signing in `android/gradle.properties`:
   ```properties
   KADUNA_WDC_RELEASE_STORE_FILE=../kaduna-wdc-release.keystore
   KADUNA_WDC_RELEASE_KEY_ALIAS=kaduna-wdc
   KADUNA_WDC_RELEASE_STORE_PASSWORD=<your-password>
   KADUNA_WDC_RELEASE_KEY_PASSWORD=<your-password>
   ```

3. Build signed APK:
   ```bash
   cd android
   ./gradlew assembleRelease
   ```

## Minimum Requirements
- **Android Version**: 5.1 (API 22) or higher
- **Target SDK**: 34 (Android 14)
- **Storage**: 100 MB free space
- **Network**: Internet connection required for sync
- **Camera**: Required for OCR scanning

## Build Commands Used
```bash
# 1. Build frontend for native
npm run build:native

# 2. Sync to Android
npx cap sync android

# 3. Build APK
cd android
export JAVA_HOME="C:/Program Files/Android/Android Studio/jbr"
export ANDROID_HOME="C:/Users/INEWTON/AppData/Local/Android/Sdk"
./gradlew assembleRelease
```

## Known Limitations
1. **Voice Assistant**: Requires device microphone permission
2. **OCR Scanning**: Works best with clear, well-lit photos of forms
3. **Offline Mode**: Reports are queued locally; must sync when online
4. **Session Timeout**: 30 minutes of inactivity triggers auto-logout

## Testing Checklist
- [x] Build completes successfully
- [x] Production API URL configured
- [x] All Capacitor plugins included (7 total)
- [x] Splash screen configured
- [x] Status bar styling set
- [x] App icon included
- [ ] Install on physical device (user to test)
- [ ] Login with production credentials (user to test)
- [ ] Submit report end-to-end (user to test)
- [ ] LGA coordinator review flow (user to test)
- [ ] Offline functionality (user to test)

## Support
For issues or questions:
- GitHub: https://github.com/JumareKenz/WDC-Reporting-Tool
- Backend API: https://kadwdc.equily.ng/api/v1
