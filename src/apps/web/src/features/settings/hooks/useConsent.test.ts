// src/apps/web/src/features/settings/hooks/useConsent.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useConsent, useUpdateConsent } from './useConsent';

describe('useConsent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('should fetch consent preferences on mount', async () => {
    const mockPreferences = {
      analytics: true,
      marketing_email: false,
      third_party_sharing: null,
      profiling: false,
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ preferences: mockPreferences }),
    });
    global.fetch = mockFetch;

    const { result } = renderHook(() => useConsent());

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.preferences).toEqual(mockPreferences);
    expect(result.current.error).toBeNull();
  });

  it('should handle fetch error', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    });
    global.fetch = mockFetch;

    const { result } = renderHook(() => useConsent());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.preferences).toBeNull();
  });

  it('should provide refetch function', async () => {
    const mockPreferences = {
      analytics: true,
      marketing_email: false,
      third_party_sharing: null,
      profiling: false,
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ preferences: mockPreferences }),
    });
    global.fetch = mockFetch;

    const { result } = renderHook(() => useConsent());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Clear the initial call
    mockFetch.mockClear();

    // Refetch
    await result.current.refetch();

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });
});

describe('useUpdateConsent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('should update consent preferences', async () => {
    const mockResponse = {
      preferences: {
        analytics: true,
        marketing_email: true,
        third_party_sharing: false,
        profiling: false,
      },
      updated: 2,
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });
    global.fetch = mockFetch;

    const { result } = renderHook(() => useUpdateConsent());

    const updatePromise = result.current.updateConsent({
      analytics: true,
      marketing_email: true,
    });

    expect(result.current.isUpdating).toBe(true);

    const response = await updatePromise;

    await waitFor(() => {
      expect(result.current.isUpdating).toBe(false);
    });

    expect(response).toEqual(mockResponse);
    expect(result.current.error).toBeNull();

    expect(mockFetch).toHaveBeenCalledWith('/api/users/me/consent', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        analytics: true,
        marketing_email: true,
      }),
    });
  });

  it('should handle update error', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ message: 'Invalid input' }),
    });
    global.fetch = mockFetch;

    const { result } = renderHook(() => useUpdateConsent());

    await expect(
      result.current.updateConsent({
        analytics: true,
      }),
    ).rejects.toThrow('Invalid input');

    await waitFor(() => {
      expect(result.current.isUpdating).toBe(false);
    });

    expect(result.current.error).toBeInstanceOf(Error);
  });

  it('should handle network error', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
    global.fetch = mockFetch;

    const { result } = renderHook(() => useUpdateConsent());

    await expect(
      result.current.updateConsent({
        analytics: true,
      }),
    ).rejects.toThrow('Network error');

    await waitFor(() => {
      expect(result.current.isUpdating).toBe(false);
    });
  });
});
