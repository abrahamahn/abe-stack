#!/usr/bin/env node
// config/lint/__tests__/domain-folder-naming.test.ts
import { afterEach, describe, expect, test, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// Mock fs and path for testing
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readdirSync: vi.fn(),
}));

vi.mock('path', () => ({
  resolve: vi.fn(),
  join: vi.fn(),
  relative: vi.fn(),
}));

const mockFs = vi.mocked(fs);
const mockPath = vi.mocked(path);

// Import after mocking
import { checkFolderNaming } from '../domain-folder-naming';

describe('Domain Folder Naming Linter', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    mockPath.resolve.mockImplementation((...args) => args.join('/'));
    mockPath.join.mockImplementation((...args) => args.join('/'));
    mockPath.relative.mockImplementation((from, to) => to);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('checkFolderNaming', () => {
    test('should return empty result for non-core directories', () => {
      const result = checkFolderNaming('/some/other/package/src');
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    test('should detect technical folder names', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockReturnValue([
        { name: 'async', isDirectory: () => true },
        { name: 'utils', isDirectory: () => true },
        { name: 'constants', isDirectory: () => true },
        { name: 'helpers', isDirectory: () => true },
        { name: 'auth', isDirectory: () => true }, // This should be allowed
      ] as any);

      const result = checkFolderNaming('/packages/core/src');

      expect(result.errors).toHaveLength(4);
      expect(result.errors[0]).toContain('async');
      expect(result.errors[1]).toContain('utils');
      expect(result.errors[2]).toContain('constants');
      expect(result.errors[3]).toContain('helpers');
    });

    test('should warn about very short folder names', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockReturnValue([
        { name: 'a', isDirectory: () => true },
        { name: 'ab', isDirectory: () => true },
        { name: 'abc', isDirectory: () => true }, // Should be OK
      ] as any);

      const result = checkFolderNaming('/packages/core/src');

      expect(result.warnings).toHaveLength(2);
      expect(result.warnings[0]).toContain('Very short folder name "a"');
      expect(result.warnings[1]).toContain('Very short folder name "ab"');
    });

    test('should allow valid domain names', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockReturnValue([
        { name: 'auth', isDirectory: () => true },
        { name: 'users', isDirectory: () => true },
        { name: 'admin', isDirectory: () => true },
        { name: 'billing', isDirectory: () => true },
        { name: 'shared', isDirectory: () => true },
      ] as any);

      const result = checkFolderNaming('/packages/core/src');

      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    test('should skip dot directories', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockReturnValue([
        { name: '.git', isDirectory: () => true },
        { name: '__tests__', isDirectory: () => true },
        { name: '.cursor', isDirectory: () => true },
      ] as any);

      const result = checkFolderNaming('/packages/core/src');

      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    test('should recursively check subdirectories', () => {
      let callCount = 0;
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockImplementation((dirPath: any) => {
        callCount++;
        if (callCount === 1) {
          // Root directory
          return [{ name: 'auth', isDirectory: () => true }] as any;
        } else {
          // Subdirectory
          return [{ name: 'utils', isDirectory: () => true }] as any;
        }
      });

      const result = checkFolderNaming('/packages/core/src');

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('utils');
    });

    test('should handle non-existent directories gracefully', () => {
      mockFs.existsSync.mockReturnValue(false);

      const result = checkFolderNaming('/packages/core/src');

      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    test('should handle readdir errors gracefully', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const result = checkFolderNaming('/packages/core/src');

      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });
  });

  describe('Technical folder name detection', () => {
    const technicalNames = [
      'async',
      'utils',
      'helpers',
      'common',
      'shared',
      'lib',
      'libs',
      'utilities',
      'tools',
      'misc',
      'constants',
      'config',
      'configs',
      'types',
      'interfaces',
      'enums',
      'validation',
      'validators',
      'crypto',
      'cryptography',
      'security',
      'auth',
      'authentication',
      'errors',
      'exceptions',
      'http',
      'network',
      'api',
      'rest',
      'graphql',
      'database',
      'db',
      'models',
      'entities',
      'repositories',
      'services',
      'controllers',
      'handlers',
      'routes',
      'middleware',
      'interceptors',
      'guards',
      'pipes',
      'decorators',
      'stores',
      'state',
      'redux',
      'mobx',
      'zustand',
      'context',
      'hooks',
      'components',
      'ui',
      'views',
      'pages',
      'screens',
      'layouts',
      'templates',
      'styles',
      'css',
      'scss',
      'sass',
      'less',
      'styling',
      'themes',
      'assets',
      'images',
      'icons',
      'fonts',
      'files',
      'uploads',
      'downloads',
      'cache',
      'temp',
      'tmp',
      'logs',
      'build',
      'dist',
      'out',
      'output',
      'generated',
      'auto-generated',
      'vendor',
      'third-party',
      'external',
      'deps',
      'dependencies',
    ];

    test.each(technicalNames)('should detect "%s" as technical folder name', (name) => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockReturnValue([{ name, isDirectory: () => true }] as any);

      const result = checkFolderNaming('/packages/core/src');

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain(name);
    });
  });

  describe('Allowed domain names', () => {
    const allowedDomains = [
      'auth',
      'users',
      'admin',
      'billing',
      'payments',
      'notifications',
      'messaging',
      'chat',
      'files',
      'storage',
      'analytics',
      'reporting',
      'dashboard',
      'profile',
      'settings',
      'preferences',
      'search',
      'discovery',
      'social',
      'friends',
      'groups',
      'teams',
      'organizations',
      'companies',
      'projects',
      'tasks',
      'calendar',
      'events',
      'booking',
      'reservations',
      'inventory',
      'products',
      'orders',
      'shopping',
      'cart',
      'checkout',
      'shipping',
      'tracking',
      'support',
      'help',
      'faq',
      'documentation',
      'docs',
      'content',
      'cms',
      'blog',
      'news',
      'articles',
      'media',
      'streaming',
      'video',
      'audio',
      'music',
      'gaming',
      'sports',
      'fitness',
      'health',
      'medical',
      'finance',
      'banking',
      'investment',
      'trading',
      'marketplace',
      'auctions',
      'bidding',
      'real-estate',
      'travel',
      'hospitality',
      'education',
      'learning',
      'courses',
      'certification',
      'assessment',
      'testing',
      'surveys',
      'feedback',
      'reviews',
      'ratings',
    ];

    test.each(allowedDomains)('should allow "%s" as domain folder name', (name) => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockReturnValue([{ name, isDirectory: () => true }] as any);

      const result = checkFolderNaming('/packages/core/src');

      expect(result.errors).toHaveLength(0);
    });
  });
});
