/**
 * ============================================================================
 * 1. ENVIRONMENT, LOCALE & CORE SYSTEM
 * Fundamental settings, feature flags, and global UI/System defaults.
 * ============================================================================
 */
export const NODE_ENV_VALUES = ['development', 'test', 'production'] as const;
export const LOCALES = ['en-US', 'en-GB', 'de-DE'] as const;
export const CURRENCIES = ['USD', 'EUR', 'GBP'] as const;

// --- UI & Styling Defaults ---
export const DEFAULT_THEME = 'system' as const;
export const DEFAULT_DENSITY = 'normal' as const;
export const DEFAULT_CONTRAST_MODE = 'system' as const;
// --- System Health Statuses ---

export const SYSTEM_FLAGS = {} as const;

export const DANGEROUS_KEYS = ['__proto__', 'constructor', 'prototype'] as const;
export const SENSITIVE_KEYS = [
  'password',
  'token',
  'secret',
  'creditCard',
  'cvv',
  'cardDetails',
  'apiKey',
  'clientSecret',
  'privateKey',
] as const;

export const PROTECTED_FIELDS = new Set<string>([
  'id',
  'version',
  'created_at',
  'updated_at',
  'password_hash',
  'passwordHash',
]);

export const FEATURE_KEYS = {
  PROJECTS: 'projects:limit',
  STORAGE: 'storage:limit',
  TEAM_MEMBERS: 'team:invite',
  API_ACCESS: 'api:access',
  CUSTOM_BRANDING: 'branding:custom',
  MEDIA_PROCESSING: 'media:processing',
  MEDIA_MAX_FILE_SIZE_MB: 'media:max_file_size',
} as const;

// Drop these right here:
export const LIMIT_FEATURE_KEYS = [
  FEATURE_KEYS.PROJECTS,
  FEATURE_KEYS.STORAGE,
  FEATURE_KEYS.MEDIA_MAX_FILE_SIZE_MB,
] as const;

export const TOGGLE_FEATURE_KEYS = [
  FEATURE_KEYS.TEAM_MEMBERS,
  FEATURE_KEYS.API_ACCESS,
  FEATURE_KEYS.CUSTOM_BRANDING,
  FEATURE_KEYS.MEDIA_PROCESSING,
] as const;

/**
 * ============================================================================
 * 2. TIME, DATES & FORMATTING
 * Constants for calculating expirations, timeframes, and formatting.
 * ============================================================================
 */
export const TIME_ZONE = {
  UTC: 'UTC',
} as const;

export const DATE_FORMATS = {
  ISO_8601: "yyyy-MM-dd'T'HH:mm:ss.SSSxxx",
  DISPLAY_DATE: 'MMM dd, yyyy',
  DISPLAY_DATETIME: 'MMM dd, yyyy HH:mm',
} as const;

export const TIME_CONSTANTS = {
  MS_PER_SECOND: 1000,
  SECONDS_PER_MINUTE: 60,
  MINUTES_PER_HOUR: 60,
  HOURS_PER_DAY: 24,
  DAYS_PER_WEEK: 7,
  MS_PER_MINUTE: 60 * 1000,
  MS_PER_HOUR: 60 * 60 * 1000,
  MS_PER_DAY: 24 * 60 * 60 * 1000,
} as const;

// Derived global time constants
export const MS_PER_SECOND = TIME_CONSTANTS.MS_PER_SECOND;
export const SECONDS_PER_MINUTE = TIME_CONSTANTS.SECONDS_PER_MINUTE;
export const MINUTES_PER_HOUR = TIME_CONSTANTS.MINUTES_PER_HOUR;
export const HOURS_PER_DAY = TIME_CONSTANTS.HOURS_PER_DAY;
export const DAYS_PER_WEEK = TIME_CONSTANTS.DAYS_PER_WEEK;
export const MS_PER_MINUTE = TIME_CONSTANTS.MS_PER_MINUTE;
export const MS_PER_HOUR = TIME_CONSTANTS.MS_PER_HOUR;
export const MS_PER_DAY = TIME_CONSTANTS.MS_PER_DAY;
export const SECONDS_PER_HOUR = SECONDS_PER_MINUTE * MINUTES_PER_HOUR;
export const SECONDS_PER_DAY = SECONDS_PER_HOUR * HOURS_PER_DAY;

/**
 * ============================================================================
 * 3. REGEX PATTERNS & SANITIZATION
 * The ground truth for all Zod/Schema validation.
 * ============================================================================
 */
export const REGEX_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  USERNAME: /^[a-z][a-z0-9_]{1,29}$/,
  USERNAME_LOCAL: /^[a-zA-Z0-9_]{1,15}$/,
  PHONE: /^\+?[0-9\s\-()]{7,20}$/,
  PHONE_E164: /^\+[1-9]\d{1,14}$/,
  DATE_ISO: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/,
  DATE_ONLY: /^\d{4}-\d{2}-\d{2}$/,
  URL: /^https?:\/\/.+/,
  SLUG: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  PASSWORD_COMPLEXITY: /^(?=.*[0-9])(?=.*[!@#$%^&*])(?=.{8,})/,
  SAFE_FILENAME: /^[a-zA-Z0-9._-]+$/,
  SAFE_SQL_IDENTIFIER: /^[a-zA-Z][a-zA-Z0-9_]{0,62}$/,
  UNSAFE_FILENAME_CHARS: /[/\\:*?"<>|]/g,
  CONTROL_CHARS: new RegExp(
    '[' +
      String.fromCharCode(0x00) +
      '-' +
      String.fromCharCode(0x1f) +
      String.fromCharCode(0x7f) +
      '-' +
      String.fromCharCode(0x9f) +
      ']',
    'g',
  ),
} as const;

export const AUDIT_PATTERNS = {
  ACTION_REGEX: /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/,
} as const;

/**
 * ============================================================================
 * 4. LIMITS, QUOTAS, PAGINATION & SEARCH
 * Limits, thresholds, and database query parameters.
 * ============================================================================
 */
export const LIMITS = {
  MAX_FILE_SIZE_BYTES: 10 * 1024 * 1024,
  MAX_UPLOAD_FILES: 10,
  MAX_IMAGE_SIZE_BYTES: 5 * 1024 * 1024,
  MAX_LOGO_SIZE_BYTES: 2 * 1024 * 1024,
  HTTP_BODY_LIMIT_BYTES: 1024 * 1024,
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  MAX_SLUG_LENGTH: 100,
  MAX_TITLE_LENGTH: 200,
  MAX_DESCRIPTION_LENGTH: 2000,
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION_MINUTES: 15,
  MAX_SANITIZE_DEPTH: 10,
} as const;

export const QUOTAS = {
  MAX_PENDING_INVITATIONS: 50,
  MAX_USERNAME_LENGTH: 15,
  MAGIC_LINK_MAX_PER_EMAIL: 3,
  MAGIC_LINK_MAX_PER_IP: 10,
  IMPERSONATION_MAX_PER_HOUR: 5,
} as const;

export const SMS_LIMITS = {
  MAX_ATTEMPTS: 3,
  RATE_LIMIT_HOURLY: 3,
  RATE_LIMIT_DAILY: 10,
} as const;

// --- Pagination & Search Defaults ---
export const DEFAULT_PAGINATION = {
  PAGE: 1,
  LIMIT: 50,
  MAX_LIMIT: 1000,
} as const;

export const SEARCH_DEFAULTS = {
  PAGE: 1,
  LIMIT: 50,
  MAX_LIMIT: 1000,
} as const;

export const DEFAULT_PAGE_LIMIT = LIMITS.DEFAULT_PAGE_SIZE;
export const DEFAULT_SORT_ORDER = 'desc' as const;
export const DEFAULT_SORT_BY = 'createdAt';

export const SORT_ORDER = {
  ASC: 'asc',
  DESC: 'desc',
} as const;

export const AGGREGATION_TYPES = ['sum', 'max', 'last'] as const;

export const FILTER_OPERATORS = Object.freeze({
  EQ: 'eq',
  NEQ: 'neq',
  GT: 'gt',
  GTE: 'gte',
  LT: 'lt',
  LTE: 'lte',
  CONTAINS: 'contains',
  StartsWith: 'startsWith',
  EndsWith: 'endsWith',
  LIKE: 'like',
  ILIKE: 'ilike',
  IN: 'in',
  NotIn: 'notIn',
  IsNull: 'isNull',
  IsNotNull: 'isNotNull',
  BETWEEN: 'between',
  ArrayContains: 'arrayContains',
  ArrayContainsAny: 'arrayContainsAny',
  FullText: 'fullText',
} as const);

export const FILTER_OPERATOR_VALUES = Object.values(FILTER_OPERATORS);

export const LOGICAL_OPERATORS = {
  AND: 'and',
  OR: 'or',
  NOT: 'not',
} as const;

export const LOGICAL_OPERATOR_VALUES = Object.values(LOGICAL_OPERATORS);

export const SEARCH_ERROR_TYPES = {
  InvalidQuery: 'INVALID_QUERY',
  InvalidFilter: 'INVALID_FILTER',
  InvalidOperator: 'INVALID_OPERATOR',
  InvalidField: 'INVALID_FIELD',
  InvalidSort: 'INVALID_SORT',
  InvalidPagination: 'INVALID_PAGINATION',
  InvalidCursor: 'INVALID_CURSOR',
  ProviderError: 'PROVIDER_ERROR',
  ProviderUnavailable: 'PROVIDER_UNAVAILABLE',
  UnsupportedOperator: 'UNSUPPORTED_OPERATOR',
  QueryTooComplex: 'QUERY_TOO_COMPLEX',
  SearchTimeout: 'SEARCH_TIMEOUT',
} as const;

export const PAGINATION_ERROR_TYPES = {
  INVALID_CURSOR: 'INVALID_CURSOR',
  CURSOR_SORT_MISMATCH: 'CURSOR_SORT_MISMATCH',
  INVALID_LIMIT: 'INVALID_LIMIT',
  INVALID_PAGE: 'INVALID_PAGE',
  INVALID_SORT_FIELD: 'INVALID_SORT_FIELD',
  INVALID_SORT_ORDER: 'INVALID_SORT_ORDER',
} as const;

/**
 * ============================================================================
 * 5. AUTHENTICATION, IAM & TENANCY
 * Roles, Permissions, Headers, and Workspace constants.
 * ============================================================================
 */
export const AUTH_CONSTANTS = {
  BEARER_PREFIX: 'Bearer ',
  SUDO_TOKEN_HEADER: 'x-sudo-token',
  CSRF_TOKEN_HEADER: 'x-csrf-token',
  CSRF_COOKIE_NAME: '_csrf',
  ACCESS_TOKEN_COOKIE_NAME: 'accessToken',
  REFRESH_TOKEN_COOKIE_NAME: 'refreshToken',
  SESSION_COOKIE_NAME: 'sessionId',
  WEBSOCKET_PATH: '/ws',
  API_PREFIX: '/api',
  WS_CLOSE_POLICY_VIOLATION: 1008,
  WORKSPACE_ID_HEADER: 'x-workspace-id',
  WORKSPACE_ROLE_HEADER: 'x-workspace-role',
} as const;

export const API_PREFIX = AUTH_CONSTANTS.API_PREFIX;

export const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export const CSRF_EXEMPT_PATHS = new Set([
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/auth/verify-email',
  '/api/auth/refresh',
  '/api/auth/resend-verification',
]);

export const RESERVED_USERNAMES = [
  'admin',
  'administrator',
  'support',
  'system',
  'help',
  'root',
  'mod',
  'moderator',
  'staff',
  'team',
  'official',
  'info',
  'security',
  'abuse',
  'postmaster',
  'webmaster',
  'noreply',
  'null',
  'undefined',
  'api',
  'www',
  'mail',
  'ftp',
] as const;

export const ACTOR_TYPES = ['user', 'system', 'api_key'] as const;
export const USER_STATUSES = ['active', 'locked', 'unverified'] as const;
export const APP_ROLES = ['admin', 'moderator', 'user'] as const;

export const TENANT_ROLES = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MEMBER: 'member',
  VIEWER: 'viewer',
} as const;

export const ROLE_LEVELS: Record<string, number> = {
  viewer: 1,
  member: 2,
  admin: 3,
  owner: 4,
};

export const INVITATION_STATUSES = ['pending', 'accepted', 'revoked', 'expired'] as const;

export const PERMISSIONS = [
  'billing:manage',
  'billing:read',
  'membership:invite',
  'membership:manage',
  'membership:read',
  'settings:manage',
  'audit-log:read',
  'data:read',
  'data:write',
  'data:delete',
] as const;

export const OAUTH_PROVIDERS = ['google', 'github', 'apple'] as const;

export const AUTH_EXPIRY = {
  EMAIL_CHANGE_HOURS: 24,
  EMAIL_CHANGE_REVERT_HOURS: 48,
  MAGIC_LINK_MINUTES: 15,
  OAUTH_STATE_MINUTES: 10,
  VERIFICATION_TOKEN_HOURS: 24,
  SUDO_MINUTES: 5,
  INVITE_DAYS: 7,
  SMS_CODE_MINUTES: 5,
  IMPERSONATION_MINUTES: 30,
} as const;

export const LOGIN_FAILURE_REASON = {
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  PASSWORD_MISMATCH: 'PASSWORD_MISMATCH',
  UNVERIFIED_EMAIL: 'UNVERIFIED_EMAIL',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  TOTP_REQUIRED: 'TOTP_REQUIRED',
  SMS_REQUIRED: 'SMS_REQUIRED',
  TOTP_INVALID: 'TOTP_INVALID',
  CAPTCHA_FAILED: 'CAPTCHA_FAILED',
  ACCOUNT_DEACTIVATED: 'ACCOUNT_DEACTIVATED',
  ACCOUNT_DELETED: 'ACCOUNT_DELETED',
} as const;

export const defaultPasswordConfig = {
  minLength: 8,
  maxLength: 64,
  minScore: 3,
};

export const KEYBOARD_PATTERNS = [
  'qwerty',
  'qwertyuiop',
  'asdf',
  'asdfgh',
  'asdfghjkl',
  'zxcv',
  'zxcvb',
  'zxcvbn',
  'zxcvbnm',
  '1234',
  '12345',
  '123456',
  '1234567',
  '12345678',
  '123456789',
  '1234567890',
  '0987654321',
  '987654321',
  '87654321',
  '7654321',
  '654321',
  '54321',
  '4321',
  'qazwsx',
  'qaz',
  'wsx',
  'edc',
  'rfv',
  'tgb',
  'yhn',
  'ujm',
];

export const COMMON_PASSWORDS = new Set([
  'password',
  '123456',
  '12345678',
  'qwerty',
  'abc123',
  'monkey',
  '1234567',
  'letmein',
  'trustno1',
  'dragon',
  'baseball',
  'iloveyou',
  'master',
  'sunshine',
  'ashley',
  'bailey',
  'shadow',
  '123123',
  '654321',
  'superman',
  'qazwsx',
  'michael',
  'football',
  'password1',
  'password123',
  'batman',
  'login',
  'admin',
  'princess',
  'welcome',
  'solo',
  'passw0rd',
  'starwars',
  'hello',
  'charlie',
  'donald',
  'hunter',
  'jennifer',
  'jordan',
  'joshua',
  'maggie',
  'andrew',
  'nicole',
  'jessica',
  'michelle',
  'daniel',
  'matthew',
  'anthony',
  'william',
  'soccer',
  'cheese',
  'winter',
  'summer',
  'spring',
  'autumn',
  'orange',
  'purple',
  'access',
  'secret',
  'internet',
  'computer',
  'google',
  'yahoo',
  'facebook',
  'twitter',
  'linkedin',
  'myspace',
  'pepper',
  'killer',
  'george',
  'zxcvbn',
  'qwerty123',
  'asdf',
  'asdfgh',
  'zxcvb',
  'zxcvbnm',
  '111111',
  '000000',
  '121212',
  '1q2w3e',
  '1q2w3e4r',
  '1qaz2wsx',
  'q1w2e3r4',
  'abcdef',
  'abcd1234',
  'test',
  'test123',
  'guest',
  'master123',
  'changeme',
  'default',
  'root',
  'toor',
  'pass',
  'temp',
  'temp123',
  'password12',
  'password1234',
  'qwerty1',
  'qwerty12',
  'letmein1',
  'letmein123',
]);

/**
 * ============================================================================
 * 6. PRIVACY, DATA RETENTION & LEGAL
 * GDPR, Deletion Grace Periods, and Consents.
 * ============================================================================
 */
export const DELETION_STATES = [
  'active',
  'soft_deleted',
  'pending_hard_delete',
  'hard_deleted',
] as const;

export const RETENTION_PERIODS = {
  PII_GRACE_DAYS: 30,
  HARD_DELETE_DAYS: 30,
  AUDIT_DAYS: 90,
  LOGIN_ATTEMPTS_DAYS: 90,
  SESSIONS_DAYS: 30,
  HARD_BAN_GRACE_DAYS: 7,
} as const;

export const DEFAULT_GRACE_PERIOD_DAYS = 30;
export const ACCOUNT_DELETION_GRACE_PERIOD_DAYS = 30;
export const USERNAME_CHANGE_COOLDOWN_DAYS = 30;

export const CONSENT_TYPES = [
  'marketing_email',
  'analytics',
  'third_party_sharing',
  'profiling',
] as const;

export const DATA_EXPORT_TYPES = ['export', 'deletion'] as const;

export const DATA_EXPORT_STATUSES = [
  'pending',
  'processing',
  'completed',
  'failed',
  'canceled',
] as const;

export const DOCUMENT_TYPES = [
  'terms_of_service',
  'privacy_policy',
  'cookie_policy',
  'dpa',
] as const;

/**
 * ============================================================================
 * 7. BILLING & SUBSCRIPTIONS
 * Payments, Plans, and Invoices.
 * ============================================================================
 */
export const BILLING_PROVIDERS = ['stripe', 'paypal'] as const;
export const PAYMENT_METHOD_TYPES = ['card', 'bank_account', 'paypal'] as const;
export const CENTS_PER_DOLLAR = 100;

export const PLAN_INTERVALS = ['month', 'year'] as const;
export const PLAN_FEES: Record<string, number> = {
  free: 0,
  pro: 2900,
  enterprise: 29900,
};

export const SUBSCRIPTION_STATUSES = [
  'active',
  'canceled',
  'incomplete',
  'incomplete_expired',
  'past_due',
  'paused',
  'trialing',
  'unpaid',
] as const;

export const INVOICE_STATUSES = ['draft', 'open', 'paid', 'void', 'uncollectible'] as const;

export const BILLING_EVENT_TYPES = [
  'subscription.created',
  'subscription.updated',
  'subscription.canceled',
  'invoice.paid',
  'invoice.payment_failed',
  'refund.created',
  'chargeback.created',
] as const;

/**
 * ============================================================================
 * 8. MEDIA, FILES & STORAGE
 * Extensions, MIME types, Limits, and Magic Numbers.
 * ============================================================================
 */
export const STORAGE_PROVIDERS = ['local', 's3', 'gcs'] as const;
export const FILE_PURPOSES = ['avatar', 'document', 'export', 'attachment', 'other'] as const;

export const MAX_FILENAME_LENGTH = 255;
export const MAX_UPLOAD_FILE_SIZE = 1000 * 1024 * 1024;
export const MAX_CHUNK_SIZE = 10 * 1024 * 1024;
export const MAX_UPLOAD_TIMEOUT_MS = TIME_CONSTANTS.MS_PER_HOUR;

export const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'] as const;
export const AUDIO_EXTENSIONS = ['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a'] as const;
export const VIDEO_EXTENSIONS = ['mp4', 'avi', 'mov', 'mkv', 'webm', 'flv', 'wmv'] as const;

export const ALL_MEDIA_EXTENSIONS = [
  ...IMAGE_EXTENSIONS,
  ...AUDIO_EXTENSIONS,
  ...VIDEO_EXTENSIONS,
] as const;

export const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export const ALLOWED_MEDIA_MIME_TYPES = [
  ...ALLOWED_IMAGE_MIME_TYPES,
  'image/gif',
  'image/avif',
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'audio/flac',
  'audio/aac',
  'audio/mp4',
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-msvideo',
] as const;

export const EXTRA_EXT_TO_MIME: Record<string, string> = {
  svg: 'image/svg+xml',
  ico: 'image/x-icon',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  csv: 'text/csv',
  xml: 'application/xml',
  zip: 'application/zip',
  gz: 'application/gzip',
  json: 'application/json',
  txt: 'text/plain',
};

export const EXT_TO_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  avif: 'image/avif',
  tiff: 'image/tiff',
  bmp: 'image/bmp',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  flac: 'audio/flac',
  aac: 'audio/aac',
  ogg: 'audio/ogg',
  m4a: 'audio/mp4',
  mp4: 'video/mp4',
  avi: 'video/x-msvideo',
  mov: 'video/quicktime',
  mkv: 'video/x-matroska',
  webm: 'video/webm',
  flv: 'video/x-flv',
  wmv: 'video/x-ms-wmv',
  pdf: 'application/pdf',
  txt: 'text/plain',
  json: 'application/json',
};

export const MIME_TO_EXT: Record<string, string> = Object.fromEntries([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/gif', 'gif'],
  ['image/webp', 'webp'],
  ['image/avif', 'avif'],
  ['image/tiff', 'tiff'],
  ['image/bmp', 'bmp'],
  ['audio/mpeg', 'mp3'],
  ['audio/wav', 'wav'],
  ['audio/flac', 'flac'],
  ['audio/aac', 'aac'],
  ['audio/ogg', 'ogg'],
  ['audio/mp4', 'm4a'],
  ['video/mp4', 'mp4'],
  ['video/x-msvideo', 'avi'],
  ['video/quicktime', 'mov'],
  ['video/x-matroska', 'mkv'],
  ['video/webm', 'webm'],
  ['video/x-flv', 'flv'],
  ['video/x-ms-wmv', 'wmv'],
  ['application/pdf', 'pdf'],
  ['text/plain', 'txt'],
  ['application/json', 'json'],
]) as Record<string, string>;

export const MAGIC_NUMBERS: Array<{
  offset: number;
  signature: number[];
  ext: string;
  mime: string;
}> = [
  { offset: 0, signature: [0xff, 0xd8, 0xff], ext: 'jpg', mime: 'image/jpeg' },
  {
    offset: 0,
    signature: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
    ext: 'png',
    mime: 'image/png',
  },
  { offset: 0, signature: [0x47, 0x49, 0x46, 0x38, 0x37, 0x61], ext: 'gif', mime: 'image/gif' },
  { offset: 0, signature: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61], ext: 'gif', mime: 'image/gif' },
  { offset: 0, signature: [0x42, 0x4d], ext: 'bmp', mime: 'image/bmp' },
  { offset: 0, signature: [0x52, 0x49, 0x46, 0x46], ext: 'webp', mime: 'image/webp' },
  { offset: 0, signature: [0xff, 0xfb], ext: 'mp3', mime: 'audio/mpeg' },
  { offset: 0, signature: [0xff, 0xf3], ext: 'mp3', mime: 'audio/mpeg' },
  { offset: 0, signature: [0xff, 0xf2], ext: 'mp3', mime: 'audio/mpeg' },
  { offset: 0, signature: [0x49, 0x44, 0x33], ext: 'mp3', mime: 'audio/mpeg' },
  { offset: 0, signature: [0x52, 0x49, 0x46, 0x46], ext: 'wav', mime: 'audio/wav' },
  { offset: 0, signature: [0x4f, 0x67, 0x67, 0x53], ext: 'ogg', mime: 'audio/ogg' },
  {
    offset: 0,
    signature: [0x66, 0x74, 0x79, 0x70, 0x4d, 0x34, 0x41],
    ext: 'm4a',
    mime: 'audio/m4a',
  },
  {
    offset: 0,
    signature: [0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70],
    ext: 'mp4',
    mime: 'video/mp4',
  },
  {
    offset: 0,
    signature: [0x00, 0x00, 0x00, 0x14, 0x66, 0x74, 0x79, 0x70],
    ext: 'mp4',
    mime: 'video/mp4',
  },
  { offset: 0, signature: [0x1a, 0x45, 0xdf, 0xa3], ext: 'webm', mime: 'video/webm' },
  { offset: 0, signature: [0x46, 0x4c, 0x56, 0x01], ext: 'flv', mime: 'video/x-flv' },
  { offset: 0, signature: [0x25, 0x50, 0x44, 0x46], ext: 'pdf', mime: 'application/pdf' },
];

/**
 * ============================================================================
 * 9. BACKGROUND JOBS & QUEUES
 * Async processing states and priorities.
 * ============================================================================
 */
export const JOB_PRIORITIES = ['low', 'normal', 'high', 'critical'] as const;

export const JOB_PRIORITY_VALUES: Readonly<Record<string, number>> = {
  low: -10,
  normal: 0,
  high: 10,
  critical: 100,
} as const;

export const JOB_STATUSES = [
  'pending',
  'processing',
  'completed',
  'failed',
  'dead_letter',
  'cancelled',
] as const;

export const TERMINAL_STATUSES: ReadonlySet<string> = new Set([
  'completed',
  'failed',
  'dead_letter',
  'cancelled',
]);

export const JOB_STATUS_CONFIG: Record<
  string,
  { label: string; tone: 'info' | 'success' | 'warning' | 'danger' }
> = {
  pending: { label: 'Pending', tone: 'info' },
  processing: { label: 'Processing', tone: 'warning' },
  completed: { label: 'Completed', tone: 'success' },
  failed: { label: 'Failed', tone: 'danger' },
  dead_letter: { label: 'Dead Letter', tone: 'danger' },
  cancelled: { label: 'Cancelled', tone: 'warning' },
};

/**
 * ============================================================================
 * 10. NOTIFICATIONS, EMAILS & WEBHOOKS
 * Delivery channels, categories, and event routing.
 * ============================================================================
 */
export const EMAIL_STATUSES = ['queued', 'sent', 'delivered', 'bounced', 'failed'] as const;
export const EMAIL_PROVIDERS = ['smtp', 'ses', 'sendgrid', 'console'] as const;

export const NOTIFICATION_SCHEMA_PROVIDERS = ['onesignal', 'fcm', 'courier', 'generic'] as const;
export const NOTIFICATION_ENV_PROVIDERS = [
  'onesignal',
  'fcm',
  'courier',
  'knock',
  'sns',
  'braze',
  'generic',
] as const;

export const NOTIFICATION_CHANNELS = ['push', 'email', 'sms', 'in_app'] as const;
export const NOTIFICATION_TYPES = [
  'system',
  'security',
  'marketing',
  'social',
  'transactional',
] as const;
export const NOTIFICATION_LEVELS = ['info', 'success', 'warning', 'error'] as const;
export const NOTIFICATION_PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const;
export const NOTIFICATION_PAYLOAD_MAX_SIZE = 4096;

export const WEBHOOK_DELIVERY_STATUSES = ['pending', 'delivered', 'failed', 'dead'] as const;
export const MAX_DELIVERY_ATTEMPTS = 5;
export const RETRY_DELAYS_MINUTES = [1, 5, 30, 120, 720] as const;

export const TERMINAL_DELIVERY_STATUSES: ReadonlySet<string> = new Set(['delivered', 'dead']);

export const WEBHOOK_EVENT_TYPES = {
  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',
  USER_DELETED: 'user.deleted',
  AUTH_LOGIN: 'auth.login',
  AUTH_PASSWORD_CHANGED: 'auth.password_changed',
  TENANT_CREATED: 'tenant.created',
  TENANT_UPDATED: 'tenant.updated',
  TENANT_DELETED: 'tenant.deleted',
  MEMBER_ADDED: 'member.added',
  MEMBER_REMOVED: 'member.removed',
  MEMBER_ROLE_CHANGED: 'member.role_changed',
  INVITATION_CREATED: 'invitation.created',
  INVITATION_ACCEPTED: 'invitation.accepted',
  INVITATION_REVOKED: 'invitation.revoked',
  BILLING_SUBSCRIPTION_CREATED: 'billing.subscription.created',
  BILLING_SUBSCRIPTION_UPDATED: 'billing.subscription.updated',
  BILLING_SUBSCRIPTION_CANCELLED: 'billing.subscription.cancelled',
  BILLING_PAYMENT_SUCCEEDED: 'billing.payment.succeeded',
  BILLING_PAYMENT_FAILED: 'billing.payment.failed',
} as const;

export const SUBSCRIBABLE_EVENT_TYPES = Object.values(WEBHOOK_EVENT_TYPES);

/**
 * ============================================================================
 * 11. ERRORS, MESSAGES & ROUTING
 * System observable errors, user-facing messaging, and API contracts.
 * ============================================================================
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  PAYLOAD_TOO_LARGE: 413,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
} as const;

export type HttpStatusCode = (typeof HTTP_STATUS)[keyof typeof HTTP_STATUS];

export const ERROR_CODES = {
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  BAD_REQUEST: 'BAD_REQUEST',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  CONFIGURATION_ERROR: 'CONFIGURATION_ERROR',
  CONFLICT: 'CONFLICT',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_REUSED: 'TOKEN_REUSED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  EMAIL_ALREADY_EXISTS: 'EMAIL_ALREADY_EXISTS',
  EMAIL_NOT_VERIFIED: 'EMAIL_NOT_VERIFIED',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  WEAK_PASSWORD: 'WEAK_PASSWORD',
  OAUTH_ERROR: 'OAUTH_ERROR',
  OAUTH_STATE_MISMATCH: 'OAUTH_STATE_MISMATCH',
  TOTP_REQUIRED: 'TOTP_REQUIRED',
  TOTP_INVALID: 'TOTP_INVALID',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  SUBSCRIPTION_EXPIRED: 'SUBSCRIPTION_EXPIRED',
  INSUFFICIENT_ENTITLEMENTS: 'INSUFFICIENT_ENTITLEMENTS',
  RATE_LIMITED: 'RATE_LIMITED',
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  TOS_ACCEPTANCE_REQUIRED: 'TOS_ACCEPTANCE_REQUIRED',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export const ERROR_MESSAGES = {
  AUTHENTICATION_REQUIRED: 'Authentication required',
  INTERNAL_ERROR: 'Internal server error',
  NOT_FOUND: 'Resource not found',
  UNAUTHORIZED: 'Unauthorized',
  BAD_REQUEST: 'Bad request',
  DEFAULT: 'An unexpected error occurred',
} as const;

export const HTTP_ERROR_MESSAGES = {
  AccountLocked:
    'Account temporarily locked due to too many failed attempts. Please try again later.',
  InvalidCredentials: 'Invalid email or password',
  EmailAlreadyRegistered: 'Email already registered',
  InvalidToken: 'Invalid or expired token',
  WeakPassword: 'Password is too weak',
  EmailSendFailed: 'Failed to send email. Please try again or use the resend option.',
  InternalError: 'Internal server error',
} as const;

export const AUTH_ERROR_NAMES = {
  AccountLockedError: 'AccountLockedError',
  EmailNotVerifiedError: 'EmailNotVerifiedError',
  InvalidCredentialsError: 'InvalidCredentialsError',
  InvalidTokenError: 'InvalidTokenError',
  EmailAlreadyExistsError: 'EmailAlreadyExistsError',
  WeakPasswordError: 'WeakPasswordError',
  EmailSendError: 'EmailSendError',
} as const;

export const AUTH_ERROR_MESSAGES = {
  INTERNAL_ERROR: 'Internal server error',
  NOT_FOUND: 'Resource not found',
  BAD_REQUEST: 'Bad request',
  UNAUTHORIZED: 'Unauthorized',
  FORBIDDEN: 'Forbidden - insufficient permissions',
  INVALID_CREDENTIALS: 'Invalid email or password',
  EMAIL_ALREADY_EXISTS: 'Email already registered',
  USER_NOT_FOUND: 'User not found',
  WEAK_PASSWORD: 'Password is too weak',
  ACCOUNT_LOCKED:
    'Account temporarily locked due to too many failed attempts. Please try again later.',
  INVALID_TOKEN: 'Invalid or expired token',
  INVALID_OR_EXPIRED_TOKEN: 'Invalid or expired token',
  NO_REFRESH_TOKEN: 'No refresh token provided',
  MISSING_AUTH_HEADER: 'Missing or invalid authorization header',
  FAILED_TOKEN_FAMILY: 'Failed to create refresh token family',
  FAILED_USER_CREATION: 'Failed to create user',
  OAUTH_STATE_MISMATCH: 'OAuth state mismatch - possible CSRF attack',
  OAUTH_CODE_MISSING: 'OAuth authorization code missing',
  OAUTH_PROVIDER_ERROR: 'OAuth provider returned an error',
  MAGIC_LINK_EXPIRED: 'Magic link has expired',
  MAGIC_LINK_INVALID: 'Invalid magic link',
  MAGIC_LINK_ALREADY_USED: 'Magic link has already been used',
  EMAIL_VERIFICATION_NOT_IMPLEMENTED: 'Email verification not implemented',
  EMAIL_SEND_FAILED: 'Failed to send email. Please try again or use the resend option.',
} as const;

export const AUTH_SUCCESS_MESSAGES = {
  LOGGED_OUT: 'Logged out successfully',
  ACCOUNT_UNLOCKED: 'Account unlocked successfully',
  PASSWORD_RESET_SENT: 'Password reset email sent',
  VERIFICATION_EMAIL_SENT:
    'Verification email sent. Please check your inbox and click the confirmation link.',
  MAGIC_LINK_SENT: 'Magic link sent to your email',
} as const;

export const REALTIME_ERRORS = {
  AUTHOR_MISMATCH: 'Author ID must match authenticated user',
  tableNotAllowed: (table: string) => `Table '${table}' is not allowed for realtime operations`,
  VERSION_CONFLICT: 'Version conflict: one or more records have been modified',
} as const;

/**
 * ============================================================================
 * 12. LOGGING, AUDIT & UI TONES
 * Observability, console colors, and shared UI tone mapping.
 * ============================================================================
 */
export const LOG_LEVELS = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  fatal: 60,
} as const;

export const CONSOLE_LOG_LEVELS: Record<string, number> = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  fatal: 60,
  silent: 100,
};

export const ANSI = {
  reset: '\u001B[0m',
  dim: '\u001B[2m',
  cyan: '\u001B[36m',
  green: '\u001B[32m',
  yellow: '\u001B[33m',
  magenta: '\u001B[35m',
  gray: '\u001B[90m',
  blue: '\u001B[34m',
  red: '\u001B[31m',
} as const;

export const AUDIT_CATEGORIES = ['security', 'admin', 'system', 'billing'] as const;
export const AUDIT_SEVERITIES = ['info', 'warn', 'error', 'critical'] as const;

export const SECURITY_SEVERITIES = ['low', 'medium', 'high', 'critical'] as const;

export const SECURITY_EVENT_TYPES = [
  'token_reuse',
  'token_reuse_detected',
  'token_family_revoked',
  'account_locked',
  'account_unlocked',
  'password_changed',
  'password_reset_requested',
  'password_reset_completed',
  'email_verification_sent',
  'email_verified',
  'email_changed',
  'login_success',
  'login_failure',
  'logout',
  'suspicious_activity',
  'suspicious_login',
  'magic_link_requested',
  'magic_link_verified',
  'magic_link_failed',
  'oauth_login_success',
  'oauth_login_failure',
  'oauth_account_created',
  'oauth_link_success',
  'oauth_link_failure',
  'oauth_unlink_success',
  'oauth_unlink_failure',
] as const;

export const LEVEL_TONES: Record<string, 'primary' | 'success' | 'warning' | 'danger'> = {
  info: 'primary',
  success: 'success',
  warning: 'warning',
  error: 'danger',
};

export const TENANT_ROLE_TONES: Record<string, 'info' | 'success' | 'warning' | 'danger'> = {
  owner: 'danger',
  admin: 'warning',
  member: 'info',
  viewer: 'success',
};

export const INVITATION_STATUS_TONES: Record<string, 'info' | 'success' | 'warning' | 'danger'> = {
  pending: 'info',
  accepted: 'success',
  revoked: 'danger',
  expired: 'warning',
};

/**
 * ============================================================================
 * 13. API NETWORKING, CACHING & HEADERS
 * Content types, TTLs, rate limits, and standard headers.
 * ============================================================================
 */
export const API_VERSIONS = ['v1', 'v2', 'v3'] as const;

export const STANDARD_HEADERS = {
  REQUEST_ID: 'x-request-id',
  CORRELATION_ID: 'x-correlation-id',
  API_KEY: 'x-api-key',
  FORWARDED_FOR: 'x-forwarded-for',
  IDEMPOTENCY_KEY: 'x-idempotency-key',
} as const;

export const CONTENT_TYPES = {
  JSON: 'application/json',
  FORM_URLENCODED: 'application/x-www-form-urlencoded',
  MULTIPART_FORM_DATA: 'multipart/form-data',
  TEXT: 'text/plain',
  STREAM: 'application/octet-stream',
} as const;

export const CACHE_TTL = {
  MICRO: 5, // 5 seconds (Hot data)
  SHORT: 60, // 1 minute
  MEDIUM: 3600, // 1 hour
  LONG: 86400, // 1 day
  MAX: 2592000, // 30 days
} as const;

export const RATE_LIMIT_WINDOWS = {
  PUBLIC_API: 60 * 15, // 15 minutes
  LOGIN: 60 * 60, // 1 hour
  WEBHOOK: 1, // 1 second (bursts)
} as const;

/**
 * ============================================================================
 * 14. CRYPTOGRAPHY & INFRASTRUCTURE SECURITY
 * Hashing algorithms, CORS, and platform detection.
 * ============================================================================
 */
export const CRYPTO = {
  DEFAULT_SALT_ROUNDS: 12, // For bcrypt/argon2
  TOKEN_BYTES: 32, // For secure random tokens (reset links, etc.)
  HASHING_ALGORITHM: 'argon2id',
} as const;

export const CORS_CONFIG = {
  ALLOWED_METHODS: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'] as const,
  MAX_AGE: 86400, // 24 hours
} as const;

export const PLATFORM_TYPES = ['web', 'ios', 'android', 'desktop', 'api'] as const;
export const DEVICE_TYPES = ['mobile', 'tablet', 'desktop', 'unknown'] as const;

export const HEALTH_STATUS = ['healthy', 'degraded', 'unhealthy', 'maintenance'] as const;
