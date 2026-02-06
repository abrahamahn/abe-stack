// client/react/src/hooks/useDelayedFlag.test.ts
/**
 * Tests for useDelayedFlag hook.
 *
 * Tests delayed flag functionality to prevent flash-of-loading states.
 * Uses fake timers with synchronous assertions (never waitFor with fake timers,
 * as waitFor's internal polling uses setTimeout which is faked).
 *
 * @module useDelayedFlag-test
 */

import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useDelayedFlag } from './useDelayedFlag';

describe('useDelayedFlag', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
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
    it('should set flag after default delay of 150ms', () => {
      const { result } = renderHook(() => useDelayedFlag(true));

      expect(result.current).toBe(false);

      act(() => {
        vi.advanceTimersByTime(150);
      });

      expect(result.current).toBe(true);
    });

    it('should set flag after custom delay', () => {
      const { result } = renderHook(() => useDelayedFlag(true, 300));

      expect(result.current).toBe(false);

      act(() => {
        vi.advanceTimersByTime(299);
      });

      expect(result.current).toBe(false);

      act(() => {
        vi.advanceTimersByTime(1);
      });

      expect(result.current).toBe(true);
    });

    it('should handle very short delay', () => {
      const { result } = renderHook(() => useDelayedFlag(true, 10));

      act(() => {
        vi.advanceTimersByTime(10);
      });

      expect(result.current).toBe(true);
    });

    it('should handle zero delay', () => {
      const { result } = renderHook(() => useDelayedFlag(true, 0));

      act(() => {
        vi.advanceTimersByTime(0);
      });

      expect(result.current).toBe(true);
    });

    it('should handle very long delay', () => {
      const { result } = renderHook(() => useDelayedFlag(true, 5000));

      act(() => {
        vi.advanceTimersByTime(4999);
      });

      expect(result.current).toBe(false);

      act(() => {
        vi.advanceTimersByTime(1);
      });

      expect(result.current).toBe(true);
    });
  });

  describe('immediate deactivation', () => {
    it('should reset to false immediately when active becomes false', () => {
      const { result, rerender } = renderHook(({ active }) => useDelayedFlag(active), {
        initialProps: { active: true },
      });

      act(() => {
        vi.advanceTimersByTime(150);
      });

      expect(result.current).toBe(true);

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
    it('should handle rapid on/off cycles', () => {
      const { result, rerender } = renderHook(({ active }) => useDelayedFlag(active, 150), {
        initialProps: { active: false },
      });

      // Turn on
      rerender({ active: true });
      act(() => {
        vi.advanceTimersByTime(100);
      });
      expect(result.current).toBe(false);

      // Turn off before delay
      rerender({ active: false });
      expect(result.current).toBe(false);

      // Turn on again
      rerender({ active: true });
      act(() => {
        vi.advanceTimersByTime(150);
      });

      expect(result.current).toBe(true);
    });

    it('should restart delay on reactivation', () => {
      const { result, rerender } = renderHook(({ active }) => useDelayedFlag(active, 200), {
        initialProps: { active: true },
      });

      act(() => {
        vi.advanceTimersByTime(100);
      });

      rerender({ active: false });
      expect(result.current).toBe(false);

      rerender({ active: true });

      act(() => {
        vi.advanceTimersByTime(100);
      });
      expect(result.current).toBe(false);

      act(() => {
        vi.advanceTimersByTime(100);
      });

      expect(result.current).toBe(true);
    });

    it('should handle multiple activations', () => {
      const { result, rerender } = renderHook(({ active }) => useDelayedFlag(active, 100), {
        initialProps: { active: false },
      });

      // First activation
      rerender({ active: true });
      act(() => {
        vi.advanceTimersByTime(100);
      });
      expect(result.current).toBe(true);

      // Deactivate
      rerender({ active: false });
      expect(result.current).toBe(false);

      // Second activation
      rerender({ active: true });
      act(() => {
        vi.advanceTimersByTime(100);
      });
      expect(result.current).toBe(true);

      // Deactivate
      rerender({ active: false });
      expect(result.current).toBe(false);
    });
  });

  describe('delay changes', () => {
    it('should respect new delay value', () => {
      const { result, rerender } = renderHook(
        ({ active, delay }) => useDelayedFlag(active, delay),
        {
          initialProps: { active: true, delay: 100 },
        },
      );

      rerender({ active: true, delay: 300 });

      act(() => {
        vi.advanceTimersByTime(100);
      });
      expect(result.current).toBe(false);

      act(() => {
        vi.advanceTimersByTime(200);
      });

      expect(result.current).toBe(true);
    });

    it('should restart timer when delay changes', () => {
      const { result, rerender } = renderHook(
        ({ active, delay }) => useDelayedFlag(active, delay),
        {
          initialProps: { active: true, delay: 200 },
        },
      );

      // Advance 100ms into the 200ms timer
      act(() => {
        vi.advanceTimersByTime(100);
      });

      // Change delay to 300ms — useEffect deps change, timer restarts from scratch
      rerender({ active: true, delay: 300 });

      // Advance 200ms — old timer would have fired at 200ms total,
      // but the new 300ms timer started at t=100, so hasn't fired yet
      act(() => {
        vi.advanceTimersByTime(200);
      });
      expect(result.current).toBe(false);

      // Advance another 100ms — now 300ms after the rerender, timer fires
      act(() => {
        vi.advanceTimersByTime(100);
      });

      expect(result.current).toBe(true);
    });
  });

  describe('cleanup', () => {
    it('should clear timeout on unmount', () => {
      const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');

      const { unmount } = renderHook(() => useDelayedFlag(true, 200));

      unmount();

      expect(clearTimeoutSpy).toHaveBeenCalled();
    });

    it('should clear timeout when active changes to false', () => {
      const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');

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
    it('should handle negative delay as zero', () => {
      const { result } = renderHook(() => useDelayedFlag(true, -100));

      act(() => {
        vi.advanceTimersByTime(0);
      });

      expect(result.current).toBe(true);
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

    it('should handle same active value updates', () => {
      const { result, rerender } = renderHook(({ active }) => useDelayedFlag(active, 100), {
        initialProps: { active: true },
      });

      rerender({ active: true });

      act(() => {
        vi.advanceTimersByTime(100);
      });

      expect(result.current).toBe(true);
    });
  });

  describe('use case: loading spinners', () => {
    it('should prevent flash-of-loading for fast loads', () => {
      const { result, rerender } = renderHook(({ isLoading }) => useDelayedFlag(isLoading, 150), {
        initialProps: { isLoading: true },
      });

      // Fast load completes in 50ms
      act(() => {
        vi.advanceTimersByTime(50);
      });
      rerender({ isLoading: false });

      // Spinner never showed
      expect(result.current).toBe(false);

      act(() => {
        vi.advanceTimersByTime(200);
      });
      expect(result.current).toBe(false);
    });

    it('should show spinner for slow loads', () => {
      const { result, rerender } = renderHook(({ isLoading }) => useDelayedFlag(isLoading, 150), {
        initialProps: { isLoading: true },
      });

      // Slow load takes 500ms
      act(() => {
        vi.advanceTimersByTime(150);
      });

      expect(result.current).toBe(true);

      act(() => {
        vi.advanceTimersByTime(350);
      });

      // Loading completes
      rerender({ isLoading: false });
      expect(result.current).toBe(false);
    });

    it('should handle immediate hide after showing', () => {
      const { result, rerender } = renderHook(({ isLoading }) => useDelayedFlag(isLoading, 100), {
        initialProps: { isLoading: true },
      });

      act(() => {
        vi.advanceTimersByTime(100);
      });

      expect(result.current).toBe(true);

      rerender({ isLoading: false });
      expect(result.current).toBe(false);
    });
  });
});
