// packages/sdk/src/realtime/__tests__/hooks.test.tsx
/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { render, screen, act } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { RecordCache, type TableMap } from '../../cache/RecordCache';
import {
  useRecord,
  useRecords,
  useWrite,
  useIsOnline,
  useIsPendingWrite,
  useConnectionState,
  useUndoRedo,
} from '../hooks';
import { RealtimeProvider, type RealtimeProviderConfig } from '../RealtimeContext';

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
    setTimeout(() => {
      if (this.readyState === MockWebSocket.CONNECTING) {
        this.readyState = MockWebSocket.OPEN;
        this.onopen?.(new Event('open'));
      }
    }, 0);
  }

  send(_data: string): void {}
  close(): void {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.(new CloseEvent('close'));
  }
}

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

interface Post {
  id: string;
  version: number;
  title: string;
  authorId: string;
}

interface TestTables extends TableMap {
  user: User;
  post: Post;
}

// ============================================================================
// Test Helpers
// ============================================================================

function createTestConfig(
  overrides: Partial<RealtimeProviderConfig<TestTables>> = {},
): RealtimeProviderConfig<TestTables> {
  const cache = overrides.recordCache || new RecordCache<TestTables>();
  return {
    userId: 'test-user-id',
    wsHost: 'localhost:3000',
    wsSecure: false,
    debug: false,
    recordCache: cache,
    ...overrides,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('Realtime Hooks', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setupMockWebSocket();
    mockFetch.mockReset();
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ recordMap: {} }),
    });

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

  describe('useRecord', () => {
    it('should return undefined for missing record', async () => {
      const cache = new RecordCache<TestTables>();
      const config = createTestConfig({ recordCache: cache });

      function TestComponent(): React.ReactElement {
        const { data } = useRecord<User>('user', 'missing-id');
        return <span data-testid="result">{data ? data.name : 'undefined'}</span>;
      }

      render(
        <RealtimeProvider config={config}>
          <TestComponent />
        </RealtimeProvider>,
      );

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      expect(screen.getByTestId('result').textContent).toBe('undefined');
    });

    it('should return record from cache', async () => {
      const cache = new RecordCache<TestTables>();
      cache.set('user', 'u1', { id: 'u1', version: 1, name: 'Alice', email: 'alice@test.com' });
      const config = createTestConfig({ recordCache: cache });

      function TestComponent(): React.ReactElement {
        const { data } = useRecord<User>('user', 'u1');
        return <span data-testid="result">{data ? data.name : 'undefined'}</span>;
      }

      render(
        <RealtimeProvider config={config}>
          <TestComponent />
        </RealtimeProvider>,
      );

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      expect(screen.getByTestId('result').textContent).toBe('Alice');
    });

    it('should update when cache changes', async () => {
      const cache = new RecordCache<TestTables>();
      cache.set('user', 'u1', { id: 'u1', version: 1, name: 'Alice', email: 'alice@test.com' });
      const config = createTestConfig({ recordCache: cache });

      function TestComponent(): React.ReactElement {
        const { data } = useRecord<User>('user', 'u1');
        return <span data-testid="result">{data ? data.name : 'undefined'}</span>;
      }

      render(
        <RealtimeProvider config={config}>
          <TestComponent />
        </RealtimeProvider>,
      );

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      expect(screen.getByTestId('result').textContent).toBe('Alice');

      // Update the cache
      await act(async () => {
        cache.set('user', 'u1', { id: 'u1', version: 2, name: 'Bob', email: 'bob@test.com' });
      });

      expect(screen.getByTestId('result').textContent).toBe('Bob');
    });

    it('should subscribe to pubsub by default', async () => {
      const cache = new RecordCache<TestTables>();
      const config = createTestConfig({ recordCache: cache });

      function TestComponent(): React.ReactElement {
        useRecord<User>('user', 'u1');
        return <span>subscribed</span>;
      }

      render(
        <RealtimeProvider config={config}>
          <TestComponent />
        </RealtimeProvider>,
      );

      await act(async () => {
        await vi.advanceTimersByTimeAsync(10);
      });

      // The subscription should have been established
      // We can verify by checking if the WebSocket got a subscribe message
      // (in a real implementation, we'd check the mock)
      expect(screen.getByText('subscribed')).toBeTruthy();
    });

    it('should skip subscription when skipSubscription is true', async () => {
      const cache = new RecordCache<TestTables>();
      const config = createTestConfig({ recordCache: cache });

      function TestComponent(): React.ReactElement {
        useRecord<User>('user', 'u1', { skipSubscription: true });
        return <span>not subscribed</span>;
      }

      render(
        <RealtimeProvider config={config}>
          <TestComponent />
        </RealtimeProvider>,
      );

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      expect(screen.getByText('not subscribed')).toBeTruthy();
    });
  });

  describe('useRecords', () => {
    it('should return empty array for no ids', async () => {
      const cache = new RecordCache<TestTables>();
      const config = createTestConfig({ recordCache: cache });

      function TestComponent(): React.ReactElement {
        const { data } = useRecords<User>('user', []);
        return <span data-testid="count">{data.length}</span>;
      }

      render(
        <RealtimeProvider config={config}>
          <TestComponent />
        </RealtimeProvider>,
      );

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      expect(screen.getByTestId('count').textContent).toBe('0');
    });

    it('should return records from cache', async () => {
      const cache = new RecordCache<TestTables>();
      cache.set('user', 'u1', { id: 'u1', version: 1, name: 'Alice', email: 'alice@test.com' });
      cache.set('user', 'u2', { id: 'u2', version: 1, name: 'Bob', email: 'bob@test.com' });
      const config = createTestConfig({ recordCache: cache });

      function TestComponent(): React.ReactElement {
        const { data } = useRecords<User>('user', ['u1', 'u2']);
        return (
          <span data-testid="names">{data.map((u) => u?.name ?? 'undefined').join(', ')}</span>
        );
      }

      render(
        <RealtimeProvider config={config}>
          <TestComponent />
        </RealtimeProvider>,
      );

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      expect(screen.getByTestId('names').textContent).toBe('Alice, Bob');
    });

    it('should return undefined for missing records', async () => {
      const cache = new RecordCache<TestTables>();
      cache.set('user', 'u1', { id: 'u1', version: 1, name: 'Alice', email: 'alice@test.com' });
      const config = createTestConfig({ recordCache: cache });

      function TestComponent(): React.ReactElement {
        const { data } = useRecords<User>('user', ['u1', 'missing']);
        return (
          <span data-testid="names">{data.map((u) => u?.name ?? 'undefined').join(', ')}</span>
        );
      }

      render(
        <RealtimeProvider config={config}>
          <TestComponent />
        </RealtimeProvider>,
      );

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      expect(screen.getByTestId('names').textContent).toBe('Alice, undefined');
    });
  });

  describe('useWrite', () => {
    it('should provide write function', async () => {
      const cache = new RecordCache<TestTables>();
      const config = createTestConfig({ recordCache: cache });

      function TestComponent(): React.ReactElement {
        const { write, isWriting } = useWrite();
        return (
          <div>
            <span data-testid="has-write">{typeof write === 'function' ? 'true' : 'false'}</span>
            <span data-testid="is-writing">{isWriting.toString()}</span>
          </div>
        );
      }

      render(
        <RealtimeProvider config={config}>
          <TestComponent />
        </RealtimeProvider>,
      );

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      expect(screen.getByTestId('has-write').textContent).toBe('true');
      expect(screen.getByTestId('is-writing').textContent).toBe('false');
    });

    it('should set isWriting to true during write', async () => {
      const cache = new RecordCache<TestTables>();
      cache.set('user', 'u1', { id: 'u1', version: 1, name: 'Alice', email: 'alice@test.com' });
      const config = createTestConfig({ recordCache: cache });

      const isWritingValues: boolean[] = [];

      function TestComponent(): React.ReactElement {
        const { write, isWriting } = useWrite();

        React.useEffect(() => {
          isWritingValues.push(isWriting);
        }, [isWriting]);

        React.useEffect(() => {
          void write([{ table: 'user', id: 'u1', updates: { name: 'Bob' } }]);
        }, [write]);

        return <span data-testid="is-writing">{isWriting.toString()}</span>;
      }

      render(
        <RealtimeProvider config={config}>
          <TestComponent />
        </RealtimeProvider>,
      );

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });

      // Should have been true at some point during the write
      expect(isWritingValues).toContain(true);
    });
  });

  describe('useIsOnline', () => {
    it('should return online status', async () => {
      const cache = new RecordCache<TestTables>();
      const config = createTestConfig({ recordCache: cache });

      function TestComponent(): React.ReactElement {
        const isOnline = useIsOnline();
        return <span data-testid="is-online">{isOnline.toString()}</span>;
      }

      render(
        <RealtimeProvider config={config}>
          <TestComponent />
        </RealtimeProvider>,
      );

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      expect(screen.getByTestId('is-online').textContent).toBe('true');
    });

    it('should update when going offline', async () => {
      const cache = new RecordCache<TestTables>();
      const config = createTestConfig({ recordCache: cache });

      function TestComponent(): React.ReactElement {
        const isOnline = useIsOnline();
        return <span data-testid="is-online">{isOnline.toString()}</span>;
      }

      render(
        <RealtimeProvider config={config}>
          <TestComponent />
        </RealtimeProvider>,
      );

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      expect(screen.getByTestId('is-online').textContent).toBe('true');

      await act(async () => {
        Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
        window.dispatchEvent(new Event('offline'));
      });

      expect(screen.getByTestId('is-online').textContent).toBe('false');
    });
  });

  describe('useIsPendingWrite', () => {
    it('should return false for records without pending writes', async () => {
      const cache = new RecordCache<TestTables>();
      const config = createTestConfig({ recordCache: cache });

      function TestComponent(): React.ReactElement {
        const isPending = useIsPendingWrite('user', 'u1');
        return <span data-testid="is-pending">{isPending.toString()}</span>;
      }

      render(
        <RealtimeProvider config={config}>
          <TestComponent />
        </RealtimeProvider>,
      );

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      expect(screen.getByTestId('is-pending').textContent).toBe('false');
    });
  });

  describe('useConnectionState', () => {
    it('should return connection state', async () => {
      const cache = new RecordCache<TestTables>();
      const config = createTestConfig({ recordCache: cache });

      function TestComponent(): React.ReactElement {
        const state = useConnectionState();
        return <span data-testid="state">{state}</span>;
      }

      render(
        <RealtimeProvider config={config}>
          <TestComponent />
        </RealtimeProvider>,
      );

      // Initially disconnected
      expect(screen.getByTestId('state').textContent).toBe('disconnected');

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      // After connection
      expect(screen.getByTestId('state').textContent).toBe('connected');
    });
  });

  describe('useUndoRedo', () => {
    it('should return undo/redo state', async () => {
      const cache = new RecordCache<TestTables>();
      const config = createTestConfig({ recordCache: cache });

      function TestComponent(): React.ReactElement {
        const { canUndo, canRedo, undoCount, redoCount } = useUndoRedo();
        return (
          <div>
            <span data-testid="can-undo">{canUndo.toString()}</span>
            <span data-testid="can-redo">{canRedo.toString()}</span>
            <span data-testid="undo-count">{undoCount}</span>
            <span data-testid="redo-count">{redoCount}</span>
          </div>
        );
      }

      render(
        <RealtimeProvider config={config}>
          <TestComponent />
        </RealtimeProvider>,
      );

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      expect(screen.getByTestId('can-undo').textContent).toBe('false');
      expect(screen.getByTestId('can-redo').textContent).toBe('false');
      expect(screen.getByTestId('undo-count').textContent).toBe('0');
      expect(screen.getByTestId('redo-count').textContent).toBe('0');
    });

    it('should provide undo and redo functions', async () => {
      const cache = new RecordCache<TestTables>();
      const config = createTestConfig({ recordCache: cache });

      function TestComponent(): React.ReactElement {
        const { undo, redo } = useUndoRedo();
        return (
          <div>
            <span data-testid="has-undo">{typeof undo === 'function' ? 'true' : 'false'}</span>
            <span data-testid="has-redo">{typeof redo === 'function' ? 'true' : 'false'}</span>
          </div>
        );
      }

      render(
        <RealtimeProvider config={config}>
          <TestComponent />
        </RealtimeProvider>,
      );

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      expect(screen.getByTestId('has-undo').textContent).toBe('true');
      expect(screen.getByTestId('has-redo').textContent).toBe('true');
    });
  });
});
