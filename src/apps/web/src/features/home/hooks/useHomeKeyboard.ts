// src/apps/web/src/features/home/hooks/useHomeKeyboard.ts
import { useCallback, useEffect } from 'react';

import type { HomePaneConfig } from '../types';

/** Keyboard shortcut definitions displayed in the bottom bar. */
export const HOME_KEYBOARD_SHORTCUTS = [
  { key: '↑', description: 'Toggle top bar' },
  { key: '↓', description: 'Toggle bottom bar' },
  { key: '←', description: 'Toggle left panel' },
  { key: '→', description: 'Toggle right panel' },
  { key: 'T', description: 'Cycle theme' },
  { key: 'D', description: 'Cycle density' },
  { key: 'C', description: 'Cycle contrast' },
  { key: 'Esc', description: 'Clear selection' },
] as const;

/** Options for configuring keyboard shortcut handlers. */
export interface UseHomeKeyboardOptions {
  /** Toggle visibility of a layout pane */
  togglePane: (pane: keyof HomePaneConfig) => void;
  /** Cycle through theme modes */
  cycleTheme: () => void;
  /** Cycle through density modes */
  cycleDensity: () => void;
  /** Cycle through contrast modes */
  cycleContrast: () => void;
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
  cycleDensity,
  cycleContrast,
  clearSelection,
}: UseHomeKeyboardOptions): void {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement ||
        (e.target instanceof HTMLElement && e.target.isContentEditable)
      ) {
        return;
      }

      switch (e.key.toUpperCase()) {
        case 'ARROWUP':
          e.preventDefault();
          togglePane('top');
          break;
        case 'ARROWDOWN':
          e.preventDefault();
          togglePane('bottom');
          break;
        case 'ARROWLEFT':
          e.preventDefault();
          togglePane('left');
          break;
        case 'ARROWRIGHT':
          e.preventDefault();
          togglePane('right');
          break;
        case 'T':
          e.preventDefault();
          cycleTheme();
          break;
        case 'D':
          e.preventDefault();
          cycleDensity();
          break;
        case 'C':
          e.preventDefault();
          cycleContrast();
          break;
        case 'ESCAPE':
          e.preventDefault();
          clearSelection();
          break;
      }
    },
    [togglePane, cycleTheme, cycleDensity, cycleContrast, clearSelection],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return (): void => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
}
