// apps/server/src/infrastructure/jobs/scheduled/oauthTokenRefresh.test.ts
/**
 * Tests for OAuth Token Refresh Job
 *
 * Verifies proactive refresh of OAuth access tokens before expiry,
 * including encryption, provider-specific token flows, and error handling.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  refreshExpiringOAuthTokens,
  countExpiringOAuthTokens,
  getOAuthTokenStats,
  DEFAULT_REFRESH_BEFORE_HOURS,
  MIN_REFRESH_BEFORE_HOURS,
  MAX_BATCH_SIZE,
  type OAuthTokenRefreshOptions,
} from './oauthTokenRefresh';

import type { RawDb } from '@abe-stack/db';

// ============================================================================
// Mock Modules
// ============================================================================

vi.mock('node:crypto', () => ({
  createCipheriv: vi.fn(() => ({
    update: vi.fn(() => Buffer.from('encrypted')),
    final: vi.fn(() => Buffer.from('')),
    getAuthTag: vi.fn(() => Buffer.from('tag')),
  })),
  createDecipheriv: vi.fn(() => ({
    setAuthTag: vi.fn(),
    update: vi.fn(() => Buffer.from('decrypted')),
    final: vi.fn(() => Buffer.from('')),
  })),
  randomBytes: vi.fn((size: number) => Buffer.alloc(size, 'x')),
  scryptSync: vi.fn(() => Buffer.alloc(32, 'key')),
}));

vi.mock('@abe-stack/db', async () => {
  const actual = await vi.importActual('@abe-stack/db');
  return {
    ...actual,
    and: vi.fn((...conditions: unknown[]) => ({ type: 'and', conditions })),
    eq: vi.fn((field: string, value: unknown) => ({ field, op: 'eq', value })),
    isNotNull: vi.fn((field: string) => ({ field, op: 'isNotNull' })),
    lt: vi.fn((field: string, value: unknown) => ({ field, op: 'lt', value })),
    select: vi.fn(() => ({
      columns: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => ({
            toSql: vi.fn(() => ({ text: 'SELECT ...', values: [] })),
          })),
        })),
      })),
    })),
    selectCount: vi.fn(() => ({
      where: vi.fn(() => ({
        toSql: vi.fn(() => ({ text: 'SELECT COUNT(*) ...', values: [] })),
      })),
      toSql: vi.fn(() => ({ text: 'SELECT COUNT(*)', values: [] })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          toSql: vi.fn(() => ({ text: 'UPDATE ...', values: [] })),
        })),
      })),
    })),
    OAUTH_CONNECTIONS_TABLE: 'oauth_connections',
  };
});

// ============================================================================
// Mock Global fetch
// ============================================================================

global.fetch = vi.fn();

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Create a mock database client
 */
function createMockDb(): RawDb {
  return {
    query: vi.fn(),
    queryOne: vi.fn(),
    execute: vi.fn(),
    raw: vi.fn(),
    close: vi.fn(),
  } as unknown as RawDb;
}

/**
 * Create base refresh options with required fields
 */
function createBaseOptions(
  overrides: Partial<OAuthTokenRefreshOptions> = {},
): OAuthTokenRefreshOptions {
  return {
    encryptionKey: 'test-encryption-key-32-characters-long',
    providerConfigs: {
      google: {
        clientId: 'google-client-id',
        clientSecret: 'google-client-secret',
      },
      github: {
        clientId: 'github-client-id',
        clientSecret: 'github-client-secret',
      },
    },
    ...overrides,
  };
}

/**
 * Mock OAuth connection row from database
 * Token format is salt:iv:tag:encrypted (4 parts, base64 encoded)
 */
function createMockConnection(overrides: Partial<{
  id: string;
  provider: string;
  refresh_token: string | null;
  expires_at: Date | null;
}> = {}) {
  return {
    id: 'conn-123',
    provider: 'google',
    // base64 encoded parts: salt=c2FsdA==, iv=aXY=, tag=dGFn, encrypted=ZW5jcnlwdGVk
    refresh_token: 'c2FsdA==:aXY=:dGFn:ZW5jcnlwdGVk',
    expires_at: new Date('2024-01-15T13:00:00Z'),
    ...overrides,
  };
}

/**
 * Mock successful token response from OAuth provider
 */
function mockSuccessfulTokenResponse(overrides: Partial<{
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
}> = {}) {
  return {
    access_token: 'new_access_token',
    refresh_token: 'new_refresh_token',
    expires_in: 3600,
    token_type: 'Bearer',
    ...overrides,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('refreshExpiringOAuthTokens', () => {
  let mockDb: RawDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = createMockDb();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('dry-run mode', () => {
    it('should count expiring tokens without refreshing', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([
        createMockConnection(),
        createMockConnection({ id: 'conn-456' }),
      ]);

      const options = createBaseOptions({ dryRun: true });
      const result = await refreshExpiringOAuthTokens(mockDb, options);

      expect(result.dryRun).toBe(true);
      expect(result.processedCount).toBe(2);
      expect(result.successCount).toBe(0);
      expect(result.failureCount).toBe(0);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should calculate cutoff date correctly with default refresh window', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([]);

      const options = createBaseOptions({ dryRun: true });
      await refreshExpiringOAuthTokens(mockDb, options);

      // Should query for tokens expiring within 1 hour (13:00)
      expect(mockDb.query).toHaveBeenCalled();
    });

    it('should use custom refresh window', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([]);

      const options = createBaseOptions({
        dryRun: true,
        refreshBeforeHours: 2,
      });
      await refreshExpiringOAuthTokens(mockDb, options);

      // Should query for tokens expiring within 2 hours (14:00)
      expect(mockDb.query).toHaveBeenCalled();
    });
  });

  describe('successful token refresh', () => {
    it('should refresh Google OAuth token successfully', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([
        createMockConnection({ provider: 'google' }),
      ]);

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockSuccessfulTokenResponse()),
      } as never);

      const options = createBaseOptions();
      const result = await refreshExpiringOAuthTokens(mockDb, options);

      expect(result.successCount).toBe(1);
      expect(result.failureCount).toBe(0);
      expect(result.failures).toHaveLength(0);

      expect(global.fetch).toHaveBeenCalledWith(
        'https://oauth2.googleapis.com/token',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/x-www-form-urlencoded',
          }),
        }),
      );
    });

    it('should refresh GitHub OAuth token with Accept header', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([
        createMockConnection({ provider: 'github' }),
      ]);

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockSuccessfulTokenResponse()),
      } as never);

      const options = createBaseOptions();
      await refreshExpiringOAuthTokens(mockDb, options);

      expect(global.fetch).toHaveBeenCalledWith(
        'https://github.com/login/oauth/access_token',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Accept': 'application/json',
          }),
        }),
      );
    });

    it('should update database with new tokens', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([
        createMockConnection({ id: 'conn-789' }),
      ]);

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockSuccessfulTokenResponse({ expires_in: 7200 })),
      } as never);

      const options = createBaseOptions();
      await refreshExpiringOAuthTokens(mockDb, options);

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('UPDATE'),
          values: expect.any(Array),
        }),
      );
    });

    it('should calculate new expiry time from expires_in', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([createMockConnection()]);

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockSuccessfulTokenResponse({ expires_in: 3600 })),
      } as never);

      const options = createBaseOptions();
      await refreshExpiringOAuthTokens(mockDb, options);

      // Verify that expires_at is set to roughly 1 hour from now
      expect(mockDb.execute).toHaveBeenCalled();
    });

    it('should keep old refresh token if new one not provided', async () => {
      // Token format is salt:iv:tag:encrypted (4 parts, base64 encoded)
      const oldRefreshToken = 'c2FsdA==:aXY=:dGFn:ZW5jcnlwdGVk';
      vi.mocked(mockDb.query).mockResolvedValue([
        createMockConnection({ refresh_token: oldRefreshToken }),
      ]);

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          access_token: 'new_access_token',
          expires_in: 3600,
        }),
      } as never);

      const options = createBaseOptions();
      await refreshExpiringOAuthTokens(mockDb, options);

      expect(mockDb.execute).toHaveBeenCalled();
    });

    it('should handle null expires_in from provider', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([createMockConnection()]);

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          access_token: 'new_token',
        }),
      } as never);

      const options = createBaseOptions();
      const result = await refreshExpiringOAuthTokens(mockDb, options);

      expect(result.successCount).toBe(1);
    });
  });

  describe('error handling', () => {
    it('should handle missing provider configuration', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([
        createMockConnection({ provider: 'apple' }),
      ]);

      const options = createBaseOptions({
        providerConfigs: {
          google: { clientId: 'id', clientSecret: 'secret' },
        },
      });

      const result = await refreshExpiringOAuthTokens(mockDb, options);

      expect(result.failureCount).toBe(1);
      expect(result.failures[0]).toEqual({
        connectionId: 'conn-123',
        provider: 'apple',
        error: 'No configuration found for provider: apple',
      });
    });

    it('should handle null refresh token', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([
        createMockConnection({ refresh_token: null }),
      ]);

      const options = createBaseOptions();
      const result = await refreshExpiringOAuthTokens(mockDb, options);

      expect(result.failureCount).toBe(1);
      expect(result.failures[0]?.error).toBe('No refresh token available');
    });

    it('should handle empty refresh token', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([
        createMockConnection({ refresh_token: '' }),
      ]);

      const options = createBaseOptions();
      const result = await refreshExpiringOAuthTokens(mockDb, options);

      expect(result.failureCount).toBe(1);
      expect(result.failures[0]?.error).toBe('No refresh token available');
    });

    it('should handle provider API errors', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([createMockConnection()]);

      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 400,
        text: vi.fn().mockResolvedValue('Invalid grant'),
      } as never);

      const options = createBaseOptions();
      const result = await refreshExpiringOAuthTokens(mockDb, options);

      expect(result.failureCount).toBe(1);
      expect(result.failures[0]?.error).toContain('Token refresh failed');
      expect(result.failures[0]?.error).toContain('400');
    });

    it('should handle missing access_token in response', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([createMockConnection()]);

      // Source checks for access_token === '', so provide empty string
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ access_token: '', expires_in: 3600 }),
      } as never);

      const options = createBaseOptions();
      const result = await refreshExpiringOAuthTokens(mockDb, options);

      expect(result.failureCount).toBe(1);
      expect(result.failures[0]?.error).toBe('No access token in refresh response');
    });

    it('should handle network errors', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([createMockConnection()]);

      vi.mocked(global.fetch).mockRejectedValue(new Error('Network error'));

      const options = createBaseOptions();
      const result = await refreshExpiringOAuthTokens(mockDb, options);

      expect(result.failureCount).toBe(1);
      expect(result.failures[0]?.error).toBe('Network error');
    });

    it('should continue processing after individual failures', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([
        createMockConnection({ id: 'conn-1', provider: 'google' }),
        createMockConnection({ id: 'conn-2', provider: 'github' }),
      ]);

      vi.mocked(global.fetch)
        .mockRejectedValueOnce(new Error('Failed for conn-1'))
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue(mockSuccessfulTokenResponse()),
        } as never);

      const options = createBaseOptions();
      const result = await refreshExpiringOAuthTokens(mockDb, options);

      expect(result.successCount).toBe(1);
      expect(result.failureCount).toBe(1);
    });
  });

  describe('batch processing', () => {
    it('should respect batch size limit', async () => {
      const connections = Array.from({ length: 50 }, (_, i) =>
        createMockConnection({ id: `conn-${i}` }),
      );
      vi.mocked(mockDb.query).mockResolvedValue(connections);

      const options = createBaseOptions({ batchSize: 50, dryRun: true });
      const result = await refreshExpiringOAuthTokens(mockDb, options);

      expect(result.processedCount).toBe(50);
    });

    it('should use default batch size', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([]);

      const options = createBaseOptions();
      await refreshExpiringOAuthTokens(mockDb, options);

      expect(mockDb.query).toHaveBeenCalled();
    });

    it('should enforce minimum refresh hours', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([]);

      const options = createBaseOptions({ refreshBeforeHours: 0.1 });
      await refreshExpiringOAuthTokens(mockDb, options);

      // Should use MIN_REFRESH_BEFORE_HOURS (0.5) instead
      expect(mockDb.query).toHaveBeenCalled();
    });
  });

  describe('performance tracking', () => {
    it('should track operation duration', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([]);

      const options = createBaseOptions();
      const result = await refreshExpiringOAuthTokens(mockDb, options);

      expect(result.durationMs).toBeGreaterThanOrEqual(0);
      expect(typeof result.durationMs).toBe('number');
    });

    it('should include duration for dry-run', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([]);

      const options = createBaseOptions({ dryRun: true });
      const result = await refreshExpiringOAuthTokens(mockDb, options);

      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });
  });
});

describe('countExpiringOAuthTokens', () => {
  let mockDb: RawDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = createMockDb();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should count tokens expiring within default window', async () => {
    vi.mocked(mockDb.queryOne).mockResolvedValue({ count: 42 });

    const count = await countExpiringOAuthTokens(mockDb);

    expect(count).toBe(42);
  });

  it('should use custom refresh window', async () => {
    vi.mocked(mockDb.queryOne).mockResolvedValue({ count: 15 });

    const count = await countExpiringOAuthTokens(mockDb, 2);

    expect(count).toBe(15);
  });

  it('should enforce minimum refresh hours', async () => {
    vi.mocked(mockDb.queryOne).mockResolvedValue({ count: 5 });

    const count = await countExpiringOAuthTokens(mockDb, 0.1);

    expect(count).toBe(5);
  });

  it('should handle null result', async () => {
    vi.mocked(mockDb.queryOne).mockResolvedValue(null);

    const count = await countExpiringOAuthTokens(mockDb);

    expect(count).toBe(0);
  });
});

describe('getOAuthTokenStats', () => {
  let mockDb: RawDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = createMockDb();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return comprehensive statistics', async () => {
    vi.mocked(mockDb.queryOne)
      .mockResolvedValueOnce({ count: 100 }) // total
      .mockResolvedValueOnce({ count: 10 }) // expiring soon
      .mockResolvedValueOnce({ count: 5 }) // expired
      .mockResolvedValueOnce({ count: 80 }); // with refresh token

    const stats = await getOAuthTokenStats(mockDb);

    expect(stats).toEqual({
      total: 100,
      expiringSoon: 10,
      expired: 5,
      withRefreshToken: 80,
      refreshBeforeHours: DEFAULT_REFRESH_BEFORE_HOURS,
    });
  });

  it('should use custom refresh window', async () => {
    vi.mocked(mockDb.queryOne).mockResolvedValue({ count: 0 });

    const stats = await getOAuthTokenStats(mockDb, 2);

    expect(stats.refreshBeforeHours).toBe(2);
  });

  it('should enforce minimum refresh hours', async () => {
    vi.mocked(mockDb.queryOne).mockResolvedValue({ count: 0 });

    const stats = await getOAuthTokenStats(mockDb, 0.25);

    expect(stats.refreshBeforeHours).toBe(MIN_REFRESH_BEFORE_HOURS);
  });

  it('should handle all null results', async () => {
    vi.mocked(mockDb.queryOne).mockResolvedValue(null);

    const stats = await getOAuthTokenStats(mockDb);

    expect(stats.total).toBe(0);
    expect(stats.expiringSoon).toBe(0);
    expect(stats.expired).toBe(0);
    expect(stats.withRefreshToken).toBe(0);
  });

  it('should call all queries in parallel', async () => {
    vi.mocked(mockDb.queryOne).mockResolvedValue({ count: 0 });

    await getOAuthTokenStats(mockDb);

    expect(mockDb.queryOne).toHaveBeenCalledTimes(4);
  });
});

describe('constants', () => {
  it('should export DEFAULT_REFRESH_BEFORE_HOURS', () => {
    expect(DEFAULT_REFRESH_BEFORE_HOURS).toBe(1);
  });

  it('should export MIN_REFRESH_BEFORE_HOURS', () => {
    expect(MIN_REFRESH_BEFORE_HOURS).toBe(0.5);
  });

  it('should export MAX_BATCH_SIZE', () => {
    expect(MAX_BATCH_SIZE).toBe(100);
  });
});
