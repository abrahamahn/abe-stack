// src/server/core/src/tenants/handlers/ownership.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { handleTransferOwnership } from './ownership';

import type { TenantsModuleDeps, TenantsRequest } from '../types';
import type { DbClient, Repositories } from '@abe-stack/db';

// ============================================================================
// Mocks
// ============================================================================

const { mockTransferOwnership } = vi.hoisted(() => ({
  mockTransferOwnership: vi.fn(),
}));

vi.mock('../service', () => ({
  transferOwnership: mockTransferOwnership,
}));

// ============================================================================
// Test Helpers
// ============================================================================

function createMockDeps(): TenantsModuleDeps {
  return {
    db: {} as DbClient,
    repos: {} as Repositories,
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
});
