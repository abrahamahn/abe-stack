// src/apps/web/src/features/media/components/MediaStatusIndicator.test.tsx
/**
 * MediaStatusIndicator Component Tests
 *
 * Tests for media status display and polling behavior.
 *
 * Note: The component uses useMediaStatus which depends on a module-level
 * singleton API client. We mock the API module so that fetch calls always
 * delegate to the current globalThis.fetch, allowing vi.stubGlobal to work.
 */

import { QueryCacheProvider } from '@abe-stack/client-engine';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MediaStatusIndicator } from './MediaStatusIndicator';

import type { MediaStatusResponse } from '../api';

// ============================================================================
// Mock the API module to avoid singleton fetch caching
// ============================================================================

vi.mock('../api', () => {
  return {
    createMediaApi: () => ({
      async getMediaStatus(id: string): Promise<MediaStatusResponse> {
        const response = await globalThis.fetch(`/api/media/${id}/status`);
        const data = (await response.json()) as Record<string, unknown>;
        if (!response.ok) {
          throw new Error((data['message'] as string) ?? 'Get status failed');
        }
        return data as unknown as MediaStatusResponse;
      },
      uploadMedia(): Promise<never> {
        return Promise.reject(new Error('Not implemented in test mock'));
      },
      getMedia(): Promise<never> {
        return Promise.reject(new Error('Not implemented in test mock'));
      },
      deleteMedia(): Promise<void> {
        return Promise.reject(new Error('Not implemented in test mock'));
      },
    }),
  };
});

// ============================================================================
// Test Setup
// ============================================================================

function renderComponent(mediaId: string): ReturnType<typeof render> {
  return render(
    <QueryCacheProvider>
      <MediaStatusIndicator mediaId={mediaId} />
    </QueryCacheProvider>,
  );
}

// ============================================================================
// Component Tests
// ============================================================================

describe('MediaStatusIndicator', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              fileId: 'file-123',
              status: 'complete',
              error: null,
            } as MediaStatusResponse),
        } as Response),
      ),
    );
  });

  it('should render loading state initially', () => {
    renderComponent('file-123');

    expect(screen.getByText(/loading status/i)).toBeInTheDocument();
  });

  it('should display pending status', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              fileId: 'file-123',
              status: 'pending',
              error: null,
            } as MediaStatusResponse),
        } as Response),
      ),
    );

    renderComponent('file-123');

    await waitFor(() => {
      expect(screen.getByText(/pending processing/i)).toBeInTheDocument();
    });
  });

  it('should display processing status', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
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
      ),
    );

    renderComponent('file-123');

    await waitFor(() => {
      expect(screen.getByText(/processing/i)).toBeInTheDocument();
    });
  });

  it('should display complete status', async () => {
    renderComponent('file-123');

    await waitFor(() => {
      expect(screen.getByText(/processing complete/i)).toBeInTheDocument();
    });
  });

  it('should display failed status with error message', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              fileId: 'file-123',
              status: 'failed',
              error: 'File too large',
            } as MediaStatusResponse),
        } as Response),
      ),
    );

    renderComponent('file-123');

    await waitFor(() => {
      expect(screen.getByText(/processing failed/i)).toBeInTheDocument();
      expect(screen.getByText(/file too large/i)).toBeInTheDocument();
    });
  });

  it('should display error state when fetch fails', async () => {
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

    renderComponent('file-123');

    await waitFor(
      () => {
        expect(screen.getByText(/failed to load status/i)).toBeInTheDocument();
      },
      { timeout: 15000 },
    );
  });

  it('should show pending icon for pending status', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              fileId: 'file-123',
              status: 'pending',
              error: null,
            } as MediaStatusResponse),
        } as Response),
      ),
    );

    renderComponent('file-123');

    await waitFor(() => {
      expect(screen.getByText('🕐')).toBeInTheDocument();
    });
  });

  it('should show checkmark for complete status', async () => {
    renderComponent('file-123');

    await waitFor(() => {
      expect(screen.getByText('✓')).toBeInTheDocument();
    });
  });

  it('should show error icon for failed status', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              fileId: 'file-123',
              status: 'failed',
              error: 'Processing error',
            } as MediaStatusResponse),
        } as Response),
      ),
    );

    renderComponent('file-123');

    await waitFor(() => {
      expect(screen.getByText('✕')).toBeInTheDocument();
    });
  });

  it('should use correct alert styles for complete status', async () => {
    renderComponent('file-123');

    await waitFor(() => {
      const completeElement = screen.getByText(/processing complete/i).parentElement;
      expect(completeElement?.style.backgroundColor).toBe('var(--ui-alert-success-bg)');
    });
  });
});
