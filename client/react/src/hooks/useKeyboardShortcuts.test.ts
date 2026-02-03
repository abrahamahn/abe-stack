// client/ui/src/hooks/useKeyboardShortcuts.test.ts
/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { createElement, type ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { useKeyboardShortcuts } from './useKeyboardShortcuts';

import type { KeyboardShortcut } from './useKeyboardShortcuts';

const ShortcutsHarness = ({ shortcuts }: { shortcuts: KeyboardShortcut[] }): ReactElement => {
  useKeyboardShortcuts(shortcuts);
  return createElement(
    'div',
    null,
    createElement('input', { 'data-testid': 'text-input', type: 'text' }),
    createElement('button', { type: 'button' }, 'Test Button'),
  );
};
describe('useKeyboardShortcuts', () => {
  it('triggers handler when key is pressed', () => {
    const handler = vi.fn();
    render(createElement(ShortcutsHarness, { shortcuts: [{ key: 'L', handler }] }));
    fireEvent.keyDown(window, { key: 'L' });
    expect(handler).toHaveBeenCalledTimes(1);
  });
  it('is case-insensitive for key matching', () => {
    const handler = vi.fn();
    render(createElement(ShortcutsHarness, { shortcuts: [{ key: 'r', handler }] }));
    fireEvent.keyDown(window, { key: 'R' });
    expect(handler).toHaveBeenCalledTimes(1);
  });
  it('handles Escape key', () => {
    const handler = vi.fn();
    render(createElement(ShortcutsHarness, { shortcuts: [{ key: 'Escape', handler }] }));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handler).toHaveBeenCalledTimes(1);
  });
  it('skips shortcuts when typing in input by default', () => {
    const handler = vi.fn();
    render(createElement(ShortcutsHarness, { shortcuts: [{ key: 'L', handler }] }));
    const input = screen.getByTestId('text-input');
    input.focus();
    fireEvent.keyDown(input, { key: 'L' });
    expect(handler).not.toHaveBeenCalled();
  });
  it('respects ctrlKey modifier', () => {
    const handler = vi.fn();
    render(
      createElement(ShortcutsHarness, { shortcuts: [{ key: 'K', handler, ctrlKey: true }] }),
    );
    // Without Ctrl - should not trigger
    fireEvent.keyDown(window, { key: 'K' });
    expect(handler).not.toHaveBeenCalled();
    // With Ctrl - should trigger
    fireEvent.keyDown(window, { key: 'K', ctrlKey: true });
    expect(handler).toHaveBeenCalledTimes(1);
  });
  it('respects shiftKey modifier', () => {
    const handler = vi.fn();
    render(
      createElement(ShortcutsHarness, { shortcuts: [{ key: 'S', handler, shiftKey: true }] }),
    );
    fireEvent.keyDown(window, { key: 'S' });
    expect(handler).not.toHaveBeenCalled();
    fireEvent.keyDown(window, { key: 'S', shiftKey: true });
    expect(handler).toHaveBeenCalledTimes(1);
  });
  it('does not trigger when modifiers are pressed but not expected', () => {
    const handler = vi.fn();
    render(createElement(ShortcutsHarness, { shortcuts: [{ key: 'L', handler }] }));
    fireEvent.keyDown(window, { key: 'L', ctrlKey: true });
    expect(handler).not.toHaveBeenCalled();
    fireEvent.keyDown(window, { key: 'L', shiftKey: true });
    expect(handler).not.toHaveBeenCalled();
    fireEvent.keyDown(window, { key: 'L' });
    expect(handler).toHaveBeenCalledTimes(1);
  });
  it('only triggers first matching shortcut', () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();
    render(
      createElement(ShortcutsHarness, {
        shortcuts: [
          { key: 'L', handler: handler1 },
          { key: 'L', handler: handler2 },
        ],
      }),
    );
    fireEvent.keyDown(window, { key: 'L' });
    expect(handler1).toHaveBeenCalledTimes(1);
    expect(handler2).not.toHaveBeenCalled();
  });
  it('can disable shortcuts with enabled option', () => {
    const handler = vi.fn();
    const DisabledHarness = (): ReactElement => {
      useKeyboardShortcuts([{ key: 'L', handler }], { enabled: false });
      return createElement('div', null, 'Test');
    };
    render(createElement(DisabledHarness, null));
    fireEvent.keyDown(window, { key: 'L' });
    expect(handler).not.toHaveBeenCalled();
  });
  it('cleans up event listener on unmount', () => {
    const handler = vi.fn();
    const { unmount } = render(
      createElement(ShortcutsHarness, { shortcuts: [{ key: 'L', handler }] }),
    );
    unmount();
    fireEvent.keyDown(window, { key: 'L' });
    expect(handler).not.toHaveBeenCalled();
  });
});
