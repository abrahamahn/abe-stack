// backend/server/src/common/constants.ts
/**
 * Centralized constants for security and authentication
 * All magic numbers should be defined here for maintainability
 */

// Time conversion constants
export const MS_PER_SECOND = 1000;
export const SECONDS_PER_MINUTE = 60;
export const MINUTES_PER_HOUR = 60;
export const HOURS_PER_DAY = 24;
export const DAYS_PER_WEEK = 7;

// Derived time constants
export const MS_PER_MINUTE = MS_PER_SECOND * SECONDS_PER_MINUTE;
export const MS_PER_HOUR = MS_PER_MINUTE * MINUTES_PER_HOUR;
export const MS_PER_DAY = MS_PER_HOUR * HOURS_PER_DAY;

export const SECONDS_PER_HOUR = SECONDS_PER_MINUTE * MINUTES_PER_HOUR;
export const SECONDS_PER_DAY = SECONDS_PER_HOUR * HOURS_PER_DAY;

// Security constants
export const MIN_JWT_SECRET_LENGTH = 32; // 256 bits
export const REFRESH_TOKEN_BYTES = 64; // 512 bits

// Progressive delay constants
export const PROGRESSIVE_DELAY_WINDOW_MS = 5 * MS_PER_MINUTE; // 5 minutes
export const MAX_PROGRESSIVE_DELAY_MS = 30 * MS_PER_SECOND; // 30 seconds

// Cookie names - should match authConfig.cookie.name
export const REFRESH_COOKIE_NAME = "refreshToken";
export const CSRF_COOKIE_NAME = "_csrf";

// HTTP status codes (for clarity)
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
} as const;

// Error messages (for consistency and i18n readiness)
export const ERROR_MESSAGES = {
  INTERNAL_ERROR: "Internal server error",
  INVALID_CREDENTIALS: "Invalid email or password",
  EMAIL_ALREADY_REGISTERED: "Email already registered",
  USER_NOT_FOUND: "User not found",
  ACCOUNT_LOCKED:
    "Account temporarily locked due to too many failed attempts. Please try again later.",
  WEAK_PASSWORD: "Password is too weak",
  INVALID_TOKEN: "Invalid or expired token",
  NO_REFRESH_TOKEN: "No refresh token provided",
  FAILED_USER_CREATION: "Failed to create user",
  FAILED_TOKEN_FAMILY: "Failed to create refresh token family",
  UNAUTHORIZED: "Unauthorized",
  FORBIDDEN: "Forbidden - insufficient permissions",
  MISSING_AUTH_HEADER: "Missing or invalid authorization header",
  INVALID_OR_EXPIRED_TOKEN: "Invalid or expired token",
} as const;

// Success messages
export const SUCCESS_MESSAGES = {
  LOGGED_OUT: "Logged out successfully",
  ACCOUNT_UNLOCKED: "Account unlocked successfully",
  EMAIL_VERIFICATION_NOT_IMPLEMENTED: "Email verification not implemented",
} as const;

// Lockout failure reasons (for audit logging)
export const FAILURE_REASONS = {
  ACCOUNT_LOCKED: "Account locked",
  USER_NOT_FOUND: "User not found",
  INVALID_PASSWORD: "Invalid password",
  TOKEN_EXPIRED: "Token expired",
  TOKEN_REUSED: "Token reuse detected",
  TOKEN_REVOKED: "Token family revoked",
} as const;
