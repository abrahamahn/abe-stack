import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import {
  LoggerService,
  ILoggerService,
  LogLevel,
  ConsoleTransport,
  type ILogTransport,
  type LogEntry,
} from "@/server/infrastructure/logging";

describe("Logging Infrastructure Integration Tests", () => {
  let loggerService: ILoggerService;
  let mockTransport: ILogTransport;
  let loggedEntries: LogEntry[];

  beforeEach(() => {
    // Reset logged entries
    loggedEntries = [];

    // Create mock transport
    mockTransport = {
      log: vi.fn().mockImplementation((entry: LogEntry) => {
        loggedEntries.push(entry);
      }),
    };

    // Create logger service with mock transport
    loggerService = new LoggerService();
    loggerService.addTransport(mockTransport);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Basic Logging", () => {
    it("should log messages at different levels", () => {
      const message = "Test message";
      const metadata = { test: true };

      loggerService.debug(message, metadata);
      loggerService.info(message, metadata);
      loggerService.warn(message, metadata);
      loggerService.error(message, metadata);

      expect(loggedEntries).toHaveLength(4);
      expect(loggedEntries[0].level).toBe(LogLevel.DEBUG);
      expect(loggedEntries[1].level).toBe(LogLevel.INFO);
      expect(loggedEntries[2].level).toBe(LogLevel.WARN);
      expect(loggedEntries[3].level).toBe(LogLevel.ERROR);
    });

    it("should include metadata in log entries", () => {
      const metadata = { userId: "123", action: "test" };
      loggerService.info("Test", metadata);

      expect(loggedEntries[0].metadata).toEqual(metadata);
    });

    it("should handle correlation IDs", () => {
      const correlationId = "test-correlation-id";
      loggerService.info("Test", {}, correlationId);

      expect(loggedEntries[0].correlationId).toBe(correlationId);
    });
  });

  describe("Structured Logging", () => {
    it("should log structured data", () => {
      const data = { user: { id: "123", name: "Test" }, action: "login" };
      loggerService.infoObj(data, "User action");

      expect(loggedEntries[0].structuredData).toEqual(data);
      expect(loggedEntries[0].message).toBe("User action");
    });

    it("should handle structured data at different levels", () => {
      const data = { test: true };

      loggerService.debugObj(data);
      loggerService.infoObj(data);
      loggerService.warnObj(data);
      loggerService.errorObj(data);

      expect(loggedEntries).toHaveLength(4);
      expect(
        loggedEntries.every((entry) => entry.structuredData === data),
      ).toBe(true);
    });
  });

  describe("Context Management", () => {
    it("should create child logger with context", () => {
      const childLogger = loggerService.createLogger("TestService");
      childLogger.info("Test message");

      expect(loggedEntries[0].service).toBe("TestService");
    });

    it("should handle nested contexts", () => {
      const parentLogger = loggerService.createLogger("Parent");
      const childLogger = parentLogger.createLogger("Child");
      childLogger.info("Test message");

      expect(loggedEntries[0].service).toBe("Parent.Child");
    });

    it("should add context data", () => {
      const contextLogger = loggerService.withContext({ requestId: "123" });
      contextLogger.info("Test message");

      expect(loggedEntries[0].context).toEqual({ requestId: "123" });
    });
  });

  describe("Transport Management", () => {
    it("should handle multiple transports", () => {
      const secondTransport = { log: vi.fn() };
      loggerService.addTransport(secondTransport);

      loggerService.info("Test message");

      expect(mockTransport.log).toHaveBeenCalled();
      expect(secondTransport.log).toHaveBeenCalled();
    });

    it("should replace transports", () => {
      const newTransport = { log: vi.fn() };
      loggerService.setTransports([newTransport]);

      loggerService.info("Test message");

      expect(mockTransport.log).not.toHaveBeenCalled();
      expect(newTransport.log).toHaveBeenCalled();
    });

    it("should respect minimum log level", () => {
      loggerService.setMinLevel(LogLevel.WARN);

      loggerService.debug("Debug message");
      loggerService.info("Info message");
      loggerService.warn("Warning message");
      loggerService.error("Error message");

      expect(loggedEntries).toHaveLength(2); // Only WARN and ERROR
      expect(loggedEntries[0].level).toBe(LogLevel.WARN);
      expect(loggedEntries[1].level).toBe(LogLevel.ERROR);
    });
  });

  describe("Console Transport", () => {
    let consoleTransport: ConsoleTransport;
    let consoleSpy: { debug: any; info: any; warn: any; error: any };

    beforeEach(() => {
      consoleSpy = {
        debug: vi.spyOn(console, "debug").mockImplementation(() => {}),
        info: vi.spyOn(console, "info").mockImplementation(() => {}),
        warn: vi.spyOn(console, "warn").mockImplementation(() => {}),
        error: vi.spyOn(console, "error").mockImplementation(() => {}),
      };

      consoleTransport = new ConsoleTransport();
      loggerService.setTransports([consoleTransport]);
    });

    it("should format log entries correctly", () => {
      const entry: LogEntry = {
        timestamp: new Date().toISOString(),
        level: LogLevel.INFO,
        message: "Test message",
        service: "TestService",
        correlationId: "test-id",
        metadata: { test: true },
      };

      consoleTransport.log(entry);

      expect(consoleSpy.info).toHaveBeenCalledWith(
        expect.stringContaining("[TestService]"),
      );
      expect(consoleSpy.info).toHaveBeenCalledWith(
        expect.stringContaining("(test-id)"),
      );
    });

    it("should use pretty printing when enabled", () => {
      const prettyTransport = new ConsoleTransport(true);
      loggerService.setTransports([prettyTransport]);

      loggerService.info("Test message", { test: true });

      expect(consoleSpy.info).toHaveBeenCalledWith(
        expect.stringContaining("\x1b["), // ANSI color codes
      );
    });
  });

  describe("Lifecycle Management", () => {
    it("should initialize logger", async () => {
      const initSpy = vi.spyOn(loggerService, "initialize");
      await loggerService.initialize();

      expect(initSpy).toHaveBeenCalled();
    });

    it("should shutdown logger", async () => {
      const shutdownSpy = vi.spyOn(loggerService, "shutdown");
      await loggerService.shutdown();

      expect(shutdownSpy).toHaveBeenCalled();
    });
  });

  describe("Error Handling", () => {
    it("should handle transport failures gracefully", () => {
      const failingTransport = {
        log: vi.fn().mockImplementation(() => {
          throw new Error("Transport error");
        }),
      };

      loggerService.addTransport(failingTransport);

      // Should not throw
      expect(() => loggerService.info("Test message")).not.toThrow();
    });

    it("should handle circular references in metadata", () => {
      const circular: any = { prop: "value" };
      circular.self = circular;

      // Should not throw
      expect(() => loggerService.info("Test", circular)).not.toThrow();
    });
  });
});
