// main/server/core/src/auth/__tests__/session-binding.test.ts
import { TokenReuseError } from '@bslt/shared';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import {
  withTransaction,
  type DbClient,
  type RawDb,
  type RefreshToken,
  type RefreshTokenFamily,
  type User,
  type UserSession,
} from '../../../../db/src';
import { logTokenFamilyRevokedEvent, logTokenReuseEvent } from '../security/events';
import { createRefreshToken, getRefreshTokenExpiry } from '../utils/jwt';
import { rotateRefreshToken } from '../utils/refresh-token';

// Mock Dependencies
vi.mock('../utils/jwt', () => ({
  createRefreshToken: vi.fn(),
  getRefreshTokenExpiry: vi.fn(),
}));

vi.mock('../security/events', () => ({
  logTokenReuseEvent: vi.fn(),
  logTokenFamilyRevokedEvent: vi.fn(),
}));

vi.mock('@bslt/db', async () => {
  const actual = await vi.importActual<typeof import('../../../../db/src')>('@bslt/db');
  return {
    ...actual,
    withTransaction: vi.fn(<T>(db: RawDb, callback: (tx: RawDb) => Promise<T>) => callback(db)),
  };
});

// Test Helpers
function createMockDbClient(): DbClient {
  return {
    query: vi.fn(),
    queryOne: vi.fn(),
    execute: vi.fn(),
    transaction: vi.fn(<T>(callback: (tx: RawDb) => Promise<T>) =>
      callback({ query: vi.fn(), queryOne: vi.fn(), execute: vi.fn() } as unknown as RawDb),
    ),
  } as unknown as DbClient;
}

function createMockUser(overrides?: Partial<User>): User {
  return {
    id: 'user-123',
    email: 'test@example.com',
    role: 'user',
    emailVerified: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  } as User;
}

function createMockRefreshToken(overrides?: Partial<RefreshToken>): RefreshToken {
  return {
    id: 'token-123',
    userId: 'user-123',
    familyId: 'family-123',
    token: 'mock-token-abc123',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    createdAt: new Date(Date.now() - 60000), // 1 minute ago
    ...overrides,
  } as RefreshToken;
}

function createMockRefreshTokenFamily(overrides?: Partial<RefreshTokenFamily>): RefreshTokenFamily {
  return {
    id: 'family-123',
    userId: 'user-123',
    revokedAt: null,
    revokeReason: null,
    createdAt: new Date('2024-01-01'),
    ...overrides,
  } as RefreshTokenFamily;
}

function createMockUserSession(overrides?: Partial<UserSession>): UserSession {
  return {
    id: 'family-123', // Matches familyId
    userId: 'user-123',
    ipAddress: '127.0.0.1',
    userAgent: 'Mozilla/5.0 (Test Browser)',
    deviceId: null,
    lastActiveAt: new Date(),
    revokedAt: null,
    createdAt: new Date('2024-01-01'),
    ...overrides,
  } as UserSession;
}

describe('Session Binding (User-Agent Validation)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should allow rotation when User-Agent matches', async () => {
    const db = createMockDbClient();
    const mockToken = createMockRefreshToken();
    const mockUser = createMockUser();
    const mockFamily = createMockRefreshTokenFamily();
    const mockSession = createMockUserSession({ userAgent: 'Chrome/100' });
    const newToken = 'new-token-123';

    // Sequence of queryOne calls:
    // 1. storedToken (Optimization 1)
    // 2-4. Promise.all([user, family, session]) (Optimization 2)
    // 5. check for recent tokens (Optimization 3) - returns null here
    vi.mocked(db.queryOne)
      .mockResolvedValueOnce({
        // 1. storedToken
        id: mockToken.id,
        user_id: mockToken.userId,
        family_id: mockToken.familyId,
        token: mockToken.token,
        expires_at: mockToken.expiresAt,
        created_at: mockToken.createdAt,
      })
      .mockResolvedValueOnce({
        // 2. user
        id: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
        email_verified: mockUser.emailVerified,
        created_at: mockUser.createdAt,
        updated_at: mockUser.updatedAt,
      })
      .mockResolvedValueOnce({
        // 3. family
        id: mockFamily.id,
        user_id: mockFamily.userId,
        revoked_at: null,
        revoke_reason: null,
        created_at: mockFamily.createdAt,
      })
      .mockResolvedValueOnce({
        // 4. session
        id: mockSession.id,
        user_id: mockSession.userId,
        ip_address: mockSession.ipAddress,
        user_agent: mockSession.userAgent,
        last_active_at: mockSession.lastActiveAt,
        created_at: mockSession.createdAt,
        revoked_at: mockSession.revokedAt,
      })
      .mockResolvedValueOnce(null); // 5. recent token

    vi.mocked(withTransaction).mockImplementation(async (_db, callback) => {
      const tx = { execute: vi.fn().mockResolvedValue(1) };
      return await callback(tx as unknown as DbClient);
    });
    vi.mocked(createRefreshToken).mockReturnValue(newToken);
    vi.mocked(getRefreshTokenExpiry).mockReturnValue(new Date());

    const result = await rotateRefreshToken(
      db,
      mockToken.token,
      '127.0.0.1',
      'Chrome/100', // Matches session
    );

    expect(result).toBeDefined();
    expect(result?.token).toBe(newToken);
    expect(logTokenReuseEvent).not.toHaveBeenCalled();
  });

  test('should revoke session when User-Agent mismatches (Session Hijacking)', async () => {
    const db = createMockDbClient();
    const mockToken = createMockRefreshToken();
    const mockUser = createMockUser();
    const mockFamily = createMockRefreshTokenFamily();
    const mockSession = createMockUserSession({ userAgent: 'Chrome/100' });

    vi.mocked(db.queryOne)
      .mockResolvedValueOnce({
        // 1. storedToken
        id: mockToken.id,
        user_id: mockToken.userId,
        family_id: mockToken.familyId,
        token: mockToken.token,
        expires_at: mockToken.expiresAt,
        created_at: mockToken.createdAt,
      })
      .mockResolvedValueOnce({
        // 2. user
        id: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
        email_verified: mockUser.emailVerified,
        created_at: mockUser.createdAt,
        updated_at: mockUser.updatedAt,
      })
      .mockResolvedValueOnce({
        // 3. family
        id: mockFamily.id,
        user_id: mockFamily.userId,
        revoked_at: null,
        revoke_reason: null,
        created_at: mockFamily.createdAt,
      })
      .mockResolvedValueOnce({
        // 4. session
        id: mockSession.id,
        user_id: mockSession.userId,
        ip_address: mockSession.ipAddress,
        user_agent: 'Chrome/100', // ORIGINAL bound UA
        last_active_at: mockSession.lastActiveAt,
        created_at: mockSession.createdAt,
        revoked_at: mockSession.revokedAt,
      });

    vi.mocked(withTransaction).mockImplementation(async (_db, callback) => {
      const tx = { execute: vi.fn().mockResolvedValue(1) };
      return await callback(tx as unknown as DbClient);
    });

    await expect(
      rotateRefreshToken(
        db,
        mockToken.token,
        '127.0.0.1',
        'Firefox/99', // MISMATCH!
      ),
    ).rejects.toThrow(TokenReuseError);

    expect(logTokenFamilyRevokedEvent).toHaveBeenCalledWith(
      expect.anything(),
      mockUser.id,
      mockUser.email,
      mockToken.familyId,
      'Session hijacking detected: User-Agent mismatch',
      '127.0.0.1',
      'Firefox/99',
    );
  });

  test('should allow rotation if session has no User-Agent (legacy session)', async () => {
    const db = createMockDbClient();
    const mockToken = createMockRefreshToken();
    const mockUser = createMockUser();
    const mockFamily = createMockRefreshTokenFamily();
    const mockSession = createMockUserSession({ userAgent: null }); // Legacy/Unknown
    const newToken = 'new-token-123';

    vi.mocked(db.queryOne)
      .mockResolvedValueOnce({
        // 1. storedToken
        id: mockToken.id,
        user_id: mockToken.userId,
        family_id: mockToken.familyId,
        token: mockToken.token,
        expires_at: mockToken.expiresAt,
        created_at: mockToken.createdAt,
      })
      .mockResolvedValueOnce({
        // 2. user
        id: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
        email_verified: mockUser.emailVerified,
        created_at: mockUser.createdAt,
        updated_at: mockUser.updatedAt,
      })
      .mockResolvedValueOnce({
        // 3. family
        id: mockFamily.id,
        user_id: mockFamily.userId,
        revoked_at: null,
        revoke_reason: null,
        created_at: mockFamily.createdAt,
      })
      .mockResolvedValueOnce({
        // 4. session
        id: mockSession.id,
        user_id: mockSession.userId,
        ip_address: mockSession.ipAddress,
        user_agent: null, // EMPTY
        last_active_at: mockSession.lastActiveAt,
        created_at: mockSession.createdAt,
        revoked_at: mockSession.revokedAt,
      })
      .mockResolvedValueOnce(null); // 5. recent token

    vi.mocked(withTransaction).mockImplementation(async (_db, callback) => {
      const tx = { execute: vi.fn().mockResolvedValue(1) };
      return await callback(tx as unknown as DbClient);
    });
    vi.mocked(createRefreshToken).mockReturnValue(newToken);
    vi.mocked(getRefreshTokenExpiry).mockReturnValue(new Date());

    const result = await rotateRefreshToken(db, mockToken.token, '127.0.0.1', 'Chrome/100');

    expect(result).toBeDefined();
    expect(result?.token).toBe(newToken);
  });
});
