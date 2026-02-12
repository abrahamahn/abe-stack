// src/server/core/src/tenants/middleware/workspace-scope.test.ts
import { describe, expect, it, vi, beforeEach } from 'vitest';

import {
  buildAuthContext,
  createPermissionGuard,
  createWorkspaceRoleGuard,
  createWorkspaceScopeMiddleware,
  getRequestWorkspaceContext,
  requireRequestWorkspaceContext,
} from './workspace-scope';

import type { WorkspaceScopedRequest } from './workspace-scope';
import type { Repositories } from '@abe-stack/db';
import type { FastifyReply, FastifyRequest } from 'fastify';

// ============================================================================
// Helpers
// ============================================================================

function createMockRepos(): Repositories {
  return {
    memberships: {
      create: vi.fn(),
      findByTenantAndUser: vi.fn(),
      findByTenantId: vi.fn(),
      findByUserId: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    // Stub the rest — only memberships are needed
    tenants: {} as Repositories['tenants'],
    users: {} as Repositories['users'],
    refreshTokens: {} as Repositories['refreshTokens'],
    refreshTokenFamilies: {} as Repositories['refreshTokenFamilies'],
    loginAttempts: {} as Repositories['loginAttempts'],
    passwordResetTokens: {} as Repositories['passwordResetTokens'],
    emailVerificationTokens: {} as Repositories['emailVerificationTokens'],
    securityEvents: {} as Repositories['securityEvents'],
    totpBackupCodes: {} as Repositories['totpBackupCodes'],
    emailChangeTokens: {} as Repositories['emailChangeTokens'],
    emailChangeRevertTokens: {} as Repositories['emailChangeRevertTokens'],
    magicLinkTokens: {} as Repositories['magicLinkTokens'],
    oauthConnections: {} as Repositories['oauthConnections'],
    apiKeys: {} as Repositories['apiKeys'],
    pushSubscriptions: {} as Repositories['pushSubscriptions'],
    notificationPreferences: {} as Repositories['notificationPreferences'],
    plans: {} as Repositories['plans'],
    subscriptions: {} as Repositories['subscriptions'],
    customerMappings: {} as Repositories['customerMappings'],
    invoices: {} as Repositories['invoices'],
    paymentMethods: {} as Repositories['paymentMethods'],
    billingEvents: {} as Repositories['billingEvents'],
    userSessions: {} as Repositories['userSessions'],
    invitations: {} as Repositories['invitations'],
    notifications: {} as Repositories['notifications'],
    auditEvents: {} as Repositories['auditEvents'],
    jobs: {} as Repositories['jobs'],
    webhooks: {} as Repositories['webhooks'],
    webhookDeliveries: {} as Repositories['webhookDeliveries'],
    featureFlags: {} as Repositories['featureFlags'],
    tenantFeatureOverrides: {} as Repositories['tenantFeatureOverrides'],
    usageMetrics: {} as Repositories['usageMetrics'],
    usageSnapshots: {} as Repositories['usageSnapshots'],
    legalDocuments: {} as Repositories['legalDocuments'],
    userAgreements: {} as Repositories['userAgreements'],
    consentLogs: {} as Repositories['consentLogs'],
    dataExportRequests: {} as Repositories['dataExportRequests'],
    activities: {} as Repositories['activities'],
    webauthnCredentials: {} as Repositories['webauthnCredentials'],
    trustedDevices: {} as Repositories['trustedDevices'],
    files: {} as Repositories['files'],
  };
}

function createMockRequest(
  headers: Record<string, string | undefined>,
  user?: { userId: string },
): FastifyRequest & { user?: { userId: string } } {
  return {
    headers,
    user,
  } as FastifyRequest & { user?: { userId: string } };
}

function createMockReply(): FastifyReply & { _statusCode: number; _body: unknown } {
  const reply = {
    _statusCode: 200,
    _body: undefined as unknown,
    code(status: number) {
      reply._statusCode = status;
      return reply;
    },
    send(body: unknown) {
      reply._body = body;
      return reply;
    },
  };
  return reply as unknown as FastifyReply & { _statusCode: number; _body: unknown };
}

// ============================================================================
// createWorkspaceScopeMiddleware
// ============================================================================

describe('createWorkspaceScopeMiddleware', () => {
  let repos: Repositories;

  beforeEach(() => {
    repos = createMockRepos();
  });

  it('attaches workspace context when header is valid and user is a member', async () => {
    vi.mocked(repos.memberships.findByTenantAndUser).mockResolvedValue({
      id: 'm-1',
      tenantId: 'ws-1',
      userId: 'user-1',
      role: 'admin',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const middleware = createWorkspaceScopeMiddleware({ repos });
    const request = createMockRequest({ 'x-workspace-id': 'ws-1' }, { userId: 'user-1' });
    const reply = createMockReply();

    await middleware(request, reply);

    const ctx = (request as WorkspaceScopedRequest).workspaceContext;
    expect(ctx).toEqual({
      workspaceId: 'ws-1',
      userId: 'user-1',
      role: 'admin',
    });
  });

  it('returns 400 when required header is missing', async () => {
    const middleware = createWorkspaceScopeMiddleware({ repos });
    const request = createMockRequest({}, { userId: 'user-1' });
    const reply = createMockReply();

    await middleware(request, reply);

    expect(reply._statusCode).toBe(400);
    expect(reply._body).toEqual({
      message: 'Missing x-workspace-id header',
      code: 'WORKSPACE_REQUIRED',
    });
  });

  it('returns 400 when required header is empty string', async () => {
    const middleware = createWorkspaceScopeMiddleware({ repos });
    const request = createMockRequest({ 'x-workspace-id': '' }, { userId: 'user-1' });
    const reply = createMockReply();

    await middleware(request, reply);

    expect(reply._statusCode).toBe(400);
  });

  it('skips silently when header is missing and required is false', async () => {
    const middleware = createWorkspaceScopeMiddleware({ repos, required: false });
    const request = createMockRequest({}, { userId: 'user-1' });
    const reply = createMockReply();

    await middleware(request, reply);

    expect(reply._statusCode).toBe(200); // unchanged
    expect((request as WorkspaceScopedRequest).workspaceContext).toBeUndefined();
  });

  it('returns 401 when user is not authenticated', async () => {
    const middleware = createWorkspaceScopeMiddleware({ repos });
    const request = createMockRequest({ 'x-workspace-id': 'ws-1' });
    const reply = createMockReply();

    await middleware(request, reply);

    expect(reply._statusCode).toBe(401);
    expect(reply._body).toEqual({ message: 'Authentication required' });
  });

  it('returns 403 when user is not a member of the workspace', async () => {
    vi.mocked(repos.memberships.findByTenantAndUser).mockResolvedValue(null);

    const middleware = createWorkspaceScopeMiddleware({ repos });
    const request = createMockRequest({ 'x-workspace-id': 'ws-1' }, { userId: 'user-1' });
    const reply = createMockReply();

    await middleware(request, reply);

    expect(reply._statusCode).toBe(403);
    expect(reply._body).toEqual({
      message: 'You are not a member of this workspace',
      code: 'NOT_MEMBER',
    });
  });
});

// ============================================================================
// createWorkspaceRoleGuard
// ============================================================================

describe('createWorkspaceRoleGuard', () => {
  it('allows request when user has sufficient role', async () => {
    const guard = createWorkspaceRoleGuard({ requiredRole: 'admin' });
    const request = createMockRequest({}) as WorkspaceScopedRequest;
    request.workspaceContext = { workspaceId: 'ws-1', userId: 'user-1', role: 'owner' };
    const reply = createMockReply();

    await guard(request, reply);

    expect(reply._statusCode).toBe(200); // unchanged — no error sent
  });

  it('allows request when user has exact required role', async () => {
    const guard = createWorkspaceRoleGuard({ requiredRole: 'member' });
    const request = createMockRequest({}) as WorkspaceScopedRequest;
    request.workspaceContext = { workspaceId: 'ws-1', userId: 'user-1', role: 'member' };
    const reply = createMockReply();

    await guard(request, reply);

    expect(reply._statusCode).toBe(200);
  });

  it('returns 403 when user role is insufficient', async () => {
    const guard = createWorkspaceRoleGuard({ requiredRole: 'admin' });
    const request = createMockRequest({}) as WorkspaceScopedRequest;
    request.workspaceContext = { workspaceId: 'ws-1', userId: 'user-1', role: 'member' };
    const reply = createMockReply();

    await guard(request, reply);

    expect(reply._statusCode).toBe(403);
    expect(reply._body).toEqual({
      message: 'Requires at least admin role',
      code: 'INSUFFICIENT_ROLE',
    });
  });

  it('returns 400 when workspace context is missing', async () => {
    const guard = createWorkspaceRoleGuard({ requiredRole: 'member' });
    const request = createMockRequest({}) as WorkspaceScopedRequest;
    const reply = createMockReply();

    await guard(request, reply);

    expect(reply._statusCode).toBe(400);
    expect(reply._body).toEqual({
      message: 'Workspace scope required',
      code: 'WORKSPACE_REQUIRED',
    });
  });
});

// ============================================================================
// getRequestWorkspaceContext
// ============================================================================

describe('getRequestWorkspaceContext', () => {
  it('returns workspace context when present', () => {
    const request = createMockRequest({}) as WorkspaceScopedRequest;
    request.workspaceContext = { workspaceId: 'ws-1', userId: 'user-1', role: 'admin' };

    expect(getRequestWorkspaceContext(request)).toEqual({
      workspaceId: 'ws-1',
      userId: 'user-1',
      role: 'admin',
    });
  });

  it('returns undefined when context is not set', () => {
    const request = createMockRequest({});

    expect(getRequestWorkspaceContext(request)).toBeUndefined();
  });
});

// ============================================================================
// requireRequestWorkspaceContext
// ============================================================================

describe('requireRequestWorkspaceContext', () => {
  it('returns workspace context when present', () => {
    const request = createMockRequest({}) as WorkspaceScopedRequest;
    request.workspaceContext = { workspaceId: 'ws-1', userId: 'user-1', role: 'owner' };

    const ctx = requireRequestWorkspaceContext(request);
    expect(ctx.workspaceId).toBe('ws-1');
    expect(ctx.role).toBe('owner');
  });

  it('throws ForbiddenError when context is missing', () => {
    const request = createMockRequest({});

    expect(() => requireRequestWorkspaceContext(request)).toThrow(
      'Workspace scope required for this operation',
    );
  });
});

// ============================================================================
// buildAuthContext
// ============================================================================

describe('buildAuthContext', () => {
  it('builds context from user role and workspace context', () => {
    const request = createMockRequest({}) as WorkspaceScopedRequest & {
      user?: { userId: string; role?: string };
    };
    request.user = { userId: 'user-1', role: 'user' };
    request.workspaceContext = { workspaceId: 'ws-1', userId: 'user-1', role: 'admin' };

    const ctx = buildAuthContext(request);
    expect(ctx.appRole).toBe('user');
    expect(ctx.tenantRole).toBe('admin');
    expect(ctx.isOwner).toBeUndefined();
  });

  it('defaults appRole to user when not set', () => {
    const request = createMockRequest({}) as WorkspaceScopedRequest;

    const ctx = buildAuthContext(request);
    expect(ctx.appRole).toBe('user');
    expect(ctx.tenantRole).toBeNull();
  });

  it('uses platform admin role from user', () => {
    const request = createMockRequest({}) as WorkspaceScopedRequest & {
      user?: { userId: string; role?: string };
    };
    request.user = { userId: 'user-1', role: 'admin' };

    const ctx = buildAuthContext(request);
    expect(ctx.appRole).toBe('admin');
  });

  it('sets isOwner when callback returns true', () => {
    const request = createMockRequest({}) as WorkspaceScopedRequest;
    request.workspaceContext = { workspaceId: 'ws-1', userId: 'user-1', role: 'member' };

    const ctx = buildAuthContext(request, () => true);
    expect(ctx.isOwner).toBe(true);
  });

  it('sets isOwner to false when callback returns false', () => {
    const request = createMockRequest({}) as WorkspaceScopedRequest;
    request.workspaceContext = { workspaceId: 'ws-1', userId: 'user-1', role: 'member' };

    const ctx = buildAuthContext(request, () => false);
    expect(ctx.isOwner).toBe(false);
  });
});

// ============================================================================
// createPermissionGuard
// ============================================================================

describe('createPermissionGuard', () => {
  it('allows when user has permission (owner can write tenant)', async () => {
    const guard = createPermissionGuard({ action: 'write', resource: 'tenant' });
    const request = createMockRequest({}) as WorkspaceScopedRequest & {
      user?: { userId: string; role?: string };
    };
    request.user = { userId: 'user-1', role: 'user' };
    request.workspaceContext = { workspaceId: 'ws-1', userId: 'user-1', role: 'owner' };
    const reply = createMockReply();

    await guard(request, reply);

    expect(reply._statusCode).toBe(200);
  });

  it('denies when user lacks permission (member cannot write tenant)', async () => {
    const guard = createPermissionGuard({ action: 'write', resource: 'tenant' });
    const request = createMockRequest({}) as WorkspaceScopedRequest & {
      user?: { userId: string; role?: string };
    };
    request.user = { userId: 'user-1', role: 'user' };
    request.workspaceContext = { workspaceId: 'ws-1', userId: 'user-1', role: 'member' };
    const reply = createMockReply();

    await guard(request, reply);

    expect(reply._statusCode).toBe(403);
    expect(reply._body).toEqual({
      message: 'You do not have permission to write this tenant',
      code: 'PERMISSION_DENIED',
    });
  });

  it('allows platform admin for any action', async () => {
    const guard = createPermissionGuard({ action: 'manage', resource: 'billing' });
    const request = createMockRequest({}) as WorkspaceScopedRequest & {
      user?: { userId: string; role?: string };
    };
    request.user = { userId: 'user-1', role: 'admin' };
    const reply = createMockReply();

    await guard(request, reply);

    expect(reply._statusCode).toBe(200);
  });

  it('denies member from managing billing', async () => {
    const guard = createPermissionGuard({ action: 'manage', resource: 'billing' });
    const request = createMockRequest({}) as WorkspaceScopedRequest & {
      user?: { userId: string; role?: string };
    };
    request.user = { userId: 'user-1', role: 'user' };
    request.workspaceContext = { workspaceId: 'ws-1', userId: 'user-1', role: 'member' };
    const reply = createMockReply();

    await guard(request, reply);

    expect(reply._statusCode).toBe(403);
  });

  it('allows data write when isOwner callback returns true', async () => {
    const guard = createPermissionGuard({
      action: 'write',
      resource: 'data',
      isOwner: () => true,
    });
    const request = createMockRequest({}) as WorkspaceScopedRequest & {
      user?: { userId: string; role?: string };
    };
    request.user = { userId: 'user-1', role: 'user' };
    request.workspaceContext = { workspaceId: 'ws-1', userId: 'user-1', role: 'member' };
    const reply = createMockReply();

    await guard(request, reply);

    expect(reply._statusCode).toBe(200);
  });

  it('denies data write when member is not owner', async () => {
    const guard = createPermissionGuard({
      action: 'write',
      resource: 'data',
      isOwner: () => false,
    });
    const request = createMockRequest({}) as WorkspaceScopedRequest & {
      user?: { userId: string; role?: string };
    };
    request.user = { userId: 'user-1', role: 'user' };
    request.workspaceContext = { workspaceId: 'ws-1', userId: 'user-1', role: 'member' };
    const reply = createMockReply();

    await guard(request, reply);

    expect(reply._statusCode).toBe(403);
  });

  it('allows admin to invite members', async () => {
    const guard = createPermissionGuard({ action: 'invite', resource: 'membership' });
    const request = createMockRequest({}) as WorkspaceScopedRequest & {
      user?: { userId: string; role?: string };
    };
    request.user = { userId: 'user-1', role: 'user' };
    request.workspaceContext = { workspaceId: 'ws-1', userId: 'user-1', role: 'admin' };
    const reply = createMockReply();

    await guard(request, reply);

    expect(reply._statusCode).toBe(200);
  });

  it('denies viewer from inviting members', async () => {
    const guard = createPermissionGuard({ action: 'invite', resource: 'membership' });
    const request = createMockRequest({}) as WorkspaceScopedRequest & {
      user?: { userId: string; role?: string };
    };
    request.user = { userId: 'user-1', role: 'user' };
    request.workspaceContext = { workspaceId: 'ws-1', userId: 'user-1', role: 'viewer' };
    const reply = createMockReply();

    await guard(request, reply);

    expect(reply._statusCode).toBe(403);
  });
});
