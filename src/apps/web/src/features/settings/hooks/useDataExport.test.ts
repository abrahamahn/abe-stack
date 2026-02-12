// src/apps/web/src/features/settings/hooks/useDataExport.test.ts
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useDataExport } from './useDataExport';

describe('useDataExport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('should fetch export status on mount', async () => {
    const mockExportInfo = {
      status: 'none',
      requestedAt: null,
      estimatedReadyAt: null,
      downloadUrl: null,
      expiresAt: null,
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockExportInfo),
    });
    global.fetch = mockFetch;

    const { result } = renderHook(() => useDataExport());

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.exportInfo).toEqual(mockExportInfo);
    expect(result.current.error).toBeNull();
    expect(mockFetch).toHaveBeenCalledWith('/api/users/me/export', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
  });

  it('should handle fetch error', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    });
    global.fetch = mockFetch;

    const { result } = renderHook(() => useDataExport());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('Failed to fetch export status');
    expect(result.current.exportInfo).toBeNull();
  });

  it('should request a data export', async () => {
    // Initial fetch returns no export
    const initialInfo = {
      status: 'none',
      requestedAt: null,
      estimatedReadyAt: null,
      downloadUrl: null,
      expiresAt: null,
    };

    const pendingInfo = {
      status: 'pending',
      requestedAt: '2026-02-12T10:00:00Z',
      estimatedReadyAt: '2026-02-12T11:00:00Z',
      downloadUrl: null,
      expiresAt: null,
    };

    const mockFetch = vi
      .fn()
      // First call: GET status
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(initialInfo),
      })
      // Second call: POST request export
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(pendingInfo),
      });
    global.fetch = mockFetch;

    const { result } = renderHook(() => useDataExport());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.requestExport();
    });

    await waitFor(() => {
      expect(result.current.isRequesting).toBe(false);
      expect(result.current.exportInfo).toEqual(pendingInfo);
    });

    expect(result.current.requestError).toBeNull();

    // Verify POST was called
    expect(mockFetch).toHaveBeenCalledWith('/api/users/me/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
  });

  it('should handle request export error', async () => {
    const initialInfo = {
      status: 'none',
      requestedAt: null,
      estimatedReadyAt: null,
      downloadUrl: null,
      expiresAt: null,
    };

    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(initialInfo),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: () => Promise.resolve({ message: 'Export already in progress' }),
      });
    global.fetch = mockFetch;

    const { result } = renderHook(() => useDataExport());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await expect(result.current.requestExport()).rejects.toThrow('Export already in progress');
    });

    await waitFor(() => {
      expect(result.current.isRequesting).toBe(false);
      expect(result.current.requestError).toBeInstanceOf(Error);
      expect(result.current.requestError?.message).toBe('Export already in progress');
    });
  });

  it('should provide refetch function', async () => {
    const mockExportInfo = {
      status: 'ready',
      requestedAt: '2026-02-12T10:00:00Z',
      estimatedReadyAt: null,
      downloadUrl: 'https://example.com/export.zip',
      expiresAt: '2026-02-19T10:00:00Z',
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockExportInfo),
    });
    global.fetch = mockFetch;

    const { result } = renderHook(() => useDataExport());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    mockFetch.mockClear();

    await act(async () => {
      await result.current.refetch();
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('should handle network error on request', async () => {
    const initialInfo = {
      status: 'none',
      requestedAt: null,
      estimatedReadyAt: null,
      downloadUrl: null,
      expiresAt: null,
    };

    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(initialInfo),
      })
      .mockRejectedValueOnce(new Error('Network error'));
    global.fetch = mockFetch;

    const { result } = renderHook(() => useDataExport());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await expect(result.current.requestExport()).rejects.toThrow('Network error');
    });

    await waitFor(() => {
      expect(result.current.isRequesting).toBe(false);
    });
  });
});
