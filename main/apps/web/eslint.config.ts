// main/apps/web/eslint.config.ts
import type { Linter } from 'eslint';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import { baseConfig } from '../../../eslint.config.ts';

export default [
  ...baseConfig,
  {
    // E2E files use Playwright and have their own tsconfig — exclude from linting
    ignores: ['e2e/**', 'public/sw.js'],
  },
  {
    files: ['**/*.{tsx,jsx,ts,tsx}'],
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...reactHooksPlugin.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off', // Not needed for React 17+
      'react/prop-types': 'off', // We use TypeScript
    },
  },
  // Test files: relax no-restricted-syntax so mock components can use raw HTML elements
  {
    files: ['**/__tests__/**/*', '**/*.{spec,test}.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': 'off',
    },
  },
] satisfies Linter.Config[];
