// FileUtils.ts
import fs from "fs";
import path from "path";
import { Stream, Readable } from "stream";
import { pipeline } from "stream/promises";
import { promisify } from "util";

import { ILoggerService } from "@/server/infrastructure/logging";

// Promisify fs functions
const mkdir = promisify(fs.mkdir);
const access = promisify(fs.access);
const stat = promisify(fs.stat);
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const readdir = promisify(fs.readdir);
const unlink = promisify(fs.unlink);

/**
 * Consolidated file utilities for storage operations
 */
export class FileUtils {
  private logger: ILoggerService;

  constructor(logger: ILoggerService) {
    this.logger = logger.createLogger("FileUtils");
  }

  /**
   * Ensure directory exists
   * @param dirPath Directory path
   */
  async ensureDirectory(dirPath: string): Promise<void> {
    await mkdir(dirPath, { recursive: true });
  }

  /**
   * Check if file exists
   * @param filePath File path
   */
  async fileExists(filePath: string): Promise<boolean> {
    try {
      await access(filePath, fs.constants.F_OK);
      return true;
    } catch (_error) {
      return false;
    }
  }

  /**
   * Get file stats
   * @param filePath File path
   */
  async getFileStats(filePath: string): Promise<fs.Stats> {
    return await stat(filePath);
  }

  /**
   * Read file as buffer
   * @param filePath File path
   */
  async readFile(filePath: string): Promise<Buffer> {
    return await readFile(filePath);
  }

  /**
   * Write file from buffer or stream
   * @param filePath File path
   * @param data File data
   * @param overwrite Whether to overwrite existing file
   */
  async writeFile(
    filePath: string,
    data: Buffer | Stream,
    overwrite = true,
  ): Promise<void> {
    // Create directory if needed
    const dirname = path.dirname(filePath);
    await this.ensureDirectory(dirname);

    // Check if we can overwrite
    if (!overwrite && (await this.fileExists(filePath))) {
      throw new Error(`File already exists: ${filePath}`);
    }

    try {
      if (Buffer.isBuffer(data)) {
        await writeFile(filePath, data);
      } else if ("pipe" in data) {
        const writeStream = fs.createWriteStream(filePath);
        await pipeline(data as Readable, writeStream);
      } else {
        throw new Error("Unsupported file data type");
      }
    } catch (error) {
      this.logger.error(`Error writing file: ${filePath}`, {
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
    try {
      if (!(await this.fileExists(filePath))) {
        return true; // File doesn't exist, consider it deleted
      }

      await unlink(filePath);
      return true;
    } catch (error) {
      this.logger.warn(`Failed to delete file ${filePath}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * List files in a directory
   * @param directory Directory path
   * @param pattern Optional pattern to filter files
   */
  async listFiles(
    directory: string,
    pattern?: string | RegExp,
  ): Promise<string[]> {
    try {
      // Read directory contents
      const entries = await readdir(directory, { withFileTypes: true });

      // Filter for files only
      let files = entries
        .filter((entry) => entry.isFile())
        .map((entry) => path.join(directory, entry.name));

      // Apply pattern filtering if provided
      if (pattern) {
        const regex =
          pattern instanceof RegExp
            ? pattern
            : new RegExp(pattern.replace(/\*/g, ".*"));

        files = files.filter((file) => regex.test(path.basename(file)));
      }

      return files;
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
    try {
      // Ensure source file exists
      if (!(await this.fileExists(sourcePath))) {
        throw new Error(`Source file does not exist: ${sourcePath}`);
      }

      // Create target directory if needed
      const targetDir = path.dirname(targetPath);
      await this.ensureDirectory(targetDir);

      // Copy the file
      const data = await this.readFile(sourcePath);
      await this.writeFile(targetPath, data, true);
      return true;
    } catch (error) {
      this.logger.warn(
        `Failed to copy file from ${sourcePath} to ${targetPath}`,
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
    try {
      // First copy the file
      const copied = await this.copyFile(sourcePath, targetPath);
      if (!copied) {
        return false;
      }

      // Then delete the source
      return await this.deleteFile(sourcePath);
    } catch (error) {
      this.logger.warn(
        `Failed to move file from ${sourcePath} to ${targetPath}`,
        {
          error: error instanceof Error ? error.message : String(error),
        },
      );
      return false;
    }
  }

  /**
   * Create a read stream
   * @param filePath File path
   * @param options Stream options
   */
  createReadStream(
    filePath: string,
    options?: { start?: number; end?: number; highWaterMark?: number },
  ): fs.ReadStream {
    return fs.createReadStream(filePath, options);
  }

  /**
   * Create a write stream
   * @param filePath File path
   * @param options Stream options
   */
  createWriteStream(
    filePath: string,
    options?: { highWaterMark?: number },
  ): fs.WriteStream {
    // Ensure directory exists
    const dirPath = path.dirname(filePath);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    return fs.createWriteStream(filePath, options);
  }

  /**
   * Detect content type of a file
   * @param filePath File path
   */
  detectContentType(filePath: string): string {
    // Use a simple extension-based detection
    const extension = path.extname(filePath).toLowerCase();

    const contentTypes: Record<string, string> = {
      // Images
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".gif": "image/gif",
      ".webp": "image/webp",
      ".svg": "image/svg+xml",
      ".avif": "image/avif",
      // Documents
      ".pdf": "application/pdf",
      ".txt": "text/plain",
      ".html": "text/html",
      ".css": "text/css",
      ".js": "application/javascript",
      ".json": "application/json",
      ".xml": "application/xml",
      // Audio
      ".mp3": "audio/mpeg",
      ".wav": "audio/wav",
      ".ogg": "audio/ogg",
      // Video
      ".mp4": "video/mp4",
      ".webm": "video/webm",
      ".avi": "video/x-msvideo",
      // Archives
      ".zip": "application/zip",
      ".gz": "application/gzip",
      // Others
      ".doc": "application/msword",
      ".docx":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    };

    return contentTypes[extension] || "application/octet-stream";
  }
}
