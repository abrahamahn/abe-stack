// shared/ui/src/hooks/useKeyboardShortcuts.ts
import { useCallback, useEffect } from 'react';

export type KeyboardShortcut = {
  /**
   * The key to listen for (case-insensitive)
   * Use 'Escape' for escape key, single letters for letter keys
   */
  key: string;
  /**
   * Handler function called when shortcut is triggered
   */
  handler: () => void;
  /**
   * Optional description for display purposes
   */
  description?: string;
  /**
   * Whether to call preventDefault on the event
   * @default true
   */
  preventDefault?: boolean;
  /**
   * Whether the shortcut requires Ctrl/Cmd key
   * @default false
   */
  ctrlKey?: boolean;
  /**
   * Whether the shortcut requires Shift key
   * @default false
   */
  shiftKey?: boolean;
  /**
   * Whether the shortcut requires Alt key
   * @default false
   */
  altKey?: boolean;
};

export type UseKeyboardShortcutsOptions = {
  /**
   * Whether to skip shortcuts when user is typing in input/textarea
   * @default true
   */
  skipInputs?: boolean;
  /**
   * Whether shortcuts are enabled
   * @default true
   */
  enabled?: boolean;
};

/**
 * Hook for handling global keyboard shortcuts
 *
 * @example
 * ```tsx
 * useKeyboardShortcuts([
 *   { key: 'L', handler: () => toggleLeftPanel() },
 *   { key: 'R', handler: () => toggleRightPanel() },
 *   { key: 'Escape', handler: () => closeModal() },
 *   { key: 'K', handler: () => openSearch(), ctrlKey: true },
 * ]);
 * ```
 */
export function useKeyboardShortcuts(
  shortcuts: KeyboardShortcut[],
  options: UseKeyboardShortcutsOptions = {},
): void {
  const { skipInputs = true, enabled = true } = options;

  const handleKeyDown = useCallback(
    (event: KeyboardEvent): void => {
      if (!enabled) return;

      // Skip if user is typing in an input field
      if (skipInputs) {
        const target = event.target;
        if (
          target instanceof HTMLInputElement ||
          target instanceof HTMLTextAreaElement ||
          (target instanceof HTMLElement && target.isContentEditable)
        ) {
          return;
        }
      }

      const pressedKey = event.key.toUpperCase();
      const isEscape = event.key === 'Escape' || event.key === 'Esc';

      for (const shortcut of shortcuts) {
        const shortcutKey = shortcut.key.toUpperCase();
        const keyMatches = isEscape ? shortcutKey === 'ESCAPE' : pressedKey === shortcutKey;

        if (!keyMatches) continue;

        // Check modifier keys
        if (shortcut.ctrlKey === true && !event.ctrlKey && !event.metaKey) continue;
        if (shortcut.shiftKey === true && !event.shiftKey) continue;
        if (shortcut.altKey === true && !event.altKey) continue;

        // If we want to match without modifiers, ensure none are pressed
        if (shortcut.ctrlKey !== true && shortcut.shiftKey !== true && shortcut.altKey !== true) {
          if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) continue;
        }

        if (shortcut.preventDefault !== false) {
          event.preventDefault();
        }

        shortcut.handler();
        break; // Only trigger first matching shortcut
      }
    },
    [shortcuts, skipInputs, enabled],
  );

  useEffect((): (() => void) | undefined => {
    if (typeof window === 'undefined') return;

    window.addEventListener('keydown', handleKeyDown);
    return (): void => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
}
