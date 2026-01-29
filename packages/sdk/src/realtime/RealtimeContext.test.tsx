// packages/sdk/src/realtime/RealtimeContext.test.tsx
/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { createElement, useEffect, useState } from 'react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { RecordCache, type TableMap } from '../cache/RecordCache';
import { RealtimeProvider, useRealtime, type RealtimeProviderConfig } from './RealtimeContext';

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

  send(_data: string): void {
    // Mock send
  }

  close(): void {
    this.readyState = WS_CLOSED;
    this.onclose?.(new CloseEvent('close'));
  }

  forceConnect(): void {
    this.readyState = WS_OPEN;
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

const TestConsumer = (): JSX.Element => {
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
};

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

      const CacheConsumer = (): JSX.Element => {
        const { recordCache } = useRealtime<TestTables>();
        const user = recordCache.get('user', 'u1');
        return <span data-testid="user-name">{user?.name ?? 'not found'}</span>;
      };

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

      const TestComponent = (): JSX.Element => {
        const { subscribe } = useRealtime();
        useEffect(() => {
          const unsubscribe = subscribe('user', 'u1');
          return unsubscribe;
        }, [subscribe]);
        return createElement('span', null, 'subscribed');
      };

      render(createElement(RealtimeProvider, { config }, createElement(TestComponent)));

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      expect(screen.getByText('subscribed')).toBeTruthy();
    });

    it('should provide write function', async () => {
      const cache = new RecordCache<TestTables>();
      cache.set('user', 'u1', { id: 'u1', version: 1, name: 'Alice', email: 'alice@test.com' });

      const config = createTestConfig({ recordCache: cache });

      const TestComponent = (): JSX.Element => {
        const { write, recordCache } = useRealtime<TestTables>();
        const [written, setWritten] = useState(false);

        useEffect(() => {
          if (!written) {
            void write([{ table: 'user', id: 'u1', updates: { name: 'Bob' } }]).then(() => {
              setWritten(true);
            });
          }
        }, [write, written]);

        const user = recordCache.get('user', 'u1');
        return createElement('span', { ['data-testid']: 'user-name' }, user?.name ?? 'not found');
      };

      render(createElement(RealtimeProvider, { config }, createElement(TestComponent)));

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

      const TestComponent = (): JSX.Element => {
        const { write, undoRedoState } = useRealtime<TestTables>();
        const [written, setWritten] = useState(false);

        useEffect(() => {
          if (!written) {
            void write([{ table: 'user', id: 'u1', updates: { name: 'Bob' } }]).then(() => {
              setWritten(true);
            });
          }
        }, [write, written]);

        return createElement(
          'div',
          null,
          createElement('span', { ['data-testid']: 'can-undo' }, undoRedoState.canUndo.toString()),
          createElement('span', { ['data-testid']: 'undo-count' }, undoRedoState.undoCount),
        );
      };

      render(createElement(RealtimeProvider, { config }, createElement(TestComponent)));

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

      const TestComponent = (): JSX.Element => {
        const { write, undo, recordCache, undoRedoState } = useRealtime<TestTables>();
        const [written, setWritten] = useState(false);
        const [undone, setUndone] = useState(false);

        useEffect(() => {
          if (!written) {
            void write([{ table: 'user', id: 'u1', updates: { name: 'Bob' } }]).then(() => {
              setWritten(true);
            });
          }
        }, [write, written]);

        useEffect(() => {
          if (written && !undone && undoRedoState.canUndo === true) {
            undo();
            setUndone(true);
          }
        }, [written, undone, undoRedoState.canUndo, undo]);

        const user = recordCache.get('user', 'u1');
        return createElement(
          'div',
          null,
          createElement('span', { ['data-testid']: 'user-name' }, user?.name ?? 'not found'),
          createElement('span', { ['data-testid']: 'undone' }, undone.toString()),
        );
      };

      render(createElement(RealtimeProvider, { config }, createElement(TestComponent)));

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
      act(() => {
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
      act(() => {
        Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
        window.dispatchEvent(new Event('online'));
      });

      expect(screen.getByTestId('is-online').textContent).toBe('true');
    });
  });

  describe('pubsub message handling', () => {
    it('should skip invalid pubsub messages', async () => {
      vi.useRealTimers();
      const cache = new RecordCache<TestTables>();
      cache.set('user', 'u1', { id: 'u1', version: 1, name: 'Original', email: 'test@test.com' });

      const config = createTestConfig({ recordCache: cache });

      const TestComponent = (): JSX.Element => {
        const { recordCache } = useRealtime<TestTables>();
        const user = recordCache.get('user', 'u1');
        return createElement('span', { ['data-testid']: 'user-name' }, user?.name ?? 'not found');
      };

      render(createElement(RealtimeProvider, { config }, createElement(TestComponent)));

      await waitFor(
        () => {
          expect(mockWebSocketInstances.length).toBeGreaterThan(0);
        },
        { timeout: 1000 },
      );

      const ws = mockWebSocketInstances[0];
      if (ws !== undefined) {
        ws.forceConnect();

        // Send a message with invalid key (no colon separator)
        act(() => {
          ws.onmessage?.(
            new MessageEvent('message', {
              data: JSON.stringify({
                type: 'update',
                key: 'invalidkey',
                value: { id: 'u1', version: 2, name: 'Should Not Update' },
              }),
            }),
          );
        });

        // Send a message with null value
        act(() => {
          ws.onmessage?.(
            new MessageEvent('message', {
              data: JSON.stringify({
                type: 'update',
                key: 'user:u1',
                value: null,
              }),
            }),
          );
        });

        // Send a message with non-object value
        act(() => {
          ws.onmessage?.(
            new MessageEvent('message', {
              data: JSON.stringify({
                type: 'update',
                key: 'user:u1',
                value: 'string-value',
              }),
            }),
          );
        });
      }

      // Cache should not be updated - still have original
      expect(screen.getByTestId('user-name').textContent).toBe('Original');

      vi.useFakeTimers();
    });
  });

  describe('write with non-existent record', () => {
    it('should handle write operation when record does not exist', async () => {
      vi.useRealTimers();
      const cache = new RecordCache<TestTables>();
      // Note: No record set for 'u1' - it doesn't exist

      const config = createTestConfig({ recordCache: cache });

      const TestComponent = (): JSX.Element => {
        const { write, undoRedoState } = useRealtime<TestTables>();
        const [written, setWritten] = useState(false);

        useEffect(() => {
          if (!written) {
            void write([{ table: 'user', id: 'nonexistent', updates: { name: 'New' } }]).then(
              () => {
                setWritten(true);
              },
            );
          }
        }, [write, written]);

        return createElement(
          'div',
          null,
          createElement('span', { ['data-testid']: 'written' }, written.toString()),
          createElement('span', { ['data-testid']: 'can-undo' }, undoRedoState.canUndo.toString()),
        );
      };

      render(createElement(RealtimeProvider, { config }, createElement(TestComponent)));

      await waitFor(
        () => {
          expect(screen.getByTestId('written').textContent).toBe('true');
        },
        { timeout: 2000 },
      );

      // Should still have added to undo stack
      expect(screen.getByTestId('can-undo').textContent).toBe('true');

      vi.useFakeTimers();
    });
  });

  describe('redo functionality', () => {
    it('should redo previously undone write', async () => {
      vi.useRealTimers();
      const cache = new RecordCache<TestTables>();
      cache.set('user', 'u1', { id: 'u1', version: 1, name: 'Alice', email: 'alice@test.com' });

      const config = createTestConfig({ recordCache: cache });

      const TestComponent = (): JSX.Element => {
        const { write, undo, redo, recordCache, undoRedoState } = useRealtime<TestTables>();
        const [step, setStep] = useState(0);

        useEffect(() => {
          if (step === 0) {
            void write([{ table: 'user', id: 'u1', updates: { name: 'Bob' } }]).then(() => {
              setStep(1);
            });
          }
        }, [write, step]);

        useEffect(() => {
          if (step === 1 && undoRedoState.canUndo === true) {
            undo();
            setStep(2);
          }
        }, [step, undoRedoState.canUndo, undo]);

        useEffect(() => {
          if (step === 2 && undoRedoState.canRedo === true) {
            redo();
            setStep(3);
          }
        }, [step, undoRedoState.canRedo, redo]);

        const user = recordCache.get('user', 'u1');
        return createElement(
          'div',
          null,
          createElement('span', { ['data-testid']: 'user-name' }, user?.name ?? 'not found'),
          createElement('span', { ['data-testid']: 'step' }, step),
        );
      };

      render(createElement(RealtimeProvider, { config }, createElement(TestComponent)));

      await waitFor(
        () => {
          expect(screen.getByTestId('step').textContent).toBe('3');
          expect(screen.getByTestId('user-name').textContent).toBe('Bob');
        },
        { timeout: 3000 },
      );

      vi.useFakeTimers();
    });
  });
});
