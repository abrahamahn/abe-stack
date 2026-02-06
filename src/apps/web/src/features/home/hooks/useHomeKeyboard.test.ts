// apps/web/src/features/home/hooks/useHomeKeyboard.test.ts
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { HOME_KEYBOARD_SHORTCUTS, useHomeKeyboard } from './useHomeKeyboard';

describe('useHomeKeyboard', () => {
  const mockOptions = {
    togglePane: vi.fn(),
    cycleTheme: vi.fn(),
    clearSelection: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should toggle top pane on T key', () => {
    renderHook(() => {
      useHomeKeyboard(mockOptions);
    });
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'T' }));
    expect(mockOptions.togglePane).toHaveBeenCalledWith('top');
  });

  it('should toggle left pane on L key', () => {
    renderHook(() => {
      useHomeKeyboard(mockOptions);
    });
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'L' }));
    expect(mockOptions.togglePane).toHaveBeenCalledWith('left');
  });

  it('should toggle right pane on R key', () => {
    renderHook(() => {
      useHomeKeyboard(mockOptions);
    });
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'R' }));
    expect(mockOptions.togglePane).toHaveBeenCalledWith('right');
  });

  it('should toggle bottom pane on B key', () => {
    renderHook(() => {
      useHomeKeyboard(mockOptions);
    });
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'B' }));
    expect(mockOptions.togglePane).toHaveBeenCalledWith('bottom');
  });

  it('should cycle theme on D key', () => {
    renderHook(() => {
      useHomeKeyboard(mockOptions);
    });
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'D' }));
    expect(mockOptions.cycleTheme).toHaveBeenCalled();
  });

  it('should clear selection on Escape key', () => {
    renderHook(() => {
      useHomeKeyboard(mockOptions);
    });
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(mockOptions.clearSelection).toHaveBeenCalled();
  });

  it('should not trigger when typing in input', () => {
    renderHook(() => {
      useHomeKeyboard(mockOptions);
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
      useHomeKeyboard(mockOptions);
    });
    const spy = vi.spyOn(window, 'removeEventListener');
    unmount();
    expect(spy).toHaveBeenCalledWith('keydown', expect.any(Function));
  });
});

describe('HOME_KEYBOARD_SHORTCUTS', () => {
  it('should have 6 shortcut definitions', () => {
    expect(HOME_KEYBOARD_SHORTCUTS).toHaveLength(6);
  });

  it('should include T, L, R, B, D, Esc keys', () => {
    const keys = HOME_KEYBOARD_SHORTCUTS.map((s) => s.key);
    expect(keys).toEqual(['T', 'L', 'R', 'B', 'D', 'Esc']);
  });

  it('should have descriptions for all shortcuts', () => {
    for (const shortcut of HOME_KEYBOARD_SHORTCUTS) {
      expect(shortcut.description.length).toBeGreaterThan(0);
    }
  });
});
