// client/ui/src/hooks/useDelayedFlag.test.ts
/**
 * Tests for useDelayedFlag hook.
 *
 * Tests delayed flag functionality to prevent flash-of-loading states.
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useDelayedFlag } from './useDelayedFlag';

describe('useDelayedFlag', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('initial state', () => {
    it('should return false initially when active is false', () => {
      const { result } = renderHook(() => useDelayedFlag(false));

      expect(result.current).toBe(false);
    });

    it('should return false initially when active is true', () => {
      const { result } = renderHook(() => useDelayedFlag(true));

      expect(result.current).toBe(false);
    });

    it('should not set flag immediately when active is true', () => {
      const { result } = renderHook(() => useDelayedFlag(true, 150));

      expect(result.current).toBe(false);

      act(() => {
        vi.advanceTimersByTime(100);
      });

      expect(result.current).toBe(false);
    });
  });

  describe('delayed activation', () => {
    it('should set flag after default delay of 150ms', async () => {
      const { result } = renderHook(() => useDelayedFlag(true));

      expect(result.current).toBe(false);

      act(() => {
        vi.advanceTimersByTime(150);
      });

      await waitFor(() => {
        expect(result.current).toBe(true);
      });
    });

    it('should set flag after custom delay', async () => {
      const { result } = renderHook(() => useDelayedFlag(true, 300));

      expect(result.current).toBe(false);

      act(() => {
        vi.advanceTimersByTime(299);
      });

      expect(result.current).toBe(false);

      act(() => {
        vi.advanceTimersByTime(1);
      });

      await waitFor(() => {
        expect(result.current).toBe(true);
      });
    });

    it('should handle very short delay', async () => {
      const { result } = renderHook(() => useDelayedFlag(true, 10));

      act(() => {
        vi.advanceTimersByTime(10);
      });

      await waitFor(() => {
        expect(result.current).toBe(true);
      });
    });

    it('should handle zero delay', async () => {
      const { result } = renderHook(() => useDelayedFlag(true, 0));

      act(() => {
        vi.advanceTimersByTime(0);
      });

      await waitFor(() => {
        expect(result.current).toBe(true);
      });
    });

    it('should handle very long delay', async () => {
      const { result } = renderHook(() => useDelayedFlag(true, 5000));

      act(() => {
        vi.advanceTimersByTime(4999);
      });

      expect(result.current).toBe(false);

      act(() => {
        vi.advanceTimersByTime(1);
      });

      await waitFor(() => {
        expect(result.current).toBe(true);
      });
    });
  });

  describe('immediate deactivation', () => {
    it('should reset to false immediately when active becomes false', async () => {
      const { result, rerender } = renderHook(({ active }) => useDelayedFlag(active), {
        initialProps: { active: true },
      });

      act(() => {
        vi.advanceTimersByTime(150);
      });

      await waitFor(() => {
        expect(result.current).toBe(true);
      });

      rerender({ active: false });

      expect(result.current).toBe(false);
    });

    it('should reset before delay completes', () => {
      const { result, rerender } = renderHook(({ active }) => useDelayedFlag(active, 200), {
        initialProps: { active: true },
      });

      act(() => {
        vi.advanceTimersByTime(100);
      });

      expect(result.current).toBe(false);

      rerender({ active: false });

      expect(result.current).toBe(false);

      act(() => {
        vi.advanceTimersByTime(100);
      });

      expect(result.current).toBe(false);
    });

    it('should not set flag if deactivated before delay', () => {
      const { result, rerender } = renderHook(({ active }) => useDelayedFlag(active, 200), {
        initialProps: { active: true },
      });

      act(() => {
        vi.advanceTimersByTime(100);
      });

      rerender({ active: false });

      act(() => {
        vi.advanceTimersByTime(200);
      });

      expect(result.current).toBe(false);
    });
  });

  describe('activation cycles', () => {
    it('should handle rapid on/off cycles', async () => {
      const { result, rerender } = renderHook(({ active }) => useDelayedFlag(active, 150), {
        initialProps: { active: false },
      });

      // Turn on
      rerender({ active: true });
      void act(() => vi.advanceTimersByTime(100));
      expect(result.current).toBe(false);

      // Turn off before delay
      rerender({ active: false });
      expect(result.current).toBe(false);

      // Turn on again
      rerender({ active: true });
      void act(() => vi.advanceTimersByTime(150));

      await waitFor(() => {
        expect(result.current).toBe(true);
      });
    });

    it('should restart delay on reactivation', async () => {
      const { result, rerender } = renderHook(({ active }) => useDelayedFlag(active, 200), {
        initialProps: { active: true },
      });

      void act(() => vi.advanceTimersByTime(100));

      rerender({ active: false });
      expect(result.current).toBe(false);

      rerender({ active: true });

      void act(() => vi.advanceTimersByTime(100));
      expect(result.current).toBe(false);

      void act(() => vi.advanceTimersByTime(100));

      await waitFor(() => {
        expect(result.current).toBe(true);
      });
    });

    it('should handle multiple activations', async () => {
      const { result, rerender } = renderHook(({ active }) => useDelayedFlag(active, 100), {
        initialProps: { active: false },
      });

      // First activation
      rerender({ active: true });
      void act(() => vi.advanceTimersByTime(100));
      await waitFor(() => {
        expect(result.current).toBe(true);
      });

      // Deactivate
      rerender({ active: false });
      expect(result.current).toBe(false);

      // Second activation
      rerender({ active: true });
      void act(() => vi.advanceTimersByTime(100));
      await waitFor(() => {
        expect(result.current).toBe(true);
      });

      // Deactivate
      rerender({ active: false });
      expect(result.current).toBe(false);
    });
  });

  describe('delay changes', () => {
    it('should respect new delay value', async () => {
      const { result, rerender } = renderHook(
        ({ active, delay }) => useDelayedFlag(active, delay),
        {
          initialProps: { active: true, delay: 100 },
        },
      );

      rerender({ active: true, delay: 300 });

      void act(() => vi.advanceTimersByTime(100));
      expect(result.current).toBe(false);

      void act(() => vi.advanceTimersByTime(200));

      await waitFor(() => {
        expect(result.current).toBe(true);
      });
    });

    it('should restart timer when delay changes', async () => {
      const { result, rerender } = renderHook(
        ({ active, delay }) => useDelayedFlag(active, delay),
        {
          initialProps: { active: true, delay: 200 },
        },
      );

      void act(() => vi.advanceTimersByTime(100));

      rerender({ active: true, delay: 200 });

      void act(() => vi.advanceTimersByTime(100));
      expect(result.current).toBe(false);

      void act(() => vi.advanceTimersByTime(100));

      await waitFor(() => {
        expect(result.current).toBe(true);
      });
    });
  });

  describe('cleanup', () => {
    it('should clear timeout on unmount', () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

      const { unmount } = renderHook(() => useDelayedFlag(true, 200));

      unmount();

      expect(clearTimeoutSpy).toHaveBeenCalled();
    });

    it('should clear timeout when active changes to false', () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

      const { rerender } = renderHook(({ active }) => useDelayedFlag(active, 200), {
        initialProps: { active: true },
      });

      rerender({ active: false });

      expect(clearTimeoutSpy).toHaveBeenCalled();
    });

    it('should not set flag after unmount', () => {
      const { result, unmount } = renderHook(() => useDelayedFlag(true, 200));

      unmount();

      act(() => {
        vi.advanceTimersByTime(200);
      });

      expect(result.current).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle negative delay as zero', async () => {
      const { result } = renderHook(() => useDelayedFlag(true, -100));

      act(() => {
        vi.advanceTimersByTime(0);
      });

      await waitFor(() => {
        expect(result.current).toBe(true);
      });
    });

    it('should remain false when always inactive', () => {
      const { result, rerender } = renderHook(({ active }) => useDelayedFlag(active, 100), {
        initialProps: { active: false },
      });

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(result.current).toBe(false);

      rerender({ active: false });

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(result.current).toBe(false);
    });

    it('should handle same active value updates', async () => {
      const { result, rerender } = renderHook(({ active }) => useDelayedFlag(active, 100), {
        initialProps: { active: true },
      });

      rerender({ active: true });

      act(() => {
        vi.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(result.current).toBe(true);
      });
    });
  });

  describe('use case: loading spinners', () => {
    it('should prevent flash-of-loading for fast loads', () => {
      const { result, rerender } = renderHook(({ isLoading }) => useDelayedFlag(isLoading, 150), {
        initialProps: { isLoading: true },
      });

      // Fast load completes in 50ms
      void act(() => vi.advanceTimersByTime(50));
      rerender({ isLoading: false });

      // Spinner never showed
      expect(result.current).toBe(false);

      void act(() => vi.advanceTimersByTime(200));
      expect(result.current).toBe(false);
    });

    it('should show spinner for slow loads', async () => {
      const { result, rerender } = renderHook(({ isLoading }) => useDelayedFlag(isLoading, 150), {
        initialProps: { isLoading: true },
      });

      // Slow load takes 500ms
      void act(() => vi.advanceTimersByTime(150));

      await waitFor(() => {
        expect(result.current).toBe(true);
      });

      void act(() => vi.advanceTimersByTime(350));

      // Loading completes
      rerender({ isLoading: false });
      expect(result.current).toBe(false);
    });

    it('should handle immediate hide after showing', async () => {
      const { result, rerender } = renderHook(({ isLoading }) => useDelayedFlag(isLoading, 100), {
        initialProps: { isLoading: true },
      });

      void act(() => vi.advanceTimersByTime(100));

      await waitFor(() => {
        expect(result.current).toBe(true);
      });

      rerender({ isLoading: false });
      expect(result.current).toBe(false);
    });
  });
});
