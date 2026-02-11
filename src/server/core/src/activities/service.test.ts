// src/server/core/src/activities/service.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getActivityFeed, getTenantActivityFeed, logActivity } from './service';

import type { Activity, ActivityRepository, NewActivity } from '@abe-stack/db';

// ============================================================================
// Test Helpers
// ============================================================================

function createMockRepo(): ActivityRepository {
  return {
    findById: vi.fn(),
    findRecent: vi.fn(),
    findByActorId: vi.fn(),
    findByTenantId: vi.fn(),
    findByResource: vi.fn(),
    create: vi.fn(),
  };
}

function createMockActivity(overrides?: Partial<Activity>): Activity {
  return {
    id: 'act-1',
    tenantId: null,
    actorId: 'user-1',
    actorType: 'user',
    action: 'created',
    resourceType: 'project',
    resourceId: 'proj-1',
    description: null,
    metadata: {},
    ipAddress: null,
    createdAt: new Date('2026-01-15T10:00:00Z'),
    ...overrides,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('logActivity', () => {
  let repo: ActivityRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = createMockRepo();
  });

  it('should pass params through to repo.create', async () => {
    const params: NewActivity = {
      actorType: 'user',
      action: 'created',
      resourceType: 'project',
      resourceId: 'proj-1',
      actorId: 'user-1',
    };
    vi.mocked(repo.create).mockResolvedValue(createMockActivity());

    await logActivity(repo, params);

    expect(repo.create).toHaveBeenCalledWith(params);
  });

  it('should return the created activity', async () => {
    const expected = createMockActivity({ id: 'act-42' });
    vi.mocked(repo.create).mockResolvedValue(expected);

    const result = await logActivity(repo, {
      actorType: 'user',
      action: 'created',
      resourceType: 'project',
      resourceId: 'proj-1',
    });

    expect(result).toBe(expected);
  });
});

describe('getActivityFeed', () => {
  let repo: ActivityRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = createMockRepo();
  });

  it('should pass actorId and limit to repo.findByActorId', async () => {
    vi.mocked(repo.findByActorId).mockResolvedValue([]);

    await getActivityFeed(repo, 'user-1', 25);

    expect(repo.findByActorId).toHaveBeenCalledWith('user-1', 25);
  });

  it('should use default limit of 50 when not specified', async () => {
    vi.mocked(repo.findByActorId).mockResolvedValue([]);

    await getActivityFeed(repo, 'user-1');

    expect(repo.findByActorId).toHaveBeenCalledWith('user-1', 50);
  });

  it('should return activities from repository', async () => {
    const activities = [createMockActivity(), createMockActivity({ id: 'act-2' })];
    vi.mocked(repo.findByActorId).mockResolvedValue(activities);

    const result = await getActivityFeed(repo, 'user-1');

    expect(result).toBe(activities);
  });
});

describe('getTenantActivityFeed', () => {
  let repo: ActivityRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = createMockRepo();
  });

  it('should pass tenantId and limit to repo.findByTenantId', async () => {
    vi.mocked(repo.findByTenantId).mockResolvedValue([]);

    await getTenantActivityFeed(repo, 'tenant-1', 30);

    expect(repo.findByTenantId).toHaveBeenCalledWith('tenant-1', 30);
  });

  it('should use default limit of 50 when not specified', async () => {
    vi.mocked(repo.findByTenantId).mockResolvedValue([]);

    await getTenantActivityFeed(repo, 'tenant-1');

    expect(repo.findByTenantId).toHaveBeenCalledWith('tenant-1', 50);
  });

  it('should return activities from repository', async () => {
    const activities = [createMockActivity({ tenantId: 'tenant-1' })];
    vi.mocked(repo.findByTenantId).mockResolvedValue(activities);

    const result = await getTenantActivityFeed(repo, 'tenant-1');

    expect(result).toBe(activities);
  });
});
