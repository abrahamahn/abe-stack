// apps/server/src/infra/pubsub/__tests__/pubsub.test.ts
import { createPostgresPubSub, publishAfterWrite, SubKeys, SubscriptionManager } from '@pubsub';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import type { PostgresPubSub, SubscriptionKey, WebSocket } from '@pubsub';

// ============================================================================
// SubKeys Tests
// ============================================================================

describe('SubKeys', () => {
  describe('record', () => {
    test('should create record key with table and id', () => {
      const key = SubKeys.record('users', 'abc-123');
      expect(key).toBe('record:users:abc-123');
    });

    test('should handle special characters in id', () => {
      const key = SubKeys.record('posts', 'id-with-dashes-123');
      expect(key).toBe('record:posts:id-with-dashes-123');
    });

    test('should handle uuid format', () => {
      const key = SubKeys.record('orders', '550e8400-e29b-41d4-a716-446655440000');
      expect(key).toBe('record:orders:550e8400-e29b-41d4-a716-446655440000');
    });
  });

  describe('list', () => {
    test('should create list key with userId and listType', () => {
      const key = SubKeys.list('user-123', 'todos');
      expect(key).toBe('list:user-123:todos');
    });

    test('should handle different list types', () => {
      const key = SubKeys.list('user-456', 'notifications');
      expect(key).toBe('list:user-456:notifications');
    });
  });
});

// ============================================================================
// SubscriptionManager Tests
// ============================================================================

describe('SubscriptionManager', () => {
  let manager: SubscriptionManager;
  let mockSocket: WebSocket;
  let mockSocket2: WebSocket;

  function createMockSocket(id: string): WebSocket & { id: string; sent: string[] } {
    const socket = {
      id,
      readyState: 1, // WebSocket.OPEN
      sent: [] as string[],
      send(data: string): void {
        this.sent.push(data);
      },
    };
    socket.send = socket.send.bind(socket);
    return socket;
  }

  beforeEach(() => {
    manager = new SubscriptionManager();
    mockSocket = createMockSocket('socket-1');
    mockSocket2 = createMockSocket('socket-2');
  });

  describe('subscribe', () => {
    test('should add socket to subscription', () => {
      const key: SubscriptionKey = 'record:users:123';
      manager.subscribe(key, mockSocket);

      expect(manager.getSubscriberCount(key)).toBe(1);
    });

    test('should allow multiple sockets to subscribe to same key', () => {
      const key: SubscriptionKey = 'record:users:123';
      manager.subscribe(key, mockSocket);
      manager.subscribe(key, mockSocket2);

      expect(manager.getSubscriberCount(key)).toBe(2);
    });

    test('should allow same socket to subscribe to multiple keys', () => {
      const key1: SubscriptionKey = 'record:users:123';
      const key2: SubscriptionKey = 'record:posts:456';

      manager.subscribe(key1, mockSocket);
      manager.subscribe(key2, mockSocket);

      expect(manager.getSubscriberCount(key1)).toBe(1);
      expect(manager.getSubscriberCount(key2)).toBe(1);
      expect(manager.getSubscriptionCount()).toBe(2);
    });

    test('should not duplicate socket in same subscription', () => {
      const key: SubscriptionKey = 'record:users:123';
      manager.subscribe(key, mockSocket);
      manager.subscribe(key, mockSocket);

      expect(manager.getSubscriberCount(key)).toBe(1);
    });
  });

  describe('unsubscribe', () => {
    test('should remove socket from subscription', () => {
      const key: SubscriptionKey = 'record:users:123';
      manager.subscribe(key, mockSocket);
      manager.unsubscribe(key, mockSocket);

      expect(manager.getSubscriberCount(key)).toBe(0);
    });

    test('should clean up empty subscription sets', () => {
      const key: SubscriptionKey = 'record:users:123';
      manager.subscribe(key, mockSocket);
      manager.unsubscribe(key, mockSocket);

      expect(manager.getSubscriptionCount()).toBe(0);
    });

    test('should not affect other sockets when unsubscribing', () => {
      const key: SubscriptionKey = 'record:users:123';
      manager.subscribe(key, mockSocket);
      manager.subscribe(key, mockSocket2);
      manager.unsubscribe(key, mockSocket);

      expect(manager.getSubscriberCount(key)).toBe(1);
    });

    test('should handle unsubscribe for non-existent subscription', () => {
      const key: SubscriptionKey = 'record:users:123';
      // Should not throw
      expect(() => {
        manager.unsubscribe(key, mockSocket);
      }).not.toThrow();
    });
  });

  describe('publishLocal', () => {
    test('should send update to subscribed sockets', () => {
      const key: SubscriptionKey = 'record:users:123';
      const socket = createMockSocket('socket-1');
      manager.subscribe(key, socket);

      manager.publishLocal(key, 5);

      expect(socket.sent).toHaveLength(1);
      expect(JSON.parse(socket.sent[0])).toEqual({
        type: 'update',
        key: 'record:users:123',
        version: 5,
      });
    });

    test('should send update to multiple subscribers', () => {
      const key: SubscriptionKey = 'record:users:123';
      const socket1 = createMockSocket('socket-1');
      const socket2 = createMockSocket('socket-2');

      manager.subscribe(key, socket1);
      manager.subscribe(key, socket2);

      manager.publishLocal(key, 10);

      expect(socket1.sent).toHaveLength(1);
      expect(socket2.sent).toHaveLength(1);
    });

    test('should not send to sockets with closed readyState', () => {
      const key: SubscriptionKey = 'record:users:123';
      const closedSocket = createMockSocket('closed-socket');
      closedSocket.readyState = 3; // WebSocket.CLOSED

      manager.subscribe(key, closedSocket);
      manager.publishLocal(key, 5);

      expect(closedSocket.sent).toHaveLength(0);
    });

    test('should not throw when publishing to non-existent key', () => {
      const key: SubscriptionKey = 'record:users:123';
      expect(() => {
        manager.publishLocal(key, 5);
      }).not.toThrow();
    });
  });

  describe('publish', () => {
    test('should call publishLocal', () => {
      const key: SubscriptionKey = 'record:users:123';
      const socket = createMockSocket('socket-1');
      manager.subscribe(key, socket);

      manager.publish(key, 5);

      expect(socket.sent).toHaveLength(1);
    });

    test('should call adapter.publish when adapter is set', () => {
      const mockAdapter = {
        publish: vi.fn().mockResolvedValue(undefined),
      } as unknown as PostgresPubSub;

      manager.setAdapter(mockAdapter);

      const key: SubscriptionKey = 'record:users:123';
      manager.publish(key, 5);

      expect(mockAdapter.publish).toHaveBeenCalledWith(key, 5);
    });

    test('should not throw when adapter.publish fails', () => {
      const mockAdapter = {
        publish: vi.fn().mockRejectedValue(new Error('Connection failed')),
      } as unknown as PostgresPubSub;

      manager.setAdapter(mockAdapter);

      const key: SubscriptionKey = 'record:users:123';

      // Should not throw
      expect(() => {
        manager.publish(key, 5);
      }).not.toThrow();
    });
  });

  describe('cleanup', () => {
    test('should remove socket from all subscriptions', () => {
      const key1: SubscriptionKey = 'record:users:123';
      const key2: SubscriptionKey = 'record:posts:456';

      manager.subscribe(key1, mockSocket);
      manager.subscribe(key2, mockSocket);

      manager.cleanup(mockSocket);

      expect(manager.getSubscriberCount(key1)).toBe(0);
      expect(manager.getSubscriberCount(key2)).toBe(0);
    });

    test('should clean up empty subscription sets after cleanup', () => {
      const key: SubscriptionKey = 'record:users:123';
      manager.subscribe(key, mockSocket);

      manager.cleanup(mockSocket);

      expect(manager.getSubscriptionCount()).toBe(0);
    });

    test('should not affect other sockets', () => {
      const key: SubscriptionKey = 'record:users:123';
      manager.subscribe(key, mockSocket);
      manager.subscribe(key, mockSocket2);

      manager.cleanup(mockSocket);

      expect(manager.getSubscriberCount(key)).toBe(1);
    });

    test('should handle cleanup for socket with no subscriptions', () => {
      expect(() => {
        manager.cleanup(mockSocket);
      }).not.toThrow();
    });
  });

  describe('handleMessage', () => {
    test('should handle subscribe message', () => {
      const message = JSON.stringify({ type: 'subscribe', key: 'record:users:123' });

      manager.handleMessage(mockSocket, message);

      expect(manager.getSubscriberCount('record:users:123')).toBe(1);
    });

    test('should handle unsubscribe message', () => {
      const key: SubscriptionKey = 'record:users:123';
      manager.subscribe(key, mockSocket);

      const message = JSON.stringify({ type: 'unsubscribe', key });
      manager.handleMessage(mockSocket, message);

      expect(manager.getSubscriberCount(key)).toBe(0);
    });

    test('should call onSubscribe callback when subscribing', () => {
      const onSubscribe = vi.fn();
      const message = JSON.stringify({ type: 'subscribe', key: 'record:users:123' });

      manager.handleMessage(mockSocket, message, onSubscribe);

      expect(onSubscribe).toHaveBeenCalledWith('record:users:123');
    });

    test('should not call onSubscribe for unsubscribe messages', () => {
      const onSubscribe = vi.fn();
      const key: SubscriptionKey = 'record:users:123';
      manager.subscribe(key, mockSocket);

      const message = JSON.stringify({ type: 'unsubscribe', key });
      manager.handleMessage(mockSocket, message, onSubscribe);

      expect(onSubscribe).not.toHaveBeenCalled();
    });

    test('should ignore invalid JSON messages', () => {
      expect(() => {
        manager.handleMessage(mockSocket, 'not-json');
      }).not.toThrow();
    });

    test('should ignore messages with unknown type', () => {
      const message = JSON.stringify({ type: 'unknown', key: 'record:users:123' });
      expect(() => {
        manager.handleMessage(mockSocket, message);
      }).not.toThrow();
    });
  });

  describe('getSubscriberCount', () => {
    test('should return 0 for non-existent key', () => {
      expect(manager.getSubscriberCount('record:users:nonexistent')).toBe(0);
    });

    test('should return correct count', () => {
      const key: SubscriptionKey = 'record:users:123';
      manager.subscribe(key, mockSocket);
      manager.subscribe(key, mockSocket2);

      expect(manager.getSubscriberCount(key)).toBe(2);
    });
  });

  describe('getSubscriptionCount', () => {
    test('should return 0 when no subscriptions', () => {
      expect(manager.getSubscriptionCount()).toBe(0);
    });

    test('should return correct count of unique keys', () => {
      manager.subscribe('record:users:123', mockSocket);
      manager.subscribe('record:posts:456', mockSocket);
      manager.subscribe('record:users:123', mockSocket2); // same key, different socket

      expect(manager.getSubscriptionCount()).toBe(2);
    });
  });

  describe('setAdapter', () => {
    test('should set adapter for cross-instance messaging', () => {
      const mockAdapter = {
        publish: vi.fn().mockResolvedValue(undefined),
      } as unknown as PostgresPubSub;

      manager.setAdapter(mockAdapter);
      manager.publish('record:users:123', 5);

      expect(mockAdapter.publish).toHaveBeenCalled();
    });
  });

  describe('constructor with options', () => {
    test('should accept adapter in constructor options', () => {
      const mockAdapter = {
        publish: vi.fn().mockResolvedValue(undefined),
      } as unknown as PostgresPubSub;

      const managerWithAdapter = new SubscriptionManager({ adapter: mockAdapter });
      managerWithAdapter.publish('record:users:123', 5);

      expect(mockAdapter.publish).toHaveBeenCalled();
    });
  });
});

// ============================================================================
// publishAfterWrite Tests
// ============================================================================

describe('publishAfterWrite', () => {
  let mockPubsub: SubscriptionManager;

  beforeEach(() => {
    vi.useFakeTimers();
    mockPubsub = {
      publish: vi.fn(),
    } as unknown as SubscriptionManager;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('should call publish with record key', async () => {
    publishAfterWrite(mockPubsub, 'users', 'abc-123', 5);

    // setImmediate is used, so we need to advance timers
    await vi.runAllTimersAsync();

    expect(mockPubsub.publish).toHaveBeenCalledWith('record:users:abc-123', 5);
  });

  test('should not block execution (uses setImmediate)', async () => {
    publishAfterWrite(mockPubsub, 'users', 'abc-123', 5);

    // publish should not be called immediately
    expect(mockPubsub.publish).not.toHaveBeenCalled();

    // After timers advance, it should be called
    await vi.runAllTimersAsync();
    expect(mockPubsub.publish).toHaveBeenCalled();
  });
});

// ============================================================================
// PostgresPubSub Tests (testable parts without actual Postgres)
// ============================================================================

describe('PostgresPubSub', () => {
  describe('createPostgresPubSub', () => {
    test('should create instance with required options', () => {
      const pubsub = createPostgresPubSub({
        connectionString: 'postgres://test:test@localhost:5432/test',
      });

      expect(pubsub).toBeDefined();
      expect(pubsub.isActive).toBe(false);
    });

    test('should create instance with custom channel', () => {
      const pubsub = createPostgresPubSub({
        connectionString: 'postgres://test:test@localhost:5432/test',
        channel: 'custom_channel',
      });

      expect(pubsub).toBeDefined();
    });

    test('should generate unique instance ID', () => {
      const pubsub1 = createPostgresPubSub({
        connectionString: 'postgres://test:test@localhost:5432/test',
      });

      const pubsub2 = createPostgresPubSub({
        connectionString: 'postgres://test:test@localhost:5432/test',
      });

      expect(pubsub1.id).toBeDefined();
      expect(pubsub2.id).toBeDefined();
      expect(pubsub1.id).not.toBe(pubsub2.id);
    });

    test('should have id in expected format (timestamp-random)', () => {
      const pubsub = createPostgresPubSub({
        connectionString: 'postgres://test:test@localhost:5432/test',
      });

      // ID format: {timestamp in base36}-{random chars}
      expect(pubsub.id).toMatch(/^[a-z0-9]+-[a-z0-9]+$/);
    });
  });

  describe('isActive property', () => {
    test('should return false before start', () => {
      const pubsub = createPostgresPubSub({
        connectionString: 'postgres://test:test@localhost:5432/test',
      });

      expect(pubsub.isActive).toBe(false);
    });
  });

  describe('publish without start', () => {
    test('should throw error when publishing before start', async () => {
      const pubsub = createPostgresPubSub({
        connectionString: 'postgres://test:test@localhost:5432/test',
      });

      await expect(pubsub.publish('record:users:123', 5)).rejects.toThrow(
        'PostgresPubSub not started',
      );
    });
  });
});