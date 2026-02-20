// main/client/ui/eslint.config.ts
import type { Linter } from 'eslint';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import { baseConfig } from '../../../eslint.config.ts';

export default [
  ...baseConfig,
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
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react/display-name': 'off', // UI library components often use forwardRef
    },
  },
  // Test files in the UI library legitimately use raw <button> elements to verify
  // focus management, keyboard interactions, and ARIA semantics of composed components.
  {
    files: ['**/*.{spec,test}.{ts,tsx}', '**/__tests__/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': 'off',
    },
  },
] satisfies Linter.Config[];
