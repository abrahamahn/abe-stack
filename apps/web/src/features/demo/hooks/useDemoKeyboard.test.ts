// apps/web/src/features/demo/hooks/useDemoKeyboard.test.ts
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useDemoKeyboard } from './useDemoKeyboard';

describe('useDemoKeyboard', () => {
  const mockOptions = {
    togglePane: vi.fn(),
    cycleTheme: vi.fn(),
    clearSelection: vi.fn(),
  };

  it('should toggle left pane on L key', () => {
    renderHook(() => {
      useDemoKeyboard(mockOptions);
    });
    const event = new KeyboardEvent('keydown', { key: 'L' });
    window.dispatchEvent(event);
    expect(mockOptions.togglePane).toHaveBeenCalledWith('left');
  });

  it('should toggle right pane on R key', () => {
    renderHook(() => {
      useDemoKeyboard(mockOptions);
    });
    const event = new KeyboardEvent('keydown', { key: 'R' });
    window.dispatchEvent(event);
    expect(mockOptions.togglePane).toHaveBeenCalledWith('right');
  });

  it('should cycle theme on T key', () => {
    renderHook(() => {
      useDemoKeyboard(mockOptions);
    });
    const event = new KeyboardEvent('keydown', { key: 'T' });
    window.dispatchEvent(event);
    expect(mockOptions.cycleTheme).toHaveBeenCalled();
  });

  it('should clear selection on Escape key', () => {
    renderHook(() => {
      useDemoKeyboard(mockOptions);
    });
    const event = new KeyboardEvent('keydown', { key: 'Escape' });
    window.dispatchEvent(event);
    expect(mockOptions.clearSelection).toHaveBeenCalled();
  });

  it('should not trigger when typing in input', () => {
    renderHook(() => {
      useDemoKeyboard(mockOptions);
    });
    const input = document.createElement('input');
    document.body.appendChild(input);
    const event = new KeyboardEvent('keydown', { key: 'L', bubbles: true });
    Object.defineProperty(event, 'target', { value: input, enumerable: true });
    input.dispatchEvent(event);
    expect(mockOptions.togglePane).not.toHaveBeenCalled();
    document.body.removeChild(input);
  });

  it('should cleanup event listener on unmount', () => {
    const { unmount } = renderHook(() => {
      useDemoKeyboard(mockOptions);
    });
    const spy = vi.spyOn(window, 'removeEventListener');
    unmount();
    expect(spy).toHaveBeenCalledWith('keydown', expect.any(Function));
  });
});
