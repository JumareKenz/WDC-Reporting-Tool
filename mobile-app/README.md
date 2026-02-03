# KADUNA STATE WDC - Mobile App

A professional cross-platform mobile application for the Kaduna State Ward Development Committee (WDC) Digital Reporting System.

## Features

### Core Features
- **Multi-Role Authentication**: Supports WDC Secretaries, LGA Coordinators, and State Officials
- **Monthly Report Submission**: Comprehensive report forms with all fields from the web version
- **Voice Notes**: Native voice recording for all form fields
- **Real-time Notifications**: Push notifications for important updates
- **Offline Capabilities**: Secure local storage for authentication
- **Image Upload**: Support for attendance pictures and documents
- **Dashboard Analytics**: Role-based dashboards with statistics and charts
- **Report Management**: View, filter, and track all submitted reports
- **Messaging System**: Communication between different user roles

### User Roles

#### WDC Secretary
- Submit monthly reports with voice notes
- View submission history
- Receive notifications and feedback
- Track report status (Submitted, Reviewed, Flagged)

#### LGA Coordinator
- Monitor ward submissions
- Review reports from wards
- Send reminders to missing wards
- View analytics and statistics

#### State Official
- Statewide analytics dashboard
- LGA performance comparison
- Investigation management
- Comprehensive reporting tools

## Tech Stack

- **Framework**: React Native with Expo
- **Navigation**: React Navigation v6
- **State Management**: TanStack Query (React Query)
- **HTTP Client**: Axios
- **Secure Storage**: Expo Secure Store
- **Audio Recording**: Expo AV
- **File System**: Expo File System
- **Notifications**: Expo Notifications
- **UI Components**: Custom components with Ionicons
- **Date Handling**: date-fns

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (for Mac) or Android Emulator
- Physical device with Expo Go app (optional)

## Installation

### 1. Install Dependencies

```bash
cd mobile-app
npm install
```

### 2. Configure API Endpoint

Edit `src/utils/constants.js` and update the API_BASE_URL:

```javascript
export const APP_CONFIG = {
  // ... other config
  API_BASE_URL: 'http://YOUR_BACKEND_IP:8000/api', // Change this to your backend URL
};
```

For local development:
- iOS Simulator: `http://localhost:8000/api`
- Android Emulator: `http://10.0.2.2:8000/api`
- Physical Device: `http://YOUR_COMPUTER_IP:8000/api` (e.g., `http://192.168.1.100:8000/api`)

### 3. Start the Backend Server

Make sure the backend API is running:

```bash
cd ../backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 4. Start the Mobile App

```bash
cd ../mobile-app
npm start
```

## Running the App

### On iOS Simulator (Mac only)

```bash
npm run ios
```

### On Android Emulator

```bash
npm run android
```

### On Physical Device

1. Install Expo Go app from App Store (iOS) or Play Store (Android)
2. Run `npm start`
3. Scan the QR code with your device camera (iOS) or Expo Go app (Android)

## Demo Credentials

The app comes with pre-configured demo accounts:

### WDC Secretary
- Email: `wdc.chikun.barnawa@kaduna.gov.ng`
- Password: `demo123`

### LGA Coordinator
- Email: `coord.chikun@kaduna.gov.ng`
- Password: `demo123`

### State Official
- Email: `state.official@kaduna.gov.ng`
- Password: `demo123`

## Project Structure

```
mobile-app/
├── src/
│   ├── api/
│   │   └── client.js                 # API client configuration
│   ├── components/
│   │   ├── Alert.js                  # Alert component
│   │   ├── Badge.js                  # Status badge component
│   │   ├── Button.js                 # Reusable button component
│   │   ├── Card.js                   # Card components
│   │   ├── LoadingSpinner.js         # Loading indicator
│   │   ├── TextInput.js              # Text input with icons
│   │   └── VoiceRecorder.js          # Voice recording component
│   ├── contexts/
│   │   └── AuthContext.js            # Authentication context
│   ├── navigation/
│   │   └── AppNavigator.js           # Navigation configuration
│   ├── screens/
│   │   ├── wdc/
│   │   │   ├── WDCDashboardScreen.js
│   │   │   ├── SubmitReportScreen.js
│   │   │   └── MyReportsScreen.js
│   │   ├── lga/
│   │   │   ├── LGADashboardScreen.js
│   │   │   ├── LGAWardsScreen.js
│   │   │   └── LGAReportsScreen.js
│   │   ├── state/
│   │   │   ├── StateDashboardScreen.js
│   │   │   ├── StateAnalyticsScreen.js
│   │   │   ├── StateLGAsScreen.js
│   │   │   └── StateInvestigationsScreen.js
│   │   ├── LoginScreen.js
│   │   ├── LoadingScreen.js
│   │   ├── NotificationsScreen.js
│   │   ├── MessagesScreen.js
│   │   ├── SettingsScreen.js
│   │   └── ReportDetailsScreen.js
│   └── utils/
│       ├── constants.js              # App constants and config
│       └── formatters.js             # Utility functions
├── App.js                            # Main app entry point
├── app.json                          # Expo configuration
├── package.json                      # Dependencies
└── README.md                         # This file
```

## Key Features Implementation

### 1. Authentication
- Secure token storage using Expo Secure Store
- Automatic token injection in API requests
- Role-based navigation and access control

### 2. Report Submission
- Comprehensive multi-section forms
- Voice note recording for each field
- Image upload for attendance
- Real-time validation
- Progress tracking

### 3. Voice Recording
- Native audio recording using Expo AV
- Compact and full-size recorder modes
- Duration tracking
- Audio file attachment to reports

### 4. Offline Support
- Secure local authentication storage
- Automatic token refresh
- Network error handling

### 5. Push Notifications
- Real-time notifications for important events
- Background notification handling
- Deep linking to relevant screens

## Development

### Adding New Screens

1. Create screen file in `src/screens/`
2. Add route to `src/navigation/AppNavigator.js`
3. Import and configure in appropriate navigator

### Adding New API Endpoints

1. Add endpoint constant to `src/utils/constants.js`
2. Create API call function in appropriate hook or screen
3. Use TanStack Query for data fetching

### Styling

The app uses a consistent color system defined in `src/utils/constants.js`. Use the `COLORS` constant for all styling:

```javascript
import { COLORS } from '../utils/constants';

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.neutral[50],
  },
});
```

## Building for Production

### iOS

```bash
expo build:ios
```

### Android

```bash
expo build:android
```

Or use EAS Build (recommended):

```bash
npm install -g eas-cli
eas build --platform android
eas build --platform ios
```

## Troubleshooting

### Connection Issues

1. Ensure backend is running and accessible
2. Check API_BASE_URL in constants.js
3. For physical devices, ensure computer and device are on same network
4. For Android emulator, use `10.0.2.2` instead of `localhost`

### Build Issues

```bash
# Clear cache and reinstall
rm -rf node_modules
npm install
expo start --clear
```

### Voice Recording Issues

1. Ensure microphone permissions are granted
2. Check device settings for app permissions
3. Test on physical device (some simulators have limited audio support)

## Deployment

### App Store (iOS)

1. Create Apple Developer account
2. Configure app in App Store Connect
3. Build with EAS or Xcode
4. Submit for review

### Play Store (Android)

1. Create Google Play Developer account
2. Generate signed APK or AAB
3. Configure store listing
4. Submit for review

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## License

This project is proprietary software developed for Kaduna State Government.

## Support

For issues and support:
- Email: support@kaduna.gov.ng
- Phone: +234 800 000 0000

## Version History

### v1.0.0 (Current)
- Initial release
- Multi-role authentication
- Report submission with voice notes
- Dashboard analytics
- Notifications system
- Image upload support
- Offline capabilities

## Future Enhancements

- [ ] Complete implementation of all screens (LGA Wards, State Analytics, etc.)
- [ ] Offline form data persistence
- [ ] Advanced analytics charts
- [ ] PDF report generation
- [ ] Multiple language support
- [ ] Dark mode
- [ ] Biometric authentication
- [ ] In-app messaging with chat
- [ ] Report templates
- [ ] Bulk operations for LGA coordinators

---

Built with ❤️ for Kaduna State Ward Development Committees
