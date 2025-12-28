import { describe, it, expect } from "vitest";

import {
  ConfigSchema,
  validateConfig,
} from "@/server/infrastructure/config/ConfigSchema";

describe("ConfigSchema Validation", () => {
  describe("Basic validation", () => {
    it("should validate required fields", () => {
      const schema: ConfigSchema = {
        properties: {
          REQUIRED_FIELD: {
            type: "string",
            required: true,
          },
        },
      };

      const validConfig = { REQUIRED_FIELD: "value" };
      const invalidConfig = {};

      const validResult = validateConfig(validConfig, schema);
      const invalidResult = validateConfig(invalidConfig, schema);

      expect(validResult.valid).toBe(true);
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors).toContain("REQUIRED_FIELD is required");
    });

    it("should apply default values", () => {
      const schema: ConfigSchema = {
        properties: {
          WITH_DEFAULT: {
            type: "string",
            default: "default value",
          },
        },
      };

      const result = validateConfig({}, schema);

      expect(result.valid).toBe(true);
      expect(result.values.WITH_DEFAULT).toBe("default value");
    });
  });

  describe("Type conversion", () => {
    it("should convert number values", () => {
      const schema: ConfigSchema = {
        properties: {
          NUMBER_FIELD: {
            type: "number",
          },
        },
      };

      const validConfig = { NUMBER_FIELD: "123" };
      const invalidConfig = { NUMBER_FIELD: "not a number" };

      const validResult = validateConfig(validConfig, schema);
      const invalidResult = validateConfig(invalidConfig, schema);

      expect(validResult.valid).toBe(true);
      expect(validResult.values.NUMBER_FIELD).toBe(123);
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors[0]).toContain(
        "Error converting NUMBER_FIELD",
      );
    });

    it("should convert boolean values", () => {
      const schema: ConfigSchema = {
        properties: {
          BOOL_FIELD: {
            type: "boolean",
          },
        },
      };

      const values = {
        true: true,
        false: false,
        yes: true,
        no: false,
        "1": true,
        "0": false,
      };

      for (const [input, expected] of Object.entries(values)) {
        const result = validateConfig({ BOOL_FIELD: input }, schema);
        expect(result.valid).toBe(true);
        expect(result.values.BOOL_FIELD).toBe(expected);
      }

      const invalidResult = validateConfig({ BOOL_FIELD: "invalid" }, schema);
      expect(invalidResult.valid).toBe(false);
    });

    it("should convert array values", () => {
      const schema: ConfigSchema = {
        properties: {
          STRING_ARRAY: {
            type: "array",
          },
          NUMBER_ARRAY: {
            type: "array",
            arrayType: "number",
          },
        },
      };

      const config = {
        STRING_ARRAY: "a,b,c",
        NUMBER_ARRAY: "1,2,3",
      };

      const result = validateConfig(config, schema);

      expect(result.valid).toBe(true);
      expect(result.values.STRING_ARRAY).toEqual(["a", "b", "c"]);
      expect(result.values.NUMBER_ARRAY).toEqual([1, 2, 3]);
    });

    it("should parse JSON objects", () => {
      const schema: ConfigSchema = {
        properties: {
          OBJECT_FIELD: {
            type: "object",
          },
        },
      };

      const validConfig = { OBJECT_FIELD: '{"key":"value"}' };
      const invalidConfig = { OBJECT_FIELD: "not json" };

      const validResult = validateConfig(validConfig, schema);
      const invalidResult = validateConfig(invalidConfig, schema);

      expect(validResult.valid).toBe(true);
      expect(validResult.values.OBJECT_FIELD).toEqual({ key: "value" });
      expect(invalidResult.valid).toBe(false);
    });
  });

  describe("Validation rules", () => {
    it("should validate string patterns", () => {
      const schema: ConfigSchema = {
        properties: {
          EMAIL: {
            type: "string",
            pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
          },
        },
      };

      const validConfig = { EMAIL: "test@example.com" };
      const invalidConfig = { EMAIL: "not-an-email" };

      const validResult = validateConfig(validConfig, schema);
      const invalidResult = validateConfig(invalidConfig, schema);

      expect(validResult.valid).toBe(true);
      expect(invalidResult.valid).toBe(false);
    });

    it("should validate enum values", () => {
      const schema: ConfigSchema = {
        properties: {
          COLOR: {
            type: "string",
            enum: ["red", "green", "blue"],
          },
        },
      };

      const validConfig = { COLOR: "red" };
      const invalidConfig = { COLOR: "yellow" };

      const validResult = validateConfig(validConfig, schema);
      const invalidResult = validateConfig(invalidConfig, schema);

      expect(validResult.valid).toBe(true);
      expect(invalidResult.valid).toBe(false);
    });

    it("should validate number ranges", () => {
      const schema: ConfigSchema = {
        properties: {
          PORT: {
            type: "number",
            min: 1,
            max: 65535,
          },
        },
      };

      const validConfig = { PORT: "8080" };
      const tooSmallConfig = { PORT: "0" };
      const tooBigConfig = { PORT: "70000" };

      const validResult = validateConfig(validConfig, schema);
      const tooSmallResult = validateConfig(tooSmallConfig, schema);
      const tooBigResult = validateConfig(tooBigConfig, schema);

      expect(validResult.valid).toBe(true);
      expect(tooSmallResult.valid).toBe(false);
      expect(tooBigResult.valid).toBe(false);
    });

    it("should validate string lengths", () => {
      const schema: ConfigSchema = {
        properties: {
          PASSWORD: {
            type: "string",
            minLength: 8,
            maxLength: 64,
          },
        },
      };

      const validConfig = { PASSWORD: "password123" };
      const tooShortConfig = { PASSWORD: "pass" };
      const tooLongConfig = { PASSWORD: "a".repeat(65) };

      const validResult = validateConfig(validConfig, schema);
      const tooShortResult = validateConfig(tooShortConfig, schema);
      const tooLongResult = validateConfig(tooLongConfig, schema);

      expect(validResult.valid).toBe(true);
      expect(tooShortResult.valid).toBe(false);
      expect(tooLongResult.valid).toBe(false);
    });

    it("should use custom validators", () => {
      const schema: ConfigSchema = {
        properties: {
          EVEN_NUMBER: {
            type: "number",
            validator: (value) => typeof value === "number" && value % 2 === 0,
          },
        },
      };

      const validConfig = { EVEN_NUMBER: "2" };
      const invalidConfig = { EVEN_NUMBER: "3" };

      const validResult = validateConfig(validConfig, schema);
      const invalidResult = validateConfig(invalidConfig, schema);

      expect(validResult.valid).toBe(true);
      expect(invalidResult.valid).toBe(false);
    });
  });

  describe("Schema metadata fields", () => {
    it("should preserve description field in schema", () => {
      const schema: ConfigSchema = {
        properties: {
          API_KEY: {
            type: "string",
            description: "API key for authentication",
            required: true,
          },
        },
      };

      // Verification that the description field exists and contains the expected value
      expect(schema.properties.API_KEY.description).toBe(
        "API key for authentication",
      );

      // This is a metadata test, so we don't need to validate the config
      const result = validateConfig({ API_KEY: "test-key" }, schema);
      expect(result.valid).toBe(true);
    });

    it("should handle secret field marker", () => {
      const schema: ConfigSchema = {
        properties: {
          PASSWORD: {
            type: "string",
            secret: true,
            required: true,
          },
        },
      };

      // Verification that the secret field exists and is set to true
      expect(schema.properties.PASSWORD.secret).toBe(true);

      // The secret marker doesn't affect validation, only indicates how to handle the value
      const result = validateConfig({ PASSWORD: "sensitive-data" }, schema);
      expect(result.valid).toBe(true);
    });

    it("should handle schema with all metadata fields", () => {
      const schema: ConfigSchema = {
        properties: {
          SERVER_PORT: {
            type: "number",
            description: "Port on which to run the server",
            default: 8080,
            min: 1024,
            max: 65535,
            required: false,
          },
        },
      };

      // Check that all metadata is preserved
      expect(schema.properties.SERVER_PORT.description).toBe(
        "Port on which to run the server",
      );
      expect(schema.properties.SERVER_PORT.default).toBe(8080);
      expect(schema.properties.SERVER_PORT.min).toBe(1024);
      expect(schema.properties.SERVER_PORT.max).toBe(65535);
      expect(schema.properties.SERVER_PORT.required).toBe(false);

      // Validate with empty config to get default
      const result = validateConfig({}, schema);
      expect(result.valid).toBe(true);
      expect(result.values.SERVER_PORT).toBe(8080);
    });
  });

  describe("Error message formats", () => {
    it("should provide specific error for missing required field", () => {
      const schema: ConfigSchema = {
        properties: {
          REQUIRED_FIELD: {
            type: "string",
            required: true,
          },
        },
      };

      const result = validateConfig({}, schema);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("REQUIRED_FIELD is required");
    });

    it("should provide specific error for pattern validation failure", () => {
      const schema: ConfigSchema = {
        properties: {
          EMAIL: {
            type: "string",
            pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
          },
        },
      };

      const result = validateConfig({ EMAIL: "not-an-email" }, schema);

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain(
        "Value for EMAIL does not match pattern",
      );
    });

    it("should provide specific error for enum validation failure", () => {
      const schema: ConfigSchema = {
        properties: {
          COLOR: {
            type: "string",
            enum: ["red", "green", "blue"],
          },
        },
      };

      const result = validateConfig({ COLOR: "yellow" }, schema);

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain(
        "Value for COLOR must be one of: red, green, blue",
      );
    });

    it("should provide specific error for min/max validation failure", () => {
      const schema: ConfigSchema = {
        properties: {
          PORT: {
            type: "number",
            min: 1024,
            max: 65535,
          },
        },
      };

      const tooSmallResult = validateConfig({ PORT: "500" }, schema);
      const tooBigResult = validateConfig({ PORT: "70000" }, schema);

      expect(tooSmallResult.valid).toBe(false);
      expect(tooSmallResult.errors[0]).toContain(
        "Value for PORT is too small (min 1024)",
      );

      expect(tooBigResult.valid).toBe(false);
      expect(tooBigResult.errors[0]).toContain(
        "Value for PORT is too large (max 65535)",
      );
    });

    it("should provide specific error for string length validation failure", () => {
      const schema: ConfigSchema = {
        properties: {
          PASSWORD: {
            type: "string",
            minLength: 8,
            maxLength: 16,
          },
        },
      };

      const tooShortResult = validateConfig({ PASSWORD: "pass" }, schema);
      const tooLongResult = validateConfig(
        { PASSWORD: "passwordthatistoolong" },
        schema,
      );

      expect(tooShortResult.valid).toBe(false);
      expect(tooShortResult.errors[0]).toContain(
        "Value for PASSWORD is too short (min 8 characters)",
      );

      expect(tooLongResult.valid).toBe(false);
      expect(tooLongResult.errors[0]).toContain(
        "Value for PASSWORD is too long (max 16 characters)",
      );
    });

    it("should provide specific error for type conversion failure", () => {
      const schema: ConfigSchema = {
        properties: {
          NUMBER_FIELD: {
            type: "number",
          },
          BOOLEAN_FIELD: {
            type: "boolean",
          },
          OBJECT_FIELD: {
            type: "object",
          },
        },
      };

      const invalidNumberResult = validateConfig(
        { NUMBER_FIELD: "not-a-number" },
        schema,
      );
      const invalidBoolResult = validateConfig(
        { BOOLEAN_FIELD: "not-a-bool" },
        schema,
      );
      const invalidJsonResult = validateConfig(
        { OBJECT_FIELD: "{invalid json}" },
        schema,
      );

      expect(invalidNumberResult.valid).toBe(false);
      expect(invalidNumberResult.errors[0]).toContain(
        "Error converting NUMBER_FIELD",
      );

      expect(invalidBoolResult.valid).toBe(false);
      expect(invalidBoolResult.errors[0]).toContain(
        "Error converting BOOLEAN_FIELD",
      );

      expect(invalidJsonResult.valid).toBe(false);
      expect(invalidJsonResult.errors[0]).toContain(
        "Error converting OBJECT_FIELD",
      );
    });
  });

  describe("Nested object validation", () => {
    it("should validate complex object structure", () => {
      const schema: ConfigSchema = {
        properties: {
          DATABASE_CONFIG: {
            type: "object",
          },
        },
      };

      const validNestedObject = JSON.stringify({
        host: "localhost",
        port: 5432,
        credentials: {
          username: "user",
          password: "pass",
        },
        options: {
          ssl: true,
          timeout: 30,
          retries: 3,
        },
      });

      const result = validateConfig(
        { DATABASE_CONFIG: validNestedObject },
        schema,
      );

      expect(result.valid).toBe(true);
      expect(result.values.DATABASE_CONFIG).toHaveProperty("host", "localhost");
      expect(result.values.DATABASE_CONFIG).toHaveProperty("port", 5432);
      expect(result.values.DATABASE_CONFIG).toHaveProperty(
        "credentials.username",
        "user",
      );
      expect(result.values.DATABASE_CONFIG).toHaveProperty(
        "credentials.password",
        "pass",
      );
      expect(result.values.DATABASE_CONFIG).toHaveProperty("options.ssl", true);
      expect(result.values.DATABASE_CONFIG).toHaveProperty(
        "options.timeout",
        30,
      );
      expect(result.values.DATABASE_CONFIG).toHaveProperty(
        "options.retries",
        3,
      );
    });

    it("should validate arrays of objects", () => {
      const schema: ConfigSchema = {
        properties: {
          ENDPOINTS: {
            type: "object",
          },
        },
      };

      const arrayOfObjects = JSON.stringify([
        { name: "api", url: "https://api.example.com", timeout: 5000 },
        { name: "auth", url: "https://auth.example.com", timeout: 3000 },
        { name: "metrics", url: "https://metrics.example.com", timeout: 1000 },
      ]);

      const result = validateConfig({ ENDPOINTS: arrayOfObjects }, schema);

      expect(result.valid).toBe(true);
      const endpoints = result.values.ENDPOINTS as any[];
      expect(endpoints).toHaveLength(3);
      expect(endpoints[0]).toHaveProperty("name", "api");
      expect(endpoints[1]).toHaveProperty("name", "auth");
      expect(endpoints[2]).toHaveProperty("name", "metrics");
    });

    it("should validate using complex object with multiple nested levels", () => {
      const schema: ConfigSchema = {
        properties: {
          APP_CONFIG: {
            type: "object",
          },
        },
      };

      const complexConfig = JSON.stringify({
        server: {
          host: "0.0.0.0",
          port: 8080,
          ssl: {
            enabled: true,
            cert: "/path/to/cert",
            key: "/path/to/key",
          },
        },
        database: {
          primary: {
            host: "db.example.com",
            port: 5432,
            credentials: {
              username: "admin",
              password: "super-secret",
            },
          },
          replicas: [
            { host: "replica1.example.com", port: 5432 },
            { host: "replica2.example.com", port: 5432 },
          ],
        },
        features: {
          authentication: {
            enabled: true,
            providers: ["local", "oauth"],
            session: {
              timeout: 3600,
              persistent: true,
            },
          },
        },
      });

      const result = validateConfig({ APP_CONFIG: complexConfig }, schema);

      expect(result.valid).toBe(true);
      const config = result.values.APP_CONFIG as any;

      // Server checks
      expect(config.server.port).toBe(8080);
      expect(config.server.ssl.enabled).toBe(true);

      // Database checks
      expect(config.database.primary.credentials.username).toBe("admin");
      expect(config.database.replicas).toHaveLength(2);
      expect(config.database.replicas[0].host).toBe("replica1.example.com");

      // Feature checks
      expect(config.features.authentication.providers).toContain("oauth");
      expect(config.features.authentication.session.timeout).toBe(3600);
    });
  });
});
