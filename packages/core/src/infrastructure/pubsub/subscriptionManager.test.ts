// packages/core/src/infrastructure/pubsub/subscriptionManager.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PostgresPubSub } from './postgresPubSub';
import { SubscriptionManager } from './subscriptionManager';
import { SubKeys, type WebSocket } from './types';

// Mock WebSocket
function createMockWebSocket(): WebSocket {
  return {
    send: vi.fn(),
    readyState: 1, // WebSocket.OPEN
  } as unknown as WebSocket;
}

describe('SubscriptionManager', () => {
  let manager: SubscriptionManager;
  let mockSocket: WebSocket;

  beforeEach(() => {
    manager = new SubscriptionManager();
    mockSocket = createMockWebSocket();
  });

  describe('Subscribe/Unsubscribe', () => {
    it('should subscribe socket to key', () => {
      const key = SubKeys.record('users', '123');

      manager.subscribe(key, mockSocket);

      expect(manager.getSubscriberCount(key)).toBe(1);
    });

    it('should support multiple sockets for same key', () => {
      const key = SubKeys.record('users', '123');
      const socket2 = createMockWebSocket();

      manager.subscribe(key, mockSocket);
      manager.subscribe(key, socket2);

      expect(manager.getSubscriberCount(key)).toBe(2);
    });

    it('should unsubscribe socket from key', () => {
      const key = SubKeys.record('users', '123');

      manager.subscribe(key, mockSocket);
      expect(manager.getSubscriberCount(key)).toBe(1);

      manager.unsubscribe(key, mockSocket);
      expect(manager.getSubscriberCount(key)).toBe(0);
    });

    it('should clean up empty subscription sets', () => {
      const key = SubKeys.record('users', '123');

      manager.subscribe(key, mockSocket);
      manager.unsubscribe(key, mockSocket);

      expect(manager.getSubscriptionCount()).toBe(0);
    });

    it('should track multiple subscriptions per socket', () => {
      const key1 = SubKeys.record('users', '1');
      const key2 = SubKeys.record('posts', '2');

      manager.subscribe(key1, mockSocket);
      manager.subscribe(key2, mockSocket);

      expect(manager.getSubscriberCount(key1)).toBe(1);
      expect(manager.getSubscriberCount(key2)).toBe(1);
    });
  });

  describe('Publishing', () => {
    it('should publish to local subscribers', () => {
      const key = SubKeys.record('users', '123');
      manager.subscribe(key, mockSocket);

      manager.publishLocal(key, 5);

      expect(mockSocket.send).toHaveBeenCalledTimes(1);
      const message = JSON.parse((mockSocket.send as any).mock.calls[0][0]);
      expect(message).toEqual({
        type: 'update',
        key,
        version: 5,
      });
    });

    it('should not publish if no subscribers', () => {
      const key = SubKeys.record('users', '123');

      manager.publishLocal(key, 5);

      expect(mockSocket.send).not.toHaveBeenCalled();
    });

    it('should publish to multiple subscribers', () => {
      const key = SubKeys.record('users', '123');
      const socket2 = createMockWebSocket();

      manager.subscribe(key, mockSocket);
      manager.subscribe(key, socket2);

      manager.publishLocal(key, 5);

      expect(mockSocket.send).toHaveBeenCalledTimes(1);
      expect(socket2.send).toHaveBeenCalledTimes(1);
    });

    it('should only publish to sockets with OPEN state', () => {
      const key = SubKeys.record('users', '123');
      const closedSocket = createMockWebSocket();
      closedSocket.readyState = 3; // WebSocket.CLOSED

      manager.subscribe(key, mockSocket);
      manager.subscribe(key, closedSocket);

      manager.publishLocal(key, 5);

      expect(mockSocket.send).toHaveBeenCalledTimes(1);
      expect(closedSocket.send).not.toHaveBeenCalled();
    });

    it('should publish with adapter if configured', async () => {
      const mockAdapter: PostgresPubSub = {
        publish: vi.fn().mockResolvedValue(undefined),
      } as unknown as PostgresPubSub;

      manager = new SubscriptionManager({ adapter: mockAdapter as any });
      const key = SubKeys.record('users', '123');

      manager.subscribe(key, mockSocket);
      manager.publish(key, 5);

      // Should publish locally
      expect(mockSocket.send).toHaveBeenCalled();

      // Should also publish via adapter
      expect(mockAdapter.publish as any).toHaveBeenCalledWith(key, 5);
    });

    it('should handle adapter errors gracefully', async () => {
      const mockAdapter: PostgresPubSub = {
        publish: vi.fn().mockRejectedValue(new Error('Adapter error')),
      } as unknown as PostgresPubSub;

      manager = new SubscriptionManager({ adapter: mockAdapter as any });
      const key = SubKeys.record('users', '123');

      manager.subscribe(key, mockSocket);

      // Should not throw
      expect(() => manager.publish(key, 5)).not.toThrow();

      // Local publish should still work
      expect(mockSocket.send).toHaveBeenCalled();
    });
  });

  describe('Cleanup', () => {
    it('should clean up all subscriptions for socket', () => {
      const key1 = SubKeys.record('users', '1');
      const key2 = SubKeys.record('posts', '2');

      manager.subscribe(key1, mockSocket);
      manager.subscribe(key2, mockSocket);

      expect(manager.getSubscriberCount(key1)).toBe(1);
      expect(manager.getSubscriberCount(key2)).toBe(1);

      manager.cleanup(mockSocket);

      expect(manager.getSubscriberCount(key1)).toBe(0);
      expect(manager.getSubscriberCount(key2)).toBe(0);
    });

    it('should not affect other sockets', () => {
      const key = SubKeys.record('users', '123');
      const socket2 = createMockWebSocket();

      manager.subscribe(key, mockSocket);
      manager.subscribe(key, socket2);

      manager.cleanup(mockSocket);

      expect(manager.getSubscriberCount(key)).toBe(1);
    });

    it('should handle cleanup of non-subscribed socket', () => {
      const socket2 = createMockWebSocket();

      expect(() => manager.cleanup(socket2)).not.toThrow();
    });
  });

  describe('Message Handling', () => {
    it('should handle subscribe message', () => {
      const key = SubKeys.record('users', '123');
      const message = JSON.stringify({ type: 'subscribe', key });

      manager.handleMessage(mockSocket, message);

      expect(manager.getSubscriberCount(key)).toBe(1);
    });

    it('should handle unsubscribe message', () => {
      const key = SubKeys.record('users', '123');

      manager.subscribe(key, mockSocket);

      const message = JSON.stringify({ type: 'unsubscribe', key });
      manager.handleMessage(mockSocket, message);

      expect(manager.getSubscriberCount(key)).toBe(0);
    });

    it('should call onSubscribe callback', () => {
      const key = SubKeys.record('users', '123');
      const onSubscribe = vi.fn();
      const message = JSON.stringify({ type: 'subscribe', key });

      manager.handleMessage(mockSocket, message, onSubscribe);

      expect(onSubscribe).toHaveBeenCalledWith(key);
    });

    it('should handle invalid JSON gracefully', () => {
      expect(() => {
        manager.handleMessage(mockSocket, 'invalid json');
      }).not.toThrow();
    });

    it('should ignore unknown message types', () => {
      const message = JSON.stringify({ type: 'unknown', data: 'test' });

      expect(() => {
        manager.handleMessage(mockSocket, message);
      }).not.toThrow();
    });
  });

  describe('Adapter Management', () => {
    it('should set adapter after construction', () => {
      const mockAdapter: PostgresPubSub = {
        publish: vi.fn().mockResolvedValue(undefined),
      } as unknown as PostgresPubSub;

      manager.setAdapter(mockAdapter as any);

      const key = SubKeys.record('users', '123');
      manager.subscribe(key, mockSocket);
      manager.publish(key, 5);

      expect(mockAdapter.publish as any).toHaveBeenCalled();
    });
  });

  describe('Statistics', () => {
    it('should return subscriber count for key', () => {
      const key = SubKeys.record('users', '123');

      expect(manager.getSubscriberCount(key)).toBe(0);

      manager.subscribe(key, mockSocket);
      expect(manager.getSubscriberCount(key)).toBe(1);

      const socket2 = createMockWebSocket();
      manager.subscribe(key, socket2);
      expect(manager.getSubscriberCount(key)).toBe(2);
    });

    it('should return total subscription count', () => {
      const key1 = SubKeys.record('users', '1');
      const key2 = SubKeys.record('posts', '2');

      expect(manager.getSubscriptionCount()).toBe(0);

      manager.subscribe(key1, mockSocket);
      expect(manager.getSubscriptionCount()).toBe(1);

      manager.subscribe(key2, mockSocket);
      expect(manager.getSubscriptionCount()).toBe(2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle same socket subscribing to same key multiple times', () => {
      const key = SubKeys.record('users', '123');

      manager.subscribe(key, mockSocket);
      manager.subscribe(key, mockSocket);

      // Should still be 1 (Set prevents duplicates)
      expect(manager.getSubscriberCount(key)).toBe(1);
    });

    it('should handle complex subscription keys', () => {
      const key = SubKeys.record('complex_table_name', 'uuid-123-456');

      manager.subscribe(key, mockSocket);
      manager.publishLocal(key, 10);

      expect(mockSocket.send).toHaveBeenCalled();
      const message = JSON.parse((mockSocket.send as any).mock.calls[0][0]);
      expect(message.key).toEqual(key);
    });
  });
});
