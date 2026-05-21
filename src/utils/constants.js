// User Roles (matches JWT payload `role` field from backend)
export const USER_ROLES = {
  SECRETARY:   'secretary',
  COORDINATOR: 'coordinator',
  DIRECTOR:    'director',
  SYSTEM:      'system',
};

export const ROLE_LABELS = {
  [USER_ROLES.SECRETARY]:   'WDC Secretary',
  [USER_ROLES.COORDINATOR]: 'LGA Coordinator',
  [USER_ROLES.DIRECTOR]:    'Director',
  [USER_ROLES.SYSTEM]:      'System',
};

// Report States — matches backend state machine
export const REPORT_STATUS = {
  DRAFT:     'draft',
  SUBMITTED: 'submitted',
  IN_REVIEW: 'in_review',
  APPROVED:  'approved',
  SEALED:    'sealed',
  RETURNED:  'returned',
};

export const STATUS_LABELS = {
  [REPORT_STATUS.DRAFT]:     'Draft',
  [REPORT_STATUS.SUBMITTED]: 'Submitted',
  [REPORT_STATUS.IN_REVIEW]: 'In Review',
  [REPORT_STATUS.APPROVED]:  'Approved',
  [REPORT_STATUS.SEALED]:    'Sealed',
  [REPORT_STATUS.RETURNED]:  'Returned',
};

export const STATUS_COLORS = {
  [REPORT_STATUS.DRAFT]:     'neutral',
  [REPORT_STATUS.SUBMITTED]: 'info',
  [REPORT_STATUS.IN_REVIEW]: 'warning',
  [REPORT_STATUS.APPROVED]:  'success',
  [REPORT_STATUS.SEALED]:    'success',
  [REPORT_STATUS.RETURNED]:  'error',
};

// Investigation Statuses
export const INVESTIGATION_STATUS = {
  OPEN:        'open',
  IN_PROGRESS: 'in_progress',
  CLOSED:      'closed',
};

export const INVESTIGATION_LABELS = {
  [INVESTIGATION_STATUS.OPEN]:        'Open',
  [INVESTIGATION_STATUS.IN_PROGRESS]: 'In Progress',
  [INVESTIGATION_STATUS.CLOSED]:      'Closed',
};

// Investigation Priorities (matches backend enum)
export const INVESTIGATION_PRIORITY = {
  LOW:    'low',
  NORMAL: 'normal',
  MEDIUM: 'normal', // alias for NORMAL
  HIGH:   'high',
  URGENT: 'urgent',
};

export const INVESTIGATION_TYPES = {
  PERFORMANCE:  'PERFORMANCE',
  COMPLIANCE:   'COMPLIANCE',
  MISCONDUCT:   'MISCONDUCT',
  FINANCIAL:    'FINANCIAL',
  OPERATIONAL:  'OPERATIONAL',
};

export const PRIORITY_LABELS = {
  [INVESTIGATION_PRIORITY.LOW]:    'Low',
  [INVESTIGATION_PRIORITY.NORMAL]: 'Normal',
  [INVESTIGATION_PRIORITY.HIGH]:   'High',
  [INVESTIGATION_PRIORITY.URGENT]: 'Urgent',
};

export const PRIORITY_COLORS = {
  [INVESTIGATION_PRIORITY.LOW]:    'neutral',
  [INVESTIGATION_PRIORITY.NORMAL]: 'info',
  [INVESTIGATION_PRIORITY.HIGH]:   'warning',
  [INVESTIGATION_PRIORITY.URGENT]: 'error',
};

// Report submission methods
export const SUBMISSION_METHOD = {
  AMIRA:  'amira',
  WIZARD: 'wizard',
  SNAP:   'snap',
};

// Field source types
export const FIELD_SOURCE = {
  TYPED:   'typed',
  VOICED:  'voiced',
  SCANNED: 'scanned',
};

// Message channels
export const MESSAGE_CHANNELS = {
  IN_APP:   'in_app',
  EMAIL:    'email',
  SMS:      'sms',
  WHATSAPP: 'whatsapp',
};

// Scope kinds for forms / messages
export const SCOPE_KIND = {
  STATE: 'state',
  LGA:   'lga',
  WARD:  'ward',
};

// API Endpoints — relative paths; baseURL in client.js adds the host + /api/v1 prefix
export const API_ENDPOINTS = {
  // Auth
  SIGN_IN_MOBILE:  '/auth/sign-in/mobile',
  SIGN_IN_CONSOLE: '/auth/sign-in/console',
  SET_CREDENTIALS: '/auth/set-credentials',
  REFRESH:         '/auth/refresh',
  SIGN_OUT:        '/auth/sign-out',

  // Reports
  REPORTS:               '/reports',
  REPORT_BY_ID:          (id) => `/reports/${id}`,
  REPORT_OPS:            (id) => `/reports/${id}/ops`,
  REPORT_FIELDS:         (id) => `/reports/${id}/fields`,
  REPORT_SUBMIT:         (id) => `/reports/${id}/submit`,
  REPORT_OPEN_REVIEW:    (id) => `/reports/${id}/open-review`,
  REPORT_APPROVE:        (id) => `/reports/${id}/approve`,
  REPORT_RETURN:         (id) => `/reports/${id}/return`,
  REPORT_EDIT_RETURNED:  (id) => `/reports/${id}/edit-returned`,
  REPORTS_SEAL_DUE:      '/reports/seal-due',

  // Attachments
  ATTACHMENTS_UPLOAD:        '/attachments/upload',
  ATTACHMENTS_BY_REPORT:     (reportId) => `/attachments/report/${reportId}`,

  // Forms
  FORMS:                '/forms',
  FORMS_VISIBLE:        '/forms/visible',
  FORM_BY_ID:           (id) => `/forms/${id}`,
  FORM_DEPLOY:          (id) => `/forms/${id}/deploy`,
  FORM_ARCHIVE:         (id) => `/forms/${id}/archive`,
  FORM_VERSIONS:        (id) => `/forms/${id}/versions`,
  FORM_VERSION_BY_N:    (id, n) => `/forms/${id}/versions/${n}`,

  // Users
  USERS:              '/users',
  USER_BY_ID:         (id) => `/users/${id}`,
  USER_ASSIGNMENT:    (id) => `/users/${id}/assignment`,
  USER_SUSPEND:       (id) => `/users/${id}/suspend`,
  USER_REACTIVATE:    (id) => `/users/${id}/reactivate`,

  // Investigations
  INVESTIGATIONS:              '/investigations',
  INVESTIGATION_BY_ID:         (id) => `/investigations/${id}`,
  INVESTIGATION_CLOSE:         (id) => `/investigations/${id}/close`,
  INVESTIGATION_REOPEN:        (id) => `/investigations/${id}/reopen`,
  INVESTIGATION_EVIDENCE:      (id) => `/investigations/${id}/evidence`,
  INVESTIGATION_EVIDENCE_DEL:  (id, eid) => `/investigations/${id}/evidence/${eid}`,
  INVESTIGATION_TIMELINE:      (id) => `/investigations/${id}/timeline`,

  // Messages
  MESSAGES_BROADCAST:      '/messages/broadcast',
  MESSAGE_DELIVERIES:      '/messages/deliveries',
  MESSAGE_DELIVERY_BY_ID:  (id) => `/messages/deliveries/${id}`,
  MESSAGE_DELIVERY_READ:   (id) => `/messages/deliveries/${id}/read`,

  // Sync
  SYNC_BATCH: '/sync/batch',

  // LGAs / Wards (used by login selector — backend must allow these unauthenticated)
  LGAS:        '/lgas',
  LGA_WARDS:   (lgaId) => `/lgas/${lgaId}/wards`,

  // AI
  AI_ASK: '/ai/ask',

  // Audit
  AUDIT_ANCHOR:  '/audit/anchor',
  AUDIT_ANCHORS: '/audit/anchors',
  AUDIT_EXPORT:  '/audit/export',

  // Telemetry — backend bug: controller path doubles the prefix, use full path
  TELEMETRY: '/api/v1/telemetry',

  // Health (no /api/v1 prefix)
  HEALTH_LIVE:  '/health/live',
  HEALTH_READY: '/health/ready',
};

// File Upload constraints
export const FILE_UPLOAD = {
  AUDIO_MAX_SIZE:   10 * 1024 * 1024, // 10 MB
  AUDIO_FORMATS:    ['.mp3', '.m4a', '.wav', '.ogg', '.webm'],
  AUDIO_MIME_TYPES: ['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/ogg', 'audio/webm'],
  IMAGE_MAX_SIZE:   10 * 1024 * 1024, // 10 MB
  IMAGE_FORMATS:    ['.jpg', '.jpeg', '.png', '.webp'],
  IMAGE_MIME_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
};

// Pagination defaults
export const PAGINATION = {
  DEFAULT_LIMIT: 25,
  MAX_LIMIT:     100,
};

// Storage Keys — used with capacitor.js storage / secureStorage abstractions
export const STORAGE_KEYS = {
  REFRESH_TOKEN: 'wdc_refresh_token',    // secureStorage
  USER_PROFILE:  'wdc_user_profile',     // storage
  DEVICE_ID:     'wdc_device_id',        // storage (stable per-device UUID)
  SUBMIT_QUEUE:  'wdc_submit_queue',     // storage
  LAST_ACTIVITY: 'wdc_last_activity',    // storage
};

// Date Formats
export const DATE_FORMATS = {
  DISPLAY:           'MMM DD, YYYY',
  DISPLAY_WITH_TIME: 'MMM DD, YYYY h:mm A',
  API:               'YYYY-MM-DD',
  MONTH:             'YYYY-MM',
  MONTH_DISPLAY:     'MMMM YYYY',
};

// App Configuration
export const APP_CONFIG = {
  APP_NAME:      'KADUNA WDC',
  APP_SUBTITLE:  'Digital Reporting System',
  STATE_NAME:    'Kaduna State',
  COUNTRY:       'Nigeria',
  SUPPORT_EMAIL: 'support@kaduna.gov.ng',
  SUPPORT_PHONE: '+234 800 000 0000',
};

// Route Paths
export const ROUTES = {
  HOME:          '/',
  LOGIN:         '/login',
  WDC:           '/wdc',
  LGA:           '/lga',
  STATE:         '/state',
  NOTIFICATIONS: '/notifications',
  SETTINGS:      '/settings',
};

// Navigation Items by Role
export const NAV_ITEMS = {
  [USER_ROLES.SECRETARY]: [
    { path: ROUTES.WDC,           label: 'Dashboard',      icon: 'LayoutDashboard' },
    { path: ROUTES.NOTIFICATIONS, label: 'Notifications',  icon: 'Bell' },
  ],
  [USER_ROLES.COORDINATOR]: [
    { path: ROUTES.LGA,           label: 'Dashboard',      icon: 'LayoutDashboard' },
    { path: ROUTES.NOTIFICATIONS, label: 'Notifications',  icon: 'Bell' },
  ],
  [USER_ROLES.DIRECTOR]: [
    { path: ROUTES.STATE,         label: 'Dashboard',      icon: 'LayoutDashboard' },
    { path: ROUTES.NOTIFICATIONS, label: 'Notifications',  icon: 'Bell' },
  ],
};
