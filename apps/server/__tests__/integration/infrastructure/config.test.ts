import * as fs from "fs";

import { describe, it, expect, beforeEach, afterEach, vi, Mock } from "vitest";

import {
  ConfigService,
  EnvSecretProvider,
  InMemorySecretProvider,
} from "@infrastructure/config";

// Import providers directly from their source files
import { DatabaseConfigProvider } from "@/server/infrastructure/config/domain/DatabaseConfig";
import { EmailConfigProvider } from "@/server/infrastructure/config/domain/EmailConfig";
import { SecurityConfigProvider } from "@/server/infrastructure/config/domain/SecurityConfig";
import { ServerConfigProvider } from "@/server/infrastructure/config/domain/ServerConfig";
import { StorageConfigProvider } from "@/server/infrastructure/config/domain/StorageConfig";

// Helper function for config validation
function validateConfig(config: Record<string, any>, schema: any) {
  const errors: string[] = [];
  const properties = schema.properties || {};

  // Check required properties
  for (const [key, props] of Object.entries(properties)) {
    if ((props as any).required && !config[key]) {
      errors.push(`${key} is required`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Mock the fs module
vi.mock("fs", () => {
  return {
    default: {
      existsSync: vi.fn(),
      readFileSync: vi.fn(),
      writeFileSync: vi.fn(),
      mkdirSync: vi.fn(),
    },
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
    mkdirSync: vi.fn(),
  };
});

// Mock logger service
const mockLogger = {
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

describe("Config Infrastructure Integration Tests", () => {
  let originalEnv: NodeJS.ProcessEnv;
  let configService: ConfigService;

  beforeEach(() => {
    // Save original process.env and reset mocks
    originalEnv = { ...process.env };
    vi.clearAllMocks();

    // Mock .env file existence check
    (fs.existsSync as Mock).mockImplementation((filePath: any) => {
      if (filePath.includes(".env")) return true;
      if (typeof filePath === "string" && filePath.includes("secrets.json"))
        return true;
      return false;
    });

    // Mock .env file content
    (fs.readFileSync as Mock).mockImplementation(
      (filePath: any, _encoding: any) => {
        if (typeof filePath === "string" && filePath.includes(".env")) {
          return `
          TEST_KEY=test_value
          DB_HOST=localhost
          DB_PORT=5432
          PORT=3003
          EMAIL_HOST=smtp.example.com
          EMAIL_USER=test@example.com
          EMAIL_PASSWORD=test-password
          JWT_SECRET=test-jwt-secret
          JWT_REFRESH_SECRET=test-refresh-secret
          SIGNATURE_SECRET=test-signature-secret
          PASSWORD_SALT=test-password-salt
          STORAGE_PATH=/storage
          UPLOAD_DIR=/uploads
          NODE_ENV=test
        `;
        }

        if (typeof filePath === "string" && filePath.includes("secrets.json")) {
          return JSON.stringify({
            SECRET_KEY: "test-secret-value",
            API_KEY: "test-api-key",
          });
        }

        return "";
      }
    );

    // Initialize config service
    configService = new ConfigService(mockLogger);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("ConfigService Core Functionality", () => {
    it("should load and merge configuration from multiple sources", async () => {
      // Setup environment variables
      process.env.CUSTOM_ENV_VAR = "env-value";

      // Initialize config service
      await configService.initialize();

      // Verify values from different sources
      expect(configService.get("TEST_KEY")).toBe("test_value"); // From .env
      expect(configService.get("CUSTOM_ENV_VAR")).toBe("env-value"); // From process.env
      expect(configService.get("NON_EXISTENT")).toBeUndefined();
    });

    it("should handle type conversions correctly", () => {
      // Setup - directly set values in the config service
      configService.set("NUMBER_VAL", "123");
      configService.set("BOOLEAN_VAL", "true");
      configService.set("ARRAY_VAL", "item1,item2,item3");

      // Exercise & Verify
      expect(configService.getNumber("NUMBER_VAL")).toBe(123);
      expect(configService.getBoolean("BOOLEAN_VAL")).toBe(true);
      expect(configService.getArray("ARRAY_VAL")).toEqual([
        "item1",
        "item2",
        "item3",
      ]);
    });

    it("should validate configuration schema", () => {
      const schema = {
        properties: {
          TEST_KEY: {
            type: "string" as const,
            required: true,
          },
          PORT: {
            type: "number" as const,
            required: true,
            min: 1,
            max: 65535,
          },
        },
      };

      const result = validateConfig(configService.getAll(), schema);
      expect(result.valid).toBe(true);
    });

    it("should handle namespaced configuration", () => {
      // Setup
      process.env.APP_SPECIFIC_KEY = "app-value";
      process.env.APP_OTHER_KEY = "other-value";

      // Exercise
      const appConfig = configService.getNamespace("APP");

      // Verify
      expect(appConfig.get("SPECIFIC_KEY")).toBe("app-value");
      expect(appConfig.get("OTHER_KEY")).toBe("other-value");
    });
  });

  describe("Secret Providers Integration", () => {
    it("should integrate multiple secret providers with priority", async () => {
      const envProvider = new EnvSecretProvider();
      const inMemoryProvider = new InMemorySecretProvider({
        SECRET_ONE: "value1",
        SECRET_TWO: "value2",
      });

      // Register providers
      configService.registerSecretProvider(envProvider);
      configService.registerSecretProvider(inMemoryProvider);

      // Test priority - env provider should have higher priority
      process.env.SECRET_ONE = "env_value1";
      expect(await configService.getSecret("SECRET_ONE")).toBe("env_value1");
      expect(await configService.getSecret("SECRET_TWO")).toBe("value2");

      // Clean up
      delete process.env.SECRET_ONE;
    });
  });

  describe("Domain Configuration Providers Integration", () => {
    it("should integrate all domain configuration providers", async () => {
      // Initialize config service
      await configService.initialize();

      // Create all domain providers
      const dbConfig = new DatabaseConfigProvider(configService);
      const emailConfig = new EmailConfigProvider(configService);
      const securityConfig = new SecurityConfigProvider(configService);
      const serverConfig = new ServerConfigProvider(configService);
      const storageConfig = new StorageConfigProvider(configService);

      // Verify database configuration
      const db = dbConfig.getConfig();
      expect(db.host).toBe("localhost");
      expect(db.port).toBe(5432);

      // Verify email configuration
      const email = emailConfig.getConfig();
      expect(email.host).toBe("smtp.example.com");
      expect(email.auth.user).toBe("test@example.com");

      // Verify security configuration
      const security = securityConfig.getConfig();
      expect(security.jwtSecret).toBe("test-jwt-secret");
      expect(security.jwtRefreshSecret).toBe("test-refresh-secret");

      // Verify server configuration
      const server = serverConfig.getConfig();
      expect(server.port).toBe(3003);
      expect(server.isTest).toBe(true);

      // Verify storage configuration
      const storage = storageConfig.getConfig();
      expect(storage.basePath).toBe("/uploads");
      expect(storage.uploadDir).toBe("/uploads");
    });

    it("should handle configuration dependencies and validation", async () => {
      // Setup - remove required values
      const originalEnvBackup = { ...process.env };

      try {
        // Create a minimal config service for testing
        const testConfigService = new ConfigService(mockLogger);

        // Define a schema with a required field we know is missing
        const schema = {
          properties: {
            REQUIRED_FIELD_THAT_DOESNT_EXIST: {
              type: "string" as const,
              required: true,
            },
          },
        };

        // This should throw because the required value is missing
        expect(() => testConfigService.ensureValid(schema)).toThrow();
      } finally {
        // Restore the original environment
        process.env = originalEnvBackup;
      }
    });
  });

  describe("Environment Handling", () => {
    it("should handle different environment modes", () => {
      // Test environment detection
      process.env.NODE_ENV = "development";
      expect(configService.isDevelopment()).toBe(true);
      expect(configService.isProduction()).toBe(false);
      expect(configService.isTest()).toBe(false);

      process.env.NODE_ENV = "production";
      expect(configService.isDevelopment()).toBe(false);
      expect(configService.isProduction()).toBe(true);
      expect(configService.isTest()).toBe(false);

      process.env.NODE_ENV = "test";
      expect(configService.isDevelopment()).toBe(false);
      expect(configService.isProduction()).toBe(false);
      expect(configService.isTest()).toBe(true);
    });

    it("should load environment-specific configuration files", async () => {
      // Setup - mock different env files
      (fs.existsSync as Mock).mockImplementation((filePath: any) => {
        if (typeof filePath === "string") {
          if (
            filePath.includes(".env.test") ||
            filePath.includes(".env.development")
          ) {
            return true;
          }
        }
        return false;
      });

      (fs.readFileSync as Mock).mockImplementation((filePath: any) => {
        if (typeof filePath === "string") {
          if (filePath.includes(".env.test")) {
            return "TEST_SPECIFIC=test-value";
          }
          if (filePath.includes(".env.development")) {
            return "DEV_SPECIFIC=dev-value";
          }
        }
        return "";
      });

      // Reset ConfigService between tests
      configService = new ConfigService(mockLogger);

      // Test environment
      process.env.NODE_ENV = "test";
      await configService.initialize();

      // We now correctly use .env.test for test mode
      expect(configService.get("TEST_SPECIFIC")).toBe("test-value");

      // Reset ConfigService between tests
      configService = new ConfigService(mockLogger);

      // Development environment
      process.env.NODE_ENV = "development";
      await configService.initialize();
      expect(configService.get("DEV_SPECIFIC")).toBe("dev-value");
    });
  });

  describe("Error Handling and Edge Cases", () => {
    it("should handle invalid configuration values", () => {
      // Setup invalid values
      configService.set("INVALID_NUMBER", "not-a-number");
      configService.set("INVALID_BOOLEAN", "not-a-boolean");

      // Verify type conversion fallbacks
      const numVal = configService.getNumber("INVALID_NUMBER");
      expect(Number.isNaN(numVal)).toBe(true);
      expect(configService.getBoolean("INVALID_BOOLEAN")).toBe(false);
    });

    it("should handle missing configuration files gracefully", () => {
      // Setup - mock file not found
      (fs.existsSync as Mock).mockReturnValue(false);

      // Should not throw when files are missing
      expect(() => configService.initialize()).not.toThrow();
    });
  });

  describe("Type-Specific Getters", () => {
    it("should handle getWithDefault correctly", () => {
      expect(configService.getWithDefault("NON_EXISTENT", "default")).toBe(
        "default"
      );
      configService.set("EXISTENT", "value");
      expect(configService.getWithDefault("EXISTENT", "default")).toBe("value");
    });

    it("should handle getString correctly", () => {
      expect(configService.getString("NON_EXISTENT")).toBe("");
      expect(configService.getString("NON_EXISTENT", "default")).toBe(
        "default"
      );
      configService.set("STRING_VALUE", "test");
      expect(configService.getString("STRING_VALUE")).toBe("test");
    });

    it("should handle getObject correctly", () => {
      const testObj = { key: "value", number: 42 };
      expect(configService.getObject("NON_EXISTENT")).toBeUndefined();
      expect(configService.getObject("NON_EXISTENT", testObj)).toEqual(testObj);
      configService.set("OBJECT_VALUE", JSON.stringify(testObj));
      expect(configService.getObject("OBJECT_VALUE")).toEqual(testObj);
    });

    it("should handle getArray with different types", () => {
      const stringArray = ["a", "b", "c"];
      const numberArray = [1, 2, 3];
      const objectArray = [{ id: 1 }, { id: 2 }];

      expect(configService.getArray("NON_EXISTENT")).toEqual([]);
      expect(configService.getArray("NON_EXISTENT", stringArray)).toEqual(
        stringArray
      );

      configService.set("STRING_ARRAY", JSON.stringify(stringArray));
      configService.set("NUMBER_ARRAY", JSON.stringify(numberArray));
      configService.set("OBJECT_ARRAY", JSON.stringify(objectArray));

      expect(configService.getArray("STRING_ARRAY")).toEqual(stringArray);
      expect(configService.getArray("NUMBER_ARRAY")).toEqual(numberArray);
      expect(configService.getArray("OBJECT_ARRAY")).toEqual(objectArray);
    });
  });

  describe("Configuration Management", () => {
    it("should handle clone correctly", () => {
      const testData = { key1: "value1", key2: "value2" };
      configService.setMultiple(testData);
      const cloned = configService.clone();
      expect(cloned).toEqual(testData);
      expect(cloned).not.toBe(testData); // Should be a new object
    });

    it("should handle merge correctly", () => {
      const initial = { key1: "value1", key2: "value2" };
      const toMerge = { key2: "new-value2", key3: "value3" };
      configService.setMultiple(initial);
      configService.merge(toMerge);
      expect(configService.getConfig()).toEqual({
        key1: "value1",
        key2: "new-value2",
        key3: "value3",
      });
    });

    it("should handle diff correctly", () => {
      const initial = { key1: "value1", key2: "value2" };
      const toCompare = { key1: "value1", key2: "new-value2", key3: "value3" };
      configService.setMultiple(initial);
      const diff = configService.diff(toCompare);
      expect(diff).toEqual({
        key2: "new-value2",
        key3: "value3",
      });
    });

    it("should handle equals correctly", () => {
      const testData = { key1: "value1", key2: "value2" };
      configService.setMultiple(testData);
      expect(configService.equals(testData)).toBe(true);
      expect(configService.equals({ ...testData, key3: "value3" })).toBe(false);
    });

    it("should handle JSON serialization", () => {
      const testData = { key1: "value1", key2: "value2" };
      configService.setMultiple(testData);
      const json = configService.toJSON();
      expect(typeof json).toBe("string");
      expect(JSON.parse(json)).toEqual(testData);

      const newData = { key3: "value3" };
      configService.fromJSON(JSON.stringify(newData));
      expect(configService.getConfig()).toEqual(newData);
    });

    it("should handle object conversion", () => {
      const testData = { key1: "value1", key2: "value2" };
      configService.setMultiple(testData);
      const obj = configService.toObject();
      expect(obj).toEqual(testData);
      expect(obj).not.toBe(testData);

      const newData = { key3: "value3" };
      configService.fromObject(newData);
      expect(configService.getConfig()).toEqual(newData);
    });

    it("should handle reset and reload", async () => {
      const testData = { key1: "value1", key2: "value2" };
      configService.setMultiple(testData);

      configService.reset();
      expect(configService.isEmpty()).toBe(true);

      // Mock file read for reload
      (fs.readFileSync as Mock).mockImplementationOnce(
        () => "RELOADED_KEY=reloaded-value"
      );
      await configService.reload();
      expect(configService.get("RELOADED_KEY")).toBe("reloaded-value");
    });
  });

  describe("Watch/Unwatch Functionality", () => {
    it("should handle watching and unwatching values", () => {
      const callback = vi.fn();
      const key = "watch-test";

      // First watch the key, then set the value
      configService.watch(key, callback);
      configService.set(key, "value1");
      expect(callback).toHaveBeenCalledWith("value1");

      // Unwatch specific callback
      configService.unwatch(key, callback);
      configService.set(key, "value2");
      expect(callback).toHaveBeenCalledTimes(1);

      // Test unwatch function with a new callback
      const callback2 = vi.fn();
      configService.watch(key, callback2);
      configService.set(key, "value3");
      expect(callback2).toHaveBeenCalledWith("value3");

      // Reset the mock for accurate count
      callback2.mockClear();

      // Test unwatchAll
      configService.unwatchAll();
      configService.set(key, "value4");
      expect(callback2).toHaveBeenCalledTimes(0); // Should not be called after unwatchAll
    });
  });

  describe("Error Handling", () => {
    it("should handle configuration errors", () => {
      const schema = {
        properties: {
          REQUIRED_FIELD: {
            type: "string" as const,
            required: true,
          },
        },
      };

      // Should have errors when validation fails
      expect(() => configService.ensureValid(schema)).toThrow();
      expect(configService.hasErrors()).toBe(true);
      expect(configService.getErrors()).toContain("REQUIRED_FIELD is required");

      // Should clear errors
      configService.clearErrors();
      expect(configService.hasErrors()).toBe(false);
      expect(configService.getErrors()).toHaveLength(0);
    });

    it("should handle validation with custom error messages", () => {
      const schema = {
        properties: {
          PORT: {
            type: "number" as const,
            required: true,
            min: 1,
            max: 65535,
            errorMessage: "Port must be between 1 and 65535",
          },
        },
      };

      configService.set("PORT", "0");
      const validated = configService.validate(schema);
      expect(validated.valid).toBe(false);
      expect(validated.errors).toContain("Port must be between 1 and 65535");
    });
  });
});
