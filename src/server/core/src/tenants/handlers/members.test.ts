// src/server/core/src/tenants/handlers/members.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  handleAddMember,
  handleListMembers,
  handleRemoveMember,
  handleUpdateMemberRole,
} from './members';

import type { TenantsModuleDeps, TenantsRequest } from '../types';
import type { DbClient, Repositories } from '@abe-stack/db';

// ============================================================================
// Mocks
// ============================================================================

const { mockListMembers, mockAddMember, mockUpdateMemberRole, mockRemoveMember } = vi.hoisted(
  () => ({
    mockListMembers: vi.fn(),
    mockAddMember: vi.fn(),
    mockUpdateMemberRole: vi.fn(),
    mockRemoveMember: vi.fn(),
  }),
);

vi.mock('../membership-service', () => ({
  listMembers: mockListMembers,
  addMember: mockAddMember,
  updateMemberRole: mockUpdateMemberRole,
  removeMember: mockRemoveMember,
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

function createMockRequest(user?: { userId: string }): TenantsRequest {
  return {
    user,
    requestInfo: { ipAddress: '127.0.0.1', userAgent: 'test' },
    cookies: {},
    headers: {},
  } as TenantsRequest;
}

// ============================================================================
// handleListMembers
// ============================================================================

describe('handleListMembers', () => {
  let deps: TenantsModuleDeps;

  beforeEach(() => {
    vi.clearAllMocks();
    deps = createMockDeps();
  });

  it('should return 401 when no user', async () => {
    const request = createMockRequest();

    const result = await handleListMembers(deps, 'tenant-1', request);

    expect(result.status).toBe(401);
    expect(result.body).toEqual({ message: 'Unauthorized' });
  });

  it('should return 200 with members list', async () => {
    const members = [{ userId: 'user-1', role: 'owner' }];
    mockListMembers.mockResolvedValue(members);
    const request = createMockRequest({ userId: 'user-1' });

    const result = await handleListMembers(deps, 'tenant-1', request);

    expect(result.status).toBe(200);
    expect(result.body).toEqual(members);
    expect(mockListMembers).toHaveBeenCalledWith(deps.repos, 'tenant-1', 'user-1');
  });

  it('should map service errors via mapErrorToHttpResponse', async () => {
    mockListMembers.mockRejectedValue(new Error('Service failure'));
    const request = createMockRequest({ userId: 'user-1' });

    const result = await handleListMembers(deps, 'tenant-1', request);

    expect(result.status).toBe(500);
    expect(deps.log.error).toHaveBeenCalled();
  });
});

// ============================================================================
// handleAddMember
// ============================================================================

describe('handleAddMember', () => {
  let deps: TenantsModuleDeps;

  beforeEach(() => {
    vi.clearAllMocks();
    deps = createMockDeps();
  });

  it('should return 401 when no user', async () => {
    const request = createMockRequest();

    const result = await handleAddMember(
      deps,
      'tenant-1',
      { userId: 'user-2', role: 'member' },
      request,
    );

    expect(result.status).toBe(401);
    expect(result.body).toEqual({ message: 'Unauthorized' });
  });

  it('should return 201 with added member', async () => {
    const member = { userId: 'user-2', role: 'member' };
    mockAddMember.mockResolvedValue(member);
    const request = createMockRequest({ userId: 'user-1' });

    const result = await handleAddMember(
      deps,
      'tenant-1',
      { userId: 'user-2', role: 'member' },
      request,
    );

    expect(result.status).toBe(201);
    expect(result.body).toEqual(member);
    expect(mockAddMember).toHaveBeenCalledWith(
      deps.repos,
      'tenant-1',
      'user-1',
      'user-2',
      'member',
    );
  });

  it('should map service errors via mapErrorToHttpResponse', async () => {
    mockAddMember.mockRejectedValue(new Error('Service failure'));
    const request = createMockRequest({ userId: 'user-1' });

    const result = await handleAddMember(
      deps,
      'tenant-1',
      { userId: 'user-2', role: 'member' },
      request,
    );

    expect(result.status).toBe(500);
    expect(deps.log.error).toHaveBeenCalled();
  });
});

// ============================================================================
// handleUpdateMemberRole
// ============================================================================

describe('handleUpdateMemberRole', () => {
  let deps: TenantsModuleDeps;

  beforeEach(() => {
    vi.clearAllMocks();
    deps = createMockDeps();
  });

  it('should return 401 when no user', async () => {
    const request = createMockRequest();

    const result = await handleUpdateMemberRole(
      deps,
      'tenant-1',
      'user-2',
      { role: 'admin' },
      request,
    );

    expect(result.status).toBe(401);
    expect(result.body).toEqual({ message: 'Unauthorized' });
  });

  it('should return 200 with updated member', async () => {
    const member = { userId: 'user-2', role: 'admin' };
    mockUpdateMemberRole.mockResolvedValue(member);
    const request = createMockRequest({ userId: 'user-1' });

    const result = await handleUpdateMemberRole(
      deps,
      'tenant-1',
      'user-2',
      { role: 'admin' },
      request,
    );

    expect(result.status).toBe(200);
    expect(result.body).toEqual(member);
    expect(mockUpdateMemberRole).toHaveBeenCalledWith(
      deps.repos,
      'tenant-1',
      'user-1',
      'user-2',
      'admin',
    );
  });

  it('should map service errors via mapErrorToHttpResponse', async () => {
    mockUpdateMemberRole.mockRejectedValue(new Error('Service failure'));
    const request = createMockRequest({ userId: 'user-1' });

    const result = await handleUpdateMemberRole(
      deps,
      'tenant-1',
      'user-2',
      { role: 'admin' },
      request,
    );

    expect(result.status).toBe(500);
    expect(deps.log.error).toHaveBeenCalled();
  });
});

// ============================================================================
// handleRemoveMember
// ============================================================================

describe('handleRemoveMember', () => {
  let deps: TenantsModuleDeps;

  beforeEach(() => {
    vi.clearAllMocks();
    deps = createMockDeps();
  });

  it('should return 401 when no user', async () => {
    const request = createMockRequest();

    const result = await handleRemoveMember(deps, 'tenant-1', 'user-2', request);

    expect(result.status).toBe(401);
    expect(result.body).toEqual({ message: 'Unauthorized' });
  });

  it('should return 200 with success message', async () => {
    mockRemoveMember.mockResolvedValue(undefined);
    const request = createMockRequest({ userId: 'user-1' });

    const result = await handleRemoveMember(deps, 'tenant-1', 'user-2', request);

    expect(result.status).toBe(200);
    expect(result.body).toEqual({ message: 'Member removed' });
    expect(mockRemoveMember).toHaveBeenCalledWith(deps.repos, 'tenant-1', 'user-1', 'user-2');
  });

  it('should map service errors via mapErrorToHttpResponse', async () => {
    mockRemoveMember.mockRejectedValue(new Error('Service failure'));
    const request = createMockRequest({ userId: 'user-1' });

    const result = await handleRemoveMember(deps, 'tenant-1', 'user-2', request);

    expect(result.status).toBe(500);
    expect(deps.log.error).toHaveBeenCalled();
  });
});
