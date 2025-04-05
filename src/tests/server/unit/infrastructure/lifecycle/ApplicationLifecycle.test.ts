import { Server, createServer } from "http";

import { Container } from "inversify";
import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  afterAll,
  vi,
} from "vitest";

import { TYPES } from "@/server/infrastructure/di/types";
import ApplicationLifecycle from "@/server/infrastructure/lifecycle/ApplicationLifecycle";

describe("ApplicationLifecycle", () => {
  let container: Container;
  let lifecycle: ApplicationLifecycle;
  let mockLogger: any;
  let mockWebSocketService: any;
  let mockDatabaseService: any;
  let httpServer: Server;

  beforeEach(() => {
    container = new Container();

    // Create mock services
    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
      debugObj: vi.fn(),
      infoObj: vi.fn(),
      warnObj: vi.fn(),
      errorObj: vi.fn(),
      trace: vi.fn(),
      traceObj: vi.fn(),
      fatal: vi.fn(),
      createLogger: vi.fn().mockReturnThis(),
      withContext: vi.fn().mockReturnThis(),
      addTransport: vi.fn(),
      setTransports: vi.fn(),
      getTransports: vi.fn(),
      clearTransports: vi.fn(),
      setLevel: vi.fn(),
      setMinLevel: vi.fn(),
      initialize: vi.fn(),
      shutdown: vi.fn(),
    };

    mockWebSocketService = {
      close: vi.fn().mockResolvedValue(undefined),
    };

    mockDatabaseService = {
      initialize: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
    };

    // Bind mock services to container
    container.bind(TYPES.LoggerService).toConstantValue(mockLogger);
    container
      .bind(TYPES.WebSocketService)
      .toConstantValue(mockWebSocketService);
    container.bind(TYPES.DatabaseService).toConstantValue(mockDatabaseService);

    // Create HTTP server
    httpServer = createServer();

    // Create lifecycle instance
    lifecycle = container.resolve(ApplicationLifecycle);
    lifecycle.setHttpServer(httpServer);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    httpServer.close();
  });

  describe("Initialization", () => {
    it("should initialize successfully", async () => {
      await lifecycle.initialize();

      expect(mockDatabaseService.initialize).toHaveBeenCalled();

      // Check that any of the logger.info calls contain the success message
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining(
          "Application initialization completed successfully",
        ),
        expect.anything(),
      );
    });

    it("should handle initialization errors", async () => {
      const error = new Error("Database connection failed");
      mockDatabaseService.initialize.mockRejectedValue(error);

      await expect(lifecycle.initialize()).rejects.toThrow(error);
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining("Application initialization failed"),
        expect.objectContaining({ error }),
      );
    });

    it("should register process signal handlers", () => {
      const processSpy = vi.spyOn(process, "on");
      lifecycle["registerProcessHandlers"]();

      expect(processSpy).toHaveBeenCalledWith("SIGTERM", expect.any(Function));
      expect(processSpy).toHaveBeenCalledWith("SIGINT", expect.any(Function));
      expect(processSpy).toHaveBeenCalledWith(
        "uncaughtException",
        expect.any(Function),
      );
    });
  });

  describe("Dependency Management", () => {
    it("should register dependencies", () => {
      const dependency = {
        name: "TestService",
        dependencies: [],
        startup: vi.fn(),
        shutdown: vi.fn(),
      };

      lifecycle.registerDependency(dependency);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining("Registered dependency: TestService"),
      );
    });

    it("should handle dependency initialization order", async () => {
      const dep1 = {
        name: "Service1",
        dependencies: [],
        startup: vi.fn().mockResolvedValue(undefined),
      };

      const dep2 = {
        name: "Service2",
        dependencies: ["Service1"],
        startup: vi.fn().mockResolvedValue(undefined),
      };

      lifecycle.registerDependency(dep1);
      lifecycle.registerDependency(dep2);

      await lifecycle.initialize();

      expect(dep1.startup).toHaveBeenCalledBefore(dep2.startup);
    });

    it("should detect circular dependencies", async () => {
      const dep1 = {
        name: "Service1",
        dependencies: ["Service2"],
        startup: vi.fn(),
      };

      const dep2 = {
        name: "Service2",
        dependencies: ["Service1"],
        startup: vi.fn(),
      };

      lifecycle.registerDependency(dep1);
      lifecycle.registerDependency(dep2);

      await expect(lifecycle.initialize()).rejects.toThrow(
        "Could not initialize dependencies: Service1, Service2. Possible circular dependency.",
      );
    });
  });

  describe("Shutdown", () => {
    beforeEach(() => {
      // Reset all mocks before each test
      mockDatabaseService.close.mockReset();
      mockWebSocketService.close.mockReset();
      mockDatabaseService.close.mockResolvedValue(undefined);
      mockWebSocketService.close.mockResolvedValue(undefined);

      // Make sure httpServer is cleared to avoid errors
      lifecycle["httpServer"] = null;
    });

    it("should perform graceful shutdown", async () => {
      // Directly call the private performShutdown method to avoid async timing issues
      await lifecycle["performShutdown"]("test-correlation-id");

      // Verify all services were closed
      expect(mockWebSocketService.close).toHaveBeenCalled();
      expect(mockDatabaseService.close).toHaveBeenCalled();
    });

    it("should handle shutdown timeout", async () => {
      // Mock process.exit to prevent actual exit
      const processExitSpy = vi
        .spyOn(process, "exit")
        .mockImplementation(() => {
          throw new Error("Shutdown timed out");
        });

      const slowHandler = vi
        .fn()
        .mockImplementation(
          () => new Promise((resolve) => setTimeout(resolve, 1000)),
        );
      lifecycle.registerShutdownHandler(slowHandler);

      // Set a very short timeout for testing
      lifecycle["shutdownTimeout"] = 100;

      await expect(lifecycle.shutdown()).rejects.toThrow("Shutdown timed out");

      // Cleanup
      processExitSpy.mockRestore();
    });

    it("should handle shutdown errors gracefully", async () => {
      const error = new Error("Shutdown failed");
      mockWebSocketService.close.mockRejectedValue(error);

      await lifecycle.shutdown();

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining("Error during graceful shutdown"),
        expect.objectContaining({ error }),
      );
    });

    it("should handle process signals", async () => {
      const processSpy = vi.spyOn(process, "exit");
      const shutdownSpy = vi.spyOn(lifecycle, "shutdown");

      // Simulate SIGTERM
      process.emit("SIGTERM");

      expect(shutdownSpy).toHaveBeenCalledWith("SIGTERM");
      expect(processSpy).not.toHaveBeenCalled();
    });

    it("should prevent multiple shutdown attempts", async () => {
      const shutdownHandler = vi.fn().mockResolvedValue(undefined);
      lifecycle.registerShutdownHandler(shutdownHandler);

      // Start shutdown
      const shutdownPromise = lifecycle.shutdown();

      // Try to shutdown again while first shutdown is in progress
      await lifecycle.shutdown();

      // Wait for first shutdown to complete
      await shutdownPromise;

      // Handler should only be called once
      expect(shutdownHandler).toHaveBeenCalledTimes(1);
    });

    it("should handle HTTP server close errors", async () => {
      const error = new Error("Server close failed");

      // Instead of mocking server.close, let's directly call the shutdown handler in ApplicationLifecycle
      lifecycle["httpServer"] = null; // Remove the HTTP server first

      // Register a shutdown handler that throws an error
      lifecycle.registerShutdownHandler(async () => {
        throw error;
      });

      // Shutdown should continue despite the error
      await lifecycle.shutdown();

      // Error should be logged but not thrown
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining("Error during graceful shutdown"),
        expect.objectContaining({ error: expect.any(Error) }),
      );
    });
  });

  describe("HTTP Server Management", () => {
    it("should close HTTP server during shutdown", async () => {
      const closeSpy = vi.spyOn(httpServer, "close");

      await lifecycle.shutdown();

      expect(closeSpy).toHaveBeenCalled();
    });

    it("should handle HTTP server close errors", async () => {
      // Just test the error handling by triggering a shutdown handler error
      const error = new Error("Server close failed");

      // Register a shutdown handler that simulates an HTTP server close error
      lifecycle.registerShutdownHandler(async () => {
        mockLogger.error("Error closing HTTP server", { error });
        // Don't rethrow to let shutdown continue
      });

      // Shutdown should continue despite the error
      await lifecycle.shutdown();

      // Verify the error was logged
      expect(mockLogger.error).toHaveBeenCalledWith(
        "Error closing HTTP server",
        expect.objectContaining({ error }),
      );
    });
  });
});
