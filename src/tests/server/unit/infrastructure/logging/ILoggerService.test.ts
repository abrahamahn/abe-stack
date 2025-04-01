import { describe, it, expect, beforeEach, vi } from "vitest";

import { LogLevel } from "@infrastructure/logging";

import type {
  ILoggerService,
  LogMetadata,
  ILogTransport,
  ILogContext,
} from "@infrastructure/logging";

describe("ILoggerService", () => {
  let mockLogger: ILoggerService;

  beforeEach(() => {
    mockLogger = {
      debug: vi.fn(),
      debugObj: vi.fn(),
      info: vi.fn(),
      infoObj: vi.fn(),
      warn: vi.fn(),
      warnObj: vi.fn(),
      error: vi.fn(),
      errorObj: vi.fn(),
      createLogger: vi.fn().mockReturnThis(),
      withContext: vi.fn().mockReturnThis(),
      addTransport: vi.fn(),
      setTransports: vi.fn(),
      setMinLevel: vi.fn(),
      initialize: vi.fn().mockResolvedValue(undefined),
      shutdown: vi.fn().mockResolvedValue(undefined),
    };
  });

  describe("debug", () => {
    it("should log debug message", async () => {
      const message = "Debug message";
      const metadata: LogMetadata = { userId: "user123" };
      const correlationId = "corr123";
      await mockLogger.debug(message, metadata, correlationId);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        message,
        metadata,
        correlationId,
      );
    });
  });

  describe("debugObj", () => {
    it("should log debug object", async () => {
      const obj = { key: "value" };
      const message = "Debug object message";
      const correlationId = "corr123";
      await mockLogger.debugObj(obj, message, correlationId);
      expect(mockLogger.debugObj).toHaveBeenCalledWith(
        obj,
        message,
        correlationId,
      );
    });
  });

  describe("info", () => {
    it("should log info message", async () => {
      const message = "Info message";
      const metadata: LogMetadata = { userId: "user123" };
      const correlationId = "corr123";
      await mockLogger.info(message, metadata, correlationId);
      expect(mockLogger.info).toHaveBeenCalledWith(
        message,
        metadata,
        correlationId,
      );
    });
  });

  describe("infoObj", () => {
    it("should log info object", async () => {
      const obj = { key: "value" };
      const message = "Info object message";
      const correlationId = "corr123";
      await mockLogger.infoObj(obj, message, correlationId);
      expect(mockLogger.infoObj).toHaveBeenCalledWith(
        obj,
        message,
        correlationId,
      );
    });
  });

  describe("warn", () => {
    it("should log warning message", async () => {
      const message = "Warning message";
      const metadata: LogMetadata = { userId: "user123" };
      const correlationId = "corr123";
      await mockLogger.warn(message, metadata, correlationId);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        message,
        metadata,
        correlationId,
      );
    });
  });

  describe("warnObj", () => {
    it("should log warning object", async () => {
      const obj = { key: "value" };
      const message = "Warning object message";
      const correlationId = "corr123";
      await mockLogger.warnObj(obj, message, correlationId);
      expect(mockLogger.warnObj).toHaveBeenCalledWith(
        obj,
        message,
        correlationId,
      );
    });
  });

  describe("error", () => {
    it("should log error message", async () => {
      const message = "Error message";
      const metadata: LogMetadata = { error: "Test error" };
      const correlationId = "corr123";
      await mockLogger.error(message, metadata, correlationId);
      expect(mockLogger.error).toHaveBeenCalledWith(
        message,
        metadata,
        correlationId,
      );
    });
  });

  describe("errorObj", () => {
    it("should log error object", async () => {
      const obj = { error: "Test error" };
      const message = "Error object message";
      const correlationId = "corr123";
      await mockLogger.errorObj(obj, message, correlationId);
      expect(mockLogger.errorObj).toHaveBeenCalledWith(
        obj,
        message,
        correlationId,
      );
    });
  });

  describe("createLogger", () => {
    it("should create a new logger with context", () => {
      const context = "TestContext";
      const newLogger = mockLogger.createLogger(context);
      expect(mockLogger.createLogger).toHaveBeenCalledWith(context);
      expect(newLogger).toBe(mockLogger);
    });
  });

  describe("withContext", () => {
    it("should create a new logger with context data", () => {
      const context: ILogContext = { userId: "user123", requestId: "req456" };
      const newLogger = mockLogger.withContext(context);
      expect(mockLogger.withContext).toHaveBeenCalledWith(context);
      expect(newLogger).toBe(mockLogger);
    });
  });

  describe("setMinLevel", () => {
    it("should set log level", async () => {
      const level = LogLevel.DEBUG;
      await mockLogger.setMinLevel(level);
      expect(mockLogger.setMinLevel).toHaveBeenCalledWith(level);
    });
  });

  describe("addTransport", () => {
    it("should add transport", async () => {
      const transport: ILogTransport = { log: vi.fn() };
      await mockLogger.addTransport(transport);
      expect(mockLogger.addTransport).toHaveBeenCalledWith(transport);
    });
  });

  describe("setTransports", () => {
    it("should set transports", async () => {
      const transports: ILogTransport[] = [{ log: vi.fn() }];
      await mockLogger.setTransports(transports);
      expect(mockLogger.setTransports).toHaveBeenCalledWith(transports);
    });
  });

  describe("initialize", () => {
    it("should initialize the logger", async () => {
      await mockLogger.initialize();
      expect(mockLogger.initialize).toHaveBeenCalled();
    });
  });

  describe("shutdown", () => {
    it("should shutdown the logger", async () => {
      await mockLogger.shutdown();
      expect(mockLogger.shutdown).toHaveBeenCalled();
    });
  });
});
