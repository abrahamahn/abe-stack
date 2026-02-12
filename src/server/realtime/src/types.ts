// src/server/realtime/src/types.ts
/**
 * Realtime Module Types
 *
 * Dependency interfaces, internal types, and configuration for the realtime module.
 * Follows the narrow dependency pattern: the server's AppContext satisfies
 * RealtimeModuleDeps structurally, keeping this package decoupled.
 *
 * Uses shared context contracts from `@abe-stack/shared` to eliminate
 * duplicate Logger and request interfaces across packages.
 *
 * @module types
 */

import type { DbClient } from '@abe-stack/db';
import type {
  BaseContext,
  ContractRequestContext as RequestContext,
  Logger,
  RecordMap,
  SubscriptionManager,
} from '@abe-stack/shared';

// Re-export shared types for backward compatibility
export type { ApplyOperationsResult, RealtimeRecord, VersionConflict } from '@abe-stack/shared';

// ============================================================================
// Logger Interface (Transition Alias)
// ============================================================================

/**
 * Logger interface for the realtime module.
 *
 * Transition alias for the shared `Logger` contract.
 * The contracts `Logger` provides all overloads needed by realtime.
 * New code should import `Logger` from `@abe-stack/shared` directly.
 *
 * @complexity O(1) per log call
 */
export type RealtimeLogger = Logger;

// ============================================================================
// Module Dependencies
// ============================================================================

/**
 * Realtime module dependencies.
 * These are provided by the server composition root.
 *
 * Extends `BaseContext` with pub/sub and configuration.
 */
export interface RealtimeModuleDeps extends Omit<BaseContext, 'repos' | 'log'> {
  /** Database client for executing queries */
  readonly db: DbClient;
  /** Pub/sub manager for real-time subscriptions */
  readonly pubsub: SubscriptionManager;
  /** Logger instance for realtime module logging */
  readonly log: Logger;
  /** Application configuration subset needed by realtime */
  readonly config: {
    readonly env: string;
    readonly auth: {
      readonly cookie: {
        readonly secret: string;
      };
      readonly jwt: {
        readonly secret: string;
      };
    };
  };
}

// ============================================================================
// Request Interface (Transition Alias)
// ============================================================================

/**
 * Request interface with user information and cookies.
 *
 * Transition alias for `RequestContext` from contracts.
 * Existing code importing `RealtimeRequest` from this module continues
 * working. New code should import `RequestContext` from `@abe-stack/shared`.
 */
export type RealtimeRequest = RequestContext;

// ============================================================================
// Service Types
// ============================================================================

/**
 * Options for loading records from the database.
 */
export interface LoadRecordsOptions {
  /** Record pointers to load */
  pointers: ReadonlyArray<{ table: string; id: string }>;
}

// ============================================================================
// Permission Types (for future Phase 5 integration)
// ============================================================================

/**
 * Permission check context for authorizing realtime operations.
 */
export interface PermissionContext {
  /** User ID performing the operation */
  userId: string;
  /** Operation being performed */
  operation: {
    type: string;
    table: string;
    id: string;
    key: string;
  };
  /** Current record state (if exists) */
  currentRecord?: { id: string; version: number; [key: string]: unknown } | undefined;
}

/**
 * Permission check result.
 */
export interface PermissionResult {
  /** Whether the operation is allowed */
  allowed: boolean;
  /** Reason if denied */
  reason?: string | undefined;
}

// ============================================================================
// Table Registry Types
// ============================================================================

/**
 * Allowed tables for realtime operations.
 */
export type AllowedTable = string;

/**
 * Table configuration for realtime operations.
 */
export interface TableConfig {
  /** Table name in database */
  name: string;
  /** Fields that can be modified via realtime operations */
  mutableFields: string[];
  /** Fields that are read-only */
  readOnlyFields: string[];
}

// ============================================================================
// Handler Result Types
// ============================================================================

/**
 * Write transaction result returned to the client.
 */
export interface WriteResult {
  /** Updated record map after write operations */
  recordMap: RecordMap;
}

/**
 * Get records result returned to the client.
 */
export interface GetRecordsResult {
  /** Loaded record map */
  recordMap: RecordMap;
}

/**
 * Version conflict result returned on HTTP 409.
 */
export interface ConflictResult {
  /** Conflict description */
  message: string;
  /** Records that conflicted */
  conflictingRecords?: ReadonlyArray<{ table: string; id: string }> | undefined;
}
