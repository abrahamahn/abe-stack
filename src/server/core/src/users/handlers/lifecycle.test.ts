// src/server/core/src/users/handlers/lifecycle.test.ts
import { describe, expect, it, vi } from 'vitest';

import {
  handleDeactivateAccount,
  handleReactivateAccount,
  handleRequestDeletion,
} from './lifecycle';

import type { UsersRequest } from '../types';
import type { User } from '@abe-stack/db';
import type { HandlerContext } from '@abe-stack/server-engine';

// ============================================================================
// Mock Helpers
// ============================================================================

function createMockUser(overrides: Partial<User> = {}): User {
  return {
    id: 'usr-1',
    email: 'test@example.com',
    canonicalEmail: 'test@example.com',
    username: 'testuser',
    passwordHash: 'hash',
    firstName: 'Test',
    lastName: 'User',
    avatarUrl: null,
    role: 'user',
    emailVerified: true,
    emailVerifiedAt: new Date(),
    lockedUntil: null,
    lockReason: null,
    failedLoginAttempts: 0,
    totpSecret: null,
    totpEnabled: false,
    phone: null,
    phoneVerified: null,
    dateOfBirth: null,
    gender: null,
    city: null,
    state: null,
    country: null,
    bio: null,
    language: null,
    website: null,
    lastUsernameChange: null,
    deactivatedAt: null,
    deletedAt: null,
    deletionGracePeriodEnds: null,
    tokenVersion: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 1,
    ...overrides,
  };
}

function createMockDeps(userOverrides: Partial<User> = {}) {
  const mockUser = createMockUser(userOverrides);
  return {
    ctx: {
      repos: {
        users: {
          findById: vi.fn().mockResolvedValue(mockUser),
          update: vi.fn().mockImplementation((_id: string, data: Partial<User>) => {
            return Promise.resolve({ ...mockUser, ...data });
          }),
        },
        memberships: {
          findByUserId: vi.fn().mockResolvedValue([]),
          findByTenantId: vi.fn().mockResolvedValue([]),
        },
      },
      log: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
        child: vi.fn(),
      },
    } as unknown as HandlerContext,
    mockUser,
  };
}

function createRequest(userId: string = 'usr-1'): UsersRequest {
  return {
    user: { userId, role: 'user' },
    cookies: {},
    headers: {},
    params: {},
    query: {},
    ip: '127.0.0.1',
  } as unknown as UsersRequest;
}

function createUnauthRequest(): UsersRequest {
  return {
    cookies: {},
    headers: {},
    params: {},
    query: {},
    ip: '127.0.0.1',
  } as unknown as UsersRequest;
}

function asHttpResult(result: unknown): { status: number; body?: unknown } {
  return result as { status: number; body?: unknown };
}

// ============================================================================
// Tests: handleDeactivateAccount
// ============================================================================

describe('handleDeactivateAccount', () => {
  it('deactivates an active account', async () => {
    const { ctx } = createMockDeps();
    const request = createRequest();

    const result = asHttpResult(await handleDeactivateAccount(ctx, {}, request));

    expect(result.status).toBe(200);
    expect((result.body as { status: string }).status).toBe('deactivated');
  });

  it('returns 401 when not authenticated', async () => {
    const { ctx } = createMockDeps();
    const request = createUnauthRequest();

    const result = asHttpResult(await handleDeactivateAccount(ctx, {}, request));

    expect(result.status).toBe(401);
  });

  it('returns 404 when user not found', async () => {
    const { ctx } = createMockDeps();
    const deps = ctx as unknown as { repos: { users: { findById: ReturnType<typeof vi.fn> } } };
    deps.repos.users.findById.mockResolvedValue(null);
    const request = createRequest();

    const result = asHttpResult(await handleDeactivateAccount(ctx, {}, request));

    expect(result.status).toBe(404);
  });

  it('returns 400 when account is already deactivated', async () => {
    const { ctx } = createMockDeps({ deactivatedAt: new Date() });
    const request = createRequest();

    const result = asHttpResult(await handleDeactivateAccount(ctx, {}, request));

    expect(result.status).toBe(400);
    expect((result.body as { message: string }).message).toContain('deactivated');
  });

  it('returns 400 when account is pending deletion', async () => {
    const { ctx } = createMockDeps({
      deletedAt: new Date(),
      deletionGracePeriodEnds: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });
    const request = createRequest();

    const result = asHttpResult(await handleDeactivateAccount(ctx, {}, request));

    expect(result.status).toBe(400);
    expect((result.body as { message: string }).message).toContain('pending_deletion');
  });
});

// ============================================================================
// Tests: handleRequestDeletion
// ============================================================================

describe('handleRequestDeletion', () => {
  it('requests deletion for an active account', async () => {
    const { ctx } = createMockDeps();
    const request = createRequest();

    const result = asHttpResult(await handleRequestDeletion(ctx, {}, request));

    expect(result.status).toBe(200);
    const body = result.body as { status: string; deletionGracePeriodEnds: string };
    expect(body.status).toBe('pending_deletion');
    expect(body.deletionGracePeriodEnds).toBeDefined();
  });

  it('requests deletion for a deactivated account', async () => {
    const { ctx } = createMockDeps({ deactivatedAt: new Date() });
    const request = createRequest();

    const result = asHttpResult(await handleRequestDeletion(ctx, {}, request));

    expect(result.status).toBe(200);
  });

  it('returns 401 when not authenticated', async () => {
    const { ctx } = createMockDeps();
    const request = createUnauthRequest();

    const result = asHttpResult(await handleRequestDeletion(ctx, {}, request));

    expect(result.status).toBe(401);
  });

  it('returns 400 when already pending deletion', async () => {
    const { ctx } = createMockDeps({
      deletedAt: new Date(),
      deletionGracePeriodEnds: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });
    const request = createRequest();

    const result = asHttpResult(await handleRequestDeletion(ctx, {}, request));

    expect(result.status).toBe(400);
    expect((result.body as { message: string }).message).toContain('already been requested');
  });

  it('returns 409 when user is sole owner of a workspace', async () => {
    const { ctx } = createMockDeps();
    const deps = ctx as unknown as {
      repos: {
        memberships: {
          findByUserId: ReturnType<typeof vi.fn>;
          findByTenantId: ReturnType<typeof vi.fn>;
        };
      };
    };

    // User is a member of one tenant as owner
    deps.repos.memberships.findByUserId.mockResolvedValue([
      {
        id: 'm-1',
        tenantId: 'tenant-1',
        userId: 'usr-1',
        role: 'owner',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    // Only one owner in that tenant
    deps.repos.memberships.findByTenantId.mockResolvedValue([
      {
        id: 'm-1',
        tenantId: 'tenant-1',
        userId: 'usr-1',
        role: 'owner',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const request = createRequest();
    const result = asHttpResult(await handleRequestDeletion(ctx, {}, request));

    expect(result.status).toBe(409);
    expect((result.body as { message: string }).message).toContain('sole owner');
  });

  it('allows deletion when user is owner but not sole owner', async () => {
    const { ctx } = createMockDeps();
    const deps = ctx as unknown as {
      repos: {
        memberships: {
          findByUserId: ReturnType<typeof vi.fn>;
          findByTenantId: ReturnType<typeof vi.fn>;
        };
      };
    };

    deps.repos.memberships.findByUserId.mockResolvedValue([
      {
        id: 'm-1',
        tenantId: 'tenant-1',
        userId: 'usr-1',
        role: 'owner',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    // Two owners in the tenant
    deps.repos.memberships.findByTenantId.mockResolvedValue([
      {
        id: 'm-1',
        tenantId: 'tenant-1',
        userId: 'usr-1',
        role: 'owner',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'm-2',
        tenantId: 'tenant-1',
        userId: 'usr-2',
        role: 'owner',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const request = createRequest();
    const result = asHttpResult(await handleRequestDeletion(ctx, {}, request));

    expect(result.status).toBe(200);
  });

  it('allows deletion when user is not an owner of any workspace', async () => {
    const { ctx } = createMockDeps();
    const deps = ctx as unknown as {
      repos: {
        memberships: {
          findByUserId: ReturnType<typeof vi.fn>;
          findByTenantId: ReturnType<typeof vi.fn>;
        };
      };
    };

    deps.repos.memberships.findByUserId.mockResolvedValue([
      {
        id: 'm-1',
        tenantId: 'tenant-1',
        userId: 'usr-1',
        role: 'member',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const request = createRequest();
    const result = asHttpResult(await handleRequestDeletion(ctx, {}, request));

    expect(result.status).toBe(200);
  });
});

// ============================================================================
// Tests: handleReactivateAccount
// ============================================================================

describe('handleReactivateAccount', () => {
  it('reactivates a deactivated account', async () => {
    const { ctx } = createMockDeps({ deactivatedAt: new Date() });
    const request = createRequest();

    const result = asHttpResult(await handleReactivateAccount(ctx, undefined, request));

    expect(result.status).toBe(200);
    expect((result.body as { status: string }).status).toBe('active');
  });

  it('reactivates pending deletion within grace period', async () => {
    const { ctx } = createMockDeps({
      deletedAt: new Date(),
      deletionGracePeriodEnds: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });
    const request = createRequest();

    const result = asHttpResult(await handleReactivateAccount(ctx, undefined, request));

    expect(result.status).toBe(200);
    expect((result.body as { status: string }).status).toBe('active');
  });

  it('returns 401 when not authenticated', async () => {
    const { ctx } = createMockDeps();
    const request = createUnauthRequest();

    const result = asHttpResult(await handleReactivateAccount(ctx, undefined, request));

    expect(result.status).toBe(401);
  });

  it('returns 400 when account is already active', async () => {
    const { ctx } = createMockDeps();
    const request = createRequest();

    const result = asHttpResult(await handleReactivateAccount(ctx, undefined, request));

    expect(result.status).toBe(400);
    expect((result.body as { message: string }).message).toContain('already active');
  });

  it('returns 400 when grace period has expired', async () => {
    const { ctx } = createMockDeps({
      deletedAt: new Date(),
      deletionGracePeriodEnds: new Date(Date.now() - 24 * 60 * 60 * 1000),
    });
    const request = createRequest();

    const result = asHttpResult(await handleReactivateAccount(ctx, undefined, request));

    expect(result.status).toBe(400);
    expect((result.body as { message: string }).message).toContain('grace period has expired');
  });

  it('clears all lifecycle fields on reactivation', async () => {
    const { ctx } = createMockDeps({ deactivatedAt: new Date() });
    const deps = ctx as unknown as {
      repos: { users: { update: ReturnType<typeof vi.fn> } };
    };
    const request = createRequest();

    await handleReactivateAccount(ctx, undefined, request);

    expect(deps.repos.users.update).toHaveBeenCalledWith('usr-1', {
      deactivatedAt: null,
      deletedAt: null,
      deletionGracePeriodEnds: null,
    });
  });
});
