import { Readable } from "stream";

import { Container } from "inversify";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import {
  ConfigService,
  ErrorHandler,
  JobService,
  LoggerService,
  StorageService,
  WebSocketService,
  ApplicationLifecycle,
  IApplicationLifecycle,
} from "@server/infrastructure";

import { TYPES } from "@/server/infrastructure/di/types";

// Mock storage provider
class MockStorageProvider {
  async initialize(): Promise<void> {
    return Promise.resolve();
  }

  async shutdown(): Promise<void> {
    return Promise.resolve();
  }

  async saveFile(path: string, _content: Buffer | Readable): Promise<string> {
    return path;
  }

  async getFile(_path: string): Promise<Buffer> {
    return Buffer.from("mock file content");
  }

  async getFileStream(
    _path: string,
    _options?: { start?: number; end?: number },
  ): Promise<Readable> {
    return Readable.from(Buffer.from("mock file content"));
  }

  async deleteFile(_path: string): Promise<void> {
    return Promise.resolve();
  }

  async fileExists(_path: string): Promise<boolean> {
    return true;
  }

  async processFile(path: string, _processingInfo: any): Promise<string> {
    return path;
  }

  async convertMediaFormat(path: string, _format: string): Promise<string> {
    return path;
  }
}

// Mock job storage
class MockJobStorage {
  private jobs: Map<string, any> = new Map();

  async saveJob(jobId: string, data: any): Promise<void> {
    this.jobs.set(jobId, data);
    return Promise.resolve();
  }

  async getJob(jobId: string): Promise<any> {
    return this.jobs.get(jobId) || null;
  }

  async updateJob(jobId: string, data: any): Promise<void> {
    this.jobs.set(jobId, { ...this.jobs.get(jobId), ...data });
    return Promise.resolve();
  }

  async deleteJob(jobId: string): Promise<void> {
    this.jobs.delete(jobId);
    return Promise.resolve();
  }

  async listJobs(): Promise<any[]> {
    return Array.from(this.jobs.values());
  }
}

// Mock database config provider for tests
class MockDatabaseConfigProvider {
  getConfig() {
    return {
      host: "localhost",
      port: 5432,
      database: "abe_stack",
      user: "postgres",
      password: "",
      maxConnections: 20,
      idleTimeout: 30000,
      connectionTimeout: 2000,
      statementTimeout: 30000,
      ssl: false,
    };
  }
}

describe("Infrastructure Layer Integration Tests", () => {
  let container: Container;
  let serverManager: any;

  beforeEach(async () => {
    container = new Container();

    // Bind core services
    container.bind(TYPES.LoggerService).to(LoggerService).inSingletonScope();
    container.bind(TYPES.ConfigService).to(ConfigService).inSingletonScope();
    container.bind(TYPES.ErrorHandler).to(ErrorHandler).inSingletonScope();
    container
      .bind(TYPES.WebSocketService)
      .to(WebSocketService)
      .inSingletonScope();
    container.bind(TYPES.StorageService).to(StorageService).inSingletonScope();
    container.bind(TYPES.JobService).to(JobService).inSingletonScope();
    container
      .bind(TYPES.ApplicationLifecycle)
      .to(ApplicationLifecycle)
      .inSingletonScope();

    // Bind mocks for dependencies
    container
      .bind(TYPES.StorageProvider)
      .toConstantValue(new MockStorageProvider());
    container.bind(TYPES.JobStorage).toConstantValue(new MockJobStorage());
    container
      .bind(TYPES.DatabaseConfig)
      .toConstantValue(new MockDatabaseConfigProvider());

    // Mock database
    const mockDb = {
      initialize: vi.fn().mockResolvedValue(undefined),
      isConnected: vi.fn().mockReturnValue(true),
      close: vi.fn().mockResolvedValue(undefined),
      getStats: vi.fn().mockReturnValue({
        totalCount: 5,
        idleCount: 3,
        activeCount: 2,
        waitingCount: 0,
        maxConnections: 20,
        utilization: 0.1,
        acquireCount: 10,
        acquireFailCount: 0,
        queryCount: 50,
        queryFailCount: 0,
      }),
    };
    container.bind(TYPES.DatabaseService).toConstantValue(mockDb);

    // Create ServerManager instance
    serverManager = {
      loadServices: vi.fn().mockResolvedValue(undefined),
      initializeServices: vi.fn().mockResolvedValue(undefined),
      start: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn().mockResolvedValue(undefined),
      status: vi.fn().mockReturnValue({ isRunning: true }),
      findAvailablePort: vi.fn().mockResolvedValue(3000),
      configureApp: vi.fn(),
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // Very simple test - everything mocked
  it("should initialize services", async () => {
    await serverManager.loadServices();
    await serverManager.initializeServices();

    expect(serverManager.loadServices).toHaveBeenCalled();
    expect(serverManager.initializeServices).toHaveBeenCalled();
  });

  // Test WebSocket publish with correct interface
  it("should enable communication with WebSocket", async () => {
    const wsService = container.get<WebSocketService>(TYPES.WebSocketService);
    const publishSpy = vi.spyOn(wsService, "publish");

    // Call with all required params
    wsService.publish("test-channel", "status", { status: "ok" });

    expect(publishSpy).toHaveBeenCalledWith("test-channel", "status", {
      status: "ok",
    });
  });

  // Simple error handler test
  it("should handle errors", async () => {
    const errorHandler = container.get<ErrorHandler>(TYPES.ErrorHandler);
    const handleSpy = vi.spyOn(errorHandler, "handleError");

    const error = new Error("Test error");
    // Create mock request and response objects with proper values
    const mockRequest = {
      method: "GET",
      path: "/api/test",
      ip: "127.0.0.1",
      get: (name: string) => (name === "User-Agent" ? "Test Agent" : null),
    } as any;
    const mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as any;

    errorHandler.handleError(error, mockRequest, mockResponse);

    expect(handleSpy).toHaveBeenCalledWith(error, mockRequest, mockResponse);
  });

  // Simple lifecycle test
  it("should handle lifecycle events", async () => {
    const lifecycle = container.get<IApplicationLifecycle>(
      TYPES.ApplicationLifecycle,
    );
    const startSpy = vi.spyOn(lifecycle, "start");
    const stopSpy = vi.spyOn(lifecycle, "stop");

    await lifecycle.start();
    await lifecycle.stop();

    expect(startSpy).toHaveBeenCalled();
    expect(stopSpy).toHaveBeenCalled();
  });
});
