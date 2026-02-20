// main/apps/desktop/eslint.config.ts
import type { Linter } from 'eslint';
import { baseConfig } from '../../../eslint.config.ts';

export default [
  ...baseConfig,
  // Electron main-process files run in Node — console is the standard logger
  {
    files: ['src/electron/**/*.ts'],
    rules: {
      'no-console': 'off',
    },
  },
] satisfies Linter.Config[];
