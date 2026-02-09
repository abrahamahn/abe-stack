// src/server/engine/src/security/permissions/checker.ts
/**
 * Permission Checker
 *
 * Core permission checking logic for row-level access control.
 * Supports ownership-based, membership-based, and role-based permissions.
 *
 * @module @abe-stack/server-engine/security/permissions
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

import type { UserRole } from '@abe-stack/db';

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
 * Permission checker for row-level access control.
 *
 * Supports ownership-based, membership-based, role-based, and custom permission rules.
 * Rules are evaluated in priority order, and the first matching rule determines the result.
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
   *
   * @param userId - The user ID to check
   * @param userRole - The user's role
   * @param table - The table name
   * @param recordId - The record ID
   * @returns Permission result indicating if read is allowed
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
   *
   * @param userId - The user ID to check
   * @param userRole - The user's role
   * @param table - The table name
   * @param recordId - The record ID
   * @param operation - The operation type (create, update, delete)
   * @returns Permission result indicating if write is allowed
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
   *
   * @param userId - The user ID to check
   * @param userRole - The user's role
   * @param table - The table name
   * @param recordId - The record ID
   * @returns Permission result indicating if admin access is allowed
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
   *
   * @param userId - The user ID to check
   * @param userRole - The user's role
   * @param table - The table name
   * @param records - Array of records to filter
   * @returns Filtered array of readable records
   * @complexity O(n) where n is the number of records
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
   *
   * @param userId - The user ID to check
   * @param userRole - The user's role
   * @param pointers - Array of record pointers to filter
   * @returns Filtered array of readable record pointers
   * @complexity O(n) where n is the number of pointers
   */
  async filterReadablePointers(
    userId: string,
    userRole: UserRole,
    pointers: RecordPointer[],
  ): Promise<RecordPointer[]> {
    if (pointers.length === 0) {
      return [];
    }

    const recordMap = await this.loadRecords(pointers);

    const results = await Promise.all(
      pointers.map(async (pointer) => {
        const record = recordMap.get(getRecordKey(pointer));

        if (record == null) {
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
   *
   * @param userId - The user ID to check
   * @param userRole - The user's role
   * @param checks - Array of permission checks to perform
   * @returns Map of record keys to permission results
   * @complexity O(n) where n is the number of checks
   */
  async batchCheckPermissions(
    userId: string,
    userRole: UserRole,
    checks: Array<{ table: string; recordId: string; permission: PermissionType }>,
  ): Promise<Map<string, PermissionResult>> {
    const pointers = checks.map((c) => ({ table: c.table, id: c.recordId }));
    const recordMap = await this.loadRecords(pointers);
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
    if (operation === 'create') {
      return this.checkCreatePermission(userId, userRole, table);
    }

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
    const rules = this.getRulesForTable(table);

    for (const rule of rules) {
      if (rule.type === 'role') {
        const roleRule = rule;
        if (roleRule.roles.includes(userRole) && roleRule.grants.includes('write')) {
          return allowed(`role:${userRole}`);
        }
      }
    }

    if (userRole === 'admin') {
      return allowed('role:admin');
    }

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
    const tableConfig = this.tableConfigMap.get(table);
    if (record.deleted != null && tableConfig?.allowDeletedRecords !== true) {
      return denied('Record is deleted');
    }

    const rules = this.getRulesForTable(table);

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
   *
   * @complexity O(n log n) where n is total rules for the table
   */
  private getRulesForTable(table: string): PermissionRule[] {
    const tableConfig = this.tableConfigMap.get(table);
    const rules: PermissionRule[] = [];

    if (tableConfig != null) {
      rules.push(...tableConfig.rules);
    }

    for (const rule of this.config.globalRules) {
      if (rule.tables == null || rule.tables.length === 0 || rule.tables.includes(table)) {
        rules.push(rule);
      }
    }

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

    if (ownerField != null && ownerField !== '' && record[ownerField] === userId) {
      return allowed(`ownership:${ownerField}`);
    }

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

    if (memberField != null && memberField !== '') {
      const members = record[memberField];
      if (Array.isArray(members) && members.includes(userId)) {
        return allowed(`membership:${memberField}`);
      }
      return denied('User is not a member');
    }

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
   * Load multiple records efficiently.
   * Uses batchRecordLoader if available, otherwise falls back to individual loads.
   *
   * @param pointers - Array of record pointers to load
   * @returns Map of record keys to loaded records
   * @complexity O(n) where n is the number of pointers
   */
  private async loadRecords(pointers: RecordPointer[]): Promise<Map<string, PermissionRecord>> {
    if (this.batchRecordLoader != null) {
      return this.batchRecordLoader(pointers);
    }

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
 *
 * @param options - Permission checker options including config and record loader
 * @returns A new PermissionChecker instance
 */
export function createPermissionChecker(options: PermissionCheckerOptions): PermissionChecker {
  return new PermissionChecker(options);
}

// ============================================================================
// Default Configuration Helpers
// ============================================================================

/**
 * Create default global rules:
 * - Admin role can do everything
 * - Owners can read/write/delete their records
 * - Members can read shared records
 *
 * @returns A default PermissionConfig
 */
export function createDefaultPermissionConfig(): PermissionConfig {
  return {
    globalRules: [
      {
        type: 'role',
        roles: ['admin'],
        grants: ['read', 'write', 'delete', 'admin'],
        priority: 100,
      },
      {
        type: 'ownership',
        grants: ['read', 'write', 'delete'],
        priority: 50,
      },
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
 *
 * @param priority - Rule priority (default: 100)
 * @returns A RoleRule for admin access
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
 *
 * @param grants - Permission types to grant (default: read, write, delete)
 * @param ownerField - Custom owner field name
 * @param priority - Rule priority (default: 50)
 * @returns An OwnershipRule
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
 *
 * @param grants - Permission types to grant (default: read)
 * @param memberField - Custom member field name
 * @param priority - Rule priority (default: 25)
 * @returns A MembershipRule
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
 *
 * @param check - Custom check function
 * @param grants - Permission types this rule can grant
 * @param tables - Optional table names this rule applies to
 * @param priority - Rule priority (default: 0)
 * @returns A CustomRule
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
