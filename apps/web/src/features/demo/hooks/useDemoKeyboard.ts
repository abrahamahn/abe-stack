import { useCallback, useEffect } from 'react';

import type { DemoPaneConfig } from '@demo/types';

export const KEYBOARD_SHORTCUTS = [
  { key: 'L', description: 'Toggle left panel' },
  { key: 'R', description: 'Toggle right panel' },
  { key: 'T', description: 'Cycle theme' },
  { key: 'Esc', description: 'Deselect component' },
] as const;

interface UseDemoKeyboardOptions {
  togglePane: (pane: keyof DemoPaneConfig) => void;
  cycleTheme: () => void;
  clearSelection: () => void;
}

export function useDemoKeyboard({
  togglePane,
  cycleTheme,
  clearSelection,
}: UseDemoKeyboardOptions): void {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key.toUpperCase()) {
        case 'L':
          e.preventDefault();
          togglePane('left');
          break;
        case 'R':
          e.preventDefault();
          togglePane('right');
          break;
        case 'T':
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
