import { Server } from "http";

import { Container } from "inversify";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import type { IDatabaseServer } from "@/server/infrastructure/database";
import { TYPES } from "@/server/infrastructure/di/types";
import {
  ApplicationLifecycle,
  IApplicationLifecycle,
} from "@/server/infrastructure/lifecycle";
import type { ILoggerService } from "@/server/infrastructure/logging";
import type { IWebSocketService } from "@/server/infrastructure/pubsub";

describe("Application Lifecycle Integration Tests", () => {
  let container: Container;
  let lifecycle: IApplicationLifecycle;
  let mockLogger: any;
  let mockWebSocketService: any;
  let mockDatabaseService: any;
  let mockHttpServer: any;

  beforeEach(() => {
    // Setup mock logger
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      createLogger: vi.fn().mockReturnThis(),
      withContext: vi.fn().mockReturnThis(),
      debugObj: vi.fn(),
      infoObj: vi.fn(),
      warnObj: vi.fn(),
      errorObj: vi.fn(),
      addTransport: vi.fn(),
      setTransports: vi.fn(),
      setMinLevel: vi.fn(),
      initialize: vi.fn().mockResolvedValue(undefined),
      shutdown: vi.fn().mockResolvedValue(undefined),
    };

    // Setup mock WebSocket service
    mockWebSocketService = {
      initialize: vi.fn().mockResolvedValue(undefined),
      shutdown: vi.fn().mockResolvedValue(undefined),
    };

    // Setup mock database service
    mockDatabaseService = {
      initialize: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
    };

    // Setup mock HTTP server
    mockHttpServer = {
      close: vi.fn().mockImplementation((callback) => callback()),
      listening: true,
    };

    // Setup DI container
    container = new Container();
    container
      .bind<ILoggerService>(TYPES.LoggerService)
      .toConstantValue(mockLogger);
    container
      .bind<IWebSocketService>(TYPES.WebSocketService)
      .toConstantValue(mockWebSocketService);
    container
      .bind<IDatabaseServer>(TYPES.DatabaseService)
      .toConstantValue(mockDatabaseService);
    container
      .bind<IApplicationLifecycle>(TYPES.ApplicationLifecycle)
      .to(ApplicationLifecycle)
      .inSingletonScope();

    // Get lifecycle instance
    lifecycle = container.get<IApplicationLifecycle>(
      TYPES.ApplicationLifecycle,
    );
  });

  afterEach(async () => {
    await lifecycle.stop();
  });

  describe("Dependency Management", () => {
    it("should initialize dependencies in correct order", async () => {
      const initOrder: string[] = [];

      // Register dependencies with different orders
      lifecycle.register("ServiceA", [], {
        start: async () => {
          initOrder.push("ServiceA");
        },
      });

      lifecycle.register("ServiceB", ["ServiceA"], {
        start: async () => {
          initOrder.push("ServiceB");
        },
      });

      lifecycle.register("ServiceC", ["ServiceB"], {
        start: async () => {
          initOrder.push("ServiceC");
        },
      });

      await lifecycle.start();

      expect(initOrder).toEqual(["ServiceA", "ServiceB", "ServiceC"]);
    });

    it("should detect circular dependencies", async () => {
      // Create circular dependency
      lifecycle.register("ServiceA", ["ServiceB"], {
        start: async () => {},
      });

      lifecycle.register("ServiceB", ["ServiceA"], {
        start: async () => {},
      });

      await expect(lifecycle.start()).rejects.toThrow(/circular dependency/i);
    });

    it("should handle dependency failures", async () => {
      lifecycle.register("FailingService", [], {
        start: async () => {
          throw new Error("Service failed to start");
        },
      });

      await expect(lifecycle.start()).rejects.toThrow(
        "Service failed to start",
      );
    });
  });

  describe("Shutdown Process", () => {
    it("should shutdown dependencies in reverse order", async () => {
      const shutdownOrder: string[] = [];

      lifecycle.register("ServiceA", [], {
        stop: async () => {
          shutdownOrder.push("ServiceA");
        },
      });

      lifecycle.register("ServiceB", ["ServiceA"], {
        stop: async () => {
          shutdownOrder.push("ServiceB");
        },
      });

      await lifecycle.start();
      await lifecycle.stop();

      expect(shutdownOrder).toEqual(["ServiceB", "ServiceA"]);
    });

    it("should handle shutdown timeouts", async () => {
      lifecycle.register("SlowService", [], {
        stop: async () => {
          await new Promise((resolve) => setTimeout(resolve, 5000));
        },
      });

      await lifecycle.start();
      await lifecycle.stop();

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringMatching(/timeout/i),
        expect.any(Object),
      );
    });

    it("should execute custom shutdown handlers", async () => {
      const handlerMock = vi.fn();
      lifecycle.registerShutdownHandler(handlerMock);

      await lifecycle.start();
      await lifecycle.stop();

      expect(handlerMock).toHaveBeenCalled();
    });
  });

  describe("HTTP Server Integration", () => {
    it("should handle HTTP server shutdown", async () => {
      lifecycle.setHttpServer(mockHttpServer as Server);

      await lifecycle.start();
      await lifecycle.stop();

      expect(mockHttpServer.close).toHaveBeenCalled();
    });

    it("should handle HTTP server errors during shutdown", async () => {
      mockHttpServer.close = vi.fn().mockImplementation((callback) => {
        callback(new Error("Server close error"));
      });

      lifecycle.setHttpServer(mockHttpServer as Server);

      await lifecycle.start();
      await lifecycle.stop();

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringMatching(/server close error/i),
        expect.any(Object),
      );
    });
  });

  describe("Process Signal Handling", () => {
    it("should handle SIGTERM signal", async () => {
      const stopSpy = vi.spyOn(lifecycle, "stop");

      // Simulate SIGTERM signal
      process.emit("SIGTERM");

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringMatching(/sigterm/i),
        expect.any(Object),
      );
      expect(stopSpy).toHaveBeenCalled();
    });

    it("should handle SIGINT signal", async () => {
      const stopSpy = vi.spyOn(lifecycle, "stop");

      // Simulate SIGINT signal
      process.emit("SIGINT");

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringMatching(/sigint/i),
        expect.any(Object),
      );
      expect(stopSpy).toHaveBeenCalled();
    });

    it("should handle uncaught exceptions", async () => {
      const stopSpy = vi.spyOn(lifecycle, "stop");

      // Simulate uncaught exception
      process.emit("uncaughtException", new Error("Test error"));

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringMatching(/uncaughtException/i),
        expect.any(Object),
      );
      expect(stopSpy).toHaveBeenCalled();
    });
  });

  describe("Error Recovery", () => {
    it("should handle database initialization failures", async () => {
      mockDatabaseService.initialize.mockRejectedValueOnce(
        new Error("Database error"),
      );

      await expect(lifecycle.start()).rejects.toThrow("Database error");
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it("should handle service initialization retries", async () => {
      let attempts = 0;
      lifecycle.register("RetryService", [], {
        start: async () => {
          attempts++;
          if (attempts === 1) {
            throw new Error("First attempt failed");
          }
        },
      });

      await lifecycle.start();
      expect(attempts).toBe(2);
    });

    it("should handle partial initialization rollback", async () => {
      const rollbackMock = vi.fn();

      // Register a successful service
      lifecycle.register("SuccessService", [], {
        start: async () => {},
        stop: rollbackMock,
      });

      // Register a failing service
      lifecycle.register("FailingService", ["SuccessService"], {
        start: async () => {
          throw new Error("Service failed");
        },
      });

      await expect(lifecycle.start()).rejects.toThrow("Service failed");
      expect(rollbackMock).toHaveBeenCalled();
    });
  });
});
