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
      expect(mockLogger.debug).toHaveBeenCalledWith(
        "Unified ServerLogger initialized",
        {
          environment: "test",
          isDevelopment: false,
        }
      );
    });
  });

  describe("displayInfrastructureServices", () => {
    let consoleSpy: any;

    beforeEach(() => {
      consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      // Set environment variable to enable display in test environment
      process.env.SHOW_SERVER_STATUS = "true";
    });

    afterEach(() => {
      consoleSpy.mockRestore();
      delete process.env.SHOW_SERVER_STATUS;
    });

    it("should display infrastructure services status", () => {
      const mockServices = {
        logger: mockLogger,
        databaseService: { isConnected: () => true },
        cacheService: { isConnected: () => true },
        storageService: {},
        jobService: {},
        errorHandler: {},
        validationService: {},
        wss: { clients: { size: 5 } },
        pubSubService: {},
        imageProcessor: {},
        mediaProcessor: {},
        streamProcessor: {},
        storageProvider: {},
        config: {
          get: vi.fn(),
          storagePath: "/uploads",
        },
      };

      serverLogger.displayInfrastructureServices(mockServices);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Infrastructure Services")
      );
    });

    it("should handle disconnected database", () => {
      const servicesWithDisconnectedDB = {
        logger: mockLogger,
        databaseService: { isConnected: () => false },
        cacheService: { isConnected: () => false },
        storageService: null,
        jobService: null,
        errorHandler: null,
        validationService: null,
        wss: null,
        pubSubService: null,
        imageProcessor: null,
        mediaProcessor: null,
        streamProcessor: null,
        storageProvider: null,
        config: {
          get: vi.fn(),
        },
      };

      serverLogger.displayInfrastructureServices(servicesWithDisconnectedDB);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Connection failed - Check configuration")
      );
    });

    it("should handle errors gracefully", () => {
      const servicesWithError = {
        get logger() {
          throw new Error("Config error");
        },
      } as any;

      serverLogger.displayInfrastructureServices(servicesWithError);

      expect(mockLogger.error).toHaveBeenCalledWith(
        "Error displaying infrastructure services",
        expect.objectContaining({
          error: expect.any(String),
        })
      );
    });
  });

  describe("displayBusinessServices", () => {
    let consoleSpy: any;

    beforeEach(() => {
      consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      process.env.SHOW_SERVER_STATUS = "true";
    });

    afterEach(() => {
      consoleSpy.mockRestore();
      delete process.env.SHOW_SERVER_STATUS;
    });

    it("should display business services status", () => {
      const mockBusinessServices = {
        metricsService: {},
        emailService: {},
        tokenService: {},
        encryptionService: {},
        sessionService: {},
        messagingService: {},
      };

      serverLogger.displayBusinessServices(mockBusinessServices);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Business Services")
      );
    });
  });

  describe("displayConnectionInformation", () => {
    let consoleSpy: any;

    beforeEach(() => {
      consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      process.env.SHOW_SERVER_STATUS = "true";
    });

    afterEach(() => {
      consoleSpy.mockRestore();
      delete process.env.SHOW_SERVER_STATUS;
    });

    it("should display connection information", () => {
      const mockConfig = {
        get: vi.fn().mockImplementation((key: string) => {
          switch (key) {
            case "DB_HOST":
              return "localhost";
            case "DB_PORT":
              return 5432;
            case "DB_NAME":
              return "test_db";
            default:
              return undefined;
          }
        }),
      };

      serverLogger.displayConnectionInformation(3000, mockConfig);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Connection Information")
      );
    });

    it("should handle errors gracefully", () => {
      const mockConfig = {
        get: vi.fn().mockImplementation((key: string) => {
          switch (key) {
            case "DB_HOST":
              return "localhost";
            case "DB_PORT":
              return 5432;
            case "DB_NAME":
              return "test_db";
            default:
              return undefined;
          }
        }),
      };

      const configWithError = {
        ...mockConfig,
        get storagePath() {
          throw new Error("Storage path error");
        },
      };

      serverLogger.displayConnectionInformation(3000, configWithError);

      expect(mockLogger.error).toHaveBeenCalledWith(
        "Error displaying connection information",
        expect.objectContaining({
          error: expect.any(String),
        })
      );
    });
  });

  describe("displayServerStatus", () => {
    let consoleSpy: any;

    beforeEach(() => {
      consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      process.env.SHOW_SERVER_STATUS = "true";
    });

    afterEach(() => {
      consoleSpy.mockRestore();
      delete process.env.SHOW_SERVER_STATUS;
    });

    it("should display all service status tables and connection information", () => {
      const mockInfrastructureServices = {
        logger: mockLogger,
        databaseService: { isConnected: () => true },
        cacheService: { isConnected: () => true },
        storageService: {},
        jobService: {},
        errorHandler: {},
        validationService: {},
        wss: { clients: { size: 5 } },
        pubSubService: {},
        imageProcessor: {},
        mediaProcessor: {},
        streamProcessor: {},
        storageProvider: {},
        config: {
          get: vi.fn(),
          storagePath: "/uploads",
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

      serverLogger.displayServerStatus(
        3000,
        mockInfrastructureServices.config,
        mockInfrastructureServices,
        mockBusinessServices
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("ABE Stack Server Status")
      );
    });
  });
});
