import { describe, it, expect, beforeEach, vi } from "vitest";

import { DatabaseConfigProvider } from "@/server/infrastructure/config/domain/DatabaseConfig";

describe("DatabaseConfigProvider", () => {
  let configProvider: DatabaseConfigProvider;
  let mockConfigService: any;

  beforeEach(() => {
    mockConfigService = {
      get: vi.fn().mockImplementation((key: string, defaultValue: any) => {
        const defaults: Record<string, string> = {
          DATABASE_URL:
            "postgresql://postgres:postgres@localhost:5432/abe_stack",
          DB_HOST: "localhost",
          DB_NAME: "abe_stack",
          DB_USER: "postgres",
          DB_PASSWORD: "postgres",
        };
        return defaults[key] || defaultValue;
      }),
      getString: vi
        .fn()
        .mockImplementation((key: string, defaultValue: string) => {
          const defaults: Record<string, string> = {
            DATABASE_URL:
              "postgresql://postgres:postgres@localhost:5432/abe_stack",
            DB_HOST: "localhost",
            DB_NAME: "abe_stack",
            DB_USER: "postgres",
            DB_PASSWORD: "postgres",
            DB_CONNECTION_STRING: "",
          };
          return defaults[key] || defaultValue || "";
        }),
      getNumber: vi
        .fn()
        .mockImplementation((key: string, defaultValue: number = 0) => {
          const defaults: Record<string, number> = {
            DB_PORT: 5432,
            DB_MAX_CONNECTIONS: 20,
            DB_IDLE_TIMEOUT: 30000,
            DB_CONNECTION_TIMEOUT: 5000,
            DB_STATEMENT_TIMEOUT: 30000,
            DB_METRICS_MAX_SAMPLES: 1000,
          };
          return defaults[key] ?? defaultValue;
        }),
      getBoolean: vi
        .fn()
        .mockImplementation((key: string, defaultValue: boolean = false) => {
          const defaults: Record<string, boolean> = {
            DB_SSL: false,
            DB_SSL_ENABLED: false,
            DB_SSL_REJECT_UNAUTHORIZED: true,
          };
          return defaults[key] ?? defaultValue;
        }),
      ensureValid: vi.fn(),
      logger: {
        error: vi.fn(),
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
      },
    } as unknown as any;

    configProvider = new DatabaseConfigProvider(mockConfigService);
  });

  describe("getConfig", () => {
    it("should return a valid database configuration", () => {
      const config = configProvider.getConfig();

      expect(config).toBeDefined();
      expect(config).toHaveProperty("connectionString");
      expect(config).toHaveProperty("host");
      expect(config).toHaveProperty("port");
      expect(config).toHaveProperty("database");
      expect(config).toHaveProperty("user");
      expect(config).toHaveProperty("password");
      expect(config).toHaveProperty("maxConnections");
      expect(config).toHaveProperty("idleTimeout");
      expect(config).toHaveProperty("connectionTimeout");
      expect(config).toHaveProperty("statementTimeout");
      expect(config).toHaveProperty("ssl");
      expect(config).toHaveProperty("metricsMaxSamples");
    });

    it("should return configuration with correct types", () => {
      const config = configProvider.getConfig();

      expect(typeof config.connectionString).toBe("string");
      expect(typeof config.host).toBe("string");
      expect(typeof config.port).toBe("number");
      expect(typeof config.database).toBe("string");
      expect(typeof config.user).toBe("string");
      expect(typeof config.password).toBe("string");
      expect(typeof config.maxConnections).toBe("number");
      expect(typeof config.idleTimeout).toBe("number");
      expect(typeof config.connectionTimeout).toBe("number");
      expect(typeof config.statementTimeout).toBe("number");
      expect(typeof config.ssl).toBe("boolean");
      expect(typeof config.metricsMaxSamples).toBe("number");
    });

    it("should return configuration with valid values", () => {
      const config = configProvider.getConfig();

      expect(config.port).toBeGreaterThan(0);
      expect(config.maxConnections).toBeGreaterThan(0);
      expect(config.idleTimeout).toBeGreaterThan(0);
      expect(config.connectionTimeout).toBeGreaterThan(0);
      expect(config.statementTimeout).toBeGreaterThan(0);
      expect(config.metricsMaxSamples).toBeGreaterThan(0);
    });

    it("should return configuration with valid connection string format", () => {
      const config = configProvider.getConfig();
      const connectionStringRegex =
        /^postgresql:\/\/[^:]+:[^@]+@[^:]+:\d+\/[^?]+$/;

      expect(connectionStringRegex.test(config.connectionString)).toBe(true);
    });

    it("should return consistent configuration on multiple calls", () => {
      const config1 = configProvider.getConfig();
      const config2 = configProvider.getConfig();

      expect(config1).toEqual(config2);
    });

    it("should use custom configuration values when provided", () => {
      // Override mock implementations for custom config
      mockConfigService.getString.mockImplementation(
        (key: string, defaultValue: string = "") => {
          const customs: Record<string, string> = {
            DATABASE_URL:
              "postgresql://custom-user:custom-pass@custom-host:5433/custom-db",
            DB_HOST: "custom-host",
            DB_NAME: "custom-db",
            DB_USER: "custom-user",
            DB_PASSWORD: "custom-pass",
          };
          return customs[key] || defaultValue;
        },
      );

      mockConfigService.getNumber.mockImplementation(
        (key: string, defaultValue: number = 0) => {
          const customs: Record<string, number> = {
            DB_PORT: 5433,
            DB_MAX_CONNECTIONS: 50,
            DB_IDLE_TIMEOUT: 60000,
            DB_CONNECTION_TIMEOUT: 10000,
            DB_STATEMENT_TIMEOUT: 60000,
            DB_METRICS_MAX_SAMPLES: 2000,
          };
          return customs[key] ?? defaultValue;
        },
      );

      // Create a new provider instance with custom config
      const customConfigProvider = new DatabaseConfigProvider(
        mockConfigService,
      );
      const config = customConfigProvider.getConfig();

      // Validate custom values
      expect(config.host).toBe("custom-host");
      expect(config.port).toBe(5433);
      expect(config.database).toBe("custom-db");
      expect(config.user).toBe("custom-user");
      expect(config.password).toBe("custom-pass");
      expect(config.maxConnections).toBe(50);
      expect(config.idleTimeout).toBe(60000);
      expect(config.connectionTimeout).toBe(10000);
      expect(config.statementTimeout).toBe(60000);
      expect(config.metricsMaxSamples).toBe(2000);
      expect(config.connectionString).toBe(
        "postgresql://custom-user:custom-pass@custom-host:5433/custom-db",
      );
    });

    it("should handle SSL configuration as object", () => {
      // Test SSL configuration as an object
      mockConfigService.getBoolean.mockImplementation(
        (key: string, defaultValue: boolean = false) => {
          if (key === "DB_SSL") {
            return { rejectUnauthorized: false };
          }
          if (key === "DB_SSL_ENABLED") {
            return true;
          }
          if (key === "DB_SSL_REJECT_UNAUTHORIZED") {
            return false; // Make sure to return false to match expected value
          }
          return defaultValue;
        },
      );

      const sslConfigProvider = new DatabaseConfigProvider(mockConfigService);
      const config = sslConfigProvider.getConfig();

      expect(config.ssl).toEqual({ rejectUnauthorized: false });
    });

    it("should handle SSL configuration with rejectUnauthorized option", () => {
      // Test SSL configuration with explicit rejectUnauthorized setting
      mockConfigService.get.mockImplementation(
        (key: any, defaultValue: any) => {
          const defaults: Record<string, string> = {
            DATABASE_URL:
              "postgresql://postgres:postgres@localhost:5432/abe_stack",
            DB_HOST: "localhost",
            DB_NAME: "abe_stack",
            DB_USER: "postgres",
            DB_PASSWORD: "postgres",
          };
          return defaults[key] || defaultValue || "";
        },
      );

      mockConfigService.getBoolean.mockImplementation(
        (key: any, defaultValue: any) => {
          if (key === "DB_SSL") return true;
          if (key === "DB_SSL_REJECT_UNAUTHORIZED") return false;
          return defaultValue ?? false;
        },
      );

      const sslConfigProvider = new DatabaseConfigProvider(mockConfigService);
      const config = sslConfigProvider.getConfig();

      expect(config.ssl).toEqual({ rejectUnauthorized: false });
    });

    it("should handle connection string with special characters in password", () => {
      // Test with special characters in password
      mockConfigService.getString.mockImplementation(
        (key: string, defaultValue: string = "") => {
          const defaults: Record<string, string> = {
            DB_HOST: "localhost",
            DB_NAME: "abe_stack",
            DB_USER: "postgres",
            DB_PASSWORD: "p@$$w0rd!",
            DATABASE_URL: `postgresql://postgres:p%40%24%24w0rd!@localhost:5432/abe_stack`,
          };
          return defaults[key] || defaultValue;
        },
      );

      const specialConfigProvider = new DatabaseConfigProvider(
        mockConfigService,
      );
      const config = specialConfigProvider.getConfig();

      // The connection string should properly encode special characters
      expect(config.connectionString).toContain("p%40%24%24w0rd!");
      // Make sure the password property is not encoded
      expect(config.password).toBe("p@$$w0rd!");
    });

    it("should handle connectionString construction with encoded values", () => {
      // Test with values that need encoding
      mockConfigService.getString.mockImplementation(
        (key: string, defaultValue: string = "") => {
          const defaults: Record<string, string> = {
            DB_HOST: "db.example.com",
            DB_NAME: "test_db",
            DB_USER: "user.name",
            DB_PASSWORD: "p@ss:word", // Contains special characters
            DATABASE_URL: `postgresql://user.name:p%40ss%3Aword@db.example.com:5432/test_db`,
          };
          return defaults[key] || defaultValue;
        },
      );

      mockConfigService.getNumber.mockImplementation(
        (key: string, defaultValue: number = 0) => {
          return key === "DB_PORT" ? 5432 : defaultValue;
        },
      );

      const specialCharsProvider = new DatabaseConfigProvider(
        mockConfigService,
      );
      const config = specialCharsProvider.getConfig();

      // Connection string should include encoded values
      expect(config.connectionString).toContain("user.name");
      expect(config.connectionString).toContain(
        encodeURIComponent("p@ss:word"),
      );
      expect(config.connectionString).toMatch(
        /^postgresql:\/\/[^:]+:[^@]+@db\.example\.com:5432\/test_db$/,
      );
    });
  });

  describe("validation", () => {
    it("should validate configuration through config service", () => {
      configProvider.getConfig();
      expect(mockConfigService.ensureValid).toHaveBeenCalled();
    });

    it("should throw error for invalid configuration", () => {
      mockConfigService.ensureValid.mockImplementationOnce(() => {
        throw new Error("Invalid configuration");
      });

      expect(() => configProvider.getConfig()).toThrow("Invalid configuration");
    });

    it("should validate configuration against schema", () => {
      configProvider.getConfig();

      // Verify schema validation was called with the schema
      expect(mockConfigService.ensureValid).toHaveBeenCalledWith(
        expect.objectContaining({
          properties: expect.objectContaining({
            DB_HOST: expect.any(Object),
            DB_PORT: expect.any(Object),
            DB_NAME: expect.any(Object),
            DB_USER: expect.any(Object),
            DB_PASSWORD: expect.any(Object),
            DATABASE_URL: expect.any(Object),
          }),
        }),
      );
    });

    it("should validate connection string format", () => {
      // Setup to trigger the connection string validation
      mockConfigService.get.mockImplementation(
        (key: any, defaultValue: any) => {
          if (key === "DATABASE_URL") return "invalid-url";

          const defaults: Record<string, string> = {
            DB_HOST: "localhost",
            DB_NAME: "abe_stack",
            DB_USER: "postgres",
            DB_PASSWORD: "postgres",
          };
          return defaults[key] || defaultValue || "";
        },
      );

      mockConfigService.ensureValid.mockImplementationOnce(() => {
        throw new Error("Invalid connection string format");
      });

      expect(() => configProvider.getConfig()).toThrow();
    });
  });

  describe("getConfigSchema", () => {
    it("should return a valid config schema", () => {
      const schema = configProvider.getConfigSchema();

      expect(schema).toBeDefined();
      expect(schema).toHaveProperty("properties");
      expect(schema.properties).toHaveProperty("DB_HOST");
      expect(schema.properties).toHaveProperty("DB_PORT");
      expect(schema.properties).toHaveProperty("DB_NAME");
      expect(schema.properties).toHaveProperty("DB_USER");
      expect(schema.properties).toHaveProperty("DB_PASSWORD");
      expect(schema.properties).toHaveProperty("DATABASE_URL");
      expect(schema.properties).toHaveProperty("DB_MAX_CONNECTIONS");
      expect(schema.properties).toHaveProperty("DB_IDLE_TIMEOUT");
      expect(schema.properties).toHaveProperty("DB_CONNECTION_TIMEOUT");
      expect(schema.properties).toHaveProperty("DB_STATEMENT_TIMEOUT");
      expect(schema.properties).toHaveProperty("DB_SSL");
      expect(schema.properties).toHaveProperty("DB_METRICS_MAX_SAMPLES");
      // SSL reject unauthorized option
      expect(schema.properties).toHaveProperty("DB_SSL_REJECT_UNAUTHORIZED");
    });

    it("should have the correct types and constraints in schema", () => {
      const schema = configProvider.getConfigSchema();

      // Check types and constraints for some fields
      expect(schema.properties.DB_HOST.type).toBe("string");
      expect(schema.properties.DB_HOST.required).toBe(true);

      expect(schema.properties.DB_PORT.type).toBe("number");
      expect(schema.properties.DB_PORT.min).toBe(1);
      expect(schema.properties.DB_PORT.max).toBe(65535);

      expect(schema.properties.DB_PASSWORD.secret).toBe(true);

      expect(schema.properties.DATABASE_URL.pattern).toBeDefined();

      // Verify SSL options
      expect(schema.properties.DB_SSL.type).toBe("boolean");
      expect(schema.properties.DB_SSL_REJECT_UNAUTHORIZED.type).toBe("boolean");
    });
  });

  describe("loadConfig", () => {
    it("should handle overriding default values with custom values", () => {
      // Override mock implementations for custom config
      mockConfigService.getString.mockImplementation(
        (key: string, defaultValue: string = "") => {
          const customs: Record<string, string> = {
            DATABASE_URL:
              "postgresql://custom-user:custom-pass@custom-host:5433/custom-db",
            DB_HOST: "custom-host",
            DB_NAME: "custom-db",
            DB_USER: "custom-user",
            DB_PASSWORD: "custom-pass",
          };
          return customs[key] || defaultValue;
        },
      );

      mockConfigService.getNumber.mockImplementation(
        (key: string, defaultValue: number = 0) => {
          const customs: Record<string, number> = {
            DB_PORT: 5433,
            DB_MAX_CONNECTIONS: 50,
            DB_IDLE_TIMEOUT: 60000,
            DB_CONNECTION_TIMEOUT: 10000,
            DB_STATEMENT_TIMEOUT: 60000,
            DB_METRICS_MAX_SAMPLES: 2000,
          };
          return customs[key] ?? defaultValue;
        },
      );

      // Create a new provider instance with custom config
      const customConfigProvider = new DatabaseConfigProvider(
        mockConfigService,
      );
      const config = customConfigProvider.getConfig();

      // Verify the connection string and individual components match our custom values
      expect(config.connectionString).toBe(
        "postgresql://custom-user:custom-pass@custom-host:5433/custom-db",
      );
      expect(config.host).toBe("custom-host");
      expect(config.port).toBe(5433);
      expect(config.database).toBe("custom-db");
      expect(config.user).toBe("custom-user");
      expect(config.password).toBe("custom-pass");
    });

    it("should handle connectionString construction with encoded values", () => {
      // Test with values that need encoding
      mockConfigService.getString.mockImplementation(
        (key: string, defaultValue: string = "") => {
          const defaults: Record<string, string> = {
            DB_HOST: "db.example.com",
            DB_NAME: "test_db",
            DB_USER: "user.name",
            DB_PASSWORD: "p@ss:word",
            DATABASE_URL:
              "postgresql://user.name:p%40ss%3Aword@db.example.com:5432/test_db",
          };
          return defaults[key] || defaultValue;
        },
      );

      mockConfigService.getNumber.mockImplementation(
        (key: string, defaultValue: number = 0) => {
          return key === "DB_PORT" ? 5432 : defaultValue;
        },
      );

      // Create provider
      const specialCharsProvider = new DatabaseConfigProvider(
        mockConfigService,
      );
      const config = specialCharsProvider.getConfig();

      // Verify that the connection string uses URL-encoded values
      expect(config.connectionString).toContain("user.name");
      expect(config.connectionString).toContain("p%40ss%3Aword");
      expect(config.connectionString).toMatch(
        /^postgresql:\/\/[^:]+:[^@]+@db\.example\.com:5432\/test_db$/,
      );
    });
  });
});
