// apps/server/src/modules/auth/oauth/__tests__/service.test.ts
/**
 * OAuth Service Unit Tests
 *
 * Tests the OAuth service business logic by mocking database operations
 * and OAuth provider clients.
 */

import { ConflictError, NotFoundError, OAuthStateMismatchError } from '@abe-stack/core';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import {
  createOAuthState,
  decodeOAuthState,
  encodeOAuthState,
  findUserByOAuthProvider,
  getConnectedProviders,
  unlinkOAuthAccount,
} from '../service';

import type { OAuthProvider } from '../types';
import type { AuthConfig } from '@config';
import type { DbClient } from '@infrastructure';

// ============================================================================
// Mock Dependencies
// ============================================================================

// Mock @infrastructure
vi.mock('@infrastructure', () => ({
  oauthConnections: {
    id: 'id',
    userId: 'userId',
    provider: 'provider',
    providerUserId: 'providerUserId',
    providerEmail: 'providerEmail',
    accessToken: 'accessToken',
    refreshToken: 'refreshToken',
    expiresAt: 'expiresAt',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
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
  OAUTH_PROVIDERS: ['google', 'github', 'apple'],
}));

// Mock drizzle-orm
vi.mock('drizzle-orm', () => ({
  eq: vi.fn((...args: unknown[]) => args),
  and: vi.fn((...args: unknown[]) => args),
}));

// Mock ../utils
vi.mock('../../utils', () => ({
  createAccessToken: vi.fn(() => 'mock-access-token'),
  createRefreshTokenFamily: vi.fn(() => ({
    familyId: 'family-123',
    token: 'mock-refresh-token',
  })),
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
  cookie: {
    secret: 'cookie-secret-32-characters-lng!',
  },
  oauth: {
    google: {
      clientId: 'google-client-id',
      clientSecret: 'google-client-secret',
      callbackUrl: '/api/auth/oauth/google/callback',
    },
    github: {
      clientId: 'github-client-id',
      clientSecret: 'github-client-secret',
      callbackUrl: '/api/auth/oauth/github/callback',
    },
  },
} as unknown as AuthConfig;

// ============================================================================
// Test Helpers
// ============================================================================

interface MockDbQueryResult {
  findFirst: ReturnType<typeof vi.fn>;
  findMany: ReturnType<typeof vi.fn>;
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
    oauthConnections: MockDbQueryResult;
    users: MockDbQueryResult;
  };
  select: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn> & ((...args: unknown[]) => MockDbInsertResult);
  update: ReturnType<typeof vi.fn> & ((...args: unknown[]) => MockDbUpdateResult);
  delete: ReturnType<typeof vi.fn> & ((...args: unknown[]) => MockDbDeleteResult);
}

function createMockDb(): MockDbClientExtended & DbClient {
  const mockInsert = vi.fn(() => ({
    values: vi.fn(() => ({
      returning: vi.fn(() => Promise.resolve([])),
    })),
  }));

  const mockUpdate = vi.fn(() => ({
    set: vi.fn(() => ({
      where: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([])),
      })),
    })),
  }));

  const mockDelete = vi.fn(() => ({
    where: vi.fn(() => ({
      returning: vi.fn(() => Promise.resolve([])),
    })),
  }));

  // Create select chain mock for findUserByOAuthProvider (JOIN query)
  const mockSelect = vi.fn(() => {
    const chain = {
      from: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn(() => Promise.resolve([])),
    };
    return chain;
  });

  return {
    query: {
      oauthConnections: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      users: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
    },
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
  } as unknown as MockDbClientExtended & DbClient;
}

// ============================================================================
// Tests: OAuth State Management
// ============================================================================

describe('OAuth State Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('createOAuthState should create valid state object', () => {
    const provider: OAuthProvider = 'google';
    const redirectUri = 'http://localhost:3000/callback';
    const isLinking = false;

    const state = createOAuthState(provider, redirectUri, isLinking);

    expect(state.provider).toBe(provider);
    expect(state.redirectUri).toBe(redirectUri);
    expect(state.isLinking).toBe(false);
    expect(state.userId).toBeUndefined();
    expect(state.state).toBeDefined();
    expect(state.state.length).toBe(64); // 32 bytes hex
    expect(state.createdAt).toBeLessThanOrEqual(Date.now());
  });

  test('createOAuthState should include userId for linking', () => {
    const provider: OAuthProvider = 'github';
    const redirectUri = 'http://localhost:3000/callback';
    const isLinking = true;
    const userId = 'user-123';

    const state = createOAuthState(provider, redirectUri, isLinking, userId);

    expect(state.isLinking).toBe(true);
    expect(state.userId).toBe(userId);
  });

  test('encodeOAuthState and decodeOAuthState should be reversible', () => {
    const provider: OAuthProvider = 'google';
    const redirectUri = 'http://localhost:3000/callback';
    const isLinking = true;
    const userId = 'user-456';

    const originalState = createOAuthState(provider, redirectUri, isLinking, userId);
    const encoded = encodeOAuthState(originalState, TEST_CONFIG.cookie.secret);
    const decoded = decodeOAuthState(encoded, TEST_CONFIG.cookie.secret);

    expect(decoded.provider).toBe(originalState.provider);
    expect(decoded.redirectUri).toBe(originalState.redirectUri);
    expect(decoded.isLinking).toBe(originalState.isLinking);
    expect(decoded.userId).toBe(originalState.userId);
    expect(decoded.state).toBe(originalState.state);
    expect(decoded.createdAt).toBe(originalState.createdAt);
  });

  test('decodeOAuthState should throw for invalid state', async () => {
    expect(() => decodeOAuthState('invalid-state', TEST_CONFIG.cookie.secret)).toThrow(
      OAuthStateMismatchError,
    );
  });

  test('decodeOAuthState should throw for tampered state', async () => {
    const state = createOAuthState('google', 'http://localhost:3000/callback', false);
    const encoded = encodeOAuthState(state, TEST_CONFIG.cookie.secret);

    // Tamper with the encoded state
    const tampered = encoded.slice(0, -5) + 'xxxxx';

    expect(() => decodeOAuthState(tampered, TEST_CONFIG.cookie.secret)).toThrow(
      OAuthStateMismatchError,
    );
  });

  test('decodeOAuthState should throw for expired state', async () => {
    // Create state with old timestamp
    const state = createOAuthState('google', 'http://localhost:3000/callback', false);
    state.createdAt = Date.now() - 15 * 60 * 1000; // 15 minutes ago (expired)

    const encoded = encodeOAuthState(state, TEST_CONFIG.cookie.secret);

    expect(() => decodeOAuthState(encoded, TEST_CONFIG.cookie.secret)).toThrow(
      OAuthStateMismatchError,
    );
  });
});

// ============================================================================
// Tests: getConnectedProviders
// ============================================================================

describe('getConnectedProviders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should return empty array for user with no connections', async () => {
    const db = createMockDb();
    const userId = 'user-123';

    vi.mocked(db.query.oauthConnections.findMany).mockResolvedValue([]);

    const connections = await getConnectedProviders(db, userId);

    expect(connections).toEqual([]);
    expect(db.query.oauthConnections.findMany).toHaveBeenCalled();
  });

  test('should return mapped connections for user', async () => {
    const db = createMockDb();
    const userId = 'user-123';

    const mockConnections = [
      {
        id: 'conn-1',
        userId,
        provider: 'google' as const,
        providerUserId: 'google-123',
        providerEmail: 'user@gmail.com',
        accessToken: 'encrypted-token',
        refreshToken: null,
        expiresAt: null,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
      {
        id: 'conn-2',
        userId,
        provider: 'github' as const,
        providerUserId: 'github-456',
        providerEmail: 'user@github.com',
        accessToken: 'encrypted-token-2',
        refreshToken: null,
        expiresAt: null,
        createdAt: new Date('2024-01-02'),
        updatedAt: new Date('2024-01-02'),
      },
    ];

    vi.mocked(db.query.oauthConnections.findMany).mockResolvedValue(mockConnections);

    const connections = await getConnectedProviders(db, userId);

    expect(connections).toHaveLength(2);
    expect(connections[0]).toEqual({
      id: 'conn-1',
      provider: 'google',
      providerEmail: 'user@gmail.com',
      connectedAt: new Date('2024-01-01'),
    });
    expect(connections[1]).toEqual({
      id: 'conn-2',
      provider: 'github',
      providerEmail: 'user@github.com',
      connectedAt: new Date('2024-01-02'),
    });
  });
});

// ============================================================================
// Tests: findUserByOAuthProvider
// ============================================================================

describe('findUserByOAuthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should return null when no connection found', async () => {
    const db = createMockDb();

    // The function uses db.select() with JOIN, returns empty array if not found
    const selectChain = {
      from: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    };
    vi.mocked(db.select as ReturnType<typeof vi.fn>).mockReturnValue(selectChain);

    const result = await findUserByOAuthProvider(db, 'google', 'google-123');

    expect(result).toBeNull();
  });

  test('should return null when JOIN returns empty result', async () => {
    const db = createMockDb();

    // Return empty array (no matching user/connection)
    const selectChain = {
      from: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    };
    vi.mocked(db.select as ReturnType<typeof vi.fn>).mockReturnValue(selectChain);

    const result = await findUserByOAuthProvider(db, 'google', 'google-123');

    expect(result).toBeNull();
  });

  test('should return user info when found', async () => {
    const db = createMockDb();

    // Return user data from JOIN query
    const selectChain = {
      from: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([
        {
          userId: 'user-123',
          email: 'user@example.com',
        },
      ]),
    };
    vi.mocked(db.select as ReturnType<typeof vi.fn>).mockReturnValue(selectChain);

    const result = await findUserByOAuthProvider(db, 'google', 'google-123');

    expect(result).toEqual({
      userId: 'user-123',
      email: 'user@example.com',
    });
  });
});

// ============================================================================
// Tests: unlinkOAuthAccount
// ============================================================================

describe('unlinkOAuthAccount', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should throw NotFoundError when connection not found', async () => {
    const db = createMockDb();
    const userId = 'user-123';
    const provider: OAuthProvider = 'google';

    vi.mocked(db.query.oauthConnections.findFirst).mockResolvedValue(null);

    await expect(unlinkOAuthAccount(db, userId, provider)).rejects.toThrow(NotFoundError);
  });

  test('should throw NotFoundError when user not found', async () => {
    const db = createMockDb();
    const userId = 'user-123';
    const provider: OAuthProvider = 'google';

    vi.mocked(db.query.oauthConnections.findFirst).mockResolvedValue({
      id: 'conn-1',
      userId,
      provider,
      providerUserId: 'google-123',
    });

    vi.mocked(db.query.users.findFirst).mockResolvedValue(null);

    await expect(unlinkOAuthAccount(db, userId, provider)).rejects.toThrow(NotFoundError);
  });

  test('should throw ConflictError when unlinking only auth method', async () => {
    const db = createMockDb();
    const userId = 'user-123';
    const provider: OAuthProvider = 'google';

    vi.mocked(db.query.oauthConnections.findFirst).mockResolvedValue({
      id: 'conn-1',
      userId,
      provider,
      providerUserId: 'google-123',
    });

    vi.mocked(db.query.users.findFirst).mockResolvedValue({
      id: userId,
      email: 'user@example.com',
      passwordHash: 'oauth:google:randomhash', // OAuth-only user
    });

    vi.mocked(db.query.oauthConnections.findMany).mockResolvedValue([
      { id: 'conn-1', provider: 'google' }, // Only one connection
    ]);

    await expect(unlinkOAuthAccount(db, userId, provider)).rejects.toThrow(ConflictError);
  });

  test('should allow unlinking when user has password', async () => {
    const db = createMockDb();
    const userId = 'user-123';
    const provider: OAuthProvider = 'google';

    vi.mocked(db.query.oauthConnections.findFirst).mockResolvedValue({
      id: 'conn-1',
      userId,
      provider,
      providerUserId: 'google-123',
    });

    vi.mocked(db.query.users.findFirst).mockResolvedValue({
      id: userId,
      email: 'user@example.com',
      passwordHash: '$argon2id$v=19$m=19456,t=2,p=1$...', // Has real password
    });

    vi.mocked(db.query.oauthConnections.findMany).mockResolvedValue([
      { id: 'conn-1', provider: 'google' },
    ]);

    vi.mocked(db.delete).mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    });

    await expect(unlinkOAuthAccount(db, userId, provider)).resolves.toBeUndefined();
    expect(db.delete).toHaveBeenCalled();
  });

  test('should allow unlinking when user has multiple connections', async () => {
    const db = createMockDb();
    const userId = 'user-123';
    const provider: OAuthProvider = 'google';

    vi.mocked(db.query.oauthConnections.findFirst).mockResolvedValue({
      id: 'conn-1',
      userId,
      provider,
      providerUserId: 'google-123',
    });

    vi.mocked(db.query.users.findFirst).mockResolvedValue({
      id: userId,
      email: 'user@example.com',
      passwordHash: 'oauth:google:randomhash', // OAuth-only user
    });

    vi.mocked(db.query.oauthConnections.findMany).mockResolvedValue([
      { id: 'conn-1', provider: 'google' },
      { id: 'conn-2', provider: 'github' }, // Has another connection
    ]);

    vi.mocked(db.delete).mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    });

    await expect(unlinkOAuthAccount(db, userId, provider)).resolves.toBeUndefined();
    expect(db.delete).toHaveBeenCalled();
  });
});
