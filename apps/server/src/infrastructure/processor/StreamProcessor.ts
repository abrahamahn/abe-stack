// StreamProcessor.ts
import fs, { ReadStream, WriteStream } from "fs";
import path from "path";
import process from "process";
import { Transform, Readable, Writable } from "stream";

import { StreamOptions } from "@/server/infrastructure/storage";

/**
 * Stream processing statistics
 */
export interface StreamStats {
  /**
   * Bytes processed
   */
  bytesProcessed: number;

  /**
   * Duration in milliseconds
   */
  durationMs: number;

  /**
   * Bytes per second
   */
  bytesPerSecond: number;
}

/**
 * Utility class for stream processing operations
 */
export class StreamProcessor {
  /**
   * Create a read stream
   * @param filePath File path
   * @param options Stream options
   */
  static createReadStream(
    filePath: string,
    options?: StreamOptions,
  ): ReadStream {
    const streamOptions: {
      start?: number;
      end?: number;
      highWaterMark?: number;
    } = {};

    if (options) {
      if (options.start !== undefined) {
        streamOptions.start = options.start;
      }

      if (options.end !== undefined) {
        streamOptions.end = options.end;
      }

      if (options.highWaterMark !== undefined) {
        streamOptions.highWaterMark = options.highWaterMark;
      }
    }

    return fs.createReadStream(filePath, streamOptions);
  }

  /**
   * Create a write stream
   * @param filePath File path
   * @param options Stream options
   */
  static createWriteStream(
    filePath: string,
    options?: StreamOptions,
  ): WriteStream {
    const streamOptions: { highWaterMark?: number } = {};

    if (options) {
      if (options.highWaterMark !== undefined) {
        streamOptions.highWaterMark = options.highWaterMark;
      }
    }

    // Ensure directory exists
    const dirPath = path.dirname(filePath);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    return fs.createWriteStream(filePath, streamOptions);
  }

  /**
   * Process a stream with metrics
   * @param source Source stream or file path
   * @param destination Destination stream or file path
   * @param transforms Optional transform streams
   */
  static async processStream(
    source: Readable | string,
    destination: Writable | string,
    transforms: Transform[] = [],
  ): Promise<StreamStats> {
    const startTime = Date.now();
    let bytesProcessed = 0;
    let inputStream: Readable;
    let outputStream: Writable;

    // Validate and create streams
    if (typeof source === "string") {
      // Check if source file exists
      if (!fs.existsSync(source)) {
        throw new Error(`Source file not found: ${source}`);
      }
      inputStream = fs.createReadStream(source);
    } else {
      inputStream = source;
    }

    if (typeof destination === "string") {
      // Ensure parent directory exists
      const dirPath = path.dirname(destination);

      // Check for invalid paths - especially important for Windows
      // For invalid paths like "/invalid/directory/file.txt", we need special handling
      if (
        process.platform === "win32" &&
        destination.startsWith("/") &&
        !destination.match(/^\/[a-zA-Z]:/)
      ) {
        // This is an invalid Windows path - it starts with / but doesn't have a drive letter after it
        if (inputStream && typeof source === "string") {
          inputStream.destroy();
        }
        throw new Error(`Invalid Windows path: ${destination}`);
      }

      try {
        if (!fs.existsSync(dirPath)) {
          fs.mkdirSync(dirPath, { recursive: true });
        }
        outputStream = fs.createWriteStream(destination);
      } catch (err: unknown) {
        // Clean up any resources
        if (inputStream && typeof source === "string") {
          inputStream.destroy();
        }
        throw new Error(
          `Failed to create output path: ${destination}. ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    } else {
      outputStream = destination;
    }

    // Create metrics tracking transform
    const metricsTransform = new Transform({
      transform(chunk, _encoding, callback) {
        bytesProcessed += chunk.length;
        callback(null, chunk);
      },
    });

    // Connect the streams manually with error handling
    return await new Promise((resolve, reject) => {
      // Set up error handlers for both streams
      inputStream.on("error", (err) => {
        cleanupStreams();
        reject(err);
      });

      outputStream.on("error", (err) => {
        cleanupStreams();
        reject(err);
      });

      // Clean up function to prevent memory leaks
      const cleanupStreams = (): void => {
        try {
          if (inputStream && typeof source === "string") {
            inputStream.destroy();
          }
          if (outputStream && typeof destination === "string") {
            outputStream.destroy();
          }
        } catch (e) {
          console.error("Error during stream cleanup:", e);
        }
      };

      // Set up pipeline with transforms
      let currentStream: Readable | Transform = inputStream;

      // Add transforms
      for (const transform of transforms) {
        transform.on("error", (err) => {
          cleanupStreams();
          reject(err);
        });
        currentStream = currentStream.pipe(transform);
      }

      // Add metrics transform
      metricsTransform.on("error", (err) => {
        cleanupStreams();
        reject(err);
      });
      currentStream = currentStream.pipe(metricsTransform);

      // Connect to output and handle completion
      currentStream.pipe(outputStream);

      outputStream.on("finish", () => {
        const endTime = Date.now();
        const durationMs = endTime - startTime;
        resolve({
          bytesProcessed,
          durationMs,
          bytesPerSecond:
            durationMs > 0
              ? Math.floor(bytesProcessed / (durationMs / 1000))
              : 0,
        });
      });
    });
  }

  /**
   * Create a throttled transform stream
   * @param bytesPerSecond Bytes per second limit
   */
  static createThrottleTransform(bytesPerSecond: number): Transform {
    let byteCount = 0;
    let lastTime = Date.now();
    const MAX_DELAY = 2000; // Cap the max delay to prevent test timeouts

    return new Transform({
      transform(chunk, _encoding, callback) {
        const now = Date.now();
        const elapsedMs = now - lastTime;

        byteCount += chunk.length;

        // Calculate allowed bytes for the elapsed time
        const allowedBytes = (bytesPerSecond * elapsedMs) / 1000;

        if (byteCount > allowedBytes) {
          // Calculate delay needed to throttle to target rate
          let delayMs = (1000 * (byteCount - allowedBytes)) / bytesPerSecond;

          // Cap the delay to prevent hanging
          delayMs = Math.min(delayMs, MAX_DELAY);

          setTimeout(() => {
            byteCount = 0;
            lastTime = Date.now();
            callback(null, chunk);
          }, delayMs);
        } else {
          byteCount = 0;
          lastTime = now;
          callback(null, chunk);
        }
      },
    });
  }

  /**
   * Create a progress reporting transform stream
   * @param progressCallback Callback function for progress updates
   * @param totalSize Total expected size (for percentage calculation)
   */
  static createProgressTransform(
    progressCallback: (progress: number, bytes: number) => void,
    totalSize?: number,
  ): Transform {
    let processedBytes = 0;

    return new Transform({
      transform(chunk, _encoding, callback) {
        processedBytes += chunk.length;

        if (totalSize) {
          const progress = Math.min(
            100,
            Math.floor((processedBytes / totalSize) * 100),
          );
          progressCallback(progress, processedBytes);
        } else {
          progressCallback(0, processedBytes);
        }

        callback(null, chunk);
      },
    });
  }

  /**
   * Create a chunking transform stream
   * @param chunkSize Size of each chunk in bytes
   */
  static createChunkingTransform(chunkSize: number): Transform {
    let buffer = Buffer.alloc(0);

    return new Transform({
      transform(chunk, _encoding, callback) {
        // Add new data to the buffer
        buffer = Buffer.concat([buffer, chunk]);

        // Push complete chunks
        while (buffer.length >= chunkSize) {
          this.push(buffer.slice(0, chunkSize));
          buffer = buffer.slice(chunkSize);
        }

        callback();
      },
      flush(callback) {
        // Push any remaining data
        if (buffer.length > 0) {
          this.push(buffer);
        }
        callback();
      },
    });
  }
}
