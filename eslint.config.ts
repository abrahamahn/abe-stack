import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import eslintPluginImport from 'eslint-plugin-import';
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

const config: Linter.Config[] = [
  {
    ignores: [
      '**/node_modules/**',
      '**/.cache/**',
      '**/.next/**',
      '**/out/**',
      '**/dist/**',
      '**/build/**',
      '**/config/**',
      '**/.turbo/**',
      '**/coverage/**',
      '**/babel.config.js',
      '**/frontend/mobile/index.js',
      '**/frontend/mobile/metro.config.js',
      'tools/export-ui-code.js',
      'backend/db/drizzle.config.ts',
      'backend/server/vitest.config.ts',
      'frontend/web/e2e/**',
      'frontend/web/vitest.config.ts',
      'shared/ui/**/__tests__/**',
      'shared/ui/vitest.config.ts',
      'tools/packages/build-theme-css.ts',
      'backend/storage/**/*.js',
      'backend/storage/**/*.d.ts',
    ],
  },
  jsConfigs.recommended ?? {},
  ...tseslint.configs.strictTypeChecked,
  // Ensure TypeScript-ESLint has an explicit root in monorepos.
  {
    files: ['**/*.{ts,tsx,cts,mts}'],
    languageOptions: {
      parserOptions: {
        tsconfigRootDir,
        project: ['./tsconfig.json'],
      },
    },
  },
  {
    files: ['backend/server/**/*.{ts,tsx,cts,mts}'],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.json'],
        tsconfigRootDir,
      },
    },
  },
  {
    files: ['frontend/web/**/*.{ts,tsx,cts,mts}'],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.json'],
        tsconfigRootDir,
      },
    },
  },
  {
    files: ['frontend/mobile/**/*.{ts,tsx,cts,mts,js,jsx}'],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.json'],
        tsconfigRootDir,
      },
    },
  },
  {
    files: ['frontend/web/e2e/**/*', 'frontend/web/vitest.config.ts'],
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
    files: ['shared/ui/**/*.{ts,tsx,cts,mts}'],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.json'],
        tsconfigRootDir,
      },
    },
  },
  {
    files: ['shared/ui/test/**/*.{ts,tsx,cts,mts}'],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.json'],
        tsconfigRootDir,
      },
    },
  },
  {
    files: ['tools/packages/build-theme-css.ts'],
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
    files: ['frontend/desktop/**/*.{ts,tsx,cts,mts}'],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.json'],
        tsconfigRootDir,
      },
    },
  },
  {
    files: ['frontend/desktop/electron/**/*.{ts,tsx,cts,mts}', 'frontend/desktop/vite.config.ts'],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.json'],
        tsconfigRootDir,
      },
    },
  },
  {
    files: ['backend/db/drizzle.config.ts'],
    languageOptions: {
      parserOptions: {
        project: false,
        tsconfigRootDir,
      },
    },
    rules: {
      '@typescript-eslint/await-thenable': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
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
  {
    plugins: {
      import: eslintPluginImport,
    },
    rules: {
      'import/order': [
        'warn',
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
  // Prevent frontend clients from importing server-side code
  {
    files: ['frontend/web/**/*', 'frontend/desktop/**/*', 'frontend/mobile/**/*'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/backend/server/**', '@server/**', '@server/*'],
              message:
                'Frontend code must not import backend/server modules. Add an API layer or shared contract instead.',
            },
          ],
        },
      ],
    },
  },
  // Prevent UI from reaching into DB/infra directly; rely on contracts/API.
  {
    files: ['frontend/web/**/*', 'frontend/desktop/**/*', 'frontend/mobile/**/*'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '**/infrastructure/**',
                '**/database/**',
                'drizzle-orm',
                'postgres',
                'pg',
                '@db/**',
              ],
              message:
                'UI must not import database or backend internals. Use API clients or shared contracts instead.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['backend/server/scripts/**/*.{ts,tsx,cts,mts}', 'tools/**/*.{ts,tsx,cts,mts}'],
    rules: {
      'no-console': 'off',
    },
  },
  {
    files: ['eslint.config.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
    },
  },
  // Test files - allow non-null assertions and console
  {
    files: ['**/__tests__/**/*', '**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
      'no-console': 'off',
    },
  },
  // CLI/validation scripts - allow console for user feedback
  {
    files: ['shared/contracts/env.ts'],
    rules: {
      'no-console': 'off',
    },
  },
];

export default config;
