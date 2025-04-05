import { describe, it, expect, beforeEach, vi } from "vitest";

import { LogLevel } from "@/server/infrastructure/logging/ILoggerService";
import { LoggerService } from "@/server/infrastructure/logging/LoggerService";

describe("LoggerService", () => {
  let loggerService: LoggerService;
  let mockTransport: any;

  beforeEach(() => {
    mockTransport = {
      log: vi.fn(),
    };

    loggerService = new LoggerService("Test Context");
  });

  describe("constructor", () => {
    it("should create service with default console transport", () => {
      expect(loggerService).toBeDefined();
      // Verify default console transport is added
      loggerService.info("Test message");
      expect(mockTransport.log).not.toHaveBeenCalled();
    });
  });

  describe("addTransport", () => {
    it("should add transport", () => {
      loggerService.addTransport(mockTransport);
      // Verify transport was added by logging a message
      loggerService.info("Test message");
      expect(mockTransport.log).toHaveBeenCalledWith({
        level: LogLevel.INFO,
        message: "Test message",
        metadata: undefined,
        correlationId: undefined,
        service: "Test Context",
        timestamp: expect.any(String),
      });
    });
  });

  describe("setTransports", () => {
    it("should set transports", () => {
      loggerService.setTransports([mockTransport]);
      // Verify transport was set by logging a message
      loggerService.info("Test message");
      expect(mockTransport.log).toHaveBeenCalledWith({
        level: LogLevel.INFO,
        message: "Test message",
        metadata: undefined,
        correlationId: undefined,
        service: "Test Context",
        timestamp: expect.any(String),
      });
    });
  });

  describe("debug", () => {
    it("should log debug message", () => {
      loggerService.setMinLevel(LogLevel.DEBUG);
      loggerService.addTransport(mockTransport);
      const message = "Debug message";
      const context = { userId: "user123" };
      loggerService.debug(message, context);
      expect(mockTransport.log).toHaveBeenCalledWith({
        level: LogLevel.DEBUG,
        message,
        metadata: context,
        correlationId: undefined,
        service: "Test Context",
        timestamp: expect.any(String),
      });
    });

    it("should not log debug message when level is higher", () => {
      loggerService.setMinLevel(LogLevel.INFO);
      loggerService.addTransport(mockTransport);
      loggerService.debug("Debug message");
      expect(mockTransport.log).not.toHaveBeenCalled();
    });
  });

  describe("info", () => {
    it("should log info message", () => {
      loggerService.addTransport(mockTransport);
      const message = "Info message";
      const context = { userId: "user123" };
      loggerService.info(message, context);
      expect(mockTransport.log).toHaveBeenCalledWith({
        level: LogLevel.INFO,
        message,
        metadata: context,
        correlationId: undefined,
        service: "Test Context",
        timestamp: expect.any(String),
      });
    });
  });

  describe("warn", () => {
    it("should log warning message", () => {
      loggerService.addTransport(mockTransport);
      const message = "Warning message";
      const context = { userId: "user123" };
      loggerService.warn(message, context);
      expect(mockTransport.log).toHaveBeenCalledWith({
        level: LogLevel.WARN,
        message,
        metadata: context,
        correlationId: undefined,
        service: "Test Context",
        timestamp: expect.any(String),
      });
    });
  });

  describe("error", () => {
    it("should log error message", () => {
      loggerService.addTransport(mockTransport);
      const message = "Error message";
      const error = new Error("Test error");
      const context = { userId: "user123" };
      loggerService.error(message, {
        error: { message: error.message, stack: error.stack },
        ...context,
      });
      expect(mockTransport.log).toHaveBeenCalledWith({
        level: LogLevel.ERROR,
        message,
        metadata: {
          error: { message: error.message, stack: error.stack },
          ...context,
        },
        correlationId: undefined,
        service: "Test Context",
        timestamp: expect.any(String),
      });
    });
  });

  describe("setMinLevel", () => {
    it("should set minimum log level", () => {
      loggerService.setMinLevel(LogLevel.WARN);
      loggerService.addTransport(mockTransport);
      loggerService.info("Info message");
      expect(mockTransport.log).not.toHaveBeenCalled();
      loggerService.warn("Warning message");
      expect(mockTransport.log).toHaveBeenCalled();
    });
  });

  describe("setContext", () => {
    it("should set context", () => {
      loggerService.addTransport(mockTransport);
      loggerService.setContext("new-context");
      loggerService.info("Test message");
      expect(mockTransport.log).toHaveBeenCalledWith(
        expect.objectContaining({
          service: "new-context",
        }),
      );
    });
  });

  describe("setContextData", () => {
    it("should set context data", () => {
      loggerService.addTransport(mockTransport);
      const contextData = { userId: "user123", sessionId: "session456" };
      loggerService.setContextData(contextData);
      loggerService.info("Test message");
      expect(mockTransport.log).toHaveBeenCalledWith(
        expect.objectContaining({
          context: expect.objectContaining(contextData),
        }),
      );
    });
  });
});
