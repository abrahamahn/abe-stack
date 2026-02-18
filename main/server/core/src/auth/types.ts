// main/server/core/src/auth/types.ts
// Re-export LOGIN_FAILURE_REASON from shared (canonical source)
export {
  LOGIN_FAILURE_REASON,
  REFRESH_TOKEN_COOKIE_NAME as REFRESH_COOKIE_NAME,
  type LoginFailureReason
} from '@bslt/shared';

/**
 * Auth Module Types
 *
 * Dependency interface and shared types for the auth module.
 * The server provides these dependencies when registering the auth module.
 *
 * Uses shared context contracts from `@bslt/shared` to eliminate
 * duplicate Logger, RequestInfo, and reply/request interfaces across packages.
 *
 * @module types
 */

import { MS_PER_MINUTE, MS_PER_SECOND } from '@bslt/shared';

import type {
  AuthenticatedUser,
  BaseContext,
  EmailOptions,
  ReplyContext,
  RequestContext,
  RequestInfo,
  SendResult,
  ServerLogger
} from '@bslt/shared';
import type { DbClient, Repositories } from '../../../db/src';
import type { SmsProvider } from '../../../engine/src';

// ============================================================================
// Logger Interface
// ============================================================================

/**
 * Logger interface used by the auth module.
 *
 * Extends `ServerLogger` (which itself extends `Logger` with a required
 * `child` method) with required `trace` and `fatal` methods.
 * Auth requires these for security audit logging.
 *
 * @complexity O(1) per log call
 */
export interface AuthLogger extends ServerLogger {
  /** Log an info-level message */
  info(msg: string, data?: Record<string, unknown>): void;
  /** Log an info-level message with structured data first (Pino convention) */
  info(data: Record<string, unknown>, msg: string): void;
  /** Log a warn-level message */
  warn(msg: string, data?: Record<string, unknown>): void;
  /** Log a warn-level message with structured data first (Pino convention) */
  warn(data: Record<string, unknown>, msg: string): void;
  /** Log an error-level message */
  error(msg: string | Error, data?: Record<string, unknown>): void;
  /** Log an error-level message with structured data first (Pino convention) */
  error(data: unknown, msg?: string): void;
  /** Log a debug-level message */
  debug(msg: string, data?: Record<string, unknown>): void;
  /** Log a debug-level message with structured data first (Pino convention) */
  debug(data: Record<string, unknown>, msg: string): void;
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
 * Matches the EmailOptions from @bslt/shared.
 */
export type AuthEmailOptions = EmailOptions;

/**
 * Email service interface used by the auth module.
 * Matches the EmailService from @bslt/shared.
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
  send(options: AuthEmailOptions): Promise<SendResult>;
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

  /**
   * New login "Was this you?" alert email
   *
   * @param ipAddress - IP address of the login
   * @param userAgent - Browser/device of the login
   * @param timestamp - When the login occurred
   * @returns Email template data
   */
  newLoginAlert(ipAddress: string, userAgent: string, timestamp: Date): EmailTemplateResult;

  /**
   * Password changed "Was this you?" alert email
   *
   * @param ipAddress - IP address of the request
   * @param userAgent - Browser/device of the request
   * @param timestamp - When the change occurred
   * @returns Email template data
   */
  passwordChangedAlert(ipAddress: string, userAgent: string, timestamp: Date): EmailTemplateResult;

  /**
   * Email changed "Was this you?" alert email (sent to OLD email)
   *
   * @param newEmail - The new email address
   * @param ipAddress - IP address of the request
   * @param userAgent - Browser/device of the request
   * @param timestamp - When the change occurred
   * @returns Email template data
   */
  emailChangedAlert(
    newEmail: string,
    ipAddress: string,
    userAgent: string,
    timestamp: Date,
    revertUrl?: string,
  ): EmailTemplateResult;

  /**
   * Generic security notification email template
   *
   * @param type - Type of security event (e.g., "Password Changed from New Device")
   * @param details - Description of the event
   * @param actionUrl - URL for user to secure their account
   * @returns Email template data
   */
  securityNotification(type: string, details: string, actionUrl: string): EmailTemplateResult;
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
 * Transition alias for `ReplyContext` from contracts.
 * Existing code importing `ReplyWithCookies` from this module continues
 * working without changes. New code should import `ReplyContext` from
 * `@bslt/shared` directly.
 */
export type ReplyWithCookies = ReplyContext;

/**
 * Fastify request with cookie support and auth context.
 *
 * Extends `RequestContext` from contracts with auth-specific fields
 * (`ip`, `requestStart`) that the auth module reads from Fastify requests.
 *
 * Note: Properties from RequestContext are explicitly re-declared here
 * due to TypeScript's exactOptionalPropertyTypes mode not properly
 * inheriting optional properties from extended interfaces.
 */
export interface RequestWithCookies extends RequestContext {
  /** Authenticated user info (set by auth middleware, undefined for public routes) */
  readonly user?: AuthenticatedUser;
  /** Request metadata extracted by middleware */
  readonly requestInfo: RequestInfo;
  /** Parsed cookies from the request */
  readonly cookies: Record<string, string | undefined>;
  /** HTTP headers */
  readonly headers: {
    readonly authorization?: string;
    readonly 'user-agent'?: string;
    readonly [key: string]: string | string[] | undefined;
  };
  /** Client IP address (from Fastify's request.ip, respects trustProxy) */
  readonly ip?: string | undefined;
  /** Start time for request timing in development (bigint from process.hrtime.bigint()) */
  readonly requestStart?: bigint | undefined;
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
  /** Storage service for file uploads */
  readonly storage: unknown;
  /** Pub/sub for events */
  readonly pubsub: unknown;
  /** SMS provider for phone verification (optional) */
  readonly sms?: SmsProvider | undefined;
  /** Application configuration */
  readonly config: {
    readonly auth: import('@bslt/server-engine/config').AuthConfig;
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

/** Progressive delay window in milliseconds (5 minutes) */
export const PROGRESSIVE_DELAY_WINDOW_MS = 5 * MS_PER_MINUTE;

/** Maximum progressive delay in milliseconds (30 seconds) */
export const MAX_PROGRESSIVE_DELAY_MS = 30 * MS_PER_SECOND;

// ============================================================================
// Error Response Adapter
// ============================================================================

/**
 * Adapts an AppContext logger to the ErrorMapperLogger interface
 * used by @bslt/shared's mapErrorToHttpResponse.
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
        log.error(context as Record<string, unknown>, message);
      } else {
        log.error(context as Record<string, unknown>);
      }
    },
  };
}
