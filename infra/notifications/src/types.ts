// infra/notifications/src/types.ts
/**
 * Notification Module Types
 *
 * Dependency interfaces for the notifications module.
 * These are minimal contracts that the server composition root satisfies
 * when wiring the notification handlers into the application.
 *
 * Uses shared context contracts from `@abe-stack/contracts` to eliminate
 * duplicate Logger and request interfaces across packages.
 */

import type { BaseContext, Logger, RequestContext } from '@abe-stack/contracts';
import type { DbClient, Repositories } from '@abe-stack/db';

// ============================================================================
// Logger Interface (Transition Alias)
// ============================================================================

/**
 * Logger interface for notification operations.
 *
 * Extends the shared `Logger` contract with a required `child` method.
 * The contracts `Logger` marks `child` as optional; the notification module
 * requires it for structured logging with notification context bindings.
 *
 * @complexity O(1) per log call
 */
export interface NotificationLogger extends Logger {
  /**
   * Create a child logger with additional bindings.
   *
   * @param bindings - Key-value pairs to include in all child log entries
   * @returns A new logger instance with the specified bindings
   */
  child(bindings: Record<string, unknown>): NotificationLogger;
}

// ============================================================================
// Context Interfaces
// ============================================================================

/**
 * Notification module dependencies.
 * Provided by the server composition root when wiring handlers.
 *
 * Extends `BaseContext` from contracts. This matches the minimal subset
 * of AppContext that notification handlers require, keeping the package
 * decoupled from the full server context.
 */
export interface NotificationModuleDeps extends BaseContext {
  /** Database client for direct SQL queries */
  readonly db: DbClient;
  /** Repository container for typed data access */
  readonly repos: Repositories;
  /** Logger instance for structured logging */
  readonly log: NotificationLogger;
}

// ============================================================================
// Request Interface (Transition Alias)
// ============================================================================

/**
 * Request interface for notification handlers.
 *
 * Transition alias for `RequestContext` from contracts.
 * Existing code importing `NotificationRequest` from this module continues
 * working. New code should import `RequestContext` from `@abe-stack/contracts`.
 */
export type NotificationRequest = RequestContext;
