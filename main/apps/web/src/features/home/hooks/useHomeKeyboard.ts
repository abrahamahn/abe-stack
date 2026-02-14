// main/apps/web/src/features/home/hooks/useHomeKeyboard.ts
import { useKeyboardShortcuts } from '@abe-stack/react/hooks';

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
  useKeyboardShortcuts([
    {
      key: 'ArrowUp',
      handler: (): void => {
        togglePane('top');
      },
    },
    {
      key: 'ArrowDown',
      handler: (): void => {
        togglePane('bottom');
      },
    },
    {
      key: 'ArrowLeft',
      handler: (): void => {
        togglePane('left');
      },
    },
    {
      key: 'ArrowRight',
      handler: (): void => {
        togglePane('right');
      },
    },
    { key: 'T', handler: cycleTheme },
    { key: 'D', handler: cycleDensity },
    { key: 'C', handler: cycleContrast },
    { key: 'Escape', handler: clearSelection },
  ]);
}
