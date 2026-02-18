// main/server/core/src/auth/handlers/webauthn.test.ts
/**
 * WebAuthn Handler Tests
 */

import { beforeEach, describe, expect, test, vi } from 'vitest';

import {
  handleDeletePasskey,
  handleListPasskeys,
  handleRenamePasskey,
  handleWebauthnLoginOptions,
  handleWebauthnLoginVerify,
  handleWebauthnRegisterOptions,
  handleWebauthnRegisterVerify,
} from './webauthn';

import type { AppContext, ReplyWithCookies, RequestWithCookies } from '../types';

// ============================================================================
// Mock Dependencies
// ============================================================================

const {
  mockGetRegistrationOptions,
  mockVerifyRegistration,
  mockGetAuthenticationOptions,
  mockVerifyAuthentication,
  mockCreateAccessToken,
  mockCreateAuthResponse,
  mockCreateRefreshTokenFamily,
  mockSetRefreshTokenCookie,
  mockWithTransaction,
  mockMapErrorToHttpResponse,
  mockAssertUserActive,
} = vi.hoisted(() => ({
  mockGetRegistrationOptions: vi.fn(),
  mockVerifyRegistration: vi.fn(),
  mockGetAuthenticationOptions: vi.fn(),
  mockVerifyAuthentication: vi.fn(),
  mockCreateAccessToken: vi.fn(),
  mockCreateAuthResponse: vi.fn(),
  mockCreateRefreshTokenFamily: vi.fn(),
  mockSetRefreshTokenCookie: vi.fn(),
  mockWithTransaction: vi.fn(),
  mockMapErrorToHttpResponse: vi.fn((error: unknown) => ({
    status: 500,
    body: { message: error instanceof Error ? error.message : 'Internal server error' },
  })),
  mockAssertUserActive: vi.fn(),
}));

vi.mock('../webauthn/service', () => ({
  getRegistrationOptions: mockGetRegistrationOptions,
  verifyRegistration: mockVerifyRegistration,
  getAuthenticationOptions: mockGetAuthenticationOptions,
  verifyAuthentication: mockVerifyAuthentication,
}));

vi.mock('../utils', () => ({
  createAccessToken: mockCreateAccessToken,
  createAuthResponse: mockCreateAuthResponse,
  createRefreshTokenFamily: mockCreateRefreshTokenFamily,
  setRefreshTokenCookie: mockSetRefreshTokenCookie,
  createErrorMapperLogger: () => ({}),
}));

vi.mock('../middleware', () => ({
  assertUserActive: mockAssertUserActive,
}));

vi.mock('@bslt/db', () => ({
  withTransaction: mockWithTransaction,
}));

vi.mock('@bslt/shared', async (importOriginal) => {
  const original = await importOriginal<typeof import('@bslt/shared')>();
  return {
    ...original,
    mapErrorToHttpResponse: mockMapErrorToHttpResponse,
  };
});

// ============================================================================
// Test Helpers
// ============================================================================

function createMockContext(overrides?: Partial<AppContext>): AppContext {
  return {
    db: {} as AppContext['db'],
    repos: {
      users: { findById: vi.fn().mockResolvedValue({ lockedUntil: null }) },
      webauthnCredentials: {
        findByUserId: vi.fn().mockResolvedValue([]),
        findByCredentialId: vi.fn().mockResolvedValue(null),
        create: vi.fn(),
        updateCounter: vi.fn(),
        updateName: vi.fn(),
        delete: vi.fn(),
        deleteAllByUserId: vi.fn(),
      },
    } as unknown as AppContext['repos'],
    email: { send: vi.fn() } as AppContext['email'],
    config: {
      auth: {
        jwt: { secret: 'test-secret-32-chars!!!!!!!!!!!!!', accessTokenExpiry: '15m' },
        argon2: {},
        refreshToken: { expiryDays: 7, gracePeriodSeconds: 30 },
        lockout: { maxAttempts: 5, windowMs: 900000, lockoutDurationMs: 1800000 },
        webauthn: { rpName: 'Test', rpId: 'localhost', origin: 'http://localhost:3000' },
      },
      server: { port: 8080, appBaseUrl: 'http://localhost:8080' },
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
    storage: {} as AppContext['storage'],
    pubsub: {} as AppContext['pubsub'],
    ...overrides,
  } as unknown as AppContext;
}

function createAuthRequest(
  userId: string = 'user-123',
  email: string = 'test@test.com',
  params?: Record<string, string>,
): RequestWithCookies {
  const req = {
    cookies: {},
    headers: { 'user-agent': 'Test Browser' },
    ip: '127.0.0.1',
    requestInfo: { ipAddress: '127.0.0.1', userAgent: 'Test Browser' },
    user: { userId, email, role: 'user' },
  } as RequestWithCookies;
  if (params !== undefined) {
    (req as unknown as { params: Record<string, string> }).params = params;
  }
  return req;
}

function createUnauthRequest(): RequestWithCookies {
  return {
    cookies: {},
    headers: {},
    ip: '127.0.0.1',
    requestInfo: { ipAddress: '127.0.0.1' },
  } as RequestWithCookies;
}

function createMockReply(): ReplyWithCookies {
  return { setCookie: vi.fn(), clearCookie: vi.fn() };
}

// ============================================================================
// Tests
// ============================================================================

describe('WebAuthn Handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAssertUserActive.mockResolvedValue(undefined);
  });

  // --------------------------------------------------------------------------
  // Registration
  // --------------------------------------------------------------------------
  describe('handleWebauthnRegisterOptions', () => {
    test('returns 200 with options on success', async () => {
      const mockOptions = { challenge: 'abc', rp: { name: 'Test' } };
      mockGetRegistrationOptions.mockResolvedValue(mockOptions);
      const ctx = createMockContext();
      const req = createAuthRequest();

      const result = await handleWebauthnRegisterOptions(ctx, {}, req);

      expect(result.status).toBe(200);
      expect((result.body as { options: unknown }).options).toEqual(mockOptions);
    });

    test('returns 401 when not authenticated', async () => {
      const ctx = createMockContext();
      const req = createUnauthRequest();

      const result = await handleWebauthnRegisterOptions(ctx, {}, req);

      expect(result.status).toBe(401);
    });
  });

  describe('handleWebauthnRegisterVerify', () => {
    test('returns 200 with credentialId on success', async () => {
      mockVerifyRegistration.mockResolvedValue({
        credentialId: 'new-cred',
        message: 'Passkey registered successfully',
      });
      const ctx = createMockContext();
      const req = createAuthRequest();

      const result = await handleWebauthnRegisterVerify(ctx, { credential: { id: 'test' } }, req);

      expect(result.status).toBe(200);
      expect((result.body as { credentialId: string }).credentialId).toBe('new-cred');
    });

    test('returns 401 when not authenticated', async () => {
      const ctx = createMockContext();
      const req = createUnauthRequest();

      const result = await handleWebauthnRegisterVerify(ctx, { credential: {} }, req);

      expect(result.status).toBe(401);
    });
  });

  // --------------------------------------------------------------------------
  // Authentication
  // --------------------------------------------------------------------------
  describe('handleWebauthnLoginOptions', () => {
    test('returns 200 with options', async () => {
      mockGetAuthenticationOptions.mockResolvedValue({
        options: { challenge: 'x', sessionKey: 'sk' },
        sessionKey: 'sk',
      });
      const ctx = createMockContext();

      const result = await handleWebauthnLoginOptions(ctx, {});

      expect(result.status).toBe(200);
    });

    test('passes email when provided', async () => {
      mockGetAuthenticationOptions.mockResolvedValue({
        options: {},
        sessionKey: 'sk',
      });
      const ctx = createMockContext();

      await handleWebauthnLoginOptions(ctx, { email: 'user@t.com' });

      expect(mockGetAuthenticationOptions).toHaveBeenCalledWith(
        ctx.repos,
        ctx.config.auth,
        'user@t.com',
      );
    });
  });

  describe('handleWebauthnLoginVerify', () => {
    test('returns 200 with token on success', async () => {
      mockVerifyAuthentication.mockResolvedValue({ userId: 'user-1' });
      const mockUser = {
        id: 'user-1',
        email: 'u@t.com',
        role: 'user',
        lockedUntil: null,
      };
      const ctx = createMockContext({
        repos: {
          users: {
            findById: vi.fn().mockResolvedValue(mockUser),
          },
          webauthnCredentials: {
            findByUserId: vi.fn(),
          },
        } as unknown as AppContext['repos'],
      });

      mockWithTransaction.mockImplementation(
        async (_db: unknown, fn: (tx: unknown) => Promise<unknown>) => fn({}),
      );
      mockCreateRefreshTokenFamily.mockResolvedValue({ token: 'refresh-tok' });
      mockCreateAccessToken.mockReturnValue('access-tok');
      mockCreateAuthResponse.mockReturnValue({
        accessToken: 'access-tok',
        user: mockUser,
      });

      const req = createUnauthRequest();
      const reply = createMockReply();

      const result = await handleWebauthnLoginVerify(
        ctx,
        { credential: { id: 'c' }, sessionKey: 'sk' },
        req,
        reply,
      );

      expect(result.status).toBe(200);
      expect((result.body as { token: string }).token).toBe('access-tok');
      expect(mockSetRefreshTokenCookie).toHaveBeenCalled();
    });

    test('returns error when user not found', async () => {
      mockVerifyAuthentication.mockResolvedValue({ userId: 'gone-user' });
      const ctx = createMockContext({
        repos: {
          users: { findById: vi.fn().mockResolvedValue(null) },
        } as unknown as AppContext['repos'],
      });

      const req = createUnauthRequest();
      const reply = createMockReply();

      const result = await handleWebauthnLoginVerify(
        ctx,
        { credential: {}, sessionKey: 'sk' },
        req,
        reply,
      );

      expect(result.status).toBe(401);
    });
  });

  // --------------------------------------------------------------------------
  // Passkey Management
  // --------------------------------------------------------------------------
  describe('handleListPasskeys', () => {
    test('returns passkey list', async () => {
      const now = new Date();
      const ctx = createMockContext({
        repos: {
          webauthnCredentials: {
            findByUserId: vi.fn().mockResolvedValue([
              {
                id: 'pk-1',
                name: 'My Key',
                deviceType: 'multiDevice',
                backedUp: true,
                createdAt: now,
                lastUsedAt: null,
              },
            ]),
          },
        } as unknown as AppContext['repos'],
      });
      const req = createAuthRequest();

      const result = await handleListPasskeys(ctx, {}, req);

      expect(result.status).toBe(200);
      const body = result.body as Array<{ id: string; name: string }>;
      expect(body).toHaveLength(1);
      expect(body[0]!.name).toBe('My Key');
    });

    test('returns 401 when not authenticated', async () => {
      const ctx = createMockContext();
      const req = createUnauthRequest();

      const result = await handleListPasskeys(ctx, {}, req);

      expect(result.status).toBe(401);
    });
  });

  describe('handleRenamePasskey', () => {
    test('renames passkey successfully', async () => {
      const ctx = createMockContext({
        repos: {
          webauthnCredentials: {
            findByUserId: vi.fn().mockResolvedValue([{ id: 'pk-1' }]),
            updateName: vi.fn().mockResolvedValue(undefined),
          },
        } as unknown as AppContext['repos'],
      });
      const req = createAuthRequest('user-123', 'u@t.com', { id: 'pk-1' });

      const result = await handleRenamePasskey(ctx, { name: 'New Name' }, req);

      expect(result.status).toBe(200);
      const repos = ctx.repos as unknown as {
        webauthnCredentials: { updateName: ReturnType<typeof vi.fn> };
      };
      expect(repos.webauthnCredentials.updateName).toHaveBeenCalledWith('pk-1', 'New Name');
    });

    test('returns 404 when passkey not found', async () => {
      const ctx = createMockContext({
        repos: {
          webauthnCredentials: {
            findByUserId: vi.fn().mockResolvedValue([]),
          },
        } as unknown as AppContext['repos'],
      });
      const req = createAuthRequest('user-123', 'u@t.com', { id: 'nonexistent' });

      const result = await handleRenamePasskey(ctx, { name: 'New Name' }, req);

      expect(result.status).toBe(404);
    });
  });

  describe('handleDeletePasskey', () => {
    test('deletes passkey successfully', async () => {
      const ctx = createMockContext({
        repos: {
          webauthnCredentials: {
            findByUserId: vi.fn().mockResolvedValue([{ id: 'pk-1' }]),
            delete: vi.fn().mockResolvedValue(undefined),
          },
        } as unknown as AppContext['repos'],
      });
      const req = createAuthRequest('user-123', 'u@t.com', { id: 'pk-1' });

      const result = await handleDeletePasskey(ctx, {}, req);

      expect(result.status).toBe(200);
      const repos = ctx.repos as unknown as {
        webauthnCredentials: { delete: ReturnType<typeof vi.fn> };
      };
      expect(repos.webauthnCredentials.delete).toHaveBeenCalledWith('pk-1');
    });

    test('returns 404 when passkey not found', async () => {
      const ctx = createMockContext({
        repos: {
          webauthnCredentials: {
            findByUserId: vi.fn().mockResolvedValue([]),
          },
        } as unknown as AppContext['repos'],
      });
      const req = createAuthRequest('user-123', 'u@t.com', { id: 'missing' });

      const result = await handleDeletePasskey(ctx, {}, req);

      expect(result.status).toBe(404);
    });

    test('returns 401 when not authenticated', async () => {
      const ctx = createMockContext();
      const req = createUnauthRequest();

      const result = await handleDeletePasskey(ctx, {}, req);

      expect(result.status).toBe(401);
    });
  });
});
