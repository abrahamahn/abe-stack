// main/shared/src/core/constants/index.ts

/**
 * @file Constants Barrel
 * @description Re-exports all core constant modules.
 * @module Core/Constants
 */

// --- auth ---
export {
  APP_ROLES,
  AUTH_EXPIRY,
  COMMON_PASSWORDS,
  defaultPasswordConfig,
  KEYBOARD_PATTERNS,
  LOGIN_FAILURE_REASON,
  OAUTH_PROVIDERS,
} from './auth';

// --- billing ---
export {
  BILLING_EVENT_TYPES,
  BILLING_PROVIDERS,
  CENTS_PER_DOLLAR,
  FEATURE_KEYS,
  INVOICE_STATUSES,
  LIMIT_FEATURE_KEYS,
  PAYMENT_METHOD_TYPES,
  PLAN_FEES,
  PLAN_INTERVALS,
  SUBSCRIPTION_STATUSES,
  TOGGLE_FEATURE_KEYS,
} from './billing';

// --- compliance ---
export {
  ACCOUNT_DELETION_GRACE_PERIOD_DAYS,
  CONSENT_TYPES,
  DATA_EXPORT_STATUSES,
  DATA_EXPORT_TYPES,
  DEFAULT_GRACE_PERIOD_DAYS,
  DELETION_STATES,
  DOCUMENT_TYPES,
  RETENTION_PERIODS,
  USERNAME_CHANGE_COOLDOWN_DAYS,
} from './compliance';

// --- i18n ---
export {
  CURRENCIES,
  LOCALES,
  type Currency,
  type Locale,
} from './i18n';

// --- iam ---
export {
  ACTOR_TYPES,
  INVITATION_STATUSES,
  PERMISSIONS,
  RESERVED_USERNAMES,
  ROLE_LEVELS,
  TENANT_ROLES,
  USER_STATUSES,
} from './iam';

// --- notifications ---
export {
  AUDIT_CATEGORIES,
  AUDIT_SEVERITIES,
  NOTIFICATION_CHANNELS,
  NOTIFICATION_ENV_PROVIDERS,
  NOTIFICATION_LEVELS,
  NOTIFICATION_PRIORITIES,
  NOTIFICATION_SCHEMA_PROVIDERS,
  NOTIFICATION_TYPES,
} from './notifications';

// --- policy ---
export { PROTECTED_FIELDS } from './policy';

// --- product (backward-compat re-exports from primitives/engine) ---
export {
  ALL_MEDIA_EXTENSIONS,
  ALLOWED_IMAGE_MIME_TYPES,
  ALLOWED_MEDIA_MIME_TYPES,
  AUDIO_EXTENSIONS,
  EXT_TO_MIME,
  EXTRA_EXT_TO_MIME,
  FILE_PURPOSES,
  IMAGE_EXTENSIONS,
  MAGIC_NUMBERS,
  MIME_TO_EXT,
  PRODUCT_TIME_CONSTANTS,
  STORAGE_PROVIDERS,
  VIDEO_EXTENSIONS,
} from './product';

// --- ui-defaults ---
export {
  DEFAULT_CONTRAST_MODE,
  DEFAULT_DENSITY,
  DEFAULT_THEME,
} from './ui-defaults';
