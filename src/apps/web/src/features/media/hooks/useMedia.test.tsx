// src/apps/web/src/features/media/hooks/useMedia.test.tsx
/**
 * Media Hooks Tests
 *
 * Tests for media query and mutation hooks.
 *
 * Note: The useMedia hooks use a module-level singleton API client
 * (created via createMediaApi) that captures `fetch` at creation time.
 * We mock createMediaApi to return an API that always delegates to
 * globalThis.fetch at call time, so vi.stubGlobal('fetch', ...) works
 * correctly across tests.
 */

import { QueryCacheProvider } from '@abe-stack/react';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { MediaMetadata, MediaStatusResponse, MediaUploadResponse } from '../api';

// ============================================================================
// Mock createMediaApi to avoid singleton fetch caching
// ============================================================================

vi.mock('../api', () => {
  return {
    createMediaApi: () => ({
      async uploadMedia(file: File): Promise<MediaUploadResponse> {
        const formData = new FormData();
        formData.append('file', file);
        const response = await globalThis.fetch('/api/media/upload', {
          method: 'POST',
          body: formData,
        });
        const data = (await response.json()) as Record<string, unknown>;
        if (!response.ok) {
          throw new Error((data['message'] as string) ?? 'Upload failed');
        }
        return data as unknown as MediaUploadResponse;
      },
      async getMedia(id: string): Promise<MediaMetadata> {
        const response = await globalThis.fetch(`/api/media/${id}`);
        const data = (await response.json()) as Record<string, unknown>;
        if (!response.ok) {
          throw new Error((data['message'] as string) ?? 'Get media failed');
        }
        return data as unknown as MediaMetadata;
      },
      async deleteMedia(id: string): Promise<void> {
        const response = await globalThis.fetch(`/api/media/${id}/delete`, {
          method: 'DELETE',
        });
        if (!response.ok) {
          const data = (await response.json()) as Record<string, unknown>;
          throw new Error((data['message'] as string) ?? 'Delete failed');
        }
      },
      async getMediaStatus(id: string): Promise<MediaStatusResponse> {
        const response = await globalThis.fetch(`/api/media/${id}/status`);
        const data = (await response.json()) as Record<string, unknown>;
        if (!response.ok) {
          throw new Error((data['message'] as string) ?? 'Get status failed');
        }
        return data as unknown as MediaStatusResponse;
      },
    }),
  };
});

// Import hooks AFTER mock is set up (vi.mock is hoisted automatically)
const { useDeleteMedia, useMedia, useMediaStatus, useUploadMedia } = await import('./useMedia');

// ============================================================================
// Test Setup
// ============================================================================

const mockUploadResponse: MediaUploadResponse = {
  fileId: 'file-123',
  storageKey: 'uploads/file-123.jpg',
  filename: 'test.jpg',
  mimeType: 'image/jpeg',
  sizeBytes: 1024,
  processingJobId: 'job-456',
};

const mockMediaMetadata: MediaMetadata = {
  id: 'file-123',
  filename: 'test.jpg',
  mimeType: 'image/jpeg',
  sizeBytes: 1024,
  url: 'https://example.com/file-123.jpg',
  purpose: 'upload',
  processingStatus: 'complete',
  createdAt: '2026-02-11T00:00:00Z',
};

const mockStatusResponse: MediaStatusResponse = {
  fileId: 'file-123',
  status: 'complete',
  error: null,
};

function createWrapper() {
  return function Wrapper({ children }: { children: React.ReactNode }): React.JSX.Element {
    return <QueryCacheProvider>{children}</QueryCacheProvider>;
  };
}

// ============================================================================
// Upload Media Tests
// ============================================================================

describe('useUploadMedia', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockUploadResponse),
        } as Response),
      ),
    );
  });

  it('should upload a file successfully', async () => {
    const { result } = renderHook(() => useUploadMedia(), {
      wrapper: createWrapper(),
    });

    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

    act(() => {
      result.current.mutate(file);
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(mockUploadResponse);
    expect(result.current.isError).toBe(false);
  });

  it('should handle upload errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 400,
          json: () => Promise.resolve({ message: 'Invalid file' }),
        } as Response),
      ),
    );

    const { result } = renderHook(() => useUploadMedia(), {
      wrapper: createWrapper(),
    });

    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

    act(() => {
      result.current.mutate(file);
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeTruthy();
  });

  it('should reset mutation state', async () => {
    const { result } = renderHook(() => useUploadMedia(), {
      wrapper: createWrapper(),
    });

    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

    act(() => {
      result.current.mutate(file);
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(mockUploadResponse);
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.data).toBeUndefined();
    expect(result.current.error).toBeNull();
  });
});

// ============================================================================
// Get Media Tests
// ============================================================================

describe('useMedia', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockMediaMetadata),
        } as Response),
      ),
    );
  });

  it('should fetch media metadata', async () => {
    const { result } = renderHook(() => useMedia({ id: 'file-123' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.media).toEqual(mockMediaMetadata);
    expect(result.current.isError).toBe(false);
  });

  it('should not fetch when disabled', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    renderHook(() => useMedia({ id: 'file-123', enabled: false }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });

  it('should handle fetch errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 404,
          json: () => Promise.resolve({ message: 'Not found' }),
        } as Response),
      ),
    );

    const { result } = renderHook(() => useMedia({ id: 'file-999' }), {
      wrapper: createWrapper(),
    });

    await waitFor(
      () => {
        expect(result.current.isError).toBe(true);
      },
      { timeout: 15000 },
    );

    expect(result.current.error).toBeTruthy();
  });
});

// ============================================================================
// Delete Media Tests
// ============================================================================

describe('useDeleteMedia', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 204,
          json: () => Promise.resolve({}),
        } as Response),
      ),
    );
  });

  it('should delete media successfully', async () => {
    const { result } = renderHook(() => useDeleteMedia(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate('file-123');
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isError).toBe(false);
  });

  it('should handle delete errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 403,
          json: () => Promise.resolve({ message: 'Forbidden' }),
        } as Response),
      ),
    );

    const { result } = renderHook(() => useDeleteMedia(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate('file-123');
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeTruthy();
  });
});

// ============================================================================
// Media Status Tests
// ============================================================================

describe('useMediaStatus', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockStatusResponse),
        } as Response),
      ),
    );
  });

  it('should fetch media status', async () => {
    const { result } = renderHook(() => useMediaStatus({ id: 'file-123' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.status).toEqual(mockStatusResponse);
    expect(result.current.isError).toBe(false);
  });

  it('should poll when status is processing', async () => {
    const fetchSpy = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            fileId: 'file-123',
            status: 'processing',
            error: null,
          } as MediaStatusResponse),
      } as Response),
    );

    vi.stubGlobal('fetch', fetchSpy);
    vi.useFakeTimers();

    renderHook(() => useMediaStatus({ id: 'file-123' }), {
      wrapper: createWrapper(),
    });

    // Flush initial fetch
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    const initialCallCount = fetchSpy.mock.calls.length;

    // Advance past the 3000ms polling interval
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3100);
    });

    expect(fetchSpy.mock.calls.length).toBeGreaterThan(initialCallCount);

    vi.useRealTimers();
  });

  it('should not poll when status is complete', async () => {
    const fetchSpy = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockStatusResponse),
      } as Response),
    );

    vi.stubGlobal('fetch', fetchSpy);
    vi.useFakeTimers();

    renderHook(() => useMediaStatus({ id: 'file-123' }), {
      wrapper: createWrapper(),
    });

    // Flush initial fetch
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    const callCount = fetchSpy.mock.calls.length;

    // Advance time - should not trigger more fetches since status is complete
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    expect(fetchSpy.mock.calls.length).toBe(callCount);

    vi.useRealTimers();
  });

  it('should not fetch when disabled', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    renderHook(() => useMediaStatus({ id: 'file-123', enabled: false }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });
});
