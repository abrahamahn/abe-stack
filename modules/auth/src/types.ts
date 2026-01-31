// modules/auth/src/types.ts
/**
 * Auth Module Types
 *
 * Dependency interface and shared types for the auth module.
 * The server provides these dependencies when registering the auth module.
 *
 * Uses shared context contracts from `@abe-stack/contracts` to eliminate
 * duplicate Logger, RequestInfo, and reply/request interfaces across packages.
 *
 * @module types
 */

import type { BaseContext, Logger, ReplyContext, RequestContext } from '@abe-stack/contracts';
import type { DbClient, Repositories } from '@abe-stack/db';

// ============================================================================
// Logger Interface
// ============================================================================

/**
 * Logger interface used by the auth module.
 *
 * Extends the shared `Logger` contract with required `trace`, `fatal`,
 * and `child` methods. The contracts `Logger` marks these as optional;
 * auth requires them for security audit logging.
 *
 * @complexity O(1) per log call
 */
export interface AuthLogger extends Logger {
  /** Log a trace-level message */
  trace(msg: string, data?: Record<string, unknown>): void;
  /** Log a trace-level message with structured data first */
  trace(data: Record<string, unknown>, msg: string): void;
  /** Log a fatal-level message */
  fatal(msg: string | Error, data?: Record<string, unknown>): void;
  /** Log a fatal-level message with structured data first */
  fatal(data: Record<string, unknown>, msg: string): void;
  /**
   * Create a child logger with additional bindings
   *
   * @param bindings - Key-value pairs to attach to all child log entries
   * @returns A new logger instance with the bindings
   */
  child(bindings: Record<string, unknown>): AuthLogger;
}

// ============================================================================
// Email Service Interface
// ============================================================================

/**
 * Email options for sending messages.
 * Matches the EmailOptions from @abe-stack/contracts.
 */
export interface AuthEmailOptions {
  /** Recipient email address */
  readonly to: string;
  /** Email subject line */
  readonly subject: string;
  /** HTML body content */
  readonly html?: string | undefined;
  /** Plain text body content */
  readonly text?: string | undefined;
}

/**
 * Email service interface used by the auth module.
 * Matches the EmailService from @abe-stack/contracts.
 *
 * @complexity O(1) per send call (async I/O)
 */
export interface AuthEmailService {
  /**
   * Send an email.
   *
   * @param options - Email options including recipient, subject, and body
   * @returns Result indicating success or failure
   * @throws When the email transport encounters a fatal error
   */
  send(options: AuthEmailOptions): Promise<{ success: boolean; messageId?: string }>;
}

// ============================================================================
// Email Templates Interface
// ============================================================================

/**
 * Email template result with optional `to` field.
 * Templates return a partial email options object (without recipient).
 */
export interface EmailTemplateResult {
  readonly subject: string;
  readonly html?: string | undefined;
  readonly text?: string | undefined;
  readonly to: string;
}

/**
 * Email templates used by the auth module.
 * The server provides concrete template implementations.
 *
 * @complexity O(1) per template call (string concatenation)
 */
export interface AuthEmailTemplates {
  /**
   * Password reset email template
   *
   * @param resetUrl - URL for the password reset link
   * @param expiresInMinutes - Token expiry in minutes
   * @returns Email template data
   */
  passwordReset(resetUrl: string, expiresInMinutes?: number): EmailTemplateResult;

  /**
   * Magic link email template
   *
   * @param loginUrl - URL for the magic link
   * @param expiresInMinutes - Token expiry in minutes
   * @returns Email template data
   */
  magicLink(loginUrl: string, expiresInMinutes?: number): EmailTemplateResult;

  /**
   * Email verification template
   *
   * @param verifyUrl - URL for email verification
   * @param expiresInMinutes - Token expiry in minutes
   * @returns Email template data
   */
  emailVerification(verifyUrl: string, expiresInMinutes?: number): EmailTemplateResult;

  /**
   * Existing account registration attempt notification
   *
   * @param email - The email that was used in the registration attempt
   * @returns Email template data
   */
  existingAccountRegistrationAttempt(email: string): EmailTemplateResult;

  /**
   * Token reuse security alert email
   *
   * @param ipAddress - IP address of the suspicious request
   * @param userAgent - User agent of the suspicious request
   * @param timestamp - When the suspicious activity was detected
   * @returns Email template data
   */
  tokenReuseAlert(ipAddress: string, userAgent: string, timestamp: Date): EmailTemplateResult;
}

// ============================================================================
// Auth Module Dependencies
// ============================================================================

/**
 * Auth module dependencies.
 * These are provided by the server composition root.
 *
 * @example
 * ```typescript
 * const deps: AuthModuleDeps = {
 *   db: createDbClient(connectionString),
 *   repos: createRepositories(db),
 *   logger: createLogger('auth'),
 *   email: createEmailService(emailConfig),
 *   emailTemplates: emailTemplates,
 * };
 * ```
 */
export interface AuthModuleDeps {
  /** Database client for executing queries and transactions */
  readonly db: DbClient;
  /** Repository layer for structured database access */
  readonly repos: Repositories;
  /** Logger instance for auth module logging */
  readonly logger: AuthLogger;
  /** Email service for sending auth-related emails */
  readonly email: AuthEmailService;
  /** Email templates for auth-related emails */
  readonly emailTemplates: AuthEmailTemplates;
}

// ============================================================================
// Fastify Request/Reply Extensions (Transition Aliases)
// ============================================================================

/**
 * Fastify reply with cookie support.
 *
 * Transition alias for `ReplyContext` from `@abe-stack/contracts`.
 * Existing code importing `ReplyWithCookies` from this module continues
 * working without changes. New code should import `ReplyContext` from
 * `@abe-stack/contracts` directly.
 */
export type ReplyWithCookies = ReplyContext;

/**
 * Request info extracted by middleware.
 *
 * Re-exported from `@abe-stack/contracts` for backward compatibility.
 * New code should import `RequestInfo` from `@abe-stack/contracts` directly.
 */
export type { RequestInfo } from '@abe-stack/contracts';

/**
 * Fastify request with cookie support and auth context.
 *
 * Extends `RequestContext` from contracts with auth-specific fields
 * (`ip`, `requestStart`) that the auth module reads from Fastify requests.
 */
export interface RequestWithCookies extends RequestContext {
  /** Client IP address (from Fastify's request.ip, respects trustProxy) */
  ip?: string | undefined;
  /** Start time for request timing in development (bigint from process.hrtime.bigint()) */
  requestStart?: bigint | undefined;
}

// ============================================================================
// App Context (Server-Provided)
// ============================================================================

/**
 * Application context provided by the server to auth handlers.
 *
 * Extends `BaseContext` from contracts with auth-specific services
 * (email, templates, config). The server's `AppContext` structurally
 * satisfies this -- no casting needed.
 */
export interface AppContext extends BaseContext {
  /** Database client (narrowed from BaseDbClient to full DbClient) */
  readonly db: DbClient;
  /** Repository layer (narrowed from BaseRepositories to full Repositories) */
  readonly repos: Repositories;
  /** Logger (narrowed to AuthLogger which requires trace/fatal/child) */
  readonly log: AuthLogger;
  /** Email service */
  readonly email: AuthEmailService;
  /** Email templates */
  readonly emailTemplates: AuthEmailTemplates;
  /** Application configuration */
  readonly config: {
    readonly auth: import('@abe-stack/core').AuthConfig;
    readonly server: {
      readonly appBaseUrl: string;
    };
  };
}

// ============================================================================
// Shared Constants
// ============================================================================

/** Minimum length for JWT secrets (256 bits) */
export const MIN_JWT_SECRET_LENGTH = 32;

/** Number of random bytes for refresh tokens (512 bits) */
export const REFRESH_TOKEN_BYTES = 64;

/** Name of the refresh token cookie */
export const REFRESH_COOKIE_NAME = 'refreshToken';

/** Progressive delay window in milliseconds (5 minutes) */
export const PROGRESSIVE_DELAY_WINDOW_MS = 5 * 60 * 1000;

/** Maximum progressive delay in milliseconds (30 seconds) */
export const MAX_PROGRESSIVE_DELAY_MS = 30 * 1000;

// ============================================================================
// Error Messages
// ============================================================================

/**
 * Standardized error messages for auth operations.
 *
 * @complexity O(1) constant access
 */
export const ERROR_MESSAGES = {
  // General
  INTERNAL_ERROR: 'Internal server error',
  NOT_FOUND: 'Resource not found',
  BAD_REQUEST: 'Bad request',

  // Authentication
  INVALID_CREDENTIALS: 'Invalid email or password',
  EMAIL_ALREADY_REGISTERED: 'Email already registered',
  USER_NOT_FOUND: 'User not found',
  ACCOUNT_LOCKED:
    'Account temporarily locked due to too many failed attempts. Please try again later.',
  WEAK_PASSWORD: 'Password is too weak',
  INVALID_TOKEN: 'Invalid or expired token',
  NO_REFRESH_TOKEN: 'No refresh token provided',
  UNAUTHORIZED: 'Unauthorized',
  FORBIDDEN: 'Forbidden - insufficient permissions',
  MISSING_AUTH_HEADER: 'Missing or invalid authorization header',
  INVALID_OR_EXPIRED_TOKEN: 'Invalid or expired token',

  // User operations
  FAILED_USER_CREATION: 'Failed to create user',
  FAILED_TOKEN_FAMILY: 'Failed to create refresh token family',

  // OAuth
  OAUTH_STATE_MISMATCH: 'OAuth state mismatch - possible CSRF attack',
  OAUTH_CODE_MISSING: 'OAuth authorization code missing',
  OAUTH_PROVIDER_ERROR: 'OAuth provider returned an error',

  // Magic Link
  MAGIC_LINK_EXPIRED: 'Magic link has expired',
  MAGIC_LINK_INVALID: 'Invalid magic link',
  MAGIC_LINK_ALREADY_USED: 'Magic link has already been used',

  // Email
  EMAIL_VERIFICATION_NOT_IMPLEMENTED: 'Email verification not implemented',
  EMAIL_SEND_FAILED: 'Failed to send email. Please try again or use the resend option.',
} as const;

// ============================================================================
// Success Messages
// ============================================================================

/**
 * Standardized success messages for auth operations.
 *
 * @complexity O(1) constant access
 */
export const SUCCESS_MESSAGES = {
  LOGGED_OUT: 'Logged out successfully',
  ACCOUNT_UNLOCKED: 'Account unlocked successfully',
  PASSWORD_RESET_SENT: 'Password reset email sent',
  VERIFICATION_EMAIL_SENT:
    'Verification email sent. Please check your inbox and click the confirmation link.',
  MAGIC_LINK_SENT: 'Magic link sent to your email',
} as const;

// ============================================================================
// Error Response Adapter
// ============================================================================

/**
 * Adapts an AppContext logger to the ErrorMapperLogger interface
 * used by @abe-stack/core's mapErrorToHttpResponse.
 *
 * @param log - Auth logger instance
 * @returns ErrorMapperLogger-compatible object
 * @complexity O(1)
 */
export function createErrorMapperLogger(log: AuthLogger): {
  warn: (context: Record<string, unknown>, message: string) => void;
  error: (context: unknown, message?: string) => void;
} {
  return {
    warn: (context: Record<string, unknown>, message: string): void => {
      log.warn(context, message);
    },
    error: (context: unknown, message?: string): void => {
      if (message !== undefined && message !== '') {
        log.error(context, message);
      } else {
        log.error(context);
      }
    },
  };
}
