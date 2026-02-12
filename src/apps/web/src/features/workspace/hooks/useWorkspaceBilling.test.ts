// src/apps/web/src/features/workspace/hooks/useWorkspaceBilling.test.ts
/**
 * Tests for useWorkspaceBilling hook.
 */

import { QueryCache, QueryCacheProvider } from '@abe-stack/client-engine';
import { renderHook, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useWorkspaceBilling } from './useWorkspaceBilling';

import type { SubscriptionResponse } from './useWorkspaceBilling';

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

describe('useWorkspaceBilling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.clear();
    mockLocalStorage.setItem('accessToken', 'test-token');
  });

  it('should fetch subscription data', async () => {
    const mockResponse: SubscriptionResponse = {
      subscription: {
        id: 'sub-1',
        userId: 'user-1',
        planId: 'plan-pro',
        plan: {
          id: 'plan-pro',
          name: 'Pro',
          tier: 'pro',
          price: 2900,
          currency: 'usd',
          interval: 'month',
        },
        provider: 'stripe',
        status: 'active',
        currentPeriodStart: '2024-01-01',
        currentPeriodEnd: '2024-02-01',
        cancelAtPeriodEnd: false,
        canceledAt: null,
        trialEnd: null,
        createdAt: '2024-01-01',
      },
    };

    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response),
    );

    const { result } = renderHook(() => useWorkspaceBilling('tenant-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.subscription).toEqual(mockResponse.subscription);
    if (mockResponse.subscription !== null) {
      expect(result.current.plan).toEqual(mockResponse.subscription.plan);
    }
    expect(result.current.error).toBe(null);
  });

  it('should return null for no subscription', async () => {
    const mockResponse: SubscriptionResponse = {
      subscription: null,
    };

    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response),
    );

    const { result } = renderHook(() => useWorkspaceBilling('tenant-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.subscription).toBe(null);
    expect(result.current.plan).toBe(null);
    expect(result.current.error).toBe(null);
  });

  it('should handle fetch errors', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as Response),
    );

    const { result } = renderHook(() => useWorkspaceBilling('tenant-1'), {
      wrapper: createWrapper(),
    });

    // useQuery retries 3 times with exponential backoff (1s, 2s, 4s)
    await waitFor(
      () => {
        expect(result.current.isError).toBe(true);
      },
      { timeout: 15000 },
    );

    expect(result.current.subscription).toBe(null);
    expect(result.current.plan).toBe(null);
    expect(result.current.error).not.toBe(null);
  });

  it('should respect enabled option', () => {
    const { result } = renderHook(() => useWorkspaceBilling('tenant-1', { enabled: false }), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.subscription).toBe(null);
  });
});
