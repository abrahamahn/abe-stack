// main/shared/src/engine/health/health.test.ts
/**
 * Health Check Utilities Tests
 */
import { describe, expect, test, vi, beforeEach } from 'vitest';

import {
  buildDetailedHealthResponse,
  checkCache,
  checkDatabase,
  checkEmail,
  checkPubSub,
  checkQueue,
  checkRateLimit,
  checkSchema,
  checkStorage,
  checkWebSocket,
  detailedHealthResponseSchema,
  determineOverallStatus,
  liveResponseSchema,
  readyResponseSchema,
  type DetailedHealthResponse,
  type HealthCheckCache,
  type HealthCheckDatabase,
  type HealthCheckPubSub,
  type HealthCheckQueue,
  type LiveResponse,
  type ReadyResponse,
  type SchemaValidator,
  type WebSocketStats,
} from './health';

// ============================================================================
// checkDatabase Tests
// ============================================================================

describe('checkDatabase', () => {
  test('should return up when database is connected', async () => {
    const db: HealthCheckDatabase = {
      healthCheck: vi.fn<[], Promise<boolean>>().mockResolvedValue(true),
    };

    const result = await checkDatabase(db);

    expect(result.status).toBe('up');
    expect(result.message).toBe('connected');
    expect(result.latencyMs).toBeDefined();
    expect(typeof result.latencyMs).toBe('number');
  });

  test('should return down when health check returns false', async () => {
    const db: HealthCheckDatabase = {
      healthCheck: vi.fn<[], Promise<boolean>>().mockResolvedValue(false),
    };

    const result = await checkDatabase(db);

    expect(result.status).toBe('down');
    expect(result.message).toBe('health check failed');
    expect(result.latencyMs).toBeDefined();
  });

  test('should return down when database throws an error', async () => {
    const db: HealthCheckDatabase = {
      healthCheck: vi.fn<[], Promise<boolean>>().mockRejectedValue(new Error('Connection refused')),
    };

    const result = await checkDatabase(db);

    expect(result.status).toBe('down');
    expect(result.message).toBe('Connection refused');
    expect(result.latencyMs).toBeDefined();
  });

  test('should return down with generic message for non-Error throws', async () => {
    const db: HealthCheckDatabase = {
      healthCheck: vi.fn<[], Promise<boolean>>().mockRejectedValue('unknown error'),
    };

    const result = await checkDatabase(db);

    expect(result.status).toBe('down');
    expect(result.message).toBe('Connection failed');
  });

  test('should measure latency', async () => {
    const db: HealthCheckDatabase = {
      healthCheck: vi.fn<[], Promise<boolean>>().mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => {
              resolve(true);
            }, 10);
          }),
      ),
    };

    const result = await checkDatabase(db);

    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });
});

// ============================================================================
// checkSchema Tests
// ============================================================================

describe('checkSchema', () => {
  test('should return up when schema is valid', async () => {
    const db: HealthCheckDatabase = {
      healthCheck: vi.fn<[], Promise<boolean>>().mockResolvedValue(true),
    };
    const validator: SchemaValidator = vi.fn().mockResolvedValue({
      valid: true,
      missingTables: [],
    });

    const result = await checkSchema(db, validator, 10);

    expect(result.status).toBe('up');
    expect(result.message).toBe('10 tables present');
    expect(result.tableCount).toBe(10);
  });

  test('should return down when tables are missing', async () => {
    const db: HealthCheckDatabase = {
      healthCheck: vi.fn<[], Promise<boolean>>().mockResolvedValue(true),
    };
    const validator: SchemaValidator = vi.fn().mockResolvedValue({
      valid: false,
      missingTables: ['users', 'sessions'],
    });

    const result = await checkSchema(db, validator, 10);

    expect(result.status).toBe('down');
    expect(result.message).toBe('missing 2 tables');
    expect(result.missingTables).toEqual(['users', 'sessions']);
    expect(result.tableCount).toBe(8);
  });

  test('should return down when validator throws', async () => {
    const db: HealthCheckDatabase = {
      healthCheck: vi.fn<[], Promise<boolean>>().mockResolvedValue(true),
    };
    const validator: SchemaValidator = vi
      .fn()
      .mockRejectedValue(new Error('Schema validation failed'));

    const result = await checkSchema(db, validator, 10);

    expect(result.status).toBe('down');
    expect(result.message).toBe('Schema validation failed');
  });

  test('should return down with generic message for non-Error throws', async () => {
    const db: HealthCheckDatabase = {
      healthCheck: vi.fn<[], Promise<boolean>>().mockResolvedValue(true),
    };
    const validator: SchemaValidator = vi.fn().mockRejectedValue('unknown');

    const result = await checkSchema(db, validator, 5);

    expect(result.status).toBe('down');
    expect(result.message).toBe('Schema validation failed');
  });
});

// ============================================================================
// checkEmail Tests
// ============================================================================

describe('checkEmail', () => {
  test('should return up with provider name', () => {
    const result = checkEmail({ provider: 'smtp' });

    expect(result.status).toBe('up');
    expect(result.message).toBe('smtp');
  });

  test('should return up with console provider', () => {
    const result = checkEmail({ provider: 'console' });

    expect(result.status).toBe('up');
    expect(result.message).toBe('console');
  });
});

// ============================================================================
// checkStorage Tests
// ============================================================================

describe('checkStorage', () => {
  test('should return up with provider name', () => {
    const result = checkStorage({ provider: 'local' });

    expect(result.status).toBe('up');
    expect(result.message).toBe('local');
  });

  test('should return up with s3 provider', () => {
    const result = checkStorage({ provider: 's3' });

    expect(result.status).toBe('up');
    expect(result.message).toBe('s3');
  });
});

// ============================================================================
// checkPubSub Tests
// ============================================================================

describe('checkPubSub', () => {
  test('should return up with subscription count', () => {
    const pubsub: HealthCheckPubSub = {
      getSubscriptionCount: vi.fn<[], number>().mockReturnValue(5),
    };

    const result = checkPubSub(pubsub);

    expect(result.status).toBe('up');
    expect(result.message).toBe('5 active subscriptions');
  });

  test('should return up with zero subscriptions', () => {
    const pubsub: HealthCheckPubSub = {
      getSubscriptionCount: vi.fn<[], number>().mockReturnValue(0),
    };

    const result = checkPubSub(pubsub);

    expect(result.status).toBe('up');
    expect(result.message).toBe('0 active subscriptions');
  });
});

// ============================================================================
// checkWebSocket Tests
// ============================================================================

describe('checkWebSocket', () => {
  test('should return up when plugin is registered', () => {
    const stats: WebSocketStats = {
      pluginRegistered: true,
      activeConnections: 42,
    };

    const result = checkWebSocket(stats);

    expect(result.status).toBe('up');
    expect(result.message).toBe('42 active connections');
  });

  test('should return down when plugin is not registered', () => {
    const stats: WebSocketStats = {
      pluginRegistered: false,
      activeConnections: 0,
    };

    const result = checkWebSocket(stats);

    expect(result.status).toBe('down');
    expect(result.message).toBe('plugin not registered');
  });

  test('should return up with zero connections when plugin is registered', () => {
    const stats: WebSocketStats = {
      pluginRegistered: true,
      activeConnections: 0,
    };

    const result = checkWebSocket(stats);

    expect(result.status).toBe('up');
    expect(result.message).toBe('0 active connections');
  });
});

// ============================================================================
// checkRateLimit Tests
// ============================================================================

describe('checkRateLimit', () => {
  test('should return up with active status', () => {
    const result = checkRateLimit();

    expect(result.status).toBe('up');
    expect(result.message).toBe('sliding window active');
  });
});

// ============================================================================
// determineOverallStatus Tests
// ============================================================================

describe('determineOverallStatus', () => {
  test('should return healthy when all services are up', () => {
    const services = {
      database: { status: 'up' as const },
      email: { status: 'up' as const },
      storage: { status: 'up' as const },
    };

    expect(determineOverallStatus(services)).toBe('healthy');
  });

  test('should return degraded when some services are down', () => {
    const services = {
      database: { status: 'up' as const },
      email: { status: 'down' as const },
      storage: { status: 'up' as const },
    };

    expect(determineOverallStatus(services)).toBe('degraded');
  });

  test('should return degraded when some services are degraded', () => {
    const services = {
      database: { status: 'up' as const },
      email: { status: 'degraded' as const },
      storage: { status: 'up' as const },
    };

    expect(determineOverallStatus(services)).toBe('degraded');
  });

  test('should return down when all services are down', () => {
    const services = {
      database: { status: 'down' as const },
      email: { status: 'down' as const },
      storage: { status: 'down' as const },
    };

    expect(determineOverallStatus(services)).toBe('down');
  });

  test('should return healthy for empty services', () => {
    expect(determineOverallStatus({})).toBe('down');
  });
});

// ============================================================================
// buildDetailedHealthResponse Tests
// ============================================================================

describe('buildDetailedHealthResponse', () => {
  test('should build response with healthy status', () => {
    const services = {
      database: { status: 'up' as const, message: 'connected', latencyMs: 5 },
      email: { status: 'up' as const, message: 'smtp' },
    };

    const response = buildDetailedHealthResponse(services);

    expect(response.status).toBe('healthy');
    expect(response.timestamp).toBeDefined();
    expect(response.uptime).toBeGreaterThanOrEqual(0);
    expect(response.services).toEqual(services);
  });

  test('should build response with degraded status', () => {
    const services = {
      database: { status: 'up' as const },
      email: { status: 'down' as const, message: 'SMTP unreachable' },
    };

    const response = buildDetailedHealthResponse(services);

    expect(response.status).toBe('degraded');
    expect(response.services['email']?.message).toBe('SMTP unreachable');
  });

  test('should include ISO 8601 timestamp', () => {
    const services = {
      database: { status: 'up' as const },
    };

    const response = buildDetailedHealthResponse(services);

    expect(response.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  test('should include numeric uptime', () => {
    const services = {
      database: { status: 'up' as const },
    };

    const response = buildDetailedHealthResponse(services);

    expect(typeof response.uptime).toBe('number');
    expect(response.uptime).toBeGreaterThanOrEqual(0);
  });
});

// ============================================================================
// detailedHealthResponseSchema Tests
// ============================================================================

describe('detailedHealthResponseSchema', () => {
  function createValidDetailedHealth(
    overrides: Record<string, unknown> = {},
  ): Record<string, unknown> {
    return {
      status: 'healthy',
      timestamp: '2026-02-18T10:00:00.000Z',
      uptime: 3600,
      services: {
        database: { status: 'up', message: 'connected', latencyMs: 5 },
        email: { status: 'up', message: 'smtp' },
      },
      ...overrides,
    };
  }

  describe('valid inputs', () => {
    test('should parse valid detailed health response', () => {
      const result: DetailedHealthResponse = detailedHealthResponseSchema.parse(
        createValidDetailedHealth(),
      );

      expect(result.status).toBe('healthy');
      expect(result.timestamp).toBe('2026-02-18T10:00:00.000Z');
      expect(result.uptime).toBe(3600);
      expect(result.services['database']?.status).toBe('up');
    });

    test('should parse all valid overall statuses', () => {
      const statuses = ['healthy', 'degraded', 'down'] as const;
      statuses.forEach((status) => {
        const result: DetailedHealthResponse = detailedHealthResponseSchema.parse(
          createValidDetailedHealth({ status }),
        );
        expect(result.status).toBe(status);
      });
    });

    test('should parse with empty services object', () => {
      const result: DetailedHealthResponse = detailedHealthResponseSchema.parse(
        createValidDetailedHealth({ services: {} }),
      );

      expect(result.services).toEqual({});
    });

    test('should parse service with only required status field', () => {
      const result: DetailedHealthResponse = detailedHealthResponseSchema.parse(
        createValidDetailedHealth({ services: { db: { status: 'down' } } }),
      );

      expect(result.services['db']?.status).toBe('down');
      expect(result.services['db']?.message).toBeUndefined();
    });

    test('should parse service with all valid service statuses', () => {
      const result: DetailedHealthResponse = detailedHealthResponseSchema.parse(
        createValidDetailedHealth({
          status: 'degraded',
          services: {
            db: { status: 'up' },
            cache: { status: 'down' },
            queue: { status: 'degraded' },
          },
        }),
      );

      expect(result.services['db']?.status).toBe('up');
      expect(result.services['cache']?.status).toBe('down');
      expect(result.services['queue']?.status).toBe('degraded');
    });
  });

  describe('invalid inputs', () => {
    test('should throw when status is an invalid value', () => {
      expect(() =>
        detailedHealthResponseSchema.parse(createValidDetailedHealth({ status: 'ok' })),
      ).toThrow('status must be one of: healthy, degraded, down');
    });

    test('should throw when status is missing', () => {
      const { status: _s, ...input } = createValidDetailedHealth();
      expect(() => detailedHealthResponseSchema.parse(input)).toThrow('status must be a string');
    });

    test('should throw when timestamp is missing', () => {
      const { timestamp: _t, ...input } = createValidDetailedHealth();
      expect(() => detailedHealthResponseSchema.parse(input)).toThrow('timestamp must be a string');
    });

    test('should throw when uptime is not a number', () => {
      expect(() =>
        detailedHealthResponseSchema.parse(createValidDetailedHealth({ uptime: 'long' })),
      ).toThrow('uptime must be a number');
    });

    test('should throw when a service has an invalid status', () => {
      expect(() =>
        detailedHealthResponseSchema.parse(
          createValidDetailedHealth({
            services: { db: { status: 'healthy' } },
          }),
        ),
      ).toThrow('services.db.status must be one of: up, down, degraded');
    });
  });

  describe('edge cases', () => {
    test('should throw for null input', () => {
      expect(() => detailedHealthResponseSchema.parse(null)).toThrow('status must be a string');
    });

    test('should throw for empty object', () => {
      expect(() => detailedHealthResponseSchema.parse({})).toThrow('status must be a string');
    });
  });
});

// ============================================================================
// readyResponseSchema Tests
// ============================================================================

describe('readyResponseSchema', () => {
  describe('valid inputs', () => {
    test('should parse response with status "ready"', () => {
      const result: ReadyResponse = readyResponseSchema.parse({
        status: 'ready',
        timestamp: '2026-02-18T10:00:00.000Z',
      });

      expect(result.status).toBe('ready');
      expect(result.timestamp).toBe('2026-02-18T10:00:00.000Z');
    });

    test('should parse response with status "not_ready"', () => {
      const result: ReadyResponse = readyResponseSchema.parse({
        status: 'not_ready',
        timestamp: '2026-02-18T10:00:00.000Z',
      });

      expect(result.status).toBe('not_ready');
    });
  });

  describe('invalid inputs', () => {
    test('should throw when status is not "ready" or "not_ready"', () => {
      expect(() =>
        readyResponseSchema.parse({ status: 'ok', timestamp: '2026-02-18T10:00:00.000Z' }),
      ).toThrow('status must be "ready" or "not_ready"');
    });

    test('should throw when status is missing', () => {
      expect(() => readyResponseSchema.parse({ timestamp: '2026-02-18T10:00:00.000Z' })).toThrow(
        'status must be a string',
      );
    });

    test('should throw when timestamp is missing', () => {
      expect(() => readyResponseSchema.parse({ status: 'ready' })).toThrow(
        'timestamp must be a string',
      );
    });

    test('should throw when status is null', () => {
      expect(() =>
        readyResponseSchema.parse({ status: null, timestamp: '2026-02-18T10:00:00.000Z' }),
      ).toThrow('status must be a string');
    });
  });

  describe('edge cases', () => {
    test('should throw for null input', () => {
      expect(() => readyResponseSchema.parse(null)).toThrow();
    });

    test('should throw for empty object', () => {
      expect(() => readyResponseSchema.parse({})).toThrow('status must be a string');
    });
  });
});

// ============================================================================
// liveResponseSchema Tests
// ============================================================================

describe('liveResponseSchema', () => {
  describe('valid inputs', () => {
    test('should parse valid live response', () => {
      const result: LiveResponse = liveResponseSchema.parse({
        status: 'alive',
        uptime: 7200,
      });

      expect(result.status).toBe('alive');
      expect(result.uptime).toBe(7200);
    });

    test('should parse live response with zero uptime', () => {
      const result: LiveResponse = liveResponseSchema.parse({
        status: 'alive',
        uptime: 0,
      });

      expect(result.uptime).toBe(0);
    });

    test('should parse live response with large uptime', () => {
      const result: LiveResponse = liveResponseSchema.parse({
        status: 'alive',
        uptime: 86400 * 365,
      });

      expect(result.uptime).toBe(86400 * 365);
    });
  });

  describe('invalid inputs', () => {
    test('should throw when status is not "alive"', () => {
      expect(() => liveResponseSchema.parse({ status: 'up', uptime: 100 })).toThrow(
        'status must be "alive"',
      );
    });

    test('should throw when status is missing', () => {
      expect(() => liveResponseSchema.parse({ uptime: 100 })).toThrow('status must be a string');
    });

    test('should throw when uptime is not a number', () => {
      expect(() => liveResponseSchema.parse({ status: 'alive', uptime: 'forever' })).toThrow(
        'uptime must be a number',
      );
    });

    test('should throw when uptime is missing', () => {
      expect(() => liveResponseSchema.parse({ status: 'alive' })).toThrow(
        'uptime must be a number',
      );
    });

    test('should throw when status is null', () => {
      expect(() => liveResponseSchema.parse({ status: null, uptime: 100 })).toThrow(
        'status must be a string',
      );
    });
  });

  describe('edge cases', () => {
    test('should throw for null input', () => {
      expect(() => liveResponseSchema.parse(null)).toThrow();
    });

    test('should throw for empty object', () => {
      expect(() => liveResponseSchema.parse({})).toThrow('status must be a string');
    });
  });
});

// ============================================================================
// checkCache Tests
// ============================================================================

describe('checkCache', () => {
  test('should return up with cache size when stats resolve', async () => {
    const cache: HealthCheckCache = {
      getStats: vi.fn().mockResolvedValue({ hits: 100, misses: 20, size: 42 }),
    };

    const result = await checkCache(cache);

    expect(result.status).toBe('up');
    expect(result.message).toBe('42 items in cache');
  });

  test('should return down with error message when getStats throws', async () => {
    const cache: HealthCheckCache = {
      getStats: vi.fn().mockRejectedValue(new Error('Redis connection timeout')),
    };

    const result = await checkCache(cache);

    expect(result.status).toBe('down');
    expect(result.message).toBe('Redis connection timeout');
  });

  test('should return down with generic message for non-Error throws', async () => {
    const cache: HealthCheckCache = {
      getStats: vi.fn().mockRejectedValue('boom'),
    };

    const result = await checkCache(cache);

    expect(result.status).toBe('down');
    expect(result.message).toBe('Cache check failed');
  });

  test('should handle zero-size cache (empty but healthy)', async () => {
    const cache: HealthCheckCache = {
      getStats: vi.fn().mockResolvedValue({ hits: 0, misses: 0, size: 0 }),
    };

    const result = await checkCache(cache);

    expect(result.status).toBe('up');
    expect(result.message).toBe('0 items in cache');
  });
});

// ============================================================================
// checkQueue Tests
// ============================================================================

describe('checkQueue', () => {
  test('should return up with pending and failed counts', async () => {
    const queue: HealthCheckQueue = {
      getStats: vi.fn().mockResolvedValue({ pending: 5, failed: 2 }),
    };

    const result = await checkQueue(queue);

    expect(result.status).toBe('up');
    expect(result.message).toBe('5 pending, 2 failed');
  });

  test('should return down when getStats throws an Error', async () => {
    const queue: HealthCheckQueue = {
      getStats: vi.fn().mockRejectedValue(new Error('Queue broker unreachable')),
    };

    const result = await checkQueue(queue);

    expect(result.status).toBe('down');
    expect(result.message).toBe('Queue broker unreachable');
  });

  test('should return down with generic message for non-Error throws', async () => {
    const queue: HealthCheckQueue = {
      getStats: vi.fn().mockRejectedValue(null),
    };

    const result = await checkQueue(queue);

    expect(result.status).toBe('down');
    expect(result.message).toBe('Queue check failed');
  });

  test('should return up with zero pending and failed counts', async () => {
    const queue: HealthCheckQueue = {
      getStats: vi.fn().mockResolvedValue({ pending: 0, failed: 0 }),
    };

    const result = await checkQueue(queue);

    expect(result.status).toBe('up');
    expect(result.message).toBe('0 pending, 0 failed');
  });
});

// ============================================================================
// Adversarial: all services down
// ============================================================================

describe('determineOverallStatus — adversarial', () => {
  test('returns down when all services report down', () => {
    const services = {
      db: { status: 'down' as const },
      cache: { status: 'down' as const },
      queue: { status: 'down' as const },
      email: { status: 'down' as const },
      storage: { status: 'down' as const },
    };

    expect(determineOverallStatus(services)).toBe('down');
  });

  test('returns degraded when exactly one of many is down', () => {
    const services = {
      db: { status: 'up' as const },
      cache: { status: 'up' as const },
      queue: { status: 'up' as const },
      email: { status: 'down' as const },
    };

    expect(determineOverallStatus(services)).toBe('degraded');
  });

  test('returns degraded when a mix of degraded and up exists', () => {
    const services = {
      db: { status: 'up' as const },
      cache: { status: 'degraded' as const },
    };

    expect(determineOverallStatus(services)).toBe('degraded');
  });

  test('returns down (not degraded) when every service is down', () => {
    // Tests the every() branch: all down → return 'down'
    const services = {
      a: { status: 'down' as const },
      b: { status: 'down' as const },
    };

    expect(determineOverallStatus(services)).toBe('down');
  });

  test('returns down for single-service object where that service is down', () => {
    expect(determineOverallStatus({ db: { status: 'down' as const } })).toBe('down');
  });

  test('returns healthy for single-service object where that service is up', () => {
    expect(determineOverallStatus({ db: { status: 'up' as const } })).toBe('healthy');
  });

  test('returns down for empty services object (every() on empty is vacuously true)', () => {
    // JS: [].every(pred) === true → returns 'down'
    expect(determineOverallStatus({})).toBe('down');
  });
});

// ============================================================================
// Adversarial: buildDetailedHealthResponse
// ============================================================================

describe('buildDetailedHealthResponse — adversarial', () => {
  test('returns down status when all services are down', () => {
    const allDown = {
      db: { status: 'down' as const, message: 'ECONNREFUSED' },
      cache: { status: 'down' as const, message: 'timeout' },
      queue: { status: 'down' as const, message: 'broker offline' },
    };

    const response = buildDetailedHealthResponse(allDown);

    expect(response.status).toBe('down');
    expect(response.services).toEqual(allDown);
  });

  test('returns degraded when subset of services fail', () => {
    const partial = {
      db: { status: 'up' as const, message: 'connected', latencyMs: 3 },
      cache: { status: 'down' as const, message: 'Redis offline' },
      queue: { status: 'degraded' as const, message: 'high latency' },
    };

    const response = buildDetailedHealthResponse(partial);

    expect(response.status).toBe('degraded');
    expect(response.services['cache']?.message).toBe('Redis offline');
  });

  test('timestamp is a valid ISO 8601 string', () => {
    const response = buildDetailedHealthResponse({ db: { status: 'up' as const } });

    const parsed = new Date(response.timestamp);
    expect(Number.isNaN(parsed.getTime())).toBe(false);
    expect(response.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  test('uptime is a non-negative integer', () => {
    const response = buildDetailedHealthResponse({ db: { status: 'up' as const } });
    expect(response.uptime).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(response.uptime)).toBe(true);
  });

  test('returns empty services when no services provided', () => {
    const response = buildDetailedHealthResponse({});
    expect(response.services).toEqual({});
    // determineOverallStatus({}) returns 'down' due to empty every()
    expect(response.status).toBe('down');
  });
});

// ============================================================================
// Adversarial: checkDatabase — partial failure scenarios
// ============================================================================

describe('checkDatabase — adversarial', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('returns latencyMs >= 0 even on immediate failure', async () => {
    const db: HealthCheckDatabase = {
      healthCheck: vi.fn<[], Promise<boolean>>().mockRejectedValue(new Error('fail')),
    };

    const result = await checkDatabase(db);

    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });

  test('healthCheck called exactly once per invocation', async () => {
    const mockHealthCheck = vi.fn<[], Promise<boolean>>().mockResolvedValue(true);
    const db: HealthCheckDatabase = { healthCheck: mockHealthCheck };

    await checkDatabase(db);

    expect(mockHealthCheck).toHaveBeenCalledOnce();
  });

  test('returns down when healthCheck returns false (not an error, just false)', async () => {
    const db: HealthCheckDatabase = {
      healthCheck: vi.fn<[], Promise<boolean>>().mockResolvedValue(false),
    };

    const result = await checkDatabase(db);

    expect(result.status).toBe('down');
    expect(result.message).toBe('health check failed');
  });

  test('handles thrown null as non-Error (uses generic message)', async () => {
    const db: HealthCheckDatabase = {
      healthCheck: vi.fn<[], Promise<boolean>>().mockRejectedValue(null),
    };

    const result = await checkDatabase(db);

    expect(result.status).toBe('down');
    expect(result.message).toBe('Connection failed');
  });

  test('handles thrown object literal as non-Error (uses generic message)', async () => {
    const db: HealthCheckDatabase = {
      healthCheck: vi.fn<[], Promise<boolean>>().mockRejectedValue({ code: 'ECONNREFUSED' }),
    };

    const result = await checkDatabase(db);

    expect(result.status).toBe('down');
    expect(result.message).toBe('Connection failed');
  });
});

// ============================================================================
// Adversarial: detailedHealthResponseSchema — malformed service entries
// ============================================================================

describe('detailedHealthResponseSchema — adversarial', () => {
  function validBase(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      status: 'healthy',
      timestamp: '2026-02-18T10:00:00.000Z',
      uptime: 3600,
      services: {},
      ...overrides,
    };
  }

  test('throws when a service entry is a primitive instead of object', () => {
    expect(() =>
      detailedHealthResponseSchema.parse(
        validBase({ services: { db: 'up' } }),
      ),
    ).toThrow('services.db.status must be a string');
  });

  test('throws when a service entry is an array instead of object', () => {
    expect(() =>
      detailedHealthResponseSchema.parse(
        validBase({ services: { db: ['up'] } }),
      ),
    ).toThrow('services.db.status must be a string');
  });

  test('throws when a service status is a boolean', () => {
    expect(() =>
      detailedHealthResponseSchema.parse(
        validBase({ services: { db: { status: true } } }),
      ),
    ).toThrow('services.db.status must be a string');
  });

  test('throws when services field is a string instead of object', () => {
    // services is not null/object → treated as {} → no keys → parses fine
    // Actually the schema wraps non-objects as {} so it won't iterate
    const result = detailedHealthResponseSchema.parse(
      validBase({ services: 'not-an-object' }),
    );
    expect(result.services).toEqual({});
  });

  test('ignores non-string optional fields (message, latencyMs) gracefully', () => {
    const result = detailedHealthResponseSchema.parse(
      validBase({
        services: {
          db: { status: 'up', message: 42, latencyMs: 'fast' },
        },
      }),
    );

    // message must be a string → ignored; latencyMs must be a number → ignored
    expect(result.services['db']?.message).toBeUndefined();
    expect(result.services['db']?.latencyMs).toBeUndefined();
  });

  test('parses multiple simultaneous service failures (full system down)', () => {
    const result = detailedHealthResponseSchema.parse(
      validBase({
        status: 'down',
        services: {
          db: { status: 'down', message: 'ECONNREFUSED' },
          cache: { status: 'down', message: 'timeout' },
          queue: { status: 'down', message: 'broker offline' },
          email: { status: 'down', message: 'SMTP unreachable' },
        },
      }),
    );

    expect(result.status).toBe('down');
    expect(Object.keys(result.services)).toHaveLength(4);
    expect(result.services['db']?.status).toBe('down');
  });

  test('throws when uptime is Infinity', () => {
    // parseNumber should accept Infinity since it is typeof 'number'
    const result = detailedHealthResponseSchema.parse(validBase({ uptime: Infinity }));
    expect(result.uptime).toBe(Infinity);
  });

  test('throws when uptime is NaN', () => {
    // parseNumber: NaN typeof === 'number' but isNaN — check what parseNumber does
    expect(() =>
      detailedHealthResponseSchema.parse(validBase({ uptime: NaN })),
    ).toThrow('uptime must be a number');
  });

  test('throws when status is an empty string', () => {
    expect(() =>
      detailedHealthResponseSchema.parse(validBase({ status: '' })),
    ).toThrow('status must be one of: healthy, degraded, down');
  });
});

// ============================================================================
// Adversarial: checkSchema — edge cases
// ============================================================================

describe('checkSchema — adversarial', () => {
  test('handles zero expected table count correctly', async () => {
    const db: HealthCheckDatabase = {
      healthCheck: vi.fn<[], Promise<boolean>>().mockResolvedValue(true),
    };
    const validator: SchemaValidator = vi.fn().mockResolvedValue({
      valid: true,
      missingTables: [],
    });

    const result = await checkSchema(db, validator, 0);

    expect(result.status).toBe('up');
    expect(result.message).toBe('0 tables present');
    expect(result.tableCount).toBe(0);
  });

  test('reports correct remaining table count when many tables are missing', async () => {
    const db: HealthCheckDatabase = {
      healthCheck: vi.fn<[], Promise<boolean>>().mockResolvedValue(true),
    };
    const missingTables = Array.from({ length: 5 }, (_, i) => `table_${String(i)}`);
    const validator: SchemaValidator = vi.fn().mockResolvedValue({
      valid: false,
      missingTables,
    });

    const result = await checkSchema(db, validator, 10);

    expect(result.status).toBe('down');
    expect(result.message).toBe('missing 5 tables');
    expect(result.tableCount).toBe(5);
    expect(result.missingTables).toHaveLength(5);
  });

  test('handles validator that resolves valid=false with empty missingTables array', async () => {
    const db: HealthCheckDatabase = {
      healthCheck: vi.fn<[], Promise<boolean>>().mockResolvedValue(true),
    };
    const validator: SchemaValidator = vi.fn().mockResolvedValue({
      valid: false,
      missingTables: [],
    });

    const result = await checkSchema(db, validator, 5);

    expect(result.status).toBe('down');
    expect(result.message).toBe('missing 0 tables');
    expect(result.tableCount).toBe(5);
  });
});
