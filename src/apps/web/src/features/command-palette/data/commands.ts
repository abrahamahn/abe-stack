// src/apps/web/src/features/command-palette/data/commands.ts
/**
 * Command Palette Commands
 *
 * Defines the available commands for the command palette.
 * Each command has an id, label, description, category, action, and search keywords.
 */

import type { NavigateFunction } from '@abe-stack/react/router';

// ============================================================================
// Types
// ============================================================================

export type CommandCategory = 'navigation' | 'action';

export interface Command {
  /** Unique identifier for the command */
  id: string;
  /** Display label shown in the palette */
  label: string;
  /** Brief description of what the command does */
  description: string;
  /** Category for grouping commands */
  category: CommandCategory;
  /** Function to execute when the command is selected */
  action: () => void;
  /** Additional keywords for search matching */
  keywords: string[];
}

// ============================================================================
// Command Factory
// ============================================================================

export interface CommandDependencies {
  navigate: NavigateFunction;
  cycleTheme: () => void;
}

/**
 * Creates the full list of available commands.
 *
 * Commands are built with injected dependencies (navigate, cycleTheme)
 * so they can be tested and composed without side effects.
 */
export function createCommands(deps: CommandDependencies): Command[] {
  const { navigate, cycleTheme } = deps;

  return [
    // Navigation commands
    {
      id: 'nav-dashboard',
      label: 'Go to Dashboard',
      description: 'Navigate to the main dashboard',
      category: 'navigation',
      action: (): void => {
        navigate('/dashboard');
      },
      keywords: ['home', 'main', 'overview'],
    },
    {
      id: 'nav-settings',
      label: 'Go to Settings',
      description: 'Navigate to account settings',
      category: 'navigation',
      action: (): void => {
        navigate('/settings');
      },
      keywords: ['profile', 'account', 'preferences'],
    },
    {
      id: 'nav-admin',
      label: 'Go to Admin',
      description: 'Navigate to the admin panel',
      category: 'navigation',
      action: (): void => {
        navigate('/admin');
      },
      keywords: ['manage', 'users', 'system'],
    },
    {
      id: 'nav-billing',
      label: 'Go to Billing',
      description: 'Navigate to billing and pricing',
      category: 'navigation',
      action: (): void => {
        navigate('/pricing');
      },
      keywords: ['pricing', 'subscription', 'payment', 'plan'],
    },
    {
      id: 'nav-activities',
      label: 'Go to Activity Feed',
      description: 'Navigate to the activity feed',
      category: 'navigation',
      action: (): void => {
        navigate('/activities');
      },
      keywords: ['feed', 'recent', 'events', 'log'],
    },

    // Action commands
    {
      id: 'action-create-workspace',
      label: 'Create Workspace',
      description: 'Create a new workspace',
      category: 'action',
      action: (): void => {
        navigate('/workspaces');
      },
      keywords: ['new', 'workspace', 'team', 'organization'],
    },
    {
      id: 'action-invite-member',
      label: 'Invite Member',
      description: 'Invite a team member to your workspace',
      category: 'action',
      action: (): void => {
        navigate('/workspaces');
      },
      keywords: ['add', 'user', 'team', 'collaborate'],
    },
    {
      id: 'action-change-theme',
      label: 'Change Theme',
      description: 'Cycle through light, dark, and system themes',
      category: 'action',
      action: (): void => {
        cycleTheme();
      },
      keywords: ['dark', 'light', 'mode', 'appearance', 'toggle'],
    },
  ];
}

/**
 * Filters commands by matching the query against label, description, and keywords.
 * Uses case-insensitive substring matching.
 */
export function filterCommands(commands: Command[], query: string): Command[] {
  if (query.trim() === '') {
    return commands;
  }

  const lowerQuery = query.toLowerCase();

  return commands.filter((command) => {
    const searchableText = [command.label, command.description, ...command.keywords]
      .join(' ')
      .toLowerCase();

    return searchableText.includes(lowerQuery);
  });
}
