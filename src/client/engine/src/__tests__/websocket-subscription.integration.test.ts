// client/src/__tests__/integration/websocket-subscription.integration.test.ts
/** @vitest-environment jsdom */
/**
 * Integration tests for WebsocketPubsubClient + SubscriptionCache working together.
 *
 * Tests the pattern where SubscriptionCache manages subscription lifecycle
 * and WebsocketPubsubClient handles the actual WebSocket communication.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RecordCache, type TableMap } from '../cache/RecordCache';
import { SubscriptionCache } from '../realtime/SubscriptionCache';
import {
  WebsocketPubsubClient,
  type ClientPubsubMessage,
  type ServerPubsubMessage,
} from '../realtime/WebsocketPubsubClient';

// ============================================================================
// Test Types
// ============================================================================

interface User {
  id: string;
  version: number;
  name: string;
  email: string;
}

interface TestTables extends TableMap {
  user: User;
}

// ============================================================================
// Mock WebSocket
// ============================================================================

const WS_CONNECTING = 0;
const WS_OPEN = 1;
const WS_CLOSED = 3;

class MockWebSocket {
  url: string;
  readyState: number = WS_CONNECTING;

  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent<string>) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;

  private readonly sentMessages: string[] = [];

  constructor(url: string) {
    this.url = url;
    // Simulate async connection
    setTimeout(() => {
      if (this.readyState === WS_CONNECTING) {
        this.readyState = WS_OPEN;
        this.onopen?.(new Event('open'));
      }
    }, 0);
  }

  send(data: string): void {
    if (this.readyState !== WS_OPEN) {
      throw new Error('WebSocket is not open');
    }
    this.sentMessages.push(data);
  }

  close(): void {
    this.readyState = WS_CLOSED;
    this.onclose?.(new CloseEvent('close'));
  }

  // Test helpers
  getSentMessages(): ClientPubsubMessage[] {
    return this.sentMessages.map((msg) => JSON.parse(msg) as ClientPubsubMessage);
  }

  simulateMessage(message: ServerPubsubMessage): void {
    this.onmessage?.(new MessageEvent('message', { data: JSON.stringify(message) }));
  }

  forceConnect(): void {
    this.readyState = WS_OPEN;
    this.onopen?.(new Event('open'));
  }

  simulateDisconnect(): void {
    this.readyState = WS_CLOSED;
    this.onclose?.(new CloseEvent('close'));
  }
}

let mockWebSocketInstances: MockWebSocket[] = [];

function createMockWebSocket(url: string): MockWebSocket {
  const ws = new MockWebSocket(url);
  mockWebSocketInstances.push(ws);
  return ws;
}

// ============================================================================
// Test Helpers
// ============================================================================

interface PubsubSystem {
  cache: RecordCache<TestTables>;
  subscriptionCache: SubscriptionCache;
  pubsub: WebsocketPubsubClient;
  subscribeKeys: string[];
  unsubscribeKeys: string[];
}

function createPubsubSystem(): PubsubSystem {
  const cache = new RecordCache<TestTables>();
  const subscribeKeys: string[] = [];
  const unsubscribeKeys: string[] = [];

  const subscriptionCache = new SubscriptionCache({
    onSubscribe: (key: string) => {
      subscribeKeys.push(key);
    },
    onUnsubscribe: (key: string) => {
      unsubscribeKeys.push(key);
    },
    cleanupDelayMs: 10, // Short delay for testing
  });

  const pubsub = new WebsocketPubsubClient({
    host: 'localhost:3000',
    secure: false,
    WebSocketImpl: createMockWebSocket as unknown as typeof WebSocket,
    onMessage: (key: string, value: unknown) => {
      // Parse key: "table:id"
      const [table, id] = key.split(':');
      if (
        table === null ||
        table === undefined ||
        table === '' ||
        id === null ||
        id === undefined ||
        id === ''
      )
        return;

      // Validate value
      if (typeof value !== 'object' || value === null) return;

      // Update cache
      const record = value as User;
      cache.set(table as 'user', id, record);
    },
    onConnect: () => {
      // Resubscribe to all active subscriptions
      for (const key of subscriptionCache.keys()) {
        pubsub.subscribe(key);
      }
    },
  });

  return { cache, subscriptionCache, pubsub, subscribeKeys, unsubscribeKeys };
}

// ============================================================================
// Tests
// ============================================================================

describe('WebsocketPubsubClient + SubscriptionCache Integration', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockWebSocketInstances = [];
    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('subscription lifecycle', () => {
    it('should subscribe via SubscriptionCache and forward to WebSocket', async () => {
      const { subscriptionCache, pubsub, subscribeKeys } = createPubsubSystem();

      await vi.advanceTimersByTimeAsync(0);

      // Wire up subscription cache to pubsub
      subscriptionCache['options'].onSubscribe = (key: string) => {
        subscribeKeys.push(key);
        pubsub.subscribe(key);
      };

      // Subscribe via cache
      const unsubscribe = subscriptionCache.subscribe('user:u1');

      expect(subscribeKeys).toContain('user:u1');
      expect(subscriptionCache.getCount('user:u1')).toBe(1);

      // Check WebSocket received the message
      const ws = mockWebSocketInstances[0];
      const messages = ws?.getSentMessages() ?? [];
      expect(messages).toContainEqual({ type: 'subscribe', key: 'user:u1' });

      // Cleanup
      unsubscribe();
      pubsub.close();
    });

    it('should ref-count multiple subscriptions to same key', async () => {
      const { subscriptionCache, pubsub, subscribeKeys } = createPubsubSystem();

      await vi.advanceTimersByTimeAsync(0);

      subscriptionCache['options'].onSubscribe = (key: string) => {
        subscribeKeys.push(key);
        pubsub.subscribe(key);
      };

      // Multiple subscribers
      const unsub1 = subscriptionCache.subscribe('user:u1');
      const unsub2 = subscriptionCache.subscribe('user:u1');
      const unsub3 = subscriptionCache.subscribe('user:u1');

      expect(subscriptionCache.getCount('user:u1')).toBe(3);

      // Should only have sent one subscribe message
      const ws = mockWebSocketInstances[0];
      const messages = ws?.getSentMessages() ?? [];
      const subscribeMessages = messages.filter(
        (m) => m.type === 'subscribe' && m.key === 'user:u1',
      );
      expect(subscribeMessages).toHaveLength(1);

      // Cleanup
      unsub1();
      unsub2();
      unsub3();
      pubsub.close();
    });

    it('should unsubscribe only after all refs removed and delay passed', async () => {
      const { subscriptionCache, pubsub, subscribeKeys, unsubscribeKeys } = createPubsubSystem();

      await vi.advanceTimersByTimeAsync(0);

      subscriptionCache['options'].onSubscribe = (key: string) => {
        subscribeKeys.push(key);
        pubsub.subscribe(key);
      };
      subscriptionCache['options'].onUnsubscribe = (key: string) => {
        unsubscribeKeys.push(key);
        pubsub.unsubscribe(key);
      };

      // Subscribe
      const unsub1 = subscriptionCache.subscribe('user:u1');
      const unsub2 = subscriptionCache.subscribe('user:u1');

      // Unsubscribe one
      unsub1();

      // Not yet unsubscribed (still has a ref)
      await vi.advanceTimersByTimeAsync(20);
      expect(subscriptionCache.has('user:u1')).toBe(true);
      expect(unsubscribeKeys).not.toContain('user:u1');

      // Unsubscribe second
      unsub2();

      // Wait for cleanup delay
      await vi.advanceTimersByTimeAsync(20);

      expect(subscriptionCache.has('user:u1')).toBe(false);
      expect(unsubscribeKeys).toContain('user:u1');

      pubsub.close();
    });
  });

  describe('message handling and cache updates', () => {
    it('should update cache when receiving messages', async () => {
      const { cache, subscriptionCache, pubsub } = createPubsubSystem();

      await vi.advanceTimersByTimeAsync(0);

      // Subscribe
      subscriptionCache.subscribe('user:u1');

      // Verify cache is empty before message
      expect(cache.get('user', 'u1')).toBeUndefined();

      // Simulate server message
      const ws = mockWebSocketInstances[0];
      const user: User = { id: 'u1', version: 1, name: 'Alice', email: 'alice@test.com' };
      ws?.simulateMessage({ type: 'update', key: 'user:u1', value: user });

      // Cache should be updated with all fields
      const cached = cache.get('user', 'u1');
      expect(cached).toEqual(user);
      expect(cached?.id).toBe('u1');
      expect(cached?.version).toBe(1);
      expect(cached?.name).toBe('Alice');
      expect(cached?.email).toBe('alice@test.com');

      pubsub.close();
    });

    it('should update cache with newer versions only', async () => {
      const { cache, pubsub } = createPubsubSystem();

      await vi.advanceTimersByTimeAsync(0);

      const ws = mockWebSocketInstances[0];

      // Receive v2 first
      const userV2: User = { id: 'u1', version: 2, name: 'Alice V2', email: 'alice@test.com' };
      ws?.simulateMessage({ type: 'update', key: 'user:u1', value: userV2 });

      expect(cache.get('user', 'u1')?.version).toBe(2);

      // Receive v1 (stale) - should be rejected by cache
      const userV1: User = { id: 'u1', version: 1, name: 'Alice V1', email: 'alice@test.com' };
      ws?.simulateMessage({ type: 'update', key: 'user:u1', value: userV1 });

      // Still v2
      expect(cache.get('user', 'u1')?.version).toBe(2);
      expect(cache.get('user', 'u1')?.name).toBe('Alice V2');

      pubsub.close();
    });

    it('should handle messages for multiple subscriptions', async () => {
      const { cache, subscriptionCache, pubsub } = createPubsubSystem();

      await vi.advanceTimersByTimeAsync(0);

      // Subscribe to multiple keys
      subscriptionCache.subscribe('user:u1');
      subscriptionCache.subscribe('user:u2');
      subscriptionCache.subscribe('user:u3');

      const ws = mockWebSocketInstances[0];

      // Receive updates
      ws?.simulateMessage({
        type: 'update',
        key: 'user:u1',
        value: { id: 'u1', version: 1, name: 'Alice', email: 'a@test.com' },
      });
      ws?.simulateMessage({
        type: 'update',
        key: 'user:u2',
        value: { id: 'u2', version: 1, name: 'Bob', email: 'b@test.com' },
      });
      ws?.simulateMessage({
        type: 'update',
        key: 'user:u3',
        value: { id: 'u3', version: 1, name: 'Charlie', email: 'c@test.com' },
      });

      expect(cache.get('user', 'u1')?.name).toBe('Alice');
      expect(cache.get('user', 'u2')?.name).toBe('Bob');
      expect(cache.get('user', 'u3')?.name).toBe('Charlie');

      pubsub.close();
    });

    it('should ignore messages with invalid key format', async () => {
      const { cache, pubsub } = createPubsubSystem();

      await vi.advanceTimersByTimeAsync(0);

      const ws = mockWebSocketInstances[0];

      // Invalid key (no colon)
      ws?.simulateMessage({
        type: 'update',
        key: 'invalid',
        value: { id: 'u1', version: 1, name: 'Alice', email: 'a@test.com' },
      });

      expect(cache.getTables()).toHaveLength(0);

      pubsub.close();
    });

    it('should ignore messages with non-object values', async () => {
      const { cache, pubsub } = createPubsubSystem();

      await vi.advanceTimersByTimeAsync(0);

      const ws = mockWebSocketInstances[0];

      // Null value
      ws?.simulateMessage({ type: 'update', key: 'user:u1', value: null });
      expect(cache.get('user', 'u1')).toBeUndefined();

      // String value
      ws?.simulateMessage({ type: 'update', key: 'user:u2', value: 'string' });
      expect(cache.get('user', 'u2')).toBeUndefined();

      // Number value
      ws?.simulateMessage({ type: 'update', key: 'user:u3', value: 123 });
      expect(cache.get('user', 'u3')).toBeUndefined();

      pubsub.close();
    });

    it('should process messages in order and preserve latest version', async () => {
      const { cache, pubsub } = createPubsubSystem();

      await vi.advanceTimersByTimeAsync(0);

      const ws = mockWebSocketInstances[0];

      // Simulate a series of rapid updates with incrementing versions
      const updates = [
        { id: 'u1', version: 1, name: 'Alice v1', email: 'alice@test.com' },
        { id: 'u1', version: 2, name: 'Alice v2', email: 'alice@test.com' },
        { id: 'u1', version: 3, name: 'Alice v3', email: 'alice@test.com' },
        { id: 'u1', version: 4, name: 'Alice v4', email: 'alice@test.com' },
      ];

      for (const update of updates) {
        ws?.simulateMessage({ type: 'update', key: 'user:u1', value: update });
      }

      // Cache should have the highest version
      const cached = cache.get('user', 'u1');
      expect(cached?.version).toBe(4);
      expect(cached?.name).toBe('Alice v4');

      // Out-of-order update should be rejected
      ws?.simulateMessage({
        type: 'update',
        key: 'user:u1',
        value: { id: 'u1', version: 2, name: 'Alice stale', email: 'alice@test.com' },
      });
      expect(cache.get('user', 'u1')?.version).toBe(4);
      expect(cache.get('user', 'u1')?.name).toBe('Alice v4');

      pubsub.close();
    });
  });

  describe('reconnection handling', () => {
    it('should resubscribe to all keys on reconnect', async () => {
      const { subscriptionCache, pubsub, subscribeKeys } = createPubsubSystem();

      await vi.advanceTimersByTimeAsync(0);

      // Wire up
      subscriptionCache['options'].onSubscribe = (key: string) => {
        subscribeKeys.push(key);
        pubsub.subscribe(key);
      };

      // Subscribe to multiple keys
      subscriptionCache.subscribe('user:u1');
      subscriptionCache.subscribe('user:u2');

      const ws1 = mockWebSocketInstances[0];
      expect(ws1?.getSentMessages().filter((m) => m.type === 'subscribe')).toHaveLength(2);

      // Simulate disconnect
      ws1?.simulateDisconnect();

      // Wait for reconnect
      await vi.advanceTimersByTimeAsync(1000);

      // New WebSocket should be created
      expect(mockWebSocketInstances.length).toBe(2);
      const ws2 = mockWebSocketInstances[1];
      ws2?.forceConnect();

      // Should have resubscribed (onConnect callback)
      const ws2Messages = ws2?.getSentMessages() ?? [];
      const resubscribes = ws2Messages.filter((m) => m.type === 'subscribe');
      expect(resubscribes).toHaveLength(2);
      expect(resubscribes.map((m) => m.key).sort()).toEqual(['user:u1', 'user:u2']);

      pubsub.close();
    });
  });

  describe('cache listeners with subscriptions', () => {
    it('should trigger cache listeners when messages update cache', async () => {
      const { cache, pubsub } = createPubsubSystem();
      const listener = vi.fn();

      await vi.advanceTimersByTimeAsync(0);

      // Subscribe to cache changes
      cache.subscribe('user', 'u1', listener);

      // Simulate server message
      const ws = mockWebSocketInstances[0];
      const user: User = { id: 'u1', version: 1, name: 'Alice', email: 'alice@test.com' };
      ws?.simulateMessage({ type: 'update', key: 'user:u1', value: user });

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          table: 'user',
          id: 'u1',
          after: user,
        }),
      );

      pubsub.close();
    });
  });

  describe('subscription cache cleanup', () => {
    it('should handle clear operation correctly', async () => {
      const { subscriptionCache, pubsub, unsubscribeKeys } = createPubsubSystem();

      await vi.advanceTimersByTimeAsync(0);

      subscriptionCache['options'].onUnsubscribe = (key: string) => {
        unsubscribeKeys.push(key);
        pubsub.unsubscribe(key);
      };

      // Subscribe to multiple keys
      subscriptionCache.subscribe('user:u1');
      subscriptionCache.subscribe('user:u2');

      // Clear all
      subscriptionCache.clear();

      expect(subscriptionCache.keys()).toHaveLength(0);
      expect(unsubscribeKeys).toContain('user:u1');
      expect(unsubscribeKeys).toContain('user:u2');

      pubsub.close();
    });

    it('should handle forceUnsubscribe correctly', async () => {
      const { subscriptionCache, pubsub, unsubscribeKeys } = createPubsubSystem();

      await vi.advanceTimersByTimeAsync(0);

      subscriptionCache['options'].onUnsubscribe = (key: string) => {
        unsubscribeKeys.push(key);
        pubsub.unsubscribe(key);
      };

      // Subscribe
      subscriptionCache.subscribe('user:u1');
      subscriptionCache.subscribe('user:u1');

      // Force unsubscribe (bypasses ref counting)
      subscriptionCache.forceUnsubscribe('user:u1');

      expect(subscriptionCache.has('user:u1')).toBe(false);
      expect(unsubscribeKeys).toContain('user:u1');

      pubsub.close();
    });
  });

  describe('connection state coordination', () => {
    it('should coordinate connection state with subscriptions', async () => {
      const connectionStates: string[] = [];

      const pubsub = new WebsocketPubsubClient({
        host: 'localhost:3000',
        secure: false,
        WebSocketImpl: createMockWebSocket as unknown as typeof WebSocket,
        onMessage: () => {},
        onConnect: () => {
          connectionStates.push('connected');
        },
        onDisconnect: () => {
          connectionStates.push('disconnected');
        },
        // Disable auto-reconnect for this test
        maxReconnectAttempts: 0,
      });

      // Initial state
      expect(pubsub.getConnectionState()).toBe('connecting');

      // Wait for connection
      await vi.advanceTimersByTimeAsync(0);
      expect(pubsub.getConnectionState()).toBe('connected');
      expect(connectionStates).toContain('connected');

      // Disconnect - with maxReconnectAttempts=0, it should stay disconnected
      const ws = mockWebSocketInstances[0];
      ws?.simulateDisconnect();

      // The onDisconnect callback should have been called
      expect(connectionStates).toContain('disconnected');

      pubsub.close();
    });
  });
});
