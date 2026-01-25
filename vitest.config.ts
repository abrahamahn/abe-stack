import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Global settings covering coverage, reporters, etc.
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['**/src/**'],
      exclude: [
        '**/__tests__/**',
        '**/*.test.ts',
        '**/*.d.ts',
        '**/generated/**',
        'tooling/**',
        '.config/**',
      ],
    },
    reporters: ['default'],
  },
});
