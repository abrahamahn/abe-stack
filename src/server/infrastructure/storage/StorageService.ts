// StorageService.ts
import { ReadStream } from "fs";

import { injectable, inject } from "inversify";

import { TYPES } from "@/server/infrastructure/di/types";
import type { ILoggerService } from "@/server/infrastructure/logging";
import type { IStorageProvider } from "@/server/infrastructure/storage/IStorageProvider";
import {
  FileMetadata,
  StorageSaveOptions,
  FileSaveResult,
  FileData,
  StreamOptions,
} from "@/server/infrastructure/storage/StorageTypes";

/**
 * Interface for storage service
 */
export interface IStorageService {
  /**
   * Create a directory
   * @param path Directory path
   */
  createDirectory(path: string): Promise<void>;

  /**
   * List files in a directory
   * @param directory Directory path
   * @param pattern Optional file pattern
   */
  listFiles(directory: string, pattern?: string): Promise<string[]>;

  /**
   * Save a file
   * @param path File path
   * @param data File data
   * @param options Storage options
   */
  saveFile(
    path: string,
    data: FileData,
    options?: StorageSaveOptions,
  ): Promise<FileSaveResult>;

  /**
   * Get a file as buffer
   * @param path File path
   */
  getFile(path: string): Promise<Buffer>;

  /**
   * Get a file as stream
   * @param path File path
   * @param options Stream options
   */
  getFileStream(path: string, options?: StreamOptions): Promise<ReadStream>;

  /**
   * Get file metadata
   * @param path File path
   */
  getFileMetadata(path: string): Promise<FileMetadata>;

  /**
   * Delete a file
   * @param path File path
   */
  deleteFile(path: string): Promise<boolean>;

  /**
   * Check if file exists
   * @param path File path
   */
  fileExists(path: string): Promise<boolean>;

  /**
   * Get URL for a file
   * @param path File path
   * @param expiresIn Expiration time in seconds
   */
  getFileUrl(path: string, expiresIn?: number): Promise<string>;
}

/**
 * Storage service implementation
 */
@injectable()
export class StorageService implements IStorageService {
  private logger: ILoggerService;
  private provider: IStorageProvider;

  /**
   * Create a new StorageService
   * @param logger Logger service
   * @param storageProvider Storage provider
   */
  constructor(
    @inject(TYPES.LoggerService) logger: ILoggerService,
    @inject(TYPES.StorageProvider) storageProvider: IStorageProvider,
  ) {
    this.logger = logger.createLogger("StorageService");
    this.provider = storageProvider;
  }

  /**
   * Initialize the storage service
   */
  async initialize(): Promise<void> {
    try {
      await this.provider.initialize();
      this.logger.info("Storage service initialized");
    } catch (error) {
      this.logger.error("Failed to initialize storage service", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Shutdown the storage service
   */
  async shutdown(): Promise<void> {
    try {
      await this.provider.shutdown();
      this.logger.info("Storage service shutdown");
    } catch (error) {
      this.logger.error("Failed to shutdown storage service", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Create a directory
   * @param path Directory path
   */
  async createDirectory(path: string): Promise<void> {
    try {
      await this.provider.createDirectory(path);
    } catch (error) {
      this.logger.error(`Failed to create directory: ${path}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * List files in a directory
   * @param directory Directory path
   * @param pattern Optional file pattern
   */
  async listFiles(directory: string, pattern?: string): Promise<string[]> {
    try {
      return await this.provider.listFiles(directory, pattern);
    } catch (error) {
      this.logger.error(`Failed to list files: ${directory}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Save a file
   * @param path File path
   * @param data File data
   * @param options Storage options
   */
  async saveFile(
    path: string,
    data: FileData,
    options?: StorageSaveOptions,
  ): Promise<FileSaveResult> {
    try {
      return await this.provider.saveFile(path, data, options);
    } catch (error) {
      this.logger.error(`Failed to save file: ${path}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get a file as buffer
   * @param path File path
   */
  async getFile(path: string): Promise<Buffer> {
    try {
      return await this.provider.getFile(path);
    } catch (error) {
      this.logger.error(`Failed to get file: ${path}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get a file as stream
   * @param path File path
   * @param options Stream options
   */
  async getFileStream(
    path: string,
    options?: StreamOptions,
  ): Promise<ReadStream> {
    try {
      return await this.provider.getFileStream(path, options);
    } catch (error) {
      this.logger.error(`Failed to get file stream: ${path}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get file metadata
   * @param path File path
   */
  async getFileMetadata(path: string): Promise<FileMetadata> {
    try {
      return await this.provider.getFileMetadata(path);
    } catch (error) {
      this.logger.error(`Failed to get file metadata: ${path}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Delete a file
   * @param path File path
   */
  async deleteFile(path: string): Promise<boolean> {
    try {
      return await this.provider.deleteFile(path);
    } catch (error) {
      this.logger.error(`Failed to delete file: ${path}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Check if file exists
   * @param path File path
   */
  async fileExists(path: string): Promise<boolean> {
    try {
      return await this.provider.fileExists(path);
    } catch (error) {
      this.logger.error(`Failed to check if file exists: ${path}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get URL for a file
   * @param path File path
   * @param expiresIn Expiration time in seconds
   */
  async getFileUrl(path: string, expiresIn?: number): Promise<string> {
    try {
      return await this.provider.getFileUrl(path, expiresIn);
    } catch (error) {
      this.logger.error(`Failed to get file URL: ${path}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
