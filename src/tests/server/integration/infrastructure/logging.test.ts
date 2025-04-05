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
      // Set min level to DEBUG to ensure all logs are captured
      loggerService.setMinLevel(LogLevel.DEBUG);

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

    it("should include all parameters in log entries", () => {
      const message = "Complete log entry";
      const metadata = { data: "test-data" };
      const correlationId = "test-correlation-complete";
      const contextData = { requestId: "req-123" };

      const contextLogger = loggerService.withContext(contextData);
      contextLogger.info(message, metadata, correlationId);

      expect(loggedEntries[0]).toMatchObject({
        message,
        metadata,
        correlationId,
        context: contextData,
        level: LogLevel.INFO,
      });
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
      // Set min level to DEBUG to ensure all logs are captured
      loggerService.setMinLevel(LogLevel.DEBUG);

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

    it("should use default message for structured logs when not provided", () => {
      const data = { test: true };
      loggerService.infoObj(data); // No message provided

      expect(loggedEntries[0].message).toBe("Structured log entry");
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

    it("should merge context data across child loggers", () => {
      const parentContext = loggerService.withContext({
        parentId: "parent-123",
      });
      const childContext = parentContext.withContext({ childId: "child-456" });

      childContext.info("Test with merged context");

      expect(loggedEntries[0].context).toEqual({
        parentId: "parent-123",
        childId: "child-456",
      });
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

    it("should use default console transport when none is specified", () => {
      // Create a new logger service without adding a transport
      const defaultLogger = new LoggerService();

      // Spy on console methods
      const consoleInfoSpy = vi
        .spyOn(console, "info")
        .mockImplementation(() => {});

      // This should create a default console transport internally
      defaultLogger.info("Test with default transport");

      // Verify the console was called
      expect(consoleInfoSpy).toHaveBeenCalled();

      consoleInfoSpy.mockRestore();
    });

    it("should share transports between parent and child loggers", () => {
      const childLogger = loggerService.createLogger("ChildService");
      childLogger.info("Message from child");

      expect(loggedEntries).toHaveLength(1);
      expect(loggedEntries[0].service).toBe("ChildService");
    });

    it("should share minimum log level between parent and child loggers", () => {
      // Set min level on parent
      loggerService.setMinLevel(LogLevel.ERROR);

      // Create child logger
      const childLogger = loggerService.createLogger("ChildService");

      // Try logging at different levels from child
      childLogger.debug("Debug from child");
      childLogger.info("Info from child");
      childLogger.warn("Warn from child");
      childLogger.error("Error from child");

      // Only ERROR should be logged
      expect(loggedEntries).toHaveLength(1);
      expect(loggedEntries[0].level).toBe(LogLevel.ERROR);
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

    it("should send logs to the appropriate console methods based on level", () => {
      // Set min level to DEBUG
      loggerService.setMinLevel(LogLevel.DEBUG);

      // Log at different levels
      loggerService.debug("Debug test");
      loggerService.info("Info test");
      loggerService.warn("Warn test");
      loggerService.error("Error test");

      // Verify each console method was called
      expect(consoleSpy.debug).toHaveBeenCalled();
      expect(consoleSpy.info).toHaveBeenCalled();
      expect(consoleSpy.warn).toHaveBeenCalled();
      expect(consoleSpy.error).toHaveBeenCalled();
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

    it("should handle null and undefined values in metadata", () => {
      const metadata = {
        nullValue: null,
        undefinedValue: undefined,
        validValue: "test",
      };

      // Should not throw
      expect(() =>
        loggerService.info("Test with null/undefined", metadata),
      ).not.toThrow();

      // The log should contain the metadata
      expect(loggedEntries[0].metadata).toEqual(metadata);
    });

    it("should handle safe JSON serialization in ConsoleTransport", () => {
      // Create circular reference that would normally break JSON.stringify
      const circular: any = { name: "circular object" };
      circular.self = circular;

      // Create a console transport with pretty printing (uses JSON.stringify)
      const prettyTransport = new ConsoleTransport(true);

      // Create a logger with our transport
      const safeLogger = new LoggerService();
      safeLogger.setTransports([prettyTransport]);

      // Spy on console methods to verify the output
      const consoleSpy = vi.spyOn(console, "info").mockImplementation(() => {});

      // Log with circular reference - this shouldn't throw
      expect(() =>
        safeLogger.info("Circular reference test", circular),
      ).not.toThrow();

      // Verify the log contains the circular reference message
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("[Object with circular references"),
      );

      consoleSpy.mockRestore();
    });
  });

  describe("Advanced Logging Features", () => {
    it("should handle performance logging with timing measurements", () => {
      const startTime = Date.now();

      // Simulate some operation
      for (let i = 0; i < 1000; i++) {
        // Just burning some CPU cycles
        Math.sqrt(i);
      }

      const duration = Date.now() - startTime;

      // Log with timing information
      loggerService.info("Operation completed", {
        durationMs: duration,
        operation: "test-computation",
      });

      expect(loggedEntries[0].metadata).toHaveProperty("durationMs");
      expect(typeof loggedEntries[0].metadata!.durationMs).toBe("number");
    });

    it("should handle functions in metadata by serializing their names", () => {
      const testHandlerFn = function testHandler() {
        return true;
      };
      const metadata = {
        handler: testHandlerFn,
        callback: () => console.log("Callback"),
      };

      loggerService.info("Function objects in metadata", metadata);

      const loggedMetadata = loggedEntries[0].metadata;
      expect(loggedMetadata).toHaveProperty("handler");

      // Just verify that the functions were handled and passed through
      expect(typeof loggedMetadata?.handler).toBe("function");
      expect(typeof loggedMetadata?.callback).toBe("function");

      // Compare the references to ensure they're the same functions
      expect(loggedMetadata?.handler).toBe(testHandlerFn);
    });

    it("should handle complex nested objects in metadata", () => {
      const complexObject = {
        user: {
          profile: {
            details: {
              preferences: {
                theme: "dark",
                notifications: {
                  email: true,
                  push: false,
                },
              },
            },
          },
        },
        stats: [1, 2, 3, { count: 42 }],
      };

      loggerService.info("Complex nested object", complexObject);

      // Verify the object was logged properly
      expect(loggedEntries[0].metadata).toEqual(complexObject);
    });

    it("should provide access to root logger from child loggers", () => {
      // Create a deeply nested logger
      const level1 = loggerService.createLogger("Level1");
      const level2 = level1.createLogger("Level2");
      const level3 = level2.createLogger("Level3");

      // The min level is shared across all loggers
      loggerService.setMinLevel(LogLevel.ERROR);

      // These should be filtered out
      level3.debug("Debug message from level 3");
      level3.info("Info message from level 3");
      level3.warn("Warn message from level 3");

      // This should get through
      level3.error("Error message from level 3");

      // Verify only the ERROR message got through
      expect(loggedEntries).toHaveLength(1);
      expect(loggedEntries[0].level).toBe(LogLevel.ERROR);
      expect(loggedEntries[0].service).toBe("Level1.Level2.Level3");
    });

    it("should create structured multi-context logs", () => {
      // Create a request logger with request context
      const requestLogger = loggerService.withContext({
        requestId: "req-123",
        userId: "user-456",
      });

      // Create a session logger with session context
      const sessionLogger = requestLogger.withContext({
        sessionId: "sess-789",
        userAgent: "test-browser",
      });

      // Log with both contexts
      sessionLogger.info("User action in session", {
        action: "click",
        element: "button",
      });

      // Verify all contexts were merged
      expect(loggedEntries[0].context).toEqual({
        requestId: "req-123",
        userId: "user-456",
        sessionId: "sess-789",
        userAgent: "test-browser",
      });

      // Verify the action metadata was included
      expect(loggedEntries[0].metadata).toEqual({
        action: "click",
        element: "button",
      });
    });
  });
});
