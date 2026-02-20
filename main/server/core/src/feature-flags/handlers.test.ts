// main/server/core/src/feature-flags/handlers.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  handleCreateFlag,
  handleDeleteFlag,
  handleDeleteTenantOverride,
  handleEvaluateFlags,
  handleListFlags,
  handleListTenantOverrides,
  handleSetTenantOverride,
  handleUpdateFlag,
} from './handlers';

import type { FeatureFlagAppContext } from './types';
import type { FeatureFlag, TenantFeatureOverride } from '../../../db/src';

// ============================================================================
// Test Helpers
// ============================================================================

function createMockContext(): FeatureFlagAppContext {
  return {
    db: {},
    repos: {
      featureFlags: {
        create: vi.fn(),
        findByKey: vi.fn(),
        findAll: vi.fn(),
        findEnabled: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      tenantFeatureOverrides: {
        create: vi.fn(),
        findByTenantAndKey: vi.fn(),
        findByTenantId: vi.fn(),
        update: vi.fn(),
        upsert: vi.fn(),
        delete: vi.fn(),
      },
    },
    log: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    },
    errorTracker: {
      captureError: vi.fn(),
      addBreadcrumb: vi.fn(),
      setUserContext: vi.fn(),
    },
  };
}

function createMockFlag(overrides?: Partial<FeatureFlag>): FeatureFlag {
  return {
    key: 'test.feature',
    description: null,
    isEnabled: true,
    defaultValue: false,
    metadata: {},
    createdAt: new Date('2026-01-15T10:00:00Z'),
    updatedAt: new Date('2026-01-15T10:00:00Z'),
    ...overrides,
  };
}

function createMockOverride(overrides?: Partial<TenantFeatureOverride>): TenantFeatureOverride {
  return {
    tenantId: 'tenant-1',
    key: 'test.feature',
    value: null,
    isEnabled: true,
    ...overrides,
  };
}

// ============================================================================
// handleListFlags
// ============================================================================

describe('handleListFlags', () => {
  let ctx: FeatureFlagAppContext;

  beforeEach(() => {
    vi.clearAllMocks();
    ctx = createMockContext();
  });

  it('should return 200 with formatted flags', async () => {
    const flags = [createMockFlag(), createMockFlag({ key: 'other.flag' })];
    vi.mocked(ctx.repos.featureFlags.findAll).mockResolvedValue(flags);

    const result = await handleListFlags(ctx, null, null);

    expect(result.status).toBe(200);
    const body = result.body as { flags: Array<{ key: string; createdAt: string }> };
    expect(body.flags).toHaveLength(2);
    expect(body.flags.at(0)?.createdAt).toBe('2026-01-15T10:00:00.000Z');
  });

  it('should return 500 on error', async () => {
    vi.mocked(ctx.repos.featureFlags.findAll).mockRejectedValue(new Error('DB failure'));

    const result = await handleListFlags(ctx, null, null);

    expect(result.status).toBe(500);
  });
});

// ============================================================================
// handleCreateFlag
// ============================================================================

describe('handleCreateFlag', () => {
  let ctx: FeatureFlagAppContext;

  beforeEach(() => {
    vi.clearAllMocks();
    ctx = createMockContext();
  });

  it('should return 400 when key is missing', async () => {
    const result = await handleCreateFlag(ctx, { description: 'No key' }, null);

    expect(result.status).toBe(400);
    expect(result.body).toEqual({ message: 'key is required' });
  });

  it('should return 400 when key is empty string', async () => {
    const result = await handleCreateFlag(ctx, { key: '' }, null);

    expect(result.status).toBe(400);
    expect(result.body).toEqual({ message: 'key is required' });
  });

  it('should return 201 with created flag', async () => {
    const flag = createMockFlag({ key: 'new.flag' });
    vi.mocked(ctx.repos.featureFlags.create).mockResolvedValue(flag);

    const result = await handleCreateFlag(ctx, { key: 'new.flag' }, null);

    expect(result.status).toBe(201);
    const body = result.body as { flag: { key: string } };
    expect(body.flag.key).toBe('new.flag');
  });

  it('should return 400 on duplicate key error', async () => {
    vi.mocked(ctx.repos.featureFlags.create).mockRejectedValue(new Error('duplicate key value'));

    const result = await handleCreateFlag(ctx, { key: 'existing.flag' }, null);

    expect(result.status).toBe(400);
  });

  it('should return 500 on unexpected error', async () => {
    vi.mocked(ctx.repos.featureFlags.create).mockRejectedValue(new Error('Connection lost'));

    const result = await handleCreateFlag(ctx, { key: 'new.flag' }, null);

    expect(result.status).toBe(500);
  });
});

// ============================================================================
// handleUpdateFlag
// ============================================================================

describe('handleUpdateFlag', () => {
  let ctx: FeatureFlagAppContext;

  beforeEach(() => {
    vi.clearAllMocks();
    ctx = createMockContext();
  });

  it('should return 400 when key param missing', async () => {
    const result = await handleUpdateFlag(ctx, { isEnabled: false }, { params: {} });

    expect(result.status).toBe(400);
    expect(result.body).toEqual({ message: 'key parameter is required' });
  });

  it('should return 200 with updated flag', async () => {
    const updated = createMockFlag({ isEnabled: false });
    vi.mocked(ctx.repos.featureFlags.update).mockResolvedValue(updated);

    const result = await handleUpdateFlag(
      ctx,
      { isEnabled: false },
      { params: { key: 'test.feature' } },
    );

    expect(result.status).toBe(200);
    const body = result.body as { flag: { isEnabled: boolean } };
    expect(body.flag.isEnabled).toBe(false);
  });

  it('should return 404 when flag not found', async () => {
    vi.mocked(ctx.repos.featureFlags.update).mockResolvedValue(null);

    const result = await handleUpdateFlag(
      ctx,
      { isEnabled: false },
      { params: { key: 'missing.flag' } },
    );

    expect(result.status).toBe(404);
  });
});

// ============================================================================
// handleDeleteFlag
// ============================================================================

describe('handleDeleteFlag', () => {
  let ctx: FeatureFlagAppContext;

  beforeEach(() => {
    vi.clearAllMocks();
    ctx = createMockContext();
  });

  it('should return 400 when key param missing', async () => {
    const result = await handleDeleteFlag(ctx, null, { params: {} });

    expect(result.status).toBe(400);
    expect(result.body).toEqual({ message: 'key parameter is required' });
  });

  it('should return 200 on success', async () => {
    vi.mocked(ctx.repos.featureFlags.delete).mockResolvedValue(true);

    const result = await handleDeleteFlag(ctx, null, { params: { key: 'test.feature' } });

    expect(result.status).toBe(200);
    const body = result.body as { success: boolean; message: string };
    expect(body.success).toBe(true);
  });

  it('should return 404 when flag not found', async () => {
    vi.mocked(ctx.repos.featureFlags.delete).mockResolvedValue(false);

    const result = await handleDeleteFlag(ctx, null, { params: { key: 'missing.flag' } });

    expect(result.status).toBe(404);
  });
});

// ============================================================================
// handleListTenantOverrides
// ============================================================================

describe('handleListTenantOverrides', () => {
  let ctx: FeatureFlagAppContext;

  beforeEach(() => {
    vi.clearAllMocks();
    ctx = createMockContext();
  });

  it('should return 400 when tenantId missing', async () => {
    const result = await handleListTenantOverrides(ctx, null, { params: {} });

    expect(result.status).toBe(400);
    expect(result.body).toEqual({ message: 'tenantId parameter is required' });
  });

  it('should return 200 with overrides', async () => {
    const overrides = [createMockOverride()];
    vi.mocked(ctx.repos.tenantFeatureOverrides.findByTenantId).mockResolvedValue(overrides);

    const result = await handleListTenantOverrides(ctx, null, { params: { tenantId: 'tenant-1' } });

    expect(result.status).toBe(200);
    const body = result.body as { overrides: Array<{ key: string }> };
    expect(body.overrides).toHaveLength(1);
    expect(body.overrides.at(0)?.key).toBe('test.feature');
  });
});

// ============================================================================
// handleSetTenantOverride
// ============================================================================

describe('handleSetTenantOverride', () => {
  let ctx: FeatureFlagAppContext;

  beforeEach(() => {
    vi.clearAllMocks();
    ctx = createMockContext();
  });

  it('should return 400 when params missing', async () => {
    const result = await handleSetTenantOverride(ctx, {}, { params: {} });

    expect(result.status).toBe(400);
    expect(result.body).toEqual({ message: 'tenantId and key parameters are required' });
  });

  it('should return 400 when key param missing', async () => {
    const result = await handleSetTenantOverride(ctx, {}, { params: { tenantId: 'tenant-1' } });

    expect(result.status).toBe(400);
  });

  it('should return 200 with upserted override', async () => {
    const override = createMockOverride();
    vi.mocked(ctx.repos.tenantFeatureOverrides.upsert).mockResolvedValue(override);

    const result = await handleSetTenantOverride(
      ctx,
      { isEnabled: true },
      { params: { tenantId: 'tenant-1', key: 'test.feature' } },
    );

    expect(result.status).toBe(200);
    const body = result.body as { override: { key: string; isEnabled: boolean } };
    expect(body.override.key).toBe('test.feature');
    expect(body.override.isEnabled).toBe(true);
  });
});

// ============================================================================
// handleDeleteTenantOverride
// ============================================================================

describe('handleDeleteTenantOverride', () => {
  let ctx: FeatureFlagAppContext;

  beforeEach(() => {
    vi.clearAllMocks();
    ctx = createMockContext();
  });

  it('should return 400 when params missing', async () => {
    const result = await handleDeleteTenantOverride(ctx, null, { params: {} });

    expect(result.status).toBe(400);
    expect(result.body).toEqual({ message: 'tenantId and key parameters are required' });
  });

  it('should return 200 on success', async () => {
    vi.mocked(ctx.repos.tenantFeatureOverrides.delete).mockResolvedValue(true);

    const result = await handleDeleteTenantOverride(ctx, null, {
      params: { tenantId: 'tenant-1', key: 'test.feature' },
    });

    expect(result.status).toBe(200);
    const body = result.body as { success: boolean; message: string };
    expect(body.success).toBe(true);
  });

  it('should return 404 when not found', async () => {
    vi.mocked(ctx.repos.tenantFeatureOverrides.delete).mockResolvedValue(false);

    const result = await handleDeleteTenantOverride(ctx, null, {
      params: { tenantId: 'tenant-1', key: 'missing.flag' },
    });

    expect(result.status).toBe(404);
  });
});

// ============================================================================
// handleEvaluateFlags
// ============================================================================

describe('handleEvaluateFlags', () => {
  let ctx: FeatureFlagAppContext;

  beforeEach(() => {
    vi.clearAllMocks();
    ctx = createMockContext();
  });

  it('should return 401 when no user', async () => {
    const result = await handleEvaluateFlags(ctx, null, {});

    expect(result.status).toBe(401);
    expect(result.body).toEqual({ message: 'Unauthorized' });
  });

  it('should return 200 with evaluated flag map', async () => {
    vi.mocked(ctx.repos.featureFlags.findEnabled).mockResolvedValue([
      createMockFlag({ key: 'flag.a', isEnabled: true }),
    ]);
    vi.mocked(ctx.repos.tenantFeatureOverrides.findByTenantId).mockResolvedValue([]);

    const result = await handleEvaluateFlags(ctx, null, { user: { userId: 'user-1' } });

    expect(result.status).toBe(200);
    const body = result.body as { flags: Record<string, boolean> };
    expect(body.flags['flag.a']).toBe(true);
  });

  it('should convert Map to plain object', async () => {
    vi.mocked(ctx.repos.featureFlags.findEnabled).mockResolvedValue([
      createMockFlag({ key: 'flag.x', isEnabled: true }),
      createMockFlag({ key: 'flag.y', isEnabled: true }),
    ]);

    const result = await handleEvaluateFlags(ctx, null, { user: { userId: 'user-1' } });

    const body = result.body as { flags: Record<string, boolean> };
    expect(typeof body.flags).toBe('object');
    expect(body.flags).not.toBeInstanceOf(Map);
    expect(body.flags['flag.x']).toBe(true);
    expect(body.flags['flag.y']).toBe(true);
  });

  it('should pass tenantId from query params', async () => {
    vi.mocked(ctx.repos.featureFlags.findEnabled).mockResolvedValue([]);
    vi.mocked(ctx.repos.tenantFeatureOverrides.findByTenantId).mockResolvedValue([]);

    await handleEvaluateFlags(ctx, null, {
      user: { userId: 'user-1' },
      query: { tenantId: 'tenant-1' },
    });

    expect(ctx.repos.tenantFeatureOverrides.findByTenantId).toHaveBeenCalledWith('tenant-1');
  });

  it('should return 500 on error', async () => {
    vi.mocked(ctx.repos.featureFlags.findEnabled).mockRejectedValue(new Error('DB failure'));

    const result = await handleEvaluateFlags(ctx, null, { user: { userId: 'user-1' } });

    expect(result.status).toBe(500);
  });
});
