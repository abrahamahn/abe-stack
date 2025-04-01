import { describe, it, expect, beforeEach, vi } from "vitest";

import { ConfigService } from "@/server/infrastructure/config/ConfigService";
import { ServerConfigProvider } from "@/server/infrastructure/config/domain/ServerConfig";

// Mock ConfigService
vi.mock("@config/ConfigService");

describe("ServerConfig", () => {
  let configService: any;
  let serverConfigProvider: ServerConfigProvider;

  beforeEach(() => {
    configService = new ConfigService() as any;
    configService.get = vi
      .fn()
      .mockImplementation((_key, defaultValue) => defaultValue);
    configService.getNumber = vi
      .fn()
      .mockImplementation((_key, defaultValue) => defaultValue);
    configService.getBoolean = vi
      .fn()
      .mockImplementation((_key, defaultValue) => defaultValue);
    configService.getArray = vi.fn().mockReturnValue([]);
    configService.isDevelopment = vi.fn().mockReturnValue(false);
    configService.isProduction = vi.fn().mockReturnValue(false);
    configService.isTest = vi.fn().mockReturnValue(false);
    configService.ensureValid = vi.fn();
    serverConfigProvider = new ServerConfigProvider(configService);
  });

  it("should load server configuration with defaults", () => {
    // Verify default mocks are properly set up
    expect(configService.get).toHaveBeenCalled();
    expect(configService.getNumber).toHaveBeenCalled();
    expect(configService.getArray).toHaveBeenCalled();

    const config = serverConfigProvider.getConfig();

    expect(config).toEqual({
      port: 3003,
      host: "localhost",
      baseUrl: "http://localhost:3003",
      environment: "development",
      isDevelopment: false,
      isProduction: false,
      isTest: false,
      cors: {
        origin: "*",
        origins: [],
      },
      storagePath: "",
      tempPath: "",
    });
  });

  it("should validate configuration against schema on creation", () => {
    expect(configService.ensureValid).toHaveBeenCalledWith(
      expect.objectContaining({
        properties: {
          PORT: expect.any(Object),
          HOST: expect.any(Object),
          NODE_ENV: expect.any(Object),
          LOG_LEVEL: expect.any(Object),
          REQUEST_TIMEOUT: expect.any(Object),
          MAX_REQUEST_SIZE: expect.any(Object),
          COMPRESSION_ENABLED: expect.any(Object),
          COMPRESSION_LEVEL: expect.any(Object),
          KEEP_ALIVE_TIMEOUT: expect.any(Object),
          MAX_CONNECTIONS: expect.any(Object),
        },
      }),
    );
  });

  it("should use custom configuration values", () => {
    // Mock implementation for isDevelopment, isProduction, isTest
    configService.isDevelopment = vi.fn().mockReturnValue(false);
    configService.isProduction = vi.fn().mockReturnValue(true);
    configService.isTest = vi.fn().mockReturnValue(false);

    // Mock get and getNumber methods
    configService.get.mockImplementation((key: string, defaultValue?: any) => {
      switch (key) {
        case "HOST":
          return "127.0.0.1";
        case "BASE_URL":
          return "https://example.com";
        case "NODE_ENV":
          return "production";
        case "CORS_ORIGIN":
          return "https://example.com";
        case "STORAGE_PATH":
          return "/data/storage";
        case "TEMP_PATH":
          return "/data/temp";
        default:
          return defaultValue;
      }
    });

    configService.getNumber.mockImplementation(
      (key: string, defaultValue?: number) => {
        if (key === "PORT") {
          return 8080;
        }
        return defaultValue as number;
      },
    );

    configService.getArray.mockReturnValue([
      "https://app.example.com",
      "https://api.example.com",
    ]);

    // Re-initialize with mocked values
    serverConfigProvider = new ServerConfigProvider(configService);
    const config = serverConfigProvider.getConfig();

    expect(config).toEqual({
      port: 8080,
      host: "127.0.0.1",
      baseUrl: "https://example.com",
      environment: "production",
      isDevelopment: false,
      isProduction: true,
      isTest: false,
      cors: {
        origin: "https://example.com",
        origins: ["https://app.example.com", "https://api.example.com"],
      },
      storagePath: "/data/storage",
      tempPath: "/data/temp",
    });
  });

  it("should define proper configuration schema with validation", () => {
    const schema = serverConfigProvider.getConfigSchema();

    // Check basic schema definitions
    expect(schema.properties.PORT.type).toBe("number");
    expect(schema.properties.PORT.min).toBe(1);
    expect(schema.properties.PORT.max).toBe(65535);

    expect(schema.properties.HOST.type).toBe("string");

    expect(schema.properties.NODE_ENV.type).toBe("string");
    expect(schema.properties.NODE_ENV.enum).toContain("development");
    expect(schema.properties.NODE_ENV.enum).toContain("production");
    expect(schema.properties.NODE_ENV.enum).toContain("test");

    expect(schema.properties.LOG_LEVEL.type).toBe("string");
    expect(schema.properties.LOG_LEVEL.enum).toContain("error");
    expect(schema.properties.LOG_LEVEL.enum).toContain("warn");
    expect(schema.properties.LOG_LEVEL.enum).toContain("info");
    expect(schema.properties.LOG_LEVEL.enum).toContain("debug");
    expect(schema.properties.LOG_LEVEL.enum).toContain("trace");

    // Check timeout settings
    expect(schema.properties.REQUEST_TIMEOUT.type).toBe("number");
    expect(schema.properties.REQUEST_TIMEOUT.min).toBe(1000);

    expect(schema.properties.KEEP_ALIVE_TIMEOUT.type).toBe("number");
    expect(schema.properties.KEEP_ALIVE_TIMEOUT.min).toBe(1000);

    // Check compression settings
    expect(schema.properties.COMPRESSION_ENABLED.type).toBe("boolean");

    expect(schema.properties.COMPRESSION_LEVEL.type).toBe("number");
    expect(schema.properties.COMPRESSION_LEVEL.min).toBe(0);
    expect(schema.properties.COMPRESSION_LEVEL.max).toBe(9);

    // Check connection settings
    expect(schema.properties.MAX_CONNECTIONS.type).toBe("number");
    expect(schema.properties.MAX_CONNECTIONS.min).toBe(1);
  });
});
