// eslint.config.ts
import { includeIgnoreFile } from '@eslint/compat';
import type { Linter } from 'eslint';
import boundaries from 'eslint-plugin-boundaries';
import importXPlugin from 'eslint-plugin-import-x';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import unusedImportsPlugin from 'eslint-plugin-unused-imports';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import tseslint from 'typescript-eslint';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const gitignorePath = path.resolve(__dirname, '.gitignore');

const reactHooksPluginTyped: any = reactHooksPlugin;
const tsconfigRootDir: string = path.resolve(__dirname);
const require = createRequire(import.meta.url);

let jsConfigs: any = {};
try {
  jsConfigs = require('@eslint/js').configs;
} catch {
  jsConfigs = {};
}
const jsParser: Linter.Parser | undefined = jsConfigs.recommended?.languageOptions?.parser;

export const baseConfig = [
  includeIgnoreFile(gitignorePath),
  {
    ignores: [
      '**/.github/**',
      '**/main/tools/scripts/**',
      '**/main/tools/sync/**',
      '**/vite.config.ts',
      '**/vitest.config.*',
      '**/drizzle.config.ts',
      '**/playwright.config.ts',
      '**/eslint.config.ts',
      '**/*.d.ts',
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
    ],
  },

  // 1. BASE JS RECOMMENDED
  jsConfigs.recommended ? { ...jsConfigs.recommended } : {},

  // 2. MONOREPO BOUNDARY ENFORCEMENT (DAG Mirror)
  {
    files: ['**/*.{js,jsx,ts,tsx,cts,mts,cjs,mjs}'],
    plugins: { boundaries },
    settings: {
      'boundaries/root-path': tsconfigRootDir,
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
          project: [path.resolve(tsconfigRootDir, 'tsconfig.json')],
        },
      },
      'boundaries/elements': [
        { type: 'shared', pattern: 'main/shared', mode: 'folder' },
        // Server Packages
        { type: 'db', pattern: 'main/server/db', mode: 'folder' },
        { type: 'media', pattern: 'main/server/media', mode: 'folder' },
        { type: 's-engine', pattern: 'main/server/engine', mode: 'folder' },
        { type: 'websocket', pattern: 'main/server/websocket', mode: 'folder' },
        { type: 'core', pattern: 'main/server/core', mode: 'folder' },
        { type: 'realtime', pattern: 'main/server/realtime', mode: 'folder' },
        // Client Packages
        { type: 'api', pattern: 'main/client/api', mode: 'folder' },
        { type: 'c-engine', pattern: 'main/client/engine', mode: 'folder' },
        { type: 'react', pattern: 'main/client/react', mode: 'folder' },
        { type: 'ui', pattern: 'main/client/ui', mode: 'folder' },
        // Consumers (Apps)
        { type: 'app-server', pattern: 'main/apps/server', mode: 'folder' },
        { type: 'app-web', pattern: 'main/apps/web', mode: 'folder' },
        { type: 'app-desktop', pattern: 'main/apps/desktop', mode: 'folder' },
      ],
    },
    rules: {
      'boundaries/element-types': [
        'error',
        {
          default: 'disallow',
          message:
            '${from.type} is not allowed to import ${to.type}. See DAG in docs/architecture.',
          rules: [
            // Shared is the bedrock
            { from: 'shared', allow: [] },
            // Server DAG Edges
            { from: 'db', allow: ['shared'] },
            { from: 'media', allow: ['shared'] },
            { from: 's-engine', allow: ['shared', 'db'] },
            { from: 'websocket', allow: ['shared', 'db', 's-engine'] },
            { from: 'core', allow: ['shared', 'db', 'media', 's-engine'] },
            { from: 'realtime', allow: ['shared', 'db', 'websocket'] },
            {
              from: 'app-server',
              allow: ['shared', 'core', 'db', 'realtime', 's-engine', 'websocket'],
            },
            // Client DAG Edges
            { from: 'api', allow: ['shared'] },
            { from: 'c-engine', allow: ['shared', 'api'] },
            { from: 'react', allow: ['shared', 'c-engine'] },
            { from: 'ui', allow: ['shared', 'c-engine', 'react'] },
            { from: 'app-web', allow: ['shared', 'api', 'c-engine', 'react', 'ui'] },
            // Desktop Special Case (Client stack + local engine)
            {
              from: 'app-desktop',
              allow: ['shared', 'api', 'c-engine', 'react', 'ui', 's-engine'],
            },
          ],
        },
      ],
      'boundaries/no-unknown': 'error',
    },
  },

  // 3. TYPESCRIPT TYPE-AWARE LOGIC
  ...tseslint.configs.strictTypeChecked.map((config: any) => ({
    ...config,
    files: ['**/*.{ts,tsx,cts,mts}'],
    languageOptions: {
      ...config.languageOptions,
      parserOptions: {
        ...config.languageOptions?.parserOptions,
        tsconfigRootDir,
        project: true,
      },
    },
  })),

  {
    files: ['**/*.{ts,tsx,cts,mts}'],
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      'unused-imports': unusedImportsPlugin as any,
      'import-x': importXPlugin as any,
    },
    rules: {
      // --- LOGIC & PERFORMANCE (The BSLT Core) ---
      'no-sync': 'error', // No blocking the event loop in infra code
      '@typescript-eslint/no-floating-promises': ['error', { ignoreVoid: true }],
      '@typescript-eslint/no-misused-promises': [
        'error',
        { checksVoidReturn: { arguments: false, attributes: false } },
      ],
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-deprecated': 'error',
      'no-console': 'warn',

      // --- VELOCITY OVER STYLE (AI-Friendly) ---
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/naming-convention': 'off', // Handle via Prettier
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'unused-imports/no-unused-imports': 'error',
      'prefer-const': 'error',
      'no-var': 'error',

      // --- IMPORT GOVERNANCE ---
      'import-x/no-duplicates': 'error',
      'import-x/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index', 'type'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
    },
  },

  // 4. REACT & UI LAYER
  {
    files: ['**/*.{tsx,jsx}'],
    plugins: { 'react-hooks': reactHooksPluginTyped },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      // Ensure we use the design system instead of raw HTML
      'no-restricted-syntax': [
        'error',
        {
          selector: 'JSXOpeningElement[name.name="button"]',
          message: 'Use <Button> from @bslt/ui instead of raw <Button>.',
        },
      ],
    },
  },

  // 5. TEST RELAXATION (Fast Loop support)
  {
    files: ['**/__tests__/**/*', '**/*.{spec,test}.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      'no-console': 'off',
      '@typescript-eslint/no-floating-promises': 'error', // Promises still matter in tests!
    },
  },

  // 6. OPERATIONAL OVERRIDES
  {
    linterOptions: {
      noInlineConfig: false, // Allow local bypasses for v1.0.0 speed
      reportUnusedDisableDirectives: true,
    },
  },
] satisfies Linter.Config[];

export default baseConfig;
