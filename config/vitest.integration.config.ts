import type { UserConfig } from 'vitest/config';

const config: UserConfig = {
  test: {
    globals: true,
    environment: 'node',
    include: ['**/tests/integration/**/*.{test,spec}.{js,ts}'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/backup/**'],
    testTimeout: 30000, // Longer timeout for integration tests
    hookTimeout: 30000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/backup/**',
        '**/config/**',
        '**/tools/**',
        '**/*.config.{js,ts}',
        '**/*.d.ts',
      ],
    },
  },
};

export default config;
