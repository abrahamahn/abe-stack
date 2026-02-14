// main/client/react/src/hooks/useLocalStorageValue.test.ts
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { useLocalStorageValue } from './useLocalStorageValue';

function createStorageEvent(init: { key?: string | null; newValue?: string | null }): Event {
  const event = new Event('storage');
  Object.defineProperties(event, {
    key: { value: init.key ?? null },
    newValue: { value: init.newValue ?? null },
  });
  return event;
}

describe('useLocalStorageValue', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns null when key is missing', () => {
    const { result } = renderHook(() => useLocalStorageValue('workspace'));
    expect(result.current[0]).toBeNull();
  });

  it('returns existing raw string value', () => {
    localStorage.setItem('workspace', 'w_1');
    const { result } = renderHook(() => useLocalStorageValue('workspace'));
    expect(result.current[0]).toBe('w_1');
  });

  it('updates same-tab subscribers on set', () => {
    const first = renderHook(() => useLocalStorageValue('workspace'));
    const second = renderHook(() => useLocalStorageValue('workspace'));

    act(() => {
      first.result.current[1]('w_2');
    });

    expect(first.result.current[0]).toBe('w_2');
    expect(second.result.current[0]).toBe('w_2');
    expect(localStorage.getItem('workspace')).toBe('w_2');
  });

  it('removes key when set to null', () => {
    localStorage.setItem('workspace', 'w_3');
    const { result } = renderHook(() => useLocalStorageValue('workspace'));

    act(() => {
      result.current[1](null);
    });

    expect(result.current[0]).toBeNull();
    expect(localStorage.getItem('workspace')).toBeNull();
  });

  it('reacts to cross-tab storage events', () => {
    const { result } = renderHook(() => useLocalStorageValue('workspace'));

    act(() => {
      localStorage.setItem('workspace', 'w_4');
      window.dispatchEvent(createStorageEvent({ key: 'workspace', newValue: 'w_4' }));
    });

    expect(result.current[0]).toBe('w_4');
  });
});
