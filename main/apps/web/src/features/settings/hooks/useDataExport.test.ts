// main/apps/web/src/features/settings/hooks/useDataExport.test.ts
import { clearApiClient } from '@abe-stack/api';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { useDataExport } from './useDataExport';

vi.mock('@app/ClientEnvironment', () => ({
  useClientEnvironment: () => ({ config: { apiUrl: 'http://localhost:3000' } }),
}));

describe('useDataExport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearApiClient();
    global.fetch = vi.fn();
    localStorage.clear();
  });

  it('should fetch export status on mount', async () => {
    localStorage.setItem('dataExportRequestId', 'export-1');
    const mockResponse = {
      exportRequest: {
        id: 'export-1',
        status: 'completed',
        createdAt: '2026-02-12T10:00:00Z',
        downloadUrl: 'https://example.com/export.zip',
        expiresAt: '2099-02-19T10:00:00Z',
      },
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });
    global.fetch = mockFetch;

    const { result } = renderHook(() => useDataExport());

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.exportInfo).toEqual({
      status: 'ready',
      requestedAt: '2026-02-12T10:00:00Z',
      estimatedReadyAt: null,
      downloadUrl: 'https://example.com/export.zip',
      expiresAt: '2099-02-19T10:00:00Z',
    });
    expect(result.current.error).toBeNull();
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/users/me/export/export-1/status',
      expect.objectContaining({
        credentials: 'include',
      }),
    );
  });

  it('should handle fetch error', async () => {
    localStorage.setItem('dataExportRequestId', 'export-error');
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ message: 'Failed to fetch export status' }),
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
    const pendingResponse = {
      exportRequest: {
        id: 'export-2',
        status: 'pending',
        createdAt: '2026-02-12T10:00:00Z',
        downloadUrl: null,
        expiresAt: null,
      },
    };

    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(pendingResponse),
    });
    global.fetch = mockFetch;

    const { result } = renderHook(() => useDataExport());

    await act(async () => {
      await result.current.requestExport();
    });

    await waitFor(() => {
      expect(result.current.isRequesting).toBe(false);
      expect(result.current.exportInfo).toEqual({
        status: 'pending',
        requestedAt: '2026-02-12T10:00:00Z',
        estimatedReadyAt: null,
        downloadUrl: null,
        expiresAt: null,
      });
    });

    expect(result.current.requestError).toBeNull();

    // Verify POST was called
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/users/me/export',
      expect.objectContaining({
        method: 'POST',
      }),
    );
  });

  it('should handle request export error', async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 429,
      json: () => Promise.resolve({ message: 'Export already in progress' }),
    });
    global.fetch = mockFetch;

    const { result } = renderHook(() => useDataExport());

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
    localStorage.setItem('dataExportRequestId', 'export-3');
    const mockExportInfo = {
      exportRequest: {
        id: 'export-3',
        status: 'pending',
        createdAt: '2026-02-12T10:00:00Z',
        downloadUrl: null,
        expiresAt: null,
      },
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
    const mockFetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));
    global.fetch = mockFetch;

    const { result } = renderHook(() => useDataExport());

    await act(async () => {
      await expect(result.current.requestExport()).rejects.toThrow(
        'Failed to fetch POST /users/me/export',
      );
    });

    await waitFor(() => {
      expect(result.current.isRequesting).toBe(false);
    });
  });
});
