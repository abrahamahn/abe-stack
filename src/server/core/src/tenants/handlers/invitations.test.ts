// src/server/core/src/tenants/handlers/invitations.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  handleAcceptInvitation,
  handleCreateInvitation,
  handleListInvitations,
  handleResendInvitation,
  handleRevokeInvitation,
} from './invitations';

import type { TenantsModuleDeps, TenantsRequest } from '../types';
import type { DbClient, Repositories } from '@abe-stack/db';

// ============================================================================
// Mocks
// ============================================================================

const {
  mockCreateInvitation,
  mockListInvitations,
  mockAcceptInvitation,
  mockRevokeInvitation,
  mockResendInvitation,
} = vi.hoisted(() => ({
  mockCreateInvitation: vi.fn(),
  mockListInvitations: vi.fn(),
  mockAcceptInvitation: vi.fn(),
  mockRevokeInvitation: vi.fn(),
  mockResendInvitation: vi.fn(),
}));

vi.mock('../invitation-service', () => ({
  createInvitation: mockCreateInvitation,
  listInvitations: mockListInvitations,
  acceptInvitation: mockAcceptInvitation,
  revokeInvitation: mockRevokeInvitation,
  resendInvitation: mockResendInvitation,
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
// handleCreateInvitation
// ============================================================================

describe('handleCreateInvitation', () => {
  let deps: TenantsModuleDeps;

  beforeEach(() => {
    vi.clearAllMocks();
    deps = createMockDeps();
  });

  it('should return 401 when no user', async () => {
    const request = createMockRequest();

    const result = await handleCreateInvitation(
      deps,
      'tenant-1',
      { email: 'new@test.com', role: 'member' },
      request,
    );

    expect(result.status).toBe(401);
    expect(result.body).toEqual({ message: 'Unauthorized' });
  });

  it('should return 201 with invitation', async () => {
    const invitation = { id: 'inv-1', email: 'new@test.com', role: 'member' };
    mockCreateInvitation.mockResolvedValue(invitation);
    const request = createMockRequest({ userId: 'user-1' });

    const result = await handleCreateInvitation(
      deps,
      'tenant-1',
      { email: 'new@test.com', role: 'member' },
      request,
    );

    expect(result.status).toBe(201);
    expect(result.body).toEqual(invitation);
    expect(mockCreateInvitation).toHaveBeenCalledWith(
      deps.repos,
      'tenant-1',
      'user-1',
      'new@test.com',
      'member',
    );
  });

  it('should map service errors via mapErrorToHttpResponse', async () => {
    mockCreateInvitation.mockRejectedValue(new Error('Service failure'));
    const request = createMockRequest({ userId: 'user-1' });

    const result = await handleCreateInvitation(
      deps,
      'tenant-1',
      { email: 'new@test.com', role: 'member' },
      request,
    );

    expect(result.status).toBe(500);
    expect(deps.log.error).toHaveBeenCalled();
  });
});

// ============================================================================
// handleListInvitations
// ============================================================================

describe('handleListInvitations', () => {
  let deps: TenantsModuleDeps;

  beforeEach(() => {
    vi.clearAllMocks();
    deps = createMockDeps();
  });

  it('should return 401 when no user', async () => {
    const request = createMockRequest();

    const result = await handleListInvitations(deps, 'tenant-1', request);

    expect(result.status).toBe(401);
    expect(result.body).toEqual({ message: 'Unauthorized' });
  });

  it('should return 200 with invitations', async () => {
    const invitations = [{ id: 'inv-1', email: 'test@test.com' }];
    mockListInvitations.mockResolvedValue(invitations);
    const request = createMockRequest({ userId: 'user-1' });

    const result = await handleListInvitations(deps, 'tenant-1', request);

    expect(result.status).toBe(200);
    expect(result.body).toEqual(invitations);
    expect(mockListInvitations).toHaveBeenCalledWith(deps.repos, 'tenant-1', 'user-1');
  });

  it('should map service errors via mapErrorToHttpResponse', async () => {
    mockListInvitations.mockRejectedValue(new Error('Service failure'));
    const request = createMockRequest({ userId: 'user-1' });

    const result = await handleListInvitations(deps, 'tenant-1', request);

    expect(result.status).toBe(500);
    expect(deps.log.error).toHaveBeenCalled();
  });
});

// ============================================================================
// handleAcceptInvitation
// ============================================================================

describe('handleAcceptInvitation', () => {
  let deps: TenantsModuleDeps;

  beforeEach(() => {
    vi.clearAllMocks();
    deps = createMockDeps();
  });

  it('should return 401 when no user', async () => {
    const request = createMockRequest();

    const result = await handleAcceptInvitation(deps, 'inv-1', request);

    expect(result.status).toBe(401);
    expect(result.body).toEqual({ message: 'Unauthorized' });
  });

  it('should return 401 when user has no email', async () => {
    const request = createMockRequest({ userId: 'user-1' });

    const result = await handleAcceptInvitation(deps, 'inv-1', request);

    expect(result.status).toBe(401);
    expect(result.body).toEqual({ message: 'Unauthorized' });
  });

  it('should return 200 on success', async () => {
    const invitation = { id: 'inv-1', tenantId: 'tenant-1', status: 'accepted' };
    mockAcceptInvitation.mockResolvedValue(invitation);
    const request = createMockRequest({ userId: 'user-1', email: 'user@test.com' });

    const result = await handleAcceptInvitation(deps, 'inv-1', request);

    expect(result.status).toBe(200);
    expect(result.body).toEqual(invitation);
    expect(mockAcceptInvitation).toHaveBeenCalledWith(
      deps.repos,
      'inv-1',
      'user-1',
      'user@test.com',
    );
  });

  it('should map service errors via mapErrorToHttpResponse', async () => {
    mockAcceptInvitation.mockRejectedValue(new Error('Service failure'));
    const request = createMockRequest({ userId: 'user-1', email: 'user@test.com' });

    const result = await handleAcceptInvitation(deps, 'inv-1', request);

    expect(result.status).toBe(500);
    expect(deps.log.error).toHaveBeenCalled();
  });
});

// ============================================================================
// handleRevokeInvitation
// ============================================================================

describe('handleRevokeInvitation', () => {
  let deps: TenantsModuleDeps;

  beforeEach(() => {
    vi.clearAllMocks();
    deps = createMockDeps();
  });

  it('should return 401 when no user', async () => {
    const request = createMockRequest();

    const result = await handleRevokeInvitation(deps, 'tenant-1', 'inv-1', request);

    expect(result.status).toBe(401);
    expect(result.body).toEqual({ message: 'Unauthorized' });
  });

  it('should return 200 with revoked invitation', async () => {
    const invitation = { id: 'inv-1', status: 'revoked' };
    mockRevokeInvitation.mockResolvedValue(invitation);
    const request = createMockRequest({ userId: 'user-1' });

    const result = await handleRevokeInvitation(deps, 'tenant-1', 'inv-1', request);

    expect(result.status).toBe(200);
    expect(result.body).toEqual(invitation);
    expect(mockRevokeInvitation).toHaveBeenCalledWith(deps.repos, 'tenant-1', 'inv-1', 'user-1');
  });

  it('should map service errors via mapErrorToHttpResponse', async () => {
    mockRevokeInvitation.mockRejectedValue(new Error('Service failure'));
    const request = createMockRequest({ userId: 'user-1' });

    const result = await handleRevokeInvitation(deps, 'tenant-1', 'inv-1', request);

    expect(result.status).toBe(500);
    expect(deps.log.error).toHaveBeenCalled();
  });
});

// ============================================================================
// handleResendInvitation
// ============================================================================

describe('handleResendInvitation', () => {
  let deps: TenantsModuleDeps;

  beforeEach(() => {
    vi.clearAllMocks();
    deps = createMockDeps();
  });

  it('should return 401 when no user', async () => {
    const request = createMockRequest();

    const result = await handleResendInvitation(deps, 'tenant-1', 'inv-1', request);

    expect(result.status).toBe(401);
    expect(result.body).toEqual({ message: 'Unauthorized' });
  });

  it('should return 200 with message on success', async () => {
    mockResendInvitation.mockResolvedValue(undefined);
    const request = createMockRequest({ userId: 'user-1' });

    const result = await handleResendInvitation(deps, 'tenant-1', 'inv-1', request);

    expect(result.status).toBe(200);
    expect(result.body).toEqual({ message: 'Invitation resent' });
    expect(mockResendInvitation).toHaveBeenCalledWith(deps.repos, 'tenant-1', 'inv-1', 'user-1');
  });

  it('should map service errors via mapErrorToHttpResponse', async () => {
    mockResendInvitation.mockRejectedValue(new Error('Service failure'));
    const request = createMockRequest({ userId: 'user-1' });

    const result = await handleResendInvitation(deps, 'tenant-1', 'inv-1', request);

    expect(result.status).toBe(500);
    expect(deps.log.error).toHaveBeenCalled();
  });
});
