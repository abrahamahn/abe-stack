import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

import type { Linter } from 'eslint';

const tsconfigRootDir: string = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
let jsConfigs: { recommended?: { languageOptions?: { parser?: Linter.Parser } } } = {};
try {
  jsConfigs = require('@eslint/js').configs;
} catch {
  jsConfigs = {};
}
const jsParser: Linter.Parser | undefined = jsConfigs.recommended?.languageOptions?.parser;

export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/.cache/**',
      '**/.pnpm-store/**',
      '**/.next/**',
      '**/out/**',
      '**/dist/**',
      '**/build/**',
      '**/config/**',
      '**/.turbo/**',
      '**/coverage/**',
      '**/babel.config.js',
      'tools/export-ui-code.js',
      'apps/server/vitest.config.ts',
      'apps/web/src/test/e2e/**',
      'apps/web/vite.config.ts',
      'apps/web/vitest.config.ts',
      '**/vitest.config.ts',
      '**/vitest.config.js',
      '**/vitest.stryker.config.ts',
      'tools/sync/sync-css-theme.ts',
      'config/drizzle.config.ts',
      'apps/desktop/src/**/*.js',
      'apps/desktop/src/**/*.js.map',
      '**/*.d.ts',
      '**/*.d.ts.map',
      'packages/db/src/benchmark/**',
    ],
  },
  jsConfigs.recommended ?? {},

  // Configuration for ALL TypeScript files with strict type checking
  ...tseslint.configs.strictTypeChecked.map((config) => ({
    ...config,
    files: ['**/*.{ts,tsx,cts,mts}'],
    languageOptions: {
      ...config.languageOptions,
      parserOptions: {
        ...(config.languageOptions?.parserOptions as Record<string, unknown> | undefined),
        tsconfigRootDir,
        project: ['./config/ts/tsconfig.eslint.json'],
      },
    },
  })),
  {
    files: ['apps/server/**/*.{ts,tsx,cts,mts}'],
    languageOptions: {
      parserOptions: {
        project: ['./apps/server/tsconfig.json'],
        tsconfigRootDir,
      },
    },
  },
  {
    files: ['apps/web/**/*.{ts,tsx,cts,mts}'],
    languageOptions: {
      parserOptions: {
        project: ['./apps/web/tsconfig.json'],
        tsconfigRootDir,
      },
    },
  },
  {
    files: ['apps/web/src/test/e2e/**/*', 'apps/web/vitest.config.ts'],
    languageOptions: {
      parserOptions: {
        project: null,
      },
    },
    rules: {
      // Allow running lint without a dedicated TS project for Vitest and e2e specs
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
    },
  },
  {
    files: ['packages/ui/**/*.{ts,tsx,cts,mts}'],
    languageOptions: {
      parserOptions: {
        project: ['./packages/ui/tsconfig.json'],
        tsconfigRootDir,
      },
    },
  },
  // Package configurations - use main tsconfig which includes all src files
  {
    files: ['packages/sdk/**/*.{ts,tsx,cts,mts}'],
    languageOptions: {
      parserOptions: {
        project: ['./packages/sdk/tsconfig.json'],
        tsconfigRootDir,
      },
    },
  },
  {
    files: ['packages/core/**/*.{ts,tsx,cts,mts}'],
    languageOptions: {
      parserOptions: {
        project: ['./packages/core/tsconfig.json'],
        tsconfigRootDir,
      },
    },
  },
  {
    files: ['tools/sync/sync-css-theme.ts'],
    languageOptions: {
      parserOptions: {
        project: null,
      },
    },
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/await-thenable': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
    },
  },
  {
    files: ['apps/desktop/**/*.{ts,tsx,cts,mts}'],
    ignores: ['apps/desktop/src/electron/**/*'],
    languageOptions: {
      parserOptions: {
        project: ['./apps/desktop/tsconfig.json'],
        tsconfigRootDir,
      },
    },
  },
  {
    files: ['apps/desktop/src/electron/**/*.{ts,cts,mts}'],
    languageOptions: {
      parserOptions: {
        project: ['./apps/desktop/src/electron/tsconfig.json'],
        tsconfigRootDir,
      },
    },
  },
  {
    // TypeScript-specific rules (only run on TS files with type info)
    files: ['**/*.{ts,tsx,cts,mts}'],
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/explicit-function-return-type': 'error',
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', disallowTypeAnnotations: false },
      ],
      '@typescript-eslint/no-floating-promises': 'error',
    },
  },
  {
    // JS/CJS/MJS config files: avoid TS type-aware rules here
    files: ['**/*.{js,jsx,cjs,mjs}'],
    languageOptions: {
      parser: jsParser,
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
    },
  },
  // React hooks rules - catches missing deps and rules of hooks violations
  {
    files: ['**/*.{tsx,jsx}'],
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
  {
    files: ['tools/setup.ts'],
    rules: {
      'no-console': 'off',
      'no-empty': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/restrict-template-expressions': 'off',
    },
  },
  // Prevent frontend clients from importing server-side code or DB internals
  {
    files: ['apps/web/**/*', 'apps/desktop/**/*'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/apps/server/**', '@/server/**', '@abe-stack/server', '@server/*'],
              message:
                'Frontend code must not import backend/server modules. Add an API layer or shared contract instead.',
            },
            {
              group: ['**/infrastructure/**', '**/database/**', '@abe-stack/db', 'postgres', 'pg'],
              message:
                'UI must not import database or backend internals. Use API clients or shared contracts instead.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['apps/server/src/scripts/**/*.{ts,tsx,cts,mts}', 'tools/**/*.{ts,tsx,cts,mts}'],
    rules: {
      'no-console': 'off',
    },
  },
  {
    // Allow console in logger implementations and console-based dev services
    files: [
      '**/logger/console.ts',
      '**/consoleEmailService.ts',
    ],
    rules: {
      'no-console': 'off',
    },
  },
  {
    // QueryCache uses single type parameters for API ergonomics (React Query-like pattern)
    files: ['**/query/QueryCache.ts'],
    rules: {
      '@typescript-eslint/no-unnecessary-type-parameters': 'off',
    },
  },
  {
    // db/utils.ts uses single type parameters for API ergonomics
    files: ['packages/db/src/utils.ts'],
    rules: {
      '@typescript-eslint/no-unnecessary-type-parameters': 'off',
    },
  },
  {
    // db/client.ts passes query values to postgres driver which expects any[]
    files: ['packages/db/src/client.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-argument': 'off',
    },
  },
  {
    // router context uses non-null assertion for React context pattern
    files: ['packages/ui/src/router/context.tsx'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
  {
    // seed script template expressions are safe for logging
    files: ['apps/server/src/scripts/seed.ts'],
    rules: {
      '@typescript-eslint/restrict-template-expressions': 'off',
    },
  },
  {
    // sql-provider.ts needs type workaround for Drizzle ORM v0.35+ constraints
    files: ['**/search/sql-provider.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/restrict-template-expressions': 'off',
      '@typescript-eslint/no-unnecessary-condition': 'off',
      '@typescript-eslint/no-unnecessary-type-conversion': 'off',
    },
  },
  {
    // writeService.ts deals with dynamic record types
    files: ['**/jobs/write/writeService.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/restrict-template-expressions': 'off',
      '@typescript-eslint/no-unnecessary-type-conversion': 'off',
      '@typescript-eslint/no-unnecessary-condition': 'off',
      '@typescript-eslint/no-unnecessary-type-assertion': 'off',
    },
  },
  {
    // realtime/service.ts deals with dynamic record types
    files: ['**/realtime/service.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/restrict-template-expressions': 'off',
    },
  },
  {
    // search-factory.ts deals with dynamic column types
    files: ['**/search/search-factory.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unnecessary-type-assertion': 'off',
    },
  },
  {
    files: ['eslint.config.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
    },
  },
  {
    files: [
      '**/__tests__/**/*.{ts,tsx,cts,mts}',
      '**/*.test.{ts,tsx,cts,mts}',
      'packages/tests/src/**/*.{ts,tsx,cts,mts}',
    ],
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-confusing-void-expression': 'off',
      '@typescript-eslint/no-deprecated': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-redundant-type-constituents': 'off',
      '@typescript-eslint/no-unnecessary-condition': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/restrict-plus-operands': 'off',
      '@typescript-eslint/restrict-template-expressions': 'off',
      '@typescript-eslint/unbound-method': 'off',
    },
  },
  {
    files: [
      'packages/core/src/**/__tests__/**/*.{ts,tsx,cts,mts}',
      'packages/core/src/**/*.test.{ts,tsx,cts,mts}',
      'packages/sdk/src/**/__tests__/**/*.{ts,tsx,cts,mts}',
      'packages/sdk/src/**/*.test.{ts,tsx,cts,mts}',
      'packages/ui/src/**/__tests__/**/*.{ts,tsx,cts,mts}',
      'packages/ui/src/**/*.test.{ts,tsx,cts,mts}',
    ],
    languageOptions: {
      parserOptions: {
        project: ['./config/ts/tsconfig.eslint.json'],
        tsconfigRootDir,
      },
    },
  },
  {
    files: ['**/sw.js', '**/service-worker.js'],
    languageOptions: {
      globals: {
        caches: 'readonly',
        clients: 'readonly',
        console: 'readonly',
        fetch: 'readonly',
        self: 'readonly',
        URL: 'readonly',
        Response: 'readonly',
        Request: 'readonly',
        Headers: 'readonly',
        Notification: 'readonly',
        indexedDB: 'readonly',
        IDBFactory: 'readonly',
        IDBDatabase: 'readonly',
        IDBObjectStore: 'readonly',
        IDBIndex: 'readonly',
        IDBKeyRange: 'readonly',
        IDBCursor: 'readonly',
        IDBTransaction: 'readonly',
        IDBRequest: 'readonly',
      },
    },
    rules: {
      'no-console': 'off',
      'no-unused-vars': ['error', { varsIgnorePattern: '^_', argsIgnorePattern: '^_' }],
    },
  },
] satisfies Linter.Config[];
