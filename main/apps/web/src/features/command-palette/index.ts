// main/apps/web/src/features/command-palette/index.ts
/**
 * Command Palette Feature
 *
 * Provides a Ctrl+K / Cmd+K command palette for searching and executing
 * navigation and action commands.
 */

// Components
export { CommandPalette } from './components/CommandPalette';

// Hooks
export { useCommandPalette, type UseCommandPaletteResult } from './hooks/useCommandPalette';

// Data
export {
  createCommands,
  filterCommands,
  type Command,
  type CommandCategory,
  type CommandDependencies,
} from './data/commands';
