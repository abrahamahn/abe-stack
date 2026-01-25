import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import reactHooksPlugin from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

// Type assertion to handle plugin compatibility
const reactHooksPluginTyped: any = reactHooksPlugin;

import type { Linter } from 'eslint';

const tsconfigRootDir: string = path.resolve(path.dirname(fileURLToPath(import.meta.url)));
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
      '**/.claude/**',
      '**/.vscode/**',
      '**/.gemini/**',
      '**/.github/**',
      '**/.pnpm-store/**',
      '**/out/**',
      '**/dist/**',
      '**/build/**',
      '**/.turbo/**',
      '**/coverage/**',
      '**/tooling/scripts/**',
      '**/tooling/lint/**',
      '**/__tests__/e2e/**',
      '**/vite.config.ts',
      '**/vitest.config.js',
      '**/drizzle.config.ts',
      '**/*.js.map',
      '**/*.d.ts',
      '**/*.d.ts.map',
      '**/eslint.config.ts',
    ],
  },
  jsConfigs.recommended ? { ...jsConfigs.recommended } : {},

  // Configuration for ALL TypeScript files with strict type checking
  ...tseslint.configs.strictTypeChecked.map(
    (config): Linter.Config => ({
      ...config,
      files: ['**/*.{ts,tsx,cts,mts}'],
      languageOptions: {
        ...(config.languageOptions ?? {}),
        parserOptions: {
          ...((config.languageOptions?.parserOptions as Record<string, unknown> | undefined) ?? {}),
          tsconfigRootDir,
          project: ['./.config/tsconfig.eslint.json'],
        },
      },
    }),
  ),
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
    files: ['apps/desktop/**/*.{ts,tsx,cts,mts}'],
    languageOptions: {
      parserOptions: {
        project: ['./apps/desktop/tsconfig.json'],
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
    files: ['packages/contracts/**/*.{ts,tsx,cts,mts}'],
    languageOptions: {
      parserOptions: {
        project: ['./packages/core/tsconfig.json'],
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
    files: ['packages/db/**/*.{ts,tsx,cts,mts}'],
    languageOptions: {
      parserOptions: {
        project: ['./packages/db/tsconfig.json'],
        tsconfigRootDir,
      },
    },
  },
  {
    files: ['packages/media/**/*.{ts,tsx,cts,mts}'],
    languageOptions: {
      parserOptions: {
        project: ['./packages/media/tsconfig.json'],
        tsconfigRootDir,
      },
    },
  },
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
    files: ['packages/stores/**/*.{ts,tsx,cts,mts}'],
    languageOptions: {
      parserOptions: {
        project: ['./packages/stores/tsconfig.json'],
        tsconfigRootDir,
      },
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
  {
    // TypeScript-specific rules (only run on TS files with type info)
    files: ['**/*.{ts,tsx,cts,mts}'],
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
          allowString: false,
          allowNumber: false,
          allowNullableObject: false,
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
      'react-hooks': reactHooksPluginTyped,
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
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
    files: ['tooling/**/*.{ts,tsx,cts,mts}'],
    rules: {
      'no-console': 'off',
    },
  },
  {
    // Allow console in logger implementations and console-based dev services
    files: ['packages/core/src/config/*'],
    rules: {
      'no-console': 'off',
    },
  },
  {
    // Test files: Relax rules for mocking and test setup
    files: ['**/__tests__/**/*', '**/*.{spec,test}.{ts,tsx}'],
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
      '@typescript-eslint/strict-boolean-expressions': 'off',

      // KEEP STRICT: You MUST handle promises in tests
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
    },
  },
] satisfies Linter.Config[];
