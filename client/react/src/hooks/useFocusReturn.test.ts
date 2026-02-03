// client/ui/src/hooks/useFocusReturn.test.ts
/** @vitest-environment jsdom */
import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useFocusReturn } from './useFocusReturn';

describe('useFocusReturn', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('captures the active element on mount', () => {
    const button = document.createElement('button');
    button.textContent = 'Target';
    document.body.appendChild(button);
    button.focus();

    expect(document.activeElement).toBe(button);

    const { result } = renderHook(() => useFocusReturn());

    expect(typeof result.current.restoreFocus).toBe('function');
  });

  it('restores focus to the previously active element on unmount', () => {
    const button = document.createElement('button');
    button.textContent = 'Original';
    document.body.appendChild(button);
    button.focus();

    const { unmount } = renderHook(() => useFocusReturn());

    // Focus something else
    const other = document.createElement('input');
    document.body.appendChild(other);
    other.focus();
    expect(document.activeElement).toBe(other);

    // Unmount should restore focus to the original button
    unmount();
    expect(document.activeElement).toBe(button);
  });

  it('does not restore focus on unmount when restoreOnUnmount is false', () => {
    const button = document.createElement('button');
    button.textContent = 'Original';
    document.body.appendChild(button);
    button.focus();

    const { unmount } = renderHook(() => useFocusReturn({ restoreOnUnmount: false }));

    const other = document.createElement('input');
    document.body.appendChild(other);
    other.focus();

    unmount();
    // Should NOT have restored focus
    expect(document.activeElement).toBe(other);
  });

  it('restoreFocus manually restores focus', () => {
    const button = document.createElement('button');
    button.textContent = 'Restore target';
    document.body.appendChild(button);
    button.focus();

    const focusSpy = vi.spyOn(button, 'focus');

    const { result } = renderHook(() => useFocusReturn({ restoreOnUnmount: false }));

    // Focus something else
    const other = document.createElement('input');
    document.body.appendChild(other);
    other.focus();

    // Manually restore
    result.current.restoreFocus();
    expect(focusSpy).toHaveBeenCalled();
    expect(document.activeElement).toBe(button);
  });
});
