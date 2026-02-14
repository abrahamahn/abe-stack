// main/server/db/vitest.config.ts
/// <reference types="vitest" />
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
    alias: [
      {
        find: /^@abe-stack\/shared\/(.*)$/,
        replacement: path.resolve(__dirname, '../../shared/src/$1'),
      },
      {
        find: '@abe-stack/shared',
        replacement: path.resolve(__dirname, '../../shared/src/index.ts'),
      },
      {
        find: '@abe-stack/db',
        replacement: path.resolve(__dirname, 'src/index.ts'),
      },
    ],
  },
  test: {
    globals: true,
    exclude: ['**/node_modules/**', '**/dist/**', '**/backup/**', '**/*.spec.ts'],
    testTimeout: 60000,
    hookTimeout: 60000,
    clearMocks: true,
    restoreMocks: true,
    name: 'db',
    isolate: true,
    pool: 'threads',
  },
});
