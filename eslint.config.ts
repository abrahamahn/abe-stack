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

// All shared sub-layer types for external boundary allow rules
const allSharedLayers: string[] = [
  'shared',
  'shared-primitives',
  'shared-system',
  'shared-core',
  'shared-contracts',
  'shared-api',
];

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
        // Shared internal sub-layers (specific patterns first, catch-all last)
        { type: 'shared-primitives', pattern: 'main/shared/src/primitives', mode: 'folder' },
        { type: 'shared-system', pattern: 'main/shared/src/system', mode: 'folder' },
        { type: 'shared-core', pattern: 'main/shared/src/core', mode: 'folder' },
        { type: 'shared-contracts', pattern: 'main/shared/src/contracts', mode: 'folder' },
        { type: 'shared-api', pattern: 'main/shared/src/api', mode: 'folder' },
        // Shared catch-all (index.ts, __tests__, config/, etc.)
        { type: 'shared', pattern: 'main/shared', mode: 'folder' },
        // Server Packages
        { type: 'db', pattern: 'main/server/db', mode: 'folder' },
        { type: 'media', pattern: 'main/server/media', mode: 'folder' },
        { type: 's-system', pattern: 'main/server/system', mode: 'folder' },
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
            // ── Shared Internal DAG (primitives → engine → core → contracts → api) ──
            { from: 'shared-primitives', allow: [] },
            { from: 'shared-system', allow: ['shared-primitives'] },
            { from: 'shared-core', allow: ['shared-primitives', 'shared-system'] },
            {
              from: 'shared-contracts',
              allow: ['shared-primitives', 'shared-system', 'shared-core'],
            },
            {
              from: 'shared-api',
              allow: ['shared-primitives', 'shared-system', 'shared-core', 'shared-contracts'],
            },
            // Shared catch-all (index.ts, config/, __tests__) can reach all internal layers
            {
              from: 'shared',
              allow: [
                'shared-primitives',
                'shared-system',
                'shared-core',
                'shared-contracts',
                'shared-api',
              ],
            },

            // ── Server DAG Edges ──
            { from: 'db', allow: [...allSharedLayers] },
            { from: 'media', allow: [...allSharedLayers] },
            { from: 's-system', allow: [...allSharedLayers, 'db'] },
            { from: 'websocket', allow: [...allSharedLayers, 'db', 's-system'] },
            { from: 'core', allow: [...allSharedLayers, 'db', 'media', 's-system'] },
            { from: 'realtime', allow: [...allSharedLayers, 'db', 'websocket'] },
            {
              from: 'app-server',
              allow: [...allSharedLayers, 'core', 'db', 'realtime', 's-system', 'websocket'],
            },

            // ── Client DAG Edges ──
            { from: 'api', allow: [...allSharedLayers] },
            { from: 'c-engine', allow: [...allSharedLayers, 'api'] },
            { from: 'react', allow: [...allSharedLayers, 'c-engine'] },
            { from: 'ui', allow: [...allSharedLayers, 'c-engine', 'react'] },
            { from: 'app-web', allow: [...allSharedLayers, 'api', 'c-engine', 'react', 'ui'] },
            // Desktop Special Case (Client stack + local engine + shared web app frontend)
            {
              from: 'app-desktop',
              allow: [...allSharedLayers, 'api', 'app-web', 'c-engine', 'react', 'ui', 's-system'],
            },
          ],
        },
      ],
      'boundaries/no-unknown': 'error',
    },
  },

  // 3. TYPESCRIPT TYPE-AWARE LOGIC
  // Test files are intentionally excluded from composite build tsconfigs so they
  // don't generate .d.ts output. Type-aware rules are disabled for test files in
  // section 6 which also sets project: false to skip project lookup for them.
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
      '@typescript-eslint/naming-convention': 'off',
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

  // 5. NO RE-EXPORTS EXCEPT INDEX BARRELS
  {
    files: ['main/shared/src/**/*.ts'],
    ignores: ['**/index.ts', '**/*.test.ts', '**/__tests__/**'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ExportNamedDeclaration[source]',
          message:
            'Re-exports (export { X } from "Y") are only allowed in index.ts barrel files. Import and use the value directly instead.',
        },
      ],
    },
  },

  // 5b. BARREL FILES: SIBLINGS ONLY (no reaching into parent directories)
  {
    files: ['main/shared/src/**/index.ts'],
    ignores: [
      'main/shared/src/index.ts', // Root barrel re-exports from all layers
      'main/shared/src/config/index.ts', // Public entry point — re-exports parsers from ../primitives/helpers
    ],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ExportNamedDeclaration[source.value=/^\\.\\.\\//]',
          message:
            'Barrel exports must only re-export from sibling files (./), not parent directories (../). This prevents cross-module coupling.',
        },
      ],
    },
  },

  // 5c. SERVER/SYSTEM: NO INTERNAL INDEX BARREL IMPORTS
  // Inside a feature folder, nothing imports ./index — the barrel is for external consumers only.
  // This prevents hidden circular dependencies and enforces explicit dependency paths.
  {
    files: ['main/server/system/src/**/*.ts'],
    ignores: ['**/*.test.ts', '**/__tests__/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              // Matches ./index, ../index, ./providers/index, ../../cache/index, etc.
              regex: '^\\.{1,2}(?:\\/[^/]+)*\\/index$',
              message:
                'Do not import from internal index barrels. Import from the concrete module file instead. Barrels are for external consumers only.',
            },
          ],
        },
      ],
    },
  },

  // 6. TEST RELAXATION (Fast Loop support)
  // Test files are excluded from composite build tsconfigs (no .d.ts output needed).
  // Use project: false to skip project lookup — prevents "file not found in any project" errors.
  // disableTypeChecked turns off all type-aware rules (they require project info to run).
  // Non-type-aware rules (import order, unused imports) still apply normally.
  {
    files: ['**/__tests__/**/*', '**/*.{spec,test}.{ts,tsx}'],
    ...tseslint.configs.disableTypeChecked,
    languageOptions: {
      parserOptions: {
        project: false,
      },
    },
    rules: {
      ...tseslint.configs.disableTypeChecked.rules,
      // Non-type-aware rules that are intentionally relaxed in tests:
      '@typescript-eslint/no-explicit-any': 'off', // mock patterns require any
      '@typescript-eslint/no-non-null-assertion': 'off', // common in test assertions
      'no-console': 'off',
      // Raw HTML is acceptable in test render helpers (not shipped to users)
      'no-restricted-syntax': 'off',
    },
  },

  // 7. OPERATIONAL OVERRIDES
  {
    linterOptions: {
      noInlineConfig: false, // Allow local bypasses for v1.0.0 speed
      reportUnusedDisableDirectives: true,
    },
  },
] satisfies Linter.Config[];

export default baseConfig;
