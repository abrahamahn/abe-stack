// apps/web/src/features/home/hooks/useHomeKeyboard.ts
import { useCallback, useEffect } from 'react';

import type { HomePaneConfig } from '../types';

/** Keyboard shortcut definitions displayed in the bottom bar. */
export const HOME_KEYBOARD_SHORTCUTS = [
  { key: 'T', description: 'Toggle top bar' },
  { key: 'L', description: 'Toggle left panel' },
  { key: 'R', description: 'Toggle right panel' },
  { key: 'B', description: 'Toggle bottom bar' },
  { key: 'D', description: 'Cycle theme' },
  { key: 'Esc', description: 'Clear selection' },
] as const;

/** Options for configuring keyboard shortcut handlers. */
export interface UseHomeKeyboardOptions {
  /** Toggle visibility of a layout pane */
  togglePane: (pane: keyof HomePaneConfig) => void;
  /** Cycle through theme modes */
  cycleTheme: () => void;
  /** Clear the currently selected document */
  clearSelection: () => void;
}

/**
 * Registers global keyboard shortcuts for the Home page layout.
 * Shortcuts are disabled when the user is typing in an input or textarea.
 *
 * @param options - Handler functions for each shortcut action
 * @complexity O(1) - single event listener with constant-time switch
 */
export function useHomeKeyboard({
  togglePane,
  cycleTheme,
  clearSelection,
}: UseHomeKeyboardOptions): void {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key.toUpperCase()) {
        case 'T':
          e.preventDefault();
          togglePane('top');
          break;
        case 'L':
          e.preventDefault();
          togglePane('left');
          break;
        case 'R':
          e.preventDefault();
          togglePane('right');
          break;
        case 'B':
          e.preventDefault();
          togglePane('bottom');
          break;
        case 'D':
          e.preventDefault();
          cycleTheme();
          break;
        case 'ESCAPE':
          e.preventDefault();
          clearSelection();
          break;
      }
    },
    [togglePane, cycleTheme, clearSelection],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return (): void => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
}
