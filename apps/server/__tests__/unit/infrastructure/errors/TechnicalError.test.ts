import { describe, it, expect } from "vitest";

import {
  TechnicalError,
  ConfigurationError,
  InitializationError,
  SystemError,
} from "@/server/infrastructure/errors/TechnicalError";

describe("TechnicalError", () => {
  describe("TechnicalError", () => {
    it("should create a technical error with default values", () => {
      const error = new TechnicalError("System failure");
      expect(error.message).toBe("System failure");
      expect(error.code).toBe("TECHNICAL_ERROR");
      expect(error.statusCode).toBe(500);
    });

    it("should create a technical error with custom code", () => {
      const error = new TechnicalError(
        "Memory allocation failed",
        "MEMORY_ERROR",
      );
      expect(error.message).toBe("Memory allocation failed");
      expect(error.code).toBe("MEMORY_ERROR");
      expect(error.statusCode).toBe(500);
    });

    it("should create a technical error with custom status code", () => {
      const error = new TechnicalError(
        "Service unavailable",
        "SERVICE_ERROR",
        503,
      );
      expect(error.message).toBe("Service unavailable");
      expect(error.code).toBe("SERVICE_ERROR");
      expect(error.statusCode).toBe(503);
    });

    it("should maintain stack trace", () => {
      const error = new TechnicalError("Test error");
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain("TechnicalError");
    });

    it("should serialize to JSON correctly", () => {
      const error = new TechnicalError("Test error", "TEST_ERROR", 400);
      const json = error.toJSON();

      expect(json).toEqual({
        name: "TechnicalError",
        message: "Test error",
        code: "TEST_ERROR",
        statusCode: 400,
      });
    });
  });

  describe("ConfigurationError", () => {
    it("should create a configuration error with message only", () => {
      const error = new ConfigurationError("Invalid configuration");
      expect(error.message).toBe("Invalid configuration");
      expect(error.code).toBe("CONFIGURATION_ERROR");
      expect(error.configKey).toBeUndefined();
    });

    it("should create a configuration error with config key", () => {
      const error = new ConfigurationError(
        "Missing required value",
        "DATABASE_URL",
      );
      expect(error.message).toBe(
        "Configuration error for 'DATABASE_URL': Missing required value",
      );
      expect(error.configKey).toBe("DATABASE_URL");
    });

    it("should maintain stack trace", () => {
      const error = new ConfigurationError("Test error");
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain("ConfigurationError");
    });

    it("should handle empty config key", () => {
      const error = new ConfigurationError("Test error", "");
      expect(error.message).toBe("Configuration error for '': Test error");
      expect(error.configKey).toBe("");
    });

    it("should serialize to JSON correctly", () => {
      const error = new ConfigurationError("Test error", "TEST_KEY");
      const json = error.toJSON();

      expect(json).toEqual({
        name: "TechnicalError",
        message: "Configuration error for 'TEST_KEY': Test error",
        code: "CONFIGURATION_ERROR",
        statusCode: 500,
        configKey: "TEST_KEY",
      });
    });
  });

  describe("InitializationError", () => {
    it("should create an initialization error with component only", () => {
      const error = new InitializationError("DatabaseService");
      expect(error.message).toBe("Failed to initialize DatabaseService");
      expect(error.code).toBe("INITIALIZATION_ERROR");
      expect(error.component).toBe("DatabaseService");
      expect(error.cause).toBeUndefined();
    });

    it("should create an initialization error with Error cause", () => {
      const cause = new Error("Connection timeout");
      const error = new InitializationError("CacheService", cause);
      expect(error.message).toBe(
        "Failed to initialize CacheService: Connection timeout",
      );
      expect(error.component).toBe("CacheService");
      expect(error.cause).toBe(cause);
    });

    it("should create an initialization error with string cause", () => {
      const error = new InitializationError(
        "QueueService",
        "Invalid configuration",
      );
      expect(error.message).toBe(
        "Failed to initialize QueueService: Invalid configuration",
      );
      expect(error.component).toBe("QueueService");
      expect(error.cause).toBe("Invalid configuration");
    });

    it("should maintain stack trace", () => {
      const error = new InitializationError("Test");
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain("InitializationError");
    });

    it("should handle empty component name", () => {
      const error = new InitializationError("");
      expect(error.message).toBe("Failed to initialize ");
      expect(error.component).toBe("");
    });

    it("should serialize to JSON correctly", () => {
      const cause = new Error("Test cause");
      const error = new InitializationError("Test", cause);
      const json = error.toJSON();

      expect(json).toEqual({
        name: "TechnicalError",
        message: "Failed to initialize Test: Test cause",
        code: "INITIALIZATION_ERROR",
        statusCode: 500,
        component: "Test",
        cause: "Test cause",
      });
    });
  });

  describe("SystemError", () => {
    it("should create a system error with operation only", () => {
      const error = new SystemError("backup");
      expect(error.message).toBe("System operation 'backup' failed");
      expect(error.code).toBe("SYSTEM_ERROR");
      expect(error.operation).toBe("backup");
      expect(error.cause).toBeUndefined();
    });

    it("should create a system error with Error cause", () => {
      const cause = new Error("Disk full");
      const error = new SystemError("cleanup", cause);
      expect(error.message).toBe(
        "System operation 'cleanup' failed: Disk full",
      );
      expect(error.operation).toBe("cleanup");
      expect(error.cause).toBe(cause);
    });

    it("should create a system error with string cause", () => {
      const error = new SystemError("restart", "Process not responding");
      expect(error.message).toBe(
        "System operation 'restart' failed: Process not responding",
      );
      expect(error.operation).toBe("restart");
      expect(error.cause).toBe("Process not responding");
    });

    it("should maintain stack trace", () => {
      const error = new SystemError("test");
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain("SystemError");
    });

    it("should handle empty operation name", () => {
      const error = new SystemError("");
      expect(error.message).toBe("System operation '' failed");
      expect(error.operation).toBe("");
    });

    it("should serialize to JSON correctly", () => {
      const cause = new Error("Test cause");
      const error = new SystemError("test", cause);
      const json = error.toJSON();

      expect(json).toEqual({
        name: "TechnicalError",
        message: "System operation 'test' failed: Test cause",
        code: "SYSTEM_ERROR",
        statusCode: 500,
        operation: "test",
        cause: "Test cause",
      });
    });
  });
});
