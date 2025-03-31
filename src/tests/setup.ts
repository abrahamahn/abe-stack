/**
 * Global Jest setup file.
 * Runs before each test file.
 */

// Set default timeout for all tests
jest.setTimeout(30000);

// Ensure reflect-metadata is imported for decorators to work
import "reflect-metadata";

// Set test environment variable to prevent real directory creation
process.env.NODE_ENV = "test";
process.env.STORAGE_PATH = "/mock-storage";
process.env.UPLOAD_DIR = "/mock-uploads";
process.env.TEMP_DIR = "/mock-temp";
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
  log: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
  // Keep error and warn for test debugging
  // error: jest.fn(),
  // warn: jest.fn(),
};
*/

// Add any global test setup here
beforeAll(() => {
  // Setup code to run once before all tests
});

// Mock file system operations in tests
jest.mock("fs", () => {
  const originalFs = jest.requireActual("fs");
  return {
    ...originalFs,
    // Mock mkdir and mkdirSync to avoid actual directory creation in tests
    mkdir: jest.fn().mockImplementation((_path, _options, callback) => {
      if (callback) callback(null);
      return Promise.resolve();
    }),
    mkdirSync: jest.fn().mockImplementation(() => undefined),
    existsSync: jest.fn().mockImplementation(() => true),
  };
});

afterAll(() => {
  // Cleanup code to run once after all tests
});
