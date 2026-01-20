// packages/sdk/src/realtime/__tests__/RealtimeContext.test.tsx
/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { RecordCache, type TableMap } from '../../cache/RecordCache';
import { RealtimeProvider, useRealtime, type RealtimeProviderConfig } from '../RealtimeContext';

// ============================================================================
// Mock WebSocket
// ============================================================================

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

  send(_data: string): void {
    // Mock send
  }

  close(): void {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.(new CloseEvent('close'));
  }

  forceConnect(): void {
    this.readyState = MockWebSocket.OPEN;
    this.onopen?.(new Event('open'));
  }
}

// Override global WebSocket
const originalWebSocket = global.WebSocket;
let mockWebSocketInstances: MockWebSocket[] = [];

function setupMockWebSocket(): void {
  mockWebSocketInstances = [];
  (global as unknown as { WebSocket: typeof MockWebSocket }).WebSocket =
    class extends MockWebSocket {
      constructor(url: string) {
        super(url);
        mockWebSocketInstances.push(this);
      }
    } as unknown as typeof WebSocket;
}

function restoreWebSocket(): void {
  (global as unknown as { WebSocket: typeof WebSocket }).WebSocket = originalWebSocket;
}

// ============================================================================
// Mock fetch
// ============================================================================

const mockFetch = vi.fn();
global.fetch = mockFetch;

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
// Test Helpers
// ============================================================================

function createTestConfig(
  overrides: Partial<RealtimeProviderConfig<TestTables>> = {},
): RealtimeProviderConfig<TestTables> {
  const cache = new RecordCache<TestTables>();
  return {
    userId: 'test-user-id',
    wsHost: 'localhost:3000',
    wsSecure: false,
    debug: false,
    recordCache: cache,
    ...overrides,
  };
}

function TestConsumer(): React.ReactElement {
  const context = useRealtime<TestTables>();
  return (
    <div>
      <span data-testid="user-id">{context.userId}</span>
      <span data-testid="is-online">{context.isOnline.toString()}</span>
      <span data-testid="connection-state">{context.connectionState}</span>
      <span data-testid="can-undo">{context.undoRedoState.canUndo.toString()}</span>
      <span data-testid="can-redo">{context.undoRedoState.canRedo.toString()}</span>
    </div>
  );
}

// ============================================================================
// Tests
// ============================================================================

describe('RealtimeContext', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setupMockWebSocket();
    mockFetch.mockReset();
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ recordMap: {} }),
    });

    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    restoreWebSocket();
  });

  describe('RealtimeProvider', () => {
    it('should provide context to children', async () => {
      const config = createTestConfig();

      render(
        <RealtimeProvider config={config}>
          <TestConsumer />
        </RealtimeProvider>,
      );

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      expect(screen.getByTestId('user-id').textContent).toBe('test-user-id');
    });

    it('should provide isOnline status', async () => {
      const config = createTestConfig();

      render(
        <RealtimeProvider config={config}>
          <TestConsumer />
        </RealtimeProvider>,
      );

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      expect(screen.getByTestId('is-online').textContent).toBe('true');
    });

    it('should track connection state', async () => {
      const config = createTestConfig();

      render(
        <RealtimeProvider config={config}>
          <TestConsumer />
        </RealtimeProvider>,
      );

      // Initially disconnected
      expect(screen.getByTestId('connection-state').textContent).toBe('disconnected');

      // Wait for connection
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      expect(screen.getByTestId('connection-state').textContent).toBe('connected');
    });

    it('should call onConnectionStateChange callback', async () => {
      const onConnectionStateChange = vi.fn();
      const config = createTestConfig({ onConnectionStateChange });

      render(
        <RealtimeProvider config={config}>
          <TestConsumer />
        </RealtimeProvider>,
      );

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      expect(onConnectionStateChange).toHaveBeenCalledWith('connected');
    });

    it('should provide undo/redo state', async () => {
      const config = createTestConfig();

      render(
        <RealtimeProvider config={config}>
          <TestConsumer />
        </RealtimeProvider>,
      );

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      expect(screen.getByTestId('can-undo').textContent).toBe('false');
      expect(screen.getByTestId('can-redo').textContent).toBe('false');
    });
  });

  describe('useRealtime', () => {
    it('should throw error when used outside provider', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<TestConsumer />);
      }).toThrow('useRealtime must be used within a RealtimeProvider');

      consoleSpy.mockRestore();
    });

    it('should provide recordCache', async () => {
      const cache = new RecordCache<TestTables>();
      cache.set('user', 'u1', { id: 'u1', version: 1, name: 'Alice', email: 'alice@test.com' });

      const config = createTestConfig({ recordCache: cache });

      function CacheConsumer(): React.ReactElement {
        const { recordCache } = useRealtime<TestTables>();
        const user = recordCache.get('user', 'u1');
        return <span data-testid="user-name">{user?.name ?? 'not found'}</span>;
      }

      render(
        <RealtimeProvider config={config}>
          <CacheConsumer />
        </RealtimeProvider>,
      );

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      expect(screen.getByTestId('user-name').textContent).toBe('Alice');
    });

    it('should provide subscribe function', async () => {
      const config = createTestConfig();

      function SubscribeConsumer(): React.ReactElement {
        const { subscribe } = useRealtime();
        React.useEffect(() => {
          const unsubscribe = subscribe('user', 'u1');
          return unsubscribe;
        }, [subscribe]);
        return <span>subscribed</span>;
      }

      render(
        <RealtimeProvider config={config}>
          <SubscribeConsumer />
        </RealtimeProvider>,
      );

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      expect(screen.getByText('subscribed')).toBeTruthy();
    });

    it('should provide write function', async () => {
      const cache = new RecordCache<TestTables>();
      cache.set('user', 'u1', { id: 'u1', version: 1, name: 'Alice', email: 'alice@test.com' });

      const config = createTestConfig({ recordCache: cache });

      function WriteConsumer(): React.ReactElement {
        const { write, recordCache } = useRealtime<TestTables>();
        const [written, setWritten] = React.useState(false);

        React.useEffect(() => {
          if (!written) {
            void write([{ table: 'user', id: 'u1', updates: { name: 'Bob' } }]).then(() => {
              setWritten(true);
            });
          }
        }, [write, written]);

        const user = recordCache.get('user', 'u1');
        return <span data-testid="user-name">{user?.name ?? 'not found'}</span>;
      }

      render(
        <RealtimeProvider config={config}>
          <WriteConsumer />
        </RealtimeProvider>,
      );

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });

      // The optimistic update should have applied
      expect(screen.getByTestId('user-name').textContent).toBe('Bob');
    });

    it('should enable undo after write', async () => {
      vi.useRealTimers(); // Use real timers for this test
      const cache = new RecordCache<TestTables>();
      cache.set('user', 'u1', { id: 'u1', version: 1, name: 'Alice', email: 'alice@test.com' });

      const config = createTestConfig({ recordCache: cache });

      function UndoConsumer(): React.ReactElement {
        const { write, undoRedoState } = useRealtime<TestTables>();
        const [written, setWritten] = React.useState(false);

        React.useEffect(() => {
          if (!written) {
            void write([{ table: 'user', id: 'u1', updates: { name: 'Bob' } }]).then(() => {
              setWritten(true);
            });
          }
        }, [write, written]);

        return (
          <div>
            <span data-testid="can-undo">{undoRedoState.canUndo.toString()}</span>
            <span data-testid="undo-count">{undoRedoState.undoCount}</span>
          </div>
        );
      }

      render(
        <RealtimeProvider config={config}>
          <UndoConsumer />
        </RealtimeProvider>,
      );

      await waitFor(
        () => {
          expect(screen.getByTestId('can-undo').textContent).toBe('true');
          expect(screen.getByTestId('undo-count').textContent).toBe('1');
        },
        { timeout: 2000 },
      );
      vi.useFakeTimers(); // Restore fake timers
    });

    it('should undo write and restore previous value', async () => {
      vi.useRealTimers(); // Use real timers for this test
      const cache = new RecordCache<TestTables>();
      cache.set('user', 'u1', { id: 'u1', version: 1, name: 'Alice', email: 'alice@test.com' });

      const config = createTestConfig({ recordCache: cache });

      function UndoRestoreConsumer(): React.ReactElement {
        const { write, undo, recordCache, undoRedoState } = useRealtime<TestTables>();
        const [written, setWritten] = React.useState(false);
        const [undone, setUndone] = React.useState(false);

        React.useEffect(() => {
          if (!written) {
            void write([{ table: 'user', id: 'u1', updates: { name: 'Bob' } }]).then(() => {
              setWritten(true);
            });
          }
        }, [write, written]);

        React.useEffect(() => {
          if (written && !undone && undoRedoState.canUndo) {
            undo();
            setUndone(true);
          }
        }, [written, undone, undoRedoState.canUndo, undo]);

        const user = recordCache.get('user', 'u1');
        return (
          <div>
            <span data-testid="user-name">{user?.name ?? 'not found'}</span>
            <span data-testid="undone">{undone.toString()}</span>
          </div>
        );
      }

      render(
        <RealtimeProvider config={config}>
          <UndoRestoreConsumer />
        </RealtimeProvider>,
      );

      await waitFor(
        () => {
          expect(screen.getByTestId('undone').textContent).toBe('true');
          expect(screen.getByTestId('user-name').textContent).toBe('Alice');
        },
        { timeout: 2000 },
      );
      vi.useFakeTimers(); // Restore fake timers
    });
  });

  describe('offline handling', () => {
    it('should update isOnline when going offline', async () => {
      const config = createTestConfig();

      render(
        <RealtimeProvider config={config}>
          <TestConsumer />
        </RealtimeProvider>,
      );

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      expect(screen.getByTestId('is-online').textContent).toBe('true');

      // Simulate going offline
      await act(async () => {
        Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
        window.dispatchEvent(new Event('offline'));
      });

      expect(screen.getByTestId('is-online').textContent).toBe('false');
    });

    it('should update isOnline when coming back online', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });

      const config = createTestConfig();

      render(
        <RealtimeProvider config={config}>
          <TestConsumer />
        </RealtimeProvider>,
      );

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      // Simulate coming online
      await act(async () => {
        Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
        window.dispatchEvent(new Event('online'));
      });

      expect(screen.getByTestId('is-online').textContent).toBe('true');
    });
  });
});
