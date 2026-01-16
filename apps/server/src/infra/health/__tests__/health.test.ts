// apps/server/src/infra/health/__tests__/health.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock websocket module
vi.mock('@websocket', () => ({
  getWebSocketStats: vi.fn(() => ({
    activeConnections: 0,
    pluginRegistered: true,
  })),
}));

import {
  checkDatabase,
  checkEmail,
  checkStorage,
  checkPubSub,
  checkWebSocket,
  checkRateLimit,
  getDetailedHealth,
} from '../index';

import type { AppContext } from '@shared/types';

describe('Health Check Functions', () => {
  const mockDb = {
    execute: vi.fn(() => Promise.resolve()),
    query: {},
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
      mockDb.execute.mockResolvedValueOnce(undefined);
      const result = await checkDatabase(mockContext);
      expect(result.status).toBe('up');
      expect(result.message).toBe('connected');
      expect(result.latencyMs).toBeDefined();
    });

    it('should return down when database connection fails', async () => {
      mockDb.execute.mockRejectedValueOnce(new Error('Connection refused'));
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
      mockDb.execute.mockResolvedValueOnce(undefined);
      const result = await getDetailedHealth(mockContext);
      expect(result.status).toBe('healthy');
      expect(result.services.database.status).toBe('up');
      expect(result.services.email.status).toBe('up');
      expect(result.services.storage.status).toBe('up');
      expect(result.services.pubsub.status).toBe('up');
      expect(result.services.websocket.status).toBe('up');
      expect(result.services.rateLimit.status).toBe('up');
    });

    it('should return degraded when database is down', async () => {
      mockDb.execute.mockRejectedValueOnce(new Error('Connection failed'));
      const result = await getDetailedHealth(mockContext);
      expect(result.status).toBe('degraded');
      expect(result.services.database.status).toBe('down');
    });
  });
});
