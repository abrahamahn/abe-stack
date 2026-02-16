// main/server/core/src/tenants/handlers/invitations.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  handleAcceptInvitation,
  handleCreateInvitation,
  handleListInvitations,
  handleResendInvitation,
  handleRevokeInvitation,
} from './invitations';

import type { DbClient, Repositories } from '../../../../db/src';
import type { TenantsModuleDeps, TenantsRequest } from '../types';

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

function createMockDeps(options?: { withMailer?: boolean }): TenantsModuleDeps {
  const mockSend = vi.fn().mockResolvedValue({ success: true });
  const mockWorkspaceInvitation = vi.fn().mockReturnValue({
    to: '',
    subject: 'You have been invited',
    text: 'Join the workspace',
    html: '<p>Join the workspace</p>',
  });

  const base = {
    db: {} as DbClient,
    repos: {
      notifications: { create: vi.fn().mockResolvedValue({}) },
      auditEvents: { create: vi.fn().mockResolvedValue({}) },
      users: {
        findById: vi.fn().mockResolvedValue({ firstName: 'Jane', lastName: 'Doe' }),
      },
      tenants: {
        findById: vi.fn().mockResolvedValue({ name: 'Acme Corp' }),
      },
      invitations: {
        findById: vi.fn().mockResolvedValue({
          id: 'inv-1',
          email: 'invited@test.com',
          role: 'member',
          tenantId: 'tenant-1',
        }),
      },
    } as unknown as Repositories,
    log: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      child: vi.fn(),
    },
  };

  if (options?.withMailer === true) {
    return {
      ...base,
      mailer: { send: mockSend },
      emailTemplates: { workspaceInvitation: mockWorkspaceInvitation },
      appBaseUrl: 'https://app.example.com',
    } as unknown as TenantsModuleDeps;
  }

  return base as unknown as TenantsModuleDeps;
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

  it('should send invitation email when mailer is configured', async () => {
    deps = createMockDeps({ withMailer: true });
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
    expect(deps.emailTemplates?.workspaceInvitation).toHaveBeenCalledWith(
      'https://app.example.com/invitations/inv-1/accept',
      'Acme Corp',
      'Jane Doe',
      'member',
    );
    expect(deps.mailer?.send).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'new@test.com', subject: 'You have been invited' }),
    );
  });

  it('should skip email when mailer is not configured', async () => {
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
    // No mailer configured, so no email-related repo calls for user/tenant lookup
  });

  it('should not break if email send fails', async () => {
    deps = createMockDeps({ withMailer: true });
    const invitation = { id: 'inv-1', email: 'new@test.com', role: 'member' };
    mockCreateInvitation.mockResolvedValue(invitation);
    (deps.mailer as { send: ReturnType<typeof vi.fn> }).send.mockRejectedValue(
      new Error('SMTP down'),
    );
    const request = createMockRequest({ userId: 'user-1' });

    const result = await handleCreateInvitation(
      deps,
      'tenant-1',
      { email: 'new@test.com', role: 'member' },
      request,
    );

    expect(result.status).toBe(201);
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

  it('should resend invitation email when mailer is configured', async () => {
    deps = createMockDeps({ withMailer: true });
    mockResendInvitation.mockResolvedValue(undefined);
    const request = createMockRequest({ userId: 'user-1' });

    const result = await handleResendInvitation(deps, 'tenant-1', 'inv-1', request);

    expect(result.status).toBe(200);
    expect(deps.emailTemplates?.workspaceInvitation).toHaveBeenCalledWith(
      'https://app.example.com/invitations/inv-1/accept',
      'Acme Corp',
      'Jane Doe',
      'member',
    );
    expect(deps.mailer?.send).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'invited@test.com', subject: 'You have been invited' }),
    );
  });

  it('should skip email on resend when mailer is not configured', async () => {
    mockResendInvitation.mockResolvedValue(undefined);
    const request = createMockRequest({ userId: 'user-1' });

    const result = await handleResendInvitation(deps, 'tenant-1', 'inv-1', request);

    expect(result.status).toBe(200);
  });

  it('should not break resend if email send fails', async () => {
    deps = createMockDeps({ withMailer: true });
    mockResendInvitation.mockResolvedValue(undefined);
    (deps.mailer as { send: ReturnType<typeof vi.fn> }).send.mockRejectedValue(
      new Error('SMTP down'),
    );
    const request = createMockRequest({ userId: 'user-1' });

    const result = await handleResendInvitation(deps, 'tenant-1', 'inv-1', request);

    expect(result.status).toBe(200);
  });

  it('should map service errors via mapErrorToHttpResponse', async () => {
    mockResendInvitation.mockRejectedValue(new Error('Service failure'));
    const request = createMockRequest({ userId: 'user-1' });

    const result = await handleResendInvitation(deps, 'tenant-1', 'inv-1', request);

    expect(result.status).toBe(500);
    expect(deps.log.error).toHaveBeenCalled();
  });
});
