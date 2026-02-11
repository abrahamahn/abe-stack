// src/apps/web/src/features/workspace/hooks/useAuditLog.test.ts
/**
 * Tests for useAuditLog hook.
 */

import { QueryCache, QueryCacheProvider } from '@abe-stack/client-engine';
import { renderHook, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuditLog } from './useAuditLog';

import type { AuditEventsResponse } from './useAuditLog';

// ============================================================================
// Mocks
// ============================================================================

vi.mock('@app/ClientEnvironment', () => ({
  useClientEnvironment: () => ({
    config: { apiUrl: 'http://localhost:3000' },
  }),
}));

const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string): string | null => store[key] ?? null,
    setItem: (key: string, value: string): void => {
      store[key] = value;
    },
    clear: (): void => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

// ============================================================================
// Test Setup
// ============================================================================

function createWrapper(): (props: { children: ReactNode }) => ReactNode {
  const queryCache = new QueryCache();

  return (props: { children: ReactNode }) => {
    return createElement(QueryCacheProvider, { cache: queryCache, children: props.children });
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('useAuditLog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.clear();
    mockLocalStorage.setItem('accessToken', 'test-token');
  });

  it('should fetch audit events', async () => {
    const mockResponse: AuditEventsResponse = {
      events: [
        {
          id: 'evt-1',
          action: 'create.member',
          actorId: 'user-1',
          details: 'Added user-2 as member',
          createdAt: '2024-01-15T10:00:00Z',
        },
        {
          id: 'evt-2',
          action: 'update.settings',
          actorId: 'user-1',
          details: 'Updated workspace name',
          createdAt: '2024-01-14T09:00:00Z',
        },
      ],
    };

    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response),
    );

    const { result } = renderHook(() => useAuditLog('tenant-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.events).toEqual(mockResponse.events);
    expect(result.current.error).toBe(null);
    expect(result.current.isError).toBe(false);
  });

  it('should return empty array when no events', async () => {
    const mockResponse: AuditEventsResponse = {
      events: [],
    };

    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response),
    );

    const { result } = renderHook(() => useAuditLog('tenant-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.events).toEqual([]);
    expect(result.current.error).toBe(null);
  });

  it('should return empty events on initial state', () => {
    global.fetch = vi.fn(() => new Promise(() => {})); // never resolves

    const { result } = renderHook(() => useAuditLog('tenant-1'), {
      wrapper: createWrapper(),
    });

    expect(result.current.events).toEqual([]);
    expect(result.current.error).toBe(null);
    expect(result.current.isLoading).toBe(true);
  });

  it('should call the correct API endpoint', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ events: [] }),
      } as Response),
    );

    renderHook(() => useAuditLog('tenant-abc'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/tenants/tenant-abc/audit-events',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
        }),
        credentials: 'include',
      }),
    );
  });
});
