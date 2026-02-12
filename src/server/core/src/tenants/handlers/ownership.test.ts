// src/server/core/src/tenants/handlers/ownership.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { handleTransferOwnership } from './ownership';

import type { TenantsModuleDeps, TenantsRequest } from '../types';
import type { DbClient, Repositories } from '@abe-stack/db';

// ============================================================================
// Mocks
// ============================================================================

const { mockTransferOwnership, mockRecord, mockLogActivity } = vi.hoisted(() => ({
  mockTransferOwnership: vi.fn(),
  mockRecord: vi.fn().mockResolvedValue(undefined),
  mockLogActivity: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../service', () => ({
  transferOwnership: mockTransferOwnership,
}));

vi.mock('../../audit/service', () => ({
  record: mockRecord,
}));

vi.mock('../../activities', () => ({
  logActivity: mockLogActivity,
}));

// ============================================================================
// Test Helpers
// ============================================================================

function createMockDeps(): TenantsModuleDeps {
  return {
    db: {} as DbClient,
    repos: {
      auditEvents: {},
      activities: {},
    } as Repositories,
    log: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      child: vi.fn(),
    },
  } as unknown as TenantsModuleDeps;
}

function createMockRequest(user?: { userId: string; email?: string }): TenantsRequest {
  return {
    user,
    requestInfo: { ipAddress: '127.0.0.1', userAgent: 'test' },
    cookies: {},
    headers: {},
  } as TenantsRequest;
}

// ============================================================================
// handleTransferOwnership
// ============================================================================

describe('handleTransferOwnership', () => {
  let deps: TenantsModuleDeps;

  beforeEach(() => {
    vi.clearAllMocks();
    deps = createMockDeps();
  });

  it('should return 401 when no user', async () => {
    const request = createMockRequest();

    const result = await handleTransferOwnership(
      deps,
      'tenant-1',
      { newOwnerId: 'user-2' },
      request,
    );

    expect(result.status).toBe(401);
    expect(result.body).toEqual({ message: 'Unauthorized' });
  });

  it('should return 200 on successful transfer', async () => {
    mockTransferOwnership.mockResolvedValue(undefined);
    const request = createMockRequest({ userId: 'user-1' });

    const result = await handleTransferOwnership(
      deps,
      'tenant-1',
      { newOwnerId: 'user-2' },
      request,
    );

    expect(result.status).toBe(200);
    expect(result.body).toEqual({ message: 'Ownership transferred successfully' });
  });

  it('should call transferOwnership with correct args', async () => {
    mockTransferOwnership.mockResolvedValue(undefined);
    const request = createMockRequest({ userId: 'user-1' });

    await handleTransferOwnership(deps, 'tenant-1', { newOwnerId: 'user-2' }, request);

    expect(mockTransferOwnership).toHaveBeenCalledWith(
      deps.db,
      deps.repos,
      'tenant-1',
      'user-1',
      'user-2',
    );
  });

  it('should map service errors via mapErrorToHttpResponse', async () => {
    mockTransferOwnership.mockRejectedValue(new Error('Service failure'));
    const request = createMockRequest({ userId: 'user-1' });

    const result = await handleTransferOwnership(
      deps,
      'tenant-1',
      { newOwnerId: 'user-2' },
      request,
    );

    expect(result.status).toBe(500);
    expect(deps.log.error).toHaveBeenCalled();
  });

  it('should call audit record with correct params on success', async () => {
    mockTransferOwnership.mockResolvedValue(undefined);
    const request = createMockRequest({ userId: 'user-1' });

    await handleTransferOwnership(deps, 'tenant-1', { newOwnerId: 'user-2' }, request);

    expect(mockRecord).toHaveBeenCalledWith(
      { auditEvents: deps.repos.auditEvents },
      expect.objectContaining({
        actorId: 'user-1',
        action: 'workspace.ownership_transferred',
        resource: 'tenant',
        resourceId: 'tenant-1',
        tenantId: 'tenant-1',
      }),
    );
  });

  it('should call logActivity with correct params on success', async () => {
    mockTransferOwnership.mockResolvedValue(undefined);
    const request = createMockRequest({ userId: 'user-1' });

    await handleTransferOwnership(deps, 'tenant-1', { newOwnerId: 'user-2' }, request);

    expect(mockLogActivity).toHaveBeenCalledWith(
      deps.repos.activities,
      expect.objectContaining({
        actorId: 'user-1',
        action: 'ownership.transferred',
        resourceType: 'tenant',
        resourceId: 'tenant-1',
        tenantId: 'tenant-1',
      }),
    );
  });

  it('should return 500 when service throws NotFoundError', async () => {
    const { NotFoundError } = await import('@abe-stack/shared');
    mockTransferOwnership.mockRejectedValue(new NotFoundError('Workspace not found'));
    const request = createMockRequest({ userId: 'user-1' });

    const result = await handleTransferOwnership(deps, 'tenant-1', { newOwnerId: 'user-2' }, request);

    expect(result.status).toBe(500);
  });

  it('should return 500 when service throws ForbiddenError', async () => {
    const { ForbiddenError } = await import('@abe-stack/shared');
    mockTransferOwnership.mockRejectedValue(new ForbiddenError('Not the owner'));
    const request = createMockRequest({ userId: 'user-1' });

    const result = await handleTransferOwnership(deps, 'tenant-1', { newOwnerId: 'user-2' }, request);

    expect(result.status).toBe(500);
  });

  it('should still return 200 even if audit logging fails', async () => {
    mockTransferOwnership.mockResolvedValue(undefined);
    mockRecord.mockRejectedValue(new Error('Audit DB down'));
    const request = createMockRequest({ userId: 'user-1' });

    const result = await handleTransferOwnership(deps, 'tenant-1', { newOwnerId: 'user-2' }, request);

    expect(result.status).toBe(200);
  });

  it('should still return 200 even if activity logging fails', async () => {
    mockTransferOwnership.mockResolvedValue(undefined);
    mockLogActivity.mockRejectedValue(new Error('Activity DB down'));
    const request = createMockRequest({ userId: 'user-1' });

    const result = await handleTransferOwnership(deps, 'tenant-1', { newOwnerId: 'user-2' }, request);

    expect(result.status).toBe(200);
  });

  it('should include previousOwnerId and newOwnerId in audit metadata', async () => {
    mockTransferOwnership.mockResolvedValue(undefined);
    const request = createMockRequest({ userId: 'owner-1' });

    await handleTransferOwnership(deps, 'tenant-1', { newOwnerId: 'new-owner-2' }, request);

    expect(mockRecord).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        metadata: { previousOwnerId: 'owner-1', newOwnerId: 'new-owner-2' },
      }),
    );
  });

  it('should pass tenantId in activity log metadata', async () => {
    mockTransferOwnership.mockResolvedValue(undefined);
    const request = createMockRequest({ userId: 'user-1' });

    await handleTransferOwnership(deps, 'specific-tenant', { newOwnerId: 'user-2' }, request);

    expect(mockLogActivity).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        tenantId: 'specific-tenant',
      }),
    );
  });
});
