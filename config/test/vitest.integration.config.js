import { defineConfig } from "vitest/config";
import { vitestPaths } from "../paths.config.js";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["**/tests/integration/**/*.{test,spec}.{js,ts}"],
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/backup/**"
    ],
    testTimeout: 30000, // Longer timeout for integration tests
    hookTimeout: 30000,
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
        "**/*.d.ts"
      ],
    },
    alias: vitestPaths,
    setupFiles: ["../../src/tests/setup.ts"], // Use main setup for now
  },
});