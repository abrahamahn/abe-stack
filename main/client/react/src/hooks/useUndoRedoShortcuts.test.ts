// main/client/react/src/hooks/useUndoRedoShortcuts.test.ts
/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import react, { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import {
  useUndoRedoShortcuts,
  getUndoShortcutText,
  getRedoShortcutText,
  getUndoRedoShortcutTexts,
} from './useUndoRedoShortcuts';

import type { UseUndoRedoShortcutsOptions } from './useUndoRedoShortcuts';
// ============================================================================
// Test Harness Components
// ============================================================================
const UndoRedoHarness = (
  props: Omit<UseUndoRedoShortcutsOptions, 'onUndo' | 'onRedo'> & {
    onUndo?: () => void;
    onRedo?: () => void;
  },
): react.ReactElement => {
  const onUndo = props.onUndo ?? vi.fn();
  const onRedo = props.onRedo ?? vi.fn();
  const { triggerUndo, triggerRedo } = useUndoRedoShortcuts({
    ...props,
    onUndo,
    onRedo,
  });
  return react.createElement(
    'div',
    null,
    react.createElement('input', { 'data-testid': 'text-input', type: 'text' }),
    react.createElement('textarea', { 'data-testid': 'textarea' }),
    react.createElement('div', {
      'data-testid': 'editable',
      contentEditable: true,
      suppressContentEditableWarning: true,
    }),
    react.createElement(
      'button',
      { type: 'button', onClick: triggerUndo, 'data-testid': 'undo-button' },
      'Undo',
    ),
    react.createElement(
      'button',
      { type: 'button', onClick: triggerRedo, 'data-testid': 'redo-button' },
      'Redo',
    ),
  );
};
const StatefulUndoRedoHarness = (): react.ReactElement => {
  const [history, setHistory] = useState<number[]>([0]);
  const [index, setIndex] = useState(0);
  const canUndo = index > 0;
  const canRedo = index < history.length - 1;
  const onUndo = (): void => {
    if (canUndo) {
      setIndex(index - 1);
    }
  };
  const onRedo = (): void => {
    if (canRedo) {
      setIndex(index + 1);
    }
  };
  const addValue = (): void => {
    const newValue = history[index]! + 1;
    setHistory([...history.slice(0, index + 1), newValue]);
    setIndex(index + 1);
  };
  const { triggerUndo, triggerRedo } = useUndoRedoShortcuts({
    onUndo,
    onRedo,
    canUndo,
    canRedo,
  });
  return react.createElement(
    'div',
    null,
    react.createElement('span', { 'data-testid': 'value' }, history[index]),
    react.createElement('span', { 'data-testid': 'can-undo' }, String(canUndo)),
    react.createElement('span', { 'data-testid': 'can-redo' }, String(canRedo)),
    react.createElement(
      'button',
      { type: 'button', onClick: addValue, 'data-testid': 'add-button' },
      'Add',
    ),
    react.createElement(
      'button',
      { type: 'button', onClick: triggerUndo, 'data-testid': 'undo-button' },
      'Undo',
    ),
    react.createElement(
      'button',
      { type: 'button', onClick: triggerRedo, 'data-testid': 'redo-button' },
      'Redo',
    ),
  );
};
// ============================================================================
// Tests: useUndoRedoShortcuts
// ============================================================================
describe('useUndoRedoShortcuts', () => {
  describe('undo shortcuts', () => {
    it('triggers onUndo for Ctrl+Z', () => {
      const onUndo = vi.fn();
      const onRedo = vi.fn();
      render(react.createElement(UndoRedoHarness, { onUndo: onUndo, onRedo: onRedo }));
      fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
      expect(onUndo).toHaveBeenCalledTimes(1);
      expect(onRedo).not.toHaveBeenCalled();
    });
    it('triggers onUndo for Cmd+Z (metaKey) on Mac', () => {
      // Mock userAgent to simulate Mac
      const originalUserAgent = navigator.userAgent;
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        configurable: true,
      });
      const onUndo = vi.fn();
      const onRedo = vi.fn();
      render(react.createElement(UndoRedoHarness, { onUndo: onUndo, onRedo: onRedo }));
      fireEvent.keyDown(window, { key: 'z', metaKey: true });
      expect(onUndo).toHaveBeenCalledTimes(1);
      expect(onRedo).not.toHaveBeenCalled();
      // Restore userAgent
      Object.defineProperty(navigator, 'userAgent', {
        value: originalUserAgent,
        configurable: true,
      });
    });
    it('does not trigger onUndo for just Z key', () => {
      const onUndo = vi.fn();
      render(react.createElement(UndoRedoHarness, { onUndo: onUndo }));
      fireEvent.keyDown(window, { key: 'z' });
      expect(onUndo).not.toHaveBeenCalled();
    });
    it('does not trigger onUndo when canUndo is false', () => {
      const onUndo = vi.fn();
      render(react.createElement(UndoRedoHarness, { onUndo: onUndo, canUndo: false }));
      fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
      expect(onUndo).not.toHaveBeenCalled();
    });
  });
  describe('redo shortcuts', () => {
    it('triggers onRedo for Ctrl+Y', () => {
      const onUndo = vi.fn();
      const onRedo = vi.fn();
      render(react.createElement(UndoRedoHarness, { onUndo: onUndo, onRedo: onRedo }));
      fireEvent.keyDown(window, { key: 'y', ctrlKey: true });
      expect(onRedo).toHaveBeenCalledTimes(1);
      expect(onUndo).not.toHaveBeenCalled();
    });
    it('triggers onRedo for Ctrl+Shift+Z', () => {
      const onUndo = vi.fn();
      const onRedo = vi.fn();
      render(react.createElement(UndoRedoHarness, { onUndo: onUndo, onRedo: onRedo }));
      fireEvent.keyDown(window, { key: 'z', ctrlKey: true, shiftKey: true });
      expect(onRedo).toHaveBeenCalledTimes(1);
      expect(onUndo).not.toHaveBeenCalled();
    });
    it('triggers onRedo for Cmd+Shift+Z (metaKey) on Mac', () => {
      // Mock userAgent to simulate Mac
      const originalUserAgent = navigator.userAgent;
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        configurable: true,
      });
      const onUndo = vi.fn();
      const onRedo = vi.fn();
      render(react.createElement(UndoRedoHarness, { onUndo: onUndo, onRedo: onRedo }));
      fireEvent.keyDown(window, { key: 'z', metaKey: true, shiftKey: true });
      expect(onRedo).toHaveBeenCalledTimes(1);
      expect(onUndo).not.toHaveBeenCalled();
      // Restore userAgent
      Object.defineProperty(navigator, 'userAgent', {
        value: originalUserAgent,
        configurable: true,
      });
    });
    it('does not trigger onRedo when canRedo is false', () => {
      const onRedo = vi.fn();
      render(react.createElement(UndoRedoHarness, { onRedo: onRedo, canRedo: false }));
      fireEvent.keyDown(window, { key: 'y', ctrlKey: true });
      expect(onRedo).not.toHaveBeenCalled();
    });
  });
  describe('enabled option', () => {
    it('does not trigger when disabled', () => {
      const onUndo = vi.fn();
      const onRedo = vi.fn();
      render(
        react.createElement(UndoRedoHarness, { onUndo: onUndo, onRedo: onRedo, enabled: false }),
      );
      fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
      fireEvent.keyDown(window, { key: 'y', ctrlKey: true });
      expect(onUndo).not.toHaveBeenCalled();
      expect(onRedo).not.toHaveBeenCalled();
    });
  });
  describe('skipInputs option', () => {
    it('does not skip inputs by default', () => {
      const onUndo = vi.fn();
      render(react.createElement(UndoRedoHarness, { onUndo: onUndo }));
      const input = screen.getByTestId('text-input');
      input.focus();
      fireEvent.keyDown(input, { key: 'z', ctrlKey: true });
      expect(onUndo).toHaveBeenCalledTimes(1);
    });
    it('skips inputs when skipInputs is true', () => {
      const onUndo = vi.fn();
      render(react.createElement(UndoRedoHarness, { onUndo: onUndo, skipInputs: true }));
      const input = screen.getByTestId('text-input');
      input.focus();
      fireEvent.keyDown(input, { key: 'z', ctrlKey: true });
      expect(onUndo).not.toHaveBeenCalled();
    });
    it('skips textareas when skipInputs is true', () => {
      const onUndo = vi.fn();
      render(react.createElement(UndoRedoHarness, { onUndo: onUndo, skipInputs: true }));
      const textarea = screen.getByTestId('textarea');
      textarea.focus();
      fireEvent.keyDown(textarea, { key: 'z', ctrlKey: true });
      expect(onUndo).not.toHaveBeenCalled();
    });
    // Note: contentEditable detection works in real browsers but jsdom has
    // inconsistent behavior with the isContentEditable property. The functionality
    // is tested in useKeyboardShortcut.test.tsx which has a different component
    // structure that works around the jsdom limitation.
  });
  describe('custom key bindings', () => {
    it('supports custom undo bindings', () => {
      const onUndo = vi.fn();
      render(
        react.createElement(UndoRedoHarness, {
          onUndo: onUndo,
          keyBindings: {
            undo: ['alt+backspace'],
          },
        }),
      );
      // Default Ctrl+Z should not work
      fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
      expect(onUndo).not.toHaveBeenCalled();
      // Custom binding should work
      fireEvent.keyDown(window, { key: 'Backspace', altKey: true });
      expect(onUndo).toHaveBeenCalledTimes(1);
    });
    it('supports custom redo bindings', () => {
      const onRedo = vi.fn();
      render(
        react.createElement(UndoRedoHarness, {
          onRedo: onRedo,
          keyBindings: {
            redo: ['alt+shift+backspace'],
          },
        }),
      );
      // Default Ctrl+Y should not work
      fireEvent.keyDown(window, { key: 'y', ctrlKey: true });
      expect(onRedo).not.toHaveBeenCalled();
      // Custom binding should work
      fireEvent.keyDown(window, { key: 'Backspace', altKey: true, shiftKey: true });
      expect(onRedo).toHaveBeenCalledTimes(1);
    });
  });
  describe('manual triggers', () => {
    it('triggerUndo calls onUndo', () => {
      const onUndo = vi.fn();
      render(react.createElement(UndoRedoHarness, { onUndo: onUndo }));
      fireEvent.click(screen.getByTestId('undo-button'));
      expect(onUndo).toHaveBeenCalledTimes(1);
    });
    it('triggerRedo calls onRedo', () => {
      const onRedo = vi.fn();
      render(react.createElement(UndoRedoHarness, { onRedo: onRedo }));
      fireEvent.click(screen.getByTestId('redo-button'));
      expect(onRedo).toHaveBeenCalledTimes(1);
    });
    it('triggerUndo respects canUndo', () => {
      const onUndo = vi.fn();
      render(react.createElement(UndoRedoHarness, { onUndo: onUndo, canUndo: false }));
      fireEvent.click(screen.getByTestId('undo-button'));
      expect(onUndo).not.toHaveBeenCalled();
    });
    it('triggerRedo respects canRedo', () => {
      const onRedo = vi.fn();
      render(react.createElement(UndoRedoHarness, { onRedo: onRedo, canRedo: false }));
      fireEvent.click(screen.getByTestId('redo-button'));
      expect(onRedo).not.toHaveBeenCalled();
    });
  });
  describe('prevents default', () => {
    it('prevents default browser undo', () => {
      const onUndo = vi.fn();
      render(react.createElement(UndoRedoHarness, { onUndo: onUndo }));
      const event = new KeyboardEvent('keydown', {
        key: 'z',
        ctrlKey: true,
        cancelable: true,
      });
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');
      window.dispatchEvent(event);
      expect(preventDefaultSpy).toHaveBeenCalled();
    });
  });
  describe('cleanup', () => {
    it('removes event listener on unmount', () => {
      const onUndo = vi.fn();
      const { unmount } = render(react.createElement(UndoRedoHarness, { onUndo: onUndo }));
      unmount();
      fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
      expect(onUndo).not.toHaveBeenCalled();
    });
  });
  describe('integration with state', () => {
    it('works with stateful undo/redo', () => {
      render(react.createElement(StatefulUndoRedoHarness, null));
      // Initial state
      expect(screen.getByTestId('value')).toHaveTextContent('0');
      expect(screen.getByTestId('can-undo')).toHaveTextContent('false');
      expect(screen.getByTestId('can-redo')).toHaveTextContent('false');
      // Add values
      fireEvent.click(screen.getByTestId('add-button'));
      expect(screen.getByTestId('value')).toHaveTextContent('1');
      expect(screen.getByTestId('can-undo')).toHaveTextContent('true');
      fireEvent.click(screen.getByTestId('add-button'));
      expect(screen.getByTestId('value')).toHaveTextContent('2');
      // Undo with keyboard
      fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
      expect(screen.getByTestId('value')).toHaveTextContent('1');
      expect(screen.getByTestId('can-redo')).toHaveTextContent('true');
      // Redo with keyboard
      fireEvent.keyDown(window, { key: 'y', ctrlKey: true });
      expect(screen.getByTestId('value')).toHaveTextContent('2');
      expect(screen.getByTestId('can-redo')).toHaveTextContent('false');
      // Undo with button
      fireEvent.click(screen.getByTestId('undo-button'));
      expect(screen.getByTestId('value')).toHaveTextContent('1');
      // Redo with Ctrl+Shift+Z
      fireEvent.keyDown(window, { key: 'z', ctrlKey: true, shiftKey: true });
      expect(screen.getByTestId('value')).toHaveTextContent('2');
    });
  });
});
// ============================================================================
// Tests: Utility Functions
// ============================================================================
describe('getUndoShortcutText', () => {
  it('returns platform-appropriate text', () => {
    const text = getUndoShortcutText();
    // The actual value depends on the navigator.platform
    expect(typeof text).toBe('string');
    expect(text.length).toBeGreaterThan(0);
  });
});
describe('getRedoShortcutText', () => {
  it('returns platform-appropriate text', () => {
    const text = getRedoShortcutText();
    expect(typeof text).toBe('string');
    expect(text.length).toBeGreaterThan(0);
  });
});
describe('getUndoRedoShortcutTexts', () => {
  it('returns both shortcut texts', () => {
    const texts = getUndoRedoShortcutTexts();
    expect(texts).toHaveProperty('undo');
    expect(texts).toHaveProperty('redo');
    expect(typeof texts.undo).toBe('string');
    expect(typeof texts.redo).toBe('string');
  });
});
