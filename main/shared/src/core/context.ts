// main/shared/src/core/context.ts
/**
 * Shared Context Contracts
 *
 * Defines the minimal context interfaces that all package handlers code against.
 * The server implements these via TypeScript structural subtyping -- no casting
 * required. Module-specific contexts extend BaseContext with their own services.
 *
 * The `db` and `repos` fields use opaque marker interfaces here to avoid a
 * circular dependency (core -> db -> core). Packages that need the concrete
 * `DbClient` or `Repositories` types import them from `@abe-stack/db` directly.
 * TypeScript's structural subtyping ensures the server's `AppContext` (which
 * provides the concrete types) satisfies `BaseContext` without casting.
 *
 * @module context
 */

import type { Logger } from '../primitives/api';
import type { HasErrorTracker } from './observability';
import type { EmailService, NotificationService, StorageService } from './ports';

// ============================================================================
// Base Context
// ============================================================================

/**
 * Minimal context all handler contexts must provide.
 *
 * Every module in the monorepo needs database access, repository access,
 * and a logger. Optional services (email, storage, billing, pubsub) belong
 * in module-specific contexts that extend this interface.
 *
 * The `db` and `repos` fields are typed as `unknown` because core
 * cannot import `@abe-stack/db` (circular dependency: core -> db ->
 * core). Module-specific contexts narrow these to the concrete
 * `DbClient` and `Repositories` types from `@abe-stack/db`.
 *
 * The server's `AppContext` structurally satisfies `BaseContext` (it has
 * `db`, `repos`, `log` plus additional services), so handlers can accept
 * either the narrow or wide type without casting.
 *
 * @example
 * ```typescript
 * import type { DbClient, Repositories } from '@abe-stack/db';
 *
 * interface AuthContext extends BaseContext {
 *   readonly db: DbClient;
 *   readonly repos: Repositories;
 *   readonly email: AuthEmailService;
 *   readonly config: { readonly auth: AuthConfig };
 * }
 * ```
 */
export interface BaseContext extends HasErrorTracker {
  /** Database client for executing queries and transactions */
  readonly db: unknown;
  /** Repository layer for structured database access */
  readonly repos: unknown;
  /** Logger instance for structured logging */
  readonly log: Logger;
}

// ============================================================================
// Authenticated User
// ============================================================================

/**
 * Authenticated user info set by auth middleware.
 *
 * Present on request objects after successful JWT validation.
 * All fields are readonly to prevent accidental mutation.
 */
export interface AuthenticatedUser {
  /** User's unique identifier */
  readonly userId: string;
  /** User's email address */
  readonly email: string;
  /** User's role (e.g. 'user', 'admin') */
  readonly role: string;
}

// ============================================================================
// Request Metadata
// ============================================================================

/**
 * Request metadata extracted by middleware.
 *
 * Provides client identity information for security logging,
 * rate limiting, and audit trails.
 */
export interface RequestInfo {
  /** Client IP address (from Fastify's request.ip, respects trustProxy) */
  readonly ipAddress: string;
  /** Client user agent string (may be undefined for some clients) */
  readonly userAgent?: string;
  /** Device identifier (optional, set by client SDK) */
  readonly deviceId?: string;
}

// ============================================================================
// Request Context
// ============================================================================

/**
 * Framework-agnostic request context for package handlers.
 *
 * Abstracts the HTTP request so packages don't depend on Fastify's
 * request type directly. The server maps `FastifyRequest` to this
 * interface when invoking package handlers.
 */
export interface RequestContext {
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
}

// ============================================================================
// Reply Context
// ============================================================================

/**
 * Framework-agnostic reply context for handlers that set cookies.
 *
 * Auth handlers need to set/clear HTTP-only refresh token cookies.
 * This interface abstracts the reply object so the auth package
 * doesn't depend on Fastify's reply type directly.
 */
export interface ReplyContext {
  /**
   * Set a cookie on the response.
   *
   * @param name - Cookie name
   * @param value - Cookie value
   * @param options - Cookie options (httpOnly, secure, sameSite, etc.)
   */
  setCookie: (name: string, value: string, options: Record<string, unknown>) => void;

  /**
   * Clear a cookie from the response.
   *
   * @param name - Cookie name
   * @param options - Cookie options (path, etc.)
   */
  clearCookie: (name: string, options: Record<string, unknown>) => void;
}

// ============================================================================
// Capability Interfaces (Context Composition Pattern)
// ============================================================================

/**
 * Capability interfaces for composing module-specific contexts.
 *
 * Instead of each module independently defining its full context type,
 * modules compose BaseContext with only the capabilities they need:
 *
 * @example
 * ```typescript
 * // Auth needs email + cookie support
 * type AuthContext = BaseContext & HasEmail & {
 *   readonly emailTemplates: AuthEmailTemplates;
 *   readonly config: { readonly auth: AuthConfig };
 * };
 *
 * // Users needs storage for avatars
 * type UsersContext = BaseContext & HasStorage & {
 *   readonly config: { readonly auth: UsersAuthConfig };
 * };
 *
 * // Server's AppContext implements all capabilities:
 * // AppContext extends IServiceContainer (which has email, storage, billing, etc.)
 * // -> structurally satisfies any module context without casting
 * ```
 */

/** Email sending capability */
export interface HasEmail {
  readonly email: EmailService;
}

/** File storage capability */
export interface HasStorage {
  readonly storage: StorageService;
}

/** Push notification capability */
export interface HasNotifications {
  readonly notifications: NotificationService;
}

/**
 * Billing/payment capability.
 *
 * Uses `unknown` because the concrete `BillingService` type lives in
 * `domain/billing` which core cannot import (hexagonal boundary).
 * Modules that need billing narrow this to the concrete type:
 *
 * @example
 * ```typescript
 * import type { BillingService } from '@abe-stack/shared/domain';
 * type BillingContext = BaseContext & { readonly billing: BillingService };
 * ```
 */
export interface HasBilling {
  readonly billing: unknown;
}

/**
 * Pub/sub subscription capability.
 *
 * Typed as `unknown` because `SubscriptionManager` lives in `@abe-stack/shared`
 * utils which core cannot import (circular). Modules that need
 * pubsub narrow this to the concrete type from `@abe-stack/shared`.
 */
export interface HasPubSub {
  readonly pubsub: unknown;
}

/**
 * Cache provider capability.
 *
 * Typed as `unknown` because `CacheProvider` lives in `@abe-stack/cache`
 * (Tier 2), which core (Tier 1) cannot import. Modules that need
 * caching narrow this to the concrete type from `@abe-stack/cache`.
 */
export interface HasCache {
  readonly cache: unknown;
}

/**
 * Background job queue capability.
 *
 * Typed as `unknown` because `QueueServer` lives in `@abe-stack/server-engine`
 * (Tier 2), which core (Tier 1) cannot import. Modules that need
 * queueing narrow this to the concrete type.
 */
export interface HasQueue {
  readonly queue: unknown;
}
