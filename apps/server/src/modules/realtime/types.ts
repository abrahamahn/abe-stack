// apps/server/src/modules/realtime/types.ts
/**
 * Realtime Module Types
 *
 * Internal types for the realtime module implementation.
 */

import type { Operation, RecordMap, RecordPointer } from '@abe-stack/core';

// ============================================================================
// Record Types
// ============================================================================

/**
 * A record with at minimum id and version
 */
export interface RealtimeRecord {
  id: string;
  version: number;
  [key: string]: unknown;
}

// ============================================================================
// Service Types
// ============================================================================

/**
 * Options for loading records
 */
export interface LoadRecordsOptions {
  /** Record pointers to load */
  pointers: RecordPointer[];
}

/**
 * Result of applying operations
 */
export interface ApplyOperationsResult {
  /** Updated record map */
  recordMap: RecordMap;
  /** Records that were modified (for publishing) */
  modifiedRecords: RecordPointer[];
}

/**
 * Version conflict error details
 */
export interface VersionConflict {
  table: string;
  id: string;
  expectedVersion: number;
  actualVersion: number;
}

// ============================================================================
// Permission Types (for future Phase 5 integration)
// ============================================================================

/**
 * Permission check context
 */
export interface PermissionContext {
  /** User ID performing the operation */
  userId: string;
  /** Operation being performed */
  operation: Operation;
  /** Current record state (if exists) */
  currentRecord?: RealtimeRecord;
}

/**
 * Permission check result
 */
export interface PermissionResult {
  /** Whether the operation is allowed */
  allowed: boolean;
  /** Reason if denied */
  reason?: string;
}

// ============================================================================
// Table Registry Types
// ============================================================================

/**
 * Allowed tables for realtime operations
 *
 * For security, only explicitly registered tables can be accessed.
 * Add new tables here when extending the realtime system.
 */
export type AllowedTable = string;

/**
 * Table configuration for realtime operations
 */
export interface TableConfig {
  /** Table name in database */
  name: string;
  /** Fields that can be modified via realtime operations */
  mutableFields: string[];
  /** Fields that are read-only */
  readOnlyFields: string[];
}
