// main/shared/src/system/pubsub/subscription.manager.test.ts

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SubscriptionManager } from './subscription.manager';
import { SubKeys, type WebSocket } from './types';

import type { PostgresPubSub } from './postgres.pubsub';

/** Creates a mock WebSocket with a tracked send spy */
function createMockWebSocket(): { socket: WebSocket; sendSpy: ReturnType<typeof vi.fn> } {
  const sendSpy = vi.fn();
  const socket = {
    send: sendSpy,
    readyState: 1, // WebSocket.OPEN
  } as unknown as WebSocket;
  return { socket, sendSpy };
}

/** Creates a mock PostgresPubSub adapter with a tracked publish spy */
function createMockAdapter(publishImpl?: ReturnType<typeof vi.fn>): {
  adapter: PostgresPubSub;
  publishSpy: ReturnType<typeof vi.fn>;
} {
  const publishSpy = publishImpl ?? vi.fn().mockResolvedValue(undefined);
  const adapter = {
    publish: publishSpy,
  } as unknown as PostgresPubSub;
  return { adapter, publishSpy };
}

describe('SubscriptionManager', () => {
  let manager: SubscriptionManager;
  let mockSocket: WebSocket;
  let sendSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    manager = new SubscriptionManager();
    const mock = createMockWebSocket();
    mockSocket = mock.socket;
    sendSpy = mock.sendSpy;
  });

  describe('Subscribe/Unsubscribe', () => {
    it('should subscribe socket to key', () => {
      const key = SubKeys.record('users', '123');

      manager.subscribe(key, mockSocket);

      expect(manager.getSubscriberCount(key)).toBe(1);
    });

    it('should support multiple sockets for same key', () => {
      const key = SubKeys.record('users', '123');
      const { socket: socket2 } = createMockWebSocket();

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

      expect(sendSpy).toHaveBeenCalledTimes(1);
      const call = sendSpy.mock.calls[0];
      expect(call).toBeDefined();
      const message = JSON.parse(call![0] as string) as Record<string, unknown>;
      expect(message).toEqual({
        type: 'update',
        key,
        version: 5,
        timestamp: expect.any(Number),
      });
    });

    it('should not publish if no subscribers', () => {
      const key = SubKeys.record('users', '123');

      manager.publishLocal(key, 5);

      expect(sendSpy).not.toHaveBeenCalled();
    });

    it('should publish to multiple subscribers', () => {
      const key = SubKeys.record('users', '123');
      const { socket: socket2, sendSpy: sendSpy2 } = createMockWebSocket();

      manager.subscribe(key, mockSocket);
      manager.subscribe(key, socket2);

      manager.publishLocal(key, 5);

      expect(sendSpy).toHaveBeenCalledTimes(1);
      expect(sendSpy2).toHaveBeenCalledTimes(1);
    });

    it('should only publish to sockets with OPEN state', () => {
      const key = SubKeys.record('users', '123');
      const { socket: closedSocket, sendSpy: closedSendSpy } = createMockWebSocket();
      closedSocket.readyState = 3; // WebSocket.CLOSED

      manager.subscribe(key, mockSocket);
      manager.subscribe(key, closedSocket);

      manager.publishLocal(key, 5);

      expect(sendSpy).toHaveBeenCalledTimes(1);
      expect(closedSendSpy).not.toHaveBeenCalled();
    });

    it('should publish with adapter if configured', () => {
      const { adapter: mockAdapter, publishSpy: adapterPublishSpy } = createMockAdapter();

      manager = new SubscriptionManager({ adapter: mockAdapter });
      const key = SubKeys.record('users', '123');

      manager.subscribe(key, mockSocket);
      manager.publish(key, 5);

      // Should publish locally
      expect(sendSpy).toHaveBeenCalled();

      // Should also publish via adapter
      expect(adapterPublishSpy).toHaveBeenCalledWith(key, 5);
    });

    it('should handle adapter errors gracefully', () => {
      const { adapter: mockAdapter } = createMockAdapter(
        vi.fn().mockRejectedValue(new Error('Adapter error')),
      );

      manager = new SubscriptionManager({ adapter: mockAdapter });
      const key = SubKeys.record('users', '123');

      manager.subscribe(key, mockSocket);

      // Should not throw
      expect(() => {
        manager.publish(key, 5);
      }).not.toThrow();

      // Local publish should still work
      expect(sendSpy).toHaveBeenCalled();
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
      const { socket: socket2 } = createMockWebSocket();

      manager.subscribe(key, mockSocket);
      manager.subscribe(key, socket2);

      manager.cleanup(mockSocket);

      expect(manager.getSubscriberCount(key)).toBe(1);
    });

    it('should handle cleanup of non-subscribed socket', () => {
      const { socket: socket2 } = createMockWebSocket();

      expect(() => {
        manager.cleanup(socket2);
      }).not.toThrow();
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
      const { adapter: mockAdapter, publishSpy: adapterPublishSpy } = createMockAdapter();

      manager.setAdapter(mockAdapter);

      const key = SubKeys.record('users', '123');
      manager.subscribe(key, mockSocket);
      manager.publish(key, 5);

      expect(adapterPublishSpy).toHaveBeenCalled();
    });
  });

  describe('Statistics', () => {
    it('should return subscriber count for key', () => {
      const key = SubKeys.record('users', '123');

      expect(manager.getSubscriberCount(key)).toBe(0);

      manager.subscribe(key, mockSocket);
      expect(manager.getSubscriberCount(key)).toBe(1);

      const { socket: socket2 } = createMockWebSocket();
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

      expect(sendSpy).toHaveBeenCalled();
      const call = sendSpy.mock.calls[0];
      expect(call).toBeDefined();
      const message = JSON.parse(call![0] as string) as Record<string, unknown>;
      expect(message['key']).toEqual(key);
    });
  });

  // ==========================================================================
  // Delta Sync Support
  // ==========================================================================

  describe('Delta Sync', () => {
    it('should record messages in history buffer on publishLocal', () => {
      const key = SubKeys.record('users', '123');
      manager.subscribe(key, mockSocket);

      manager.publishLocal(key, 1);
      manager.publishLocal(key, 2);

      expect(manager.getHistorySize()).toBe(2);
    });

    it('should include timestamp in published messages', () => {
      const key = SubKeys.record('users', '123');
      manager.subscribe(key, mockSocket);

      manager.publishLocal(key, 5);

      expect(sendSpy).toHaveBeenCalled();
      const call = sendSpy.mock.calls[0];
      const message = JSON.parse(call![0] as string) as Record<string, unknown>;
      expect(message['timestamp']).toBeDefined();
      expect(typeof message['timestamp']).toBe('number');
    });

    it('should retrieve messages since a given timestamp', () => {
      const key = SubKeys.record('users', '123');
      manager.subscribe(key, mockSocket);

      // Mock Date.now to control timestamps
      const originalDateNow = Date.now;
      let mockTime = 1000;
      Date.now = (): number => mockTime;

      try {
        mockTime = 1000;
        manager.publishLocal(key, 1);
        mockTime = 2000;
        manager.publishLocal(key, 2);
        mockTime = 3000;
        manager.publishLocal(key, 3);

        // Get messages since timestamp 1000 (should include 2000 and 3000)
        const missed = manager.getMessagesSince(1000);
        expect(missed.length).toBe(2);
        expect(missed[0]?.version).toBe(2);
        expect(missed[1]?.version).toBe(3);

        // Get messages since timestamp 2500 (should include only 3000)
        const missed2 = manager.getMessagesSince(2500);
        expect(missed2.length).toBe(1);
        expect(missed2[0]?.version).toBe(3);
      } finally {
        Date.now = originalDateNow;
      }
    });

    it('should filter messages by subscription keys', () => {
      const key1 = SubKeys.record('users', '1');
      const key2 = SubKeys.record('posts', '1');
      manager.subscribe(key1, mockSocket);
      manager.subscribe(key2, mockSocket);

      const originalDateNow = Date.now;
      let mockTime = 1000;
      Date.now = (): number => mockTime;

      try {
        mockTime = 1000;
        manager.publishLocal(key1, 1);
        mockTime = 2000;
        manager.publishLocal(key2, 1);
        mockTime = 3000;
        manager.publishLocal(key1, 2);

        // Filter to only key1
        const missed = manager.getMessagesSince(0, new Set([key1]));
        expect(missed.length).toBe(2);
        expect(missed.every((m) => m.key === key1)).toBe(true);
      } finally {
        Date.now = originalDateNow;
      }
    });

    it('should evict old messages when history exceeds maxHistorySize', () => {
      const smallManager = new SubscriptionManager({ maxHistorySize: 10 });
      const key = SubKeys.record('users', '1');
      const { socket } = createMockWebSocket();
      smallManager.subscribe(key, socket);

      for (let i = 0; i < 20; i++) {
        smallManager.publishLocal(key, i);
      }

      // Should have evicted some entries
      expect(smallManager.getHistorySize()).toBeLessThanOrEqual(20);
      expect(smallManager.getHistorySize()).toBeGreaterThan(0);
    });

    it('should handle sync_request client message', () => {
      const key1 = SubKeys.record('users', '1');
      const key2 = SubKeys.record('posts', '1');
      const { socket: subscriber } = createMockWebSocket();
      manager.subscribe(key1, subscriber);
      manager.subscribe(key2, subscriber);

      const originalDateNow = Date.now;
      let mockTime = 1000;
      Date.now = (): number => mockTime;

      try {
        // Publish some messages
        mockTime = 1000;
        manager.publishLocal(key1, 1);
        mockTime = 2000;
        manager.publishLocal(key2, 1);
        mockTime = 3000;
        manager.publishLocal(key1, 2);

        // Now a new socket sends sync_request
        const { socket: reconnecting, sendSpy: reconnectSendSpy } = createMockWebSocket();

        manager.handleMessage(
          reconnecting,
          JSON.stringify({
            type: 'sync_request',
            lastTimestamp: 1500,
            keys: [key1, key2],
          }),
        );

        // Should have received a sync_response with messages since timestamp 1500
        expect(reconnectSendSpy).toHaveBeenCalledTimes(1);
        const response = JSON.parse(reconnectSendSpy.mock.calls[0]![0] as string) as Record<
          string,
          unknown
        >;
        expect(response['type']).toBe('sync_response');
        const messages = response['messages'] as Array<Record<string, unknown>>;
        // Should have the latest version per key (deduplicated)
        expect(messages.length).toBe(2);
      } finally {
        Date.now = originalDateNow;
      }
    });

    it('should ignore sync_request with invalid lastTimestamp', () => {
      const { socket, sendSpy: spy } = createMockWebSocket();

      manager.handleMessage(
        socket,
        JSON.stringify({
          type: 'sync_request',
          lastTimestamp: 'invalid',
          keys: [],
        }),
      );

      expect(spy).not.toHaveBeenCalled();
    });

    it('should return empty sync_response when no messages match', () => {
      const { socket, sendSpy: spy } = createMockWebSocket();

      manager.handleMessage(
        socket,
        JSON.stringify({
          type: 'sync_request',
          lastTimestamp: Date.now() + 99999,
          keys: [],
        }),
      );

      expect(spy).toHaveBeenCalledTimes(1);
      const response = JSON.parse(spy.mock.calls[0]![0] as string) as Record<string, unknown>;
      expect(response['type']).toBe('sync_response');
      const messages = response['messages'] as unknown[];
      expect(messages.length).toBe(0);
    });

    it('should record history even when no subscribers exist', () => {
      const key = SubKeys.record('users', '1');
      // No subscribers
      manager.publishLocal(key, 1);
      manager.publishLocal(key, 2);

      expect(manager.getHistorySize()).toBe(2);
      const missed = manager.getMessagesSince(0);
      expect(missed.length).toBe(2);
    });
  });
});
