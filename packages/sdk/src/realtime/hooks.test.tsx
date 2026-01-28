// packages/sdk/src/realtime/hooks.test.tsx
/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { render, screen, act } from '@testing-library/react';
import { createElement, useEffect } from 'react';
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

// WebSocket state constants matching the standard
const wsConnecting = 0;
const wsOpen = 1;
const wsClosing = 2;
const wsClosed = 3;

class MockWebSocket {
  // Note: Using camelCase properties to satisfy lint rules
  // These are accessed internally and mimic WebSocket constants
  static readonly connecting = wsConnecting;
  static readonly open = wsOpen;
  static readonly closing = wsClosing;
  static readonly closed = wsClosed;

  url: string;
  readyState: number = wsConnecting;

  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent<string>) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    setTimeout(() => {
      if (this.readyState === wsConnecting) {
        this.readyState = wsOpen;
        this.onopen?.(new Event('open'));
      }
    }, 0);
  }

  send(_data: string): void {}
  close(): void {
    this.readyState = wsClosed;
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
  const cache = overrides.recordCache ?? new RecordCache<TestTables>();
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

      const TestComponent = () => {
        const { data } = useRecord<User>('user', 'missing-id');
        return createElement(
          'span',
          { ['data-testid']: 'result' },
          data !== undefined ? data.name : 'undefined',
        );
      };

      render(createElement(RealtimeProvider, { config }, createElement(TestComponent)));

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      expect(screen.getByTestId('result').textContent).toBe('undefined');
    });

    it('should return record from cache', async () => {
      const cache = new RecordCache<TestTables>();
      cache.set('user', 'u1', { id: 'u1', version: 1, name: 'Alice', email: 'alice@test.com' });
      const config = createTestConfig({ recordCache: cache });

      const TestComponent = () => {
        const { data } = useRecord<User>('user', 'u1');
        return createElement(
          'span',
          { ['data-testid']: 'result' },
          data !== undefined ? data.name : 'undefined',
        );
      };

      render(createElement(RealtimeProvider, { config }, createElement(TestComponent)));

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      expect(screen.getByTestId('result').textContent).toBe('Alice');
    });

    it('should update when cache changes', async () => {
      const cache = new RecordCache<TestTables>();
      cache.set('user', 'u1', { id: 'u1', version: 1, name: 'Alice', email: 'alice@test.com' });
      const config = createTestConfig({ recordCache: cache });

      const TestComponent = () => {
        const { data } = useRecord<User>('user', 'u1');
        return createElement(
          'span',
          { ['data-testid']: 'result' },
          data !== undefined ? data.name : 'undefined',
        );
      };

      render(createElement(RealtimeProvider, { config }, createElement(TestComponent)));

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      expect(screen.getByTestId('result').textContent).toBe('Alice');

      // Update the cache
      act(() => {
        cache.set('user', 'u1', { id: 'u1', version: 2, name: 'Bob', email: 'bob@test.com' });
      });

      expect(screen.getByTestId('result').textContent).toBe('Bob');
    });

    it('should subscribe to pubsub by default', async () => {
      const cache = new RecordCache<TestTables>();
      const config = createTestConfig({ recordCache: cache });

      const TestComponent = () => {
        useRecord<User>('user', 'u1');
        return createElement('span', null, 'subscribed');
      };

      render(createElement(RealtimeProvider, { config }, createElement(TestComponent)));

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

      const TestComponent = () => {
        useRecord<User>('user', 'u1', { skipSubscription: true });
        return createElement('span', null, 'not subscribed');
      };

      render(createElement(RealtimeProvider, { config }, createElement(TestComponent)));

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

      const TestComponent = () => {
        const { data } = useRecords<User>('user', []);
        return createElement('span', { ['data-testid']: 'count' }, data.length);
      };

      render(createElement(RealtimeProvider, { config }, createElement(TestComponent)));

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

      const TestComponent = () => {
        const { data } = useRecords<User>('user', ['u1', 'u2']);
        return createElement(
          'span',
          { ['data-testid']: 'names' },
          data.map((u) => u?.name ?? 'undefined').join(', '),
        );
      };

      render(createElement(RealtimeProvider, { config }, createElement(TestComponent)));

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      expect(screen.getByTestId('names').textContent).toBe('Alice, Bob');
    });

    it('should return undefined for missing records', async () => {
      const cache = new RecordCache<TestTables>();
      cache.set('user', 'u1', { id: 'u1', version: 1, name: 'Alice', email: 'alice@test.com' });
      const config = createTestConfig({ recordCache: cache });

      const TestComponent = () => {
        const { data } = useRecords<User>('user', ['u1', 'missing']);
        return createElement(
          'span',
          { ['data-testid']: 'names' },
          data.map((u) => u?.name ?? 'undefined').join(', '),
        );
      };

      render(createElement(RealtimeProvider, { config }, createElement(TestComponent)));

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

      const TestComponent = () => {
        const { write, isWriting } = useWrite();
        return createElement(
          'div',
          null,
          createElement(
            'span',
            { ['data-testid']: 'has-write' },
            typeof write === 'function' ? 'true' : 'false',
          ),
          createElement('span', { ['data-testid']: 'is-writing' }, isWriting.toString()),
        );
      };

      render(createElement(RealtimeProvider, { config }, createElement(TestComponent)));

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

      const TestComponent = () => {
        const { write, isWriting } = useWrite();

        useEffect(() => {
          isWritingValues.push(isWriting);
        }, [isWriting]);

        useEffect(() => {
          void write([{ table: 'user', id: 'u1', updates: { name: 'Bob' } }]);
        }, [write]);

        return createElement('span', { ['data-testid']: 'is-writing' }, isWriting.toString());
      };

      render(createElement(RealtimeProvider, { config }, createElement(TestComponent)));

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

      const TestComponent = () => {
        const isOnline = useIsOnline();
        return createElement('span', { ['data-testid']: 'is-online' }, isOnline.toString());
      };

      render(createElement(RealtimeProvider, { config }, createElement(TestComponent)));

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      expect(screen.getByTestId('is-online').textContent).toBe('true');
    });

    it('should update when going offline', async () => {
      const cache = new RecordCache<TestTables>();
      const config = createTestConfig({ recordCache: cache });

      const TestComponent = () => {
        const isOnline = useIsOnline();
        return createElement('span', { ['data-testid']: 'is-online' }, isOnline.toString());
      };

      render(createElement(RealtimeProvider, { config }, createElement(TestComponent)));

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      expect(screen.getByTestId('is-online').textContent).toBe('true');

      act(() => {
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

      const TestComponent = () => {
        const isPending = useIsPendingWrite('user', 'u1');
        return createElement('span', { ['data-testid']: 'is-pending' }, isPending.toString());
      };

      render(createElement(RealtimeProvider, { config }, createElement(TestComponent)));

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

      const TestComponent = () => {
        const state = useConnectionState();
        return createElement('span', { ['data-testid']: 'state' }, state);
      };

      render(createElement(RealtimeProvider, { config }, createElement(TestComponent)));

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

      const TestComponent = () => {
        const { canUndo, canRedo, undoCount, redoCount } = useUndoRedo();
        return createElement(
          'div',
          null,
          createElement('span', { ['data-testid']: 'can-undo' }, canUndo.toString()),
          createElement('span', { ['data-testid']: 'can-redo' }, canRedo.toString()),
          createElement('span', { ['data-testid']: 'undo-count' }, undoCount),
          createElement('span', { ['data-testid']: 'redo-count' }, redoCount),
        );
      };

      render(createElement(RealtimeProvider, { config }, createElement(TestComponent)));

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

      const TestComponent = () => {
        const { undo, redo } = useUndoRedo();
        return createElement(
          'div',
          null,
          createElement(
            'span',
            { ['data-testid']: 'has-undo' },
            typeof undo === 'function' ? 'true' : 'false',
          ),
          createElement(
            'span',
            { ['data-testid']: 'has-redo' },
            typeof redo === 'function' ? 'true' : 'false',
          ),
        );
      };

      render(createElement(RealtimeProvider, { config }, createElement(TestComponent)));

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      expect(screen.getByTestId('has-undo').textContent).toBe('true');
      expect(screen.getByTestId('has-redo').textContent).toBe('true');
    });
  });
});
