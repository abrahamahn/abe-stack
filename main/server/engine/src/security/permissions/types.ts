// main/server/engine/src/security/permissions/types.ts
/**
 * Permissions Types
 *
 * Type definitions for the row-level permissions system.
 * Supports ownership-based, workspace/team membership, and role-based permissions.
 *
 * @module @bslt/server-engine/security/permissions
 */

import type { UserRole } from '@bslt/db';

// ============================================================================
// Permission Types
// ============================================================================

/**
 * Permission operation types
 */
export type PermissionType = 'read' | 'write' | 'delete' | 'admin';

/**
 * All permission types as an array (for iteration)
 */
export const PERMISSION_TYPES: readonly PermissionType[] = ['read', 'write', 'delete', 'admin'];

/**
 * Record pointer for identifying a specific record
 */
export interface RecordPointer {
  /** Table name */
  table: string;
  /** Record ID */
  id: string;
}

/**
 * Record with common fields used for permission checks
 */
export interface PermissionRecord {
  /** Record ID */
  id: string;
  /** Owner user ID (for ownership-based permissions) */
  ownerId?: string;
  /** Created by user ID (alternative to ownerId) */
  createdBy?: string;
  /** Workspace ID (for workspace-based permissions) */
  workspaceId?: string;
  /** Team ID (for team-based permissions) */
  teamId?: string;
  /** Member IDs array (for shared records) */
  memberIds?: string[];
  /** Shared with user IDs (alternative to memberIds) */
  sharedWith?: string[];
  /** Whether the record is deleted (soft delete) */
  deleted?: Date | null;
  /** Any additional fields */
  [key: string]: unknown;
}

// ============================================================================
// Permission Check Types
// ============================================================================

/**
 * Input for permission check
 */
export interface PermissionCheck {
  /** User ID performing the action */
  userId: string;
  /** User's role */
  userRole: UserRole;
  /** Table name */
  table: string;
  /** Record ID */
  recordId: string;
  /** Permission type being requested */
  permission: PermissionType;
  /** Operation being performed (for write permissions) */
  operation?: 'create' | 'update' | 'delete';
}

/**
 * Result of a permission check
 */
export interface PermissionResult {
  /** Whether the permission is allowed */
  allowed: boolean;
  /** Reason for denial (if denied) */
  reason?: string;
  /** Permission rule that matched (for debugging) */
  matchedRule?: string;
}

/**
 * Denied permission result
 */
export interface PermissionDenied extends PermissionResult {
  allowed: false;
  reason: string;
}

/**
 * Allowed permission result
 */
export interface PermissionAllowed extends PermissionResult {
  allowed: true;
}

// ============================================================================
// Permission Rule Types
// ============================================================================

/**
 * Types of permission rules
 */
export type PermissionRuleType = 'ownership' | 'membership' | 'role' | 'custom';

/**
 * Base permission rule
 */
export interface PermissionRuleBase {
  /** Rule type */
  type: PermissionRuleType;
  /** Tables this rule applies to (empty = all tables) */
  tables?: string[];
  /** Permissions this rule grants */
  grants: PermissionType[];
  /** Priority (higher = checked first) */
  priority?: number;
}

/**
 * Ownership-based permission rule.
 * Grants permissions when user owns the record.
 */
export interface OwnershipRule extends PermissionRuleBase {
  type: 'ownership';
  /** Field name that contains the owner ID (default: 'ownerId' or 'createdBy') */
  ownerField?: string;
}

/**
 * Membership-based permission rule.
 * Grants permissions when user is a member of the record's workspace/team.
 */
export interface MembershipRule extends PermissionRuleBase {
  type: 'membership';
  /** Field name that contains member IDs (default: 'memberIds' or 'sharedWith') */
  memberField?: string;
}

/**
 * Role-based permission rule.
 * Grants permissions based on user role.
 */
export interface RoleRule extends PermissionRuleBase {
  type: 'role';
  /** Roles that are granted these permissions */
  roles: UserRole[];
}

/**
 * Custom permission rule.
 * Uses a custom function to determine permissions.
 */
export interface CustomRule extends PermissionRuleBase {
  type: 'custom';
  /** Custom check function */
  check: (
    userId: string,
    userRole: UserRole,
    record: PermissionRecord,
    permission: PermissionType,
  ) => boolean | Promise<boolean>;
}

/**
 * Union of all permission rule types
 */
export type PermissionRule = OwnershipRule | MembershipRule | RoleRule | CustomRule;

// ============================================================================
// Permission Configuration Types
// ============================================================================

/**
 * Table-specific permission configuration
 */
export interface TablePermissionConfig {
  /** Table name */
  table: string;
  /** Rules for this table */
  rules: PermissionRule[];
  /** Whether soft-deleted records should be visible */
  allowDeletedRecords?: boolean;
}

/**
 * Global permission configuration
 */
export interface PermissionConfig {
  /** Global rules (apply to all tables unless overridden) */
  globalRules: PermissionRule[];
  /** Table-specific configurations */
  tableConfigs?: TablePermissionConfig[];
  /** Default behavior when no rules match */
  defaultDeny?: boolean;
}

// ============================================================================
// Permission Context Types
// ============================================================================

/**
 * Context passed to permission checks
 */
export interface PermissionContext {
  /** User ID */
  userId: string;
  /** User role */
  userRole: UserRole;
  /** Optional workspace context */
  workspaceId?: string;
  /** Optional team context */
  teamId?: string;
  /** Additional context data */
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Record Loader Types
// ============================================================================

/**
 * Function to load a record by table and ID
 *
 * @param table - Table name
 * @param id - Record ID
 * @returns The loaded record or null if not found
 */
export type RecordLoader = (table: string, id: string) => Promise<PermissionRecord | null>;

/**
 * Function to load multiple records
 *
 * @param pointers - Array of record pointers to load
 * @returns Map of record keys to loaded records
 */
export type BatchRecordLoader = (
  pointers: RecordPointer[],
) => Promise<Map<string, PermissionRecord>>;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a denied permission result
 *
 * @param reason - The reason for denial
 * @returns A PermissionDenied result object
 */
export function denied(reason: string): PermissionDenied {
  return { allowed: false, reason };
}

/**
 * Create an allowed permission result
 *
 * @param matchedRule - Optional rule identifier that matched
 * @returns A PermissionAllowed result object
 */
export function allowed(matchedRule?: string): PermissionAllowed {
  const result: PermissionAllowed = { allowed: true };
  if (matchedRule !== undefined) {
    result.matchedRule = matchedRule;
  }
  return result;
}

/**
 * Check if a permission result is denied
 *
 * @param result - The permission result to check
 * @returns True if the result is denied
 */
export function isDenied(result: PermissionResult): result is PermissionDenied {
  return !result.allowed;
}

/**
 * Check if a permission result is allowed
 *
 * @param result - The permission result to check
 * @returns True if the result is allowed
 */
export function isAllowed(result: PermissionResult): result is PermissionAllowed {
  return result.allowed;
}

/**
 * Create a record pointer key for use in maps
 *
 * @param pointer - The record pointer
 * @returns A string key in the format "table:id"
 * @complexity O(1)
 */
export function getRecordKey(pointer: RecordPointer): string {
  return `${pointer.table}:${pointer.id}`;
}

/**
 * Parse a record key back to a pointer
 *
 * @param key - The record key string in "table:id" format
 * @returns The parsed RecordPointer
 * @throws Error if the key format is invalid
 * @complexity O(1)
 */
export function parseRecordKey(key: string): RecordPointer {
  const parts = key.split(':');
  const table = parts[0];
  const id = parts[1];

  if (table == null || table === '' || id == null || id === '') {
    throw new Error(`Invalid record key format: ${key}`);
  }

  return { table, id };
}
