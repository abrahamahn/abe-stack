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
    const expectedTempDir = path.join(cwd, "temp");

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
    // Modify mocks to return custom values
    configService.getString = vi.fn().mockImplementation((key): string => {
      const values: Record<string, string> = {
        UPLOAD_DIR: "/custom/uploads",
        QUEUE_PATH: "/custom/queue",
        STORAGE_PUBLIC_DIR: "/custom/public",
        STORAGE_PRIVATE_DIR: "/custom/private",
        STORAGE_TEMP_DIR: "/custom/temporary",
        STORAGE_URL: "https://example.com/storage",
        STORAGE_IMAGE_DEFAULT_FORMAT: "webp",
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
        STORAGE_MAX_BYTES_TO_ANALYZE: 4096,
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
    expect(config.tempDir).toBe("/custom/temporary");
    expect(config.basePath).toBe("/custom/uploads");
    expect(config.baseUrl).toBe("https://example.com/storage");
    expect(config.maxFileSize).toBe(20971520);
    expect(config.maxFilesPerRequest).toBe(5);
    expect(config.imageOptimization).toEqual({
      enabled: false,
      defaultQuality: 75,
      maxDimensions: {
        width: 800,
        height: 600,
      },
      defaultFormat: "webp",
      stripMetadata: false,
    });
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
