// main/client/react/src/hooks/useClickOutside.test.ts
/** @vitest-environment jsdom */
import { act, fireEvent, renderHook } from '@testing-library/react';
import { useRef } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { useClickOutside } from './useClickOutside';

describe('useClickOutside', () => {
  it('calls handler when clicking outside the ref element', () => {
    const onOutside = vi.fn();
    const target = document.createElement('div');
    const outside = document.createElement('div');
    document.body.appendChild(target);
    document.body.appendChild(outside);

    renderHook(() => {
      const ref = useRef<HTMLDivElement>(target);
      useClickOutside(ref, onOutside);
    });

    act(() => {
      fireEvent.mouseDown(outside);
    });
    expect(onOutside).toHaveBeenCalledTimes(1);

    document.body.removeChild(target);
    document.body.removeChild(outside);
  });

  it('does not call handler when clicking inside the ref element', () => {
    const onOutside = vi.fn();
    const target = document.createElement('div');
    document.body.appendChild(target);

    renderHook(() => {
      const ref = useRef<HTMLDivElement>(target);
      useClickOutside(ref, onOutside);
    });

    act(() => {
      fireEvent.mouseDown(target);
    });
    expect(onOutside).not.toHaveBeenCalled();

    document.body.removeChild(target);
  });

  it('handles touchstart outside events', () => {
    const onOutside = vi.fn();
    const target = document.createElement('div');
    const outside = document.createElement('div');
    document.body.appendChild(target);
    document.body.appendChild(outside);

    renderHook(() => {
      const ref = useRef<HTMLDivElement>(target);
      useClickOutside(ref, onOutside);
    });

    act(() => {
      fireEvent.touchStart(outside);
    });
    expect(onOutside).toHaveBeenCalledTimes(1);

    document.body.removeChild(target);
    document.body.removeChild(outside);
  });

  it('ignores events when ref is null', () => {
    const onOutside = vi.fn();
    const outside = document.createElement('div');
    document.body.appendChild(outside);

    renderHook(() => {
      const ref = useRef<HTMLDivElement | null>(null);
      useClickOutside(ref, onOutside);
    });

    act(() => {
      fireEvent.mouseDown(outside);
      fireEvent.touchStart(outside);
    });
    expect(onOutside).not.toHaveBeenCalled();

    document.body.removeChild(outside);
  });

  it('removes listeners on unmount', () => {
    const onOutside = vi.fn();
    const outside = document.createElement('div');
    document.body.appendChild(outside);

    const { unmount } = renderHook(() => {
      const ref = useRef<HTMLDivElement | null>(null);
      useClickOutside(ref, onOutside);
    });

    unmount();
    fireEvent.mouseDown(document.body);
    expect(onOutside).not.toHaveBeenCalled();

    document.body.removeChild(outside);
  });
});
