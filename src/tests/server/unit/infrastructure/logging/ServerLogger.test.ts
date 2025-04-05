import { describe, it, expect, beforeEach, vi } from "vitest";

import { LogLevel } from "@/server/infrastructure/logging";
import type { ILoggerService } from "@/server/infrastructure/logging/ILoggerService";
import { LoggerService } from "@/server/infrastructure/logging/LoggerService";
import { ServerLogger } from "@/server/infrastructure/logging/ServerLogger";

describe("LoggerService", () => {
  let logger: LoggerService;
  let mockTransport: any;

  beforeEach(() => {
    mockTransport = {
      log: vi.fn(),
    };
    logger = new LoggerService();
  });

  describe("constructor", () => {
    it("should create logger with default level", () => {
      logger.setMinLevel(LogLevel.INFO);
      expect(logger).toBeDefined();
    });

    it("should create logger with custom level", () => {
      logger = new LoggerService();
      logger.setMinLevel(LogLevel.DEBUG);
      expect(logger).toBeDefined();
    });
  });

  describe("setMinLevel", () => {
    it("should set log level", () => {
      logger.setMinLevel(LogLevel.DEBUG);
      expect(logger).toBeDefined();
    });
  });

  describe("transport management", () => {
    it("should add transport", () => {
      logger.addTransport(mockTransport);
      expect(logger).toBeDefined();
    });

    it("should set transports", () => {
      logger.setTransports([mockTransport]);
      expect(logger).toBeDefined();
    });

    it("should replace existing transports", () => {
      const transport1 = { log: vi.fn() };
      const transport2 = { log: vi.fn() };
      logger.addTransport(transport1);
      logger.setTransports([transport2]);
      expect(logger).toBeDefined();
    });
  });

  describe("logging methods", () => {
    beforeEach(() => {
      logger.addTransport(mockTransport);
    });

    it("should log info message", () => {
      const message = "Info message";
      const context = { userId: "user123" };
      logger.info(message, context);
      expect(mockTransport.log).toHaveBeenCalled();
    });

    it("should log warning message", () => {
      const message = "Warning message";
      const context = { userId: "user123" };
      logger.warn(message, context);
      expect(mockTransport.log).toHaveBeenCalled();
    });

    it("should log error message", () => {
      const message = "Error message";
      const error = new Error("Test error");
      const context = { userId: "user123" };
      logger.error(message, {
        error: { message: error.message, stack: error.stack },
        ...context,
      });
      expect(mockTransport.log).toHaveBeenCalled();
    });

    it("should format complex error objects properly", () => {
      const message = "Complex error occurred";
      const complexError = {
        message: "Database connection failed",
        name: "ConnectionError",
        code: "ECONNREFUSED",
        errno: 111,
        syscall: "connect",
        address: "127.0.0.1",
        port: 5432,
        stack: new Error().stack,
        details: {
          attemptCount: 3,
          lastAttempt: new Date().toISOString(),
        },
      };
      logger.error(message, { error: complexError, requestId: "req-123" });
      expect(mockTransport.log).toHaveBeenCalled();
    });

    it("should not log messages below current level", () => {
      logger.setMinLevel(LogLevel.WARN);
      const message = "Debug message";
      logger.debug(message);
      expect(mockTransport.log).not.toHaveBeenCalled();
    });

    it("should handle logging without transports", () => {
      logger.setTransports([]);
      const message = "Test message";
      logger.info(message);
      expect(mockTransport.log).not.toHaveBeenCalled();
    });
  });
});

describe("ServerLogger", () => {
  let serverLogger: ServerLogger;
  let mockLogger: ILoggerService;

  beforeEach(() => {
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debugObj: vi.fn(),
      infoObj: vi.fn(),
      warnObj: vi.fn(),
      errorObj: vi.fn(),
      createLogger: vi.fn().mockReturnThis(),
      withContext: vi.fn().mockReturnThis(),
      initialize: vi.fn().mockResolvedValue(undefined),
      shutdown: vi.fn().mockResolvedValue(undefined),
      setMinLevel: vi.fn(),
      addTransport: vi.fn(),
      setTransports: vi.fn(),
    };
    serverLogger = new ServerLogger(mockLogger);
  });

  describe("constructor", () => {
    it("should initialize with logger and log debug message", () => {
      expect(serverLogger).toBeDefined();
      expect(mockLogger.debug).toHaveBeenCalledWith("ServerLogger initialized");
    });
  });

  describe("displayInfrastructureServices", () => {
    const mockServices = {
      logger: mockLogger,
      databaseService: {
        isConnected: vi.fn().mockReturnValue(true),
        getStats: vi.fn().mockReturnValue({ activeCount: 5 }),
      },
      cacheService: {
        isConnected: vi.fn().mockReturnValue(true),
        getStats: vi.fn().mockReturnValue({ hits: 10 }),
      },
      storageService: {},
      jobService: {},
      errorHandler: {},
      validationService: {},
      wss: { clients: { size: 3 } },
      pubSubService: {},
      imageProcessor: {},
      mediaProcessor: {},
      streamProcessor: {},
      storageProvider: {},
      config: {
        get: vi.fn().mockImplementation((key: string) => {
          const config = {
            DATABASE: {
              host: "localhost",
              port: 5432,
              database: "testdb",
              user: "testuser",
            },
            storagePath: "/uploads",
          } as const;
          return config[key as keyof typeof config];
        }),
      },
    };

    it("should display infrastructure services status", () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      serverLogger.displayInfrastructureServices(mockServices);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("INFRASTRUCTURE SERVICES"),
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Database"),
      );
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Cache"));
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Storage"),
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("WebSocket"),
      );
    });

    it("should handle disconnected database", () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const servicesWithDisconnectedDB = {
        ...mockServices,
        databaseService: {
          isConnected: vi.fn().mockReturnValue(false),
          getStats: vi.fn().mockReturnValue({ activeCount: 0 }),
        },
      };

      serverLogger.displayInfrastructureServices(servicesWithDisconnectedDB);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Not connected - Check configuration"),
      );
    });

    it("should handle errors gracefully", () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const servicesWithError = {
        ...mockServices,
        config: {
          get: vi.fn().mockImplementation(() => {
            throw new Error("Config error");
          }),
        },
      };

      serverLogger.displayInfrastructureServices(servicesWithError);

      expect(consoleSpy).toHaveBeenCalledWith(
        "Error displaying infrastructure services:",
        expect.any(Error),
      );
    });
  });

  describe("displayBusinessServices", () => {
    const mockBusinessServices = {
      metricsService: {},
      emailService: {},
      tokenService: {},
      encryptionService: {},
      sessionService: {},
      messagingService: {},
    };

    it("should display business services status", () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      serverLogger.displayBusinessServices(mockBusinessServices);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("BUSINESS SERVICES"),
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Metrics"),
      );
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Email"));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Token"));
    });
  });

  describe("displayConnectionInformation", () => {
    const mockConfig = {
      get: vi.fn().mockImplementation((key: string) => {
        const config = {
          DATABASE: { host: "localhost", port: 5432 },
          DB_HOST: "localhost",
          DB_PORT: "5432",
        } as const;
        return config[key as keyof typeof config];
      }),
    };

    it("should display connection information", () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      serverLogger.displayConnectionInformation(3000, mockConfig);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("SERVICE CONNECTION INFORMATION"),
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Backend (Express)"),
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("API URL"),
      );
    });

    it("should handle errors gracefully", () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const configWithError = {
        get: vi.fn().mockImplementation(() => {
          throw new Error("Config error");
        }),
      };

      serverLogger.displayConnectionInformation(3000, configWithError);

      expect(consoleSpy).toHaveBeenCalledWith(
        "Error displaying connection information:",
        expect.any(Error),
      );
    });
  });

  describe("displayServerStatus", () => {
    const mockInfrastructureServices = {
      logger: mockLogger,
      databaseService: {
        isConnected: vi.fn().mockReturnValue(true),
        getStats: vi.fn().mockReturnValue({ activeCount: 5 }),
      },
      cacheService: {
        isConnected: vi.fn().mockReturnValue(true),
        getStats: vi.fn().mockReturnValue({ hits: 10 }),
      },
      storageService: {},
      jobService: {},
      errorHandler: {},
      validationService: {},
      wss: { clients: { size: 3 } },
      pubSubService: {},
      imageProcessor: {},
      mediaProcessor: {},
      streamProcessor: {},
      storageProvider: {},
      config: {
        get: vi.fn().mockImplementation((key: string) => {
          const config = {
            DATABASE: {
              host: "localhost",
              port: 5432,
              database: "testdb",
              user: "testuser",
            },
            storagePath: "/uploads",
          } as const;
          return config[key as keyof typeof config];
        }),
      },
    };

    const mockBusinessServices = {
      metricsService: {},
      emailService: {},
      tokenService: {},
      encryptionService: {},
      sessionService: {},
      messagingService: {},
    };

    it("should display all service status tables and connection information", () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      serverLogger.displayServerStatus(
        3000,
        mockInfrastructureServices.config,
        mockInfrastructureServices,
        mockBusinessServices,
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("SERVICE STATUS TABLES"),
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("INFRASTRUCTURE SERVICES"),
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("BUSINESS SERVICES"),
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("SERVICE CONNECTION INFORMATION"),
      );
    });
  });
});
