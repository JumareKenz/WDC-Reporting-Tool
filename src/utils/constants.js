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

// Report Statuses — must match backend op-log state machine.
// Legacy aliases (REVIEWED/FLAGGED/DECLINED) are kept so older screens keep
// rendering correctly while their copy is migrated to APPROVED/RETURNED.
export const REPORT_STATUS = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  IN_REVIEW: 'in_review',
  APPROVED: 'approved',
  RETURNED: 'returned',
  SEALED: 'sealed',
  // Aliases
  REVIEWED: 'approved',
  FLAGGED: 'returned',
  DECLINED: 'returned',
};

export const STATUS_LABELS = {
  [REPORT_STATUS.DRAFT]: 'Draft',
  [REPORT_STATUS.SUBMITTED]: 'Submitted',
  [REPORT_STATUS.IN_REVIEW]: 'In Review',
  [REPORT_STATUS.APPROVED]: 'Approved',
  [REPORT_STATUS.RETURNED]: 'Returned',
  [REPORT_STATUS.SEALED]: 'Sealed',
};

export const STATUS_COLORS = {
  [REPORT_STATUS.DRAFT]: 'neutral',
  [REPORT_STATUS.SUBMITTED]: 'info',
  [REPORT_STATUS.IN_REVIEW]: 'info',
  [REPORT_STATUS.APPROVED]: 'success',
  [REPORT_STATUS.RETURNED]: 'warning',
  [REPORT_STATUS.SEALED]: 'neutral',
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

// API Endpoints — all relative to /api/v1, must match backend contract
export const API_ENDPOINTS = {
  // Auth
  SIGN_IN_MOBILE: '/auth/sign-in/mobile',
  SIGN_IN_CONSOLE: '/auth/sign-in/console',
  ENROL: '/auth/enrol',
  REFRESH: '/auth/refresh',
  SET_CREDENTIALS: '/auth/set-credentials',
  SIGN_OUT: '/auth/sign-out',

  // Geography
  LGAS: '/lgas',
  LGA_WARDS: (lgaId) => `/lgas/${lgaId}/wards`,

  // Reports (op-log model)
  REPORTS: '/reports',
  REPORT_BY_ID: (id) => `/reports/${id}`,
  REPORT_OPS: (id) => `/reports/${id}/ops`,
  REPORT_FIELDS: (id) => `/reports/${id}/fields`,
  REPORT_SUBMIT: (id) => `/reports/${id}/submit`,
  REPORT_OPEN_REVIEW: (id) => `/reports/${id}/open-review`,
  REPORT_APPROVE: (id) => `/reports/${id}/approve`,
  REPORT_RETURN: (id) => `/reports/${id}/return`,
  REPORT_EDIT_RETURNED: (id) => `/reports/${id}/edit-returned`,
  REPORTS_SEAL_DUE: '/reports/seal-due',

  // Attachments
  ATTACHMENTS_UPLOAD: '/attachments/upload',
  ATTACHMENTS_BY_REPORT: (reportId) => `/attachments/report/${reportId}`,

  // Forms
  FORMS: '/forms',
  FORMS_VISIBLE: '/forms/visible',
  FORM_BY_ID: (id) => `/forms/${id}`,
  FORM_DEPLOY: (id) => `/forms/${id}/deploy`,
  FORM_ARCHIVE: (id) => `/forms/${id}/archive`,
  FORM_VERSIONS: (id) => `/forms/${id}/versions`,
  FORM_VERSION_BY_N: (id, n) => `/forms/${id}/versions/${n}`,

  // Users
  USERS: '/users',
  USER_BY_ID: (id) => `/users/${id}`,
  USER_ASSIGNMENT: (id) => `/users/${id}/assignment`,
  USER_SUSPEND: (id) => `/users/${id}/suspend`,
  USER_REACTIVATE: (id) => `/users/${id}/reactivate`,

  // Messages (replaces notifications/feedback)
  MESSAGES_BROADCAST: '/messages/broadcast',
  MESSAGE_DELIVERIES: '/messages/deliveries',
  MESSAGE_DELIVERY_BY_ID: (id) => `/messages/deliveries/${id}`,
  MESSAGE_DELIVERY_READ: (id) => `/messages/deliveries/${id}/read`,

  // Investigations (director only)
  INVESTIGATIONS: '/investigations',
  INVESTIGATION_BY_ID: (id) => `/investigations/${id}`,
  INVESTIGATION_CLOSE: (id) => `/investigations/${id}/close`,
  INVESTIGATION_REOPEN: (id) => `/investigations/${id}/reopen`,
  INVESTIGATION_EVIDENCE: (id) => `/investigations/${id}/evidence`,
  INVESTIGATION_EVIDENCE_DEL: (id, evId) => `/investigations/${id}/evidence/${evId}`,
  INVESTIGATION_TIMELINE: (id) => `/investigations/${id}/timeline`,

  // Sync (offline-first batch)
  SYNC_BATCH: '/sync/batch',

  // AI
  AI_ASK: '/ai/ask',

  // Audit (director/system)
  AUDIT_ANCHOR: '/audit/anchor',
  AUDIT_ANCHORS: '/audit/anchors',
  AUDIT_EXPORT: '/audit/export',

  // Telemetry
  TELEMETRY: '/telemetry',

  // Health (no /api/v1 prefix; consumers must use absolute path)
  HEALTH_LIVE: '/health/live',
  HEALTH_READY: '/health/ready',
  HEALTH_METRICS: '/health/metrics',
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
  VOICE_NOTE_FORMATS: ['.mp3', '.m4a', '.wav', '.ogg', '.webm'],
  VOICE_NOTE_MIME_TYPES: ['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/ogg', 'audio/webm'],
  PHOTO_MAX_SIZE: 10 * 1024 * 1024, // 10MB
  PHOTO_FORMATS: ['.jpg', '.jpeg', '.png', '.webp'],
  PHOTO_MIME_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
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
  REFRESH_TOKEN: 'wdc_refresh_token',
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
