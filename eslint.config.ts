import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { configs as jsConfigs } from '@eslint/js';
import eslintPluginImport from 'eslint-plugin-import';
import tseslint from 'typescript-eslint';

import type { Linter } from 'eslint';

const tsconfigRootDir: string = path.dirname(fileURLToPath(import.meta.url));
const jsParser: Linter.Parser | undefined = jsConfigs.recommended.languageOptions?.parser;

export default [
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
      '**/apps/mobile/index.js',
      '**/apps/mobile/metro.config.js',
      'apps/server/drizzle.config.ts',
      'apps/server/vitest.config.ts',
    ],
  },
  jsConfigs.recommended,
  ...tseslint.configs.strictTypeChecked,
  // Ensure TypeScript-ESLint has an explicit root in monorepos.
  {
    files: ['**/*.{ts,tsx,cts,mts}'],
    languageOptions: {
      parserOptions: {
        tsconfigRootDir,
        project: ['./tsconfig.eslint.json'],
      },
    },
  },
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
    files: ['apps/desktop/electron/**/*.{ts,tsx,cts,mts}', 'apps/desktop/vite.config.ts'],
    languageOptions: {
      parserOptions: {
        project: ['./apps/desktop/tsconfig.json'],
        tsconfigRootDir,
      },
    },
  },
  {
    files: ['apps/server/drizzle.config.ts'],
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
    files: ['apps/web/**/*', 'apps/desktop/**/*', 'apps/mobile/**/*'],
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
          ],
        },
      ],
    },
  },
  // Prevent UI from reaching into DB/infra directly; rely on contracts/API.
  {
    files: ['apps/web/**/*', 'apps/desktop/**/*', 'apps/mobile/**/*'],
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
                '@/server/**',
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
  {
    files: ['eslint.config.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
    },
  },
] satisfies Linter.Config[];
