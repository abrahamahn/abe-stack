// apps/server/src/health/health.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  checkDatabase,
  checkEmail,
  checkPubSub,
  checkRateLimit,
  checkStorage,
  checkWebSocket,
  getDetailedHealth,
} from './index';

import type { AppContext } from '@shared';

// Mock database schema validation from @abe-stack/db
const mockValidateSchema = vi.hoisted(() => vi.fn());
vi.mock('@abe-stack/db', async () => {
  const actual = await vi.importActual<typeof import('@abe-stack/db')>('@abe-stack/db');
  return {
    ...actual,
    validateSchema: mockValidateSchema,
  };
});

// Mock realtime package for WebSocket stats
vi.mock('@abe-stack/realtime', () => ({
  getWebSocketStats: vi.fn(() => ({
    activeConnections: 0,
    pluginRegistered: true,
  })),
}));

describe('Health Check Functions', () => {
  const mockDb: {
    execute: ReturnType<typeof vi.fn>;
    query: Record<string, unknown>;
    healthCheck: ReturnType<typeof vi.fn>;
  } = {
    execute: vi.fn(),
    query: {},
    healthCheck: vi.fn(),
  };

  const mockPubsub = {
    getSubscriptionCount: vi.fn(() => 5),
  };

  const mockContext = {
    config: {
      env: 'test',
      email: { provider: 'console' },
      storage: { provider: 'local' },
    },
    db: mockDb,
    email: { send: vi.fn() },
    storage: { upload: vi.fn() },
    pubsub: mockPubsub,
    log: {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    },
  } as unknown as AppContext;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('checkDatabase', () => {
    it('should return up when database is connected', async () => {
      mockDb.healthCheck.mockResolvedValueOnce(true);
      const result = await checkDatabase(mockContext);
      expect(result.status).toBe('up');
      expect(result.message).toBe('connected');
      expect(result.latencyMs).toBeDefined();
    });

    it('should return down when database connection fails', async () => {
      mockDb.healthCheck.mockRejectedValueOnce(new Error('Connection refused'));
      const result = await checkDatabase(mockContext);
      expect(result.status).toBe('down');
      expect(result.message).toBe('Connection refused');
    });
  });

  describe('checkEmail', () => {
    it('should return up with provider name', () => {
      const result = checkEmail(mockContext);
      expect(result.status).toBe('up');
      expect(result.message).toBe('console');
    });
  });

  describe('checkStorage', () => {
    it('should return up with provider name', () => {
      const result = checkStorage(mockContext);
      expect(result.status).toBe('up');
      expect(result.message).toBe('local');
    });
  });

  describe('checkPubSub', () => {
    it('should return up with subscription count', () => {
      const result = checkPubSub(mockContext);
      expect(result.status).toBe('up');
      expect(result.message).toBe('5 active subscriptions');
    });
  });

  describe('checkWebSocket', () => {
    it('should return up when plugin is registered', () => {
      const result = checkWebSocket();
      expect(result.status).toBe('up');
      expect(result.message).toContain('connections');
    });
  });

  describe('checkRateLimit', () => {
    it('should return up with active status', () => {
      const result = checkRateLimit();
      expect(result.status).toBe('up');
      expect(result.message).toBe('token bucket active');
    });
  });

  describe('getDetailedHealth', () => {
    it('should return healthy when all services are up', async () => {
      // Mock database connectivity check
      mockDb.healthCheck.mockResolvedValueOnce(true);
      // Mock schema validation check
      mockValidateSchema.mockResolvedValueOnce({
        valid: true,
        missingTables: [],
      });
      const result = await getDetailedHealth(mockContext);
      expect(result.status).toBe('healthy');
      expect(result.services.database.status).toBe('up');
      expect(result.services.schema.status).toBe('up');
      expect(result.services.email.status).toBe('up');
      expect(result.services.storage.status).toBe('up');
      expect(result.services.pubsub.status).toBe('up');
      expect(result.services.websocket.status).toBe('up');
      expect(result.services.rateLimit.status).toBe('up');
    });

    it('should return degraded when database is down', async () => {
      mockDb.healthCheck.mockRejectedValueOnce(new Error('Connection failed'));
      // Schema check will also fail since db is down
      mockValidateSchema.mockRejectedValueOnce(new Error('Connection failed'));
      const result = await getDetailedHealth(mockContext);
      expect(result.status).toBe('degraded');
      expect(result.services.database.status).toBe('down');
    });

    it('should return degraded when schema is incomplete', async () => {
      // Mock database connectivity check
      mockDb.healthCheck.mockResolvedValueOnce(true);
      // Mock schema validation check (missing tables)
      mockValidateSchema.mockResolvedValueOnce({
        valid: false,
        missingTables: ['magic_link_tokens', 'oauth_connections'],
      });
      const result = await getDetailedHealth(mockContext);
      expect(result.status).toBe('degraded');
      expect(result.services.database.status).toBe('up');
      expect(result.services.schema.status).toBe('down');
      expect(result.services.schema.missingTables).toBeDefined();
    });
  });
});
