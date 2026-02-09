// src/client/react/src/hooks/useDebounce.test.ts
/**
 * Tests for useDebounce hook.
 *
 * Tests debounce functionality with different delays and value types.
 * Uses fake timers with synchronous assertions (never waitFor with fake timers,
 * as waitFor's internal polling uses setTimeout which is faked).
 *
 * @module useDebounce-test
 */

import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useDebounce } from './useDebounce';

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('initial state', () => {
    it('should return initial value immediately', () => {
      const { result } = renderHook(() => useDebounce('initial', 500));

      expect(result.current).toBe('initial');
    });

    it('should handle undefined initial value', () => {
      const { result } = renderHook(() => useDebounce<string | undefined>(undefined, 500));

      expect(result.current).toBeUndefined();
    });

    it('should handle null initial value', () => {
      const { result } = renderHook(() => useDebounce<string | null>(null, 500));

      expect(result.current).toBeNull();
    });

    it('should handle number initial value', () => {
      const { result } = renderHook(() => useDebounce(42, 500));

      expect(result.current).toBe(42);
    });

    it('should handle object initial value', () => {
      const initialObj = { foo: 'bar' };
      const { result } = renderHook(() => useDebounce(initialObj, 500));

      expect(result.current).toEqual(initialObj);
    });
  });

  describe('value changes', () => {
    it('should not update value immediately when changed', () => {
      const { result, rerender } = renderHook(({ value }) => useDebounce(value, 500), {
        initialProps: { value: 'initial' },
      });

      expect(result.current).toBe('initial');

      rerender({ value: 'updated' });

      expect(result.current).toBe('initial');
    });

    it('should update value after delay', () => {
      const { result, rerender } = renderHook(({ value }) => useDebounce(value, 500), {
        initialProps: { value: 'initial' },
      });

      rerender({ value: 'updated' });

      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(result.current).toBe('updated');
    });

    it('should cancel previous timeout when value changes rapidly', () => {
      const { result, rerender } = renderHook(({ value }) => useDebounce(value, 500), {
        initialProps: { value: 'initial' },
      });

      rerender({ value: 'first' });

      act(() => {
        vi.advanceTimersByTime(250);
      });

      expect(result.current).toBe('initial');

      rerender({ value: 'second' });

      act(() => {
        vi.advanceTimersByTime(250);
      });

      // Still initial because 'second' restarted the timer
      expect(result.current).toBe('initial');

      act(() => {
        vi.advanceTimersByTime(250);
      });

      expect(result.current).toBe('second');
    });

    it('should handle multiple rapid changes', () => {
      const { result, rerender } = renderHook(({ value }) => useDebounce(value, 300), {
        initialProps: { value: 'a' },
      });

      rerender({ value: 'b' });
      act(() => {
        vi.advanceTimersByTime(100);
      });

      rerender({ value: 'c' });
      act(() => {
        vi.advanceTimersByTime(100);
      });

      rerender({ value: 'd' });
      act(() => {
        vi.advanceTimersByTime(100);
      });

      rerender({ value: 'final' });
      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(result.current).toBe('final');
    });
  });

  describe('custom delay', () => {
    it('should use default delay of 500ms', () => {
      const { result, rerender } = renderHook(({ value }) => useDebounce(value), {
        initialProps: { value: 'initial' },
      });

      rerender({ value: 'updated' });

      act(() => {
        vi.advanceTimersByTime(499);
      });

      expect(result.current).toBe('initial');

      act(() => {
        vi.advanceTimersByTime(1);
      });

      expect(result.current).toBe('updated');
    });

    it('should respect custom delay', () => {
      const { result, rerender } = renderHook(({ value }) => useDebounce(value, 1000), {
        initialProps: { value: 'initial' },
      });

      rerender({ value: 'updated' });

      act(() => {
        vi.advanceTimersByTime(999);
      });

      expect(result.current).toBe('initial');

      act(() => {
        vi.advanceTimersByTime(1);
      });

      expect(result.current).toBe('updated');
    });

    it('should handle very short delay', () => {
      const { result, rerender } = renderHook(({ value }) => useDebounce(value, 10), {
        initialProps: { value: 'initial' },
      });

      rerender({ value: 'updated' });

      act(() => {
        vi.advanceTimersByTime(10);
      });

      expect(result.current).toBe('updated');
    });

    it('should handle zero delay', () => {
      const { result, rerender } = renderHook(({ value }) => useDebounce(value, 0), {
        initialProps: { value: 'initial' },
      });

      rerender({ value: 'updated' });

      act(() => {
        vi.advanceTimersByTime(0);
      });

      expect(result.current).toBe('updated');
    });

    it('should handle changing delay', () => {
      const { result, rerender } = renderHook(({ value, delay }) => useDebounce(value, delay), {
        initialProps: { value: 'initial', delay: 500 },
      });

      rerender({ value: 'updated', delay: 1000 });

      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(result.current).toBe('initial');

      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(result.current).toBe('updated');
    });
  });

  describe('value types', () => {
    it('should handle string values', () => {
      const { result, rerender } = renderHook(({ value }) => useDebounce(value, 100), {
        initialProps: { value: 'hello' },
      });

      rerender({ value: 'world' });

      act(() => {
        vi.advanceTimersByTime(100);
      });

      expect(result.current).toBe('world');
    });

    it('should handle number values', () => {
      const { result, rerender } = renderHook(({ value }) => useDebounce(value, 100), {
        initialProps: { value: 0 },
      });

      rerender({ value: 100 });

      act(() => {
        vi.advanceTimersByTime(100);
      });

      expect(result.current).toBe(100);
    });

    it('should handle boolean values', () => {
      const { result, rerender } = renderHook(({ value }) => useDebounce(value, 100), {
        initialProps: { value: false },
      });

      rerender({ value: true });

      act(() => {
        vi.advanceTimersByTime(100);
      });

      expect(result.current).toBe(true);
    });

    it('should handle object values', () => {
      const initial = { count: 0 };
      const updated = { count: 5 };

      const { result, rerender } = renderHook(({ value }) => useDebounce(value, 100), {
        initialProps: { value: initial },
      });

      rerender({ value: updated });

      act(() => {
        vi.advanceTimersByTime(100);
      });

      expect(result.current).toEqual(updated);
    });

    it('should handle array values', () => {
      const initial = [1, 2, 3];
      const updated = [4, 5, 6];

      const { result, rerender } = renderHook(({ value }) => useDebounce(value, 100), {
        initialProps: { value: initial },
      });

      rerender({ value: updated });

      act(() => {
        vi.advanceTimersByTime(100);
      });

      expect(result.current).toEqual(updated);
    });
  });

  describe('cleanup', () => {
    it('should clear timeout on unmount', () => {
      const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');

      const { unmount } = renderHook(() => useDebounce('value', 500));

      unmount();

      expect(clearTimeoutSpy).toHaveBeenCalled();
    });

    it('should clear previous timeout when value changes', () => {
      const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');

      const { rerender } = renderHook(({ value }) => useDebounce(value, 500), {
        initialProps: { value: 'initial' },
      });

      rerender({ value: 'updated' });

      expect(clearTimeoutSpy).toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle empty string', () => {
      const { result, rerender } = renderHook(({ value }) => useDebounce(value, 100), {
        initialProps: { value: 'text' },
      });

      rerender({ value: '' });

      act(() => {
        vi.advanceTimersByTime(100);
      });

      expect(result.current).toBe('');
    });

    it('should handle same value updates', () => {
      const { result, rerender } = renderHook(({ value }) => useDebounce(value, 100), {
        initialProps: { value: 'same' },
      });

      rerender({ value: 'same' });

      act(() => {
        vi.advanceTimersByTime(100);
      });

      expect(result.current).toBe('same');
    });

    it('should handle very large numbers', () => {
      const large = Number.MAX_SAFE_INTEGER;

      const { result, rerender } = renderHook(({ value }) => useDebounce(value, 100), {
        initialProps: { value: 0 },
      });

      rerender({ value: large });

      act(() => {
        vi.advanceTimersByTime(100);
      });

      expect(result.current).toBe(large);
    });
  });
});
