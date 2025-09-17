// Unified Path Aliases Configuration
// This file centralizes all path aliases used across different configs

import { resolve } from "path";

const __dirname = import.meta.dirname || process.cwd();

// Base path mappings
export const pathMappings = {
  "@": "./src",
  "@client": "./src/client",
  "@server": "./src/server",
  "@shared": "./src/server/shared",
  "@infrastructure": "./src/server/infrastructure",
  "@cache": "./src/server/infrastructure/cache",
  "@config": "./src/server/infrastructure/config",
  "@database": "./src/server/infrastructure/database",
  "@di": "./src/server/infrastructure/di",
  "@errors": "./src/server/infrastructure/errors",
  "@files": "./src/server/infrastructure/files",
  "@jobs": "./src/server/infrastructure/jobs",
  "@lifecycle": "./src/server/infrastructure/lifecycle",
  "@logging": "./src/server/infrastructure/logging",
  "@middleware": "./src/server/infrastructure/middleware",
  "@processor": "./src/server/infrastructure/processor",
  "@promises": "./src/server/infrastructure/promises",
  "@pubsub": "./src/server/infrastructure/pubsub",
  "@queue": "./src/server/infrastructure/queue",
  "@security": "./src/server/infrastructure/security",
  "@infra-server": "./src/server/infrastructure/server",
  "@storage": "./src/server/infrastructure/storage",
  "@utils": "./src/server/infrastructure/utils",
  "@modules": "./src/server/modules",
  "@auth": "./src/server/modules/core/auth",
  "@preferences": "./src/server/modules/preferences",
  "@sessions": "./src/server/modules/core/sessions",
  "@users": "./src/server/modules/core/users",
  "@tools": "./tools",
  "@tests": "./src/tests"
};

// For TypeScript tsconfig.json
export const typescriptPaths = Object.fromEntries(
  Object.entries(pathMappings).map(([key, value]) => [
    `${key}/*`, [`${value}/*`]
  ])
);

// For Vite (requires absolute paths)
export const vitePaths = Object.fromEntries(
  Object.entries(pathMappings).map(([key, value]) => [
    key, resolve(__dirname, value)
  ])
);

// For ESLint alias resolver
export const eslintPaths = Object.entries(pathMappings).map(([key, value]) => [
  key, value
]);

// For Vitest (requires absolute paths)
export const vitestPaths = Object.fromEntries(
  Object.entries(pathMappings).map(([key, value]) => [
    key, resolve(__dirname, value)
  ])
);

export default {
  pathMappings,
  typescriptPaths,
  vitePaths,
  eslintPaths,
  vitestPaths
};