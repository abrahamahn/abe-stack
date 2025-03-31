import {
  TechnicalError,
  ConfigurationError,
  InitializationError,
  SystemError,
} from "@/server/infrastructure/errors/technical/TechnicalError";

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
  });
});
