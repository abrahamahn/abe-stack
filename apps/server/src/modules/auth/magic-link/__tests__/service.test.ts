// apps/server/src/modules/auth/magic-link/__tests__/service.test.ts
/**
 * Magic Link Service Unit Tests
 *
 * Tests the magic link service business logic by mocking database operations.
 */

import { beforeEach, describe, expect, test, vi } from 'vitest';

import { EmailSendError, InvalidTokenError, TooManyRequestsError } from '@abe-stack/core';

import { cleanupExpiredMagicLinkTokens, requestMagicLink, verifyMagicLink } from '../service';

import { withTransaction } from '@infrastructure';

import type { AuthConfig } from '@config';
import type { DbClient, EmailService } from '@infrastructure';

// ============================================================================
// Mock Dependencies
// ============================================================================

// Mock @infrastructure
vi.mock('@infrastructure', () => ({
  emailTemplates: {
    magicLink: vi.fn((url: string, expiry: number) => ({
      to: '',
      subject: 'Sign in to your account',
      text: `Magic link URL: ${url}, expires in ${expiry} minutes`,
      html: `<a href="${url}">Sign In</a>`,
    })),
  },
  magicLinkTokens: {
    id: 'id',
    email: 'email',
    tokenHash: 'tokenHash',
    expiresAt: 'expiresAt',
    usedAt: 'usedAt',
    createdAt: 'createdAt',
    ipAddress: 'ipAddress',
    userAgent: 'userAgent',
  },
  users: {
    id: 'id',
    email: 'email',
    name: 'name',
    role: 'role',
    passwordHash: 'passwordHash',
    emailVerified: 'emailVerified',
  },
  withTransaction: vi.fn(),
}));

// Mock ../utils
vi.mock('../../utils', () => ({
  createAuthResponse: vi.fn((accessToken, refreshToken, user) => ({
    accessToken,
    refreshToken,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  })),
  createAccessToken: vi.fn(() => 'mock-access-token'),
  createRefreshTokenFamily: vi.fn(() => ({
    familyId: 'family-123',
    token: 'mock-refresh-token',
  })),
}));

// Mock drizzle-orm
vi.mock('drizzle-orm', () => ({
  eq: vi.fn((...args: unknown[]) => args),
  and: vi.fn((...args: unknown[]) => args),
  gt: vi.fn((...args: unknown[]) => args),
  lt: vi.fn((...args: unknown[]) => args),
  isNull: vi.fn((...args: unknown[]) => args),
  count: vi.fn(() => 'count'),
}));

// ============================================================================
// Test Constants
// ============================================================================

const TEST_CONFIG = {
  jwt: {
    secret: 'test-secret-32-characters-long!!',
    accessTokenExpiry: '15m',
  },
  refreshToken: {
    expiryDays: 7,
  },
} as unknown as AuthConfig;

// ============================================================================
// Test Helpers
// ============================================================================

interface MockDbQueryResult {
  findFirst: ReturnType<typeof vi.fn>;
}

interface MockDbSelectResult {
  from: ReturnType<typeof vi.fn>;
}

interface MockDbInsertResult {
  values: ReturnType<typeof vi.fn>;
}

interface MockDbUpdateResult {
  set: ReturnType<typeof vi.fn>;
}

interface MockDbDeleteResult {
  where: ReturnType<typeof vi.fn>;
}

interface MockDbClientExtended {
  query: {
    magicLinkTokens: MockDbQueryResult;
    users: MockDbQueryResult;
  };
  select: ReturnType<typeof vi.fn> & ((...args: unknown[]) => MockDbSelectResult);
  insert: ReturnType<typeof vi.fn> & ((...args: unknown[]) => MockDbInsertResult);
  update: ReturnType<typeof vi.fn> & ((...args: unknown[]) => MockDbUpdateResult);
  delete: ReturnType<typeof vi.fn> & ((...args: unknown[]) => MockDbDeleteResult);
}

function createMockDb(): MockDbClientExtended & DbClient {
  const mockSelect = vi.fn(() => ({
    from: vi.fn(() => ({
      where: vi.fn(() => Promise.resolve([{ count: 0 }])),
    })),
  }));

  const mockInsert = vi.fn(() => ({
    values: vi.fn(() => ({
      returning: vi.fn(() => Promise.resolve([])),
    })),
  }));

  const mockUpdate = vi.fn(() => ({
    set: vi.fn(() => ({
      where: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([{ id: 'user-id' }])),
      })),
    })),
  }));

  const mockDelete = vi.fn(() => ({
    where: vi.fn(() => ({
      returning: vi.fn(() => Promise.resolve([{ id: 'token-1' }, { id: 'token-2' }])),
    })),
  }));

  return {
    query: {
      magicLinkTokens: {
        findFirst: vi.fn(),
      },
      users: {
        findFirst: vi.fn(),
      },
    },
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
  } as unknown as MockDbClientExtended & DbClient;
}

function createMockEmailService(): EmailService {
  return {
    send: vi.fn().mockResolvedValue({ success: true, messageId: 'mock-message-id' }),
  };
}

// ============================================================================
// Tests: requestMagicLink
// ============================================================================

describe('requestMagicLink', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should create magic link token and send email', async () => {
    const db = createMockDb();
    const emailService = createMockEmailService();
    const email = 'test@example.com';
    const baseUrl = 'http://localhost:5173';
    const ipAddress = '192.168.1.1';
    const userAgent = 'Mozilla/5.0';

    // Mock: no rate limit (0 requests in window)
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ count: 0 }]),
      }),
    });

    // Mock: token insert succeeds
    vi.mocked(db.insert).mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: 'token-id' }]),
      }),
    });

    const result = await requestMagicLink(db, emailService, email, baseUrl, ipAddress, userAgent);

    expect(result.success).toBe(true);
    expect(result.message).toContain('magic link has been sent');
    expect(db.insert).toHaveBeenCalled();
    expect(emailService.send).toHaveBeenCalled();

    // Check email was sent to correct address
    const sendCall = vi.mocked(emailService.send).mock.calls[0]![0];
    expect(sendCall.to).toBe(email);
    expect(sendCall.subject).toBe('Sign in to your account');
  });

  test('should normalize email to lowercase', async () => {
    const db = createMockDb();
    const emailService = createMockEmailService();
    const email = 'TEST@EXAMPLE.COM';
    const baseUrl = 'http://localhost:5173';

    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ count: 0 }]),
      }),
    });

    vi.mocked(db.insert).mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{}]),
      }),
    });

    const result = await requestMagicLink(db, emailService, email, baseUrl);

    expect(result.success).toBe(true);

    // Check email was normalized to lowercase
    const sendCall = vi.mocked(emailService.send).mock.calls[0]![0];
    expect(sendCall.to).toBe('test@example.com');
  });

  test('should throw TooManyRequestsError when rate limit exceeded', async () => {
    const db = createMockDb();
    const emailService = createMockEmailService();
    const email = 'test@example.com';
    const baseUrl = 'http://localhost:5173';

    // Mock: rate limit exceeded (3+ requests in window)
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ count: 3 }]),
      }),
    });

    await expect(requestMagicLink(db, emailService, email, baseUrl)).rejects.toThrow(
      TooManyRequestsError,
    );

    // Email should not have been sent
    expect(emailService.send).not.toHaveBeenCalled();
  });

  test('should throw EmailSendError when email fails', async () => {
    const db = createMockDb();
    const emailService = createMockEmailService();
    const email = 'test@example.com';
    const baseUrl = 'http://localhost:5173';

    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ count: 0 }]),
      }),
    });

    vi.mocked(db.insert).mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{}]),
      }),
    });

    // Mock: email send fails
    vi.mocked(emailService.send).mockRejectedValue(new Error('SMTP connection failed'));

    await expect(requestMagicLink(db, emailService, email, baseUrl)).rejects.toThrow(
      EmailSendError,
    );
  });
});

// ============================================================================
// Tests: verifyMagicLink
// ============================================================================

describe('verifyMagicLink', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should verify valid token and return auth result for existing user', async () => {
    const db = createMockDb();
    const token = 'valid-magic-link-token';

    const mockTokenRecord = {
      id: 'token-id',
      email: 'test@example.com',
      tokenHash: 'hashed-token',
      expiresAt: new Date(Date.now() + 1000000),
      usedAt: null,
    };

    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      role: 'user' as const,
      emailVerified: true,
    };

    // Mock: token found
    vi.mocked(db.query.magicLinkTokens.findFirst).mockResolvedValue(mockTokenRecord);

    // Mock: transaction
    vi.mocked(withTransaction).mockImplementation(async (_db, callback) => {
      // Mock token marking as used
      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });

      // Mock user found
      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser);

      return callback(db);
    });

    const result = await verifyMagicLink(db, TEST_CONFIG, token);

    expect(result.accessToken).toBe('mock-access-token');
    expect(result.refreshToken).toBe('mock-refresh-token');
    expect(result.user.email).toBe('test@example.com');
  });

  test('should create new user for unknown email', async () => {
    const db = createMockDb();
    const token = 'valid-magic-link-token';

    const mockTokenRecord = {
      id: 'token-id',
      email: 'newuser@example.com',
      tokenHash: 'hashed-token',
      expiresAt: new Date(Date.now() + 1000000),
      usedAt: null,
    };

    const mockNewUser = {
      id: 'new-user-123',
      email: 'newuser@example.com',
      name: null,
      role: 'user' as const,
      emailVerified: true,
    };

    // Mock: token found
    vi.mocked(db.query.magicLinkTokens.findFirst).mockResolvedValue(mockTokenRecord);

    // Mock: transaction
    vi.mocked(withTransaction).mockImplementation(async (_db, callback) => {
      // Mock token marking as used
      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });

      // Mock user not found (first call)
      vi.mocked(db.query.users.findFirst).mockResolvedValue(null);

      // Mock user creation
      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockNewUser]),
        }),
      });

      return callback(db);
    });

    const result = await verifyMagicLink(db, TEST_CONFIG, token);

    expect(result.accessToken).toBe('mock-access-token');
    expect(result.user.email).toBe('newuser@example.com');
    expect(db.insert).toHaveBeenCalled();
  });

  test('should verify email for unverified user', async () => {
    const db = createMockDb();
    const token = 'valid-magic-link-token';

    const mockTokenRecord = {
      id: 'token-id',
      email: 'unverified@example.com',
      tokenHash: 'hashed-token',
      expiresAt: new Date(Date.now() + 1000000),
      usedAt: null,
    };

    const mockUnverifiedUser = {
      id: 'user-123',
      email: 'unverified@example.com',
      name: 'Unverified User',
      role: 'user' as const,
      emailVerified: false,
    };

    const mockVerifiedUser = {
      ...mockUnverifiedUser,
      emailVerified: true,
    };

    // Mock: token found
    vi.mocked(db.query.magicLinkTokens.findFirst).mockResolvedValue(mockTokenRecord);

    // Mock: transaction
    vi.mocked(withTransaction).mockImplementation(async (_db, callback) => {
      // Mock token marking as used
      let updateCallCount = 0;
      vi.mocked(db.update).mockImplementation(() => ({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue(updateCallCount++ === 0 ? [] : [mockVerifiedUser]),
          }),
        }),
      }));

      // Mock user found but unverified
      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUnverifiedUser);

      return callback(db);
    });

    const result = await verifyMagicLink(db, TEST_CONFIG, token);

    expect(result.accessToken).toBe('mock-access-token');
    expect(result.user.email).toBe('unverified@example.com');
  });

  test('should throw InvalidTokenError for missing token', async () => {
    const db = createMockDb();
    const token = 'invalid-token';

    // Mock: token not found
    vi.mocked(db.query.magicLinkTokens.findFirst).mockResolvedValue(null);

    await expect(verifyMagicLink(db, TEST_CONFIG, token)).rejects.toThrow(InvalidTokenError);
  });

  test('should throw InvalidTokenError for expired token', async () => {
    const db = createMockDb();
    const token = 'expired-token';

    // Token record won't be found because query filters by expiresAt > now
    vi.mocked(db.query.magicLinkTokens.findFirst).mockResolvedValue(null);

    await expect(verifyMagicLink(db, TEST_CONFIG, token)).rejects.toThrow(InvalidTokenError);
  });

  test('should throw InvalidTokenError for already used token', async () => {
    const db = createMockDb();
    const token = 'used-token';

    // Token record won't be found because query filters by usedAt is null
    vi.mocked(db.query.magicLinkTokens.findFirst).mockResolvedValue(null);

    await expect(verifyMagicLink(db, TEST_CONFIG, token)).rejects.toThrow(InvalidTokenError);
  });
});

// ============================================================================
// Tests: cleanupExpiredMagicLinkTokens
// ============================================================================

describe('cleanupExpiredMagicLinkTokens', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should delete expired tokens and return count', async () => {
    const db = createMockDb();

    // Mock: delete returns 2 deleted tokens
    vi.mocked(db.delete).mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: 'token-1' }, { id: 'token-2' }]),
      }),
    });

    const result = await cleanupExpiredMagicLinkTokens(db);

    expect(result).toBe(2);
    expect(db.delete).toHaveBeenCalled();
  });

  test('should return 0 when no expired tokens', async () => {
    const db = createMockDb();

    // Mock: no tokens to delete
    vi.mocked(db.delete).mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([]),
      }),
    });

    const result = await cleanupExpiredMagicLinkTokens(db);

    expect(result).toBe(0);
  });
});
