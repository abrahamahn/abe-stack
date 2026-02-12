// src/apps/web/src/features/command-palette/hooks/useCommandPalette.ts
/**
 * Command Palette Hook
 *
 * Manages open/close state, search query, filtered results, and keyboard navigation
 * for the command palette overlay.
 */

import { useKeyboardShortcuts, useThemeMode } from '@abe-stack/react/hooks';
import { useNavigate } from '@abe-stack/react/router';
import { useCallback, useMemo, useState } from 'react';

import { createCommands, filterCommands } from '../data';

import type { Command } from '../data';

// ============================================================================
// Types
// ============================================================================

export interface UseCommandPaletteResult {
  /** Whether the palette is currently open */
  isOpen: boolean;
  /** Opens the palette */
  open: () => void;
  /** Closes the palette and resets state */
  close: () => void;
  /** Toggles open/close */
  toggle: () => void;
  /** Current search query */
  query: string;
  /** Updates the search query */
  setQuery: (query: string) => void;
  /** Filtered list of matching commands */
  filteredCommands: Command[];
  /** Index of the currently highlighted command */
  selectedIndex: number;
  /** Sets the selected index */
  setSelectedIndex: (index: number) => void;
  /** Moves selection up by one */
  moveUp: () => void;
  /** Moves selection down by one */
  moveDown: () => void;
  /** Executes the currently selected command */
  executeSelected: () => void;
  /** Executes a specific command by index */
  executeCommand: (index: number) => void;
}

// ============================================================================
// Hook
// ============================================================================

export function useCommandPalette(): UseCommandPaletteResult {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const navigate = useNavigate();
  const { cycleMode } = useThemeMode();

  // Build commands with injected dependencies
  const commands = useMemo(
    () => createCommands({ navigate, cycleTheme: cycleMode }),
    [navigate, cycleMode],
  );

  // Filter commands based on query
  const filteredCommands = useMemo(() => filterCommands(commands, query), [commands, query]);

  const open = useCallback((): void => {
    setIsOpen(true);
    setQuery('');
    setSelectedIndex(0);
  }, []);

  const close = useCallback((): void => {
    setIsOpen(false);
    setQuery('');
    setSelectedIndex(0);
  }, []);

  const toggle = useCallback((): void => {
    if (isOpen) {
      close();
    } else {
      open();
    }
  }, [isOpen, close, open]);

  const moveUp = useCallback((): void => {
    setSelectedIndex((prev) => (prev <= 0 ? filteredCommands.length - 1 : prev - 1));
  }, [filteredCommands.length]);

  const moveDown = useCallback((): void => {
    setSelectedIndex((prev) => (prev >= filteredCommands.length - 1 ? 0 : prev + 1));
  }, [filteredCommands.length]);

  const executeCommand = useCallback(
    (index: number): void => {
      const command = filteredCommands[index];
      if (command !== undefined) {
        command.action();
        close();
      }
    },
    [filteredCommands, close],
  );

  const executeSelected = useCallback((): void => {
    executeCommand(selectedIndex);
  }, [executeCommand, selectedIndex]);

  // Reset selected index when query changes (filtered results change)
  const handleSetQuery = useCallback((newQuery: string): void => {
    setQuery(newQuery);
    setSelectedIndex(0);
  }, []);

  // Register Ctrl+K / Cmd+K global shortcut
  useKeyboardShortcuts(
    [
      {
        key: 'K',
        ctrlKey: true,
        handler: toggle,
        description: 'Toggle command palette',
      },
    ],
    { skipInputs: false },
  );

  return {
    isOpen,
    open,
    close,
    toggle,
    query,
    setQuery: handleSetQuery,
    filteredCommands,
    selectedIndex,
    setSelectedIndex,
    moveUp,
    moveDown,
    executeSelected,
    executeCommand,
  };
}
