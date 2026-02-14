// main/apps/web/src/features/workspace/hooks/useWorkspaceFeatureOverrides.test.ts
/**
 * Tests for useWorkspaceFeatureOverrides hooks.
 */

import { clearApiClient, getApiClient } from '@abe-stack/api';
import { QueryCache } from '@abe-stack/client-engine';
import { QueryCacheProvider } from '@abe-stack/react';
import { renderHook, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import {
  useSetFeatureOverride,
  useWorkspaceFeatureOverrides,
} from './useWorkspaceFeatureOverrides';

import type { FlagWithOverride, TenantOverridesResponse } from './useWorkspaceFeatureOverrides';
import type { FeatureFlagListResponse } from '../../admin/services/adminApi';

// ============================================================================
// Mocks
// ============================================================================

const mockListFeatureFlags = vi.fn();
const mockListTenantFeatureOverrides = vi.fn();
const mockSetTenantFeatureOverride = vi.fn();
const mockDeleteTenantFeatureOverride = vi.fn();

vi.mock('@abe-stack/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@abe-stack/api')>();
  return {
    ...actual,
    clearApiClient: vi.fn(),
    getApiClient: vi.fn(() => ({
      listTenantFeatureOverrides: mockListTenantFeatureOverrides,
      setTenantFeatureOverride: mockSetTenantFeatureOverride,
      deleteTenantFeatureOverride: mockDeleteTenantFeatureOverride,
    })),
  };
});

vi.mock('../../admin/services/adminApi', () => ({
  createAdminApiClient: vi.fn(() => ({
    listFeatureFlags: mockListFeatureFlags,
  })),
}));

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

describe('useWorkspaceFeatureOverrides', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearApiClient();
    mockLocalStorage.clear();
    mockLocalStorage.setItem('accessToken', 'test-token');
  });

  it('should fetch and merge flags with overrides', async () => {
    const mockFlags: FeatureFlagListResponse = {
      flags: [
        {
          key: 'test.feature1',
          description: 'Test Feature 1',
          isEnabled: true,
          defaultValue: null,
          metadata: {},
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
        },
        {
          key: 'test.feature2',
          description: 'Test Feature 2',
          isEnabled: false,
          defaultValue: null,
          metadata: {},
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
        },
      ],
    };

    const mockOverrides: TenantOverridesResponse = {
      overrides: [
        {
          tenantId: 'tenant-1',
          key: 'test.feature1',
          value: null,
          isEnabled: false,
        },
      ],
    };

    mockListFeatureFlags.mockResolvedValue(mockFlags);
    mockListTenantFeatureOverrides.mockResolvedValue(mockOverrides);

    const { result } = renderHook(() => useWorkspaceFeatureOverrides('tenant-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const expectedFlags: FlagWithOverride[] = [
      {
        key: 'test.feature1',
        description: 'Test Feature 1',
        globalEnabled: true,
        overrideState: 'off',
      },
      {
        key: 'test.feature2',
        description: 'Test Feature 2',
        globalEnabled: false,
        overrideState: 'inherit',
      },
    ];

    expect(result.current.flags).toEqual(expectedFlags);
    expect(result.current.error).toBe(null);
  });

  it('should handle fetch errors', async () => {
    mockListFeatureFlags.mockRejectedValue(new Error('Server error'));

    const { result } = renderHook(() => useWorkspaceFeatureOverrides('tenant-1'), {
      wrapper: createWrapper(),
    });

    // useQuery retries 3 times with exponential backoff (1s, 2s, 4s)
    await waitFor(
      () => {
        expect(result.current.isError).toBe(true);
      },
      { timeout: 15000 },
    );

    expect(result.current.flags).toEqual([]);
    expect(result.current.error).not.toBe(null);
  });
});

describe('useSetFeatureOverride', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearApiClient();
    mockLocalStorage.clear();
    mockLocalStorage.setItem('accessToken', 'test-token');
  });

  it('should set override to "on"', async () => {
    const mockResponse = {
      override: {
        tenantId: 'tenant-1',
        key: 'test.feature',
        value: null,
        isEnabled: true,
      },
    };

    mockSetTenantFeatureOverride.mockResolvedValue(mockResponse);

    const onSuccess = vi.fn();
    const { result } = renderHook(() => useSetFeatureOverride({ onSuccess }), {
      wrapper: createWrapper(),
    });

    result.current.setOverride('tenant-1', 'test.feature', 'on');

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(onSuccess).toHaveBeenCalled();
    const api = vi.mocked(getApiClient).mock.results[0]?.value;
    expect(api?.setTenantFeatureOverride).toHaveBeenCalledWith('tenant-1', 'test.feature', {
      isEnabled: true,
    });
  });

  it('should delete override when set to "inherit"', async () => {
    mockDeleteTenantFeatureOverride.mockResolvedValue({ success: true });

    const onSuccess = vi.fn();
    const { result } = renderHook(() => useSetFeatureOverride({ onSuccess }), {
      wrapper: createWrapper(),
    });

    result.current.setOverride('tenant-1', 'test.feature', 'inherit');

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(onSuccess).toHaveBeenCalled();
    const api = vi.mocked(getApiClient).mock.results[0]?.value;
    expect(api?.deleteTenantFeatureOverride).toHaveBeenCalledWith('tenant-1', 'test.feature');
  });

  it('should handle errors', async () => {
    mockSetTenantFeatureOverride.mockRejectedValue(new Error('Server error'));

    const onError = vi.fn();
    const { result } = renderHook(() => useSetFeatureOverride({ onError }), {
      wrapper: createWrapper(),
    });

    result.current.setOverride('tenant-1', 'test.feature', 'on');

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(onError).toHaveBeenCalled();
  });
});
