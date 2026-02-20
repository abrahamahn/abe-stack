// main/server/system/src/system/health.test.ts
/**
 * System Health Check Tests
 *
 * Tests the health orchestration layer which delegates to the pure
 * health-check utilities in @bslt/shared. Schema validation is now
 * injected as a callback — no @bslt/db dependency inside health.ts.
 */
import { describe, expect, test, vi } from 'vitest';

import {
  checkDbStatus,
  checkEmailStatus,
  checkPubSubStatus,
  checkRateLimitStatus,
  checkSchemaStatus,
  checkStorageStatus,
  checkWebSocketStatus,
  getDetailedHealth,
  logStartupSummary,
} from './health';

import type { HealthContext } from './types';

// ============================================================================
// Test Helpers
// ============================================================================

/** Minimal mock validator — returns healthy schema by default. */
const mockValidator = vi.fn().mockResolvedValue({ valid: true, missingTables: [] });

function createMockContext(overrides: Partial<HealthContext> = {}): HealthContext {
  return {
    config: {
      server: { logLevel: 'info', nodeEnv: 'test' },
      email: { provider: 'console' },
      storage: { provider: 'local' },
      billing: { enabled: false },
      notifications: { enabled: false },
    } as unknown as HealthContext['config'],
    db: {
      healthCheck: vi.fn<() => Promise<boolean>>().mockResolvedValue(true),
      execute: vi.fn().mockResolvedValue([{ result: 1 }]),
    } as unknown as HealthContext['db'],
    cache: {
      getStats: vi.fn().mockResolvedValue({ hits: 0, misses: 0, size: 0 }),
    } as unknown as HealthContext['cache'],
    queue: {
      getStats: vi.fn().mockResolvedValue({ pending: 0, failed: 0 }),
    } as unknown as HealthContext['queue'],
    pubsub: {
      getSubscriptionCount: vi.fn<() => number>().mockReturnValue(3),
    } as unknown as HealthContext['pubsub'],
    log: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      fatal: vi.fn(),
      debug: vi.fn(),
      trace: vi.fn(),
    } as unknown as HealthContext['log'],
    ...overrides,
  };
}

// ============================================================================
// checkDbStatus
// ============================================================================

describe('checkDbStatus', () => {
  test('returns up when database is healthy', async () => {
    const ctx = createMockContext();
    const result = await checkDbStatus(ctx);

    expect(result.status).toBe('up');
    expect(result.message).toBe('connected');
  });

  test('returns down when database health check fails', async () => {
    const ctx = createMockContext({
      db: {
        healthCheck: vi.fn<() => Promise<boolean>>().mockResolvedValue(false),
        execute: vi.fn(),
      } as unknown as HealthContext['db'],
    });
    const result = await checkDbStatus(ctx);
    expect(result.status).toBe('down');
  });

  test('returns down when database throws', async () => {
    const ctx = createMockContext({
      db: {
        healthCheck: vi
          .fn<() => Promise<boolean>>()
          .mockRejectedValue(new Error('Connection refused')),
        execute: vi.fn(),
      } as unknown as HealthContext['db'],
    });
    const result = await checkDbStatus(ctx);
    expect(result.status).toBe('down');
    expect(result.message).toBe('Connection refused');
  });
});

// ============================================================================
// checkSchemaStatus
// ============================================================================

describe('checkSchemaStatus', () => {
  test('returns up when schema is valid', async () => {
    const ctx = createMockContext();
    const validator = vi.fn().mockResolvedValue({ valid: true, missingTables: [] });
    const result = await checkSchemaStatus(ctx, validator, 30);

    expect(result.status).toBe('up');
    expect(validator).toHaveBeenCalledOnce();
  });

  test('returns down when validator reports missing tables', async () => {
    const ctx = createMockContext();
    const validator = vi
      .fn()
      .mockResolvedValue({ valid: false, missingTables: ['users', 'sessions'] });
    const result = await checkSchemaStatus(ctx, validator, 30);

    expect(result.status).toBe('down');
  });

  test('returns down when validator throws', async () => {
    const ctx = createMockContext();
    const validator = vi.fn().mockRejectedValue(new Error('Schema error'));
    const result = await checkSchemaStatus(ctx, validator, 30);

    expect(result.status).toBe('down');
  });
});

// ============================================================================
// checkEmailStatus
// ============================================================================

describe('checkEmailStatus', () => {
  test('returns up with configured provider', () => {
    const ctx = createMockContext();
    const result = checkEmailStatus(ctx);
    expect(result.status).toBe('up');
    expect(result.message).toBe('console');
  });

  test('returns up with smtp provider', () => {
    const ctx = createMockContext({
      config: {
        email: { provider: 'smtp' },
        storage: { provider: 'local' },
        billing: { enabled: false },
        notifications: { enabled: false },
      } as HealthContext['config'],
    });
    const result = checkEmailStatus(ctx);
    expect(result.status).toBe('up');
    expect(result.message).toBe('smtp');
  });
});

// ============================================================================
// checkStorageStatus
// ============================================================================

describe('checkStorageStatus', () => {
  test('returns up with local provider', () => {
    const ctx = createMockContext();
    const result = checkStorageStatus(ctx);
    expect(result.status).toBe('up');
    expect(result.message).toBe('local');
  });

  test('returns up with s3 provider', () => {
    const ctx = createMockContext({
      config: {
        email: { provider: 'console' },
        storage: { provider: 's3' },
        billing: { enabled: false },
        notifications: { enabled: false },
      } as HealthContext['config'],
    });
    const result = checkStorageStatus(ctx);
    expect(result.status).toBe('up');
    expect(result.message).toBe('s3');
  });
});

// ============================================================================
// checkPubSubStatus
// ============================================================================

describe('checkPubSubStatus', () => {
  test('returns up with subscription count', () => {
    const ctx = createMockContext();
    const result = checkPubSubStatus(ctx);
    expect(result.status).toBe('up');
    expect(result.message).toBe('3 active subscriptions');
  });

  test('returns up with zero subscriptions', () => {
    const ctx = createMockContext({
      pubsub: { getSubscriptionCount: vi.fn<() => number>().mockReturnValue(0) },
    });
    const result = checkPubSubStatus(ctx);
    expect(result.status).toBe('up');
    expect(result.message).toBe('0 active subscriptions');
  });
});

// ============================================================================
// checkWebSocketStatus
// ============================================================================

describe('checkWebSocketStatus', () => {
  test('returns up when plugin is registered', () => {
    const result = checkWebSocketStatus({ pluginRegistered: true, activeConnections: 10 });
    expect(result.status).toBe('up');
    expect(result.message).toBe('10 active connections');
  });

  test('returns down when plugin is not registered', () => {
    const result = checkWebSocketStatus({ pluginRegistered: false, activeConnections: 0 });
    expect(result.status).toBe('down');
    expect(result.message).toBe('plugin not registered');
  });

  test('returns up with zero connections when plugin is registered', () => {
    const result = checkWebSocketStatus({ pluginRegistered: true, activeConnections: 0 });
    expect(result.status).toBe('up');
    expect(result.message).toBe('0 active connections');
  });
});

// ============================================================================
// checkRateLimitStatus
// ============================================================================

describe('checkRateLimitStatus', () => {
  test('returns up with active status', () => {
    const result = checkRateLimitStatus();
    expect(result.status).toBe('up');
    expect(result.message).toBe('sliding window active');
  });
});

// ============================================================================
// getDetailedHealth
// ============================================================================

describe('getDetailedHealth', () => {
  test('aggregates all service health checks', async () => {
    const ctx = createMockContext();
    const result = await getDetailedHealth(ctx, {
      websocketStats: { pluginRegistered: true, activeConnections: 5 },
    });

    expect(result.status).toBeDefined();
    expect(result.timestamp).toBeDefined();
    expect(result.uptime).toBeGreaterThanOrEqual(0);
    expect(result.services).toBeDefined();
  });

  test('uses default websocket stats when none provided', async () => {
    const ctx = createMockContext();
    const result = await getDetailedHealth(ctx);

    expect(result.services['websocket']).toBeDefined();
    expect(result.services['websocket']?.status).toBe('down');
    expect(result.services['websocket']?.message).toBe('plugin not registered');
  });

  test('reports healthy when all services are up', async () => {
    const ctx = createMockContext();
    const result = await getDetailedHealth(ctx, {
      websocketStats: { pluginRegistered: true, activeConnections: 0 },
    });
    expect(result.status).toBe('healthy');
  });

  test('includes database service status', async () => {
    const ctx = createMockContext();
    const result = await getDetailedHealth(ctx);
    expect(result.services['database']?.status).toBe('up');
  });

  test('runs schema check when validator provided', async () => {
    const ctx = createMockContext();
    const result = await getDetailedHealth(ctx, {
      schemaValidator: mockValidator,
      totalTableCount: 30,
    });
    expect(mockValidator).toHaveBeenCalled();
    expect(result.services['schema']).toBeDefined();
  });

  test('omits schema check when no validator provided', async () => {
    const ctx = createMockContext();
    const result = await getDetailedHealth(ctx);
    // Schema service still present but reported as healthy placeholder
    expect(result.services['schema']?.status).toBe('up');
  });
});

// ============================================================================
// logStartupSummary
// ============================================================================

describe('logStartupSummary', () => {
  test('logs startup summary with service statuses', async () => {
    const ctx = createMockContext();

    await logStartupSummary(ctx, {
      host: 'localhost',
      port: 8080,
      routeCount: 12,
    });

    expect(ctx.log.info).toHaveBeenCalledTimes(1);
    expect(ctx.log.info).toHaveBeenCalledWith(
      'Startup Summary',
      expect.objectContaining({
        msg: 'Server started successfully',
        server: expect.objectContaining({
          host: 'localhost',
          port: 8080,
          url: 'http://localhost:8080',
        }),
        stats: expect.objectContaining({ routes: 12 }),
      }),
    );
  });

  test('resolves localhost for 0.0.0.0 host', async () => {
    const ctx = createMockContext();

    await logStartupSummary(ctx, { host: '0.0.0.0', port: 3000, routeCount: 5 });

    expect(ctx.log.info).toHaveBeenCalledWith(
      'Startup Summary',
      expect.objectContaining({
        server: expect.objectContaining({ url: 'http://localhost:3000' }),
      }),
    );
  });

  test('passes websocket stats through to health check', async () => {
    const ctx = createMockContext();

    await logStartupSummary(
      ctx,
      { host: 'localhost', port: 8080, routeCount: 1 },
      { websocketStats: { pluginRegistered: true, activeConnections: 42 } },
    );

    expect(ctx.log.info).toHaveBeenCalledTimes(1);
  });
});
