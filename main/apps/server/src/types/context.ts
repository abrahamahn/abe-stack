// main/apps/server/src/types/context.ts

import type {
    DbClient,
    QueueServer,
    QueueStore,
    Repositories,
    ServerSearchProvider,
    SessionContext,
    SmsProvider,
    WriteService
} from '@abe-stack/core';
import type { AuthEmailTemplates } from '@abe-stack/server-engine';
import type {
    BaseContext,
    BillingService,
    CacheProvider,
    EmailService,
    ErrorTracker,
    NotificationService,
    ReplyContext,
    RequestInfo,
    StorageClient,
    SubscriptionManager,
} from '@abe-stack/shared';
import type { AppConfig } from '@abe-stack/shared/config';
import type { FastifyBaseLogger } from 'fastify';

// ============================================================================
// Fastify Request/Reply Extensions
// ============================================================================

/**
 * Fastify-specific reply augmentation.
 *
 * Structurally identical to `ReplyContext` from `@abe-stack/shared`,
 * but kept as a distinct type alias for Fastify's `declare module` augmentation.
 */
export type ReplyWithCookies = ReplyContext;

/**
 * Fastify-specific request augmentation.
 *
 * Uses `RequestInfo` from `@abe-stack/shared` for client metadata.
 * Extends the framework-agnostic `RequestContext` with Fastify-specific
 * properties (ip, requestStart, context).
 */
export interface RequestWithCookies {
  cookies: Record<string, string | undefined>;
  headers: {
    authorization?: string | undefined;
    'user-agent'?: string | undefined;
    [key: string]: string | string[] | undefined;
  };
  /** Client IP address (from Fastify's request.ip, respects trustProxy) */
  ip?: string | undefined;
  user?: { userId: string; email: string; role: string; tenantId?: string } | undefined;
  /** Request info extracted by middleware (IP address, user agent) */
  requestInfo: RequestInfo;
  /** Start time for request timing in development (bigint from process.hrtime.bigint()) */
  requestStart?: bigint | undefined;
  /** Application Context (Hybrid Pattern) - Available on request via hook */
  context?: AppContext | undefined;
}

// ============================================================================
// Service Container Interface (Composition Root)
// ============================================================================

/**
 * Service Container Interface
 *
 * Defines the contract for the application's dependency injection container.
 * The App class implements this interface, providing a single source of truth
 * for all infrastructure services.
 */
export interface IServiceContainer {
  /** Application configuration */
  readonly config: AppConfig;

  /** Database client (raw SQL query builder) */
  readonly db: DbClient;

  /** Database repositories */
  readonly repos: Repositories;

  /** Email service for sending notifications */
  readonly email: EmailService;

  /** Storage provider for file uploads */
  readonly storage: StorageClient;

  /** Pub/sub manager for real-time subscriptions */
  readonly pubsub: SubscriptionManager;

  /** Cache provider for performance optimization */
  readonly cache: CacheProvider;

  /** Billing provider for payments/subscriptions */
  readonly billing: BillingService;

  /** Notification service for push/email */
  readonly notifications: NotificationService;

  /** Background job queue server */
  readonly queue: QueueServer;

  /** Queue store (for task cleanup) */
  readonly queueStore: QueueStore;


  /** Unified write service (Chet-stack pattern) */
  readonly write: WriteService;

  /** Server-side search provider */
  readonly search: ServerSearchProvider;

  /** Auth email templates (used by auth package handlers) */
  readonly emailTemplates: AuthEmailTemplates;

  /** SMS provider for phone verification (optional — gracefully degrades) */
  readonly sms?: SmsProvider | undefined;

  /** Error tracking and observability */
  readonly errorTracker: ErrorTracker;

  /**
   * Create a contextualized version of the service container for Row-Level Security.
   */
  contextualize(session: SessionContext): AppContext;
}

/**
 * Interface for services that provide an AppContext
 */
export interface HasContext {
  readonly context: AppContext;
}

// ============================================================================
// App Context (Handler Interface)
// ============================================================================

/**
 * Application context passed to all handlers.
 *
 * Extends `IServiceContainer` with runtime-specific dependencies (logger).
 * Structurally satisfies `BaseContext` from `@abe-stack/shared` --
 * verified at compile time via `AppContextSatisfiesBaseContext` below.
 *
 * Package handlers accept `BaseContext` (or module-specific extensions);
 * the server passes `AppContext` which structurally satisfies all of them
 * -- no casting needed.
 *
 * Note: Cannot use `extends BaseContext` directly because TypeScript's
 * interface `extends` requires identically-typed properties across parents.
 * `IServiceContainer.db` is `DbClient` while `BaseContext.db` is `unknown`.
 * These are compatible (DbClient assignable to unknown) but not identical.
 *
 * @see {@link BaseContext} from `@abe-stack/shared`
 */
export interface AppContext extends IServiceContainer {
  /** Logger instance (from Fastify's Pino logger) */
  log: FastifyBaseLogger;
}

/**
 * Compile-time verification: AppContext structurally satisfies BaseContext.
 *
 * If `AppContext` ever stops satisfying `BaseContext` (e.g., a required
 * property is removed or becomes incompatible), this line produces:
 * "Type 'AppContext' does not satisfy the constraint 'BaseContext'."
 *
 * @internal
 */
type VerifyBaseContext<T extends BaseContext> = T;
export type AppContextSatisfiesBaseContext = VerifyBaseContext<AppContext>;
