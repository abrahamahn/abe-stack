// main/server/core/src/notifications/types.ts
/**
 * Notification Module Types
 *
 * Dependency interfaces for the notifications module.
 * These are minimal contracts that the server composition root satisfies
 * when wiring the notification handlers into the application.
 *
 * Uses shared context contracts from `@abe-stack/shared` to eliminate
 * duplicate Logger and request interfaces across packages.
 */

import type { DbClient, Repositories } from '../../../db/src';
import type { BaseContext, RequestContext, ServerLogger } from '@abe-stack/shared/core';

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
  readonly log: ServerLogger;
}

// ============================================================================
// Request Interface (Transition Alias)
// ============================================================================

/**
 * Request interface for notification handlers.
 *
 * Transition alias for `RequestContext` from contracts.
 * Existing code importing `NotificationRequest` from this module continues
 * working. New code should import `RequestContext` from `@abe-stack/shared`.
 */
export type NotificationRequest = RequestContext;
