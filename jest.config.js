/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: ".", // choose the appropriate rootDir for your project
  verbose: true,
  // Module resolution settings
  moduleDirectories: ["node_modules", "src"],
  modulePaths: ["<rootDir>/node_modules", "<rootDir>/src"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@client/(.*)$": "<rootDir>/src/client/$1",
    "^@server/(.*)$": "<rootDir>/src/server/$1",
    "^@shared/(.*)$": "<rootDir>/src/server/shared/$1",
    "^@infrastructure/(.*)$": "<rootDir>/src/server/infrastructure/$1",
    "^@cache/(.*)$": "<rootDir>/src/server/infrastructure/cache/$1",
    "^@config/(.*)$": "<rootDir>/src/server/infrastructure/config/$1",
    "^@database/(.*)$": "<rootDir>/src/server/infrastructure/database/$1",
    "^@di/(.*)$": "<rootDir>/src/server/infrastructure/di/$1",
    "^@errors/(.*)$": "<rootDir>/src/server/infrastructure/errors/$1",
    "^@jobs/(.*)$": "<rootDir>/src/server/infrastructure/jobs/$1",
    "^@logging/(.*)$": "<rootDir>/src/server/infrastructure/logging/$1",
    "^@middlewares/(.*)$": "<rootDir>/src/server/infrastructure/middlewares/$1",
    "^@processors/(.*)$": "<rootDir>/src/server/infrastructure/processors/$1",
    "^@pubsub/(.*)$": "<rootDir>/src/server/infrastructure/pubsub/$1",
    "^@infra-server/(.*)$": "<rootDir>/src/server/infrastructure/server/$1",
    "^@storage/(.*)$": "<rootDir>/src/server/infrastructure/storage/$1",
    "^@modules/(.*)$": "<rootDir>/src/server/modules/$1",
    "^@auth/(.*)$": "<rootDir>/src/server/modules/auth/$1",
    "^@preferences/(.*)$": "<rootDir>/src/server/modules/preferences/$1",
    "^@sessions/(.*)$": "<rootDir>/src/server/modules/sessions/$1",
    "^@users/(.*)$": "<rootDir>/src/server/modules/users/$1",
    "^@tools/(.*)$": "<rootDir>/src/server/tools/$1",
    "^@tests/(.*)$": "<rootDir>/src/tests/$1",
    "^inversify$": "<rootDir>/node_modules/inversify",
    "^dotenv$": "<rootDir>/node_modules/dotenv",
  },
  // Transformation settings
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: "tsconfig.json",
        diagnostics: false,
        transpileOnly: true,
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        maxConcurrentTranspiles: 4,
      },
    ],
  },
  transformIgnorePatterns: ["/node_modules/(?!inversify|reflect-metadata)/"],
  // Test patterns and roots
  roots: ["<rootDir>/src"],
  testMatch: [
    "**/src/tests/**/*.test.ts",
    "**/src/**/__tests__/**/*.[jt]s?(x)",
    "**/src/**/?(*.)+(spec|test).[jt]s?(x)",
    "!<rootDir>/backup/**",
    "!<rootDir>/src/backup/**",
  ],
  testPathIgnorePatterns: [
    "<rootDir>/node_modules/",
    "<rootDir>/dist/",
    "<rootDir>/backup/",
  ],
  modulePathIgnorePatterns: ["dist", "backup"],
  // Setup and reporters
  setupFilesAfterEnv: ["<rootDir>/src/tests/setup.ts"],
  testSequencer: "<rootDir>/.jest/sequencer.js",
  reporters: ["default", ["<rootDir>/.jest/summary-reporter.js", {}]],
  // Performance and behavior
  testTimeout: 30000,
  maxWorkers: "60%",
  cache: true,
  detectOpenHandles: true,
  forceExit: true,
  // Mocks and coverage
  clearMocks: true,
  restoreMocks: true,
  resetMocks: true,
  collectCoverage: false,
  coverageReporters: ["text-summary", "lcov", "html"],
  coverageDirectory: "<rootDir>/coverage",
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/tests/**",
    "!src/**/index.{ts,tsx}",
    "!src/backup/**",
    "!**/node_modules/**",
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    "src/server/infrastructure/cache/**/*.ts": {
      branches: 90,
      functions: 95,
      lines: 95,
    },
  },
  // Optimizations
  errorOnDeprecated: true,
  notify: false,
  notifyMode: "failure-change",
};
