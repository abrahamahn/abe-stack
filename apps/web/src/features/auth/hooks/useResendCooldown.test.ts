// apps/web/src/features/auth/hooks/useResendCooldown.test.ts
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useResendCooldown } from './useResendCooldown';

import type { UseResendCooldownReturn } from './useResendCooldown';
import type { UseResendCooldownReturn as UIUseResendCooldownReturn } from '@abe-stack/ui';

describe('useResendCooldown', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('has the expected function signature', () => {
    expect(typeof useResendCooldown).toBe('function');
  });

  it('returns expected state shape with default values', () => {
    const { result } = renderHook(() => useResendCooldown());

    expect(result.current.cooldown).toBe(0);
    expect(result.current.isOnCooldown).toBe(false);
    expect(typeof result.current.startCooldown).toBe('function');
    expect(typeof result.current.resetCooldown).toBe('function');
  });

  it('startCooldown sets cooldown and isOnCooldown', () => {
    const { result } = renderHook(() => useResendCooldown());

    act(() => {
      result.current.startCooldown();
    });

    expect(result.current.cooldown).toBeGreaterThan(0);
    expect(result.current.isOnCooldown).toBe(true);
  });

  it('cooldown decrements over time', () => {
    const { result } = renderHook(() => useResendCooldown(5));

    act(() => {
      result.current.startCooldown();
    });

    expect(result.current.cooldown).toBe(5);

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.cooldown).toBe(4);
  });

  it('resetCooldown clears the cooldown', () => {
    const { result } = renderHook(() => useResendCooldown());

    act(() => {
      result.current.startCooldown();
    });

    expect(result.current.isOnCooldown).toBe(true);

    act(() => {
      result.current.resetCooldown();
    });

    expect(result.current.cooldown).toBe(0);
    expect(result.current.isOnCooldown).toBe(false);
  });
});

describe('UseResendCooldownReturn type', () => {
  it('is compatible with UseResendCooldownReturn from @abe-stack/ui', () => {
    // Type-level test: types should be compatible
    const cooldownReturn: UIUseResendCooldownReturn = {
      cooldown: 0,
      isOnCooldown: false,
      startCooldown: () => undefined,
      resetCooldown: () => undefined,
    };

    // This assignment should compile without error
    const localReturn: UseResendCooldownReturn = cooldownReturn;
    const backToUI: UIUseResendCooldownReturn = localReturn;

    expect(localReturn).toEqual(cooldownReturn);
    expect(backToUI).toEqual(localReturn);
  });
});
