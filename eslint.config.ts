import { includeIgnoreFile } from '@eslint/compat';
import type { Linter } from 'eslint';
import boundaries from 'eslint-plugin-boundaries';
import importXPlugin from 'eslint-plugin-import-x';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import unusedImportsPlugin from 'eslint-plugin-unused-imports';
import globals from 'globals';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import tseslint from 'typescript-eslint';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const gitignorePath = path.resolve(__dirname, '.gitignore');

// Type assertion to handle plugin compatibility
const reactHooksPluginTyped: any = reactHooksPlugin;

const tsconfigRootDir: string = path.resolve(__dirname);
const require = createRequire(import.meta.url);

let jsConfigs: { recommended?: { languageOptions?: { parser?: Linter.Parser } } } = {};
try {
  jsConfigs = require('@eslint/js').configs;
} catch {
  jsConfigs = {};
}
const jsParser: Linter.Parser | undefined = jsConfigs.recommended?.languageOptions?.parser;

export default [
  includeIgnoreFile(gitignorePath),
  {
    ignores: [
      '**/.github/**',
      '**/src/tools/scripts/**',
      '**/src/tools/sync/**',
      '**/vite.config.ts',
      '**/vitest.config.js',
      '**/vitest.config.ts',
      '**/drizzle.config.ts',
      '**/playwright.config.ts',
      '**/eslint.config.ts',
      '**/*.d.ts',
      '**/*.d.ts.map',
      '**/*.js.map',
    ],
  },
  jsConfigs.recommended ? { ...jsConfigs.recommended } : {},
  {
    files: ['**/*.{js,jsx,ts,tsx,cts,mts,cjs,mjs}'],
    plugins: {
      boundaries,
    },
    settings: {
      'boundaries/root-path': tsconfigRootDir,
      'import/resolver': {
        typescript: {
          project: [
            './tsconfig.json',
            './src/apps/desktop/tsconfig.json',
            './src/apps/desktop/src/electron/tsconfig.json',
            './src/apps/server/tsconfig.json',
            './src/apps/web/tsconfig.json',
            './src/client/api/tsconfig.json',
            './src/client/react/tsconfig.json',
            './src/client/ui/tsconfig.json',
            './src/server/engine/tsconfig.json',
            './src/shared/tsconfig.json',
            './src/server/db/tsconfig.json',
            './src/server/core/tsconfig.json',
            './src/client/engine/tsconfig.json',
            './src/server/media/tsconfig.json',
            './src/server/realtime/tsconfig.json',
            './src/server/websocket/tsconfig.json',
          ],
          alwaysTryTypes: true,
        },
      },
      'boundaries/ignore': [
        '**/node_modules/**',
        '**/.git/**',
        '**/.cache/**',
        '**/.tmp/**',
        '**/.turbo/**',
        '**/.next/**',
        '**/dist/**',
        '**/build/**',
        '**/coverage/**',
        '**/__tests__/**',
        '**/*.test.*',
        '**/*.spec.*',
        '**/*.d.ts',
        '**/docs/**',
        '**/src/tools/**',
        '**/ops/**',
        'config/**',
        '**/.github/**',
      ],
      'boundaries/elements': [
        { type: 'app', pattern: 'src/apps/*', mode: 'folder' },
        { type: 'module', pattern: 'src/server/core', mode: 'folder' },
        { type: 'engine', pattern: 'src/server/engine', mode: 'folder' },
        { type: 'media', pattern: 'src/server/media', mode: 'folder' },
        { type: 'premium', pattern: 'src/server/websocket', mode: 'folder' },
        { type: 'premium', pattern: 'src/server/realtime', mode: 'folder' },
        { type: 'shared', pattern: 'src/shared', mode: 'folder' },
        { type: 'db', pattern: 'src/server/db', mode: 'folder' },
        { type: 'client', pattern: 'src/client/*', mode: 'folder' },
      ],
    },
    rules: {
      'boundaries/element-types': [
        'error',
        {
          default: 'disallow',
          message: '${from.type} is not allowed to import ${to.type}',
          rules: [
            {
              from: 'app',
              allow: ['app', 'module', 'engine', 'media', 'premium', 'shared', 'db', 'client'],
            },
            {
              from: 'module',
              allow: ['module', 'engine', 'media', 'premium', 'shared', 'db'],
            },
            {
              from: 'engine',
              allow: [['engine', { relationship: 'internal' }], 'shared', 'db'],
            },
            {
              from: 'media',
              allow: [['media', { relationship: 'internal' }], 'shared'],
            },
            {
              from: 'db',
              allow: [['db', { relationship: 'internal' }], 'shared'],
            },
            {
              from: 'premium',
              allow: [['premium', { relationship: 'internal' }], 'engine', 'shared', 'client'],
            },
            {
              from: 'client',
              allow: ['client', 'premium', 'shared'],
            },
            {
              from: 'shared',
              allow: [['shared', { relationship: 'internal' }]],
            },
          ],
        },
      ],
      'boundaries/no-unknown': 'error',
      'boundaries/no-unknown-files': 'error',
    },
  },

  // Configuration for ALL TypeScript files with strict type checking
  ...tseslint.configs.strictTypeChecked.map(
    (config: any): Linter.Config => ({
      ...config,
      files: ['**/*.{ts,tsx,cts,mts}'],
      plugins: {
        ...(config.plugins ?? {}),
        '@typescript-eslint': tseslint.plugin,
      },
      languageOptions: {
        ...(config.languageOptions ?? {}),
        parserOptions: {
          ...((config.languageOptions?.parserOptions as Record<string, unknown> | undefined) ?? {}),
          tsconfigRootDir,
          project: ['./tsconfig.json'],
          noWarnOnMultipleProjects: true,
        },
      },
    }),
  ),
  {
    // This file lives outside TS project references; lint with default project service.
    files: ['config/playwright.config.ts', '**/config/playwright.config.ts'],
    languageOptions: {
      parserOptions: {
        tsconfigRootDir,
        project: false,
        projectService: {
          allowDefaultProject: ['config/playwright.config.ts', '**/config/playwright.config.ts'],
        },
      },
    },
  },
  {
    files: ['src/apps/server/**/*.{ts,tsx,cts,mts}'],
    languageOptions: {
      parserOptions: {
        project: ['./src/apps/server/tsconfig.json'],
        tsconfigRootDir,
      },
    },
  },
  {
    files: ['src/apps/desktop/**/*.{ts,tsx,cts,mts}'],
    languageOptions: {
      parserOptions: {
        project: [
          './src/apps/desktop/tsconfig.json',
          './src/apps/desktop/src/electron/tsconfig.json',
        ],
        tsconfigRootDir,
      },
    },
  },
  {
    files: ['src/apps/desktop/src/electron/**/*.{ts,tsx,cts,mts}'],
    rules: {
      'no-console': 'off',
    },
  },
  {
    files: ['src/apps/web/**/*.{ts,tsx,cts,mts}'],
    languageOptions: {
      parserOptions: {
        project: [
          './src/apps/web/tsconfig.json',
          './src/client/api/tsconfig.json',
          './src/shared/tsconfig.json',
        ],
        tsconfigRootDir,
      },
    },
  },
  {
    files: ['src/shared/**/*.{ts,tsx,cts,mts}'],
    languageOptions: {
      parserOptions: {
        project: ['./src/shared/tsconfig.lint.json'],
        tsconfigRootDir,
      },
    },
  },

  {
    files: ['src/client/ui/**/*.{ts,tsx,cts,mts}'],
    languageOptions: {
      parserOptions: {
        project: ['./src/client/ui/tsconfig.json'],
        tsconfigRootDir,
      },
    },
  },
  {
    files: ['src/client/api/**/*.{ts,tsx,cts,mts}'],
    languageOptions: {
      parserOptions: {
        project: ['./src/client/api/tsconfig.json'],
        tsconfigRootDir,
      },
    },
  },
  {
    files: ['src/server/media/**/*.{ts,tsx,cts,mts}'],
    languageOptions: {
      parserOptions: {
        project: ['./src/server/media/tsconfig.json'],
        tsconfigRootDir,
      },
    },
  },
  {
    files: ['src/client/engine/**/*.{ts,tsx,cts,mts}', 'src/client/react/**/*.{ts,tsx,cts,mts}'],
    languageOptions: {
      parserOptions: {
        project: ['./src/client/engine/tsconfig.json', './src/client/react/tsconfig.json'],
        tsconfigRootDir,
      },
    },
  },
  {
    files: ['src/server/engine/src/**/*.{ts,tsx,cts,mts}'],
    languageOptions: {
      parserOptions: {
        project: ['./src/server/engine/tsconfig.json'],
        tsconfigRootDir,
      },
    },
  },
  {
    files: ['src/server/db/**/*.{ts,tsx,cts,mts}'],
    languageOptions: {
      parserOptions: {
        project: ['./src/server/db/tsconfig.lint.json'],
        tsconfigRootDir,
      },
    },
  },
  {
    files: ['src/server/core/src/**/*.{ts,tsx,cts,mts}'],
    languageOptions: {
      parserOptions: {
        project: ['./src/server/core/tsconfig.json', './src/shared/tsconfig.json'],
        tsconfigRootDir,
      },
    },
  },
  {
    files: ['src/server/websocket/**/*.{ts,tsx,cts,mts}'],
    languageOptions: {
      parserOptions: {
        project: ['./src/server/websocket/tsconfig.json'],
        tsconfigRootDir,
      },
    },
  },
  {
    files: ['src/server/realtime/**/*.{ts,tsx,cts,mts}'],
    languageOptions: {
      parserOptions: {
        project: ['./src/server/realtime/tsconfig.json'],
        tsconfigRootDir,
      },
    },
  },
  {
    // TypeScript-specific rules (only run on TS files with type info)
    files: ['**/*.{ts,tsx,cts,mts}'],
    plugins: {
      '@typescript-eslint': tseslint.plugin,
    },
    rules: {
      // Variable and function declarations
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/explicit-function-return-type': 'error',
      '@typescript-eslint/explicit-module-boundary-types': 'error',

      // Type safety - no escape hatches
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      '@typescript-eslint/no-unsafe-argument': 'error',

      // Type assertions and narrowing
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',
      '@typescript-eslint/no-unnecessary-condition': 'error',

      // Import/export consistency
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', disallowTypeAnnotations: false },
      ],
      '@typescript-eslint/consistent-type-exports': [
        'error',
        { fixMixedExportsWithInlineTypeSpecifier: true },
      ],

      // Promise handling
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',

      // Better type inference
      '@typescript-eslint/prefer-nullish-coalescing': 'error',
      '@typescript-eslint/prefer-optional-chain': 'error',
      '@typescript-eslint/strict-boolean-expressions': [
        'error',
        {
          allowString: false, // Force explicit null checks
          allowNumber: false, // Keeps "if (count)" as error to prevent 0-value bugs
          allowNullableObject: false, // Force explicit null checks
        },
      ],

      // Deprecation check
      '@typescript-eslint/no-deprecated': 'error',

      // Exhaustiveness & immutability
      '@typescript-eslint/switch-exhaustiveness-check': [
        'error',
        {
          allowDefaultCaseForExhaustiveSwitch: true,
          considerDefaultExhaustiveForUnions: true,
        },
      ],
      '@typescript-eslint/prefer-readonly': 'error',
      '@typescript-eslint/no-import-type-side-effects': 'error',

      // 6. Naming Conventions (Big Tech Standard)
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'default',
          format: ['camelCase'],
          leadingUnderscore: 'allow',
          trailingUnderscore: 'allow',
        },
        {
          selector: 'variable',
          format: ['camelCase', 'UPPER_CASE', 'PascalCase'],
          leadingUnderscore: 'allow',
          trailingUnderscore: 'allow',
        },
        {
          selector: 'typeLike',
          format: ['PascalCase'],
        },
        {
          selector: 'enumMember',
          format: ['UPPER_CASE', 'PascalCase'],
        },
        {
          selector: 'parameter',
          format: ['camelCase'],
          leadingUnderscore: 'allow',
        },

        {
          // Allow destructured properties to match their source
          selector: 'variable',
          modifiers: ['destructured'],
          format: null,
        },
        {
          // Allow numeric strings (e.g., HTTP status codes '200', '404')
          selector: ['objectLiteralProperty', 'typeProperty'],
          format: null,
          filter: {
            regex: '^[0-9]+$',
            match: true,
          },
        },
        {
          // Allow snake_case, kebab-case for external APIs (OAuth, etc.)
          selector: ['objectLiteralProperty', 'typeProperty'],
          format: null,
          filter: {
            regex: '[_-]',
            match: true,
          },
        },
        {
          // Standard camelCase/PascalCase for all other properties
          selector: ['objectLiteralProperty', 'typeProperty'],
          format: ['camelCase', 'PascalCase'],
          leadingUnderscore: 'allow',
        },
      ],

      // Template expressions
      '@typescript-eslint/restrict-template-expressions': [
        'error',
        {
          allowNumber: true,
          allowBoolean: false,
          allowAny: false,
          allowNullish: false,
        },
      ],
    },
  },
  {
    // Modern Import Handling & Cyclic Dependency Detection
    files: ['**/*.{ts,tsx,cts,mts}'],
    plugins: {
      'import-x': importXPlugin as any,
      'unused-imports': unusedImportsPlugin as any,
    },
    rules: {
      'import-x/no-self-import': 'error',
      'import-x/no-duplicates': 'error',
      'import-x/order': [
        'error',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            'parent',
            'sibling',
            'index',
            'object',
            'type',
          ],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
      'unused-imports/no-unused-imports': 'error',
    },
  },
  {
    // JS/CJS/MJS config files: avoid TS type-aware rules here
    files: ['**/*.{js,jsx,cjs,mjs}'],
    languageOptions: {
      parser: jsParser,
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
    rules: {
      '@typescript-eslint/await-thenable': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/consistent-type-imports': 'off',
    },
  },
  {
    // General JS/TS rules for all files
    rules: {
      'no-console': 'error',
      'prefer-const': 'error',
      'no-var': 'error',
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@abe-stack/*/src/**'],
              message:
                'Always import from the package entry point (e.g., "@abe-stack/shared"), never from "src" internals.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['**/*.{js,jsx,ts,tsx,cts,mts,cjs,mjs}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '**/src/apps/*/src/**',
                '**/src/client/*/src/**',
                '**/src/server/engine/src/**',
                '**/src/server/core/src/**',
                '**/src/server/websocket/src/**',
              ],
              message: 'Import from package entrypoints only (no /src deep imports).',
            },
            {
              group: ['@abe-stack/packages/server-engine/*'],
              message: 'Use @abe-stack/server-engine entrypoint only.',
            },
          ],
        },
      ],
    },
  },
  // React hooks rules - catches missing deps and rules of hooks violations
  {
    files: ['**/*.{tsx,jsx}'],
    plugins: {
      'react-hooks': reactHooksPluginTyped,
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
    },
  },
  // Naming Conventions for React components (PascalCase for functions)
  {
    files: ['**/*.{tsx,jsx}'],
    rules: {
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'function',
          format: ['camelCase', 'PascalCase'], // Allow both camelCase and PascalCase for functions in React components
          filter: {
            // Function name starts with 'use' followed by uppercase, or is 'Fragment', etc., or starts with an uppercase letter
            regex:
              '^(use[A-Z]|Fragment|StrictMode|Suspense|Profiler|ConcurrentMode|Lazy|memo|forwardRef|[A-Z])',
            match: true,
          },
        },
        // It's important to include other naming conventions here if they are meant to apply to TSX/JSX files
        // and you've overridden the global naming-convention. Otherwise, they might be lost.
        // For simplicity, let's just assume the default applies to others unless specified.
        // But for a full solution, one might merge with the general naming-convention rules.
      ],
    },
  },
  // Prevent frontend clients from importing server-side code or DB internals
  {
    files: ['src/apps/web/**/*', 'src/apps/desktop/**/*'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@abe-stack/api',
              importNames: ['createApiClient'],
              message:
                'Do not create API clients manually in apps. Use `getApiClient()` or `useApi()` instead.',
            },
            {
              name: '@abe-stack/client-engine',
              importNames: ['createApiClient'],
              message:
                'Do not create API clients manually in apps. Use `getApiClient()` or `useApi()` instead.',
            },
          ],
          patterns: [
            {
              group: ['**/src/apps/server/**', '@/server/**', '@abe-stack/server', '@server/*'],
              message:
                'Frontend code must not import backend/server modules. Add an API layer or shared contract instead.',
            },
            {
              group: [
                '**/infrastructure/**',
                '**/database/**',
                '@abe-stack/server-engine',
                'postgres',
                'pg',
              ],
              message:
                'UI must not import database or backend internals. Use API clients or shared contracts instead.',
            },
            {
              group: [
                '**/src/apps/*/src/**',
                '**/src/client/*/src/**',
                '**/src/server/engine/src/**',
                '**/src/server/core/src/**',
                '**/src/server/websocket/src/**',
              ],
              message: 'Import from package entrypoints only (no /src deep imports).',
            },
            {
              group: ['@abe-stack/packages/server-engine/*'],
              message: 'Use @abe-stack/server-engine entrypoint only.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/tools/**/*.{ts,tsx,cts,mts}'],
    rules: {
      'no-console': 'off',
    },
  },
  {
    // Allow console in logger implementations and console-based dev services
    files: ['src/server/core/src/config/*', 'src/apps/desktop/src/electron/**/*'],
    rules: {
      'no-console': 'off',
    },
  },
  {
    // Shared is a leaf package - disable boundaries rules for internal relative imports
    files: ['src/shared/src/**/*.{ts,tsx,cts,mts}'],
    rules: {
      'boundaries/no-unknown': 'off',
      'boundaries/element-types': 'off',
      'no-restricted-imports': 'off',
    },
  },

  {
    // Test files: Relax rules for mocking and test setup
    files: ['**/__tests__/**/*', '**/*.{spec,test}.{ts,tsx}'],
    plugins: {
      '@typescript-eslint': tseslint.plugin,
    },
    rules: {
      // Allow 'any' because mocking deep objects is hard
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',

      // Allow '!' because we control the test state
      '@typescript-eslint/no-non-null-assertion': 'off',

      // Don't require return types on test functions (it's overkill)
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',

      // Relax other test-specific strictness
      '@typescript-eslint/no-unnecessary-condition': 'off',
      // Allow unbound methods (common with vi.fn() mocks)
      '@typescript-eslint/unbound-method': 'off',
      // Allow throwing non-Error values (testing error handling)
      '@typescript-eslint/only-throw-error': 'off',

      // KEEP STRICT: You MUST handle promises in tests
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
    },
  },
] satisfies Linter.Config[];
