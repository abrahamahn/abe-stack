// backend/engine/src/system/health.test.ts
/**
 * System Health Check Tests
 *
 * Tests the health orchestration layer in engine which delegates
 * to the pure health-check utilities in @abe-stack/shared. Validates
 * context wiring, WebSocket stats injection, and the aggregation of
 * individual service checks into a single detailed response.
 */
import { validateSchema } from '@abe-stack/db';
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

import type { SystemContext } from './types';

vi.mock('@abe-stack/db', async (importOriginal) => {
  const original = await importOriginal<typeof import('@abe-stack/db')>();
  return {
    ...original,
    validateSchema: vi.fn().mockResolvedValue({
      valid: true,
      missingTables: [],
      tables: original.REQUIRED_TABLES,
    }),
  };
});

const mockValidateSchema = vi.mocked(validateSchema);

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Create a minimal mock SystemContext for testing.
 *
 * @param overrides - Partial overrides for the context
 * @returns Fully-mocked SystemContext
 */
function createMockContext(overrides: Partial<SystemContext> = {}): SystemContext {
  return {
    config: {
      email: { provider: 'console' },
      storage: { provider: 'local' },
      billing: { enabled: false },
      notifications: { enabled: false },
    } as SystemContext['config'],
    db: {
      healthCheck: vi.fn<() => Promise<boolean>>().mockResolvedValue(true),
      execute: vi.fn().mockResolvedValue([{ result: 1 }]),
    } as unknown as SystemContext['db'],
    pubsub: {
      getSubscriptionCount: vi.fn<() => number>().mockReturnValue(3),
    },
    log: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      fatal: vi.fn(),
      debug: vi.fn(),
      trace: vi.fn(),
    } as unknown as SystemContext['log'],
    ...overrides,
  };
}

// ============================================================================
// checkDbStatus Tests
// ============================================================================

describe('checkDbStatus', () => {
  test('should return up when database is healthy', async () => {
    const ctx = createMockContext();
    const result = await checkDbStatus(ctx);

    expect(result.status).toBe('up');
    expect(result.message).toBe('connected');
  });

  test('should return down when database health check fails', async () => {
    const ctx = createMockContext({
      db: {
        healthCheck: vi.fn<() => Promise<boolean>>().mockResolvedValue(false),
        execute: vi.fn(),
      } as unknown as SystemContext['db'],
    });

    const result = await checkDbStatus(ctx);

    expect(result.status).toBe('down');
  });

  test('should return down when database throws', async () => {
    const ctx = createMockContext({
      db: {
        healthCheck: vi
          .fn<() => Promise<boolean>>()
          .mockRejectedValue(new Error('Connection refused')),
        execute: vi.fn(),
      } as unknown as SystemContext['db'],
    });

    const result = await checkDbStatus(ctx);

    expect(result.status).toBe('down');
    expect(result.message).toBe('Connection refused');
  });
});

// ============================================================================
// checkSchemaStatus Tests
// ============================================================================

describe('checkSchemaStatus', () => {
  test('should return up when schema is valid', async () => {
    const ctx = createMockContext();

    const result = await checkSchemaStatus(ctx);

    expect(result.status).toBe('up');
    expect(result.tableCount).toBeGreaterThan(0);
  });

  test('should return down when schema validation throws', async () => {
    mockValidateSchema.mockRejectedValueOnce(new Error('Schema error'));
    const ctx = createMockContext();

    const result = await checkSchemaStatus(ctx);

    expect(result.status).toBe('down');
  });
});

// ============================================================================
// checkEmailStatus Tests
// ============================================================================

describe('checkEmailStatus', () => {
  test('should return up with configured provider', () => {
    const ctx = createMockContext();
    const result = checkEmailStatus(ctx);

    expect(result.status).toBe('up');
    expect(result.message).toBe('console');
  });

  test('should return up with smtp provider', () => {
    const ctx = createMockContext({
      config: {
        email: { provider: 'smtp' },
        storage: { provider: 'local' },
        billing: { enabled: false },
        notifications: { enabled: false },
      } as SystemContext['config'],
    });

    const result = checkEmailStatus(ctx);

    expect(result.status).toBe('up');
    expect(result.message).toBe('smtp');
  });
});

// ============================================================================
// checkStorageStatus Tests
// ============================================================================

describe('checkStorageStatus', () => {
  test('should return up with configured provider', () => {
    const ctx = createMockContext();
    const result = checkStorageStatus(ctx);

    expect(result.status).toBe('up');
    expect(result.message).toBe('local');
  });

  test('should return up with s3 provider', () => {
    const ctx = createMockContext({
      config: {
        email: { provider: 'console' },
        storage: { provider: 's3' },
        billing: { enabled: false },
        notifications: { enabled: false },
      } as SystemContext['config'],
    });

    const result = checkStorageStatus(ctx);

    expect(result.status).toBe('up');
    expect(result.message).toBe('s3');
  });
});

// ============================================================================
// checkPubSubStatus Tests
// ============================================================================

describe('checkPubSubStatus', () => {
  test('should return up with subscription count', () => {
    const ctx = createMockContext();
    const result = checkPubSubStatus(ctx);

    expect(result.status).toBe('up');
    expect(result.message).toBe('3 active subscriptions');
  });

  test('should return up with zero subscriptions', () => {
    const ctx = createMockContext({
      pubsub: {
        getSubscriptionCount: vi.fn<() => number>().mockReturnValue(0),
      },
    });

    const result = checkPubSubStatus(ctx);

    expect(result.status).toBe('up');
    expect(result.message).toBe('0 active subscriptions');
  });
});

// ============================================================================
// checkWebSocketStatus Tests
// ============================================================================

describe('checkWebSocketStatus', () => {
  test('should return up when plugin is registered', () => {
    const result = checkWebSocketStatus({
      pluginRegistered: true,
      activeConnections: 10,
    });

    expect(result.status).toBe('up');
    expect(result.message).toBe('10 active connections');
  });

  test('should return down when plugin is not registered', () => {
    const result = checkWebSocketStatus({
      pluginRegistered: false,
      activeConnections: 0,
    });

    expect(result.status).toBe('down');
    expect(result.message).toBe('plugin not registered');
  });

  test('should return up with zero connections when plugin is registered', () => {
    const result = checkWebSocketStatus({
      pluginRegistered: true,
      activeConnections: 0,
    });

    expect(result.status).toBe('up');
    expect(result.message).toBe('0 active connections');
  });
});

// ============================================================================
// checkRateLimitStatus Tests
// ============================================================================

describe('checkRateLimitStatus', () => {
  test('should return up with active status', () => {
    const result = checkRateLimitStatus();

    expect(result.status).toBe('up');
    expect(result.message).toBe('token bucket active');
  });
});

// ============================================================================
// getDetailedHealth Tests
// ============================================================================

describe('getDetailedHealth', () => {
  test('should aggregate all service health checks', async () => {
    const ctx = createMockContext();
    const result = await getDetailedHealth(ctx, {
      pluginRegistered: true,
      activeConnections: 5,
    });

    expect(result.status).toBeDefined();
    expect(result.timestamp).toBeDefined();
    expect(result.uptime).toBeGreaterThanOrEqual(0);
    expect(result.services).toBeDefined();
  });

  test('should use default websocket stats when none provided', async () => {
    const ctx = createMockContext();
    const result = await getDetailedHealth(ctx);

    expect(result.services['websocket']).toBeDefined();
    expect(result.services['websocket']?.status).toBe('down');
    expect(result.services['websocket']?.message).toBe('plugin not registered');
  });

  test('should report healthy when all services are up', async () => {
    const ctx = createMockContext();
    const result = await getDetailedHealth(ctx, {
      pluginRegistered: true,
      activeConnections: 0,
    });

    expect(result.status).toBe('healthy');
  });

  test('should include database service status', async () => {
    const ctx = createMockContext();
    const result = await getDetailedHealth(ctx);

    expect(result.services['database']).toBeDefined();
    expect(result.services['database']?.status).toBe('up');
  });

  test('should include email service status', async () => {
    const ctx = createMockContext();
    const result = await getDetailedHealth(ctx);

    expect(result.services['email']).toBeDefined();
    expect(result.services['email']?.status).toBe('up');
  });

  test('should include storage service status', async () => {
    const ctx = createMockContext();
    const result = await getDetailedHealth(ctx);

    expect(result.services['storage']).toBeDefined();
    expect(result.services['storage']?.status).toBe('up');
  });
});

// ============================================================================
// logStartupSummary Tests
// ============================================================================

describe('logStartupSummary', () => {
  test('should log startup summary with service statuses', async () => {
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
        stats: expect.objectContaining({
          routes: 12,
        }),
      }),
    );
  });

  test('should resolve localhost for 0.0.0.0 host', async () => {
    const ctx = createMockContext();

    await logStartupSummary(ctx, {
      host: '0.0.0.0',
      port: 3000,
      routeCount: 5,
    });

    expect(ctx.log.info).toHaveBeenCalledWith(
      'Startup Summary',
      expect.objectContaining({
        server: expect.objectContaining({
          url: 'http://localhost:3000',
        }),
      }),
    );
  });

  test('should pass websocket stats through to health check', async () => {
    const ctx = createMockContext();

    await logStartupSummary(
      ctx,
      { host: 'localhost', port: 8080, routeCount: 1 },
      { pluginRegistered: true, activeConnections: 42 },
    );

    expect(ctx.log.info).toHaveBeenCalledTimes(1);
  });
});
