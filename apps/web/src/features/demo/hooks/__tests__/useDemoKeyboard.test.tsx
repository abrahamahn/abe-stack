// apps/web/src/features/demo/hooks/__tests__/useDemoKeyboard.test.tsx
import { fireEvent, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { KEYBOARD_SHORTCUTS, useDemoKeyboard } from '../useDemoKeyboard';

describe('useDemoKeyboard', () => {
  const mockTogglePane = vi.fn();
  const mockCycleTheme = vi.fn();
  const mockClearSelection = vi.fn();

  const defaultOptions = {
    togglePane: mockTogglePane,
    cycleTheme: mockCycleTheme,
    clearSelection: mockClearSelection,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('toggles left panel when L key is pressed', () => {
    renderHook(() => {
      useDemoKeyboard(defaultOptions);
    });

    fireEvent.keyDown(window, { key: 'L' });

    expect(mockTogglePane).toHaveBeenCalledWith('left');
  });

  it('toggles left panel when lowercase l key is pressed', () => {
    renderHook(() => {
      useDemoKeyboard(defaultOptions);
    });

    fireEvent.keyDown(window, { key: 'l' });

    expect(mockTogglePane).toHaveBeenCalledWith('left');
  });

  it('toggles right panel when R key is pressed', () => {
    renderHook(() => {
      useDemoKeyboard(defaultOptions);
    });

    fireEvent.keyDown(window, { key: 'R' });

    expect(mockTogglePane).toHaveBeenCalledWith('right');
  });

  it('cycles theme when T key is pressed', () => {
    renderHook(() => {
      useDemoKeyboard(defaultOptions);
    });

    fireEvent.keyDown(window, { key: 'T' });

    expect(mockCycleTheme).toHaveBeenCalledTimes(1);
  });

  it('clears selection when Escape key is pressed', () => {
    renderHook(() => {
      useDemoKeyboard(defaultOptions);
    });

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(mockClearSelection).toHaveBeenCalledTimes(1);
  });

  it('does not trigger when typing in an input', () => {
    renderHook(() => {
      useDemoKeyboard(defaultOptions);
    });

    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    fireEvent.keyDown(input, { key: 'L' });

    expect(mockTogglePane).not.toHaveBeenCalled();

    document.body.removeChild(input);
  });

  it('does not trigger when typing in a textarea', () => {
    renderHook(() => {
      useDemoKeyboard(defaultOptions);
    });

    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);
    textarea.focus();

    fireEvent.keyDown(textarea, { key: 'R' });

    expect(mockTogglePane).not.toHaveBeenCalled();

    document.body.removeChild(textarea);
  });

  it('does not trigger for unhandled keys', () => {
    renderHook(() => {
      useDemoKeyboard(defaultOptions);
    });

    fireEvent.keyDown(window, { key: 'X' });

    expect(mockTogglePane).not.toHaveBeenCalled();
    expect(mockCycleTheme).not.toHaveBeenCalled();
    expect(mockClearSelection).not.toHaveBeenCalled();
  });

  it('removes event listener on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = renderHook(() => {
      useDemoKeyboard(defaultOptions);
    });
    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));

    removeEventListenerSpy.mockRestore();
  });
});

describe('KEYBOARD_SHORTCUTS', () => {
  it('exports the correct shortcuts', () => {
    expect(KEYBOARD_SHORTCUTS).toHaveLength(4);
    expect(KEYBOARD_SHORTCUTS).toContainEqual({ key: 'L', description: 'Toggle left panel' });
    expect(KEYBOARD_SHORTCUTS).toContainEqual({ key: 'R', description: 'Toggle right panel' });
    expect(KEYBOARD_SHORTCUTS).toContainEqual({ key: 'T', description: 'Cycle theme' });
    expect(KEYBOARD_SHORTCUTS).toContainEqual({ key: 'Esc', description: 'Deselect component' });
  });
});
