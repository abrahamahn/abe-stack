import path from "path";

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["**/*.{test,spec}.{js,ts}"],
    exclude: ["**/node_modules/**", "**/dist/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: ["**/node_modules/**", "**/dist/**"],
    },
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@client": path.resolve(__dirname, "./src/client"),
      "@server": path.resolve(__dirname, "./src/server"),
      "@shared": path.resolve(__dirname, "./src/server/shared"),
      "@infrastructure": path.resolve(__dirname, "./src/server/infrastructure"),
      "@cache": path.resolve(__dirname, "./src/server/infrastructure/cache"),
      "@config": path.resolve(__dirname, "./src/server/infrastructure/config"),
      "@database": path.resolve(
        __dirname,
        "./src/server/infrastructure/database",
      ),
      "@di": path.resolve(__dirname, "./src/server/infrastructure/di"),
      "@errors": path.resolve(__dirname, "./src/server/infrastructure/errors"),
      "@jobs": path.resolve(__dirname, "./src/server/infrastructure/jobs"),
      "@logging": path.resolve(
        __dirname,
        "./src/server/infrastructure/logging",
      ),
      "@middlewares": path.resolve(
        __dirname,
        "./src/server/infrastructure/middlewares",
      ),
      "@processors": path.resolve(
        __dirname,
        "./src/server/infrastructure/processors",
      ),
      "@pubsub": path.resolve(__dirname, "./src/server/infrastructure/pubsub"),
      "@infra-server": path.resolve(
        __dirname,
        "./src/server/infrastructure/server",
      ),
      "@storage": path.resolve(
        __dirname,
        "./src/server/infrastructure/storage",
      ),
      "@modules": path.resolve(__dirname, "./src/server/modules"),
      "@auth": path.resolve(__dirname, "./src/server/modules/auth"),
      "@preferences": path.resolve(
        __dirname,
        "./src/server/modules/preferences",
      ),
      "@sessions": path.resolve(__dirname, "./src/server/modules/sessions"),
      "@users": path.resolve(__dirname, "./src/server/modules/users"),
      "@tools": path.resolve(__dirname, "./src/server/tools"),
      "@tests": path.resolve(__dirname, "./src/tests"),
    },
    setupFiles: ["./src/tests/setup.ts"],
  },
});
