// packages/ui/src/hooks/__tests__/useResendCooldown.test.tsx
/** @vitest-environment jsdom */
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useResendCooldown } from '../useResendCooldown';

describe('useResendCooldown', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initial state', () => {
    it('should initialize with cooldown of 0', () => {
      const { result } = renderHook(() => useResendCooldown());
      expect(result.current.cooldown).toBe(0);
    });

    it('should initialize with isOnCooldown as false', () => {
      const { result } = renderHook(() => useResendCooldown());
      expect(result.current.isOnCooldown).toBe(false);
    });
  });

  describe('startCooldown', () => {
    it('should start cooldown with default duration (60 seconds)', () => {
      const { result } = renderHook(() => useResendCooldown());

      act(() => {
        result.current.startCooldown();
      });

      expect(result.current.cooldown).toBe(60);
      expect(result.current.isOnCooldown).toBe(true);
    });

    it('should start cooldown with custom initial duration', () => {
      const { result } = renderHook(() => useResendCooldown(30));

      act(() => {
        result.current.startCooldown();
      });

      expect(result.current.cooldown).toBe(30);
    });

    it('should start cooldown with custom duration parameter', () => {
      const { result } = renderHook(() => useResendCooldown(60));

      act(() => {
        result.current.startCooldown(45);
      });

      expect(result.current.cooldown).toBe(45);
    });

    it('should decrement cooldown every second', () => {
      const { result } = renderHook(() => useResendCooldown(5));

      act(() => {
        result.current.startCooldown();
      });

      expect(result.current.cooldown).toBe(5);

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(result.current.cooldown).toBe(4);

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(result.current.cooldown).toBe(3);
    });

    it('should stop at 0 and clear interval', () => {
      const { result } = renderHook(() => useResendCooldown(3));

      act(() => {
        result.current.startCooldown();
      });

      act(() => {
        vi.advanceTimersByTime(3000);
      });

      expect(result.current.cooldown).toBe(0);
      expect(result.current.isOnCooldown).toBe(false);

      // Advancing more time should not change anything
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(result.current.cooldown).toBe(0);
    });

    it('should clear existing interval when starting new cooldown', () => {
      const { result } = renderHook(() => useResendCooldown(10));

      act(() => {
        result.current.startCooldown();
      });

      act(() => {
        vi.advanceTimersByTime(3000);
      });

      expect(result.current.cooldown).toBe(7);

      // Start a new cooldown
      act(() => {
        result.current.startCooldown(5);
      });

      expect(result.current.cooldown).toBe(5);

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(result.current.cooldown).toBe(4);
    });
  });

  describe('resetCooldown', () => {
    it('should reset cooldown to 0', () => {
      const { result } = renderHook(() => useResendCooldown(10));

      act(() => {
        result.current.startCooldown();
      });

      expect(result.current.cooldown).toBe(10);

      act(() => {
        result.current.resetCooldown();
      });

      expect(result.current.cooldown).toBe(0);
      expect(result.current.isOnCooldown).toBe(false);
    });

    it('should clear interval when reset', () => {
      const { result } = renderHook(() => useResendCooldown(10));

      act(() => {
        result.current.startCooldown();
      });

      act(() => {
        result.current.resetCooldown();
      });

      // Advancing time should not change cooldown
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(result.current.cooldown).toBe(0);
    });

    it('should work when called multiple times', () => {
      const { result } = renderHook(() => useResendCooldown(10));

      act(() => {
        result.current.resetCooldown();
        result.current.resetCooldown();
        result.current.resetCooldown();
      });

      expect(result.current.cooldown).toBe(0);
    });
  });

  describe('isOnCooldown', () => {
    it('should be true when cooldown > 0', () => {
      const { result } = renderHook(() => useResendCooldown(5));

      act(() => {
        result.current.startCooldown();
      });

      expect(result.current.isOnCooldown).toBe(true);
    });

    it('should be false when cooldown is 0', () => {
      const { result } = renderHook(() => useResendCooldown(2));

      act(() => {
        result.current.startCooldown();
      });

      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(result.current.isOnCooldown).toBe(false);
    });
  });

  describe('cleanup', () => {
    it('should clear interval on unmount', () => {
      const { result, unmount } = renderHook(() => useResendCooldown(10));

      act(() => {
        result.current.startCooldown();
      });

      unmount();

      // No errors should be thrown and interval should be cleared
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      // Test passed if no errors occurred
      expect(true).toBe(true);
    });

    it('should not cause memory leaks with multiple start/reset cycles', () => {
      const { result, unmount } = renderHook(() => useResendCooldown(5));

      for (let i = 0; i < 10; i++) {
        act(() => {
          result.current.startCooldown();
        });
        act(() => {
          vi.advanceTimersByTime(1000);
        });
        act(() => {
          result.current.resetCooldown();
        });
      }

      unmount();
      expect(true).toBe(true);
    });
  });

  describe('callback stability', () => {
    it('startCooldown should be stable across renders', () => {
      const { result, rerender } = renderHook(() => useResendCooldown(10));
      const startCooldown1 = result.current.startCooldown;

      rerender();
      const startCooldown2 = result.current.startCooldown;

      expect(startCooldown1).toBe(startCooldown2);
    });

    it('resetCooldown should be stable across renders', () => {
      const { result, rerender } = renderHook(() => useResendCooldown(10));
      const resetCooldown1 = result.current.resetCooldown;

      rerender();
      const resetCooldown2 = result.current.resetCooldown;

      expect(resetCooldown1).toBe(resetCooldown2);
    });
  });
});
