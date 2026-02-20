// main/apps/web/src/features/home/hooks/useHomeKeyboard.test.ts
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { HOME_KEYBOARD_SHORTCUTS, useHomeKeyboard } from './useHomeKeyboard';

describe('useHomeKeyboard', () => {
  const mockOptions = {
    togglePane: vi.fn(),
    cycleTheme: vi.fn(),
    cycleDensity: vi.fn(),
    cycleContrast: vi.fn(),
    clearSelection: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should toggle top pane on ArrowUp key', () => {
    renderHook(() => {
      useHomeKeyboard(mockOptions);
    });
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
    expect(mockOptions.togglePane).toHaveBeenCalledWith('top');
  });

  it('should toggle left pane on ArrowLeft key', () => {
    renderHook(() => {
      useHomeKeyboard(mockOptions);
    });
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    expect(mockOptions.togglePane).toHaveBeenCalledWith('left');
  });

  it('should toggle right pane on ArrowRight key', () => {
    renderHook(() => {
      useHomeKeyboard(mockOptions);
    });
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    expect(mockOptions.togglePane).toHaveBeenCalledWith('right');
  });

  it('should toggle bottom pane on ArrowDown key', () => {
    renderHook(() => {
      useHomeKeyboard(mockOptions);
    });
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    expect(mockOptions.togglePane).toHaveBeenCalledWith('bottom');
  });

  it('should cycle theme on T key', () => {
    renderHook(() => {
      useHomeKeyboard(mockOptions);
    });
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'T' }));
    expect(mockOptions.cycleTheme).toHaveBeenCalled();
  });

  it('should cycle density on D key', () => {
    renderHook(() => {
      useHomeKeyboard(mockOptions);
    });
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'D' }));
    expect(mockOptions.cycleDensity).toHaveBeenCalled();
  });

  it('should cycle contrast on C key', () => {
    renderHook(() => {
      useHomeKeyboard(mockOptions);
    });
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'C' }));
    expect(mockOptions.cycleContrast).toHaveBeenCalled();
  });

  it('should ignore shortcuts when Ctrl is pressed', () => {
    renderHook(() => {
      useHomeKeyboard(mockOptions);
    });
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'C', ctrlKey: true }));
    expect(mockOptions.cycleContrast).not.toHaveBeenCalled();
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
    const event = new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true });
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
  it('should have 8 shortcut definitions', () => {
    expect(HOME_KEYBOARD_SHORTCUTS).toHaveLength(8);
  });

  it('should include arrow keys plus T, D, C, Esc', () => {
    const keys = HOME_KEYBOARD_SHORTCUTS.map((s) => s.key);
    expect(keys).toEqual(['↑', '↓', '←', '→', 'T', 'D', 'C', 'Esc']);
  });

  it('should have descriptions for all shortcuts', () => {
    for (const shortcut of HOME_KEYBOARD_SHORTCUTS) {
      expect(shortcut.description.length).toBeGreaterThan(0);
    }
  });
});
