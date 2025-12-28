import { describe, it, expect, beforeEach, vi } from "vitest";

import { ConfigService } from "@/server/infrastructure/config/ConfigService";
import { SecurityConfigProvider } from "@/server/infrastructure/config/domain/SecurityConfig";
import { ConfigValidationError } from "@/server/infrastructure/errors/infrastructure/ConfigValidationError";

// Mock ConfigService
vi.mock("@config/ConfigService");
const MockConfigService = vi.mocked(ConfigService);

describe("SecurityConfig", () => {
  let configService: any;
  let securityConfigProvider: SecurityConfigProvider;

  const mockRequiredFields: Record<string, string> = {
    JWT_SECRET: "jwt-secret-at-least-32-characters-long",
    JWT_REFRESH_SECRET: "jwt-refresh-secret-at-least-32-characters",
    SIGNATURE_SECRET: "signature-secret-at-least-32-characters",
    PASSWORD_SALT: "password-salt-at-least-16-chars",
  };

  beforeEach(() => {
    // Reset mocks
    MockConfigService.mockClear();

    // Set up configuration service mock
    configService = new MockConfigService() as any;

    // Mock the getRequired method
    configService.getRequired.mockImplementation((key: any) => {
      if (key in mockRequiredFields) {
        return mockRequiredFields[key];
      }
      throw new Error(`Required key not found: ${key}`);
    });

    // Mock the ensureValid method
    configService.ensureValid.mockImplementation(() => {});

    // Create provider with default configuration
    securityConfigProvider = new SecurityConfigProvider(configService);
  });

  it("should load security configuration with required values", () => {
    const config = securityConfigProvider.getConfig();

    expect(config.jwtSecret).toBe(mockRequiredFields.JWT_SECRET);
    expect(config.jwtRefreshSecret).toBe(mockRequiredFields.JWT_REFRESH_SECRET);
    expect(config.signatureSecret).toBeInstanceOf(Buffer);
    expect(config.passwordSalt).toBeInstanceOf(Buffer);

    // Check buffer contents
    expect(config.signatureSecret.toString("utf8")).toBe(
      mockRequiredFields.SIGNATURE_SECRET,
    );
    expect(config.passwordSalt.toString("utf8")).toBe(
      mockRequiredFields.PASSWORD_SALT,
    );
  });

  it("should validate configuration against schema on creation", () => {
    expect(configService.ensureValid).toHaveBeenCalledWith(
      expect.objectContaining({
        properties: expect.objectContaining({
          JWT_SECRET: expect.any(Object),
          JWT_EXPIRES_IN: expect.any(Object),
          JWT_REFRESH_EXPIRES_IN: expect.any(Object),
          PASSWORD_SALT_ROUNDS: expect.any(Object),
          RATE_LIMIT_WINDOW: expect.any(Object),
          RATE_LIMIT_MAX_REQUESTS: expect.any(Object),
          CORS_ORIGIN: expect.any(Object),
          CORS_METHODS: expect.any(Object),
          CORS_HEADERS: expect.any(Object),
          CORS_CREDENTIALS: expect.any(Object),
        }),
      }),
    );
  });

  it("should throw when required configuration is missing", () => {
    // Setup the mock to throw on getRequired
    configService.getRequired.mockImplementation((key: any) => {
      throw new Error(`Required key not found: ${key}`);
    });

    // Expect the provider creation to throw
    expect(() => {
      new SecurityConfigProvider(configService);
    }).toThrow();
  });

  it("should throw when configuration is invalid", () => {
    // Setup the mock to simulate validation failure
    configService.ensureValid.mockImplementation(() => {
      throw new ConfigValidationError("Configuration validation failed", [
        "JWT_SECRET is too short",
      ]);
    });

    // Expect the provider creation to throw
    expect(() => {
      new SecurityConfigProvider(configService);
    }).toThrow(ConfigValidationError);
  });

  it("should define proper configuration schema with security requirements", () => {
    const schema = securityConfigProvider.getConfigSchema();

    // Check schema definition for security requirements
    expect(schema.properties.JWT_SECRET.type).toBe("string");
    expect(schema.properties.JWT_SECRET.required).toBe(true);
    expect(schema.properties.JWT_SECRET.secret).toBe(true);

    // Check that other schema properties are defined
    expect(schema.properties.JWT_EXPIRES_IN.type).toBe("string");
    expect(schema.properties.JWT_EXPIRES_IN.default).toBe("1d");

    expect(schema.properties.JWT_REFRESH_EXPIRES_IN.type).toBe("string");
    expect(schema.properties.JWT_REFRESH_EXPIRES_IN.default).toBe("7d");

    expect(schema.properties.PASSWORD_SALT_ROUNDS.type).toBe("number");
    expect(schema.properties.PASSWORD_SALT_ROUNDS.default).toBe(10);
    expect(schema.properties.PASSWORD_SALT_ROUNDS.min).toBe(1);
    expect(schema.properties.PASSWORD_SALT_ROUNDS.max).toBe(20);
  });
});
