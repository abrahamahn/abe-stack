// infra/contracts/src/context.ts
/**
 * Shared Context Contracts
 *
 * Defines the minimal context interfaces that all package handlers code against.
 * The server implements these via TypeScript structural subtyping -- no casting
 * required. Module-specific contexts extend BaseContext with their own services.
 *
 * The `db` and `repos` fields use opaque marker interfaces here to avoid a
 * circular dependency (contracts -> db -> core -> contracts). Packages that
 * need the concrete `DbClient` or `Repositories` types import them from
 * `@abe-stack/db` directly. TypeScript's structural subtyping ensures the
 * server's `AppContext` (which provides the concrete types) satisfies
 * `BaseContext` without casting.
 *
 * @module context
 */

import type { BillingService } from './billing/service';
import type { EmailService, Logger, NotificationService, StorageService } from './types';

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
 * The `db` and `repos` fields are typed as `unknown` because contracts
 * cannot import `@abe-stack/db` (circular dependency: contracts -> db ->
 * core -> contracts). Module-specific contexts narrow these to the concrete
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
export interface BaseContext {
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
  /** Client user agent string */
  readonly userAgent: string | undefined;
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
  readonly user?: AuthenticatedUser | undefined;
  /** Request metadata extracted by middleware */
  readonly requestInfo: RequestInfo;
  /** Parsed cookies from the request */
  readonly cookies: Record<string, string | undefined>;
  /** HTTP headers */
  readonly headers: {
    readonly authorization?: string | undefined;
    readonly 'user-agent'?: string | undefined;
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
 * // → structurally satisfies any module context without casting
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
 * Uses the `BillingService` interface from contracts (re-exported from
 * `@abe-stack/core`). The server provides the concrete implementation
 * via Stripe/PayPal providers.
 */
export interface HasBilling {
  readonly billing: BillingService;
}

/**
 * Pub/sub subscription capability.
 *
 * Typed as `unknown` because `SubscriptionManager` lives in `@abe-stack/core`
 * which contracts cannot import (circular dependency). Modules that need
 * pubsub narrow this to the concrete type from `@abe-stack/core`.
 */
export interface HasPubSub {
  readonly pubsub: unknown;
}

/**
 * Cache provider capability.
 *
 * Typed as `unknown` because `CacheProvider` lives in `@abe-stack/cache`
 * (Tier 2), which contracts (Tier 1) cannot import. Modules that need
 * caching narrow this to the concrete type from `@abe-stack/cache`.
 */
export interface HasCache {
  readonly cache: unknown;
}
