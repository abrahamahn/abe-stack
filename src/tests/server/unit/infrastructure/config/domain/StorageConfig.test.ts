import path from "path";

import { describe, it, expect, beforeEach, vi } from "vitest";

import { ConfigService } from "@/server/infrastructure/config/ConfigService";
import { StorageConfigProvider } from "@/server/infrastructure/config/domain/StorageConfig";
import { ConfigValidationError } from "@/server/infrastructure/errors/infrastructure/ConfigValidationError";

// Mock ConfigService
vi.mock("@config/ConfigService");
const MockConfigService = vi.mocked(ConfigService);

// Mock path for consistent testing
vi.mock("path", () => ({
  ...vi.importActual("path"),
  join: vi.fn().mockImplementation((...args) => args.join("/")),
  resolve: vi.fn().mockImplementation((...args) => args.join("/")),
}));

describe("StorageConfig", () => {
  let configService: any;
  let storageConfigProvider: StorageConfigProvider;
  const cwd = "/app";

  beforeEach(() => {
    // Reset mocks
    MockConfigService.mockClear();
    vi.spyOn(process, "cwd").mockReturnValue(cwd);

    // Set up configuration service mock
    configService = new MockConfigService() as any;

    // Mock the getString method
    configService.getString = vi
      .fn()
      .mockImplementation((key, defaultValue) => {
        const defaults: Record<string, string | undefined> = {
          UPLOAD_DIR: undefined,
          QUEUE_PATH: undefined,
          STORAGE_PUBLIC_DIR: "public",
          STORAGE_PRIVATE_DIR: "private",
          STORAGE_TEMP_DIR: "temp",
          STORAGE_ACCEPTED_IMAGE_TYPES: "image/jpeg,image/png,image/gif",
          STORAGE_ACCEPTED_DOCUMENT_TYPES: "application/pdf,text/plain",
        };
        return defaults[key] ?? defaultValue ?? "";
      });

    // Mock the get method
    configService.get = vi.fn().mockImplementation((key, defaultValue) => {
      const defaults: Record<string, string | undefined> = {
        UPLOAD_DIR: undefined,
        QUEUE_PATH: undefined,
        STORAGE_PUBLIC_DIR: "public",
        STORAGE_PRIVATE_DIR: "private",
        STORAGE_TEMP_DIR: "temp",
        STORAGE_ACCEPTED_IMAGE_TYPES: "image/jpeg,image/png,image/gif",
        STORAGE_ACCEPTED_DOCUMENT_TYPES: "application/pdf,text/plain",
      };
      return defaults[key] ?? defaultValue ?? "";
    });

    // Mock the getNumber method
    configService.getNumber = vi
      .fn()
      .mockImplementation((key, defaultValue): number => {
        if (
          key === "STORAGE_IMAGE_MAX_WIDTH" ||
          key === "STORAGE_IMAGE_MAX_HEIGHT"
        ) {
          return 1920;
        }
        if (key === "STORAGE_MAX_FILE_SIZE") {
          return 10485760; // 10MB
        }
        if (key === "STORAGE_IMAGE_QUALITY") {
          return 90;
        }
        if (key === "STORAGE_MAX_FILES_PER_REQUEST") {
          return 10;
        }
        return defaultValue ?? 0;
      });

    // Mock the getBoolean method
    configService.getBoolean = vi
      .fn()
      .mockImplementation((key, defaultValue): boolean => {
        const values: Record<string, boolean | undefined> = {
          STORAGE_ANALYZE_CONTENT: false,
          STORAGE_IMAGE_OPTIMIZATION_ENABLED: true,
        };
        return values[key] ?? defaultValue ?? false;
      });

    // Create provider
    storageConfigProvider = new StorageConfigProvider(configService);
  });

  it("should load storage configuration with defaults", () => {
    const cwd = process.cwd();
    const expectedUploadDir = path.join(cwd, "uploads");
    const expectedQueuePath = path.join(cwd, "queue");
    const expectedPublicDir = path.join(expectedUploadDir, "public");
    const expectedPrivateDir = path.join(expectedUploadDir, "private");
    const expectedTempDir = path.join(expectedUploadDir, "temp");

    const config = storageConfigProvider.getConfig();

    expect(config).toEqual({
      uploadDir: expectedUploadDir,
      queuePath: expectedQueuePath,
      publicDir: expectedPublicDir,
      privateDir: expectedPrivateDir,
      tempDir: expectedTempDir,
      maxFileSize: 10485760, // 10MB
      maxFilesPerRequest: 10,
      analyzeContent: false,
      imageOptimization: {
        enabled: true,
        maxWidth: 1920,
        maxHeight: 1920,
        quality: 90,
      },
      acceptedImageTypes: ["image/jpeg", "image/png", "image/gif"],
      acceptedDocumentTypes: ["application/pdf", "text/plain"],
    });
  });

  it("should validate configuration against schema on creation", () => {
    // Mock ensureValid method
    configService.ensureValid = vi.fn();

    // Get config to trigger validation
    storageConfigProvider.getConfig();

    // Verify ensureValid was called with schema
    expect(configService.ensureValid).toHaveBeenCalledWith(
      expect.objectContaining({
        properties: {
          UPLOAD_DIR: expect.any(Object),
          QUEUE_PATH: expect.any(Object),
          STORAGE_PUBLIC_DIR: expect.any(Object),
          STORAGE_PRIVATE_DIR: expect.any(Object),
          STORAGE_TEMP_DIR: expect.any(Object),
          STORAGE_MAX_FILE_SIZE: expect.any(Object),
          STORAGE_MAX_FILES_PER_REQUEST: expect.any(Object),
          STORAGE_ANALYZE_CONTENT: expect.any(Object),
          STORAGE_IMAGE_OPTIMIZATION_ENABLED: expect.any(Object),
          STORAGE_IMAGE_MAX_WIDTH: expect.any(Object),
          STORAGE_IMAGE_MAX_HEIGHT: expect.any(Object),
          STORAGE_IMAGE_QUALITY: expect.any(Object),
          STORAGE_ACCEPTED_IMAGE_TYPES: expect.any(Object),
          STORAGE_ACCEPTED_DOCUMENT_TYPES: expect.any(Object),
        },
      }),
    );
  });

  it("should handle custom configuration values", () => {
    // Modify mocks to return custom values
    configService.getString = vi.fn().mockImplementation((key) => {
      const values: Record<string, string> = {
        UPLOAD_DIR: "/custom/uploads",
        QUEUE_PATH: "/custom/queue",
        STORAGE_PUBLIC_DIR: "user-uploads",
        STORAGE_PRIVATE_DIR: "secure",
        STORAGE_TEMP_DIR: "temporary",
        STORAGE_ACCEPTED_IMAGE_TYPES: "image/webp,image/avif",
        STORAGE_ACCEPTED_DOCUMENT_TYPES:
          "application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      };
      return values[key] || "";
    });

    configService.get = vi.fn().mockImplementation((key) => {
      const values: Record<string, string> = {
        UPLOAD_DIR: "/custom/uploads",
        QUEUE_PATH: "/custom/queue",
        STORAGE_PUBLIC_DIR: "user-uploads",
        STORAGE_PRIVATE_DIR: "secure",
        STORAGE_TEMP_DIR: "temporary",
        STORAGE_ACCEPTED_IMAGE_TYPES: "image/webp,image/avif",
        STORAGE_ACCEPTED_DOCUMENT_TYPES:
          "application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      };
      return values[key] || "";
    });

    configService.getNumber = vi.fn().mockImplementation((key): number => {
      const values: Record<string, number> = {
        STORAGE_MAX_FILE_SIZE: 20971520, // 20MB
        STORAGE_MAX_FILES_PER_REQUEST: 5,
        STORAGE_IMAGE_MAX_WIDTH: 800,
        STORAGE_IMAGE_MAX_HEIGHT: 600,
        STORAGE_IMAGE_QUALITY: 75,
      };
      return values[key] || 0;
    });

    configService.getBoolean = vi.fn().mockImplementation((key): boolean => {
      const values: Record<string, boolean> = {
        STORAGE_ANALYZE_CONTENT: true,
        STORAGE_IMAGE_OPTIMIZATION_ENABLED: false,
      };
      return values[key] || false;
    });

    // Re-create provider with new mocks
    storageConfigProvider = new StorageConfigProvider(configService);
    const config = storageConfigProvider.getConfig();

    // Verify custom values are used
    expect(config.uploadDir).toBe("/custom/uploads");
    expect(config.queuePath).toBe("/custom/queue");
    expect(config.publicDir).toBe("/custom/uploads/user-uploads");
    expect(config.privateDir).toBe("/custom/uploads/secure");
    expect(config.tempDir).toBe("/custom/uploads/temporary");
    expect(config.maxFileSize).toBe(20971520);
    expect(config.maxFilesPerRequest).toBe(5);
    expect(config.analyzeContent).toBe(true);
    expect(config.imageOptimization).toEqual({
      enabled: false,
      maxWidth: 800,
      maxHeight: 600,
      quality: 75,
    });
    expect(config.acceptedImageTypes).toEqual(["image/webp", "image/avif"]);
    expect(config.acceptedDocumentTypes).toEqual([
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ]);
  });

  it("should throw error when configuration validation fails", () => {
    // Mock ensureValid to throw error
    configService.ensureValid = vi.fn().mockImplementation(() => {
      throw new ConfigValidationError("Invalid storage configuration", [
        "Invalid STORAGE_MAX_FILE_SIZE",
      ]);
    });

    // Expect error to be thrown when config is retrieved
    expect(() => storageConfigProvider.getConfig()).toThrow(
      ConfigValidationError,
    );
    expect(() => storageConfigProvider.getConfig()).toThrow(
      "Invalid storage configuration",
    );
  });

  it("should define proper configuration schema", () => {
    const schema = storageConfigProvider.getConfigSchema();

    // Check schema properties
    expect(schema.properties.UPLOAD_DIR.type).toBe("string");
    expect(schema.properties.QUEUE_PATH.type).toBe("string");
    expect(schema.properties.STORAGE_PUBLIC_DIR.type).toBe("string");
    expect(schema.properties.STORAGE_PRIVATE_DIR.type).toBe("string");
    expect(schema.properties.STORAGE_TEMP_DIR.type).toBe("string");
    expect(schema.properties.STORAGE_MAX_FILE_SIZE.type).toBe("number");
    expect(schema.properties.STORAGE_MAX_FILE_SIZE.min).toBe(1024);
    expect(schema.properties.STORAGE_MAX_FILES_PER_REQUEST.type).toBe("number");
    expect(schema.properties.STORAGE_MAX_FILES_PER_REQUEST.min).toBe(1);
    expect(schema.properties.STORAGE_ANALYZE_CONTENT.type).toBe("boolean");
    expect(schema.properties.STORAGE_IMAGE_OPTIMIZATION_ENABLED.type).toBe(
      "boolean",
    );
    expect(schema.properties.STORAGE_IMAGE_MAX_WIDTH.type).toBe("number");
    expect(schema.properties.STORAGE_IMAGE_MAX_WIDTH.min).toBe(16);
    expect(schema.properties.STORAGE_IMAGE_MAX_HEIGHT.type).toBe("number");
    expect(schema.properties.STORAGE_IMAGE_MAX_HEIGHT.min).toBe(16);
    expect(schema.properties.STORAGE_IMAGE_QUALITY.type).toBe("number");
    expect(schema.properties.STORAGE_IMAGE_QUALITY.min).toBe(1);
    expect(schema.properties.STORAGE_IMAGE_QUALITY.max).toBe(100);
    expect(schema.properties.STORAGE_ACCEPTED_IMAGE_TYPES.type).toBe("array");
    expect(schema.properties.STORAGE_ACCEPTED_DOCUMENT_TYPES.type).toBe(
      "array",
    );
  });
});
