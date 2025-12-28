import { EventEmitter } from "events";
import fs from "fs";
import http from "http";
import path from "path";

import { Request, Response, NextFunction } from "express";
import { Container } from "inversify";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import {
  ConfigService,
  ErrorHandler,
  LoggerService,
  ILoggerService,
  StorageService,
} from "@server/infrastructure";
import { ServerManager } from "@server/infrastructure/server/ServerManager";

import { TYPES } from "@/server/infrastructure/di/types";

// Mock DatabaseServer implementation
class MockDatabaseServer {
  private connected = true;

  async initialize(): Promise<void> {
    return Promise.resolve();
  }

  async shutdown(): Promise<void> {
    this.connected = false;
    return Promise.resolve();
  }

  isConnected(): boolean {
    return this.connected;
  }

  getConnection(): any {
    return {};
  }

  getStats(): any {
    return { activeCount: 5, totalCount: 10, idleCount: 5 };
  }
}

// Mock DatabaseConfig to use abe_stack database
class MockDatabaseConfigProvider {
  getConfig(): any {
    return {
      host: "localhost",
      port: 5432,
      database: "abe_stack", // Using the actual database instead of abe_stack_test
      user: "postgres",
      password: "",
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    };
  }
}

// Mock CacheService implementation
class MockCacheService {
  private connected = true;

  async initialize(): Promise<void> {
    return Promise.resolve();
  }

  async shutdown(): Promise<void> {
    this.connected = false;
    return Promise.resolve();
  }

  isConnected(): boolean {
    return this.connected;
  }

  getStats(): any {
    return { hits: 100, misses: 20 };
  }

  // Add the minimal methods needed
  set(_key: string, _value: any, _ttl?: number): Promise<void> {
    return Promise.resolve();
  }

  get(_key: string): Promise<any> {
    return Promise.resolve(null);
  }

  delete(_key: string): Promise<void> {
    return Promise.resolve();
  }
}

// Mock CSRF token middleware
const mockCSRFToken = vi.fn().mockImplementation((options: any) => {
  return (_req: Request, res: Response, next: NextFunction) => {
    // Add token to res.locals
    res.locals.csrfToken = "mock-csrf-token";

    // Set CSRF cookie
    if (options?.cookieName) {
      res.cookie(options.cookieName, "mock-csrf-token");
    }
    next();
  };
});

// Mock CSRF protection middleware
const mockCSRFProtection = vi.fn().mockImplementation((options: any) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Check for token in headers, cookies or body
    const token =
      req.headers["x-csrf-token"] ||
      (req.cookies && req.cookies[options?.cookieName]) ||
      (req.body && req.body._csrf);

    // Check for ignore paths
    if (options?.ignorePaths && options.ignorePaths.includes(req.path)) {
      return next();
    }

    if (!token) {
      return res.status(403).json({ error: "CSRF token missing" });
    }

    if (token !== "mock-csrf-token") {
      return res.status(403).json({ error: "Invalid CSRF token" });
    }

    next();
  };
});

// Mock security service
const mockSecurityService = {
  csrfToken: mockCSRFToken,
  csrfProtection: mockCSRFProtection,
};

// Mock cookie parser middleware
const mockCookieParser = vi.fn().mockImplementation(() => {
  return (req: Request, _res: Response, next: NextFunction) => {
    req.cookies = req.headers.cookie
      ? req.headers.cookie
          .split(";")
          .reduce((cookies: Record<string, string>, cookie: string) => {
            const parts = cookie.trim().split("=");
            cookies[parts[0]] = parts[1];
            return cookies;
          }, {})
      : {};
    next();
  };
});

// Mock rate limiter middleware
const mockRateLimiter = vi.fn().mockImplementation(() => {
  return (_req: Request, _res: Response, next: NextFunction) => {
    next();
  };
});

// Mock storage provider
const mockStorageProvider = {
  initialize: vi.fn().mockResolvedValue(undefined),
  saveFile: vi.fn(),
  getFileUrl: vi.fn(),
  deleteFile: vi.fn(),
};

// Mock job storage
const mockJobStorage = {
  initialize: vi.fn().mockResolvedValue(undefined),
  saveJob: vi.fn(),
  getJob: vi.fn(),
  updateJob: vi.fn(),
  deleteJob: vi.fn(),
};

// Mock JobService
class MockJobService {
  async initialize(): Promise<void> {
    return Promise.resolve();
  }

  async shutdown(): Promise<void> {
    return Promise.resolve();
  }

  enqueue(__payload: any, _options?: any): Promise<string> {
    return Promise.resolve("mock-job-id");
  }

  getStats(): any {
    return { jobsProcessed: 10, jobsQueued: 2 };
  }
}

// SERVER TEST SUITE
describe("Server Infrastructure Integration Tests", () => {
  let container: Container;
  let logger: ILoggerService;
  let config: {
    port: number;
    host: string;
    isProduction: boolean;
    storagePath: string;
  };
  let tempStoragePath: string;

  // Set up mocks for http.Server and WebSocketServer
  let mockHttpServer: any;
  let mockWss: any;
  let mockCreateServer: any;
  let serverManager: ServerManager;

  beforeEach(async () => {
    // Reset mocks
    vi.clearAllMocks();

    // Create mock server
    mockHttpServer = {
      listen: vi.fn().mockImplementation((_port: number, callback: any) => {
        if (callback) callback();
        return mockHttpServer;
      }),
      close: vi.fn().mockImplementation((callback) => {
        if (callback) callback(null);
        return mockHttpServer;
      }),
      on: vi.fn(),
      once: vi.fn().mockImplementation((event, callback) => {
        if (event === "listening") {
          // Simulate the server is listening
          setTimeout(() => callback(), 0);
        }
        return mockHttpServer;
      }),
      address: vi.fn().mockReturnValue({ port: 8080 }),
    };

    // Create mock WebSocketServer
    mockWss = {
      close: vi.fn(),
      on: vi.fn(),
      clients: new Set(),
    };

    // Setup http.createServer mock
    mockCreateServer = vi
      .spyOn(http, "createServer")
      .mockReturnValue(mockHttpServer);

    // Setup DI container
    container = new Container();

    // Bind core services with mocks
    container.bind(TYPES.LoggerService).to(LoggerService);
    container.bind(TYPES.ConfigService).to(ConfigService);
    container
      .bind(TYPES.DatabaseConfig)
      .toConstantValue(new MockDatabaseConfigProvider());
    container
      .bind(TYPES.DatabaseService)
      .toConstantValue(new MockDatabaseServer());
    container.bind(TYPES.CacheService).toConstantValue(new MockCacheService());
    container.bind(TYPES.StorageService).to(StorageService);
    container.bind(TYPES.ErrorHandler).to(ErrorHandler);
    container.bind(TYPES.JobService).toConstantValue(new MockJobService());

    // Bind missing providers
    container.bind(TYPES.StorageProvider).toConstantValue(mockStorageProvider);
    container.bind(TYPES.JobStorage).toConstantValue(mockJobStorage);
    container.bind(TYPES.JobServiceConfig).toConstantValue({
      maxRetries: 3,
      retryDelayMs: 1000,
      jobExpirationMs: 86400000,
    });

    // Bind security-related services for testing CSRF
    const securityServiceSymbol = Symbol.for("SecurityService");
    container.bind(securityServiceSymbol).toConstantValue(mockSecurityService);

    const cookieParserSymbol = Symbol.for("CookieParser");
    container.bind(cookieParserSymbol).toConstantValue(mockCookieParser);

    const rateLimiterSymbol = Symbol.for("RateLimiter");
    container.bind(rateLimiterSymbol).toConstantValue(mockRateLimiter);

    // Get logger instance
    logger = container.get<ILoggerService>(TYPES.LoggerService);

    // Create temporary storage path
    tempStoragePath = path.join(__dirname, "temp_storage");
    if (!fs.existsSync(tempStoragePath)) {
      fs.mkdirSync(tempStoragePath, { recursive: true });
    }

    // Setup server config
    config = {
      port: 8080,
      host: "localhost",
      isProduction: false,
      storagePath: tempStoragePath,
    };

    // Create ServerManager instance
    serverManager = new ServerManager(logger, container);

    // Replace the WebSocketServer property with our mock
    Object.defineProperty(serverManager, "wss", {
      value: mockWss,
      writable: true,
    });
  });

  afterEach(async () => {
    // Cleanup: Remove temp directory
    if (fs.existsSync(tempStoragePath)) {
      fs.rmSync(tempStoragePath, { recursive: true, force: true });
    }

    // Restore all mocks
    vi.restoreAllMocks();
  });

  // SIMPLIFIED TESTS
  describe("Server Initialization", () => {
    it("should initialize server with services", async () => {
      await serverManager.initialize(config);
      expect(mockHttpServer.listen).toHaveBeenCalled();
    });
  });

  describe("Port Management", () => {
    it("should find an available port", async () => {
      // Create a custom mock for port checking
      const portCheckServer = new EventEmitter() as unknown as http.Server;
      portCheckServer.listen = vi
        .fn()
        .mockImplementation((_port: number, callback: any) => {
          portCheckServer.emit("listening");
          if (callback) callback();
          return portCheckServer;
        });
      portCheckServer.close = vi.fn().mockImplementation((callback) => {
        if (callback) callback(null);
        return portCheckServer;
      });
      portCheckServer.once = vi.fn().mockImplementation((event, callback) => {
        if (event === "listening") {
          // Simulate the server is listening
          setTimeout(() => callback(), 0);
        }
        return portCheckServer;
      });

      // Temporarily replace our mock with the port check mock
      mockCreateServer.mockReturnValueOnce(portCheckServer);

      const port = await serverManager.findAvailablePort(3000);
      expect(port).toBe(3000);
      expect(portCheckServer.listen).toHaveBeenCalled();
    });
  });

  describe("Middleware Configuration", () => {
    it("should configure CSRF token middleware", async () => {
      // Create mock server that just accepts the middleware without actually running it
      await serverManager.initialize(config);
      expect(mockCSRFToken).toHaveBeenCalled();
    });
  });
});
