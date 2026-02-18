// main/shared/src/core/constants/product.ts

/**
 * @file Product Constants (Re-export Barrel)
 * @description Re-exports domain-specific constants for backward compatibility.
 * @module Core/Constants/Product
 */

import { EMAIL_PROVIDERS, EMAIL_STATUSES, SUBSCRIBABLE_EVENT_TYPES, WEBHOOK_EVENT_TYPES } from '../../engine/constants/platform';
import {
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
  STORAGE_PROVIDERS,
  VIDEO_EXTENSIONS,
} from '../../primitives/constants/media';
import { TIME } from '../../primitives/constants/time';

import {
  APP_ROLES,
  AUTH_EXPIRY,
  COMMON_PASSWORDS,
  defaultPasswordConfig,
  KEYBOARD_PATTERNS,
  LOGIN_FAILURE_REASON,
  OAUTH_PROVIDERS,
} from './auth';
import {
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
import {
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
import {
  ACTOR_TYPES,
  INVITATION_STATUSES,
  PERMISSIONS,
  RESERVED_USERNAMES,
  ROLE_LEVELS,
  TENANT_ROLES,
  USER_STATUSES,
} from './iam';
import {
  AUDIT_CATEGORIES,
  AUDIT_SEVERITIES,
  NOTIFICATION_CHANNELS,
  NOTIFICATION_ENV_PROVIDERS,
  NOTIFICATION_LEVELS,
  NOTIFICATION_PRIORITIES,
  NOTIFICATION_SCHEMA_PROVIDERS,
  NOTIFICATION_TYPES,
} from './notifications';


// ============================================================================
// Domain Re-exports
// ============================================================================

export {
  APP_ROLES,
  AUTH_EXPIRY,
  COMMON_PASSWORDS,
  defaultPasswordConfig,
  KEYBOARD_PATTERNS,
  LOGIN_FAILURE_REASON,
  OAUTH_PROVIDERS,
};

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
};

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
};

export {
  ACTOR_TYPES,
  INVITATION_STATUSES,
  PERMISSIONS,
  RESERVED_USERNAMES,
  ROLE_LEVELS,
  TENANT_ROLES,
  USER_STATUSES,
};

export {
  AUDIT_CATEGORIES,
  AUDIT_SEVERITIES,
  NOTIFICATION_CHANNELS,
  NOTIFICATION_ENV_PROVIDERS,
  NOTIFICATION_LEVELS,
  NOTIFICATION_PRIORITIES,
  NOTIFICATION_SCHEMA_PROVIDERS,
  NOTIFICATION_TYPES,
};

// ============================================================================
// Media / Files (from primitives)
// ============================================================================

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
  STORAGE_PROVIDERS,
  VIDEO_EXTENSIONS,
};

// ============================================================================
// Email & Webhooks (from engine)
// ============================================================================

export { EMAIL_PROVIDERS, EMAIL_STATUSES, SUBSCRIBABLE_EVENT_TYPES, WEBHOOK_EVENT_TYPES };

// ============================================================================
// Time
// ============================================================================

export const PRODUCT_TIME_CONSTANTS = TIME;
