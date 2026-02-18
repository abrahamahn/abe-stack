// main/shared/src/system/constants/platform.ts

import type { ErrorCode } from '../../primitives/api';

/**
 * Platform Constants
 * - auth header/cookie/ws path
 * - http headers, cache/rate-limit, cors
 * - health/platform/device type
 * - job statuses/priorities
 * - error codes/messages
 * - logging/ansi
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

export const ACCESS_TOKEN_COOKIE_NAME = AUTH_CONSTANTS.ACCESS_TOKEN_COOKIE_NAME;
export const API_PREFIX = AUTH_CONSTANTS.API_PREFIX;
export const CSRF_COOKIE_NAME = AUTH_CONSTANTS.CSRF_COOKIE_NAME;
export const REFRESH_TOKEN_COOKIE_NAME = AUTH_CONSTANTS.REFRESH_TOKEN_COOKIE_NAME;
export const SUDO_TOKEN_HEADER = AUTH_CONSTANTS.SUDO_TOKEN_HEADER;
export const WEBSOCKET_PATH = AUTH_CONSTANTS.WEBSOCKET_PATH;
export const WS_CLOSE_POLICY_VIOLATION = AUTH_CONSTANTS.WS_CLOSE_POLICY_VIOLATION;

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

export const API_VERSIONS = ['v1', 'v2', 'v3'] as const;

export const STANDARD_HEADERS = {
  REQUEST_ID: 'x-request-id',
  CORRELATION_ID: 'x-correlation-id',
  API_KEY: 'x-api-key',
  FORWARDED_FOR: 'x-forwarded-for',
  IDEMPOTENCY_KEY: 'x-idempotency-key',
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

/**
 * Jobs / Queues
 */
export const JOB_PRIORITIES = ['low', 'normal', 'high', 'critical'] as const;

export const JOB_PRIORITY_VALUES = {
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
 * Email
 */
export const EMAIL_STATUSES = ['queued', 'sent', 'delivered', 'bounced', 'failed'] as const;
export const EMAIL_PROVIDERS = ['smtp', 'ses', 'sendgrid', 'console'] as const;

/**
 * Webhook delivery statuses
 */
export const WEBHOOK_DELIVERY_STATUSES = ['pending', 'delivered', 'failed', 'dead'] as const;
export const TERMINAL_DELIVERY_STATUSES: ReadonlySet<string> = new Set(['delivered', 'dead']);

/**
 * Webhook event types
 */
export const WEBHOOK_EVENT_TYPES = {
  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',
  USER_DELETED: 'user.deleted',
  TENANT_CREATED: 'tenant.created',
  TENANT_UPDATED: 'tenant.updated',
  TENANT_DELETED: 'tenant.deleted',
  SUBSCRIPTION_CREATED: 'subscription.created',
  SUBSCRIPTION_UPDATED: 'subscription.updated',
  SUBSCRIPTION_CANCELLED: 'subscription.cancelled',
  INVOICE_PAID: 'invoice.paid',
  INVOICE_FAILED: 'invoice.failed',
} as const;

export const SUBSCRIBABLE_EVENT_TYPES = Object.values(WEBHOOK_EVENT_TYPES);

/**
 * HTTP / Errors
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
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  EMAIL_SEND_FAILED: 'EMAIL_SEND_FAILED',
  RATE_LIMITED: 'RATE_LIMITED',
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  TOS_ACCEPTANCE_REQUIRED: 'TOS_ACCEPTANCE_REQUIRED',
} as const satisfies Record<string, ErrorCode>;

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

/**
 * Logging / ANSI
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
