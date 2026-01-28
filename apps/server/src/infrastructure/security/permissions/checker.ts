// apps/server/src/infrastructure/security/permissions/checker.ts
/**
 * Permission Checker
 *
 * Core permission checking logic for row-level access control.
 * Supports ownership-based, membership-based, and role-based permissions.
 */

import {
    allowed,
    denied,
    getRecordKey,
    type BatchRecordLoader,
    type CustomRule,
    type MembershipRule,
    type OwnershipRule,
    type PermissionConfig,
    type PermissionRecord,
    type PermissionResult,
    type PermissionRule,
    type PermissionType,
    type RecordLoader,
    type RecordPointer,
    type RoleRule,
    type TablePermissionConfig,
} from './types';

import type { UserRole } from '@abe-stack/core';

// ============================================================================

// Permission Checker Class

// ============================================================================

/**

 * Options for creating a permission checker

 */

export interface PermissionCheckerOptions {
  /** Permission configuration */

  config: PermissionConfig;

  /** Function to load individual records */

  recordLoader: RecordLoader;

  /** Optional batch record loader for efficiency */

  batchRecordLoader?: BatchRecordLoader;
}

/**

 * Permission checker for row-level access control

 */

export class PermissionChecker {
  private readonly config: PermissionConfig;

  private readonly recordLoader: RecordLoader;

  private readonly batchRecordLoader?: BatchRecordLoader;

  private readonly tableConfigMap: Map<string, TablePermissionConfig>;

  constructor(options: PermissionCheckerOptions) {
    this.config = options.config;

    this.recordLoader = options.recordLoader;

    if (options.batchRecordLoader !== undefined) {
      this.batchRecordLoader = options.batchRecordLoader;
    }

    // Build table config lookup map

    this.tableConfigMap = new Map();

    if (options.config.tableConfigs != null) {
      for (const tableConfig of options.config.tableConfigs) {
        this.tableConfigMap.set(tableConfig.table, tableConfig);
      }
    }
  }

  // ==========================================================================

  // Public API

  // ==========================================================================

  /**

   * Check if a user can read a specific record

   */

  async checkReadPermission(
    userId: string,

    userRole: UserRole,

    table: string,

    recordId: string,
  ): Promise<PermissionResult> {
    return this.checkPermission(userId, userRole, table, recordId, 'read');
  }

  /**

   * Check if a user can write to a specific record

   */

  async checkWritePermission(
    userId: string,

    userRole: UserRole,

    table: string,

    recordId: string,

    operation: 'create' | 'update' | 'delete' = 'update',
  ): Promise<PermissionResult> {
    const permissionType: PermissionType = operation === 'delete' ? 'delete' : 'write';

    return this.checkPermission(userId, userRole, table, recordId, permissionType, operation);
  }

  /**

   * Check if a user has admin permission on a record

   */

  async checkAdminPermission(
    userId: string,

    userRole: UserRole,

    table: string,

    recordId: string,
  ): Promise<PermissionResult> {
    return this.checkPermission(userId, userRole, table, recordId, 'admin');
  }

  /**

   * Filter records to only those the user can read

   */

  async filterReadableRecords<T extends PermissionRecord>(
    userId: string,

    userRole: UserRole,

    table: string,

    records: T[],
  ): Promise<T[]> {
    const results = await Promise.all(
      records.map(async (record) => {
        const result = await this.checkRecordPermission(userId, userRole, table, record, 'read');

        return { record, allowed: result.allowed };
      }),
    );

    return results.filter((r) => r.allowed).map((r) => r.record);
  }

  /**

   * Filter record pointers to only those the user can read

   */

  async filterReadablePointers(
    userId: string,

    userRole: UserRole,

    pointers: RecordPointer[],
  ): Promise<RecordPointer[]> {
    if (pointers.length === 0) {
      return [];
    }

    // Load all records

    const recordMap = await this.loadRecords(pointers);

    // Check permissions and filter

    const results = await Promise.all(
      pointers.map(async (pointer) => {
        const record = recordMap.get(getRecordKey(pointer));

        if (record == null) {
          // Record doesn't exist, deny access

          return { pointer, allowed: false };
        }

        const result = await this.checkRecordPermission(
          userId,

          userRole,

          pointer.table,

          record,

          'read',
        );

        return { pointer, allowed: result.allowed };
      }),
    );

    return results.filter((r) => r.allowed).map((r) => r.pointer);
  }

  /**

   * Batch check permissions for multiple records

   */

  async batchCheckPermissions(
    userId: string,

    userRole: UserRole,

    checks: Array<{ table: string; recordId: string; permission: PermissionType }>,
  ): Promise<Map<string, PermissionResult>> {
    // Load all records at once for efficiency

    const pointers = checks.map((c) => ({ table: c.table, id: c.recordId }));

    const recordMap = await this.loadRecords(pointers);

    // Check permissions for each

    const results = new Map<string, PermissionResult>();

    await Promise.all(
      checks.map(async (check) => {
        const key = getRecordKey({ table: check.table, id: check.recordId });

        const record = recordMap.get(key);

        let result: PermissionResult;

        if (record == null) {
          result = denied('Record not found');
        } else {
          result = await this.checkRecordPermission(
            userId,

            userRole,

            check.table,

            record,

            check.permission,
          );
        }

        results.set(key, result);
      }),
    );

    return results;
  }

  // ==========================================================================

  // Core Permission Logic

  // ==========================================================================

  /**

   * Check permission for a specific record

   */

  private async checkPermission(
    userId: string,

    userRole: UserRole,

    table: string,

    recordId: string,

    permission: PermissionType,

    operation?: 'create' | 'update' | 'delete',
  ): Promise<PermissionResult> {
    // For create operations, we don't need to load the record

    if (operation === 'create') {
      return this.checkCreatePermission(userId, userRole, table);
    }

    // Load the record

    const record = await this.recordLoader(table, recordId);

    if (record == null) {
      return denied('Record not found');
    }

    return this.checkRecordPermission(userId, userRole, table, record, permission);
  }

  /**

   * Check permission for a create operation

   */

  private checkCreatePermission(
    userId: string,

    userRole: UserRole,

    table: string,
  ): PermissionResult {
    // Get rules for this table

    const rules = this.getRulesForTable(table);

    // Check role-based rules first (they don't need a record)

    for (const rule of rules) {
      if (rule.type === 'role') {
        const roleRule = rule;

        if (roleRule.roles.includes(userRole) && roleRule.grants.includes('write')) {
          return allowed(`role:${userRole}`);
        }
      }
    }

    // Admin can always create

    if (userRole === 'admin') {
      return allowed('role:admin');
    }

    // Default: allow authenticated users to create

    // (they will own the record they create)

    if (userId !== '') {
      return allowed('authenticated-create');
    }

    return this.getDefaultResult(table, 'write');
  }

  /**
   * Check permission against a loaded record
   */
  private async checkRecordPermission(
    userId: string,
    userRole: UserRole,
    table: string,
    record: PermissionRecord,
    permission: PermissionType,
  ): Promise<PermissionResult> {
    // Check if record is soft-deleted
    const tableConfig = this.tableConfigMap.get(table);
     if (record.deleted != null && tableConfig?.allowDeletedRecords !== true) {
      return denied('Record is deleted');
    }

    // Get rules for this table, sorted by priority
    const rules = this.getRulesForTable(table);

    // Check each rule
    for (const rule of rules) {
      const result = await this.evaluateRule(userId, userRole, record, permission, rule);
      if (result.allowed) {
        return result;
      }
    }

    return this.getDefaultResult(table, permission);
  }

  /**
   * Get rules for a specific table, sorted by priority
   */
  private getRulesForTable(table: string): PermissionRule[] {
    const tableConfig = this.tableConfigMap.get(table);

    // Combine global and table-specific rules
    const rules: PermissionRule[] = [];

    // Add table-specific rules first (they take precedence)
    if (tableConfig != null) {
      rules.push(...tableConfig.rules);
    }

    // Add global rules that apply to this table
    for (const rule of this.config.globalRules) {
      if (rule.tables == null || rule.tables.length === 0 || rule.tables.includes(table)) {
        rules.push(rule);
      }
    }

    // Sort by priority (higher first)
    return rules.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  }

  /**
   * Evaluate a single permission rule
   */
  private async evaluateRule(
    userId: string,
    userRole: UserRole,
    record: PermissionRecord,
    permission: PermissionType,
    rule: PermissionRule,
  ): Promise<PermissionResult> {
    // Check if this rule grants the requested permission
    if (!rule.grants.includes(permission)) {
      return denied('Rule does not grant this permission');
    }

    switch (rule.type) {
      case 'ownership':
        return this.evaluateOwnershipRule(userId, record, rule);

      case 'membership':
        return this.evaluateMembershipRule(userId, record, rule);

      case 'role':
        return this.evaluateRoleRule(userRole, rule);

      case 'custom':
        return this.evaluateCustomRule(userId, userRole, record, permission, rule);

      default:
        return denied('Unknown rule type');
    }
  }

  /**
   * Evaluate an ownership-based rule
   */
  private evaluateOwnershipRule(
    userId: string,
    record: PermissionRecord,
    rule: OwnershipRule,
  ): PermissionResult {
    const ownerField = rule.ownerField;

    // Check specified owner field
    if (ownerField != null && ownerField !== '' && record[ownerField] === userId) {
      return allowed(`ownership:${ownerField}`);
    }

    // Check default owner fields if no specific field is specified
    if (ownerField == null || ownerField === '') {
      if (record.ownerId === userId) {
        return allowed('ownership:ownerId');
      }
      if (record.createdBy === userId) {
        return allowed('ownership:createdBy');
      }
    }

    return denied('User is not the owner');
  }

  /**
   * Evaluate a membership-based rule
   */
  private evaluateMembershipRule(
    userId: string,
    record: PermissionRecord,
    rule: MembershipRule,
  ): PermissionResult {
    const memberField = rule.memberField;

    // Check specified member field
    if (memberField != null && memberField !== '') {
      const members = record[memberField];
      if (Array.isArray(members) && members.includes(userId)) {
        return allowed(`membership:${memberField}`);
      }
      return denied('User is not a member');
    }

    // Check default member fields
    if (record.memberIds != null && Array.isArray(record.memberIds)) {
      if (record.memberIds.includes(userId)) {
        return allowed('membership:memberIds');
      }
    }

    if (record.sharedWith != null && Array.isArray(record.sharedWith)) {
      if (record.sharedWith.includes(userId)) {
        return allowed('membership:sharedWith');
      }
    }

    return denied('User is not a member');
  }

  /**
   * Evaluate a role-based rule
   */
  private evaluateRoleRule(userRole: UserRole, rule: RoleRule): PermissionResult {
    if (rule.roles.includes(userRole)) {
      return allowed(`role:${userRole}`);
    }
    return denied(`User role '${userRole}' not in allowed roles`);
  }

  /**
   * Evaluate a custom rule
   */
  private async evaluateCustomRule(
    userId: string,
    userRole: UserRole,
    record: PermissionRecord,
    permission: PermissionType,
    rule: CustomRule,
  ): Promise<PermissionResult> {
    try {
      const result = await rule.check(userId, userRole, record, permission);
      if (result) {
        return allowed('custom');
      }
      return denied('Custom rule denied access');
    } catch {
      // Custom rules should not throw, but if they do, deny access
      return denied('Custom rule error');
    }
  }

  /**
   * Get the default result when no rules match
   */
  private getDefaultResult(table: string, permission: PermissionType): PermissionResult {
    if (this.config.defaultDeny !== false) {
      return denied(`No matching permission rules for ${permission} on ${table}`);
    }
    return allowed('default-allow');
  }

  /**
   * Load multiple records efficiently
   */
  private async loadRecords(pointers: RecordPointer[]): Promise<Map<string, PermissionRecord>> {
    if (this.batchRecordLoader != null) {
      return this.batchRecordLoader(pointers);
    }

    // Fall back to individual loads
    const results = new Map<string, PermissionRecord>();

    await Promise.all(
      pointers.map(async (pointer) => {
        const record = await this.recordLoader(pointer.table, pointer.id);
        if (record != null) {
          results.set(getRecordKey(pointer), record);
        }
      }),
    );

    return results;
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a permission checker with the given configuration
 */
export function createPermissionChecker(options: PermissionCheckerOptions): PermissionChecker {
  return new PermissionChecker(options);
}

// ============================================================================
// Default Configuration Helpers
// ============================================================================

/**
 * Create default global rules
 * - Admin role can do everything
 * - Owners can read/write/delete their records
 * - Members can read shared records
 */
export function createDefaultPermissionConfig(): PermissionConfig {
  return {
    globalRules: [
      // Admin can do everything
      {
        type: 'role',
        roles: ['admin'],
        grants: ['read', 'write', 'delete', 'admin'],
        priority: 100,
      },
      // Owners can read, write, and delete their records
      {
        type: 'ownership',
        grants: ['read', 'write', 'delete'],
        priority: 50,
      },
      // Members can read shared records
      {
        type: 'membership',
        grants: ['read'],
        priority: 25,
      },
    ],
    defaultDeny: true,
  };
}

/**
 * Create a rule that allows admins to access everything
 */
export function createAdminRule(priority: number = 100): RoleRule {
  return {
    type: 'role',
    roles: ['admin'],
    grants: ['read', 'write', 'delete', 'admin'],
    priority,
  };
}

/**
 * Create a rule that allows owners to manage their records
 */
export function createOwnerRule(
  grants: PermissionType[] = ['read', 'write', 'delete'],
  ownerField?: string,
  priority: number = 50,
): OwnershipRule {
  const rule: OwnershipRule = {
    type: 'ownership',
    grants,
    priority,
  };
  if (ownerField !== undefined) {
    rule.ownerField = ownerField;
  }
  return rule;
}

/**
 * Create a rule that allows members to access shared records
 */
export function createMemberRule(
  grants: PermissionType[] = ['read'],
  memberField?: string,
  priority: number = 25,
): MembershipRule {
  const rule: MembershipRule = {
    type: 'membership',
    grants,
    priority,
  };
  if (memberField !== undefined) {
    rule.memberField = memberField;
  }
  return rule;
}

/**
 * Create a custom permission rule
 */
export function createCustomRule(
  check: CustomRule['check'],
  grants: PermissionType[],
  tables?: string[],
  priority: number = 0,
): CustomRule {
  const rule: CustomRule = {
    type: 'custom',
    check,
    grants,
    priority,
  };
  if (tables !== undefined) {
    rule.tables = tables;
  }
  return rule;
}
