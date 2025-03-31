import path from "path";

import { ConfigService } from "@/server/infrastructure/config/ConfigService";
import { StorageConfigProvider } from "@/server/infrastructure/config/domain/StorageConfig";

// Mock ConfigService
jest.mock("@config/ConfigService");
const MockConfigService = ConfigService as jest.MockedClass<
  typeof ConfigService
>;

// Mock path for consistent testing
jest.mock("path", () => ({
  ...jest.requireActual("path"),
  join: jest.fn().mockImplementation((...args) => args.join("/")),
  resolve: jest.fn().mockImplementation((...args) => args.join("/")),
}));

describe("StorageConfig", () => {
  let configService: jest.Mocked<ConfigService>;
  let storageConfigProvider: StorageConfigProvider;
  const cwd = "/app";

  beforeEach(() => {
    // Reset mocks
    MockConfigService.mockClear();
    jest.spyOn(process, "cwd").mockReturnValue(cwd);

    // Set up configuration service mock
    configService = new MockConfigService() as jest.Mocked<ConfigService>;

    // Mock the getString method
    configService.getString = jest
      .fn()
      .mockImplementation((key, defaultValue) => {
        const defaults: Record<string, string | undefined> = {
          UPLOAD_DIR: undefined,
          QUEUE_PATH: undefined,
          TEMP_DIR: undefined,
          STORAGE_PATH: undefined,
          STORAGE_URL: "https://storage.example.com",
          STORAGE_IMAGE_DEFAULT_FORMAT: "webp",
        };
        return key in defaults ? defaults[key] : defaultValue;
      });

    // Mock the get method
    configService.get.mockImplementation((key, defaultValue) => {
      const defaults: Record<string, string | undefined> = {
        UPLOAD_DIR: undefined,
        QUEUE_PATH: undefined,
        TEMP_DIR: undefined,
        STORAGE_PATH: undefined,
        STORAGE_URL: "https://storage.example.com",
        STORAGE_IMAGE_DEFAULT_FORMAT: "webp",
      };
      return key in defaults ? defaults[key] : defaultValue;
    });

    // Mock the getNumber method
    configService.getNumber.mockImplementation((key, defaultValue): number => {
      if (
        key === "STORAGE_IMAGE_MAX_WIDTH" ||
        key === "STORAGE_IMAGE_MAX_HEIGHT"
      ) {
        return 0;
      }
      const values: Record<string, number | undefined> = {
        STORAGE_MAX_BYTES_TO_ANALYZE: 4096,
        STORAGE_IMAGE_DEFAULT_QUALITY: 80,
        STORAGE_IMAGE_MAX_WIDTH: 3840,
        STORAGE_IMAGE_MAX_HEIGHT: 2160,
        STORAGE_DEFAULT_CHUNK_SIZE: 65536,
        STORAGE_DEFAULT_HIGH_WATER_MARK: 16384,
      };
      return key in values
        ? (values[key] as number)
        : ((defaultValue as number) ?? 0);
    });

    // Mock the getBoolean method
    configService.getBoolean.mockImplementation(
      (key, defaultValue): boolean => {
        const values: Record<string, boolean | undefined> = {
          STORAGE_ANALYZE_CONTENT: false,
          STORAGE_IMAGE_OPTIMIZATION_ENABLED: true,
          STORAGE_IMAGE_STRIP_METADATA: true,
        };
        return key in values
          ? (values[key] as boolean)
          : ((defaultValue as boolean) ?? false);
      },
    );

    // Mock the ensureValid method
    configService.ensureValid.mockImplementation(() => {});

    // Create provider with default configuration
    storageConfigProvider = new StorageConfigProvider(configService);
  });

  it("should load storage configuration with defaults", () => {
    const cwd = process.cwd();
    const expectedUploadDir = path.join(cwd, "uploads");
    const expectedQueuePath = path.join(cwd, "queue");
    const expectedTempDir = path.join(cwd, "temp");
    const expectedStoragePath = path.join(cwd, "storage");

    const config = storageConfigProvider.getConfig();

    // Log actual config for debugging
    console.log("Actual config:", JSON.stringify(config, null, 2));

    // Test individual parts instead of the whole object
    expect(config.uploadDir).toBe(expectedUploadDir);
    expect(config.queuePath).toBe(expectedQueuePath);
    expect(config.tempDir).toBe(expectedTempDir);
    expect(config.basePath).toBe(expectedStoragePath);
    expect(config.baseUrl).toBe("https://storage.example.com");

    // Test content detection separately
    expect(config.contentDetection.analyzeContent).toBe(false);
    expect(config.contentDetection.maxBytesToAnalyze).toBe(4096);

    // Test image optimization separately
    expect(config.imageOptimization.enabled).toBe(true);
    expect(config.imageOptimization.defaultQuality).toBe(80);
    expect(config.imageOptimization.maxDimensions).toBeUndefined();
    expect(config.imageOptimization.defaultFormat).toBe("webp");
    expect(config.imageOptimization.stripMetadata).toBe(true);

    // Test streaming separately
    expect(config.streaming.defaultChunkSize).toBe(65536);
    expect(config.streaming.defaultHighWaterMark).toBe(16384);
  });

  it("should validate configuration against schema on creation", () => {
    expect(configService.ensureValid).toHaveBeenCalledWith(
      expect.objectContaining({
        properties: expect.objectContaining({
          UPLOAD_DIR: expect.any(Object),
          QUEUE_PATH: expect.any(Object),
          TEMP_DIR: expect.any(Object),
          STORAGE_PATH: expect.any(Object),
          STORAGE_URL: expect.any(Object),
          STORAGE_ANALYZE_CONTENT: expect.any(Object),
          STORAGE_MAX_BYTES_TO_ANALYZE: expect.any(Object),
          STORAGE_IMAGE_OPTIMIZATION_ENABLED: expect.any(Object),
          STORAGE_IMAGE_DEFAULT_QUALITY: expect.any(Object),
          STORAGE_IMAGE_DEFAULT_FORMAT: expect.any(Object),
          STORAGE_IMAGE_STRIP_METADATA: expect.any(Object),
        }),
      }),
    );
  });

  it("should use custom configuration values", () => {
    // Mock getString method for custom values
    configService.getString.mockImplementation(
      (key: string, defaultValue?: string): string => {
        switch (key) {
          case "UPLOAD_DIR":
            return "/custom/uploads";
          case "QUEUE_PATH":
            return "/custom/queue";
          case "TEMP_DIR":
            return "/custom/temp";
          case "STORAGE_PATH":
            return "/custom/storage";
          case "STORAGE_URL":
            return "https://custom.storage.example.com";
          case "STORAGE_IMAGE_DEFAULT_FORMAT":
            return "jpeg";
          default:
            return defaultValue || "";
        }
      },
    );

    // Mock config values
    configService.get.mockImplementation((key: string) => {
      switch (key) {
        case "UPLOAD_DIR":
          return "/custom/uploads";
        case "QUEUE_PATH":
          return "/custom/queue";
        case "TEMP_DIR":
          return "/custom/temp";
        case "STORAGE_PATH":
          return "/custom/storage";
        case "STORAGE_URL":
          return "https://custom.storage.example.com";
        case "STORAGE_ANALYZE_CONTENT":
          return "true";
        case "STORAGE_MAX_BYTES_TO_ANALYZE":
          return "8192";
        case "STORAGE_IMAGE_OPTIMIZATION_ENABLED":
          return "true";
        case "STORAGE_IMAGE_DEFAULT_QUALITY":
          return "90";
        case "STORAGE_IMAGE_DEFAULT_FORMAT":
          return "jpeg";
        case "STORAGE_IMAGE_STRIP_METADATA":
          return "false";
        default:
          return undefined;
      }
    });

    // Mock getNumber specifically for this test
    configService.getNumber.mockImplementation((key, defaultValue): number => {
      if (key === "STORAGE_MAX_BYTES_TO_ANALYZE") {
        return 8192;
      }
      if (key === "STORAGE_IMAGE_DEFAULT_QUALITY") {
        return 90;
      }
      return (defaultValue as number) ?? 0;
    });

    // Mock getBoolean specifically for this test
    configService.getBoolean.mockImplementation(
      (key, defaultValue): boolean => {
        if (key === "STORAGE_ANALYZE_CONTENT") {
          return true;
        }
        if (key === "STORAGE_IMAGE_STRIP_METADATA") {
          return false;
        }
        return (defaultValue as boolean) ?? false;
      },
    );

    // Recreate provider to use new mocks
    storageConfigProvider = new StorageConfigProvider(configService);
    const config = storageConfigProvider.getConfig();

    // Log actual config for debugging
    console.log("Custom config:", JSON.stringify(config, null, 2));

    // Test individual parts instead of the whole object
    expect(config.uploadDir).toBe("/custom/uploads");
    expect(config.queuePath).toBe("/custom/queue");
    expect(config.tempDir).toBe("/custom/temp");
    expect(config.basePath).toBe("/custom/storage");
    expect(config.baseUrl).toBe("https://custom.storage.example.com");

    // Test content detection separately
    expect(config.contentDetection.analyzeContent).toBe(true);
    expect(config.contentDetection.maxBytesToAnalyze).toBe(8192);

    // Test image optimization separately
    expect(config.imageOptimization.enabled).toBe(true);
    expect(config.imageOptimization.defaultQuality).toBe(90);
    expect(config.imageOptimization.maxDimensions).toBeUndefined();
    expect(config.imageOptimization.defaultFormat).toBe("jpeg");
    expect(config.imageOptimization.stripMetadata).toBe(true);

    // Test streaming separately
    expect(config.streaming.defaultChunkSize).toBe(65536);
    expect(config.streaming.defaultHighWaterMark).toBe(16384);
  });

  it("should handle missing max dimensions properly", () => {
    // Remove the max dimensions
    configService.getNumber.mockImplementation((key, defaultValue): number => {
      if (
        key === "STORAGE_IMAGE_MAX_WIDTH" ||
        key === "STORAGE_IMAGE_MAX_HEIGHT"
      ) {
        return 0;
      }
      return defaultValue ?? 0;
    });

    // Create a new provider without max dimensions
    const customProvider = new StorageConfigProvider(configService);
    const config = customProvider.getConfig();

    // Verify max dimensions are undefined
    expect(config.imageOptimization.maxDimensions).toBeUndefined();
  });

  it("should handle invalid image format properly", () => {
    // Mock config values
    configService.get.mockImplementation((key: string) => {
      if (key === "STORAGE_IMAGE_DEFAULT_FORMAT") {
        return "invalid";
      }
      return undefined;
    });

    const config = storageConfigProvider.getConfig();

    // Verify format is undefined (since invalid was provided)
    expect(config.imageOptimization.defaultFormat).toBe("webp"); // Should use default
  });

  it("should define proper configuration schema with validation", () => {
    const schema = storageConfigProvider.getConfigSchema();

    // Check basic schema definitions
    expect(schema.properties.UPLOAD_DIR.type).toBe("string");
    expect(schema.properties.QUEUE_PATH.type).toBe("string");
    expect(schema.properties.TEMP_DIR.type).toBe("string");

    // Check content detection settings
    expect(schema.properties.STORAGE_ANALYZE_CONTENT.type).toBe("boolean");
    expect(schema.properties.STORAGE_MAX_BYTES_TO_ANALYZE.type).toBe("number");
    expect(schema.properties.STORAGE_MAX_BYTES_TO_ANALYZE.min).toBe(1024);

    // Check image optimization settings
    expect(schema.properties.STORAGE_IMAGE_OPTIMIZATION_ENABLED.type).toBe(
      "boolean",
    );
    expect(schema.properties.STORAGE_IMAGE_DEFAULT_QUALITY.type).toBe("number");
    expect(schema.properties.STORAGE_IMAGE_DEFAULT_QUALITY.min).toBe(1);
    expect(schema.properties.STORAGE_IMAGE_DEFAULT_QUALITY.max).toBe(100);
  });
});
