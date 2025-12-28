import { defineConfig } from "vitest/config";
import type { UserConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: [
      "**/tests/unit/**/*.{test,spec}.{js,ts}",
      "**/src/**/*.{test,spec}.{js,ts}",
    ],
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/tests/integration/**",
      "**/tests/e2e/**",
      "**/backup/**",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "**/node_modules/**",
        "**/dist/**",
        "**/backup/**",
        "**/config/**",
        "**/tools/**",
        "**/*.config.{js,ts}",
        "**/*.d.ts",
      ],
      thresholds: {
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70,
        },
      },
    },
    testTimeout: 10000,
    hookTimeout: 10000,
  },
} satisfies UserConfig);
