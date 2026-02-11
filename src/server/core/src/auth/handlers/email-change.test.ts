// src/server/core/src/auth/handlers/email-change.test.ts
import { InvalidCredentialsError, InvalidTokenError } from '@abe-stack/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  handleChangeEmail,
  handleConfirmEmailChange,
  handleRevertEmailChange,
} from './email-change';

import type { AppContext, RequestWithCookies } from '../types';

// ============================================================================
// Mocks
// ============================================================================

const {
  mockInitiateEmailChange,
  mockConfirmEmailChange,
  mockCreateEmailChangeRevertToken,
  mockRevertEmailChange,
  mockAssertUserActive,
  mockSendEmailChangedAlert,
} = vi.hoisted(() => ({
  mockInitiateEmailChange: vi.fn(),
  mockConfirmEmailChange: vi.fn(),
  mockCreateEmailChangeRevertToken: vi.fn(),
  mockRevertEmailChange: vi.fn(),
  mockAssertUserActive: vi.fn(),
  mockSendEmailChangedAlert: vi.fn(),
}));

vi.mock('../email-change', () => ({
  initiateEmailChange: mockInitiateEmailChange,
  confirmEmailChange: mockConfirmEmailChange,
  createEmailChangeRevertToken: mockCreateEmailChangeRevertToken,
  revertEmailChange: mockRevertEmailChange,
}));

vi.mock('../middleware', () => ({
  assertUserActive: mockAssertUserActive,
}));

vi.mock('../security', () => ({
  sendEmailChangedAlert: mockSendEmailChangedAlert,
}));

// ============================================================================
// Test Helpers
// ============================================================================

function createMockContext(): AppContext {
  return {
    db: {},
    repos: {
      users: { findById: vi.fn() },
    },
    log: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      trace: vi.fn(),
      fatal: vi.fn(),
      child: vi.fn(),
    },
    email: {},
    emailTemplates: {},
    storage: {},
    pubsub: {},
    config: {
      auth: {},
      server: { appBaseUrl: 'https://app.test.com' },
    },
  } as unknown as AppContext;
}

function createMockRequest(user?: { userId: string }): RequestWithCookies {
  return {
    user,
    requestInfo: { ipAddress: '127.0.0.1', userAgent: 'test-agent' },
    cookies: {},
    headers: {},
  } as RequestWithCookies;
}

// ============================================================================
// handleChangeEmail
// ============================================================================

describe('handleChangeEmail', () => {
  let ctx: AppContext;

  beforeEach(() => {
    vi.clearAllMocks();
    ctx = createMockContext();
    mockAssertUserActive.mockResolvedValue(undefined);
  });

  it('should return 401 when no user', async () => {
    const request = createMockRequest();

    const result = await handleChangeEmail(
      ctx,
      { newEmail: 'new@test.com', password: 'pass123' },
      request,
    );

    expect(result.status).toBe(401);
    expect(result.body).toEqual({ message: 'Authentication required' });
  });

  it('should call assertUserActive', async () => {
    mockInitiateEmailChange.mockResolvedValue({
      success: true,
      message: 'Verification email sent',
    });
    const request = createMockRequest({ userId: 'user-1' });

    await handleChangeEmail(ctx, { newEmail: 'new@test.com', password: 'pass123' }, request);

    expect(mockAssertUserActive).toHaveBeenCalledWith(expect.any(Function), 'user-1');
  });

  it('should call initiateEmailChange with all args', async () => {
    const changeResult = { success: true, message: 'Verification email sent' };
    mockInitiateEmailChange.mockResolvedValue(changeResult);
    const request = createMockRequest({ userId: 'user-1' });

    await handleChangeEmail(ctx, { newEmail: 'new@test.com', password: 'pass123' }, request);

    expect(mockInitiateEmailChange).toHaveBeenCalledWith(
      ctx.db,
      ctx.repos,
      ctx.email,
      ctx.emailTemplates,
      ctx.config.auth,
      'user-1',
      'new@test.com',
      'pass123',
      'https://app.test.com',
      ctx.log,
    );
  });

  it('should return 200 on success', async () => {
    const changeResult = { success: true, message: 'Verification email sent' };
    mockInitiateEmailChange.mockResolvedValue(changeResult);
    const request = createMockRequest({ userId: 'user-1' });

    const result = await handleChangeEmail(
      ctx,
      { newEmail: 'new@test.com', password: 'pass123' },
      request,
    );

    expect(result.status).toBe(200);
    expect(result.body).toEqual(changeResult);
  });

  it('should map errors via mapErrorToHttpResponse', async () => {
    mockInitiateEmailChange.mockRejectedValue(new InvalidCredentialsError());
    const request = createMockRequest({ userId: 'user-1' });

    const result = await handleChangeEmail(
      ctx,
      { newEmail: 'new@test.com', password: 'wrong' },
      request,
    );

    expect(result.status).toBe(401);
  });
});

// ============================================================================
// handleConfirmEmailChange
// ============================================================================

describe('handleConfirmEmailChange', () => {
  let ctx: AppContext;

  beforeEach(() => {
    vi.clearAllMocks();
    ctx = createMockContext();
    mockSendEmailChangedAlert.mockResolvedValue(undefined);
  });

  it('should call confirmEmailChange with token', async () => {
    mockConfirmEmailChange.mockResolvedValue({
      success: true,
      message: 'Email changed',
      email: 'new@test.com',
      previousEmail: 'old@test.com',
      userId: 'user-1',
    });
    mockCreateEmailChangeRevertToken.mockResolvedValue('revert-token-123');
    const request = createMockRequest({ userId: 'user-1' });

    await handleConfirmEmailChange(ctx, { token: 'confirm-token' }, request);

    expect(mockConfirmEmailChange).toHaveBeenCalledWith(ctx.db, ctx.repos, 'confirm-token');
  });

  it('should create a revert token', async () => {
    mockConfirmEmailChange.mockResolvedValue({
      success: true,
      message: 'Email changed',
      email: 'new@test.com',
      previousEmail: 'old@test.com',
      userId: 'user-1',
    });
    mockCreateEmailChangeRevertToken.mockResolvedValue('revert-token-123');
    const request = createMockRequest({ userId: 'user-1' });

    await handleConfirmEmailChange(ctx, { token: 'confirm-token' }, request);

    expect(mockCreateEmailChangeRevertToken).toHaveBeenCalledWith(
      ctx.db,
      ctx.repos,
      'user-1',
      'old@test.com',
      'new@test.com',
    );
  });

  it('should fire sendEmailChangedAlert (fire-and-forget)', async () => {
    mockConfirmEmailChange.mockResolvedValue({
      success: true,
      message: 'Email changed',
      email: 'new@test.com',
      previousEmail: 'old@test.com',
      userId: 'user-1',
    });
    mockCreateEmailChangeRevertToken.mockResolvedValue('revert-token-123');
    const request = createMockRequest({ userId: 'user-1' });

    await handleConfirmEmailChange(ctx, { token: 'confirm-token' }, request);

    expect(mockSendEmailChangedAlert).toHaveBeenCalledWith(
      ctx.email,
      ctx.emailTemplates,
      expect.objectContaining({
        email: 'old@test.com',
        newEmail: 'new@test.com',
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
        revertUrl: 'https://app.test.com/auth/change-email/revert?token=revert-token-123',
      }),
    );
  });

  it('should return 200 with response excluding userId and previousEmail', async () => {
    mockConfirmEmailChange.mockResolvedValue({
      success: true,
      message: 'Email changed',
      email: 'new@test.com',
      previousEmail: 'old@test.com',
      userId: 'user-1',
    });
    mockCreateEmailChangeRevertToken.mockResolvedValue('revert-token-123');
    const request = createMockRequest({ userId: 'user-1' });

    const result = await handleConfirmEmailChange(ctx, { token: 'confirm-token' }, request);

    expect(result.status).toBe(200);
    const body = result.body as Record<string, unknown>;
    expect(body).toHaveProperty('success', true);
    expect(body).toHaveProperty('message', 'Email changed');
    expect(body).toHaveProperty('email', 'new@test.com');
    expect(body).not.toHaveProperty('userId');
    expect(body).not.toHaveProperty('previousEmail');
  });

  it('should map errors via mapErrorToHttpResponse', async () => {
    mockConfirmEmailChange.mockRejectedValue(new InvalidTokenError('Token not found'));
    const request = createMockRequest({ userId: 'user-1' });

    const result = await handleConfirmEmailChange(ctx, { token: 'bad-token' }, request);

    expect(result.status).toBe(400);
  });
});

// ============================================================================
// handleRevertEmailChange
// ============================================================================

describe('handleRevertEmailChange', () => {
  let ctx: AppContext;

  beforeEach(() => {
    vi.clearAllMocks();
    ctx = createMockContext();
  });

  it('should call revertEmailChange with token', async () => {
    mockRevertEmailChange.mockResolvedValue({ message: 'Email reverted', email: 'old@test.com' });

    await handleRevertEmailChange(ctx, { token: 'revert-token' });

    expect(mockRevertEmailChange).toHaveBeenCalledWith(ctx.db, ctx.repos, 'revert-token');
  });

  it('should return 200 on success', async () => {
    const revertResult = { message: 'Email reverted', email: 'old@test.com' };
    mockRevertEmailChange.mockResolvedValue(revertResult);

    const result = await handleRevertEmailChange(ctx, { token: 'revert-token' });

    expect(result.status).toBe(200);
    expect(result.body).toEqual(revertResult);
  });

  it('should map errors via mapErrorToHttpResponse', async () => {
    mockRevertEmailChange.mockRejectedValue(new InvalidTokenError('Token not found'));

    const result = await handleRevertEmailChange(ctx, { token: 'bad-token' });

    expect(result.status).toBe(400);
  });
});
