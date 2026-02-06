// apps/web/src/features/home/hooks/useDocContent.test.ts
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../data', () => ({
  loadDocContent: vi.fn(),
}));

import { loadDocContent } from '../data';

import { useDocContent } from './useDocContent';

import type { DocKey } from '../types';

describe('useDocContent', () => {
  it('should start in loading state', () => {
    vi.mocked(loadDocContent).mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useDocContent('readme'));
    expect(result.current.isLoading).toBe(true);
    expect(result.current.content).toBeNull();
  });

  it('should load content successfully', async () => {
    vi.mocked(loadDocContent).mockResolvedValue('# README\n\nHello world');
    const { result } = renderHook(() => useDocContent('readme'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.content).toBe('# README\n\nHello world');
  });

  it('should handle load errors gracefully', async () => {
    vi.mocked(loadDocContent).mockRejectedValue(new Error('Failed'));
    const { result } = renderHook(() => useDocContent('readme'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.content).toBe('Failed to load documentation.');
  });

  it('should use cached content on subsequent renders with same key', async () => {
    vi.mocked(loadDocContent).mockResolvedValue('# Cached');
    const { result, rerender } = renderHook(({ key }) => useDocContent(key), {
      initialProps: { key: 'readme' as DocKey },
    });

    await waitFor(() => {
      expect(result.current.content).toBe('# Cached');
    });

    // Re-render with same key — should use cache, not call loadDocContent again
    vi.mocked(loadDocContent).mockClear();
    rerender({ key: 'readme' });

    expect(result.current.content).toBe('# Cached');
    expect(result.current.isLoading).toBe(false);
    // loadDocContent should NOT be called again for the cached key
    expect(loadDocContent).not.toHaveBeenCalled();
  });

  it('should load new content when key changes', async () => {
    vi.mocked(loadDocContent).mockResolvedValueOnce('# README').mockResolvedValueOnce('# Web App');

    const { result, rerender } = renderHook(({ key }: { key: DocKey }) => useDocContent(key), {
      initialProps: { key: 'readme' as DocKey },
    });

    await waitFor(() => {
      expect(result.current.content).toBe('# README');
    });

    act(() => {
      rerender({ key: 'web' });
    });

    await waitFor(() => {
      expect(result.current.content).toBe('# Web App');
    });
  });
});
