// main/server/system/src/session/redis-session-store.test.ts
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { RedisSessionStore, createRedisSessionStore } from './redis-session-store';

import type { SessionData } from './redis-session-store';

// ============================================================================
// Mock ioredis
// ============================================================================

const mockRedisInstance = {
  get: vi.fn(),
  set: vi.fn(),
  psetex: vi.fn(),
  del: vi.fn(),
  pexpire: vi.fn(),
  persist: vi.fn(),
  exists: vi.fn(),
  quit: vi.fn(),
  connect: vi.fn().mockResolvedValue(undefined),
  on: vi.fn(),
};

vi.mock('ioredis', () => {
  // Use a real function so `new` works without vitest warnings
  function MockRedis() {
    return mockRedisInstance;
  }
  return { default: MockRedis };
});

// ============================================================================
// RedisSessionStore Tests
// ============================================================================

describe('RedisSessionStore', () => {
  let store: RedisSessionStore;

  const sampleSession: SessionData = {
    userId: 'user-123',
    createdAt: '2025-01-01T00:00:00.000Z',
    lastAccessedAt: '2025-01-01T01:00:00.000Z',
    role: 'admin',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockRedisInstance.connect.mockResolvedValue(undefined);
    store = new RedisSessionStore({
      host: 'localhost',
      port: 6379,
      keyPrefix: 'sess',
      defaultTtlMs: 3600000, // 1 hour
    });
  });

  // --------------------------------------------------------------------------
  // get
  // --------------------------------------------------------------------------

  describe('get', () => {
    test('should return session data when found', async () => {
      mockRedisInstance.get.mockResolvedValue(JSON.stringify(sampleSession));

      const result = await store.get('abc123');

      expect(mockRedisInstance.get).toHaveBeenCalledWith('sess:abc123');
      expect(result).toEqual(sampleSession);
    });

    test('should return null when session not found', async () => {
      mockRedisInstance.get.mockResolvedValue(null);

      const result = await store.get('non-existent');

      expect(result).toBeNull();
    });

    test('should return null and log error on Redis failure', async () => {
      const logSpy = vi.fn();
      const loggerStore = new RedisSessionStore({
        client: mockRedisInstance as never,
        logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: logSpy },
      });

      mockRedisInstance.get.mockRejectedValue(new Error('Connection refused'));

      const result = await loggerStore.get('abc123');

      expect(result).toBeNull();
      expect(logSpy).toHaveBeenCalledWith(
        'Failed to get session',
        expect.objectContaining({
          sessionId: 'abc123',
          error: 'Connection refused',
        }),
      );
    });

    test('should use correct key prefix', async () => {
      mockRedisInstance.get.mockResolvedValue(null);

      await store.get('my-session-id');

      expect(mockRedisInstance.get).toHaveBeenCalledWith('sess:my-session-id');
    });

    test('should use default key prefix when none specified', async () => {
      const defaultStore = new RedisSessionStore({ client: mockRedisInstance as never });
      mockRedisInstance.get.mockResolvedValue(null);

      await defaultStore.get('test-id');

      expect(mockRedisInstance.get).toHaveBeenCalledWith('session:test-id');
    });
  });

  // --------------------------------------------------------------------------
  // set
  // --------------------------------------------------------------------------

  describe('set', () => {
    test('should store session data with default TTL', async () => {
      mockRedisInstance.psetex.mockResolvedValue('OK');

      await store.set('abc123', sampleSession);

      expect(mockRedisInstance.psetex).toHaveBeenCalledWith(
        'sess:abc123',
        3600000,
        JSON.stringify(sampleSession),
      );
    });

    test('should store session data with custom TTL', async () => {
      mockRedisInstance.psetex.mockResolvedValue('OK');

      await store.set('abc123', sampleSession, 7200000);

      expect(mockRedisInstance.psetex).toHaveBeenCalledWith(
        'sess:abc123',
        7200000,
        JSON.stringify(sampleSession),
      );
    });

    test('should store session without expiry when TTL is 0', async () => {
      const noTtlStore = new RedisSessionStore({
        client: mockRedisInstance as never,
        defaultTtlMs: 0,
      });
      mockRedisInstance.set.mockResolvedValue('OK');

      await noTtlStore.set('abc123', sampleSession);

      expect(mockRedisInstance.set).toHaveBeenCalledWith(
        'session:abc123',
        JSON.stringify(sampleSession),
      );
      expect(mockRedisInstance.psetex).not.toHaveBeenCalled();
    });

    test('should throw and log error on Redis failure', async () => {
      const logSpy = vi.fn();
      const loggerStore = new RedisSessionStore({
        client: mockRedisInstance as never,
        logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: logSpy },
      });

      mockRedisInstance.psetex.mockRejectedValue(new Error('Write failed'));

      await expect(loggerStore.set('abc123', sampleSession)).rejects.toThrow('Write failed');

      expect(logSpy).toHaveBeenCalledWith(
        'Failed to set session',
        expect.objectContaining({
          sessionId: 'abc123',
          error: 'Write failed',
        }),
      );
    });

    test('should serialize complex session data', async () => {
      mockRedisInstance.psetex.mockResolvedValue('OK');

      const complexSession: SessionData = {
        userId: 'user-456',
        createdAt: '2025-06-01T00:00:00.000Z',
        lastAccessedAt: '2025-06-01T12:00:00.000Z',
        preferences: { theme: 'dark', language: 'en' },
        csrfToken: 'token-abc',
      };

      await store.set('complex-session', complexSession);

      expect(mockRedisInstance.psetex).toHaveBeenCalledWith(
        'sess:complex-session',
        3600000,
        JSON.stringify(complexSession),
      );
    });
  });

  // --------------------------------------------------------------------------
  // delete
  // --------------------------------------------------------------------------

  describe('delete', () => {
    test('should return true when session was deleted', async () => {
      mockRedisInstance.del.mockResolvedValue(1);

      const result = await store.delete('abc123');

      expect(mockRedisInstance.del).toHaveBeenCalledWith('sess:abc123');
      expect(result).toBe(true);
    });

    test('should return false when session did not exist', async () => {
      mockRedisInstance.del.mockResolvedValue(0);

      const result = await store.delete('non-existent');

      expect(result).toBe(false);
    });

    test('should return false and log error on Redis failure', async () => {
      const logSpy = vi.fn();
      const loggerStore = new RedisSessionStore({
        client: mockRedisInstance as never,
        logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: logSpy },
      });

      mockRedisInstance.del.mockRejectedValue(new Error('Delete failed'));

      const result = await loggerStore.delete('abc123');

      expect(result).toBe(false);
      expect(logSpy).toHaveBeenCalledWith(
        'Failed to delete session',
        expect.objectContaining({
          sessionId: 'abc123',
        }),
      );
    });
  });

  // --------------------------------------------------------------------------
  // touch
  // --------------------------------------------------------------------------

  describe('touch', () => {
    test('should refresh TTL with default value', async () => {
      mockRedisInstance.pexpire.mockResolvedValue(1);

      const result = await store.touch('abc123');

      expect(mockRedisInstance.pexpire).toHaveBeenCalledWith('sess:abc123', 3600000);
      expect(result).toBe(true);
    });

    test('should refresh TTL with custom value', async () => {
      mockRedisInstance.pexpire.mockResolvedValue(1);

      const result = await store.touch('abc123', 7200000);

      expect(mockRedisInstance.pexpire).toHaveBeenCalledWith('sess:abc123', 7200000);
      expect(result).toBe(true);
    });

    test('should return false when session does not exist', async () => {
      mockRedisInstance.pexpire.mockResolvedValue(0);

      const result = await store.touch('non-existent');

      expect(result).toBe(false);
    });

    test('should persist key when TTL is 0', async () => {
      mockRedisInstance.persist.mockResolvedValue(1);

      const result = await store.touch('abc123', 0);

      expect(mockRedisInstance.persist).toHaveBeenCalledWith('sess:abc123');
      expect(result).toBe(true);
    });

    test('should return false and log error on Redis failure', async () => {
      const logSpy = vi.fn();
      const loggerStore = new RedisSessionStore({
        client: mockRedisInstance as never,
        logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: logSpy },
      });

      mockRedisInstance.pexpire.mockRejectedValue(new Error('Touch failed'));

      const result = await loggerStore.touch('abc123');

      expect(result).toBe(false);
      expect(logSpy).toHaveBeenCalledWith(
        'Failed to touch session',
        expect.objectContaining({
          sessionId: 'abc123',
        }),
      );
    });
  });

  // --------------------------------------------------------------------------
  // exists
  // --------------------------------------------------------------------------

  describe('exists', () => {
    test('should return true when session exists', async () => {
      mockRedisInstance.exists.mockResolvedValue(1);

      const result = await store.exists('abc123');

      expect(mockRedisInstance.exists).toHaveBeenCalledWith('sess:abc123');
      expect(result).toBe(true);
    });

    test('should return false when session does not exist', async () => {
      mockRedisInstance.exists.mockResolvedValue(0);

      const result = await store.exists('non-existent');

      expect(result).toBe(false);
    });

    test('should return false and log error on Redis failure', async () => {
      const logSpy = vi.fn();
      const loggerStore = new RedisSessionStore({
        client: mockRedisInstance as never,
        logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: logSpy },
      });

      mockRedisInstance.exists.mockRejectedValue(new Error('Exists failed'));

      const result = await loggerStore.exists('abc123');

      expect(result).toBe(false);
      expect(logSpy).toHaveBeenCalledWith(
        'Failed to check session existence',
        expect.objectContaining({
          sessionId: 'abc123',
        }),
      );
    });
  });

  // --------------------------------------------------------------------------
  // close
  // --------------------------------------------------------------------------

  describe('close', () => {
    test('should quit the Redis client when it owns the client', async () => {
      mockRedisInstance.quit.mockResolvedValue('OK');

      await store.close();

      expect(mockRedisInstance.quit).toHaveBeenCalled();
    });

    test('should not quit a shared Redis client', async () => {
      const sharedStore = new RedisSessionStore({ client: mockRedisInstance as never });

      await sharedStore.close();

      expect(mockRedisInstance.quit).not.toHaveBeenCalled();
    });

    test('should be idempotent (no-op on second close)', async () => {
      mockRedisInstance.quit.mockResolvedValue('OK');

      await store.close();
      await store.close();

      expect(mockRedisInstance.quit).toHaveBeenCalledTimes(1);
    });
  });

  // --------------------------------------------------------------------------
  // Key prefixing
  // --------------------------------------------------------------------------

  describe('key prefixing', () => {
    test('should prefix keys with configured prefix', async () => {
      mockRedisInstance.get.mockResolvedValue(null);

      await store.get('test-id');

      expect(mockRedisInstance.get).toHaveBeenCalledWith('sess:test-id');
    });

    test('should use default "session" prefix when not configured', async () => {
      const defaultStore = new RedisSessionStore({ client: mockRedisInstance as never });
      mockRedisInstance.get.mockResolvedValue(null);

      await defaultStore.get('test-id');

      expect(mockRedisInstance.get).toHaveBeenCalledWith('session:test-id');
    });

    test('should apply prefix consistently across all operations', async () => {
      mockRedisInstance.get.mockResolvedValue(null);
      mockRedisInstance.psetex.mockResolvedValue('OK');
      mockRedisInstance.del.mockResolvedValue(1);
      mockRedisInstance.pexpire.mockResolvedValue(1);
      mockRedisInstance.exists.mockResolvedValue(1);

      const sessionId = 'consistency-test';
      const expectedKey = `sess:${sessionId}`;

      await store.get(sessionId);
      await store.set(sessionId, sampleSession);
      await store.delete(sessionId);
      await store.touch(sessionId);
      await store.exists(sessionId);

      expect(mockRedisInstance.get).toHaveBeenCalledWith(expectedKey);
      expect(mockRedisInstance.psetex).toHaveBeenCalledWith(
        expectedKey,
        expect.any(Number),
        expect.any(String),
      );
      expect(mockRedisInstance.del).toHaveBeenCalledWith(expectedKey);
      expect(mockRedisInstance.pexpire).toHaveBeenCalledWith(expectedKey, expect.any(Number));
      expect(mockRedisInstance.exists).toHaveBeenCalledWith(expectedKey);
    });
  });

  // --------------------------------------------------------------------------
  // Factory function
  // --------------------------------------------------------------------------

  describe('createRedisSessionStore', () => {
    test('should create a RedisSessionStore instance', () => {
      const factoryStore = createRedisSessionStore({ client: mockRedisInstance as never });

      expect(factoryStore).toBeInstanceOf(RedisSessionStore);
    });

    test('should accept empty options', () => {
      const factoryStore = createRedisSessionStore();

      expect(factoryStore).toBeInstanceOf(RedisSessionStore);
    });
  });

  // --------------------------------------------------------------------------
  // Constructor options
  // --------------------------------------------------------------------------

  describe('constructor', () => {
    test('should accept an existing Redis client', () => {
      const sharedStore = new RedisSessionStore({ client: mockRedisInstance as never });

      expect(sharedStore.getClient()).toBe(mockRedisInstance);
    });

    test('should create a new client when none provided', () => {
      // The store created in beforeEach does this
      expect(store.getClient()).toBeDefined();
    });
  });
});
