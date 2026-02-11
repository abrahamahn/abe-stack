// src/server/core/src/audit/service.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { record } from './service';

import type { AuditDeps } from './types';
import type { AuditEvent } from '@abe-stack/db';

// ============================================================================
// Test Helpers
// ============================================================================

function createMockDeps(): AuditDeps {
  return {
    auditEvents: {
      create: vi.fn(),
      findById: vi.fn(),
      findRecent: vi.fn(),
      findByActorId: vi.fn(),
      findByTenantId: vi.fn(),
      findByAction: vi.fn(),
      findByResource: vi.fn(),
    },
  } as unknown as AuditDeps;
}

function createMockAuditEvent(overrides?: Partial<AuditEvent>): AuditEvent {
  return {
    id: 'ae-1',
    tenantId: null,
    actorId: 'user-1',
    action: 'billing.plan_changed',
    category: 'billing',
    severity: 'info',
    resource: 'subscription',
    resourceId: 'sub-1',
    metadata: {},
    ipAddress: null,
    userAgent: null,
    createdAt: new Date(),
    ...overrides,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('record', () => {
  let deps: AuditDeps;

  beforeEach(() => {
    vi.clearAllMocks();
    deps = createMockDeps();
  });

  it('should create an audit event with required fields', async () => {
    const expected = createMockAuditEvent();
    vi.mocked(deps.auditEvents.create).mockResolvedValue(expected);

    const result = await record(deps, {
      actorId: 'user-1',
      action: 'billing.plan_changed',
      resource: 'subscription',
      resourceId: 'sub-1',
    });

    expect(result).toBe(expected);
    expect(deps.auditEvents.create).toHaveBeenCalledWith({
      actorId: 'user-1',
      action: 'billing.plan_changed',
      resource: 'subscription',
      resourceId: 'sub-1',
      tenantId: null,
      category: 'billing',
      severity: 'info',
      metadata: {},
      ipAddress: null,
      userAgent: null,
    });
  });

  it('should pass through optional metadata', async () => {
    const expected = createMockAuditEvent({
      metadata: { oldPlanId: 'plan-1', newPlanId: 'plan-2' },
    });
    vi.mocked(deps.auditEvents.create).mockResolvedValue(expected);

    await record(deps, {
      actorId: 'user-1',
      action: 'billing.plan_changed',
      resource: 'subscription',
      metadata: { oldPlanId: 'plan-1', newPlanId: 'plan-2' },
    });

    expect(deps.auditEvents.create).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: { oldPlanId: 'plan-1', newPlanId: 'plan-2' },
      }),
    );
  });

  it('should pass through tenantId, ipAddress, and userAgent', async () => {
    vi.mocked(deps.auditEvents.create).mockResolvedValue(createMockAuditEvent());

    await record(deps, {
      actorId: 'user-1',
      action: 'role.assigned',
      resource: 'membership',
      tenantId: 'tenant-1',
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
    });

    expect(deps.auditEvents.create).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-1',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      }),
    );
  });

  it('should use explicit severity when provided', async () => {
    vi.mocked(deps.auditEvents.create).mockResolvedValue(createMockAuditEvent());

    await record(deps, {
      actorId: 'user-1',
      action: 'billing.subscription_canceled',
      resource: 'subscription',
      severity: 'warn',
    });

    expect(deps.auditEvents.create).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'warn' }),
    );
  });

  it('should use explicit category when provided', async () => {
    vi.mocked(deps.auditEvents.create).mockResolvedValue(createMockAuditEvent());

    await record(deps, {
      actorId: 'user-1',
      action: 'custom.action',
      resource: 'widget',
      category: 'admin',
    });

    expect(deps.auditEvents.create).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'admin' }),
    );
  });

  describe('category inference', () => {
    it('should infer "billing" category for billing.* actions', async () => {
      vi.mocked(deps.auditEvents.create).mockResolvedValue(createMockAuditEvent());

      await record(deps, {
        actorId: 'user-1',
        action: 'billing.payment_method_added',
        resource: 'payment_method',
      });

      expect(deps.auditEvents.create).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'billing' }),
      );
    });

    it('should infer "admin" category for role.* actions', async () => {
      vi.mocked(deps.auditEvents.create).mockResolvedValue(createMockAuditEvent());

      await record(deps, {
        actorId: 'user-1',
        action: 'role.assigned',
        resource: 'membership',
      });

      expect(deps.auditEvents.create).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'admin' }),
      );
    });

    it('should infer "admin" category for workspace.* actions', async () => {
      vi.mocked(deps.auditEvents.create).mockResolvedValue(createMockAuditEvent());

      await record(deps, {
        actorId: 'user-1',
        action: 'workspace.member_added',
        resource: 'workspace',
      });

      expect(deps.auditEvents.create).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'admin' }),
      );
    });

    it('should infer "system" category for settings.* actions', async () => {
      vi.mocked(deps.auditEvents.create).mockResolvedValue(createMockAuditEvent());

      await record(deps, {
        actorId: 'user-1',
        action: 'settings.updated',
        resource: 'settings',
      });

      expect(deps.auditEvents.create).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'system' }),
      );
    });

    it('should default to "system" category for unknown prefixes', async () => {
      vi.mocked(deps.auditEvents.create).mockResolvedValue(createMockAuditEvent());

      await record(deps, {
        actorId: 'user-1',
        action: 'unknown.thing',
        resource: 'widget',
      });

      expect(deps.auditEvents.create).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'system' }),
      );
    });
  });

  it('should default resourceId to null when not provided', async () => {
    vi.mocked(deps.auditEvents.create).mockResolvedValue(createMockAuditEvent());

    await record(deps, {
      actorId: 'user-1',
      action: 'settings.updated',
      resource: 'settings',
    });

    expect(deps.auditEvents.create).toHaveBeenCalledWith(
      expect.objectContaining({ resourceId: null }),
    );
  });
});
