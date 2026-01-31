// client/ui/src/hooks/useKeyboardShortcut.test.ts
/** @vitest-environment jsdom */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  useKeyboardShortcut,
  useKeyBindings,
  parseKeyBinding,
  formatKeyBinding,
} from './useKeyboardShortcut';
// ============================================================================
// Test Harness Components
// ============================================================================
const ShortcutHarness = ({
  shortcutKey,
  handler,
  ctrl,
  alt,
  shift,
  meta,
  enabled,
  preventDefault,
  stopPropagation,
  skipInputs,
  eventType,
}: {
  shortcutKey: string;
  handler: (event: KeyboardEvent) => void;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  meta?: boolean;
  enabled?: boolean;
  preventDefault?: boolean;
  stopPropagation?: boolean;
  skipInputs?: boolean;
  eventType?: 'keydown' | 'keyup';
}): React.ReactElement => {
  useKeyboardShortcut({
    key: shortcutKey,
    handler,
    ctrl,
    alt,
    shift,
    meta,
    enabled,
    preventDefault,
    stopPropagation,
    skipInputs,
    eventType,
  });
  return React.createElement(
    'div',
    null,
    React.createElement('input', { 'data-testid': 'text-input', type: 'text' }),
    React.createElement('textarea', { 'data-testid': 'textarea' }),
    React.createElement('div', {
      'data-testid': 'editable',
      contentEditable: true,
      suppressContentEditableWarning: true,
    }),
    React.createElement('button', { type: 'button' }, 'Test Button'),
  );
};
const KeyBindingsHarness = ({
  bindings,
  enabled,
}: {
  bindings: Record<string, () => void>;
  enabled?: boolean;
}): React.ReactElement => {
  useKeyBindings(bindings, { enabled });
  return React.createElement(
    'div',
    null,
    React.createElement('button', { type: 'button' }, 'Test Button'),
  );
};
// ============================================================================
// Tests: useKeyboardShortcut
// ============================================================================
describe('useKeyboardShortcut', () => {
  describe('basic functionality', () => {
    it('triggers handler when key is pressed', () => {
      const handler = vi.fn();
      render(React.createElement(ShortcutHarness, { shortcutKey: 'z', handler: handler }));
      fireEvent.keyDown(window, { key: 'z' });
      expect(handler).toHaveBeenCalledTimes(1);
    });
    it('is case-insensitive for key matching', () => {
      const handler = vi.fn();
      render(React.createElement(ShortcutHarness, { shortcutKey: 'a', handler: handler }));
      fireEvent.keyDown(window, { key: 'A' });
      expect(handler).toHaveBeenCalledTimes(1);
    });
    it('handles special keys like Escape', () => {
      const handler = vi.fn();
      render(React.createElement(ShortcutHarness, { shortcutKey: 'Escape', handler: handler }));
      fireEvent.keyDown(window, { key: 'Escape' });
      expect(handler).toHaveBeenCalledTimes(1);
    });
    it('passes the event to the handler', () => {
      const handler = vi.fn();
      render(React.createElement(ShortcutHarness, { shortcutKey: 's', handler: handler }));
      fireEvent.keyDown(window, { key: 's' });
      expect(handler).toHaveBeenCalledWith(expect.any(KeyboardEvent));
    });
  });
  describe('modifier keys', () => {
    it('requires ctrl when ctrl option is true', () => {
      const handler = vi.fn();
      render(
        React.createElement(ShortcutHarness, { shortcutKey: 'z', ctrl: true, handler: handler }),
      );
      // Without ctrl - should not trigger
      fireEvent.keyDown(window, { key: 'z' });
      expect(handler).not.toHaveBeenCalled();
      // With ctrl - should trigger
      fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
      expect(handler).toHaveBeenCalledTimes(1);
    });
    it('requires shift when shift option is true', () => {
      const handler = vi.fn();
      render(
        React.createElement(ShortcutHarness, { shortcutKey: 'z', shift: true, handler: handler }),
      );
      fireEvent.keyDown(window, { key: 'z' });
      expect(handler).not.toHaveBeenCalled();
      fireEvent.keyDown(window, { key: 'z', shiftKey: true });
      expect(handler).toHaveBeenCalledTimes(1);
    });
    it('requires alt when alt option is true', () => {
      const handler = vi.fn();
      render(
        React.createElement(ShortcutHarness, { shortcutKey: 'z', alt: true, handler: handler }),
      );
      fireEvent.keyDown(window, { key: 'z' });
      expect(handler).not.toHaveBeenCalled();
      fireEvent.keyDown(window, { key: 'z', altKey: true });
      expect(handler).toHaveBeenCalledTimes(1);
    });
    it('requires meta when meta option is true', () => {
      const handler = vi.fn();
      render(
        React.createElement(ShortcutHarness, { shortcutKey: 'z', meta: true, handler: handler }),
      );
      fireEvent.keyDown(window, { key: 'z' });
      expect(handler).not.toHaveBeenCalled();
      fireEvent.keyDown(window, { key: 'z', metaKey: true });
      expect(handler).toHaveBeenCalledTimes(1);
    });
    it('supports multiple modifiers', () => {
      const handler = vi.fn();
      render(
        React.createElement(ShortcutHarness, {
          shortcutKey: 'z',
          ctrl: true,
          shift: true,
          handler: handler,
        }),
      );
      // Only ctrl - should not trigger
      fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
      expect(handler).not.toHaveBeenCalled();
      // Only shift - should not trigger
      fireEvent.keyDown(window, { key: 'z', shiftKey: true });
      expect(handler).not.toHaveBeenCalled();
      // Both ctrl and shift - should trigger
      fireEvent.keyDown(window, { key: 'z', ctrlKey: true, shiftKey: true });
      expect(handler).toHaveBeenCalledTimes(1);
    });
    it('does not trigger when unexpected modifiers are pressed', () => {
      const handler = vi.fn();
      render(React.createElement(ShortcutHarness, { shortcutKey: 'z', handler: handler }));
      fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
      expect(handler).not.toHaveBeenCalled();
      fireEvent.keyDown(window, { key: 'z', shiftKey: true });
      expect(handler).not.toHaveBeenCalled();
      fireEvent.keyDown(window, { key: 'z', altKey: true });
      expect(handler).not.toHaveBeenCalled();
    });
  });
  describe('enabled option', () => {
    it('does not trigger when disabled', () => {
      const handler = vi.fn();
      render(
        React.createElement(ShortcutHarness, {
          shortcutKey: 'z',
          handler: handler,
          enabled: false,
        }),
      );
      fireEvent.keyDown(window, { key: 'z' });
      expect(handler).not.toHaveBeenCalled();
    });
    it('triggers when enabled', () => {
      const handler = vi.fn();
      render(
        React.createElement(ShortcutHarness, { shortcutKey: 'z', handler: handler, enabled: true }),
      );
      fireEvent.keyDown(window, { key: 'z' });
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });
  describe('skipInputs option', () => {
    it('does not skip inputs by default', () => {
      const handler = vi.fn();
      render(React.createElement(ShortcutHarness, { shortcutKey: 'z', handler: handler }));
      const input = screen.getByTestId('text-input');
      input.focus();
      fireEvent.keyDown(input, { key: 'z' });
      expect(handler).toHaveBeenCalledTimes(1);
    });
    it('skips text inputs when skipInputs is true', () => {
      const handler = vi.fn();
      render(
        React.createElement(ShortcutHarness, {
          shortcutKey: 'z',
          handler: handler,
          skipInputs: true,
        }),
      );
      const input = screen.getByTestId('text-input');
      input.focus();
      fireEvent.keyDown(input, { key: 'z' });
      expect(handler).not.toHaveBeenCalled();
    });
    it('skips textareas when skipInputs is true', () => {
      const handler = vi.fn();
      render(
        React.createElement(ShortcutHarness, {
          shortcutKey: 'z',
          handler: handler,
          skipInputs: true,
        }),
      );
      const textarea = screen.getByTestId('textarea');
      textarea.focus();
      fireEvent.keyDown(textarea, { key: 'z' });
      expect(handler).not.toHaveBeenCalled();
    });
    // Note: contentEditable detection works in real browsers but jsdom has
    // inconsistent behavior with the isContentEditable property. The skipInputs
    // functionality for contentEditable is tested manually in real browser environments.
  });
  describe('preventDefault option', () => {
    it('prevents default by default', () => {
      const handler = vi.fn();
      render(React.createElement(ShortcutHarness, { shortcutKey: 'z', handler: handler }));
      const event = new KeyboardEvent('keydown', { key: 'z', cancelable: true });
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');
      window.dispatchEvent(event);
      expect(preventDefaultSpy).toHaveBeenCalled();
    });
    it('does not prevent default when preventDefault is false', () => {
      const handler = vi.fn();
      render(
        React.createElement(ShortcutHarness, {
          shortcutKey: 'z',
          handler: handler,
          preventDefault: false,
        }),
      );
      const event = new KeyboardEvent('keydown', { key: 'z', cancelable: true });
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');
      window.dispatchEvent(event);
      expect(preventDefaultSpy).not.toHaveBeenCalled();
    });
  });
  describe('stopPropagation option', () => {
    it('does not stop propagation by default', () => {
      const handler = vi.fn();
      render(React.createElement(ShortcutHarness, { shortcutKey: 'z', handler: handler }));
      const event = new KeyboardEvent('keydown', { key: 'z', bubbles: true });
      const stopPropagationSpy = vi.spyOn(event, 'stopPropagation');
      window.dispatchEvent(event);
      expect(stopPropagationSpy).not.toHaveBeenCalled();
    });
    it('stops propagation when stopPropagation is true', () => {
      const handler = vi.fn();
      render(
        React.createElement(ShortcutHarness, {
          shortcutKey: 'z',
          handler: handler,
          stopPropagation: true,
        }),
      );
      const event = new KeyboardEvent('keydown', { key: 'z', bubbles: true });
      const stopPropagationSpy = vi.spyOn(event, 'stopPropagation');
      window.dispatchEvent(event);
      expect(stopPropagationSpy).toHaveBeenCalled();
    });
  });
  describe('cleanup', () => {
    it('removes event listener on unmount', () => {
      const handler = vi.fn();
      const { unmount } = render(
        React.createElement(ShortcutHarness, { shortcutKey: 'z', handler: handler }),
      );
      unmount();
      fireEvent.keyDown(window, { key: 'z' });
      expect(handler).not.toHaveBeenCalled();
    });
    it('removes event listener when disabled', () => {
      const handler = vi.fn();
      const { rerender } = render(
        React.createElement(ShortcutHarness, { shortcutKey: 'z', handler: handler, enabled: true }),
      );
      fireEvent.keyDown(window, { key: 'z' });
      expect(handler).toHaveBeenCalledTimes(1);
      rerender(
        React.createElement(ShortcutHarness, {
          shortcutKey: 'z',
          handler: handler,
          enabled: false,
        }),
      );
      fireEvent.keyDown(window, { key: 'z' });
      expect(handler).toHaveBeenCalledTimes(1); // Still 1, not 2
    });
  });
  describe('keyup event', () => {
    it('supports keyup event type', () => {
      const handler = vi.fn();
      render(
        React.createElement(ShortcutHarness, {
          shortcutKey: 'z',
          handler: handler,
          eventType: 'keyup',
        }),
      );
      // keydown should not trigger
      fireEvent.keyDown(window, { key: 'z' });
      expect(handler).not.toHaveBeenCalled();
      // keyup should trigger
      fireEvent.keyUp(window, { key: 'z' });
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });
});
// ============================================================================
// Tests: useKeyBindings
// ============================================================================
describe('useKeyBindings', () => {
  it('handles multiple bindings', () => {
    const saveHandler = vi.fn();
    const undoHandler = vi.fn();
    const ctrlS = 'ctrl+s';
    const ctrlZ = 'ctrl+z';
    render(
      React.createElement(KeyBindingsHarness, {
        bindings: {
          [ctrlS]: saveHandler,
          [ctrlZ]: undoHandler,
        },
      }),
    );
    fireEvent.keyDown(window, { key: 's', ctrlKey: true });
    expect(saveHandler).toHaveBeenCalledTimes(1);
    expect(undoHandler).not.toHaveBeenCalled();
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
    expect(undoHandler).toHaveBeenCalledTimes(1);
  });
  it('handles bindings with multiple modifiers', () => {
    const handler = vi.fn();
    const ctrlShiftZ = 'ctrl+shift+z';
    render(
      React.createElement(KeyBindingsHarness, {
        bindings: {
          [ctrlShiftZ]: handler,
        },
      }),
    );
    // Only ctrl - should not trigger
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
    expect(handler).not.toHaveBeenCalled();
    // Both modifiers - should trigger
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true, shiftKey: true });
    expect(handler).toHaveBeenCalledTimes(1);
  });
  it('can be disabled', () => {
    const handler = vi.fn();
    const ctrlZ = 'ctrl+z';
    render(
      React.createElement(KeyBindingsHarness, {
        bindings: {
          [ctrlZ]: handler,
        },
        enabled: false,
      }),
    );
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
    expect(handler).not.toHaveBeenCalled();
  });
});
// ============================================================================
// Tests: Utility Functions
// ============================================================================
describe('parseKeyBinding', () => {
  it('parses simple key', () => {
    expect(parseKeyBinding('z')).toEqual({
      key: 'z',
      ctrl: false,
      alt: false,
      shift: false,
      meta: false,
    });
  });
  it('parses ctrl+key', () => {
    expect(parseKeyBinding('ctrl+z')).toEqual({
      key: 'z',
      ctrl: true,
      alt: false,
      shift: false,
      meta: false,
    });
  });
  it('parses multiple modifiers', () => {
    expect(parseKeyBinding('ctrl+shift+z')).toEqual({
      key: 'z',
      ctrl: true,
      alt: false,
      shift: true,
      meta: false,
    });
  });
  it('parses all modifiers', () => {
    expect(parseKeyBinding('ctrl+alt+shift+meta+z')).toEqual({
      key: 'z',
      ctrl: true,
      alt: true,
      shift: true,
      meta: true,
    });
  });
  it('handles alternate modifier names', () => {
    expect(parseKeyBinding('control+option+cmd+z')).toEqual({
      key: 'z',
      ctrl: true,
      alt: true,
      shift: false,
      meta: true,
    });
  });
  it('is case-insensitive', () => {
    expect(parseKeyBinding('CTRL+SHIFT+Z')).toEqual({
      key: 'z',
      ctrl: true,
      alt: false,
      shift: true,
      meta: false,
    });
  });
});
describe('formatKeyBinding', () => {
  it('formats simple key', () => {
    expect(
      formatKeyBinding({ key: 'z', ctrl: false, alt: false, shift: false, meta: false }, false),
    ).toBe('Z');
  });
  it('formats ctrl+key for Windows', () => {
    expect(
      formatKeyBinding({ key: 'z', ctrl: true, alt: false, shift: false, meta: false }, false),
    ).toBe('Ctrl+Z');
  });
  it('formats ctrl+key as Cmd for Mac', () => {
    expect(
      formatKeyBinding({ key: 'z', ctrl: true, alt: false, shift: false, meta: false }, true),
    ).toBe('Cmd+Z');
  });
  it('formats multiple modifiers', () => {
    expect(
      formatKeyBinding({ key: 'z', ctrl: true, alt: false, shift: true, meta: false }, false),
    ).toBe('Ctrl+Shift+Z');
  });
  it('formats alt as Option on Mac', () => {
    expect(
      formatKeyBinding({ key: 'z', ctrl: false, alt: true, shift: false, meta: false }, true),
    ).toBe('Option+Z');
  });
});
