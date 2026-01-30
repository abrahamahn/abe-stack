// packages/sdk/src/realtime/WebsocketPubsubClient.test.ts
/** @vitest-environment jsdom */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import {
  WebsocketPubsubClient,
  type ClientPubsubMessage,
  type ServerPubsubMessage,
} from './WebsocketPubsubClient';

/**
 * Mock WebSocket implementation for testing
 */
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  url: string;
  readyState: number = MockWebSocket.CONNECTING;

  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent<string>) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;

  private sentMessages: string[] = [];

  constructor(url: string) {
    this.url = url;
    // Simulate async connection
    setTimeout(() => {
      if (this.readyState === MockWebSocket.CONNECTING) {
        this.readyState = MockWebSocket.OPEN;
        this.onopen?.(new Event('open'));
      }
    }, 0);
  }

  send(data: string): void {
    if (this.readyState !== MockWebSocket.OPEN) {
      throw new Error('WebSocket is not open');
    }
    this.sentMessages.push(data);
  }

  close(): void {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.(new CloseEvent('close'));
  }

  // Test helpers
  getSentMessages(): ClientPubsubMessage[] {
    return this.sentMessages.map((msg) => JSON.parse(msg) as ClientPubsubMessage);
  }

  simulateMessage(message: ServerPubsubMessage): void {
    this.onmessage?.(new MessageEvent('message', { data: JSON.stringify(message) }));
  }

  simulateError(): void {
    this.onerror?.(new Event('error'));
  }

  simulateClose(): void {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.(new CloseEvent('close'));
  }

  // Prevent auto-connect for specific tests
  preventAutoConnect(): void {
    this.readyState = MockWebSocket.CONNECTING;
  }

  // Force connect for tests
  forceConnect(): void {
    this.readyState = MockWebSocket.OPEN;
    this.onopen?.(new Event('open'));
  }
}

// Store instances for test access
let mockWebSocketInstances: MockWebSocket[] = [];

function createMockWebSocket(url: string): MockWebSocket {
  const ws = new MockWebSocket(url);
  mockWebSocketInstances.push(ws);
  return ws;
}

describe('WebsocketPubsubClient', () => {
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

  describe('connection', () => {
    it('should connect to the correct WebSocket URL', async () => {
      const onMessage = vi.fn();
      const _client = new WebsocketPubsubClient({
        host: 'localhost:3000',
        onMessage,
        WebSocketImpl: createMockWebSocket as unknown as typeof WebSocket,
        secure: false,
      });

      expect(mockWebSocketInstances.length).toBe(1);
      expect(mockWebSocketInstances[0]?.url).toBe('ws://localhost:3000/ws');
    });

    it('should use secure WebSocket when secure is true', async () => {
      const onMessage = vi.fn();
      const _client = new WebsocketPubsubClient({
        host: 'localhost:3000',
        onMessage,
        WebSocketImpl: createMockWebSocket as unknown as typeof WebSocket,
        secure: true,
      });

      expect(mockWebSocketInstances[0]?.url).toBe('wss://localhost:3000/ws');
    });

    it('should call onConnect when connection is established', async () => {
      const onConnect = vi.fn();
      const _client = new WebsocketPubsubClient({
        host: 'localhost:3000',
        onMessage: vi.fn(),
        onConnect,
        WebSocketImpl: createMockWebSocket as unknown as typeof WebSocket,
        secure: false,
      });

      expect(onConnect).not.toHaveBeenCalled();

      // Trigger the connection
      await vi.advanceTimersByTimeAsync(0);

      expect(onConnect).toHaveBeenCalledTimes(1);
    });

    it('should return connected state after connection', async () => {
      const client = new WebsocketPubsubClient({
        host: 'localhost:3000',
        onMessage: vi.fn(),
        WebSocketImpl: createMockWebSocket as unknown as typeof WebSocket,
        secure: false,
      });

      expect(client.getConnectionState()).toBe('connecting');
      expect(client.isConnected()).toBe(false);

      await vi.advanceTimersByTimeAsync(0);

      expect(client.getConnectionState()).toBe('connected');
      expect(client.isConnected()).toBe(true);
    });
  });

  describe('subscribe/unsubscribe', () => {
    it('should send subscribe message when connected', async () => {
      const client = new WebsocketPubsubClient({
        host: 'localhost:3000',
        onMessage: vi.fn(),
        WebSocketImpl: createMockWebSocket as unknown as typeof WebSocket,
        secure: false,
      });

      await vi.advanceTimersByTimeAsync(0);

      client.subscribe('user:123');

      const messages = mockWebSocketInstances[0]?.getSentMessages();
      expect(messages).toEqual([{ type: 'subscribe', key: 'user:123' }]);
    });

    it('should send unsubscribe message when connected', async () => {
      const client = new WebsocketPubsubClient({
        host: 'localhost:3000',
        onMessage: vi.fn(),
        WebSocketImpl: createMockWebSocket as unknown as typeof WebSocket,
        secure: false,
      });

      await vi.advanceTimersByTimeAsync(0);

      client.subscribe('user:123');
      client.unsubscribe('user:123');

      const messages = mockWebSocketInstances[0]?.getSentMessages();
      expect(messages).toEqual([
        { type: 'subscribe', key: 'user:123' },
        { type: 'unsubscribe', key: 'user:123' },
      ]);
    });

    it('should not send messages when not connected', () => {
      const client = new WebsocketPubsubClient({
        host: 'localhost:3000',
        onMessage: vi.fn(),
        WebSocketImpl: createMockWebSocket as unknown as typeof WebSocket,
        secure: false,
      });

      // Don't advance timers - still connecting
      client.subscribe('user:123');

      const messages = mockWebSocketInstances[0]?.getSentMessages();
      expect(messages).toEqual([]);
    });
  });

  describe('message handling', () => {
    it('should call onMessage when receiving a message', async () => {
      const onMessage = vi.fn();
      const _client = new WebsocketPubsubClient({
        host: 'localhost:3000',
        onMessage,
        WebSocketImpl: createMockWebSocket as unknown as typeof WebSocket,
        secure: false,
      });

      await vi.advanceTimersByTimeAsync(0);

      const ws = mockWebSocketInstances[0];
      ws?.simulateMessage({ type: 'update', key: 'user:123', value: { name: 'John' } });

      expect(onMessage).toHaveBeenCalledTimes(1);
      expect(onMessage).toHaveBeenCalledWith('user:123', { name: 'John' });
    });

    it('should handle multiple messages', async () => {
      const onMessage = vi.fn();
      const _client = new WebsocketPubsubClient({
        host: 'localhost:3000',
        onMessage,
        WebSocketImpl: createMockWebSocket as unknown as typeof WebSocket,
        secure: false,
      });

      await vi.advanceTimersByTimeAsync(0);

      const ws = mockWebSocketInstances[0];
      ws?.simulateMessage({ type: 'update', key: 'user:1', value: 'a' });
      ws?.simulateMessage({ type: 'update', key: 'user:2', value: 'b' });
      ws?.simulateMessage({ type: 'update', key: 'user:3', value: 'c' });

      expect(onMessage).toHaveBeenCalledTimes(3);
      expect(onMessage).toHaveBeenNthCalledWith(1, 'user:1', 'a');
      expect(onMessage).toHaveBeenNthCalledWith(2, 'user:2', 'b');
      expect(onMessage).toHaveBeenNthCalledWith(3, 'user:3', 'c');
    });
  });

  describe('reconnection', () => {
    it('should attempt to reconnect after disconnect', async () => {
      const _client = new WebsocketPubsubClient({
        host: 'localhost:3000',
        onMessage: vi.fn(),
        WebSocketImpl: createMockWebSocket as unknown as typeof WebSocket,
        secure: false,
        baseReconnectDelayMs: 1000,
      });

      await vi.advanceTimersByTimeAsync(0);
      expect(mockWebSocketInstances.length).toBe(1);

      // Simulate disconnect
      mockWebSocketInstances[0]?.simulateClose();

      // Advance past reconnect delay (1000ms * 2^0 = 1000ms)
      await vi.advanceTimersByTimeAsync(1000);

      expect(mockWebSocketInstances.length).toBe(2);
    });

    it('should use exponential backoff for reconnection', async () => {
      const _client = new WebsocketPubsubClient({
        host: 'localhost:3000',
        onMessage: vi.fn(),
        WebSocketImpl: createMockWebSocket as unknown as typeof WebSocket,
        secure: false,
        baseReconnectDelayMs: 1000,
      });

      await vi.advanceTimersByTimeAsync(0);

      // First disconnect
      mockWebSocketInstances[0]?.simulateClose();

      // First reconnect: 1000ms * 2^0 = 1000ms
      await vi.advanceTimersByTimeAsync(1000);
      expect(mockWebSocketInstances.length).toBe(2);

      // Second disconnect
      mockWebSocketInstances[1]?.simulateClose();

      // Second reconnect: 1000ms * 2^1 = 2000ms
      await vi.advanceTimersByTimeAsync(1000);
      expect(mockWebSocketInstances.length).toBe(2); // Not yet

      await vi.advanceTimersByTimeAsync(1000);
      expect(mockWebSocketInstances.length).toBe(3);
    });

    it('should reset reconnect attempts after successful connection', async () => {
      const _client = new WebsocketPubsubClient({
        host: 'localhost:3000',
        onMessage: vi.fn(),
        WebSocketImpl: createMockWebSocket as unknown as typeof WebSocket,
        secure: false,
        baseReconnectDelayMs: 1000,
      });

      await vi.advanceTimersByTimeAsync(0);

      // First disconnect and reconnect
      mockWebSocketInstances[0]?.simulateClose();
      await vi.advanceTimersByTimeAsync(1000);
      expect(mockWebSocketInstances.length).toBe(2);

      // Connect successfully
      mockWebSocketInstances[1]?.forceConnect();

      // Disconnect again
      mockWebSocketInstances[1]?.simulateClose();

      // Should use base delay again (1000ms), not 2000ms
      await vi.advanceTimersByTimeAsync(1000);
      expect(mockWebSocketInstances.length).toBe(3);
    });

    it('should respect maxReconnectAttempts', async () => {
      const _client = new WebsocketPubsubClient({
        host: 'localhost:3000',
        onMessage: vi.fn(),
        WebSocketImpl: createMockWebSocket as unknown as typeof WebSocket,
        secure: false,
        baseReconnectDelayMs: 100,
        maxReconnectAttempts: 2,
      });

      await vi.advanceTimersByTimeAsync(0);

      // First disconnect
      mockWebSocketInstances[0]?.simulateClose();
      await vi.advanceTimersByTimeAsync(100);
      expect(mockWebSocketInstances.length).toBe(2);

      // Second disconnect
      mockWebSocketInstances[1]?.simulateClose();
      await vi.advanceTimersByTimeAsync(200);
      expect(mockWebSocketInstances.length).toBe(3);

      // Third disconnect - should not reconnect (max 2 attempts)
      mockWebSocketInstances[2]?.simulateClose();
      await vi.advanceTimersByTimeAsync(10000);
      expect(mockWebSocketInstances.length).toBe(3);
    });

    it('should call onDisconnect when connection closes', async () => {
      const onDisconnect = vi.fn();
      const _client = new WebsocketPubsubClient({
        host: 'localhost:3000',
        onMessage: vi.fn(),
        onDisconnect,
        WebSocketImpl: createMockWebSocket as unknown as typeof WebSocket,
        secure: false,
      });

      await vi.advanceTimersByTimeAsync(0);

      mockWebSocketInstances[0]?.simulateClose();

      expect(onDisconnect).toHaveBeenCalledTimes(1);
    });
  });

  describe('close', () => {
    it('should close the connection', async () => {
      const client = new WebsocketPubsubClient({
        host: 'localhost:3000',
        onMessage: vi.fn(),
        WebSocketImpl: createMockWebSocket as unknown as typeof WebSocket,
        secure: false,
      });

      await vi.advanceTimersByTimeAsync(0);
      expect(client.isConnected()).toBe(true);

      client.close();

      expect(client.isConnected()).toBe(false);
      expect(client.getConnectionState()).toBe('disconnected');
    });

    it('should not attempt to reconnect after close', async () => {
      const client = new WebsocketPubsubClient({
        host: 'localhost:3000',
        onMessage: vi.fn(),
        WebSocketImpl: createMockWebSocket as unknown as typeof WebSocket,
        secure: false,
        baseReconnectDelayMs: 100,
      });

      await vi.advanceTimersByTimeAsync(0);

      client.close();

      // Wait for potential reconnect
      await vi.advanceTimersByTimeAsync(10000);

      // Should still be only 1 instance
      expect(mockWebSocketInstances.length).toBe(1);
    });
  });

  describe('reconnect', () => {
    it('should allow manual reconnection after close', async () => {
      const client = new WebsocketPubsubClient({
        host: 'localhost:3000',
        onMessage: vi.fn(),
        WebSocketImpl: createMockWebSocket as unknown as typeof WebSocket,
        secure: false,
      });

      await vi.advanceTimersByTimeAsync(0);

      client.close();
      expect(mockWebSocketInstances.length).toBe(1);

      client.reconnect();

      expect(mockWebSocketInstances.length).toBe(2);
    });
  });

  describe('error handling', () => {
    it('should call onError when WebSocket error occurs', async () => {
      const onError = vi.fn();
      const _client = new WebsocketPubsubClient({
        host: 'localhost:3000',
        onMessage: vi.fn(),
        onError,
        WebSocketImpl: createMockWebSocket as unknown as typeof WebSocket,
        secure: false,
      });

      await vi.advanceTimersByTimeAsync(0);

      mockWebSocketInstances[0]?.simulateError();

      expect(onError).toHaveBeenCalledTimes(1);
    });
  });

  describe('debug logging', () => {
    it('should log when debug is enabled', async () => {
      const onDebug = vi.fn();

      const _client = new WebsocketPubsubClient({
        host: 'localhost:3000',
        onMessage: vi.fn(),
        WebSocketImpl: createMockWebSocket as unknown as typeof WebSocket,
        secure: false,
        debug: true,
        onDebug,
      });

      await vi.advanceTimersByTimeAsync(0);

      expect(onDebug).toHaveBeenCalled();
    });

    it('should not log when debug is disabled', async () => {
      const onDebug = vi.fn();

      const _client = new WebsocketPubsubClient({
        host: 'localhost:3000',
        onMessage: vi.fn(),
        WebSocketImpl: createMockWebSocket as unknown as typeof WebSocket,
        secure: false,
        debug: false,
        onDebug,
      });

      await vi.advanceTimersByTimeAsync(0);

      expect(onDebug).not.toHaveBeenCalled();
    });
  });

  describe('message parsing errors', () => {
    it('should handle invalid JSON in messages', async () => {
      const onDebug = vi.fn();
      const onMessage = vi.fn();
      const _client = new WebsocketPubsubClient({
        host: 'localhost:3000',
        onMessage,
        WebSocketImpl: createMockWebSocket as unknown as typeof WebSocket,
        secure: false,
        debug: true,
        onDebug,
      });

      await vi.advanceTimersByTimeAsync(0);

      // Simulate an invalid JSON message
      const ws = mockWebSocketInstances[0];
      ws?.onmessage?.(new MessageEvent('message', { data: 'invalid-json{{{' }));

      // onMessage should not be called for invalid messages
      expect(onMessage).not.toHaveBeenCalled();
      // Debug log should have been called with parse error
      expect(onDebug).toHaveBeenCalledWith('Failed to parse message:', expect.any(Error));
    });
  });

  describe('offline handling', () => {
    it('should not reconnect when browser is offline', async () => {
      // Set navigator.onLine to false
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true,
        configurable: true,
      });

      const onDebug = vi.fn();
      const _client = new WebsocketPubsubClient({
        host: 'localhost:3000',
        onMessage: vi.fn(),
        WebSocketImpl: createMockWebSocket as unknown as typeof WebSocket,
        secure: false,
        baseReconnectDelayMs: 100,
        debug: true,
        onDebug,
      });

      await vi.advanceTimersByTimeAsync(0);
      expect(mockWebSocketInstances.length).toBe(1);

      // Simulate disconnect
      mockWebSocketInstances[0]?.simulateClose();

      // Advance time - should not try to reconnect because offline
      await vi.advanceTimersByTimeAsync(10000);

      // Still only 1 instance because offline
      expect(mockWebSocketInstances.length).toBe(1);
      expect(onDebug).toHaveBeenCalledWith('Offline, waiting for online event...');

      // Restore navigator.onLine
      Object.defineProperty(navigator, 'onLine', {
        value: true,
        writable: true,
        configurable: true,
      });
    });
  });

  describe('WebSocket constructor error', () => {
    it('should handle WebSocket constructor throwing error', async () => {
      const throwingWebSocket = class extends MockWebSocket {
        constructor(_url: string) {
          super(_url);
          throw new Error('WebSocket not supported');
        }
      };

      const onDebug = vi.fn();
      const _client = new WebsocketPubsubClient({
        host: 'localhost:3000',
        onMessage: vi.fn(),
        WebSocketImpl: throwingWebSocket as unknown as typeof WebSocket,
        secure: false,
        baseReconnectDelayMs: 100,
        maxReconnectAttempts: 1,
        debug: true,
        onDebug,
      });

      // Wait for reconnect attempt
      await vi.advanceTimersByTimeAsync(500);

      // Should have logged the failure
      expect(onDebug).toHaveBeenCalledWith('Failed to create WebSocket:', expect.any(Error));
    });
  });
});
