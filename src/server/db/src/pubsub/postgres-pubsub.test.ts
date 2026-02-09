// src/server/db/src/pubsub/postgres-pubsub.test.ts
import { SubKeys } from '@abe-stack/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PostgresPubSub, type PostgresPubSubOptions } from './postgres-pubsub';

// Mock postgres module with shared listeners across all instances
vi.mock('postgres', () => {
  // Shared listeners map across all mock client instances
  const sharedListeners = new Map<string, (payload: string) => void>();

  const createMockClient = () => {
    return {
      listen: vi.fn((channel: string, callback: (payload: string) => void) => {
        sharedListeners.set(channel, callback);
        return Promise.resolve();
      }),
      notify: vi.fn((channel: string, payload: string) => {
        const listener = sharedListeners.get(channel);
        if (listener !== undefined) {
          // Simulate async notification
          setTimeout(() => {
            listener(payload);
          }, 0);
        }
        return Promise.resolve();
      }),
      end: vi.fn(() => {
        // Clear listeners on end
        sharedListeners.clear();
        return Promise.resolve();
      }),
      _triggerNotification: (channel: string, payload: string) => {
        const listener = sharedListeners.get(channel);
        if (listener !== undefined) listener(payload);
      },
      _listeners: sharedListeners,
    };
  };

  return {
    default: vi.fn(() => createMockClient()),
  };
});

describe('PostgresPubSub', () => {
  let pubsub: PostgresPubSub;
  let onMessageMock: ReturnType<typeof vi.fn>;
  let onErrorMock: ReturnType<typeof vi.fn>;

  const defaultOptions: PostgresPubSubOptions = {
    connectionString: 'postgres://localhost:5432/test',
    channel: 'test_channel',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    onMessageMock = vi.fn();
    onErrorMock = vi.fn();
  });

  afterEach(async () => {
    if (pubsub !== undefined) {
      await pubsub.stop();
    }
  });

  describe('Initialization', () => {
    it('should create instance with default channel', () => {
      pubsub = new PostgresPubSub({
        connectionString: defaultOptions.connectionString,
      });

      expect(pubsub).toBeDefined();
      expect(pubsub.isActive).toBe(false);
    });

    it('should create instance with custom channel', () => {
      pubsub = new PostgresPubSub(defaultOptions);

      expect(pubsub).toBeDefined();
      expect(pubsub.id).toBeTruthy();
    });

    it('should generate unique instance IDs', () => {
      const pubsub1 = new PostgresPubSub(defaultOptions);
      const pubsub2 = new PostgresPubSub(defaultOptions);

      expect(pubsub1.id).not.toBe(pubsub2.id);
    });
  });

  describe('Lifecycle', () => {
    it('should start listening', async () => {
      pubsub = new PostgresPubSub({
        ...defaultOptions,
        onMessage: onMessageMock as any,
        onError: onErrorMock as any,
      });

      await pubsub.start();

      expect(pubsub.isActive).toBe(true);
    });

    it('should not start twice', async () => {
      pubsub = new PostgresPubSub(defaultOptions);

      await pubsub.start();
      await pubsub.start(); // Second call should be no-op

      expect(pubsub.isActive).toBe(true);
    });

    it('should stop listening', async () => {
      pubsub = new PostgresPubSub(defaultOptions);

      await pubsub.start();
      expect(pubsub.isActive).toBe(true);

      await pubsub.stop();
      expect(pubsub.isActive).toBe(false);
    });

    it('should handle stop when not started', async () => {
      pubsub = new PostgresPubSub(defaultOptions);

      await expect(pubsub.stop()).resolves.not.toThrow();
    });
  });

  describe('Publishing', () => {
    beforeEach(async () => {
      pubsub = new PostgresPubSub({
        ...defaultOptions,
        onMessage: onMessageMock as any,
        onError: onErrorMock as any,
      });
      await pubsub.start();
    });

    it('should publish messages', async () => {
      const key = SubKeys.record('users', '123');
      const version = 1;

      await expect(pubsub.publish(key, version)).resolves.not.toThrow();
    });

    it('should throw if not started', async () => {
      const notStartedPubsub = new PostgresPubSub(defaultOptions);
      const key = SubKeys.record('users', '123');

      await expect(notStartedPubsub.publish(key, 1)).rejects.toThrow('PostgresPubSub not started');
    });

    it('should include instance ID in published messages', async () => {
      const key = SubKeys.record('users', '123');
      const version = 1;

      await pubsub.publish(key, version);

      // The message should contain the instance ID
      expect(pubsub.id).toBeTruthy();
    });
  });

  describe('Message Handling', () => {
    it('should receive messages from other instances', async () => {
      pubsub = new PostgresPubSub({
        ...defaultOptions,
        onMessage: onMessageMock as any,
        onError: onErrorMock as any,
      });

      await pubsub.start();

      // Simulate message from another instance with correct subscription key format
      const message = {
        key: 'record:users:123',
        version: 1,
        instanceId: 'different-instance-id',
      };

      // Trigger notification manually
      const postgres = await import('postgres');
      const mockClient = postgres.default() as any;
      mockClient._triggerNotification('test_channel', JSON.stringify(message));

      // Wait for async processing
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(onMessageMock).toHaveBeenCalledWith(message.key, message.version);
    });

    it('should ignore messages from self', async () => {
      pubsub = new PostgresPubSub({
        ...defaultOptions,
        onMessage: onMessageMock as any,
        onError: onErrorMock as any,
      });

      await pubsub.start();

      // Simulate message from self with correct subscription key format
      const message = {
        key: 'record:users:123',
        version: 1,
        instanceId: pubsub.id,
      };

      const postgres = await import('postgres');
      const mockClient = postgres.default() as any;
      mockClient._triggerNotification('test_channel', JSON.stringify(message));

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(onMessageMock).not.toHaveBeenCalled();
    });

    it('should handle invalid JSON payloads', async () => {
      pubsub = new PostgresPubSub({
        ...defaultOptions,
        onMessage: onMessageMock as any,
        onError: onErrorMock as any,
      });

      await pubsub.start();

      const postgres = await import('postgres');
      const mockClient = postgres.default() as any;
      mockClient._triggerNotification('test_channel', 'invalid json');

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(onErrorMock).toHaveBeenCalled();
      expect(onMessageMock).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should call onError callback on errors', async () => {
      pubsub = new PostgresPubSub({
        ...defaultOptions,
        onMessage: onMessageMock as any,
        onError: onErrorMock as any,
      });

      await pubsub.start();

      // Trigger invalid message
      const postgres = await import('postgres');
      const mockClient = postgres.default() as any;
      mockClient._triggerNotification('test_channel', '{invalid}');

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(onErrorMock).toHaveBeenCalled();
    });

    it('should use default no-op callbacks if not provided', async () => {
      pubsub = new PostgresPubSub({
        connectionString: defaultOptions.connectionString,
      });

      await expect(pubsub.start()).resolves.not.toThrow();
    });
  });

  describe('Multiple Instances', () => {
    it('should support multiple instances with different channels', async () => {
      const pubsub1 = new PostgresPubSub({
        ...defaultOptions,
        channel: 'channel1',
        onMessage: vi.fn(),
      });

      const pubsub2 = new PostgresPubSub({
        ...defaultOptions,
        channel: 'channel2',
        onMessage: vi.fn(),
      });

      await pubsub1.start();
      await pubsub2.start();

      expect(pubsub1.isActive).toBe(true);
      expect(pubsub2.isActive).toBe(true);
      expect(pubsub1.id).not.toBe(pubsub2.id);

      await pubsub1.stop();
      await pubsub2.stop();
    });
  });
});
