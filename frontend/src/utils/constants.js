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
  DECLINED: 'DECLINED',
};

export const STATUS_LABELS = {
  [REPORT_STATUS.DRAFT]: 'Draft',
  [REPORT_STATUS.SUBMITTED]: 'Submitted',
  [REPORT_STATUS.REVIEWED]: 'Approved',
  [REPORT_STATUS.FLAGGED]: 'Flagged',
  [REPORT_STATUS.DECLINED]: 'Declined',
};

export const STATUS_COLORS = {
  [REPORT_STATUS.DRAFT]: 'neutral',
  [REPORT_STATUS.SUBMITTED]: 'info',
  [REPORT_STATUS.REVIEWED]: 'success',
  [REPORT_STATUS.FLAGGED]: 'warning',
  [REPORT_STATUS.DECLINED]: 'error',
};

// Investigation Statuses
export const INVESTIGATION_STATUS = {
  OPEN: 'OPEN',
  IN_PROGRESS: 'IN_PROGRESS',
  CLOSED: 'CLOSED',
};

export const INVESTIGATION_LABELS = {
  [INVESTIGATION_STATUS.OPEN]: 'Open',
  [INVESTIGATION_STATUS.IN_PROGRESS]: 'In Progress',
  [INVESTIGATION_STATUS.CLOSED]: 'Closed',
};

// Investigation Priorities
export const INVESTIGATION_PRIORITY = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  URGENT: 'URGENT',
};

export const PRIORITY_LABELS = {
  [INVESTIGATION_PRIORITY.LOW]: 'Low',
  [INVESTIGATION_PRIORITY.MEDIUM]: 'Medium',
  [INVESTIGATION_PRIORITY.HIGH]: 'High',
  [INVESTIGATION_PRIORITY.URGENT]: 'Urgent',
};

export const PRIORITY_COLORS = {
  [INVESTIGATION_PRIORITY.LOW]: 'neutral',
  [INVESTIGATION_PRIORITY.MEDIUM]: 'info',
  [INVESTIGATION_PRIORITY.HIGH]: 'warning',
  [INVESTIGATION_PRIORITY.URGENT]: 'error',
};

// Investigation Types
export const INVESTIGATION_TYPES = {
  PERFORMANCE: 'PERFORMANCE',
  FINANCIAL: 'FINANCIAL',
  COMPLAINT: 'COMPLAINT',
  AUDIT: 'AUDIT',
  OTHER: 'OTHER',
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

// API Endpoints (relative to base URL)
export const API_ENDPOINTS = {
  // Auth
  LOGIN: '/auth/login',
  ME: '/auth/me',

  // Reports
  REPORTS: '/reports',
  REPORT_BY_ID: (id) => `/reports/${id}`,
  CHECK_SUBMITTED: '/reports/check-submitted',
  REVIEW_REPORT: (id) => `/reports/${id}/review`,
  AI_SUGGESTIONS: (id) => `/reports/${id}/ai-suggestions`,
  AI_SUGGESTIONS_ACCEPT: (id) => `/reports/${id}/ai-suggestions/accept`,

  // Voice Notes
  VOICE_NOTE_DOWNLOAD: (id) => `/voice-notes/${id}/download`,
  VOICE_NOTE_DELETE: (id) => `/voice-notes/${id}`,

  // LGA
  LGA_WARDS: (id) => `/lgas/${id}/wards`,
  LGA_REPORTS: (id) => `/lgas/${id}/reports`,
  LGA_MISSING_REPORTS: (id) => `/lgas/${id}/missing-reports`,
  LGAS: '/lgas',
  LGA_BY_ID: (id) => `/lgas/${id}`,

  // Wards
  WARD_BY_ID: (id) => `/wards/${id}`,

  // Notifications
  NOTIFICATIONS: '/notifications',
  NOTIFICATION_READ: (id) => `/notifications/${id}/read`,
  NOTIFICATIONS_MARK_ALL_READ: '/notifications/mark-all-read',
  NOTIFICATIONS_SEND: '/notifications/send',

  // Feedback
  FEEDBACK: '/feedback',
  FEEDBACK_READ: (id) => `/feedback/${id}/read`,

  // State Submissions
  STATE_SUBMISSIONS: '/reports/state-submissions',

  // Analytics (State)
  ANALYTICS_OVERVIEW: '/analytics/overview',
  ANALYTICS_LGA_COMPARISON: '/analytics/lga-comparison',
  ANALYTICS_TRENDS: '/analytics/trends',
  ANALYTICS_AI_REPORT: '/analytics/ai-report',

  // Investigations
  INVESTIGATIONS: '/investigations',
  INVESTIGATION_BY_ID: (id) => `/investigations/${id}`,

  // Forms
  FORMS: '/forms',
  FORMS_ACTIVE: '/forms/active',
  FORM_BY_ID: (id) => `/forms/${id}`,
  FORM_DEPLOY: (id) => `/forms/${id}/deploy`,

  // User Management
  USERS_SUMMARY: '/users/summary',
  USER_LGA_WARDS: (lgaId) => `/users/lga-wards/${lgaId}`,
  USER_COORDINATOR: (lgaId) => `/users/coordinator/${lgaId}`,
  USER_SECRETARY: (wardId) => `/users/secretary/${wardId}`,
  USER_BY_ID: (id) => `/users/${id}`,
  USER_PASSWORD: (id) => `/users/${id}/password`,
  USER_ACCESS: (id) => `/users/${id}/access`,
  USER_ASSIGN: '/users/assign',

  // Health
  HEALTH: '/health',
};

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

// File Upload
export const FILE_UPLOAD = {
  VOICE_NOTE_MAX_SIZE: 10 * 1024 * 1024, // 10MB
  VOICE_NOTE_FORMATS: ['.mp3', '.m4a', '.wav', '.ogg'],
  VOICE_NOTE_MIME_TYPES: ['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/ogg'],
};

// Pagination
export const PAGINATION = {
  DEFAULT_LIMIT: 10,
  DEFAULT_OFFSET: 0,
  MAX_LIMIT: 100,
};

// Local Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'token',
  USER_DATA: 'user',
};

// Date Formats
export const DATE_FORMATS = {
  DISPLAY: 'MMM DD, YYYY',
  DISPLAY_WITH_TIME: 'MMM DD, YYYY h:mm A',
  API: 'YYYY-MM-DD',
  MONTH: 'YYYY-MM',
  MONTH_DISPLAY: 'MMMM YYYY',
};

// App Configuration
export const APP_CONFIG = {
  APP_NAME: 'KADUNA STATE WDC',
  APP_SUBTITLE: 'Digital Reporting System',
  STATE_NAME: 'Kaduna State',
  COUNTRY: 'Nigeria',
  SUPPORT_EMAIL: 'support@kaduna.gov.ng',
  SUPPORT_PHONE: '+234 800 000 0000',
};

// Route Paths
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  WDC_DASHBOARD: '/wdc',
  LGA_DASHBOARD: '/lga',
  STATE_DASHBOARD: '/state',
  REPORT_DETAILS: '/reports/:id',
  PROFILE: '/profile',
  NOTIFICATIONS: '/notifications',
  STATE_FORMS: '/state/forms',
};

// Navigation Items by Role
export const NAV_ITEMS = {
  [USER_ROLES.WDC_SECRETARY]: [
    { path: ROUTES.WDC_DASHBOARD, label: 'Dashboard', icon: 'LayoutDashboard' },
    { path: ROUTES.NOTIFICATIONS, label: 'Notifications', icon: 'Bell' },
  ],
  [USER_ROLES.LGA_COORDINATOR]: [
    { path: ROUTES.LGA_DASHBOARD, label: 'Dashboard', icon: 'LayoutDashboard' },
    { path: ROUTES.NOTIFICATIONS, label: 'Notifications', icon: 'Bell' },
  ],
  [USER_ROLES.STATE_OFFICIAL]: [
    { path: ROUTES.STATE_DASHBOARD, label: 'Dashboard', icon: 'LayoutDashboard' },
    { path: ROUTES.NOTIFICATIONS, label: 'Notifications', icon: 'Bell' },
  ],
};
