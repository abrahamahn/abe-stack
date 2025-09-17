// Unified Test Configuration for ABE Stack
// This file centralizes all testing configurations and pipelines

export const testConfig = {
  // Test pipeline stages
  stages: {
    // Stage 1: Static Analysis (Fast)
    static: [
      "lint",
      "type-check",
      "format:check"
    ],

    // Stage 2: Unit Tests (Medium)
    unit: [
      "test:unit"
    ],

    // Stage 3: Integration Tests (Slow)
    integration: [
      "test:integration"
    ],

    // Stage 4: End-to-End Tests (Slowest)
    e2e: [
      "test:e2e"
    ]
  },

  // Test environments
  environments: {
    development: {
      stages: ["static", "unit"],
      parallel: true,
      failFast: false
    },

    preCommit: {
      stages: ["static", "unit"],
      parallel: false,
      failFast: true
    },

    ci: {
      stages: ["static", "unit", "integration", "e2e"],
      parallel: false,
      failFast: true
    },

    production: {
      stages: ["static", "unit", "integration"],
      parallel: false,
      failFast: true
    }
  },

  // Path aliases (shared across all configs)
  paths: {
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
    "@tools": "./src/server/tools",
    "@tests": "./src/tests"
  }
};

export default testConfig;