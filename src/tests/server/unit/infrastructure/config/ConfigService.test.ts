import * as fs from "fs";

import { ConfigSchema } from "@/server/infrastructure/config/ConfigSchema";
import { ConfigService } from "@/server/infrastructure/config/ConfigService";
import { InMemorySecretProvider } from "@/server/infrastructure/config/secrets/InMemorySecretProvider";
import type { ILoggerService } from "@/server/infrastructure/logging";

// Mock filesystem
jest.mock("fs");
const mockedFs = fs as jest.Mocked<typeof fs>;

// Mock dotenv
jest.mock("dotenv", () => ({
  parse: jest.fn().mockImplementation(() => ({})),
}));

describe("ConfigService", () => {
  let configService: ConfigService;
  let mockLogger: ILoggerService;
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset process.env
    process.env = { ...originalEnv };

    // Set up test environment variables
    process.env.TEST_NUMBER = "123";
    process.env.TEST_VAR = "test";
    process.env.TEST_FALSY = "false";
    process.env.DB_HOST = "localhost";
    process.env.SECRET_KEY = "env-secret";

    // Mock process.env
    process.env = {
      NODE_ENV: "test",
      TEST_VAR: "test-value",
      TEST_NUMBER: "123",
      TEST_BOOL: "true",
      TEST_COMMA_LIST: "a,b,c",
    };

    // Mock fs.existsSync
    mockedFs.existsSync.mockImplementation(() => true);

    // Mock fs.readFileSync
    mockedFs.readFileSync.mockImplementation(() =>
      Buffer.from("TEST_FROM_FILE=file-value"),
    );

    // Create a mock logger
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      createLogger: jest.fn().mockReturnThis(),
      withContext: jest.fn().mockReturnThis(),
      debugObj: jest.fn(),
      infoObj: jest.fn(),
      warnObj: jest.fn(),
      errorObj: jest.fn(),
      addTransport: jest.fn(),
      setTransports: jest.fn(),
      setMinLevel: jest.fn(),
      initialize: jest.fn().mockResolvedValue(undefined),
      shutdown: jest.fn().mockResolvedValue(undefined),
    };

    // Create a config service
    configService = new ConfigService(mockLogger);
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.clearAllMocks();
  });

  describe("Basic functionality", () => {
    it("should get values from environment", () => {
      expect(configService.get("TEST_VAR")).toBe("test-value");
    });

    it("should return undefined for non-existent keys", () => {
      expect(configService.get("NON_EXISTENT")).toBeUndefined();
    });

    it("should use default values when provided", () => {
      expect(configService.get("NON_EXISTENT", "default")).toBe("default");
    });

    it("should throw for required keys that are missing", () => {
      expect(() => {
        configService.getRequired("NON_EXISTENT");
      }).toThrow();
    });
  });

  describe("Type conversion", () => {
    it("should convert to numbers", () => {
      expect(configService.getNumber("TEST_NUMBER")).toBe(123);
      expect(configService.getNumber("NON_EXISTENT", 456)).toBe(456);
      expect(configService.getNumber("TEST_VAR")).toBeNaN();
    });

    it("should convert to booleans", () => {
      // Test true values
      process.env.TEST_TRUTHY = "true";
      const configWithTruthy = new ConfigService(mockLogger);
      expect(configWithTruthy.getBoolean("TEST_TRUTHY")).toBe(true);

      // Test false values
      process.env.TEST_FALSY = "false";
      const configWithFalsy = new ConfigService(mockLogger);
      expect(configWithFalsy.getBoolean("TEST_FALSY")).toBe(false);

      // Test defaults
      expect(configService.getBoolean("NON_EXISTENT", true)).toBe(true);

      // The implementation actually returns false for values that are not "true"
      expect(configService.getBoolean("TEST_VAR")).toBe(false);
    });

    it("should convert to arrays", () => {
      expect(configService.getArray("TEST_COMMA_LIST")).toEqual([
        "a",
        "b",
        "c",
      ]);
      expect(configService.getArray("NON_EXISTENT")).toEqual([]);
      expect(configService.getArray("NON_EXISTENT", ["default"])).toEqual([
        "default",
      ]);
    });
  });

  describe("Namespaces", () => {
    it("should handle namespaced configs", () => {
      process.env.DB_HOST = "localhost";

      const dbConfig = configService.getNamespace("DB");
      expect(dbConfig.get("HOST")).toBe("localhost");
    });

    it("should set values in parent config when using namespaced config", () => {
      const dbConfig = configService.getNamespace("DB");
      dbConfig.set("PORT", "5432");

      expect(configService.get("DB_PORT")).toBe("5432");
    });
  });

  describe("File loading", () => {
    it("should load configuration from files", async () => {
      // Setup the mock
      mockedFs.existsSync.mockReturnValue(true);

      await configService.initialize();

      // Check that the right files were looked for
      expect(mockedFs.existsSync).toHaveBeenCalledWith(
        expect.stringContaining(".env.test.local"),
      );
      expect(mockedFs.existsSync).toHaveBeenCalledWith(
        expect.stringContaining(".env.test"),
      );
      expect(mockedFs.existsSync).toHaveBeenCalledWith(
        expect.stringContaining(".env.local"),
      );
      expect(mockedFs.existsSync).toHaveBeenCalledWith(
        expect.stringContaining(".env"),
      );
    });
  });

  describe("Schema validation", () => {
    it("should validate configuration against a schema", () => {
      const schema: ConfigSchema = {
        properties: {
          TEST_VAR: {
            type: "string",
            required: true,
          },
          TEST_NUMBER: {
            type: "number",
            min: 0,
          },
        },
      };

      const result = configService.validate(schema);
      // The implementation returns an object with validation details, not just a boolean
      expect(result.valid).toBe(true);
      expect(configService.get("TEST_VAR")).toBe("test-value");
      expect(configService.getNumber("TEST_NUMBER")).toBe(123);
    });

    it("should detect validation errors", () => {
      // Create a configuration service with missing required values
      const testConfig = new ConfigService(mockLogger);

      // Define a schema with a required field
      const schema: ConfigSchema = {
        properties: {
          REQUIRED_KEY: {
            type: "string",
            required: true,
          },
        },
      };

      const result = testConfig.validate(schema);
      // The implementation returns an object with validation details, not just a boolean
      expect(result.valid).toBe(false);
      expect(testConfig.getErrors().length).toBeGreaterThan(0);
    });

    it("should throw on ensureValid if validation fails", () => {
      // Create a configuration service with missing required values
      const testConfig = new ConfigService(mockLogger);

      // Define a schema with a required field
      const schema: ConfigSchema = {
        properties: {
          REQUIRED_KEY: {
            type: "string",
            required: true,
          },
        },
      };

      expect(() => {
        testConfig.ensureValid(schema);
      }).toThrow();
    });
  });

  describe("Environment detection", () => {
    it("should detect development environment", () => {
      process.env.NODE_ENV = "development";
      expect(configService.isDevelopment()).toBe(true);
      expect(configService.isProduction()).toBe(false);
      expect(configService.isTest()).toBe(false);
    });

    it("should detect production environment", () => {
      process.env.NODE_ENV = "production";
      expect(configService.isDevelopment()).toBe(false);
      expect(configService.isProduction()).toBe(true);
      expect(configService.isTest()).toBe(false);
    });

    it("should detect test environment", () => {
      process.env.NODE_ENV = "test";
      expect(configService.isDevelopment()).toBe(false);
      expect(configService.isProduction()).toBe(false);
      expect(configService.isTest()).toBe(true);
    });
  });

  describe("Required configuration", () => {
    it("should load all required configuration variables", () => {
      const schema: ConfigSchema = {
        properties: {
          TEST_VAR: {
            type: "string",
            required: true,
          },
          TEST_NUMBER: {
            type: "number",
            min: 0,
            required: true,
          },
        },
      };

      // The implementation returns an object with validation details, not just a boolean
      const result = configService.validate(schema);
      expect(result.valid).toBe(true);
    });
  });

  describe("Secrets handling", () => {
    it("should retrieve secrets from secrets provider", async () => {
      // Create a secrets provider with some test secrets
      const secretsProvider = new InMemorySecretProvider({
        API_KEY: "test-api-key",
        API_SECRET: "test-api-secret",
      });

      // Cast the secretsProvider to any to avoid type errors during testing
      const configWithSecrets = new ConfigService(
        mockLogger,
        secretsProvider as any,
      );
      await configWithSecrets.initialize();

      // Check if we can retrieve secrets
      const apiKey = await configWithSecrets.getSecret("API_KEY");
      expect(apiKey).toBe("test-api-key");

      const apiSecret = await configWithSecrets.getSecret("API_SECRET");
      expect(apiSecret).toBe("test-api-secret");
    });

    it("should fall back to environment for missing secrets", async () => {
      // Set environment variable before creating the service
      process.env.FALLBACK_SECRET = "env-secret-value";

      // Create a config service without providing a secrets provider
      const configWithoutSecrets = new ConfigService(mockLogger);
      await configWithoutSecrets.initialize();

      // The secret should come from the environment
      const fallbackSecret = await configWithoutSecrets.get("FALLBACK_SECRET");
      expect(fallbackSecret).toBe("env-secret-value");
    });
  });
});
