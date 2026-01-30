
import { includeIgnoreFile } from '@eslint/compat';
import type { Linter } from 'eslint';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
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
      '**/tooling/scripts/**',
      '**/tooling/lint/**',
      '**/__tests__/**',
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/*.spec.ts',
      '**/*.spec.tsx',
      '**/vite.config.ts',
      '**/vitest.config.js',
      '**/vitest.config.ts',
      '**/drizzle.config.ts',
      '**/eslint.config.ts',
    ],
  },
  jsConfigs.recommended ? { ...jsConfigs.recommended } : {},

  // Configuration for ALL TypeScript files with strict type checking
  ...tseslint.configs.strictTypeChecked.map(
    (config: any): Linter.Config => ({
      ...config,
      files: ['**/*.{ts,tsx,cts,mts}'],
      languageOptions: {
        ...(config.languageOptions ?? {}),
        parserOptions: {
          ...((config.languageOptions?.parserOptions as Record<string, unknown> | undefined) ?? {}),
          tsconfigRootDir,
          project: ['./tsconfig.json'],
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
        project: ['./apps/desktop/tsconfig.json', './apps/desktop/src/electron/tsconfig.json'],
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
        project: ['./packages/contracts/tsconfig.json'],
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
    files: ['packages/cache/**/*.{ts,tsx,cts,mts}'],
    languageOptions: {
      parserOptions: {
        project: ['./packages/cache/tsconfig.json'],
        tsconfigRootDir,
      },
    },
  },
  {
    files: ['packages/billing/**/*.{ts,tsx,cts,mts}'],
    languageOptions: {
      parserOptions: {
        project: ['./packages/billing/tsconfig.json'],
        tsconfigRootDir,
      },
    },
  },
  {
    files: ['packages/storage/**/*.{ts,tsx,cts,mts}'],
    languageOptions: {
      parserOptions: {
        project: ['./packages/storage/tsconfig.json'],
        tsconfigRootDir,
      },
    },
  },
  {
    files: ['packages/jobs/**/*.{ts,tsx,cts,mts}'],
    languageOptions: {
      parserOptions: {
        project: ['./packages/jobs/tsconfig.json'],
        tsconfigRootDir,
      },
    },
  },
  {
    files: ['packages/security/**/*.{ts,tsx,cts,mts}'],
    languageOptions: {
      parserOptions: {
        project: ['./packages/security/tsconfig.json'],
        tsconfigRootDir,
      },
    },
  },
  {
    files: ['packages/http/**/*.{ts,tsx,cts,mts}'],
    languageOptions: {
      parserOptions: {
        project: ['./packages/http/tsconfig.json'],
        tsconfigRootDir,
      },
    },
  },
  {
    files: ['packages/email/**/*.{ts,tsx,cts,mts}'],
    languageOptions: {
      parserOptions: {
        project: ['./packages/email/tsconfig.json'],
        tsconfigRootDir,
      },
    },
  },
  {
    files: ['packages/notifications/**/*.{ts,tsx,cts,mts}'],
    languageOptions: {
      parserOptions: {
        project: ['./packages/notifications/tsconfig.json'],
        tsconfigRootDir,
      },
    },
  },
  {
    files: ['packages/auth/**/*.{ts,tsx,cts,mts}'],
    languageOptions: {
      parserOptions: {
        project: ['./packages/auth/tsconfig.json'],
        tsconfigRootDir,
      },
    },
  },
  {
    files: ['packages/users/**/*.{ts,tsx,cts,mts}'],
    languageOptions: {
      parserOptions: {
        project: ['./packages/users/tsconfig.json'],
        tsconfigRootDir,
      },
    },
  },
  {
    files: ['packages/realtime/**/*.{ts,tsx,cts,mts}'],
    languageOptions: {
      parserOptions: {
        project: ['./packages/realtime/tsconfig.json'],
        tsconfigRootDir,
      },
    },
  },
  {
    files: ['packages/admin/**/*.{ts,tsx,cts,mts}'],
    languageOptions: {
      parserOptions: {
        project: ['./packages/admin/tsconfig.json'],
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
          allowString: false, // Force explicit null checks
          allowNumber: false, // Keeps "if (count)" as error to prevent 0-value bugs
          allowNullableObject: false, // Force explicit null checks
        },
      ],

      // Deprecation check
      '@typescript-eslint/no-deprecated': 'error',

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
      'import-x': require('eslint-plugin-import-x'),
      'unused-imports': require('eslint-plugin-unused-imports'),
    },
    rules: {
      // 7. Cyclic Dependency Detection (CPU & Memory Intensive)
      // We limit maxDepth to 2 for performance in local dev. Bumping this to 'Infinity'
      // is only recommended for CI environments with large heap limits.
      'import-x/no-cycle': ['error', { maxDepth: 2, ignoreExternal: true }],
      'import-x/no-self-import': 'error',
      'import-x/no-duplicates': 'error',
      'import-x/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index', 'object', 'type'],
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


      // KEEP STRICT: You MUST handle promises in tests
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
    },
  },
] satisfies Linter.Config[];
