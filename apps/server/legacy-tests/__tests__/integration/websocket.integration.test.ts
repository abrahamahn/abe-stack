// apps/server/src/__tests__/integration/websocket.integration.test.ts
/**
 * WebSocket Integration Tests
 *
 * Tests WebSocket connection, authentication, subscriptions, and
 * pub/sub message flow through the full system.
 */

import { createAccessToken } from '@auth/utils/jwt';
import { SubscriptionManager, SubKeys } from '@pubsub';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import type { ServerMessage, WebSocket } from '@pubsub';

// ============================================================================
// Test Utilities
// ============================================================================

const TEST_JWT_SECRET = 'test-secret-that-is-at-least-32-chars-long!!';

interface MockWebSocket extends WebSocket {
  messages: string[];
  closed: boolean;
  closeCode?: number;
  closeReason?: string;
  onMessage?: (data: string) => void;
  close(code?: number, reason?: string): void;
}

function createMockWebSocket(): MockWebSocket {
  return {
    readyState: 1, // WebSocket.OPEN
    messages: [],
    closed: false,
    send(data: string): void {
      if (!this.closed && this.readyState === 1) {
        this.messages.push(data);
      }
    },
    close(code?: number, reason?: string): void {
      this.closed = true;
      this.readyState = 3; // WebSocket.CLOSED
      this.closeCode = code;
      this.closeReason = reason;
    },
  };
}

function createValidToken(userId = 'user-test-123'): string {
  return createAccessToken(userId, 'test@example.com', 'user', TEST_JWT_SECRET);
}

// ============================================================================
// Subscription Manager Integration Tests
// ============================================================================

describe('WebSocket Subscription Integration', () => {
  let subscriptionManager: SubscriptionManager;

  beforeEach(() => {
    subscriptionManager = new SubscriptionManager();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Subscription Lifecycle', () => {
    test('should subscribe client to record updates', () => {
      const socket = createMockWebSocket();
      const key = SubKeys.record('users', 'user-123');

      subscriptionManager.subscribe(key, socket);

      expect(subscriptionManager.getSubscriberCount(key)).toBe(1);
      expect(subscriptionManager.getSubscriptionCount()).toBe(1);
    });

    test('should unsubscribe client from record updates', () => {
      const socket = createMockWebSocket();
      const key = SubKeys.record('users', 'user-123');

      subscriptionManager.subscribe(key, socket);
      expect(subscriptionManager.getSubscriberCount(key)).toBe(1);

      subscriptionManager.unsubscribe(key, socket);
      expect(subscriptionManager.getSubscriberCount(key)).toBe(0);
    });

    test('should handle multiple subscriptions for same client', () => {
      const socket = createMockWebSocket();
      const key1 = SubKeys.record('users', 'user-123');
      const key2 = SubKeys.record('posts', 'post-456');

      subscriptionManager.subscribe(key1, socket);
      subscriptionManager.subscribe(key2, socket);

      expect(subscriptionManager.getSubscriberCount(key1)).toBe(1);
      expect(subscriptionManager.getSubscriberCount(key2)).toBe(1);
      expect(subscriptionManager.getSubscriptionCount()).toBe(2);
    });

    test('should handle multiple clients for same subscription key', () => {
      const socket1 = createMockWebSocket();
      const socket2 = createMockWebSocket();
      const key = SubKeys.record('users', 'user-123');

      subscriptionManager.subscribe(key, socket1);
      subscriptionManager.subscribe(key, socket2);

      expect(subscriptionManager.getSubscriberCount(key)).toBe(2);
    });

    test('should cleanup all subscriptions when client disconnects', () => {
      const socket = createMockWebSocket();
      const key1 = SubKeys.record('users', 'user-123');
      const key2 = SubKeys.record('posts', 'post-456');

      subscriptionManager.subscribe(key1, socket);
      subscriptionManager.subscribe(key2, socket);

      subscriptionManager.cleanup(socket);

      expect(subscriptionManager.getSubscriberCount(key1)).toBe(0);
      expect(subscriptionManager.getSubscriberCount(key2)).toBe(0);
      expect(subscriptionManager.getSubscriptionCount()).toBe(0);
    });

    test('should not affect other clients when one disconnects', () => {
      const socket1 = createMockWebSocket();
      const socket2 = createMockWebSocket();
      const key = SubKeys.record('users', 'user-123');

      subscriptionManager.subscribe(key, socket1);
      subscriptionManager.subscribe(key, socket2);

      subscriptionManager.cleanup(socket1);

      expect(subscriptionManager.getSubscriberCount(key)).toBe(1);
    });
  });

  describe('Message Publishing', () => {
    test('should broadcast update to all subscribers', () => {
      const socket1 = createMockWebSocket();
      const socket2 = createMockWebSocket();
      const key = SubKeys.record('users', 'user-123');

      subscriptionManager.subscribe(key, socket1);
      subscriptionManager.subscribe(key, socket2);

      subscriptionManager.publishLocal(key, 5);

      expect(socket1.messages).toHaveLength(1);
      expect(socket2.messages).toHaveLength(1);

      const message1 = JSON.parse(socket1.messages[0]!) as ServerMessage;
      expect(message1).toEqual({
        type: 'update',
        key: 'record:users:user-123',
        version: 5,
      });
    });

    test('should not send to unsubscribed clients', () => {
      const socket1 = createMockWebSocket();
      const socket2 = createMockWebSocket();
      const key = SubKeys.record('users', 'user-123');

      subscriptionManager.subscribe(key, socket1);
      subscriptionManager.subscribe(key, socket2);
      subscriptionManager.unsubscribe(key, socket2);

      subscriptionManager.publishLocal(key, 5);

      expect(socket1.messages).toHaveLength(1);
      expect(socket2.messages).toHaveLength(0);
    });

    test('should skip closed sockets when publishing', () => {
      const socket = createMockWebSocket();
      const key = SubKeys.record('users', 'user-123');

      subscriptionManager.subscribe(key, socket);

      // Close the socket
      socket.readyState = 3; // WebSocket.CLOSED

      subscriptionManager.publishLocal(key, 5);

      expect(socket.messages).toHaveLength(0);
    });

    test('should handle publishing to key with no subscribers', () => {
      const key = SubKeys.record('users', 'nonexistent');

      // Should not throw
      expect(() => {
        subscriptionManager.publishLocal(key, 1);
      }).not.toThrow();
    });

    test('should include version in update message', () => {
      const socket = createMockWebSocket();
      const key = SubKeys.record('posts', 'post-789');

      subscriptionManager.subscribe(key, socket);
      subscriptionManager.publishLocal(key, 42);

      const message = JSON.parse(socket.messages[0]!) as ServerMessage;
      expect(message.version).toBe(42);
    });
  });

  describe('Client Message Handling', () => {
    test('should handle subscribe message', () => {
      const socket = createMockWebSocket();
      const key = SubKeys.record('users', 'user-123');
      const message = JSON.stringify({ type: 'subscribe', key });

      subscriptionManager.handleMessage(socket, message);

      expect(subscriptionManager.getSubscriberCount(key)).toBe(1);
    });

    test('should handle unsubscribe message', () => {
      const socket = createMockWebSocket();
      const key = SubKeys.record('users', 'user-123');

      subscriptionManager.subscribe(key, socket);

      const message = JSON.stringify({ type: 'unsubscribe', key });
      subscriptionManager.handleMessage(socket, message);

      expect(subscriptionManager.getSubscriberCount(key)).toBe(0);
    });

    test('should call onSubscribe callback when subscribing', () => {
      const socket = createMockWebSocket();
      const key = SubKeys.record('users', 'user-123');
      const onSubscribe = vi.fn();

      const message = JSON.stringify({ type: 'subscribe', key });
      subscriptionManager.handleMessage(socket, message, onSubscribe);

      expect(onSubscribe).toHaveBeenCalledWith(key);
    });

    test('should not call onSubscribe for unsubscribe messages', () => {
      const socket = createMockWebSocket();
      const key = SubKeys.record('users', 'user-123');
      const onSubscribe = vi.fn();

      subscriptionManager.subscribe(key, socket);

      const message = JSON.stringify({ type: 'unsubscribe', key });
      subscriptionManager.handleMessage(socket, message, onSubscribe);

      expect(onSubscribe).not.toHaveBeenCalled();
    });

    test('should ignore malformed JSON messages', () => {
      const socket = createMockWebSocket();

      // Should not throw
      expect(() => {
        subscriptionManager.handleMessage(socket, 'not valid json');
      }).not.toThrow();

      expect(subscriptionManager.getSubscriptionCount()).toBe(0);
    });

    test('should ignore messages with unknown type', () => {
      const socket = createMockWebSocket();
      const message = JSON.stringify({ type: 'unknown', key: 'record:users:123' });

      subscriptionManager.handleMessage(socket, message);

      expect(subscriptionManager.getSubscriptionCount()).toBe(0);
    });
  });

  describe('Subscription Key Formats', () => {
    test('should support record subscription key format', () => {
      const socket = createMockWebSocket();
      const key = SubKeys.record('users', 'abc-123-def');

      subscriptionManager.subscribe(key, socket);
      subscriptionManager.publishLocal(key, 1);

      const message = JSON.parse(socket.messages[0]!) as ServerMessage;
      expect(message.key).toBe('record:users:abc-123-def');
    });

    test('should support list subscription key format', () => {
      const socket = createMockWebSocket();
      const key = SubKeys.list('user-123', 'notifications');

      subscriptionManager.subscribe(key, socket);
      subscriptionManager.publishLocal(key, 1);

      const message = JSON.parse(socket.messages[0]!) as ServerMessage;
      expect(message.key).toBe('list:user-123:notifications');
    });

    test('should handle different tables independently', () => {
      const socket = createMockWebSocket();
      const usersKey = SubKeys.record('users', 'user-123');
      const postsKey = SubKeys.record('posts', 'user-123');

      subscriptionManager.subscribe(usersKey, socket);

      // Only publish to posts key
      subscriptionManager.publishLocal(postsKey, 1);

      // Should not receive message (not subscribed to posts)
      expect(socket.messages).toHaveLength(0);
    });
  });
});

// ============================================================================
// JWT Token Integration Tests
// ============================================================================

describe('WebSocket JWT Integration', () => {
  describe('Token Creation', () => {
    test('should create valid access token for WebSocket auth', () => {
      const token = createValidToken('user-123');

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT format: header.payload.signature
    });

    test('should include user info in token payload', () => {
      const token = createAccessToken('user-123', 'test@example.com', 'admin', TEST_JWT_SECRET);

      // Decode payload (middle part of JWT)
      const payload = JSON.parse(atob(token.split('.')[1]!)) as {
        userId: string;
        email: string;
        role: string;
      };

      expect(payload.userId).toBe('user-123');
      expect(payload.email).toBe('test@example.com');
      expect(payload.role).toBe('admin');
    });
  });

  describe('Token for Different User Roles', () => {
    test('should create token for regular user', () => {
      const token = createAccessToken('user-123', 'user@example.com', 'user', TEST_JWT_SECRET);

      const payload = JSON.parse(atob(token.split('.')[1]!)) as { role: string };
      expect(payload.role).toBe('user');
    });

    test('should create token for admin user', () => {
      const token = createAccessToken('admin-123', 'admin@example.com', 'admin', TEST_JWT_SECRET);

      const payload = JSON.parse(atob(token.split('.')[1]!)) as { role: string };
      expect(payload.role).toBe('admin');
    });
  });
});

// ============================================================================
// WebSocket Message Format Tests
// ============================================================================

describe('WebSocket Message Formats', () => {
  let subscriptionManager: SubscriptionManager;

  beforeEach(() => {
    subscriptionManager = new SubscriptionManager();
  });

  describe('Server Message Format', () => {
    test('should send messages in correct JSON format', () => {
      const socket = createMockWebSocket();
      const key = SubKeys.record('users', 'user-123');

      subscriptionManager.subscribe(key, socket);
      subscriptionManager.publishLocal(key, 1);

      // Verify it's valid JSON
      expect(() => JSON.parse(socket.messages[0]!)).not.toThrow();
    });

    test('update message should have required fields', () => {
      const socket = createMockWebSocket();
      const key = SubKeys.record('users', 'user-123');

      subscriptionManager.subscribe(key, socket);
      subscriptionManager.publishLocal(key, 10);

      const message = JSON.parse(socket.messages[0]!) as ServerMessage;
      expect(message).toHaveProperty('type', 'update');
      expect(message).toHaveProperty('key');
      expect(message).toHaveProperty('version');
    });
  });

  describe('Client Message Parsing', () => {
    test('should parse valid subscribe message', () => {
      const socket = createMockWebSocket();
      const clientMessage = {
        type: 'subscribe',
        key: 'record:users:user-123',
      };

      subscriptionManager.handleMessage(socket, JSON.stringify(clientMessage));

      expect(subscriptionManager.getSubscriberCount('record:users:user-123')).toBe(1);
    });

    test('should parse valid unsubscribe message', () => {
      const socket = createMockWebSocket();
      const key = 'record:users:user-123';

      subscriptionManager.subscribe(key, socket);

      const clientMessage = {
        type: 'unsubscribe',
        key,
      };

      subscriptionManager.handleMessage(socket, JSON.stringify(clientMessage));

      expect(subscriptionManager.getSubscriberCount(key)).toBe(0);
    });

    test('should handle empty message gracefully', () => {
      const socket = createMockWebSocket();

      expect(() => {
        subscriptionManager.handleMessage(socket, '');
      }).not.toThrow();
    });

    test('should handle null-like values gracefully', () => {
      const socket = createMockWebSocket();

      expect(() => {
        subscriptionManager.handleMessage(socket, 'null');
      }).not.toThrow();

      expect(() => {
        subscriptionManager.handleMessage(socket, 'undefined');
      }).not.toThrow();
    });
  });
});

// ============================================================================
// Concurrent Operations Tests
// ============================================================================

describe('WebSocket Concurrent Operations', () => {
  let subscriptionManager: SubscriptionManager;

  beforeEach(() => {
    subscriptionManager = new SubscriptionManager();
  });

  test('should handle rapid subscribe/unsubscribe cycles', () => {
    const socket = createMockWebSocket();
    const key = SubKeys.record('users', 'user-123');

    // Rapid cycles
    for (let i = 0; i < 100; i++) {
      subscriptionManager.subscribe(key, socket);
      subscriptionManager.unsubscribe(key, socket);
    }

    expect(subscriptionManager.getSubscriberCount(key)).toBe(0);
  });

  test('should handle many simultaneous subscribers', () => {
    const sockets = Array.from({ length: 100 }, () => createMockWebSocket());
    const key = SubKeys.record('users', 'user-123');

    // Subscribe all
    for (const socket of sockets) {
      subscriptionManager.subscribe(key, socket);
    }

    expect(subscriptionManager.getSubscriberCount(key)).toBe(100);

    // Publish and verify all receive
    subscriptionManager.publishLocal(key, 1);

    for (const socket of sockets) {
      expect(socket.messages).toHaveLength(1);
    }
  });

  test('should handle many subscription keys', () => {
    const socket = createMockWebSocket();

    // Subscribe to many keys
    for (let i = 0; i < 100; i++) {
      const key = SubKeys.record('users', `user-${String(i)}`);
      subscriptionManager.subscribe(key, socket);
    }

    expect(subscriptionManager.getSubscriptionCount()).toBe(100);

    // Cleanup should remove all
    subscriptionManager.cleanup(socket);

    expect(subscriptionManager.getSubscriptionCount()).toBe(0);
  });

  test('should handle mixed operations correctly', () => {
    const sockets = Array.from({ length: 10 }, () => createMockWebSocket());
    const keys = Array.from({ length: 5 }, (_, i) => SubKeys.record('users', `user-${String(i)}`));

    // Subscribe some sockets to some keys
    for (let i = 0; i < sockets.length; i++) {
      const socket = sockets[i]!;
      const key = keys[i % keys.length]!;
      subscriptionManager.subscribe(key, socket);
    }

    // Unsubscribe half
    for (let i = 0; i < sockets.length / 2; i++) {
      const socket = sockets[i]!;
      const key = keys[i % keys.length]!;
      subscriptionManager.unsubscribe(key, socket);
    }

    // Should have remaining subscriptions
    expect(subscriptionManager.getSubscriptionCount()).toBeGreaterThan(0);
  });
});

// ============================================================================
// Edge Cases
// ============================================================================

describe('WebSocket Edge Cases', () => {
  let subscriptionManager: SubscriptionManager;

  beforeEach(() => {
    subscriptionManager = new SubscriptionManager();
  });

  test('should handle double subscribe idempotently', () => {
    const socket = createMockWebSocket();
    const key = SubKeys.record('users', 'user-123');

    subscriptionManager.subscribe(key, socket);
    subscriptionManager.subscribe(key, socket);

    // Same socket should only be counted once
    expect(subscriptionManager.getSubscriberCount(key)).toBe(1);
  });

  test('should handle unsubscribe without subscribe', () => {
    const socket = createMockWebSocket();
    const key = SubKeys.record('users', 'user-123');

    // Should not throw
    expect(() => {
      subscriptionManager.unsubscribe(key, socket);
    }).not.toThrow();
  });

  test('should handle cleanup without any subscriptions', () => {
    const socket = createMockWebSocket();

    // Should not throw
    expect(() => {
      subscriptionManager.cleanup(socket);
    }).not.toThrow();
  });

  test('should propagate error when socket.send throws', () => {
    const socket = createMockWebSocket();
    const key = SubKeys.record('users', 'user-123');

    subscriptionManager.subscribe(key, socket);

    // Make send throw
    socket.send = (): void => {
      throw new Error('Send failed');
    };

    // Implementation lets send errors propagate (caller's responsibility to handle)
    expect(() => {
      subscriptionManager.publishLocal(key, 1);
    }).toThrow('Send failed');
  });

  test('should handle keys with special characters in ID', () => {
    const socket = createMockWebSocket();
    const key = SubKeys.record('users', 'user-with-dashes-123');

    subscriptionManager.subscribe(key, socket);
    subscriptionManager.publishLocal(key, 1);

    const message = JSON.parse(socket.messages[0]!) as ServerMessage;
    expect(message.key).toBe('record:users:user-with-dashes-123');
  });

  test('should handle UUID-format IDs', () => {
    const socket = createMockWebSocket();
    const uuid = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
    const key = SubKeys.record('users', uuid);

    subscriptionManager.subscribe(key, socket);
    subscriptionManager.publishLocal(key, 1);

    const message = JSON.parse(socket.messages[0]!) as ServerMessage;
    expect(message.key).toBe(`record:users:${uuid}`);
  });
});
