import { describe, it, expect, beforeEach, vi } from "vitest";

import { ConfigService } from "@/server/infrastructure/config/ConfigService";
import { EmailConfigProvider } from "@/server/infrastructure/config/domain/EmailConfig";
import { ConfigValidationError } from "@/server/infrastructure/errors/infrastructure/ConfigValidationError";

// Mock ConfigService
vi.mock("@/server/infrastructure/config/ConfigService");

describe("EmailConfig", () => {
  let configService: any;

  const mockConfigValues: Record<string, string> = {
    EMAIL_HOST: "smtp.example.com",
    EMAIL_USER: "user@example.com",
    EMAIL_PASSWORD: "password123",
    EMAIL_FROM: "noreply@example.com",
  };

  beforeEach(() => {
    // Reset mocks
    vi.mocked(ConfigService).mockClear();

    // Set up configuration service mock
    configService = new ConfigService() as any;

    // Mock the getString method
    configService.getString = vi
      .fn()
      .mockImplementation((key: string, defaultValue: string = "") => {
        return mockConfigValues[key] || defaultValue;
      });

    // Mock the get method for compatibility
    configService.get = vi
      .fn()
      .mockImplementation((key: string, defaultValue: any) => {
        return mockConfigValues[key] || defaultValue;
      });

    // Mock the getNumber method
    configService.getNumber = vi
      .fn()
      .mockImplementation((key: string, defaultValue: number = 0): number => {
        if (key === "EMAIL_PORT") return 465;
        return defaultValue;
      });

    // Mock the getBoolean method
    configService.getBoolean = vi
      .fn()
      .mockImplementation(
        (key: string, defaultValue: boolean = false): boolean => {
          if (key === "EMAIL_SECURE") return true;
          return defaultValue;
        },
      );

    // Mock the ensureValid method
    configService.ensureValid = vi.fn();

    // Mock the logger
    configService.logger = {
      info: vi.fn(),
      debug: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
    };
  });

  it("should load email configuration with defaults", () => {
    // Create provider with default configuration
    const emailConfigProvider = new EmailConfigProvider(configService);
    const config = emailConfigProvider.getConfig();

    expect(config).toEqual({
      host: "smtp.example.com",
      port: 465,
      secure: true,
      auth: {
        user: "user@example.com",
        pass: "password123",
      },
      from: "noreply@example.com",
    });

    // Verify ensureValid was called during construction
    expect(configService.ensureValid).toHaveBeenCalled();
  });

  it("should validate configuration against schema on creation", () => {
    // Create the provider to trigger validation
    new EmailConfigProvider(configService);

    expect(configService.ensureValid).toHaveBeenCalledWith(
      expect.objectContaining({
        properties: expect.objectContaining({
          EMAIL_HOST: expect.any(Object),
          EMAIL_PORT: expect.any(Object),
          EMAIL_USER: expect.any(Object),
          EMAIL_PASSWORD: expect.any(Object),
          EMAIL_FROM: expect.any(Object),
          EMAIL_SECURE: expect.any(Object),
        }),
      }),
    );
  });

  it("should throw when required configuration is missing", () => {
    // Clear the mock values to simulate missing configuration
    mockConfigValues.EMAIL_HOST = "";
    mockConfigValues.EMAIL_USER = "";
    mockConfigValues.EMAIL_PASSWORD = "";

    // Setup the ensureValid mock to throw on missing required values
    configService.ensureValid.mockImplementation(() => {
      throw new ConfigValidationError("Configuration validation failed", [
        "Required fields missing",
      ]);
    });

    // Expect the provider creation to throw
    expect(() => {
      new EmailConfigProvider(configService);
    }).toThrow(ConfigValidationError);
  });

  it("should throw when configuration is invalid", () => {
    // Setup the mock to simulate validation failure
    configService.ensureValid.mockImplementation(() => {
      throw new ConfigValidationError("Configuration validation failed", [
        "EMAIL_FROM has invalid format",
      ]);
    });

    // Expect the provider creation to throw
    expect(() => {
      new EmailConfigProvider(configService);
    }).toThrow(ConfigValidationError);
  });

  it("should use custom configuration values", () => {
    // Setup mock with custom values
    configService.getString = vi
      .fn()
      .mockImplementation((key: string, defaultValue: string = "") => {
        const customValues: Record<string, string> = {
          EMAIL_HOST: "custom.smtp.example.com",
          EMAIL_USER: "custom@example.com",
          EMAIL_PASSWORD: "custompassword123",
          EMAIL_FROM: "custom@example.com",
        };
        return customValues[key] || defaultValue;
      });

    configService.getNumber = vi
      .fn()
      .mockImplementation((key: string, defaultValue: number = 0) => {
        if (key === "EMAIL_PORT") return 587;
        return defaultValue;
      });

    configService.getBoolean = vi
      .fn()
      .mockImplementation((key: string, defaultValue: boolean = false) => {
        if (key === "EMAIL_SECURE") return true;
        return defaultValue;
      });

    // Create provider with custom configuration
    const emailConfigProvider = new EmailConfigProvider(configService);
    const config = emailConfigProvider.getConfig();

    // Check that the custom values were used, but be flexible about types
    expect(config).toEqual({
      host: "custom.smtp.example.com",
      port: expect.any(Number),
      secure: true,
      auth: {
        user: "custom@example.com",
        pass: "custompassword123",
      },
      from: "custom@example.com",
    });

    // Also verify the actual values independently
    expect(config.port).toBe(587);
  });

  it("should define proper configuration schema with validation", () => {
    const emailConfigProvider = new EmailConfigProvider(configService);
    const schema = emailConfigProvider.getConfigSchema();

    // Check basic schema definitions
    expect(schema.properties.EMAIL_HOST.type).toBe("string");
    expect(schema.properties.EMAIL_PORT.type).toBe("number");
    expect(schema.properties.EMAIL_PORT.min).toBe(1);
    expect(schema.properties.EMAIL_PORT.max).toBe(65535);

    // Check auth settings
    expect(schema.properties.EMAIL_USER.type).toBe("string");
    expect(schema.properties.EMAIL_PASSWORD.type).toBe("string");
    expect(schema.properties.EMAIL_PASSWORD.secret).toBe(true);

    // Check other settings
    expect(schema.properties.EMAIL_FROM.type).toBe("string");
    expect(schema.properties.EMAIL_SECURE.type).toBe("boolean");
  });
});
