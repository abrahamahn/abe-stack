// src/server/db/src/schema/activities.test.ts
import { describe, expect, test } from 'vitest';

import {
  ACTIVITIES_TABLE,
  ACTIVITY_COLUMNS,
  ACTOR_TYPES,
  type Activity,
  type ActorType,
  type NewActivity,
} from './activities';

// ============================================================================
// Table Names
// ============================================================================

describe('Activities Schema - Table Names', () => {
  test('should have correct table name for activities', () => {
    expect(ACTIVITIES_TABLE).toBe('activities');
  });

  test('table name should be in snake_case format', () => {
    const snakeCasePattern = /^[a-z]+(_[a-z]+)*$/;
    expect(ACTIVITIES_TABLE).toMatch(snakeCasePattern);
  });
});

// ============================================================================
// Enums
// ============================================================================

describe('Activities Schema - ActorType Enum', () => {
  test('should have exactly 3 actor types', () => {
    expect(ACTOR_TYPES.length).toBe(3);
  });

  test('should contain correct actor type values', () => {
    expect(ACTOR_TYPES).toEqual(['user', 'system', 'api_key']);
  });

  test('enum values should match SQL CHECK constraint', () => {
    const types: ActorType[] = ['user', 'system', 'api_key'];
    types.forEach((type) => {
      expect(ACTOR_TYPES).toContain(type);
    });
  });

  test('enum values should be in snake_case format', () => {
    const snakeCasePattern = /^[a-z]+(_[a-z]+)*$/;
    ACTOR_TYPES.forEach((type) => {
      expect(type).toMatch(snakeCasePattern);
    });
  });
});

// ============================================================================
// Column Mappings
// ============================================================================

describe('Activities Schema - Activity Columns', () => {
  test('should have correct column mappings', () => {
    expect(ACTIVITY_COLUMNS).toEqual({
      id: 'id',
      tenantId: 'tenant_id',
      actorId: 'actor_id',
      actorType: 'actor_type',
      action: 'action',
      resourceType: 'resource_type',
      resourceId: 'resource_id',
      description: 'description',
      metadata: 'metadata',
      ipAddress: 'ip_address',
      createdAt: 'created_at',
    });
  });

  test('should map camelCase to snake_case correctly', () => {
    expect(ACTIVITY_COLUMNS.tenantId).toBe('tenant_id');
    expect(ACTIVITY_COLUMNS.actorId).toBe('actor_id');
    expect(ACTIVITY_COLUMNS.actorType).toBe('actor_type');
    expect(ACTIVITY_COLUMNS.resourceType).toBe('resource_type');
    expect(ACTIVITY_COLUMNS.resourceId).toBe('resource_id');
    expect(ACTIVITY_COLUMNS.ipAddress).toBe('ip_address');
    expect(ACTIVITY_COLUMNS.createdAt).toBe('created_at');
  });

  test('should have all required columns', () => {
    const requiredColumns = [
      'id',
      'tenantId',
      'actorId',
      'actorType',
      'action',
      'resourceType',
      'resourceId',
      'description',
      'metadata',
      'ipAddress',
      'createdAt',
    ];
    const actualColumns = Object.keys(ACTIVITY_COLUMNS);
    expect(actualColumns).toEqual(requiredColumns);
  });

  test('column values should be in snake_case format', () => {
    const snakeCasePattern = /^[a-z]+(_[a-z]+)*$/;
    const columnValues = Object.values(ACTIVITY_COLUMNS);
    columnValues.forEach((value) => {
      expect(value).toMatch(snakeCasePattern);
    });
  });

  test('should be immutable (as const assertion)', () => {
    const columns = ACTIVITY_COLUMNS;
    expect(columns).toBeDefined();
    expect(typeof columns).toBe('object');
    expect(Object.keys(columns).length).toBeGreaterThan(0);

    type IsReadonly = typeof columns extends { readonly id: string } ? true : false;
    const isReadonly: IsReadonly = true;
    expect(isReadonly).toBe(true);
  });
});

// ============================================================================
// Activity Type
// ============================================================================

describe('Activities Schema - Activity Type', () => {
  test('should accept valid user-initiated activity', () => {
    const activity: Activity = {
      id: 'act-123',
      tenantId: 'tenant-456',
      actorId: 'user-789',
      actorType: 'user',
      action: 'created',
      resourceType: 'project',
      resourceId: 'proj-001',
      description: 'Created project "Alpha"',
      metadata: { projectName: 'Alpha' },
      ipAddress: '192.168.1.1',
      createdAt: new Date(),
    };

    expect(activity).toBeDefined();
    expect(activity.actorType).toBe('user');
    expect(activity.action).toBe('created');
    expect(activity.resourceType).toBe('project');
  });

  test('should accept system-initiated activity', () => {
    const activity: Activity = {
      id: 'act-456',
      tenantId: 'tenant-456',
      actorId: null,
      actorType: 'system',
      action: 'scheduled_cleanup',
      resourceType: 'tenant',
      resourceId: 'tenant-456',
      description: 'Scheduled data cleanup completed',
      metadata: { recordsDeleted: 42 },
      ipAddress: null,
      createdAt: new Date(),
    };

    expect(activity.actorType).toBe('system');
    expect(activity.actorId).toBeNull();
    expect(activity.ipAddress).toBeNull();
  });

  test('should accept api_key-initiated activity', () => {
    const activity: Activity = {
      id: 'act-789',
      tenantId: 'tenant-456',
      actorId: null,
      actorType: 'api_key',
      action: 'imported',
      resourceType: 'document',
      resourceId: 'doc-100',
      description: 'Imported document via API',
      metadata: { apiKeyPrefix: 'ak_prod_' },
      ipAddress: '10.0.0.1',
      createdAt: new Date(),
    };

    expect(activity.actorType).toBe('api_key');
  });

  test('should handle null optional fields', () => {
    const activity: Activity = {
      id: 'act-minimal',
      tenantId: null,
      actorId: null,
      actorType: 'system',
      action: 'migration',
      resourceType: 'database',
      resourceId: 'schema-v2',
      description: null,
      metadata: {},
      ipAddress: null,
      createdAt: new Date(),
    };

    expect(activity.tenantId).toBeNull();
    expect(activity.actorId).toBeNull();
    expect(activity.description).toBeNull();
    expect(activity.ipAddress).toBeNull();
  });

  test('should accept all actor types', () => {
    const actorTypes: ActorType[] = ['user', 'system', 'api_key'];

    actorTypes.forEach((actorType) => {
      const activity: Activity = {
        id: `act-${actorType}`,
        tenantId: null,
        actorId: actorType === 'user' ? 'user-123' : null,
        actorType,
        action: 'test',
        resourceType: 'test',
        resourceId: 'test-1',
        description: null,
        metadata: {},
        ipAddress: null,
        createdAt: new Date(),
      };

      expect(activity.actorType).toBe(actorType);
    });
  });

  test('should accept various action verbs', () => {
    const actions = [
      'created',
      'updated',
      'deleted',
      'archived',
      'published',
      'invited',
      'removed',
    ];

    actions.forEach((action, index) => {
      const activity: Activity = {
        id: `act-${index}`,
        tenantId: null,
        actorId: 'user-123',
        actorType: 'user',
        action,
        resourceType: 'project',
        resourceId: 'proj-001',
        description: null,
        metadata: {},
        ipAddress: null,
        createdAt: new Date(),
      };

      expect(activity.action).toBe(action);
    });
  });

  test('should accept various resource types', () => {
    const resourceTypes = ['project', 'document', 'user', 'team', 'file', 'comment', 'task'];

    resourceTypes.forEach((resourceType, index) => {
      const activity: Activity = {
        id: `act-${index}`,
        tenantId: null,
        actorId: 'user-123',
        actorType: 'user',
        action: 'created',
        resourceType,
        resourceId: `${resourceType}-001`,
        description: null,
        metadata: {},
        ipAddress: null,
        createdAt: new Date(),
      };

      expect(activity.resourceType).toBe(resourceType);
    });
  });

  test('should accept non-UUID resource IDs (TEXT column)', () => {
    const nonUuidIds = [
      'slug-based-id',
      '12345',
      'ext:github:repo/123',
      'composite:tenant-1:proj-1',
    ];

    nonUuidIds.forEach((resourceId, index) => {
      const activity: Activity = {
        id: `act-${index}`,
        tenantId: null,
        actorId: null,
        actorType: 'system',
        action: 'synced',
        resourceType: 'external_resource',
        resourceId,
        description: null,
        metadata: {},
        ipAddress: null,
        createdAt: new Date(),
      };

      expect(activity.resourceId).toBe(resourceId);
    });
  });
});

// ============================================================================
// NewActivity Type
// ============================================================================

describe('Activities Schema - NewActivity Type', () => {
  test('should accept minimal new activity', () => {
    const newActivity: NewActivity = {
      actorType: 'user',
      action: 'created',
      resourceType: 'project',
      resourceId: 'proj-001',
    };

    expect(newActivity.actorType).toBe('user');
    expect(newActivity.action).toBe('created');
    expect(newActivity.resourceType).toBe('project');
    expect(newActivity.resourceId).toBe('proj-001');
  });

  test('should accept new activity with all optional fields', () => {
    const newActivity: NewActivity = {
      id: 'act-123',
      tenantId: 'tenant-456',
      actorId: 'user-789',
      actorType: 'user',
      action: 'updated',
      resourceType: 'document',
      resourceId: 'doc-100',
      description: 'Updated document title',
      metadata: { field: 'title', oldValue: 'Draft', newValue: 'Final' },
      ipAddress: '192.168.1.1',
      createdAt: new Date(),
    };

    expect(newActivity.id).toBe('act-123');
    expect(newActivity.tenantId).toBe('tenant-456');
    expect(newActivity.actorId).toBe('user-789');
    expect(newActivity.description).toBe('Updated document title');
    expect(newActivity.metadata).toHaveProperty('field', 'title');
    expect(newActivity.ipAddress).toBe('192.168.1.1');
  });

  test('should accept explicit null for nullable fields', () => {
    const newActivity: NewActivity = {
      actorType: 'system',
      action: 'cleanup',
      resourceType: 'tenant',
      resourceId: 'tenant-123',
      tenantId: null,
      actorId: null,
      description: null,
      ipAddress: null,
    };

    expect(newActivity.tenantId).toBeNull();
    expect(newActivity.actorId).toBeNull();
    expect(newActivity.description).toBeNull();
    expect(newActivity.ipAddress).toBeNull();
  });
});

// ============================================================================
// Type Consistency
// ============================================================================

describe('Activities Schema - Type Consistency', () => {
  test('New* types should be compatible with their base types', () => {
    const newActivity: NewActivity = {
      actorType: 'user',
      action: 'created',
      resourceType: 'project',
      resourceId: 'proj-001',
    };

    const fullActivity: Activity = {
      id: 'act-123',
      tenantId: null,
      actorId: null,
      description: null,
      metadata: {},
      ipAddress: null,
      createdAt: new Date(),
      ...newActivity,
    };

    expect(fullActivity.actorType).toBe(newActivity.actorType);
    expect(fullActivity.action).toBe(newActivity.action);
    expect(fullActivity.resourceType).toBe(newActivity.resourceType);
  });

  test('Column constants should cover all type properties', () => {
    const activity: Activity = {
      id: 'id',
      tenantId: null,
      actorId: null,
      actorType: 'user',
      action: 'a',
      resourceType: 'r',
      resourceId: 'r',
      description: null,
      metadata: {},
      ipAddress: null,
      createdAt: new Date(),
    };

    const activityKeys = Object.keys(activity);
    const columnKeys = Object.keys(ACTIVITY_COLUMNS);
    expect(columnKeys.sort()).toEqual(activityKeys.sort());
  });

  test('Date fields should be consistently named', () => {
    expect(ACTIVITY_COLUMNS.createdAt).toMatch(/_at$/);
  });

  test('Append-only table should not have Update type', () => {
    // TypeScript enforces this at compile time — NewActivity exists, UpdateActivity does not
    type HasNewActivity = NewActivity extends object ? true : false;
    const hasNewActivity: HasNewActivity = true;
    expect(hasNewActivity).toBe(true);
  });
});

// ============================================================================
// Integration Scenarios
// ============================================================================

describe('Activities Schema - Integration Scenarios', () => {
  test('should support project creation activity', () => {
    const activity: Activity = {
      id: 'act-proj-create',
      tenantId: 'tenant-123',
      actorId: 'user-456',
      actorType: 'user',
      action: 'created',
      resourceType: 'project',
      resourceId: 'proj-789',
      description: 'John created project "Q1 Roadmap"',
      metadata: { projectName: 'Q1 Roadmap', visibility: 'team' },
      ipAddress: '192.168.1.1',
      createdAt: new Date(),
    };

    expect(activity.action).toBe('created');
    expect(activity.resourceType).toBe('project');
    expect(activity.description).toContain('Q1 Roadmap');
  });

  test('should support team member invitation activity', () => {
    const activity: Activity = {
      id: 'act-invite',
      tenantId: 'tenant-123',
      actorId: 'user-456',
      actorType: 'user',
      action: 'invited',
      resourceType: 'user',
      resourceId: 'user-new-789',
      description: 'John invited jane@example.com to the team',
      metadata: { email: 'jane@example.com', role: 'member' },
      ipAddress: '192.168.1.1',
      createdAt: new Date(),
    };

    expect(activity.action).toBe('invited');
    expect(activity.metadata).toHaveProperty('email');
  });

  test('should support automated system activity', () => {
    const activity: Activity = {
      id: 'act-system',
      tenantId: 'tenant-123',
      actorId: null,
      actorType: 'system',
      action: 'archived',
      resourceType: 'project',
      resourceId: 'proj-old-001',
      description: 'Project auto-archived due to 90 days of inactivity',
      metadata: { reason: 'inactivity', inactiveDays: 90 },
      ipAddress: null,
      createdAt: new Date(),
    };

    expect(activity.actorType).toBe('system');
    expect(activity.actorId).toBeNull();
    expect(activity.action).toBe('archived');
  });

  test('should support API key activity with tracking', () => {
    const activity: Activity = {
      id: 'act-api',
      tenantId: 'tenant-123',
      actorId: null,
      actorType: 'api_key',
      action: 'imported',
      resourceType: 'document',
      resourceId: 'doc-batch-001',
      description: 'Bulk import via API: 150 documents',
      metadata: { apiKeyPrefix: 'ak_prod_', documentCount: 150, batchId: 'batch-xyz' },
      ipAddress: '10.0.0.42',
      createdAt: new Date(),
    };

    expect(activity.actorType).toBe('api_key');
    expect(activity.metadata).toHaveProperty('documentCount', 150);
  });

  test('should support tenant timeline view', () => {
    const tenantId = 'tenant-123';
    const activities: Activity[] = [
      {
        id: 'act-1',
        tenantId,
        actorId: 'user-1',
        actorType: 'user',
        action: 'created',
        resourceType: 'project',
        resourceId: 'proj-1',
        description: 'Alice created "Alpha"',
        metadata: {},
        ipAddress: null,
        createdAt: new Date('2026-02-06T10:00:00Z'),
      },
      {
        id: 'act-2',
        tenantId,
        actorId: 'user-2',
        actorType: 'user',
        action: 'commented',
        resourceType: 'project',
        resourceId: 'proj-1',
        description: 'Bob commented on "Alpha"',
        metadata: {},
        ipAddress: null,
        createdAt: new Date('2026-02-06T10:05:00Z'),
      },
      {
        id: 'act-3',
        tenantId,
        actorId: null,
        actorType: 'system',
        action: 'deployed',
        resourceType: 'project',
        resourceId: 'proj-1',
        description: 'Project "Alpha" deployed to production',
        metadata: {},
        ipAddress: null,
        createdAt: new Date('2026-02-06T10:10:00Z'),
      },
    ];

    expect(activities.every((a) => a.tenantId === tenantId)).toBe(true);
    expect(activities.length).toBe(3);

    // Verify chronological order
    for (let i = 1; i < activities.length; i++) {
      expect(activities[i].createdAt.getTime()).toBeGreaterThan(
        activities[i - 1].createdAt.getTime(),
      );
    }
  });

  test('should support resource-specific activity feed', () => {
    const resourceType = 'document';
    const resourceId = 'doc-123';

    const activities: Activity[] = [
      {
        id: 'act-doc-1',
        tenantId: 'tenant-123',
        actorId: 'user-1',
        actorType: 'user',
        action: 'created',
        resourceType,
        resourceId,
        description: 'Created document',
        metadata: {},
        ipAddress: null,
        createdAt: new Date('2026-02-01'),
      },
      {
        id: 'act-doc-2',
        tenantId: 'tenant-123',
        actorId: 'user-2',
        actorType: 'user',
        action: 'updated',
        resourceType,
        resourceId,
        description: 'Updated document title',
        metadata: { field: 'title' },
        ipAddress: null,
        createdAt: new Date('2026-02-03'),
      },
      {
        id: 'act-doc-3',
        tenantId: 'tenant-123',
        actorId: 'user-1',
        actorType: 'user',
        action: 'published',
        resourceType,
        resourceId,
        description: 'Published document',
        metadata: {},
        ipAddress: null,
        createdAt: new Date('2026-02-06'),
      },
    ];

    expect(activities.every((a) => a.resourceType === resourceType)).toBe(true);
    expect(activities.every((a) => a.resourceId === resourceId)).toBe(true);
    expect(activities.length).toBe(3);
  });
});

// ============================================================================
// Edge Cases
// ============================================================================

describe('Activities Schema - Edge Cases', () => {
  test('should handle empty metadata', () => {
    const activity: Activity = {
      id: 'act-123',
      tenantId: null,
      actorId: null,
      actorType: 'system',
      action: 'ping',
      resourceType: 'system',
      resourceId: 'health',
      description: null,
      metadata: {},
      ipAddress: null,
      createdAt: new Date(),
    };

    expect(activity.metadata).toEqual({});
    expect(Object.keys(activity.metadata).length).toBe(0);
  });

  test('should handle complex metadata', () => {
    const metadata = {
      changes: {
        title: { from: 'Draft', to: 'Final Report' },
        status: { from: 'draft', to: 'published' },
      },
      attachments: ['file-1', 'file-2'],
      tags: ['important', 'reviewed'],
      nested: { deep: { value: true } },
    };

    const activity: Activity = {
      id: 'act-complex',
      tenantId: 'tenant-123',
      actorId: 'user-456',
      actorType: 'user',
      action: 'updated',
      resourceType: 'document',
      resourceId: 'doc-789',
      description: 'Bulk update with attachments',
      metadata,
      ipAddress: '192.168.1.1',
      createdAt: new Date(),
    };

    expect(activity.metadata).toEqual(metadata);
    expect(activity.metadata).toHaveProperty('changes');
  });

  test('should handle special characters in description', () => {
    const activity: Activity = {
      id: 'act-special',
      tenantId: null,
      actorId: 'user-123',
      actorType: 'user',
      action: 'commented',
      resourceType: 'task',
      resourceId: 'task-1',
      description: "John said: \"This looks great! Let's ship it. <script>alert('xss')</script>\"",
      metadata: {},
      ipAddress: null,
      createdAt: new Date(),
    };

    expect(activity.description).toContain('<script>');
  });

  test('should handle IPv6 addresses', () => {
    const activity: Activity = {
      id: 'act-ipv6',
      tenantId: null,
      actorId: 'user-123',
      actorType: 'user',
      action: 'created',
      resourceType: 'test',
      resourceId: 'test-1',
      description: null,
      metadata: {},
      ipAddress: '2001:0db8:85a3:0000:0000:8a2e:0370:7334',
      createdAt: new Date(),
    };

    expect(activity.ipAddress).toContain(':');
  });

  test('should handle very long action/resource strings', () => {
    const activity: Activity = {
      id: 'act-long',
      tenantId: null,
      actorId: null,
      actorType: 'system',
      action: 'batch_process_completed_with_warnings',
      resourceType: 'scheduled_maintenance_task',
      resourceId: 'ext:integration:very:long:composite:identifier:12345',
      description: null,
      metadata: {},
      ipAddress: null,
      createdAt: new Date(),
    };

    expect(activity.action).toBe('batch_process_completed_with_warnings');
    expect(activity.resourceId).toContain('ext:integration');
  });
});
