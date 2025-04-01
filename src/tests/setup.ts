/**
 * Global Vitest setup file.
 * Runs before each test file.
 */

// Set default timeout for all tests
import { vi, beforeAll, afterAll } from "vitest";
vi.setConfig({ testTimeout: 30000 });

// Ensure reflect-metadata is imported for decorators to work
import "reflect-metadata";

// Set test environment variable to prevent real directory creation
process.env.NODE_ENV = "test";
process.env.STORAGE_PATH = "/storage";
process.env.UPLOAD_DIR = "/uploads";
process.env.TEMP_DIR = "/temp";
process.env.DISABLE_REAL_STORAGE = "true";

// Load TYPES before tests run to avoid circular dependencies
import { TYPES } from "@/server/infrastructure/di/types";
// Use type assertion to explicitly tell TypeScript this property exists on global
Object.defineProperty(global, "__TEST_TYPES__", { value: TYPES });

// Suppress console output during tests
// Uncomment these if you want to silence console output
/*
global.console = {
  ...console,
  log: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
  // Keep error and warn for test debugging
  // error: vi.fn(),
  // warn: vi.fn(),
};
*/

// Add any global test setup here
beforeAll(() => {
  // Setup code to run once before all tests
});

// Mock file system operations in tests
vi.mock("fs", async () => {
  const originalFs = await vi.importActual("fs");
  return {
    ...originalFs,
    // Mock mkdir and mkdirSync to avoid actual directory creation in tests
    mkdir: vi.fn().mockImplementation((_path, _options, callback) => {
      if (callback) callback(null);
      return Promise.resolve();
    }),
    mkdirSync: vi.fn().mockImplementation(() => undefined),
    existsSync: vi.fn().mockImplementation(() => true),
  };
});

afterAll(() => {
  // Cleanup code to run once after all tests
});
