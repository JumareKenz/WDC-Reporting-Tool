// User Roles
export const USER_ROLES = {
  WDC_SECRETARY: 'WDC_SECRETARY',
  LGA_COORDINATOR: 'LGA_COORDINATOR',
  STATE_OFFICIAL: 'STATE_OFFICIAL',
};

export const ROLE_LABELS = {
  [USER_ROLES.WDC_SECRETARY]: 'WDC Secretary',
  [USER_ROLES.LGA_COORDINATOR]: 'LGA Coordinator',
  [USER_ROLES.STATE_OFFICIAL]: 'State Official',
};

// Report Statuses
export const REPORT_STATUS = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  REVIEWED: 'REVIEWED',
  FLAGGED: 'FLAGGED',
};

export const STATUS_LABELS = {
  [REPORT_STATUS.DRAFT]: 'Draft',
  [REPORT_STATUS.SUBMITTED]: 'Submitted',
  [REPORT_STATUS.REVIEWED]: 'Reviewed',
  [REPORT_STATUS.FLAGGED]: 'Flagged',
};

// App Colors
export const COLORS = {
  primary: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    200: '#bae6fd',
    300: '#7dd3fc',
    400: '#38bdf8',
    500: '#0ea5e9',
    600: '#0284c7',
    700: '#0369a1',
    800: '#075985',
    900: '#0c4a6e',
  },
  neutral: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#e5e5e5',
    300: '#d4d4d4',
    400: '#a3a3a3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
  },
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
  },
  warning: {
    50: '#fefce8',
    100: '#fef9c3',
    500: '#eab308',
    600: '#ca8a04',
    700: '#a16207',
  },
  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
  },
  info: {
    50: '#eff6ff',
    100: '#dbeafe',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
  },
};

// Kaduna LGAs
export const KADUNA_LGAS = [
  { id: 1, name: 'Birnin Gwari' },
  { id: 2, name: 'Chikun' },
  { id: 3, name: 'Giwa' },
  { id: 4, name: 'Igabi' },
  { id: 5, name: 'Ikara' },
  { id: 6, name: 'Jaba' },
  { id: 7, name: "Jema'a" },
  { id: 8, name: 'Kachia' },
  { id: 9, name: 'Kaduna North' },
  { id: 10, name: 'Kaduna South' },
  { id: 11, name: 'Kagarko' },
  { id: 12, name: 'Kajuru' },
  { id: 13, name: 'Kaura' },
  { id: 14, name: 'Kauru' },
  { id: 15, name: 'Kubau' },
  { id: 16, name: 'Kudan' },
  { id: 17, name: 'Lere' },
  { id: 18, name: 'Makarfi' },
  { id: 19, name: 'Sabon Gari' },
  { id: 20, name: 'Sanga' },
  { id: 21, name: 'Soba' },
  { id: 22, name: 'Zangon Kataf' },
  { id: 23, name: 'Zaria' },
];

// Demo Credentials
export const DEMO_CREDENTIALS = [
  {
    email: 'wdc.chikun.barnawa@kaduna.gov.ng',
    password: 'demo123',
    role: USER_ROLES.WDC_SECRETARY,
    name: 'Amina Yusuf (WDC Secretary - Barnawa)',
  },
  {
    email: 'coord.chikun@kaduna.gov.ng',
    password: 'demo123',
    role: USER_ROLES.LGA_COORDINATOR,
    name: 'Ibrahim Suleiman (LGA Coordinator - Chikun)',
  },
  {
    email: 'state.official@kaduna.gov.ng',
    password: 'demo123',
    role: USER_ROLES.STATE_OFFICIAL,
    name: 'Dr. Fatima Abdullahi (State Official)',
  },
];

// App Configuration
export const APP_CONFIG = {
  APP_NAME: 'KADUNA STATE WDC',
  APP_SUBTITLE: 'Digital Reporting System',
  STATE_NAME: 'Kaduna State',
  COUNTRY: 'Nigeria',
  SUPPORT_EMAIL: 'support@kaduna.gov.ng',
  SUPPORT_PHONE: '+234 800 000 0000',
  // Change this to your backend API URL
  API_BASE_URL: 'http://192.168.0.105:8000/api',
};

// Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  USER_DATA: 'user_data',
};

// Notification Types
export const NOTIFICATION_TYPES = {
  REPORT_MISSING: 'REPORT_MISSING',
  REPORT_SUBMITTED: 'REPORT_SUBMITTED',
  REPORT_REVIEWED: 'REPORT_REVIEWED',
  FEEDBACK: 'FEEDBACK',
  REMINDER: 'REMINDER',
  SYSTEM: 'SYSTEM',
};

// Form Data
export const DONATION_ITEMS = [
  'Hospital beds', 'Mattresses', 'Medical equipment', 'Drugs/Medicines',
  'First aid supplies', 'Cleaning materials', 'Office furniture',
  'Generator/Power backup', 'Water supply equipment', 'Ambulance/Vehicle', 'Other',
];

export const REPAIR_ITEMS = [
  'Building/Roofing', 'Plumbing', 'Electrical', 'Medical equipment',
  'Furniture', 'Generator', 'Water pump', 'Fencing', 'Doors/Windows', 'Other',
];

export const MEETING_TYPES = ['Monthly', 'Emergency', 'Quarterly Town Hall'];
