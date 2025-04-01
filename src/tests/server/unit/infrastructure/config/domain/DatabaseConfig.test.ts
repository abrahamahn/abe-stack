import { describe, it, expect, beforeEach, vi } from "vitest";

import { ConfigService } from "@/server/infrastructure/config/ConfigService";
import { DatabaseConfigProvider } from "@/server/infrastructure/config/domain/DatabaseConfig";
import { ConfigValidationError } from "@/server/infrastructure/errors/infrastructure/ConfigValidationError";

// Mock ConfigService
vi.mock("@config/ConfigService");
const MockConfigService = vi.mocked(ConfigService);

describe("DatabaseConfigProvider", () => {
  let configService: any;
  let dbConfigProvider: DatabaseConfigProvider;

  beforeEach(() => {
    // Reset mocks
    MockConfigService.mockClear();

    // Set up default configuration values
    configService = new MockConfigService() as any;
    configService.get.mockImplementation(
      (key: string, defaultValue?: string) => {
        const defaults: Record<string, string> = {
          DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/test_db",
          DB_HOST: "localhost",
          DB_NAME: "test_db",
          DB_USER: "postgres",
          DB_PASSWORD: "postgres",
        };
        return defaults[key] || defaultValue;
      },
    );

    configService.getNumber.mockImplementation(
      (key: string, defaultValue?: number) => {
        const defaults: Record<string, number> = {
          DB_PORT: 5432,
          DB_MAX_CONNECTIONS: 20,
          DB_IDLE_TIMEOUT: 30000,
          DB_CONNECTION_TIMEOUT: 5000,
          DB_STATEMENT_TIMEOUT: 30000,
          DB_METRICS_MAX_SAMPLES: 1000,
        };
        return defaults[key] ?? defaultValue ?? 0;
      },
    );

    configService.getBoolean.mockImplementation(
      (key: string, defaultValue?: boolean) => {
        const defaults: Record<string, boolean> = {
          DB_SSL: false,
        };
        return defaults[key] ?? defaultValue ?? false;
      },
    );

    // Mock getString method if it exists
    configService.getString = vi
      .fn()
      .mockImplementation((key: string, defaultValue?: string) => {
        const result = configService.get(key, defaultValue);
        return String(result || "");
      });

    // Mock validate to return a successful validation result
    configService.validate = vi.fn().mockReturnValue({
      valid: true,
      errors: [],
      values: {
        DB_HOST: "localhost",
        DB_PORT: 5432,
        DB_NAME: "test_db",
        DB_USER: "postgres",
        DB_PASSWORD: "postgres",
        DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/test_db",
      },
    });

    // Mock ensureValid to do nothing
    configService.ensureValid = vi.fn();

    // Create provider
    dbConfigProvider = new DatabaseConfigProvider(configService);
  });

  it("should load database configuration with defaults", () => {
    const config = dbConfigProvider.getConfig();

    expect(config).toEqual({
      connectionString: "postgresql://postgres:postgres@localhost:5432/test_db",
      host: "localhost",
      port: 5432,
      database: "test_db",
      user: "postgres",
      password: "postgres",
      maxConnections: 20,
      idleTimeout: 30000,
      connectionTimeout: 5000,
      statementTimeout: 30000,
      ssl: false,
      metricsMaxSamples: 1000,
    });
  });

  it("should validate configuration against schema on creation", () => {
    // Get the config to trigger validation
    dbConfigProvider.getConfig();

    // Assert that ensureValid was called with the right schema
    expect(configService.ensureValid).toHaveBeenCalledWith(
      expect.objectContaining({
        properties: expect.objectContaining({
          DATABASE_URL: expect.any(Object),
          DB_CONNECTION_TIMEOUT: expect.any(Object),
          DB_HOST: expect.any(Object),
          DB_IDLE_TIMEOUT: expect.any(Object),
          DB_MAX_CONNECTIONS: expect.any(Object),
          DB_METRICS_MAX_SAMPLES: expect.any(Object),
          DB_NAME: expect.any(Object),
          DB_PASSWORD: expect.any(Object),
          DB_PORT: expect.any(Object),
          DB_SSL: expect.any(Object),
          DB_STATEMENT_TIMEOUT: expect.any(Object),
          DB_USER: expect.any(Object),
        }),
      }),
    );
  });

  it("should throw when configuration is invalid", () => {
    // Setup the mock to simulate validation failure
    configService.ensureValid.mockImplementation(() => {
      throw new ConfigValidationError("Configuration validation failed", [
        "DATABASE_URL is invalid",
      ]);
    });

    // Expect the getConfig call to throw, not the constructor
    expect(() => dbConfigProvider.getConfig()).toThrow(ConfigValidationError);
  });

  it("should use custom configuration values", () => {
    // Change the mock to return different values
    configService.get.mockImplementation(
      (key: string, defaultValue?: string) => {
        const values: Record<string, string> = {
          DATABASE_URL: "postgresql://user:pass@custom-host:6000/custom_db",
          DB_HOST: "custom-host",
          DB_NAME: "custom_db",
          DB_USER: "user",
          DB_PASSWORD: "pass",
        };
        return values[key] || defaultValue;
      },
    );

    configService.getNumber.mockImplementation(
      (key: string, defaultValue?: number) => {
        const values: Record<string, number> = {
          DB_PORT: 6000,
          DB_MAX_CONNECTIONS: 50,
          DB_IDLE_TIMEOUT: 60000,
        };
        return values[key] ?? defaultValue ?? 0;
      },
    );

    configService.getBoolean.mockImplementation(
      (key: string, defaultValue?: boolean) => {
        const values: Record<string, boolean> = {
          DB_SSL: true,
        };
        return values[key] ?? defaultValue ?? false;
      },
    );

    // Update getString as well
    if (configService.getString) {
      configService.getString = vi
        .fn()
        .mockImplementation((key: string, defaultValue?: string) => {
          const result = configService.get(key, defaultValue);
          return String(result || "");
        });
    }

    // Create a new provider with the modified configuration
    const customProvider = new DatabaseConfigProvider(configService);
    const config = customProvider.getConfig();

    // Verify custom values are used
    expect(config.connectionString).toBe(
      "postgresql://user:pass@custom-host:6000/custom_db",
    );
    expect(config.host).toBe("custom-host");
    expect(config.port).toBe(6000);
    expect(config.database).toBe("custom_db");
    expect(config.user).toBe("user");
    expect(config.password).toBe("pass");
    expect(config.maxConnections).toBe(50);
    expect(config.idleTimeout).toBe(60000);
    // When DB_SSL is true, it should be converted to an object with rejectUnauthorized: true
    expect(config.ssl).toEqual({ rejectUnauthorized: true });
  });

  it("should define proper configuration schema", () => {
    const schema = dbConfigProvider.getConfigSchema();

    // Check schema definition
    expect(schema.properties.DB_HOST.type).toBe("string");
    expect(schema.properties.DB_PORT.type).toBe("number");
    expect(schema.properties.DB_PORT.min).toBe(1);
    expect(schema.properties.DB_PORT.max).toBe(65535);
    expect(schema.properties.DB_NAME.type).toBe("string");
    expect(schema.properties.DB_USER.type).toBe("string");
    expect(schema.properties.DB_PASSWORD.type).toBe("string");
    expect(schema.properties.DB_PASSWORD.secret).toBe(true);
    expect(schema.properties.DATABASE_URL.type).toBe("string");
    expect(schema.properties.DATABASE_URL.pattern).toBeDefined();
    expect(schema.properties.DB_MAX_CONNECTIONS.type).toBe("number");
    expect(schema.properties.DB_MAX_CONNECTIONS.min).toBe(1);
    expect(schema.properties.DB_IDLE_TIMEOUT.type).toBe("number");
    expect(schema.properties.DB_IDLE_TIMEOUT.min).toBe(1000);
    expect(schema.properties.DB_CONNECTION_TIMEOUT.type).toBe("number");
    expect(schema.properties.DB_CONNECTION_TIMEOUT.min).toBe(100);
    expect(schema.properties.DB_STATEMENT_TIMEOUT.type).toBe("number");
    expect(schema.properties.DB_STATEMENT_TIMEOUT.min).toBe(100);
    expect(schema.properties.DB_SSL.type).toBe("boolean");
    expect(schema.properties.DB_METRICS_MAX_SAMPLES.type).toBe("number");
    expect(schema.properties.DB_METRICS_MAX_SAMPLES.min).toBe(10);
  });
});
