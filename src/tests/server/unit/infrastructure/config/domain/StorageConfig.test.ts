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
  default: {
    isAbsolute: (p: string) => p.startsWith("/") || p.startsWith("C:"),
    join: (...paths: string[]) => paths.join("/"),
    resolve: (...paths: string[]) => paths.join("/"),
    dirname: (p: string) => p.split("/").slice(0, -1).join("/"),
    basename: (p: string) => p.split("/").pop() || "",
    extname: (p: string) => {
      const parts = p.split(".");
      return parts.length > 1 ? `.${parts.pop()}` : "";
    },
  },
  isAbsolute: (p: string) => p.startsWith("/") || p.startsWith("C:"),
  join: (...paths: string[]) => paths.join("/"),
  resolve: (...paths: string[]) => paths.join("/"),
  dirname: (p: string) => p.split("/").slice(0, -1).join("/"),
  basename: (p: string) => p.split("/").pop() || "",
  extname: (p: string) => {
    const parts = p.split(".");
    return parts.length > 1 ? `.${parts.pop()}` : "";
  },
}));

describe("StorageConfig", () => {
  let configService: ConfigService;
  let storageConfigProvider: StorageConfigProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(process, "cwd").mockReturnValue("/app");
    vi.spyOn(path, "isAbsolute").mockImplementation((pathStr: string) =>
      pathStr.startsWith("/"),
    );
    vi.spyOn(path, "join").mockImplementation((...paths: string[]) =>
      paths.join("/"),
    );

    // Set up configuration service mock
    configService = new MockConfigService() as ConfigService;

    // Mock the getString method
    configService.getString = vi
      .fn()
      .mockImplementation((key, defaultValue) => {
        const defaults: Record<string, string | undefined> = {
          UPLOAD_DIR: "./uploads",
          QUEUE_PATH: "./queue",
          TEMP_DIR: "./temp",
          STORAGE_PATH: "./storage",
          STORAGE_URL: "http://localhost:8080/uploads",
          STORAGE_PUBLIC_DIR: "public",
          STORAGE_PRIVATE_DIR: "private",
          STORAGE_ACCEPTED_IMAGE_TYPES: "image/jpeg,image/png,image/gif",
          STORAGE_ACCEPTED_DOCUMENT_TYPES: "application/pdf,text/plain",
          STORAGE_IMAGE_DEFAULT_FORMAT: "webp",
        };
        return defaults[key] ?? defaultValue ?? "";
      });

    // Mock the get method
    configService.get = vi.fn().mockImplementation((key, defaultValue) => {
      const defaults: Record<string, string | undefined> = {
        UPLOAD_DIR: "./uploads",
        QUEUE_PATH: "./queue",
        TEMP_DIR: "./temp",
        STORAGE_PATH: "./storage",
        STORAGE_URL: "http://localhost:8080/uploads",
        STORAGE_PUBLIC_DIR: "public",
        STORAGE_PRIVATE_DIR: "private",
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
        if (key === "STORAGE_DEFAULT_CHUNK_SIZE") {
          return 65536;
        }
        if (key === "STORAGE_DEFAULT_HIGH_WATER_MARK") {
          return 16384;
        }
        if (key === "STORAGE_MAX_BYTES_TO_ANALYZE") {
          return 4096;
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
          STORAGE_IMAGE_STRIP_METADATA: false,
        };
        return values[key] ?? defaultValue ?? false;
      });

    // Set up NODE_ENV
    process.env.NODE_ENV = "test";

    // Create provider
    storageConfigProvider = new StorageConfigProvider(configService);
  });

  it("should load storage configuration with defaults", () => {
    const expectedUploadDir = "/uploads";
    const expectedQueuePath = "/uploads/queue";
    const expectedPublicDir = "/uploads/public";
    const expectedPrivateDir = "/uploads/private";
    const expectedTempDir = "/uploads/temp";

    const config = storageConfigProvider.getConfig();

    expect(config).toEqual({
      uploadDir: expectedUploadDir,
      queuePath: expectedQueuePath,
      publicDir: expectedPublicDir,
      privateDir: expectedPrivateDir,
      tempDir: expectedTempDir,
      basePath: expectedUploadDir,
      baseUrl: "http://localhost:8080/uploads",
      maxFileSize: 10485760, // 10MB
      maxFilesPerRequest: 10,
      analyzeContent: false,
      contentDetection: {
        analyzeContent: false,
        maxBytesToAnalyze: 4096,
      },
      imageOptimization: {
        enabled: true,
        defaultQuality: 90,
        maxDimensions: {
          width: 1920,
          height: 1920,
        },
        defaultFormat: "webp",
        stripMetadata: false,
      },
      streaming: {
        defaultChunkSize: 65536,
        defaultHighWaterMark: 16384,
      },
      acceptedImageTypes: ["image/jpeg", "image/png", "image/gif"],
      acceptedDocumentTypes: ["application/pdf", "text/plain"],
    });
  });

  it("should validate configuration against schema on creation", () => {
    // Mock ensureValid method
    configService.ensureValid = vi.fn();

    // Create provider to trigger validation
    new StorageConfigProvider(configService);

    // Verify ensureValid was called with schema
    expect(configService.ensureValid).toHaveBeenCalledWith({
      properties: {
        STORAGE_ANALYZE_CONTENT: {
          type: "boolean",
          default: false,
          description: "Whether to analyze file content",
        },
        STORAGE_MAX_BYTES_TO_ANALYZE: {
          type: "number",
          default: 4096,
          min: 1024,
          description:
            "Maximum number of bytes to analyze for content detection",
        },
        STORAGE_IMAGE_OPTIMIZATION_ENABLED: {
          type: "boolean",
          default: true,
          description: "Whether to optimize images",
        },
        STORAGE_IMAGE_QUALITY: {
          type: "number",
          default: 90,
          min: 1,
          max: 100,
          description: "Default image quality (1-100)",
        },
        STORAGE_IMAGE_MAX_WIDTH: {
          type: "number",
          description: "Maximum image width",
          required: false,
        },
        STORAGE_IMAGE_MAX_HEIGHT: {
          type: "number",
          description: "Maximum image height",
          required: false,
        },
        STORAGE_IMAGE_DEFAULT_FORMAT: {
          type: "string",
          default: "webp",
          description: "Default image format for optimization",
        },
        STORAGE_IMAGE_STRIP_METADATA: {
          type: "boolean",
          default: true,
          description: "Whether to strip image metadata",
        },
        STORAGE_PATH: {
          type: "string",
          default: "./storage",
          description: "Storage root path",
        },
        STORAGE_URL: {
          type: "string",
          default: "https://storage.example.com",
          description: "Storage base URL",
        },
        UPLOAD_DIR: {
          type: "string",
          default: "./uploads",
          description: "Upload directory path",
        },
        QUEUE_PATH: {
          type: "string",
          default: "./queue",
          description: "Queue directory path",
        },
        TEMP_DIR: {
          type: "string",
          default: "./temp",
          description: "Temporary directory path",
        },
        STORAGE_PUBLIC_DIR: {
          type: "string",
          default: "public",
          description: "Public directory path",
        },
        STORAGE_PRIVATE_DIR: {
          type: "string",
          default: "private",
          description: "Private directory path",
        },
        STORAGE_TEMP_DIR: {
          type: "string",
          default: "temp",
          description: "Temporary directory path",
        },
        STORAGE_MAX_FILE_SIZE: {
          type: "number",
          default: 10 * 1024 * 1024,
          description: "Maximum file size",
        },
        STORAGE_MAX_FILES_PER_REQUEST: {
          type: "number",
          default: 10,
          description: "Maximum number of files per request",
        },
        STORAGE_ACCEPTED_IMAGE_TYPES: {
          type: "string",
          default: "image/jpeg,image/png,image/gif",
          description: "Accepted image types",
        },
        STORAGE_ACCEPTED_DOCUMENT_TYPES: {
          type: "string",
          default: "application/pdf,text/plain",
          description: "Accepted document types",
        },
      },
    });
  });

  it("should handle custom configuration values", () => {
    // Override mock implementations for custom values
    configService.getString = vi
      .fn()
      .mockImplementation((key, defaultValue) => {
        // Custom values for the test
        const customValues: Record<string, string> = {
          UPLOAD_DIR: "/uploads",
          QUEUE_PATH: "/uploads/queue",
          TEMP_DIR: "/uploads/temp",
          STORAGE_PUBLIC_DIR: "public",
          STORAGE_PRIVATE_DIR: "private",
          STORAGE_IMAGE_DEFAULT_FORMAT: "jpeg",
          STORAGE_URL: "https://storage.example.com",
          STORAGE_ACCEPTED_IMAGE_TYPES: "image/webp,image/avif",
        };
        return customValues[key] ?? defaultValue ?? "";
      });

    // Mock NODE_ENV to be non-test so that paths are not overridden
    process.env.NODE_ENV = "";

    // Create new instance with custom config
    const customConfigProvider = new StorageConfigProvider(configService);
    const config = customConfigProvider.getConfig();

    // Since process.cwd() is mocked to return "/app", the paths will have "/app" prefix
    expect(config.uploadDir).toBe("/app//uploads");
    expect(config.queuePath).toBe("/app//uploads/queue");
    expect(config.tempDir).toBe("/app//uploads/temp");
    expect(config.publicDir).toBe("/app//uploads/public");
    expect(config.privateDir).toBe("/app//uploads/private");

    expect(config.baseUrl).toBe("https://storage.example.com");
    expect(config.imageOptimization.defaultFormat).toBe("jpeg");
    expect(config.acceptedImageTypes).toEqual(["image/webp", "image/avif"]);
  });

  it("should throw error when configuration validation fails", () => {
    // Mock ensureValid to throw error
    configService.ensureValid = vi.fn().mockImplementation(() => {
      throw new ConfigValidationError("Invalid configuration", [
        "Invalid STORAGE_MAX_FILE_SIZE",
      ]);
    });

    // Expect error to be thrown when creating provider
    expect(() => new StorageConfigProvider(configService)).toThrow(
      ConfigValidationError,
    );
  });

  it("should define proper configuration schema", () => {
    const schema = storageConfigProvider.getConfigSchema();

    expect(schema.properties.STORAGE_TEMP_DIR.type).toBe("string");
    expect(schema.properties.STORAGE_MAX_FILE_SIZE.type).toBe("number");
    expect(schema.properties.STORAGE_MAX_FILE_SIZE.default).toBe(
      10 * 1024 * 1024,
    );
    expect(schema.properties.STORAGE_MAX_FILES_PER_REQUEST.type).toBe("number");
    expect(schema.properties.STORAGE_MAX_FILES_PER_REQUEST.default).toBe(10);
  });
});
