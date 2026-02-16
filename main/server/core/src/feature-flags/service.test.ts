// main/server/core/src/feature-flags/service.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createFlag,
  deleteFlag,
  deleteTenantOverride,
  evaluateFlags,
  listFlags,
  listTenantOverrides,
  setTenantOverride,
  updateFlag,
} from './service';

import type {
  FeatureFlag,
  FeatureFlagRepository,
  TenantFeatureOverride,
  TenantFeatureOverrideRepository,
} from '../../../db/src';

// ============================================================================
// Test Helpers
// ============================================================================

function createMockFlagRepo(): FeatureFlagRepository {
  return {
    create: vi.fn(),
    findByKey: vi.fn(),
    findAll: vi.fn(),
    findEnabled: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
}

function createMockOverrideRepo(): TenantFeatureOverrideRepository {
  return {
    create: vi.fn(),
    findByTenantAndKey: vi.fn(),
    findByTenantId: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
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
// listFlags
// ============================================================================

describe('listFlags', () => {
  let flagRepo: FeatureFlagRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    flagRepo = createMockFlagRepo();
  });

  it('should return result from repo.findAll', async () => {
    const flags = [createMockFlag(), createMockFlag({ key: 'other.feature' })];
    vi.mocked(flagRepo.findAll).mockResolvedValue(flags);

    const result = await listFlags(flagRepo);

    expect(result).toBe(flags);
    expect(flagRepo.findAll).toHaveBeenCalledOnce();
  });
});

// ============================================================================
// createFlag
// ============================================================================

describe('createFlag', () => {
  let flagRepo: FeatureFlagRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    flagRepo = createMockFlagRepo();
  });

  it('should pass data to repo.create', async () => {
    const data = { key: 'new.flag', description: 'A new flag' };
    const created = createMockFlag({ key: 'new.flag', description: 'A new flag' });
    vi.mocked(flagRepo.create).mockResolvedValue(created);

    const result = await createFlag(flagRepo, data);

    expect(flagRepo.create).toHaveBeenCalledWith(data);
    expect(result).toBe(created);
  });
});

// ============================================================================
// updateFlag
// ============================================================================

describe('updateFlag', () => {
  let flagRepo: FeatureFlagRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    flagRepo = createMockFlagRepo();
  });

  it('should return updated flag', async () => {
    const updated = createMockFlag({ isEnabled: false });
    vi.mocked(flagRepo.update).mockResolvedValue(updated);

    const result = await updateFlag(flagRepo, 'test.feature', { isEnabled: false });

    expect(flagRepo.update).toHaveBeenCalledWith('test.feature', { isEnabled: false });
    expect(result).toBe(updated);
  });

  it('should throw when flag not found', async () => {
    vi.mocked(flagRepo.update).mockResolvedValue(null);

    await expect(updateFlag(flagRepo, 'missing.flag', { isEnabled: false })).rejects.toThrow(
      'Feature flag not found: missing.flag',
    );
  });
});

// ============================================================================
// deleteFlag
// ============================================================================

describe('deleteFlag', () => {
  let flagRepo: FeatureFlagRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    flagRepo = createMockFlagRepo();
  });

  it('should succeed when repo returns true', async () => {
    vi.mocked(flagRepo.delete).mockResolvedValue(true);

    await expect(deleteFlag(flagRepo, 'test.feature')).resolves.toBeUndefined();
    expect(flagRepo.delete).toHaveBeenCalledWith('test.feature');
  });

  it('should throw when flag not found', async () => {
    vi.mocked(flagRepo.delete).mockResolvedValue(false);

    await expect(deleteFlag(flagRepo, 'missing.flag')).rejects.toThrow(
      'Feature flag not found: missing.flag',
    );
  });
});

// ============================================================================
// listTenantOverrides
// ============================================================================

describe('listTenantOverrides', () => {
  let overrideRepo: TenantFeatureOverrideRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    overrideRepo = createMockOverrideRepo();
  });

  it('should return overrides for tenant', async () => {
    const overrides = [createMockOverride()];
    vi.mocked(overrideRepo.findByTenantId).mockResolvedValue(overrides);

    const result = await listTenantOverrides(overrideRepo, 'tenant-1');

    expect(overrideRepo.findByTenantId).toHaveBeenCalledWith('tenant-1');
    expect(result).toBe(overrides);
  });
});

// ============================================================================
// setTenantOverride
// ============================================================================

describe('setTenantOverride', () => {
  let overrideRepo: TenantFeatureOverrideRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    overrideRepo = createMockOverrideRepo();
  });

  it('should call upsert with correct params', async () => {
    const override = createMockOverride();
    vi.mocked(overrideRepo.upsert).mockResolvedValue(override);

    await setTenantOverride(overrideRepo, 'tenant-1', 'test.feature', { isEnabled: true });

    expect(overrideRepo.upsert).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      key: 'test.feature',
      value: undefined,
      isEnabled: true,
    });
  });

  it('should default isEnabled to true when not specified', async () => {
    vi.mocked(overrideRepo.upsert).mockResolvedValue(createMockOverride());

    await setTenantOverride(overrideRepo, 'tenant-1', 'test.feature', {});

    expect(overrideRepo.upsert).toHaveBeenCalledWith(expect.objectContaining({ isEnabled: true }));
  });

  it('should pass explicit isEnabled=false', async () => {
    vi.mocked(overrideRepo.upsert).mockResolvedValue(createMockOverride({ isEnabled: false }));

    await setTenantOverride(overrideRepo, 'tenant-1', 'test.feature', { isEnabled: false });

    expect(overrideRepo.upsert).toHaveBeenCalledWith(expect.objectContaining({ isEnabled: false }));
  });
});

// ============================================================================
// deleteTenantOverride
// ============================================================================

describe('deleteTenantOverride', () => {
  let overrideRepo: TenantFeatureOverrideRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    overrideRepo = createMockOverrideRepo();
  });

  it('should succeed when found', async () => {
    vi.mocked(overrideRepo.delete).mockResolvedValue(true);

    await expect(
      deleteTenantOverride(overrideRepo, 'tenant-1', 'test.feature'),
    ).resolves.toBeUndefined();
    expect(overrideRepo.delete).toHaveBeenCalledWith('tenant-1', 'test.feature');
  });

  it('should throw when not found', async () => {
    vi.mocked(overrideRepo.delete).mockResolvedValue(false);

    await expect(deleteTenantOverride(overrideRepo, 'tenant-1', 'test.feature')).rejects.toThrow(
      'Tenant feature override not found: tenant-1/test.feature',
    );
  });
});

// ============================================================================
// evaluateFlags
// ============================================================================

describe('evaluateFlags', () => {
  let flagRepo: FeatureFlagRepository;
  let overrideRepo: TenantFeatureOverrideRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    flagRepo = createMockFlagRepo();
    overrideRepo = createMockOverrideRepo();
  });

  it('should return empty map when no enabled flags', async () => {
    vi.mocked(flagRepo.findEnabled).mockResolvedValue([]);
    vi.mocked(overrideRepo.findByTenantId).mockResolvedValue([]);

    const result = await evaluateFlags(flagRepo, overrideRepo);

    expect(result.size).toBe(0);
  });

  it('should evaluate enabled flags as true by default', async () => {
    vi.mocked(flagRepo.findEnabled).mockResolvedValue([createMockFlag({ isEnabled: true })]);
    vi.mocked(overrideRepo.findByTenantId).mockResolvedValue([]);

    const result = await evaluateFlags(flagRepo, overrideRepo);

    expect(result.get('test.feature')).toBe(true);
  });

  it('should apply tenant override over flag evaluation', async () => {
    vi.mocked(flagRepo.findEnabled).mockResolvedValue([createMockFlag({ isEnabled: true })]);
    vi.mocked(overrideRepo.findByTenantId).mockResolvedValue([
      createMockOverride({ isEnabled: false }),
    ]);

    const result = await evaluateFlags(flagRepo, overrideRepo, 'tenant-1');

    expect(result.get('test.feature')).toBe(false);
  });

  it('should skip tenant override loading when no tenantId', async () => {
    vi.mocked(flagRepo.findEnabled).mockResolvedValue([createMockFlag()]);

    await evaluateFlags(flagRepo, overrideRepo);

    expect(overrideRepo.findByTenantId).not.toHaveBeenCalled();
  });

  it('should load tenant overrides when tenantId provided', async () => {
    vi.mocked(flagRepo.findEnabled).mockResolvedValue([]);
    vi.mocked(overrideRepo.findByTenantId).mockResolvedValue([]);

    await evaluateFlags(flagRepo, overrideRepo, 'tenant-1');

    expect(overrideRepo.findByTenantId).toHaveBeenCalledWith('tenant-1');
  });

  it('should handle mixed enabled/disabled flags correctly', async () => {
    vi.mocked(flagRepo.findEnabled).mockResolvedValue([
      createMockFlag({ key: 'flag.a', isEnabled: true }),
      createMockFlag({ key: 'flag.b', isEnabled: true }),
    ]);
    vi.mocked(overrideRepo.findByTenantId).mockResolvedValue([
      createMockOverride({ key: 'flag.a', isEnabled: false }),
    ]);

    const result = await evaluateFlags(flagRepo, overrideRepo, 'tenant-1');

    expect(result.get('flag.a')).toBe(false);
    expect(result.get('flag.b')).toBe(true);
  });

  it('should evaluate with user targeting (allowedUserIds in metadata)', async () => {
    vi.mocked(flagRepo.findEnabled).mockResolvedValue([
      createMockFlag({
        key: 'targeted.feature',
        isEnabled: true,
        metadata: { allowedUserIds: ['user-1', 'user-2'] },
      }),
    ]);

    const result = await evaluateFlags(flagRepo, overrideRepo, undefined, 'user-1');

    expect(result.get('targeted.feature')).toBe(true);
  });

  it('should evaluate with tenant targeting (allowedTenantIds in metadata)', async () => {
    vi.mocked(flagRepo.findEnabled).mockResolvedValue([
      createMockFlag({
        key: 'tenant.targeted',
        isEnabled: true,
        metadata: { allowedTenantIds: ['tenant-1'] },
      }),
    ]);
    vi.mocked(overrideRepo.findByTenantId).mockResolvedValue([]);

    const result = await evaluateFlags(flagRepo, overrideRepo, 'tenant-1');

    expect(result.get('tenant.targeted')).toBe(true);
  });

  it('should evaluate with percentage rollout', async () => {
    vi.mocked(flagRepo.findEnabled).mockResolvedValue([
      createMockFlag({
        key: 'rollout.feature',
        isEnabled: true,
        metadata: { rolloutPercentage: 100 },
      }),
    ]);

    const result = await evaluateFlags(flagRepo, overrideRepo, undefined, 'user-1');

    expect(result.get('rollout.feature')).toBe(true);
  });

  it('should reject all users when rolloutPercentage is 0', async () => {
    vi.mocked(flagRepo.findEnabled).mockResolvedValue([
      createMockFlag({
        key: 'rollout.zero',
        isEnabled: true,
        metadata: { rolloutPercentage: 0 },
      }),
    ]);

    const result = await evaluateFlags(flagRepo, overrideRepo, undefined, 'user-1');

    expect(result.get('rollout.zero')).toBe(false);
  });
});
