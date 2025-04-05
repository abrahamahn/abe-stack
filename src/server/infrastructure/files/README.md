# 📁 File Utilities

## 📋 Purpose

The file utilities module provides a collection of helper functions for common file operations, offering:

- Safe path handling and manipulation
- File system operations with proper error handling
- File type and extension utilities
- Path normalization and sanitization
- Cross-platform compatibility support
- Common file manipulation tasks

This module serves as a utility layer for file-related operations throughout the application, ensuring consistent and secure file handling.

## 🧩 Key Components

### 1️⃣ File Helpers

- **`fileHelpers.ts`**: Utilities for common file operations
- Functions for creating, reading, writing, and deleting files
- Safe handling of file operations with proper error management

### 2️⃣ Path Helpers

- **`pathHelpers.ts`**: Functions for path manipulation and validation
- Path normalization and sanitization
- Secure path resolution to prevent directory traversal

### 3️⃣ Module Exports

- **`index.ts`**: Exports all file utilities for easy access
- Consolidates file-related functionality

## 🛠️ Usage Instructions

### Path Operations

```typescript
import {
  resolvePath,
  sanitizePath,
  joinPaths,
} from "@/server/infrastructure/files";

// Safely join and normalize paths
const basePath = "./uploads";
const userInput = "../user/profile.jpg"; // Potentially unsafe

// Sanitize user input
const safePath = sanitizePath(userInput); // "user/profile.jpg"

// Resolve full path safely (prevents directory traversal)
const fullPath = resolvePath(basePath, safePath);
console.log(fullPath); // "uploads/user/profile.jpg"

// Join multiple path segments
const combinedPath = joinPaths(basePath, "users", userId, "avatar.jpg");
```

### File Operations

```typescript
import {
  ensureDirectoryExists,
  writeFileSafely,
  readFileSafely,
  deleteFileSafely,
} from "@/server/infrastructure/files";

async function saveUserAvatar(
  userId: string,
  fileData: Buffer,
): Promise<string> {
  // Ensure the directory exists
  const userDir = `./uploads/users/${userId}`;
  await ensureDirectoryExists(userDir);

  // Generate file path
  const filePath = `${userDir}/avatar.jpg`;

  // Write file with proper error handling
  await writeFileSafely(filePath, fileData);

  return filePath;
}

async function getUserAvatar(userId: string): Promise<Buffer | null> {
  const filePath = `./uploads/users/${userId}/avatar.jpg`;

  // Read file with error handling
  try {
    return await readFileSafely(filePath);
  } catch (error) {
    if (error.code === "ENOENT") {
      return null; // File doesn't exist
    }
    throw error; // Other error
  }
}

async function removeUserAvatar(userId: string): Promise<boolean> {
  const filePath = `./uploads/users/${userId}/avatar.jpg`;

  // Delete file with proper error handling
  return await deleteFileSafely(filePath);
}
```

### File Type Handling

```typescript
import {
  getFileExtension,
  isImageFile,
  isAllowedFileType,
} from "@/server/infrastructure/files";

// Get file extension
const extension = getFileExtension("document.pdf"); // "pdf"

// Check if file is an image
const isImage = isImageFile("profile.jpg"); // true

// Check against allowed extensions
const allowedTypes = [".jpg", ".png", ".pdf"];
const isAllowed = isAllowedFileType("document.docx", allowedTypes); // false
```

## 🏗️ Architecture Decisions

### Separation of Path and File Operations

- **Decision**: Separate path manipulation from file operations
- **Rationale**: Different concerns with different security implications
- **Benefit**: Easier to maintain and test each aspect independently

### Error Handling First Approach

- **Decision**: Include comprehensive error handling in all utilities
- **Rationale**: File operations are prone to various system-level errors
- **Implementation**: Consistent error wrapping with contextual information

### Security-Focused Design

- **Decision**: Implement strict path sanitization
- **Rationale**: Prevent directory traversal and other file-related vulnerabilities
- **Benefit**: Secure file operations by default

### Promise-Based API

- **Decision**: Use async/await pattern for file operations
- **Rationale**: Consistent with modern JavaScript practices
- **Implementation**: Promisified versions of Node.js fs functions

## ⚙️ Setup and Configuration Notes

### Base Directory Configuration

For security, configure base directories:

```typescript
// In your application startup or configuration
import { configureFilePaths } from "@/server/infrastructure/files";

configureFilePaths({
  uploadsDir: "./uploads",
  tempDir: "./temp",
  publicDir: "./public",
  allowedExtensions: [".jpg", ".png", ".pdf", ".txt"],
});
```

### File Size Limits

Configure file size limits for uploads:

```typescript
// In your environment configuration
const MAX_UPLOAD_SIZE = 10 * 1024 * 1024; // 10MB

// In your upload handler
if (fileSize > MAX_UPLOAD_SIZE) {
  throw new Error("File size exceeds maximum allowed size");
}
```

### Directory Structure

Recommended directory structure for file storage:

```
uploads/
├── temp/           # Temporary files
├── users/          # User-specific files
│   ├── {userId}/   # Folders per user
├── public/         # Publicly accessible files
└── secure/         # Access-controlled files
```

### Error Handling

Example of proper error handling:

```typescript
import { readFileSafely } from "@/server/infrastructure/files";
import { logger } from "@/server/infrastructure/logging";

async function getFileContents(filePath: string): Promise<string | null> {
  try {
    const buffer = await readFileSafely(filePath);
    return buffer.toString("utf8");
  } catch (error) {
    if (error.code === "ENOENT") {
      logger.warn(`File not found: ${filePath}`);
      return null;
    }

    logger.error(`Error reading file: ${filePath}`, error);
    throw new Error(`Failed to read file: ${error.message}`);
  }
}
```
