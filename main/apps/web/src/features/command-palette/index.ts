// main/apps/web/src/features/command-palette/index.ts
/**
 * Command Palette Feature
 *
 * Provides a Ctrl+K / Cmd+K command palette for searching and executing
 * navigation and action commands.
 */

// Components
export { CommandPalette } from './components';

// Hooks
export { useCommandPalette } from './hooks';
export type { UseCommandPaletteResult } from './hooks';

// Data
export { createCommands, filterCommands } from './data';
export type { Command, CommandCategory, CommandDependencies } from './data';
