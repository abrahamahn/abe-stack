// StorageProvider.ts
import { ReadStream } from "fs";

import {
  FileMetadata,
  StorageSaveOptions,
  FileSaveResult,
  FileData,
  StreamOptions,
} from "@/server/infrastructure/storage";

/**
 * Interface for storage providers
 */
export interface IStorageProvider {
  /**
   * Initialize the storage provider
   */
  initialize(): Promise<void>;

  /**
   * Shutdown the storage provider
   */
  shutdown(): Promise<void>;

  /**
   * Update the base URL (useful when port changes)
   * @param baseUrl New base URL
   */
  updateBaseUrl(baseUrl: string): void;

  /**
   * Create a directory
   * @param path Directory path
   */
  createDirectory(path: string): Promise<void>;

  /**
   * Save a file
   * @param filePath File path
   * @param data File data
   * @param options Storage options
   */
  saveFile(
    filePath: string,
    data: FileData,
    options?: StorageSaveOptions,
  ): Promise<FileSaveResult>;

  /**
   * Get a file as buffer
   * @param filePath File path
   */
  getFile(filePath: string): Promise<Buffer>;

  /**
   * Get a file as stream
   * @param filePath File path
   * @param options Stream options
   */
  getFileStream(filePath: string, options?: StreamOptions): Promise<ReadStream>;

  /**
   * Get file metadata
   * @param filePath File path
   */
  getFileMetadata(filePath: string): Promise<FileMetadata>;

  /**
   * Delete a file
   * @param filePath File path
   */
  deleteFile(filePath: string): Promise<boolean>;

  /**
   * Check if file exists
   * @param filePath File path
   */
  fileExists(filePath: string): Promise<boolean>;

  /**
   * List files in a directory
   * @param directory Directory path
   * @param pattern Optional file pattern
   */
  listFiles(directory: string, pattern?: string | RegExp): Promise<string[]>;

  /**
   * Copy a file
   * @param sourcePath Source file path
   * @param targetPath Target file path
   */
  copyFile(sourcePath: string, targetPath: string): Promise<boolean>;

  /**
   * Move a file
   * @param sourcePath Source file path
   * @param targetPath Target file path
   */
  moveFile(sourcePath: string, targetPath: string): Promise<boolean>;

  /**
   * Get a URL for a file
   * @param filePath File path
   * @param expiresIn Expiration time in seconds
   */
  getFileUrl(filePath: string, expiresIn?: number): Promise<string>;
}
