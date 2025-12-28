// LocalStorageProvider.ts
import fs from "fs";
import path from "path";
import { Readable } from "stream";

import { injectable, inject } from "inversify";
import { v4 as uuidv4 } from "uuid";

import { StorageConfigProvider } from "@/server/infrastructure/config";
import { TYPES } from "@/server/infrastructure/di/types";
import type { ILoggerService } from "@/server/infrastructure/logging";
import { StreamProcessor } from "@/server/infrastructure/processor/StreamProcessor";

import { FileUtils } from "./FileUtils";
import { IStorageProvider } from "./IStorageProvider";
import { MediaProcessor } from "../processor/MediaProcessor";

import type {
  StreamOptions,
  StorageSaveOptions,
  FileSaveResult,
  FileData,
  FileMetadata,
} from "./StorageTypes";
import type { ReadStream } from "fs";

/**
 * Storage configuration
 */
export interface StorageConfig {
  /**
   * Base path for storage
   */
  basePath: string;

  /**
   * Base URL for public file access
   */
  baseUrl?: string;

  /**
   * Temporary directory
   */
  tempDir: string;
}

/**
 * Local filesystem storage provider
 */
@injectable()
export class LocalStorageProvider implements IStorageProvider {
  private logger: ILoggerService;
  private fileUtils: FileUtils;
  private mediaProcessor: MediaProcessor;
  private basePath: string;
  private baseUrl: string;
  private tempDir: string;

  /**
   * Helper method to normalize path for display purposes
   * @param pathToNormalize Path to be normalized with forward slashes
   */
  private normalizePath(pathToNormalize: string): string {
    return pathToNormalize.replace(/\\/g, "/");
  }

  /**
   * Create a new LocalStorageProvider
   * @param logger Logger service
   * @param config Storage configuration
   */
  constructor(
    @inject(TYPES.LoggerService) logger: ILoggerService,
    @inject(TYPES.StorageConfig) configProvider: StorageConfigProvider,
  ) {
    this.logger = logger.createLogger("LocalStorageProvider");

    // Get full config from provider
    const config = configProvider.getConfig();

    // Validate required paths
    if (!config.basePath) {
      throw new Error("Storage basePath is required");
    }

    if (!config.tempDir) {
      throw new Error("Storage tempDir is required");
    }

    this.basePath = config.basePath;
    this.baseUrl = config.baseUrl || "";
    this.tempDir = config.tempDir;

    // Log configuration with normalized paths for display
    this.logger.info("LocalStorageProvider configuration", {
      basePath: this.normalizePath(this.basePath),
      tempDir: this.normalizePath(this.tempDir),
      baseUrl: this.baseUrl,
    });

    // Initialize utilities
    this.fileUtils = new FileUtils(logger);
    this.mediaProcessor = new MediaProcessor(
      logger,
      this.fileUtils,
      this.basePath,
      this.baseUrl,
    );

    // Ensure base directories exist
    this.ensureDirectories();
  }

  /**
   * Ensure required directories exist
   */
  private ensureDirectories(): void {
    try {
      // Check if we should disable real storage (for testing)
      if (process.env.DISABLE_REAL_STORAGE === "true") {
        this.logger.debug("Storage directory creation disabled (test mode)");
        return;
      }

      // Check if we're in test environment (NODE_ENV=test)
      if (process.env.NODE_ENV === "test") {
        this.logger.debug("Test environment detected, using mock directories");
        return;
      }

      // Log directory creation with normalized paths
      this.logger.debug("Ensuring storage directories exist", {
        basePath: this.normalizePath(this.basePath),
        tempDir: this.normalizePath(this.tempDir),
      });

      // Synchronously create these on initialization
      if (!fs.existsSync(this.basePath)) {
        this.logger.info(
          `Creating base storage directory: ${this.normalizePath(this.basePath)}`,
        );
        fs.mkdirSync(this.basePath, { recursive: true });
      }

      if (!fs.existsSync(this.tempDir)) {
        this.logger.info(
          `Creating temporary storage directory: ${this.normalizePath(this.tempDir)}`,
        );
        fs.mkdirSync(this.tempDir, { recursive: true });
      }

      this.logger.info("Storage directories verified and created if needed");
    } catch (error) {
      this.logger.error("Failed to create storage directories", {
        error: error instanceof Error ? error.message : String(error),
        basePath: this.normalizePath(this.basePath),
        tempDir: this.normalizePath(this.tempDir),
      });
      throw new Error(
        `Failed to create storage directories: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Initialize the storage provider
   */
  async initialize(): Promise<void> {
    this.logger.info("LocalStorageProvider initialized", {
      basePath: this.normalizePath(this.basePath),
      tempDir: this.normalizePath(this.tempDir),
      baseUrl: this.baseUrl,
    });

    return Promise.resolve();
  }

  /**
   * Shutdown the storage provider
   */
  async shutdown(): Promise<void> {
    return Promise.resolve();
  }

  /**
   * Get absolute path from relative path
   * @param filePath Relative file path
   */
  private getAbsolutePath(filePath: string): string {
    return path.join(this.basePath, filePath);
  }

  /**
   * Save a file
   * @param filePath File path
   * @param data File data
   * @param options Storage options
   */
  async saveFile(
    filePath: string,
    data: FileData,
    options?: StorageSaveOptions,
  ): Promise<FileSaveResult> {
    const absolutePath = this.getAbsolutePath(filePath);
    const tempFilePath = `${this.tempDir}/${uuidv4()}`;

    try {
      // First save to temp file
      if (Buffer.isBuffer(data)) {
        await this.fileUtils.writeFile(tempFilePath, data);
      } else {
        const writeStream = this.fileUtils.createWriteStream(tempFilePath);
        await StreamProcessor.processStream(data as Readable, writeStream);
      }

      // Detect content type
      const contentType =
        options?.contentType || this.fileUtils.detectContentType(tempFilePath);

      // Create output directory
      const outputDir = path.dirname(absolutePath);
      await this.fileUtils.ensureDirectory(outputDir);

      // Check if we need media processing
      if (
        contentType.startsWith("image/") ||
        contentType.startsWith("video/") ||
        contentType.startsWith("audio/")
      ) {
        // Process as media
        const mediaOptions = {
          // Copy any relevant options from StorageSaveOptions
          width: options?.width,
          height: options?.height,
          quality: options?.quality,
          format: options?.format,
          targetPath: absolutePath,
        };

        const result = await this.mediaProcessor.processMedia(
          tempFilePath,
          mediaOptions,
        );

        // Delete temp file
        await this.fileUtils.deleteFile(tempFilePath);

        // Create file metadata
        const stats = await this.fileUtils.getFileStats(result.path);

        return {
          path: filePath,
          url: result.url,
          metadata: {
            contentType: result.contentType,
            size: stats.size,
            lastModified: stats.mtime,
            etag: `"${uuidv4()}"`,
            dimensions: result.metadata.dimensions,
            custom: options?.metadata,
          },
        };
      } else {
        // Just move the file
        await this.fileUtils.moveFile(tempFilePath, absolutePath);

        // Get file stats
        const stats = await this.fileUtils.getFileStats(absolutePath);

        // Return basic result
        return {
          path: filePath,
          url: await this.getFileUrl(filePath),
          metadata: {
            contentType,
            size: stats.size,
            lastModified: stats.mtime,
            etag: `"${uuidv4()}"`,
            custom: options?.metadata,
          },
        };
      }
    } catch (error) {
      // Clean up temp file
      await this.fileUtils.deleteFile(tempFilePath);

      this.logger.error(`Error saving file: ${filePath}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get a file as buffer
   * @param filePath File path
   */
  async getFile(filePath: string): Promise<Buffer> {
    const absolutePath = this.getAbsolutePath(filePath);

    try {
      // Check if file exists
      if (!(await this.fileUtils.fileExists(absolutePath))) {
        throw new Error(`File not found: ${filePath}`);
      }

      // Read file
      return await this.fileUtils.readFile(absolutePath);
    } catch (error) {
      this.logger.error(`Error getting file: ${filePath}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get a file as stream
   * @param filePath File path
   * @param options Stream options
   */
  async getFileStream(
    filePath: string,
    options?: StreamOptions,
  ): Promise<ReadStream> {
    const absolutePath = this.getAbsolutePath(filePath);

    try {
      // Check if file exists
      if (!(await this.fileUtils.fileExists(absolutePath))) {
        throw new Error(`File not found: ${filePath}`);
      }

      // Create stream
      return this.fileUtils.createReadStream(absolutePath, options);
    } catch (error) {
      this.logger.error(`Error creating file stream: ${filePath}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get file metadata
   * @param filePath File path
   */
  async getFileMetadata(filePath: string): Promise<FileMetadata> {
    const absolutePath = this.getAbsolutePath(filePath);

    try {
      // Check if file exists
      if (!(await this.fileUtils.fileExists(absolutePath))) {
        throw new Error(`File not found: ${filePath}`);
      }

      // Get file stats
      const stats = await this.fileUtils.getFileStats(absolutePath);

      // Detect content type
      const contentType = this.fileUtils.detectContentType(absolutePath);

      // Create basic metadata
      const metadata: FileMetadata = {
        contentType,
        size: stats.size,
        lastModified: stats.mtime,
        etag: `"${stats.mtime.getTime().toString(16)}"`,
      };

      // If it's an image, get dimensions
      if (contentType.startsWith("image/")) {
        try {
          // Process the image to get metadata
          const tempImagePath = `${this.tempDir}/${uuidv4()}_temp.jpg`;
          const processResult = await this.mediaProcessor.processMedia(
            absolutePath,
            {
              targetPath: tempImagePath,
            },
          );

          // Fix the dimensions extraction
          if (processResult.metadata.dimensions) {
            metadata.dimensions = processResult.metadata.dimensions;
          }
        } catch (error) {
          this.logger.warn(`Could not get image dimensions for ${filePath}`, {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      return metadata;
    } catch (error) {
      this.logger.error(`Error getting file metadata: ${filePath}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Delete a file
   * @param filePath File path
   */
  async deleteFile(filePath: string): Promise<boolean> {
    const absolutePath = this.getAbsolutePath(filePath);

    try {
      return await this.fileUtils.deleteFile(absolutePath);
    } catch (error) {
      this.logger.error(`Error deleting file: ${filePath}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Check if file exists
   * @param filePath File path
   */
  async fileExists(filePath: string): Promise<boolean> {
    const absolutePath = this.getAbsolutePath(filePath);
    return await this.fileUtils.fileExists(absolutePath);
  }

  /**
   * List files in a directory
   * @param directory Directory path
   * @param pattern Optional file pattern
   */
  async listFiles(
    directory: string,
    pattern?: string | RegExp,
  ): Promise<string[]> {
    const absolutePath = this.getAbsolutePath(directory);

    try {
      const files = await this.fileUtils.listFiles(absolutePath, pattern);

      // Convert absolute paths back to relative paths
      return files.map((file) => path.relative(this.basePath, file));
    } catch (error) {
      this.logger.error(`Error listing files in directory: ${directory}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Copy a file
   * @param sourcePath Source file path
   * @param targetPath Target file path
   */
  async copyFile(sourcePath: string, targetPath: string): Promise<boolean> {
    const absoluteSourcePath = this.getAbsolutePath(sourcePath);
    const absoluteTargetPath = this.getAbsolutePath(targetPath);

    try {
      return await this.fileUtils.copyFile(
        absoluteSourcePath,
        absoluteTargetPath,
      );
    } catch (error) {
      this.logger.error(
        `Error copying file from ${sourcePath} to ${targetPath}`,
        {
          error: error instanceof Error ? error.message : String(error),
        },
      );
      return false;
    }
  }

  /**
   * Move a file
   * @param sourcePath Source file path
   * @param targetPath Target file path
   */
  async moveFile(sourcePath: string, targetPath: string): Promise<boolean> {
    const absoluteSourcePath = this.getAbsolutePath(sourcePath);
    const absoluteTargetPath = this.getAbsolutePath(targetPath);

    try {
      return await this.fileUtils.moveFile(
        absoluteSourcePath,
        absoluteTargetPath,
      );
    } catch (error) {
      this.logger.error(
        `Error moving file from ${sourcePath} to ${targetPath}`,
        {
          error: error instanceof Error ? error.message : String(error),
        },
      );
      return false;
    }
  }

  /**
   * Get a URL for a file
   * @param filePath File path
   * @param expiresIn Expiration time in seconds
   */
  async getFileUrl(filePath: string, expiresIn?: number): Promise<string> {
    // Normalize path for URL
    const normalizedPath = filePath.replace(/\\/g, "/");

    // Remove any leading slash to avoid double slashes
    const cleanPath = normalizedPath.startsWith("/")
      ? normalizedPath.substring(1)
      : normalizedPath;

    let url = this.baseUrl ? `${this.baseUrl}/${cleanPath}` : cleanPath;

    // Add expiration if needed
    if (expiresIn) {
      const expiresAt = Math.floor(Date.now() / 1000) + expiresIn;
      url += `?expires=${expiresAt}`;
    }

    return url;
  }

  /**
   * Create a directory
   * @param path Directory path
   */
  async createDirectory(path: string): Promise<void> {
    try {
      await fs.promises.mkdir(path, { recursive: true });
    } catch (error) {
      this.logger.error(`Failed to create directory: ${path}`, { error });
      throw error;
    }
  }

  /**
   * Update the base URL (useful when port changes)
   * @param baseUrl New base URL
   */
  updateBaseUrl(baseUrl: string): void {
    if (baseUrl) {
      this.baseUrl = baseUrl;
      this.logger.info("Updated storage base URL", { baseUrl: this.baseUrl });

      // Update the media processor's base URL as well
      if (
        this.mediaProcessor &&
        typeof this.mediaProcessor.updateBaseUrl === "function"
      ) {
        this.mediaProcessor.updateBaseUrl(baseUrl);
      }
    }
  }
}
