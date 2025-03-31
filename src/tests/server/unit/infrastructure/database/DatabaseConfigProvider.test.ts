import { ConfigService } from "@/server/infrastructure/config/ConfigService";
import { DatabaseConfigProvider } from "@/server/infrastructure/config/domain/DatabaseConfig";

describe("DatabaseConfigProvider", () => {
  let configProvider: DatabaseConfigProvider;
  let mockConfigService: jest.Mocked<ConfigService>;

  beforeEach(() => {
    mockConfigService = {
      get: jest.fn().mockImplementation((key, defaultValue) => {
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
      getNumber: jest.fn().mockImplementation((key, defaultValue) => {
        const defaults: Record<string, number> = {
          DB_PORT: 5432,
          DB_MAX_CONNECTIONS: 20,
          DB_IDLE_TIMEOUT: 30000,
          DB_CONNECTION_TIMEOUT: 5000,
          DB_STATEMENT_TIMEOUT: 30000,
          DB_METRICS_MAX_SAMPLES: 1000,
        };
        return defaults[key] || defaultValue;
      }),
      getBoolean: jest.fn().mockImplementation((key, defaultValue) => {
        const defaults: Record<string, boolean> = {
          DB_SSL: false,
        };
        return defaults[key] || defaultValue;
      }),
      ensureValid: jest.fn(),
    } as unknown as jest.Mocked<ConfigService>;

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
  });
});
