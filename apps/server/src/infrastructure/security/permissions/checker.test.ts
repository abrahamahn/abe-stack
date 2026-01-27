// apps/server/src/infrastructure/security/permissions/__tests__/checker.test.ts
import { describe, expect, test } from 'vitest';

import {
    createAdminRule,
    createCustomRule,
    createDefaultPermissionConfig,
    createMemberRule,
    createOwnerRule,
    createPermissionChecker,
} from '../checker';

import type { PermissionChecker } from '../checker';
import type { PermissionConfig, PermissionRecord, RecordLoader } from '../types';

// ============================================================================
// Test Helpers
// ============================================================================

function createMockRecordLoader(records: Map<string, PermissionRecord>): RecordLoader {
  return (table: string, id: string) => {
    const key = `${table}:${id}`;
    return Promise.resolve(records.get(key) ?? null);
  };
}

function createTestChecker(
  config: PermissionConfig,
  records: Map<string, PermissionRecord> = new Map(),
): PermissionChecker {
  return createPermissionChecker({
    config,
    recordLoader: createMockRecordLoader(records),
  });
}

// ============================================================================
// Tests
// ============================================================================

describe('PermissionChecker', () => {
  describe('checkReadPermission', () => {
    test('should allow admin to read any record', async () => {
      const records = new Map<string, PermissionRecord>([
        ['tasks:task-1', { id: 'task-1', ownerId: 'other-user' }],
      ]);

      const checker = createTestChecker(createDefaultPermissionConfig(), records);

      const result = await checker.checkReadPermission('admin-user', 'admin', 'tasks', 'task-1');

      expect(result.allowed).toBe(true);
      expect(result.matchedRule).toBe('role:admin');
    });

    test('should allow owner to read their record', async () => {
      const records = new Map<string, PermissionRecord>([
        ['tasks:task-1', { id: 'task-1', ownerId: 'user-1' }],
      ]);

      const checker = createTestChecker(createDefaultPermissionConfig(), records);

      const result = await checker.checkReadPermission('user-1', 'user', 'tasks', 'task-1');

      expect(result.allowed).toBe(true);
      expect(result.matchedRule).toBe('ownership:ownerId');
    });

    test('should allow owner via createdBy field', async () => {
      const records = new Map<string, PermissionRecord>([
        ['tasks:task-1', { id: 'task-1', createdBy: 'user-1' }],
      ]);

      const checker = createTestChecker(createDefaultPermissionConfig(), records);

      const result = await checker.checkReadPermission('user-1', 'user', 'tasks', 'task-1');

      expect(result.allowed).toBe(true);
      expect(result.matchedRule).toBe('ownership:createdBy');
    });

    test('should allow member to read shared record', async () => {
      const records = new Map<string, PermissionRecord>([
        ['tasks:task-1', { id: 'task-1', ownerId: 'owner', memberIds: ['user-1', 'user-2'] }],
      ]);

      const checker = createTestChecker(createDefaultPermissionConfig(), records);

      const result = await checker.checkReadPermission('user-1', 'user', 'tasks', 'task-1');

      expect(result.allowed).toBe(true);
      expect(result.matchedRule).toBe('membership:memberIds');
    });

    test('should allow member via sharedWith field', async () => {
      const records = new Map<string, PermissionRecord>([
        ['tasks:task-1', { id: 'task-1', ownerId: 'owner', sharedWith: ['user-1'] }],
      ]);

      const checker = createTestChecker(createDefaultPermissionConfig(), records);

      const result = await checker.checkReadPermission('user-1', 'user', 'tasks', 'task-1');

      expect(result.allowed).toBe(true);
      expect(result.matchedRule).toBe('membership:sharedWith');
    });

    test('should deny non-owner/non-member from reading record', async () => {
      const records = new Map<string, PermissionRecord>([
        ['tasks:task-1', { id: 'task-1', ownerId: 'other-user' }],
      ]);

      const checker = createTestChecker(createDefaultPermissionConfig(), records);

      const result = await checker.checkReadPermission('user-1', 'user', 'tasks', 'task-1');

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('No matching permission rules');
    });

    test('should deny access to non-existent records', async () => {
      const checker = createTestChecker(createDefaultPermissionConfig());

      const result = await checker.checkReadPermission('user-1', 'user', 'tasks', 'non-existent');

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Record not found');
    });

    test('should deny access to soft-deleted records by default', async () => {
      const records = new Map<string, PermissionRecord>([
        ['tasks:task-1', { id: 'task-1', ownerId: 'user-1', deleted: new Date() }],
      ]);

      const checker = createTestChecker(createDefaultPermissionConfig(), records);

      const result = await checker.checkReadPermission('user-1', 'user', 'tasks', 'task-1');

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Record is deleted');
    });

    test('should allow access to deleted records when configured', async () => {
      const records = new Map<string, PermissionRecord>([
        ['tasks:task-1', { id: 'task-1', ownerId: 'user-1', deleted: new Date() }],
      ]);

      const config: PermissionConfig = {
        ...createDefaultPermissionConfig(),
        tableConfigs: [
          {
            table: 'tasks',
            rules: [],
            allowDeletedRecords: true,
          },
        ],
      };

      const checker = createTestChecker(config, records);

      const result = await checker.checkReadPermission('user-1', 'user', 'tasks', 'task-1');

      expect(result.allowed).toBe(true);
    });
  });

  describe('checkWritePermission', () => {
    test('should allow admin to write any record', async () => {
      const records = new Map<string, PermissionRecord>([
        ['tasks:task-1', { id: 'task-1', ownerId: 'other-user' }],
      ]);

      const checker = createTestChecker(createDefaultPermissionConfig(), records);

      const result = await checker.checkWritePermission('admin-user', 'admin', 'tasks', 'task-1');

      expect(result.allowed).toBe(true);
    });

    test('should allow owner to write their record', async () => {
      const records = new Map<string, PermissionRecord>([
        ['tasks:task-1', { id: 'task-1', ownerId: 'user-1' }],
      ]);

      const checker = createTestChecker(createDefaultPermissionConfig(), records);

      const result = await checker.checkWritePermission('user-1', 'user', 'tasks', 'task-1');

      expect(result.allowed).toBe(true);
    });

    test('should deny member from writing to shared record by default', async () => {
      const records = new Map<string, PermissionRecord>([
        ['tasks:task-1', { id: 'task-1', ownerId: 'owner', memberIds: ['user-1'] }],
      ]);

      const checker = createTestChecker(createDefaultPermissionConfig(), records);

      const result = await checker.checkWritePermission('user-1', 'user', 'tasks', 'task-1');

      expect(result.allowed).toBe(false);
    });

    test('should allow member to write when configured', async () => {
      const records = new Map<string, PermissionRecord>([
        ['tasks:task-1', { id: 'task-1', ownerId: 'owner', memberIds: ['user-1'] }],
      ]);

      const config: PermissionConfig = {
        globalRules: [
          createAdminRule(),
          createOwnerRule(),
          createMemberRule(['read', 'write']), // Allow members to write
        ],
        defaultDeny: true,
      };

      const checker = createTestChecker(config, records);

      const result = await checker.checkWritePermission('user-1', 'user', 'tasks', 'task-1');

      expect(result.allowed).toBe(true);
    });

    test('should allow create operation for authenticated users', async () => {
      const checker = createTestChecker(createDefaultPermissionConfig());

      const result = await checker.checkWritePermission(
        'user-1',
        'user',
        'tasks',
        '', // Empty ID for create
        'create',
      );

      expect(result.allowed).toBe(true);
      expect(result.matchedRule).toBe('authenticated-create');
    });
  });

  describe('checkDeletePermission', () => {
    test('should allow owner to delete their record', async () => {
      const records = new Map<string, PermissionRecord>([
        ['tasks:task-1', { id: 'task-1', ownerId: 'user-1' }],
      ]);

      const checker = createTestChecker(createDefaultPermissionConfig(), records);

      const result = await checker.checkWritePermission(
        'user-1',
        'user',
        'tasks',
        'task-1',
        'delete',
      );

      expect(result.allowed).toBe(true);
    });

    test('should deny non-owner from deleting', async () => {
      const records = new Map<string, PermissionRecord>([
        ['tasks:task-1', { id: 'task-1', ownerId: 'other-user' }],
      ]);

      const checker = createTestChecker(createDefaultPermissionConfig(), records);

      const result = await checker.checkWritePermission(
        'user-1',
        'user',
        'tasks',
        'task-1',
        'delete',
      );

      expect(result.allowed).toBe(false);
    });
  });

  describe('checkAdminPermission', () => {
    test('should allow admin role', async () => {
      const records = new Map<string, PermissionRecord>([
        ['tasks:task-1', { id: 'task-1', ownerId: 'other-user' }],
      ]);

      const checker = createTestChecker(createDefaultPermissionConfig(), records);

      const result = await checker.checkAdminPermission('admin-user', 'admin', 'tasks', 'task-1');

      expect(result.allowed).toBe(true);
    });

    test('should deny non-admin users', async () => {
      const records = new Map<string, PermissionRecord>([
        ['tasks:task-1', { id: 'task-1', ownerId: 'user-1' }],
      ]);

      const checker = createTestChecker(createDefaultPermissionConfig(), records);

      const result = await checker.checkAdminPermission('user-1', 'user', 'tasks', 'task-1');

      expect(result.allowed).toBe(false);
    });
  });

  describe('filterReadableRecords', () => {
    test('should filter to only readable records', async () => {
      const records = new Map<string, PermissionRecord>([
        ['tasks:task-1', { id: 'task-1', ownerId: 'user-1' }],
        ['tasks:task-2', { id: 'task-2', ownerId: 'other-user' }],
        ['tasks:task-3', { id: 'task-3', ownerId: 'user-1' }],
      ]);

      const checker = createTestChecker(createDefaultPermissionConfig(), records);

      const allRecords = [
        { id: 'task-1', ownerId: 'user-1' },
        { id: 'task-2', ownerId: 'other-user' },
        { id: 'task-3', ownerId: 'user-1' },
      ];

      const filtered = await checker.filterReadableRecords('user-1', 'user', 'tasks', allRecords);

      expect(filtered).toHaveLength(2);
      expect(filtered.map((r) => r.id)).toEqual(['task-1', 'task-3']);
    });

    test('should return all records for admin', async () => {
      const records = new Map<string, PermissionRecord>([
        ['tasks:task-1', { id: 'task-1', ownerId: 'other-1' }],
        ['tasks:task-2', { id: 'task-2', ownerId: 'other-2' }],
      ]);

      const checker = createTestChecker(createDefaultPermissionConfig(), records);

      const allRecords = [
        { id: 'task-1', ownerId: 'other-1' },
        { id: 'task-2', ownerId: 'other-2' },
      ];

      const filtered = await checker.filterReadableRecords('admin', 'admin', 'tasks', allRecords);

      expect(filtered).toHaveLength(2);
    });

    test('should return empty array for no readable records', async () => {
      const records = new Map<string, PermissionRecord>([
        ['tasks:task-1', { id: 'task-1', ownerId: 'other' }],
      ]);

      const checker = createTestChecker(createDefaultPermissionConfig(), records);

      const filtered = await checker.filterReadableRecords('user-1', 'user', 'tasks', [
        { id: 'task-1', ownerId: 'other' },
      ]);

      expect(filtered).toHaveLength(0);
    });
  });

  describe('batchCheckPermissions', () => {
    test('should check multiple permissions at once', async () => {
      const records = new Map<string, PermissionRecord>([
        ['tasks:task-1', { id: 'task-1', ownerId: 'user-1' }],
        ['tasks:task-2', { id: 'task-2', ownerId: 'other' }],
        ['notes:note-1', { id: 'note-1', ownerId: 'user-1' }],
      ]);

      const checker = createTestChecker(createDefaultPermissionConfig(), records);

      const results = await checker.batchCheckPermissions('user-1', 'user', [
        { table: 'tasks', recordId: 'task-1', permission: 'read' },
        { table: 'tasks', recordId: 'task-2', permission: 'read' },
        { table: 'notes', recordId: 'note-1', permission: 'write' },
      ]);

      expect(results.get('tasks:task-1')?.allowed).toBe(true);
      expect(results.get('tasks:task-2')?.allowed).toBe(false);
      expect(results.get('notes:note-1')?.allowed).toBe(true);
    });

    test('should handle non-existent records in batch', async () => {
      const checker = createTestChecker(createDefaultPermissionConfig());

      const results = await checker.batchCheckPermissions('user-1', 'user', [
        { table: 'tasks', recordId: 'non-existent', permission: 'read' },
      ]);

      expect(results.get('tasks:non-existent')?.allowed).toBe(false);
      expect(results.get('tasks:non-existent')?.reason).toBe('Record not found');
    });
  });

  describe('Custom rules', () => {
    test('should support custom permission rules', async () => {
      const records = new Map<string, PermissionRecord>([
        ['tasks:task-1', { id: 'task-1', ownerId: 'other', status: 'public' }],
        ['tasks:task-2', { id: 'task-2', ownerId: 'other', status: 'private' }],
      ]);

      const config: PermissionConfig = {
        globalRules: [
          createAdminRule(),
          // Custom rule: public records are readable by anyone
          createCustomRule(
            (_userId, _role, record) => record.status === 'public',
            ['read'],
            ['tasks'],
            75, // Higher priority than ownership
          ),
          createOwnerRule(),
        ],
        defaultDeny: true,
      };

      const checker = createTestChecker(config, records);

      // Public record should be readable
      const publicResult = await checker.checkReadPermission('user-1', 'user', 'tasks', 'task-1');
      expect(publicResult.allowed).toBe(true);
      expect(publicResult.matchedRule).toBe('custom');

      // Private record should not be readable
      const privateResult = await checker.checkReadPermission('user-1', 'user', 'tasks', 'task-2');
      expect(privateResult.allowed).toBe(false);
    });

    test('should handle async custom rules', async () => {
      const records = new Map<string, PermissionRecord>([
        ['tasks:task-1', { id: 'task-1', ownerId: 'other' }],
      ]);

      const config: PermissionConfig = {
        globalRules: [
          createCustomRule(
            async (_userId, _role, _record) => {
              // Simulate async check
              await new Promise((resolve) => setTimeout(resolve, 10));
              return true;
            },
            ['read'],
          ),
        ],
        defaultDeny: true,
      };

      const checker = createTestChecker(config, records);

      const result = await checker.checkReadPermission('user-1', 'user', 'tasks', 'task-1');

      expect(result.allowed).toBe(true);
    });

    test('should deny on custom rule error and fall through to default deny', async () => {
      const records = new Map<string, PermissionRecord>([
        ['tasks:task-1', { id: 'task-1', ownerId: 'other' }],
      ]);

      const config: PermissionConfig = {
        globalRules: [
          createCustomRule(() => {
            throw new Error('Custom rule error');
          }, ['read']),
        ],
        defaultDeny: true,
      };

      const checker = createTestChecker(config, records);

      const result = await checker.checkReadPermission('user-1', 'user', 'tasks', 'task-1');

      // When a custom rule throws, it doesn't grant permission, so the checker
      // continues to the next rule or falls through to default deny
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('No matching permission rules');
    });
  });

  describe('Table-specific rules', () => {
    test('should apply table-specific rules', async () => {
      const records = new Map<string, PermissionRecord>([
        ['public_posts:post-1', { id: 'post-1', ownerId: 'other' }],
        ['private_notes:note-1', { id: 'note-1', ownerId: 'other' }],
      ]);

      const config: PermissionConfig = {
        globalRules: [createAdminRule(), createOwnerRule()],
        tableConfigs: [
          {
            table: 'public_posts',
            rules: [
              {
                type: 'role',
                roles: ['user', 'admin'],
                grants: ['read'],
                priority: 100,
              },
            ],
          },
        ],
        defaultDeny: true,
      };

      const checker = createTestChecker(config, records);

      // Public posts are readable
      const postResult = await checker.checkReadPermission(
        'user-1',
        'user',
        'public_posts',
        'post-1',
      );
      expect(postResult.allowed).toBe(true);

      // Private notes are not readable (no table-specific rule)
      const noteResult = await checker.checkReadPermission(
        'user-1',
        'user',
        'private_notes',
        'note-1',
      );
      expect(noteResult.allowed).toBe(false);
    });
  });

  describe('Rule priority', () => {
    test('should evaluate rules in priority order', async () => {
      const records = new Map<string, PermissionRecord>([
        ['tasks:task-1', { id: 'task-1', ownerId: 'user-1', status: 'blocked' }],
      ]);

      const config: PermissionConfig = {
        globalRules: [
          // Blocking rule with higher priority
          createCustomRule(
            (_userId, _role, record) => {
              if (record.status === 'blocked') {
                return false;
              }
              return false;
            },
            ['read'],
            undefined,
            200, // Very high priority
          ),
          // Ownership rule with lower priority
          createOwnerRule(['read'], undefined, 50),
        ],
        defaultDeny: true,
      };

      const checker = createTestChecker(config, records);

      // Owner should be denied because blocking rule is checked first
      // and it doesn't grant access
      const result = await checker.checkReadPermission('user-1', 'user', 'tasks', 'task-1');

      // The blocking rule returns false (doesn't grant), so it falls through to ownership
      expect(result.allowed).toBe(true);
    });
  });

  describe('Custom owner field', () => {
    test('should use custom owner field', async () => {
      const records = new Map<string, PermissionRecord>([
        ['tasks:task-1', { id: 'task-1', authorId: 'user-1' } as PermissionRecord],
      ]);

      const config: PermissionConfig = {
        globalRules: [createOwnerRule(['read', 'write'], 'authorId')],
        defaultDeny: true,
      };

      const checker = createTestChecker(config, records);

      const result = await checker.checkReadPermission('user-1', 'user', 'tasks', 'task-1');

      expect(result.allowed).toBe(true);
      expect(result.matchedRule).toBe('ownership:authorId');
    });
  });

  describe('Custom member field', () => {
    test('should use custom member field', async () => {
      const records = new Map<string, PermissionRecord>([
        [
          'tasks:task-1',
          { id: 'task-1', ownerId: 'other', collaborators: ['user-1'] } as PermissionRecord,
        ],
      ]);

      const config: PermissionConfig = {
        globalRules: [createMemberRule(['read'], 'collaborators')],
        defaultDeny: true,
      };

      const checker = createTestChecker(config, records);

      const result = await checker.checkReadPermission('user-1', 'user', 'tasks', 'task-1');

      expect(result.allowed).toBe(true);
      expect(result.matchedRule).toBe('membership:collaborators');
    });
  });

  describe('Default allow behavior', () => {
    test('should allow when defaultDeny is false and no rules match', async () => {
      const records = new Map<string, PermissionRecord>([
        ['tasks:task-1', { id: 'task-1', ownerId: 'other' }],
      ]);

      const config: PermissionConfig = {
        globalRules: [],
        defaultDeny: false,
      };

      const checker = createTestChecker(config, records);

      const result = await checker.checkReadPermission('user-1', 'user', 'tasks', 'task-1');

      expect(result.allowed).toBe(true);
      expect(result.matchedRule).toBe('default-allow');
    });
  });
});

describe('Helper functions', () => {
  describe('createDefaultPermissionConfig', () => {
    test('should create config with admin, ownership, and membership rules', () => {
      const config = createDefaultPermissionConfig();

      expect(config.globalRules).toHaveLength(3);
      expect(config.globalRules[0]?.type).toBe('role');
      expect(config.globalRules[1]?.type).toBe('ownership');
      expect(config.globalRules[2]?.type).toBe('membership');
      expect(config.defaultDeny).toBe(true);
    });
  });

  describe('createAdminRule', () => {
    test('should create admin rule with all permissions', () => {
      const rule = createAdminRule();

      expect(rule.type).toBe('role');
      expect(rule.roles).toEqual(['admin']);
      expect(rule.grants).toEqual(['read', 'write', 'delete', 'admin']);
    });
  });

  describe('createOwnerRule', () => {
    test('should create owner rule with default grants', () => {
      const rule = createOwnerRule();

      expect(rule.type).toBe('ownership');
      expect(rule.grants).toEqual(['read', 'write', 'delete']);
    });

    test('should create owner rule with custom grants and field', () => {
      const rule = createOwnerRule(['read'], 'authorId', 100);

      expect(rule.grants).toEqual(['read']);
      expect(rule.ownerField).toBe('authorId');
      expect(rule.priority).toBe(100);
    });
  });

  describe('createMemberRule', () => {
    test('should create member rule with default grants', () => {
      const rule = createMemberRule();

      expect(rule.type).toBe('membership');
      expect(rule.grants).toEqual(['read']);
    });

    test('should create member rule with custom grants and field', () => {
      const rule = createMemberRule(['read', 'write'], 'collaborators', 75);

      expect(rule.grants).toEqual(['read', 'write']);
      expect(rule.memberField).toBe('collaborators');
      expect(rule.priority).toBe(75);
    });
  });
});
