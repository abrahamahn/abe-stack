# 🗄️ Storage System

## 📋 Purpose

The storage system provides a robust framework for file storage and management, offering:

- Abstracted file storage operations
- Multiple storage provider support (local, cloud)
- Type-safe interfaces for storage operations
- Content type detection and validation
- Streaming file uploads and downloads
- Temporary file management
- File organization and metadata handling

This module serves as a unified interface for all file storage operations, abstracting away the underlying storage implementation details and providing a consistent API regardless of where files are actually stored.

## 🧩 Key Components

### 1️⃣ Storage Service

- **`StorageService`**: Core service for file storage operations
- Provides a unified API for file operations across different storage providers
- Handles file uploads, downloads, and management

### 2️⃣ Storage Providers

- **`LocalStorageProvider`**: File system-based storage implementation
- **`IStorageProvider`**: Interface defining the storage provider contract
- Abstractions for different storage backends (local, cloud)

### 3️⃣ Content Types

- **`ContentTypes`**: Utilities for content type detection and validation
- MIME type handling and validation
- File extension mapping

### 4️⃣ File Utilities

- **`FileUtils`**: Helper functions for common file operations
- Path handling, directory operations, and file manipulations
- Stream processing utilities

## 🛠️ Usage Instructions

### Basic Storage Operations

```typescript
import { inject, injectable } from "inversify";
import { StorageService } from "@/server/infrastructure/storage";
import { TYPES } from "@/server/infrastructure/di/types";

@injectable()
class FileManager {
  constructor(@inject(TYPES.StorageService) private storage: StorageService) {}

  // Upload a file
  async uploadFile(
    fileData: Buffer,
    fileName: string,
    mimeType: string,
  ): Promise<string> {
    // Store file and get file ID/path
    const fileId = await this.storage.storeFile({
      content: fileData,
      filename: fileName,
      contentType: mimeType,
    });

    return fileId;
  }

  // Get file info
  async getFileInfo(
    fileId: string,
  ): Promise<{ name: string; contentType: string; size: number } | null> {
    try {
      const metadata = await this.storage.getFileInfo(fileId);
      return {
        name: metadata.filename,
        contentType: metadata.contentType,
        size: metadata.size,
      };
    } catch (error) {
      if (error.code === "FILE_NOT_FOUND") {
        return null;
      }
      throw error;
    }
  }

  // Download a file
  async downloadFile(fileId: string): Promise<Buffer> {
    return this.storage.getFileContent(fileId);
  }

  // Delete a file
  async deleteFile(fileId: string): Promise<boolean> {
    return this.storage.deleteFile(fileId);
  }
}
```

### Working with Streams

```typescript
import { inject, injectable } from "inversify";
import { StorageService } from "@/server/infrastructure/storage";
import { TYPES } from "@/server/infrastructure/di/types";
import { createReadStream, createWriteStream } from "fs";
import { pipeline } from "stream/promises";

@injectable()
class StreamFileHandler {
  constructor(@inject(TYPES.StorageService) private storage: StorageService) {}

  // Upload a large file via stream
  async uploadLargeFile(
    sourcePath: string,
    destinationName: string,
    contentType: string,
  ): Promise<string> {
    // Create read stream from source file
    const sourceStream = createReadStream(sourcePath);

    // Store file using stream
    const fileId = await this.storage.storeFileFromStream({
      stream: sourceStream,
      filename: destinationName,
      contentType: contentType,
    });

    return fileId;
  }

  // Download file to a stream
  async downloadToFile(fileId: string, destinationPath: string): Promise<void> {
    // Get readable stream for the file
    const fileStream = await this.storage.getFileContentAsStream(fileId);

    // Create write stream to destination
    const outputStream = createWriteStream(destinationPath);

    // Pipe data from storage to file
    await pipeline(fileStream, outputStream);
  }

  // Process file through transform stream
  async processFile(fileId: string, transformFn): Promise<string> {
    // Get source stream
    const sourceStream = await this.storage.getFileContentAsStream(fileId);

    // Get file info
    const fileInfo = await this.storage.getFileInfo(fileId);

    // Create transform stream
    const transformStream = transformFn();

    // Store processed file
    const processedFileId = await this.storage.storeFileFromStream({
      stream: sourceStream.pipe(transformStream),
      filename: `processed-${fileInfo.filename}`,
      contentType: fileInfo.contentType,
    });

    return processedFileId;
  }
}
```

### Managing Temporary Files

```typescript
import { inject, injectable } from "inversify";
import { StorageService, FileUtils } from "@/server/infrastructure/storage";
import { TYPES } from "@/server/infrastructure/di/types";

@injectable()
class TemporaryFileManager {
  constructor(
    @inject(TYPES.StorageService) private storage: StorageService,
    @inject(TYPES.FileUtils) private fileUtils: FileUtils,
  ) {}

  // Create a temporary file
  async createTempFile(content: Buffer, extension: string): Promise<string> {
    // Generate unique temp filename
    const tempFilename = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 10)}${extension}`;

    // Store in temporary storage
    const fileId = await this.storage.storeFile({
      content,
      filename: tempFilename,
      contentType: this.fileUtils.getContentTypeFromExtension(extension),
      metadata: {
        temporary: true,
        createdAt: new Date().toISOString(),
      },
    });

    return fileId;
  }

  // Clean up temporary files older than a given time
  async cleanupTempFiles(maxAgeHours: number = 24): Promise<number> {
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - maxAgeHours);

    // Find temp files older than cutoff
    const files = await this.storage.findFiles({
      metadata: {
        temporary: true,
      },
    });

    let deletedCount = 0;

    // Delete old temporary files
    for (const file of files) {
      const createdAt = new Date(file.metadata.createdAt);

      if (createdAt < cutoffTime) {
        await this.storage.deleteFile(file.id);
        deletedCount++;
      }
    }

    return deletedCount;
  }
}
```

## 🏗️ Architecture Decisions

### Provider-Based Abstraction

- **Decision**: Use a provider-based abstraction for storage
- **Rationale**: Enables swapping storage backends without changing application code
- **Benefit**: Flexibility to use local storage in development, cloud storage in production

### Stream-First Approach

- **Decision**: Prioritize streaming APIs for file handling
- **Rationale**: Efficient handling of large files without excessive memory usage
- **Implementation**: Stream-based methods for uploads and downloads

### Content Type Management

- **Decision**: Built-in content type handling
- **Rationale**: Ensures proper file type detection and validation
- **Benefit**: Consistent file type handling across the application

### Metadata Support

- **Decision**: Include support for file metadata
- **Rationale**: Enables additional context for stored files
- **Implementation**: Key-value metadata storage with each file

## ⚙️ Setup and Configuration Notes

### Basic Configuration

Configure the storage service:

```typescript
import {
  StorageService,
  LocalStorageProvider,
} from "@/server/infrastructure/storage";
import path from "path";

// Set up local storage provider
const storageProvider = new LocalStorageProvider({
  rootDirectory: path.join(process.cwd(), "storage"),
  tempDirectory: path.join(process.cwd(), "storage", "temp"),
  urlPrefix: "/files",
});

// Create storage service with provider
const storageService = new StorageService({
  defaultProvider: storageProvider,
});

// Export configured service
export { storageService };
```

### Multiple Providers Configuration

For applications with multiple storage requirements:

```typescript
import {
  StorageService,
  LocalStorageProvider,
} from "@/server/infrastructure/storage";
import { S3StorageProvider } from "./S3StorageProvider"; // Custom implementation

// Local provider for temporary and small files
const localProvider = new LocalStorageProvider({
  rootDirectory: path.join(process.cwd(), "storage"),
  tempDirectory: path.join(process.cwd(), "storage", "temp"),
  urlPrefix: "/files",
});

// S3 provider for user uploads and large files
const s3Provider = new S3StorageProvider({
  bucket: process.env.AWS_S3_BUCKET,
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  urlPrefix: `https://${process.env.AWS_S3_BUCKET}.s3.amazonaws.com`,
});

// Create storage service with multiple providers
const storageService = new StorageService({
  defaultProvider:
    process.env.NODE_ENV === "production" ? s3Provider : localProvider,
  providers: {
    local: localProvider,
    s3: s3Provider,
  },
});

// Usage with specific provider
await storageService.storeFile(
  {
    content: fileData,
    filename: "example.pdf",
    contentType: "application/pdf",
  },
  "s3",
); // Use S3 provider explicitly
```

### Content Type Configuration

Configure allowed content types:

```typescript
import { StorageService, ContentTypes } from "@/server/infrastructure/storage";

// Configure allowed content types
ContentTypes.configure({
  allowedTypes: [
    // Images
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",

    // Documents
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",

    // Others
    "text/plain",
    "text/csv",
  ],

  // Max file size by type (in bytes)
  maxSizes: {
    "image/jpeg": 5 * 1024 * 1024, // 5MB
    "image/png": 5 * 1024 * 1024, // 5MB
    "application/pdf": 10 * 1024 * 1024, // 10MB
    default: 2 * 1024 * 1024, // 2MB default
  },

  // Additional extension mappings
  extensionMappings: {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    pdf: "application/pdf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    txt: "text/plain",
    csv: "text/csv",
  },
});
```

### Directory Structure

Recommended directory structure for local storage:

```
storage/
├── temp/           # Temporary files
├── uploads/        # User uploads
│   ├── images/     # Categorized by content type
│   ├── documents/
│   └── other/
├── public/         # Publicly accessible files
└── private/        # Access-controlled files
    ├── users/      # User-specific files
    │   ├── {userId}/   # Separate folders by user
    └── system/     # System files
```

### File Cleanup Tasks

For long-running applications, set up file cleanup tasks:

```typescript
import { StorageService } from "@/server/infrastructure/storage";
import { scheduleJob } from "node-schedule";

export function setupStorageCleanupJobs(storageService: StorageService): void {
  // Clean temporary files daily at midnight
  scheduleJob("0 0 * * *", async () => {
    try {
      // Find temporary files older than 24 hours
      const files = await storageService.findFiles({
        metadata: {
          temporary: true,
        },
      });

      const now = Date.now();
      let deletedCount = 0;

      for (const file of files) {
        const createdAt = new Date(file.metadata.createdAt).getTime();
        const fileAgeHours = (now - createdAt) / (1000 * 60 * 60);

        if (fileAgeHours > 24) {
          await storageService.deleteFile(file.id);
          deletedCount++;
        }
      }

      console.log(
        `Storage cleanup complete. Deleted ${deletedCount} temporary files.`,
      );
    } catch (error) {
      console.error("Error during storage cleanup:", error);
    }
  });
}
```
