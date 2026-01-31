// infra/realtime/src/types.ts
/**
 * Realtime Module Types
 *
 * Dependency interfaces, internal types, and configuration for the realtime module.
 * Follows the narrow dependency pattern: the server's AppContext satisfies
 * RealtimeModuleDeps structurally, keeping this package decoupled.
 *
 * Uses shared context contracts from `@abe-stack/contracts` to eliminate
 * duplicate Logger and request interfaces across packages.
 *
 * @module types
 */

import type { BaseContext, Logger, RequestContext } from '@abe-stack/contracts';
import type { RecordMap, SubscriptionManager } from '@abe-stack/core';
import type { DbClient } from '@abe-stack/db';

// ============================================================================
// Logger Interface (Transition Alias)
// ============================================================================

/**
 * Logger interface for the realtime module.
 *
 * Transition alias for the shared `Logger` contract.
 * The contracts `Logger` provides all overloads needed by realtime.
 * New code should import `Logger` from `@abe-stack/contracts` directly.
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
 *
 * @example
 * ```typescript
 * const deps: RealtimeModuleDeps = {
 *   db: createDbClient(connectionString),
 *   pubsub: subscriptionManager,
 *   log: createLogger('realtime'),
 *   config: { env: 'production', auth: { cookie: { secret: '...' }, jwt: { secret: '...' } } },
 * };
 * ```
 */
export interface RealtimeModuleDeps extends Omit<BaseContext, 'repos'> {
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
 * working. New code should import `RequestContext` from `@abe-stack/contracts`.
 */
export type RealtimeRequest = RequestContext;

// ============================================================================
// Record Types
// ============================================================================

/**
 * A record with at minimum id and version fields.
 * All realtime records must include these for optimistic locking.
 *
 * @example
 * ```typescript
 * const record: RealtimeRecord = { id: 'user-1', version: 3, name: 'John' };
 * ```
 */
export interface RealtimeRecord {
  /** Unique record identifier */
  id: string;
  /** Version number for optimistic locking */
  version: number;
  /** Additional record fields */
  [key: string]: unknown;
}

// ============================================================================
// Service Types
// ============================================================================

/**
 * Options for loading records from the database.
 *
 * @param pointers - Array of table/id pairs identifying records to load
 */
export interface LoadRecordsOptions {
  /** Record pointers to load */
  pointers: ReadonlyArray<{ table: string; id: string }>;
}

/**
 * Result of applying operations to a record map.
 *
 * @param recordMap - The updated record map after operations
 * @param modifiedRecords - List of records that were actually modified
 */
export interface ApplyOperationsResult {
  /** Updated record map */
  recordMap: RecordMap;
  /** Records that were modified (for publishing) */
  modifiedRecords: ReadonlyArray<{ table: string; id: string }>;
}

/**
 * Version conflict error details.
 * Returned when optimistic locking detects a concurrent modification.
 *
 * @param table - Table name where conflict occurred
 * @param id - Record ID that conflicted
 * @param expectedVersion - The version the client expected
 * @param actualVersion - The actual version in the database
 */
export interface VersionConflict {
  /** Table name */
  table: string;
  /** Record ID */
  id: string;
  /** Version the client expected */
  expectedVersion: number;
  /** Actual version in the database */
  actualVersion: number;
}

// ============================================================================
// Permission Types (for future Phase 5 integration)
// ============================================================================

/**
 * Permission check context for authorizing realtime operations.
 *
 * @param userId - User performing the operation
 * @param operation - The operation to check
 * @param currentRecord - Current record state (if exists)
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
  currentRecord?: RealtimeRecord | undefined;
}

/**
 * Permission check result.
 *
 * @param allowed - Whether the operation is allowed
 * @param reason - Explanation if denied
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
 * For security, only explicitly registered tables can be accessed.
 */
export type AllowedTable = string;

/**
 * Table configuration for realtime operations.
 *
 * @param name - Table name in database
 * @param mutableFields - Fields that can be modified via realtime operations
 * @param readOnlyFields - Fields that are read-only
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
 *
 * @param recordMap - The updated record map
 */
export interface WriteResult {
  /** Updated record map after write operations */
  recordMap: RecordMap;
}

/**
 * Get records result returned to the client.
 *
 * @param recordMap - The loaded record map
 */
export interface GetRecordsResult {
  /** Loaded record map */
  recordMap: RecordMap;
}

/**
 * Version conflict result returned on HTTP 409.
 *
 * @param message - Human-readable conflict message
 * @param conflictingRecords - List of conflicting record pointers
 */
export interface ConflictResult {
  /** Conflict description */
  message: string;
  /** Records that conflicted */
  conflictingRecords?: ReadonlyArray<{ table: string; id: string }> | undefined;
}

// ============================================================================
// Error Messages
// ============================================================================

/**
 * Build error message for disallowed table access.
 *
 * @param table - Table name that was not allowed
 * @returns Formatted error message
 * @complexity O(1)
 */
function tableNotAllowedMessage(table: string): string {
  return `Table '${table}' is not allowed for realtime operations`;
}

/**
 * Standardized error messages for realtime operations.
 *
 * @complexity O(1) constant access
 */
export const ERROR_MESSAGES = {
  AUTHENTICATION_REQUIRED: 'Authentication required',
  AUTHOR_MISMATCH: 'Author ID must match authenticated user',
  TABLE_NOT_ALLOWED: tableNotAllowedMessage,
  INTERNAL_ERROR: 'Internal server error',
  VERSION_CONFLICT: 'Version conflict: one or more records have been modified',
} as const;
