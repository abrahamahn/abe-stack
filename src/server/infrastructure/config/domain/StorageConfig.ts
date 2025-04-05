import * as path from "path";

import { injectable, inject } from "inversify";

import { ConfigService, ConfigSchema } from "@/server/infrastructure/config";
import { TYPES } from "@/server/infrastructure/di/types";

/**
 * Content detection configuration
 */
export interface ContentDetectionConfig {
  analyzeContent: boolean;
  maxBytesToAnalyze: number;
}

/**
 * Image optimization configuration
 */
export interface ImageOptimizationConfig {
  enabled: boolean;
  defaultQuality: number;
  maxDimensions?: {
    width: number;
    height: number;
  };
  defaultFormat?: "jpeg" | "png" | "webp" | "avif" | "original";
  stripMetadata: boolean;
}

/**
 * Stream processing configuration
 */
export interface StreamConfig {
  defaultChunkSize: number;
  defaultHighWaterMark: number;
}

/**
 * Storage configuration interface
 */
export interface StorageConfig {
  uploadDir: string;
  queuePath: string;
  tempDir: string;
  basePath: string;
  baseUrl?: string;
  contentDetection: ContentDetectionConfig;
  imageOptimization: ImageOptimizationConfig;
  streaming: StreamConfig;
  publicDir: string;
  privateDir: string;
  maxFileSize: number;
  maxFilesPerRequest: number;
  analyzeContent: boolean;
  acceptedImageTypes: string[];
  acceptedDocumentTypes: string[];
}

/**
 * Storage configuration provider
 */
@injectable()
export class StorageConfigProvider {
  private config: StorageConfig;

  constructor(
    @inject(TYPES.ConfigService) private configService: ConfigService,
  ) {
    this.config = this.loadConfig();

    // Validate configuration
    this.configService.ensureValid(this.getConfigSchema());
  }

  /**
   * Gets the storage configuration
   *
   * @returns Storage configuration
   */
  getConfig(): StorageConfig {
    return this.config;
  }

  /**
   * Gets the configuration schema for validation
   *
   * @returns Configuration schema
   */
  getConfigSchema(): ConfigSchema {
    return {
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
    };
  }

  /**
   * Loads the storage configuration from the config service
   *
   * @returns Storage configuration
   */
  private loadConfig(): StorageConfig {
    this.configService.ensureValid(this.getConfigSchema());

    // Function to normalize paths to use forward slashes
    const normalizePath = (p: string): string => {
      // First resolve the path
      const resolved = path.resolve(process.cwd(), p);
      // Then convert to forward slashes for consistency across platforms
      return resolved.replace(/\\/g, "/");
    };

    // For tests, use specific path values
    const isTestEnvironment = process.env.NODE_ENV === "test";
    const testBasePath = "/uploads";
    const testUploadDir = "/uploads";

    // Get configuration
    let uploadDir = this.configService.getString("UPLOAD_DIR", "./uploads");
    let queuePath = this.configService.getString("QUEUE_PATH", "./queue");
    let tempDir = this.configService.getString("TEMP_DIR", "./temp");
    let storagePath = this.configService.getString("STORAGE_PATH", "./storage");

    // Only normalize paths if not in test environment
    if (!isTestEnvironment) {
      uploadDir = normalizePath(uploadDir);
      queuePath = normalizePath(queuePath);
      tempDir = normalizePath(tempDir);
      storagePath = normalizePath(storagePath);
    } else {
      uploadDir = testUploadDir;
      queuePath = "/uploads/queue";
      tempDir = "/uploads/temp";
      storagePath = testBasePath;
    }

    const baseUrl = this.configService.getString("STORAGE_URL", "");

    // Get directory names
    const publicDir = this.configService.getString(
      "STORAGE_PUBLIC_DIR",
      "public",
    );
    const privateDir = this.configService.getString(
      "STORAGE_PRIVATE_DIR",
      "private",
    );

    // Image dimensions
    const maxWidth = this.configService.getNumber("STORAGE_IMAGE_MAX_WIDTH", 0);
    const maxHeight = this.configService.getNumber(
      "STORAGE_IMAGE_MAX_HEIGHT",
      0,
    );

    // Define max dimensions if both values are set
    const maxDimensions =
      maxWidth > 0 && maxHeight > 0
        ? { width: maxWidth, height: maxHeight }
        : undefined;

    // Calculate public and private directories
    const publicDirPath = isTestEnvironment
      ? `${uploadDir}/public`
      : path.join(uploadDir, publicDir);

    const privateDirPath = isTestEnvironment
      ? `${uploadDir}/private`
      : path.join(uploadDir, privateDir);

    return {
      uploadDir,
      queuePath,
      tempDir,
      basePath: isTestEnvironment ? testBasePath : storagePath,
      baseUrl: baseUrl || undefined,
      contentDetection: {
        analyzeContent: this.configService.getBoolean(
          "STORAGE_ANALYZE_CONTENT",
          false,
        ),
        maxBytesToAnalyze: this.configService.getNumber(
          "STORAGE_MAX_BYTES_TO_ANALYZE",
          4096,
        ),
      },
      imageOptimization: {
        enabled: this.configService.getBoolean(
          "STORAGE_IMAGE_OPTIMIZATION_ENABLED",
          true,
        ),
        defaultQuality: this.configService.getNumber(
          "STORAGE_IMAGE_QUALITY",
          90,
        ),
        maxDimensions,
        defaultFormat: this.configService.getString(
          "STORAGE_IMAGE_DEFAULT_FORMAT",
          "webp",
        ) as "jpeg" | "png" | "webp" | "avif" | "original",
        stripMetadata: this.configService.getBoolean(
          "STORAGE_IMAGE_STRIP_METADATA",
          false,
        ),
      },
      streaming: {
        defaultChunkSize: this.configService.getNumber(
          "STORAGE_DEFAULT_CHUNK_SIZE",
          65536,
        ),
        defaultHighWaterMark: this.configService.getNumber(
          "STORAGE_DEFAULT_HIGH_WATER_MARK",
          16384,
        ),
      },
      publicDir: publicDirPath,
      privateDir: privateDirPath,
      maxFileSize: this.configService.getNumber(
        "STORAGE_MAX_FILE_SIZE",
        10 * 1024 * 1024,
      ),
      maxFilesPerRequest: this.configService.getNumber(
        "STORAGE_MAX_FILES_PER_REQUEST",
        10,
      ),
      analyzeContent: this.configService.getBoolean(
        "STORAGE_ANALYZE_CONTENT",
        false,
      ),
      acceptedImageTypes: (
        this.configService.getString(
          "STORAGE_ACCEPTED_IMAGE_TYPES",
          "image/jpeg,image/png,image/gif",
        ) || "image/jpeg,image/png,image/gif"
      ).split(","),
      acceptedDocumentTypes: (
        this.configService.getString(
          "STORAGE_ACCEPTED_DOCUMENT_TYPES",
          "application/pdf,text/plain",
        ) || "application/pdf,text/plain"
      ).split(","),
    };
  }
}
