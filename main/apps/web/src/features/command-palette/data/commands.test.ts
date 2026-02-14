// main/apps/web/src/features/command-palette/data/commands.test.ts
import { beforeEach, describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { createCommands, filterCommands } from './commands';

import type { Command, CommandDependencies } from './commands';

describe('commands', () => {
  let deps: CommandDependencies;
  let commands: Command[];

  beforeEach(() => {
    deps = {
      navigate: vi.fn(),
      cycleTheme: vi.fn(),
    };
    commands = createCommands(deps);
  });

  describe('createCommands', () => {
    it('should return an array of commands', () => {
      expect(commands.length).toBeGreaterThan(0);
    });

    it('should include navigation commands', () => {
      const navCommands = commands.filter((c) => c.category === 'navigation');
      expect(navCommands.length).toBeGreaterThan(0);
    });

    it('should include action commands', () => {
      const actionCommands = commands.filter((c) => c.category === 'action');
      expect(actionCommands.length).toBeGreaterThan(0);
    });

    it('should have unique ids for each command', () => {
      const ids = commands.map((c) => c.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should include dashboard navigation', () => {
      const dashboard = commands.find((c) => c.id === 'nav-dashboard');
      expect(dashboard).toBeDefined();
      expect(dashboard?.label).toBe('Go to Dashboard');
    });

    it('should include settings navigation', () => {
      const settings = commands.find((c) => c.id === 'nav-settings');
      expect(settings).toBeDefined();
    });

    it('should include admin navigation', () => {
      const admin = commands.find((c) => c.id === 'nav-admin');
      expect(admin).toBeDefined();
    });

    it('should include billing navigation', () => {
      const billing = commands.find((c) => c.id === 'nav-billing');
      expect(billing).toBeDefined();
    });

    it('should include activity feed navigation', () => {
      const activities = commands.find((c) => c.id === 'nav-activities');
      expect(activities).toBeDefined();
    });

    it('should include create workspace action', () => {
      const createWs = commands.find((c) => c.id === 'action-create-workspace');
      expect(createWs).toBeDefined();
    });

    it('should include invite member action', () => {
      const invite = commands.find((c) => c.id === 'action-invite-member');
      expect(invite).toBeDefined();
    });

    it('should include change theme action', () => {
      const theme = commands.find((c) => c.id === 'action-change-theme');
      expect(theme).toBeDefined();
    });

    it('should call navigate when a navigation command action is executed', () => {
      const dashboard = commands.find((c) => c.id === 'nav-dashboard');
      dashboard?.action();
      expect(deps.navigate).toHaveBeenCalledWith('/dashboard');
    });

    it('should call navigate with /settings for settings command', () => {
      const settings = commands.find((c) => c.id === 'nav-settings');
      settings?.action();
      expect(deps.navigate).toHaveBeenCalledWith('/settings');
    });

    it('should call cycleTheme when change theme action is executed', () => {
      const theme = commands.find((c) => c.id === 'action-change-theme');
      theme?.action();
      expect(deps.cycleTheme).toHaveBeenCalled();
    });

    it('should have keywords for every command', () => {
      for (const command of commands) {
        expect(command.keywords.length).toBeGreaterThan(0);
      }
    });

    it('should have non-empty descriptions for every command', () => {
      for (const command of commands) {
        expect(command.description.length).toBeGreaterThan(0);
      }
    });
  });

  describe('filterCommands', () => {
    it('should return all commands when query is empty', () => {
      const result = filterCommands(commands, '');
      expect(result.length).toBe(commands.length);
    });

    it('should return all commands when query is whitespace', () => {
      const result = filterCommands(commands, '   ');
      expect(result.length).toBe(commands.length);
    });

    it('should filter commands by label', () => {
      const result = filterCommands(commands, 'Dashboard');
      expect(result.some((c) => c.id === 'nav-dashboard')).toBe(true);
    });

    it('should filter commands by description', () => {
      const result = filterCommands(commands, 'account settings');
      expect(result.some((c) => c.id === 'nav-settings')).toBe(true);
    });

    it('should filter commands by keywords', () => {
      const result = filterCommands(commands, 'dark');
      expect(result.some((c) => c.id === 'action-change-theme')).toBe(true);
    });

    it('should be case insensitive', () => {
      const result = filterCommands(commands, 'DASHBOARD');
      expect(result.some((c) => c.id === 'nav-dashboard')).toBe(true);
    });

    it('should return empty array when no commands match', () => {
      const result = filterCommands(commands, 'xyznonexistent');
      expect(result.length).toBe(0);
    });

    it('should match partial words', () => {
      const result = filterCommands(commands, 'dash');
      expect(result.some((c) => c.id === 'nav-dashboard')).toBe(true);
    });

    it('should match keywords like subscription for billing', () => {
      const result = filterCommands(commands, 'subscription');
      expect(result.some((c) => c.id === 'nav-billing')).toBe(true);
    });
  });
});
