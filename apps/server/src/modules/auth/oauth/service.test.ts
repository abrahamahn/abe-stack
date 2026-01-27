/* eslint-disable @typescript-eslint/unbound-method */
// apps/server/src/modules/auth/oauth/__tests__/service.test.ts
import { asMockDb, createMockDb } from '@infrastructure/data/database/utils/test-utils';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import {
    createOAuthState,
    decodeOAuthState,
    encodeOAuthState,
    findUserByOAuthProvider,
    getAuthorizationUrl,
    getConnectedProviders,
    getProviderClient,
    handleOAuthCallback,
    linkOAuthAccount,
    unlinkOAuthAccount,
} from '../service';

import type { OAuthProviderClient, OAuthTokenResponse, OAuthUserInfo } from '../types';
import type { AuthConfig } from '@/config';
import type {
    OAuthConnectionRepository,
    RefreshTokenRepository,
    UserRepository,
} from '@abe-stack/db';
import type { DbClient, Repositories } from '@infrastructure';



// Mock the crypto module for consistent state generation in tests
vi.mock('node:crypto', async () => {
  const actual = await vi.importActual<typeof import('node:crypto')>('node:crypto');
  return {
    ...actual,
    randomBytes: vi.fn((size: number) => {
      // Return actual Buffer for crypto operations
      return actual.randomBytes(size);
    }),
  };
});

// Mock provider factories
vi.mock('../providers', () => ({
  createGoogleProvider: vi.fn(),
  createGitHubProvider: vi.fn(),
  createAppleProvider: vi.fn(),
  extractAppleUserFromIdToken: vi.fn(),
}));

// Mock auth utils
vi.mock('../../utils', () => ({
  createAccessToken: vi.fn(() => 'mock-access-token'),
  createRefreshTokenFamily: vi.fn(() => Promise.resolve({ token: 'mock-refresh-token' })),
}));

// Mock transaction
vi.mock('@infrastructure', async () => {
  const actual = await vi.importActual<typeof import('@infrastructure')>('@infrastructure');
  return {
    ...actual,
    withTransaction: vi.fn((db, callback) => {
      return Promise.resolve(callback(db));
    }),
  };
});

// Mock db insert helpers
vi.mock('@abe-stack/db', async () => {
  const actual = await vi.importActual<typeof import('@abe-stack/db')>('@abe-stack/db');
  return {
    ...actual,
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returningAll: vi.fn(() => ({
          toSql: vi.fn(() => 'INSERT SQL'),
        })),
        toSql: vi.fn(() => 'INSERT SQL'),
      })),
    })),
    toCamelCase: vi.fn((data) => data),
  };
});

describe('OAuth Service', () => {
  let mockDb: DbClient;
  let mockRepos: Repositories;
  let mockConfig: AuthConfig;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock database client using test utility
    const mockDbClient = createMockDb();
    mockDb = asMockDb(mockDbClient);

    // Mock repositories
    mockRepos = {
      users: {
        findById: vi.fn(),
        findByEmail: vi.fn(),
        create: vi.fn(),
      } as Partial<UserRepository> as UserRepository,
      oauthConnections: {
        findByProviderUserId: vi.fn(),
        findByUserIdAndProvider: vi.fn(),
        findByUserId: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        deleteByUserIdAndProvider: vi.fn(),
      } as Partial<OAuthConnectionRepository> as OAuthConnectionRepository,
      refreshTokens: {} as RefreshTokenRepository,
      refreshTokenFamilies: {} as Repositories['refreshTokenFamilies'],
      loginAttempts: {} as Repositories['loginAttempts'],
      passwordResetTokens: {} as Repositories['passwordResetTokens'],
      emailVerificationTokens: {} as Repositories['emailVerificationTokens'],
      securityEvents: {} as Repositories['securityEvents'],
      magicLinkTokens: {} as Repositories['magicLinkTokens'],
      pushSubscriptions: {} as Repositories['pushSubscriptions'],
      notificationPreferences: {} as Repositories['notificationPreferences'],
      plans: {} as Repositories['plans'],
      subscriptions: {} as Repositories['subscriptions'],
      customerMappings: {} as Repositories['customerMappings'],
      invoices: {} as Repositories['invoices'],
      paymentMethods: {} as Repositories['paymentMethods'],
      billingEvents: {} as Repositories['billingEvents'],
    };

    // Mock auth config
    mockConfig = {
      jwt: {
        secret: 'test-secret',
        accessTokenExpiry: '15m',
        issuer: 'test',
        audience: 'test',
      },
      refreshToken: {
        expiryDays: 30,
        gracePeriodSeconds: 60,
      },
      cookie: {
        secret: 'encryption-secret-key-for-state',
        name: 'refreshToken',
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/',
      },
      oauth: {
        google: {
          clientId: 'google-client-id',
          clientSecret: 'google-client-secret',
          callbackUrl: 'http://localhost:3000/auth/google/callback',
        },
        github: {
          clientId: 'github-client-id',
          clientSecret: 'github-client-secret',
          callbackUrl: 'http://localhost:3000/auth/github/callback',
        },
        apple: {
          clientId: 'apple-client-id',
          clientSecret: 'apple-client-secret',
          callbackUrl: 'http://localhost:3000/auth/apple/callback',
          teamId: 'apple-team-id',
          keyId: 'apple-key-id',
          privateKey: 'apple-private-key',
        },
      },
    } as AuthConfig;
  });

  describe('createOAuthState', () => {
    test('should create OAuth state with required fields', () => {
      const state = createOAuthState('google', 'http://localhost:3000', false);

      expect(state).toMatchObject({
        state: expect.any(String),
        provider: 'google',
        redirectUri: 'http://localhost:3000',
        isLinking: false,
        createdAt: expect.any(Number),
      });
      expect(state.userId).toBeUndefined();
    });

    test('should include userId when provided', () => {
      const state = createOAuthState('github', 'http://localhost:3000', true, 'user-123');

      expect(state).toMatchObject({
        provider: 'github',
        redirectUri: 'http://localhost:3000',
        isLinking: true,
        userId: 'user-123',
      });
    });

    test('should include timestamp for expiry checking', () => {
      const before = Date.now();
      const state = createOAuthState('google', 'http://localhost:3000', false);
      const after = Date.now();

      expect(state.createdAt).toBeGreaterThanOrEqual(before);
      expect(state.createdAt).toBeLessThanOrEqual(after);
    });
  });

  describe('encodeOAuthState and decodeOAuthState', () => {
    test('should encode and decode state correctly', () => {
      const originalState = createOAuthState('google', 'http://localhost:3000', false);
      const encoded = encodeOAuthState(originalState, mockConfig.cookie.secret);
      const decoded = decodeOAuthState(encoded, mockConfig.cookie.secret);

      expect(decoded).toEqual(originalState);
    });

    test('should throw error for expired state', () => {
      const oldState = createOAuthState('google', 'http://localhost:3000', false);
      oldState.createdAt = Date.now() - 11 * 60 * 1000; // 11 minutes ago

      const encoded = encodeOAuthState(oldState, mockConfig.cookie.secret);

      expect(() => decodeOAuthState(encoded, mockConfig.cookie.secret)).toThrow(
        'OAuth state mismatch',
      );
    });

    test('should throw error for invalid encrypted data', () => {
      expect(() => decodeOAuthState('invalid-data', mockConfig.cookie.secret)).toThrow(
        'OAuth state mismatch',
      );
    });

    test('should throw error for malformed encrypted data', () => {
      expect(() => decodeOAuthState('part1:part2', mockConfig.cookie.secret)).toThrow(
        'OAuth state mismatch',
      );
    });
  });

  describe('getProviderClient', () => {
    test('should create Google provider client', async () => {
      const { createGoogleProvider } = await import('../providers/index.js');

      getProviderClient('google', mockConfig);

      expect(createGoogleProvider).toHaveBeenCalledWith('google-client-id', 'google-client-secret');
    });

    test('should create GitHub provider client', async () => {
      const { createGitHubProvider } = await import('../providers/index.js');

      getProviderClient('github', mockConfig);

      expect(createGitHubProvider).toHaveBeenCalledWith('github-client-id', 'github-client-secret');
    });

    test('should create Apple provider client with additional config', async () => {
      const { createAppleProvider } = await import('../providers/index.js');

      getProviderClient('apple', mockConfig);

      expect(createAppleProvider).toHaveBeenCalledWith({
        clientId: 'apple-client-id',
        teamId: 'apple-team-id',
        keyId: 'apple-key-id',
        privateKey: 'apple-private-key',
      });
    });

    test('should throw error for unconfigured provider', () => {
      const configWithoutGoogle = { ...mockConfig, oauth: {} };

      expect(() => getProviderClient('google', configWithoutGoogle)).toThrow(
        'OAuth provider google is not configured',
      );
    });

    test('should throw error for Apple without required fields', () => {
      const incompleteAppleConfig = {
        ...mockConfig,
        oauth: {
          apple: {
            clientId: 'apple-client-id',
            clientSecret: 'apple-client-secret',
            callbackUrl: 'http://localhost:3000/auth/apple/callback',
          },
        },
      };

      expect(() => getProviderClient('apple', incompleteAppleConfig as AuthConfig)).toThrow(
        'Apple OAuth requires teamId, keyId, and privateKey configuration',
      );
    });
  });

  describe('getAuthorizationUrl', () => {
    test('should generate authorization URL with state', async () => {
      const mockClient: OAuthProviderClient = {
        provider: 'google',
        getAuthorizationUrl: vi.fn(() => 'https://accounts.google.com/o/oauth2/v2/auth'),
        exchangeCode: vi.fn(),
        getUserInfo: vi.fn(),
      };

      const { createGoogleProvider } = await import('../providers/index.js');
      vi.mocked(createGoogleProvider).mockReturnValue(mockClient);

      const result = getAuthorizationUrl(
        'google',
        mockConfig,
        'http://localhost:3000/callback',
        false,
      );

      expect(result).toMatchObject({
        url: 'https://accounts.google.com/o/oauth2/v2/auth',
        state: expect.any(String),
      });
      expect(mockClient.getAuthorizationUrl).toHaveBeenCalled();
    });

    test('should include userId in state when linking', async () => {
      const mockClient: OAuthProviderClient = {
        provider: 'google',
        getAuthorizationUrl: vi.fn((state) => {
          // Verify state was passed
          expect(state).toBeDefined();
          return 'https://accounts.google.com/o/oauth2/v2/auth';
        }),
        exchangeCode: vi.fn(),
        getUserInfo: vi.fn(),
      };

      const { createGoogleProvider } = await import('../providers/index.js');
      vi.mocked(createGoogleProvider).mockReturnValue(mockClient);

      const result = getAuthorizationUrl(
        'google',
        mockConfig,
        'http://localhost:3000/callback',
        true,
        'user-123',
      );

      expect(result.state).toBeDefined();
      const decoded = decodeOAuthState(result.state, mockConfig.cookie.secret);
      expect(decoded.userId).toBe('user-123');
      expect(decoded.isLinking).toBe(true);
    });
  });

  describe('handleOAuthCallback', () => {
    const mockOAuthUserInfo: OAuthUserInfo = {
      id: 'provider-user-123',
      email: 'user@example.com',
      name: 'Test User',
      emailVerified: true,
    };

    const mockTokens: OAuthTokenResponse = {
      accessToken: 'provider-access-token',
      refreshToken: 'provider-refresh-token',
      expiresAt: new Date(Date.now() + 3600000),
      tokenType: 'Bearer',
    };

    test('should authenticate existing user with OAuth connection', async () => {
      const mockClient: OAuthProviderClient = {
        provider: 'google',
        getAuthorizationUrl: vi.fn(),
        exchangeCode: vi.fn().mockResolvedValue(mockTokens),
        getUserInfo: vi.fn().mockResolvedValue(mockOAuthUserInfo),
      };

      const { createGoogleProvider } = await import('../providers/index.js');
      vi.mocked(createGoogleProvider).mockReturnValue(mockClient);

      const existingConnection = {
        id: 'conn-123',
        userId: 'user-123',
        provider: 'google' as const,
        providerUserId: 'provider-user-123',
        providerEmail: 'user@example.com',
        accessToken: 'encrypted-token',
        refreshToken: null,
        expiresAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const existingUser = {
        id: 'user-123',
        email: 'user@example.com',
        name: 'Test User',
        avatarUrl: null,
        role: 'user' as const,
        passwordHash: 'hash',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date(),
        emailVerified: true,
        emailVerifiedAt: new Date(),
        lockedUntil: null,
        failedLoginAttempts: 0,
        version: 1,
      };

      vi.mocked(mockRepos.oauthConnections.findByProviderUserId).mockResolvedValue(
        existingConnection,
      );
      vi.mocked(mockRepos.users.findById).mockResolvedValue(existingUser);

      const state = createOAuthState('google', 'http://localhost:3000/callback', false);
      const encoded = encodeOAuthState(state, mockConfig.cookie.secret);

      const result = await handleOAuthCallback(
        mockDb,
        mockRepos,
        mockConfig,
        'google',
        'auth-code',
        encoded,
        'http://localhost:3000/callback',
      );

      expect(result.isLinking).toBe(false);
      expect(result.auth).toBeDefined();
      expect(result.auth?.isNewUser).toBe(false);
      expect(result.auth?.user.id).toBe('user-123');
      expect(mockRepos.oauthConnections.update).toHaveBeenCalledWith(
        'conn-123',
        expect.objectContaining({
          providerEmail: 'user@example.com',
        }),
      );
    });

    test('should create new user for new OAuth login', async () => {
      const mockClient: OAuthProviderClient = {
        provider: 'google',
        getAuthorizationUrl: vi.fn(),
        exchangeCode: vi.fn().mockResolvedValue(mockTokens),
        getUserInfo: vi.fn().mockResolvedValue(mockOAuthUserInfo),
      };

      const { createGoogleProvider } = await import('../providers/index.js');
      vi.mocked(createGoogleProvider).mockReturnValue(mockClient);

      vi.mocked(mockRepos.oauthConnections.findByProviderUserId).mockResolvedValue(null);
      vi.mocked(mockRepos.users.findByEmail).mockResolvedValue(null);

      const newUser = {
        id: 'new-user-123',
        email: 'user@example.com',
        name: 'Test User',
        avatarUrl: null,
        role: 'user' as const,
        passwordHash: 'oauth:google:hash',
        createdAt: new Date(),
        updatedAt: new Date(),
        emailVerified: true,
        emailVerifiedAt: new Date(),
        lockedUntil: null,
        failedLoginAttempts: 0,
        version: 1,
      };

      vi.mocked(mockDb.query).mockResolvedValue([newUser]);

      const state = createOAuthState('google', 'http://localhost:3000/callback', false);
      const encoded = encodeOAuthState(state, mockConfig.cookie.secret);

      const result = await handleOAuthCallback(
        mockDb,
        mockRepos,
        mockConfig,
        'google',
        'auth-code',
        encoded,
        'http://localhost:3000/callback',
      );

      expect(result.isLinking).toBe(false);
      expect(result.auth).toBeDefined();
      expect(result.auth?.isNewUser).toBe(true);
      expect(mockDb.query).toHaveBeenCalled();
    });

    test('should throw error if email already exists without OAuth connection', async () => {
      const mockClient: OAuthProviderClient = {
        provider: 'google',
        getAuthorizationUrl: vi.fn(),
        exchangeCode: vi.fn().mockResolvedValue(mockTokens),
        getUserInfo: vi.fn().mockResolvedValue(mockOAuthUserInfo),
      };

      const { createGoogleProvider } = await import('../providers/index.js');
      vi.mocked(createGoogleProvider).mockReturnValue(mockClient);

      vi.mocked(mockRepos.oauthConnections.findByProviderUserId).mockResolvedValue(null);
      vi.mocked(mockRepos.users.findByEmail).mockResolvedValue({
        id: 'existing-user',
        email: 'user@example.com',
        name: 'Test User',
        avatarUrl: null,
        role: 'user',
        passwordHash: 'hash',
        createdAt: new Date(),
        updatedAt: new Date(),
        emailVerified: true,
        emailVerifiedAt: new Date(),
        lockedUntil: null,
        failedLoginAttempts: 0,
        version: 1,
      });

      const state = createOAuthState('google', 'http://localhost:3000/callback', false);
      const encoded = encodeOAuthState(state, mockConfig.cookie.secret);

      await expect(
        handleOAuthCallback(
          mockDb,
          mockRepos,
          mockConfig,
          'google',
          'auth-code',
          encoded,
          'http://localhost:3000/callback',
        ),
      ).rejects.toThrow('already exists');
    });

    test('should link OAuth account when isLinking is true', async () => {
      const mockClient: OAuthProviderClient = {
        provider: 'google',
        getAuthorizationUrl: vi.fn(),
        exchangeCode: vi.fn().mockResolvedValue(mockTokens),
        getUserInfo: vi.fn().mockResolvedValue(mockOAuthUserInfo),
      };

      const { createGoogleProvider } = await import('../providers/index.js');
      vi.mocked(createGoogleProvider).mockReturnValue(mockClient);

      vi.mocked(mockRepos.users.findById).mockResolvedValue({
        id: 'user-123',
        email: 'user@example.com',
        name: 'Test User',
        avatarUrl: null,
        role: 'user',
        passwordHash: 'hash',
        createdAt: new Date(),
        updatedAt: new Date(),
        emailVerified: true,
        emailVerifiedAt: new Date(),
        lockedUntil: null,
        failedLoginAttempts: 0,
        version: 1,
      });
      vi.mocked(mockRepos.oauthConnections.findByUserIdAndProvider).mockResolvedValue(null);
      vi.mocked(mockRepos.oauthConnections.findByProviderUserId).mockResolvedValue(null);

      const state = createOAuthState('google', 'http://localhost:3000/callback', true, 'user-123');
      const encoded = encodeOAuthState(state, mockConfig.cookie.secret);

      const result = await handleOAuthCallback(
        mockDb,
        mockRepos,
        mockConfig,
        'google',
        'auth-code',
        encoded,
        'http://localhost:3000/callback',
      );

      expect(result.isLinking).toBe(true);
      expect(result.linked).toBe(true);
      expect(result.auth).toBeUndefined();
      expect(mockRepos.oauthConnections.create).toHaveBeenCalled();
    });

    test('should throw error for state mismatch', async () => {
      const state = createOAuthState('google', 'http://localhost:3000/callback', false);
      const encoded = encodeOAuthState(state, mockConfig.cookie.secret);

      await expect(
        handleOAuthCallback(
          mockDb,
          mockRepos,
          mockConfig,
          'github', // Different provider
          'auth-code',
          encoded,
          'http://localhost:3000/callback',
        ),
      ).rejects.toThrow('OAuth state mismatch');
    });
  });

  describe('linkOAuthAccount', () => {
    const mockUserInfo: OAuthUserInfo = {
      id: 'provider-user-123',
      email: 'user@example.com',
      name: 'Test User',
      emailVerified: true,
    };

    const mockTokens: OAuthTokenResponse = {
      accessToken: 'provider-access-token',
      tokenType: 'Bearer',
    };

    test('should link OAuth account to existing user', async () => {
      vi.mocked(mockRepos.users.findById).mockResolvedValue({
        id: 'user-123',
        email: 'user@example.com',
        name: 'Test User',
        avatarUrl: null,
        role: 'user',
        passwordHash: 'hash',
        createdAt: new Date(),
        updatedAt: new Date(),
        emailVerified: true,
        emailVerifiedAt: new Date(),
        lockedUntil: null,
        failedLoginAttempts: 0,
        version: 1,
      });
      vi.mocked(mockRepos.oauthConnections.findByUserIdAndProvider).mockResolvedValue(null);
      vi.mocked(mockRepos.oauthConnections.findByProviderUserId).mockResolvedValue(null);

      await linkOAuthAccount(
        mockDb,
        mockRepos,
        mockConfig,
        'user-123',
        'google',
        mockUserInfo,
        mockTokens,
      );

      expect(mockRepos.oauthConnections.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          provider: 'google',
          providerUserId: 'provider-user-123',
        }),
      );
    });

    test('should throw error if user not found', async () => {
      vi.mocked(mockRepos.users.findById).mockResolvedValue(null);
      vi.mocked(mockRepos.oauthConnections.findByUserIdAndProvider).mockResolvedValue(null);
      vi.mocked(mockRepos.oauthConnections.findByProviderUserId).mockResolvedValue(null);

      await expect(
        linkOAuthAccount(
          mockDb,
          mockRepos,
          mockConfig,
          'nonexistent-user',
          'google',
          mockUserInfo,
          mockTokens,
        ),
      ).rejects.toThrow('User not found');
    });

    test('should throw error if provider already linked to user', async () => {
      vi.mocked(mockRepos.users.findById).mockResolvedValue({
        id: 'user-123',
        email: 'user@example.com',
        name: 'Test User',
        avatarUrl: null,
        role: 'user',
        passwordHash: 'hash',
        createdAt: new Date(),
        updatedAt: new Date(),
        emailVerified: true,
        emailVerifiedAt: new Date(),
        lockedUntil: null,
        failedLoginAttempts: 0,
        version: 1,
      });
      vi.mocked(mockRepos.oauthConnections.findByUserIdAndProvider).mockResolvedValue({
        id: 'conn-123',
        userId: 'user-123',
        provider: 'google',
        providerUserId: 'existing-provider-id',
        providerEmail: 'user@example.com',
        accessToken: 'token',
        refreshToken: null,
        expiresAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(mockRepos.oauthConnections.findByProviderUserId).mockResolvedValue(null);

      await expect(
        linkOAuthAccount(
          mockDb,
          mockRepos,
          mockConfig,
          'user-123',
          'google',
          mockUserInfo,
          mockTokens,
        ),
      ).rejects.toThrow('already linked to your account');
    });

    test('should throw error if provider account linked to another user', async () => {
      vi.mocked(mockRepos.users.findById).mockResolvedValue({
        id: 'user-123',
        email: 'user@example.com',
        name: 'Test User',
        avatarUrl: null,
        role: 'user',
        passwordHash: 'hash',
        createdAt: new Date(),
        updatedAt: new Date(),
        emailVerified: true,
        emailVerifiedAt: new Date(),
        lockedUntil: null,
        failedLoginAttempts: 0,
        version: 1,
      });
      vi.mocked(mockRepos.oauthConnections.findByUserIdAndProvider).mockResolvedValue(null);
      vi.mocked(mockRepos.oauthConnections.findByProviderUserId).mockResolvedValue({
        id: 'conn-456',
        userId: 'other-user-123',
        provider: 'google',
        providerUserId: 'provider-user-123',
        providerEmail: 'other@example.com',
        accessToken: 'token',
        refreshToken: null,
        expiresAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        linkOAuthAccount(
          mockDb,
          mockRepos,
          mockConfig,
          'user-123',
          'google',
          mockUserInfo,
          mockTokens,
        ),
      ).rejects.toThrow('already linked to another user');
    });
  });

  describe('unlinkOAuthAccount', () => {
    test('should unlink OAuth account from user', async () => {
      const connection = {
        id: 'conn-123',
        userId: 'user-123',
        provider: 'google' as const,
        providerUserId: 'provider-user-123',
        providerEmail: 'user@example.com',
        accessToken: 'token',
        refreshToken: null,
        expiresAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const user = {
        id: 'user-123',
        email: 'user@example.com',
        name: 'Test User',
        avatarUrl: null,
        role: 'user' as const,
        passwordHash: 'regular-hash', // Not oauth:*
        createdAt: new Date(),
        updatedAt: new Date(),
        emailVerified: true,
        emailVerifiedAt: new Date(),
        lockedUntil: null,
        failedLoginAttempts: 0,
        version: 1,
      };

      vi.mocked(mockRepos.oauthConnections.findByUserIdAndProvider).mockResolvedValue(connection);
      vi.mocked(mockRepos.users.findById).mockResolvedValue(user);
      vi.mocked(mockRepos.oauthConnections.findByUserId).mockResolvedValue([
        connection,
        {
          id: 'conn-456',
          userId: 'user-123',
          provider: 'github',
          providerUserId: 'github-123',
          providerEmail: 'user@example.com',
          accessToken: 'token',
          refreshToken: null,
          expiresAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      await unlinkOAuthAccount(mockDb, mockRepos, 'user-123', 'google');

      expect(mockRepos.oauthConnections.deleteByUserIdAndProvider).toHaveBeenCalledWith(
        'user-123',
        'google',
      );
    });

    test('should throw error if connection not found', async () => {
      vi.mocked(mockRepos.oauthConnections.findByUserIdAndProvider).mockResolvedValue(null);
      vi.mocked(mockRepos.users.findById).mockResolvedValue({
        id: 'user-123',
        email: 'user@example.com',
        name: 'Test User',
        avatarUrl: null,
        role: 'user',
        passwordHash: 'hash',
        createdAt: new Date(),
        updatedAt: new Date(),
        emailVerified: true,
        emailVerifiedAt: new Date(),
        lockedUntil: null,
        failedLoginAttempts: 0,
        version: 1,
      });
      vi.mocked(mockRepos.oauthConnections.findByUserId).mockResolvedValue([]);

      await expect(unlinkOAuthAccount(mockDb, mockRepos, 'user-123', 'google')).rejects.toThrow(
        'not linked to your account',
      );
    });

    test('should throw error if user not found', async () => {
      vi.mocked(mockRepos.oauthConnections.findByUserIdAndProvider).mockResolvedValue({
        id: 'conn-123',
        userId: 'user-123',
        provider: 'google',
        providerUserId: 'provider-user-123',
        providerEmail: 'user@example.com',
        accessToken: 'token',
        refreshToken: null,
        expiresAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(mockRepos.users.findById).mockResolvedValue(null);
      vi.mocked(mockRepos.oauthConnections.findByUserId).mockResolvedValue([]);

      await expect(unlinkOAuthAccount(mockDb, mockRepos, 'user-123', 'google')).rejects.toThrow(
        'User not found',
      );
    });

    test('should throw error if unlinking only auth method without password', async () => {
      const connection = {
        id: 'conn-123',
        userId: 'user-123',
        provider: 'google' as const,
        providerUserId: 'provider-user-123',
        providerEmail: 'user@example.com',
        accessToken: 'token',
        refreshToken: null,
        expiresAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const user = {
        id: 'user-123',
        email: 'user@example.com',
        name: 'Test User',
        avatarUrl: null,
        role: 'user' as const,
        passwordHash: 'oauth:google:hash', // OAuth-only user
        createdAt: new Date(),
        updatedAt: new Date(),
        emailVerified: true,
        emailVerifiedAt: new Date(),
        lockedUntil: null,
        failedLoginAttempts: 0,
        version: 1,
      };

      vi.mocked(mockRepos.oauthConnections.findByUserIdAndProvider).mockResolvedValue(connection);
      vi.mocked(mockRepos.users.findById).mockResolvedValue(user);
      vi.mocked(mockRepos.oauthConnections.findByUserId).mockResolvedValue([connection]);

      await expect(unlinkOAuthAccount(mockDb, mockRepos, 'user-123', 'google')).rejects.toThrow(
        'Cannot unlink the only authentication method',
      );
    });

    test('should allow unlinking if user has multiple OAuth connections', async () => {
      const connection = {
        id: 'conn-123',
        userId: 'user-123',
        provider: 'google' as const,
        providerUserId: 'provider-user-123',
        providerEmail: 'user@example.com',
        accessToken: 'token',
        refreshToken: null,
        expiresAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const user = {
        id: 'user-123',
        email: 'user@example.com',
        name: 'Test User',
        avatarUrl: null,
        role: 'user' as const,
        passwordHash: 'oauth:google:hash', // OAuth-only user
        createdAt: new Date(),
        updatedAt: new Date(),
        emailVerified: true,
        emailVerifiedAt: new Date(),
        lockedUntil: null,
        failedLoginAttempts: 0,
        version: 1,
      };

      vi.mocked(mockRepos.oauthConnections.findByUserIdAndProvider).mockResolvedValue(connection);
      vi.mocked(mockRepos.users.findById).mockResolvedValue(user);
      vi.mocked(mockRepos.oauthConnections.findByUserId).mockResolvedValue([
        connection,
        {
          id: 'conn-456',
          userId: 'user-123',
          provider: 'github',
          providerUserId: 'github-123',
          providerEmail: 'user@example.com',
          accessToken: 'token',
          refreshToken: null,
          expiresAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      await unlinkOAuthAccount(mockDb, mockRepos, 'user-123', 'google');

      expect(mockRepos.oauthConnections.deleteByUserIdAndProvider).toHaveBeenCalledWith(
        'user-123',
        'google',
      );
    });
  });

  describe('getConnectedProviders', () => {
    test('should return list of connected providers', async () => {
      const connections = [
        {
          id: 'conn-123',
          userId: 'user-123',
          provider: 'google' as const,
          providerUserId: 'google-123',
          providerEmail: 'user@gmail.com',
          accessToken: 'token',
          refreshToken: null,
          expiresAt: null,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date(),
        },
        {
          id: 'conn-456',
          userId: 'user-123',
          provider: 'github' as const,
          providerUserId: 'github-123',
          providerEmail: 'user@github.com',
          accessToken: 'token',
          refreshToken: null,
          expiresAt: null,
          createdAt: new Date('2024-02-01'),
          updatedAt: new Date(),
        },
      ];

      vi.mocked(mockRepos.oauthConnections.findByUserId).mockResolvedValue(connections);

      const result = await getConnectedProviders(mockDb, mockRepos, 'user-123');

      expect(result).toEqual([
        {
          id: 'conn-123',
          provider: 'google',
          providerEmail: 'user@gmail.com',
          connectedAt: new Date('2024-01-01'),
        },
        {
          id: 'conn-456',
          provider: 'github',
          providerEmail: 'user@github.com',
          connectedAt: new Date('2024-02-01'),
        },
      ]);
    });

    test('should return empty array when no connections', async () => {
      vi.mocked(mockRepos.oauthConnections.findByUserId).mockResolvedValue([]);

      const result = await getConnectedProviders(mockDb, mockRepos, 'user-123');

      expect(result).toEqual([]);
    });
  });

  describe('findUserByOAuthProvider', () => {
    test('should find user by OAuth provider and provider user ID', async () => {
      vi.mocked(mockRepos.oauthConnections.findByProviderUserId).mockResolvedValue({
        id: 'conn-123',
        userId: 'user-123',
        provider: 'google',
        providerUserId: 'google-user-123',
        providerEmail: 'user@example.com',
        accessToken: 'token',
        refreshToken: null,
        expiresAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      vi.mocked(mockRepos.users.findById).mockResolvedValue({
        id: 'user-123',
        email: 'user@example.com',
        name: 'Test User',
        avatarUrl: null,
        role: 'user',
        passwordHash: 'hash',
        createdAt: new Date(),
        updatedAt: new Date(),
        emailVerified: true,
        emailVerifiedAt: new Date(),
        lockedUntil: null,
        failedLoginAttempts: 0,
        version: 1,
      });

      const result = await findUserByOAuthProvider(mockDb, mockRepos, 'google', 'google-user-123');

      expect(result).toEqual({
        userId: 'user-123',
        email: 'user@example.com',
      });
    });

    test('should return null when connection not found', async () => {
      vi.mocked(mockRepos.oauthConnections.findByProviderUserId).mockResolvedValue(null);

      const result = await findUserByOAuthProvider(mockDb, mockRepos, 'google', 'nonexistent');

      expect(result).toBeNull();
    });

    test('should return null when user not found', async () => {
      vi.mocked(mockRepos.oauthConnections.findByProviderUserId).mockResolvedValue({
        id: 'conn-123',
        userId: 'user-123',
        provider: 'google',
        providerUserId: 'google-user-123',
        providerEmail: 'user@example.com',
        accessToken: 'token',
        refreshToken: null,
        expiresAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      vi.mocked(mockRepos.users.findById).mockResolvedValue(null);

      const result = await findUserByOAuthProvider(mockDb, mockRepos, 'google', 'google-user-123');

      expect(result).toBeNull();
    });
  });
});
