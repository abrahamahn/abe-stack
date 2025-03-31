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
      expect(invalidResult.errors).toContain(
        "Required configuration key missing: REQUIRED_FIELD",
      );
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
});
