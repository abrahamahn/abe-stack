# 🧪 File Utilities Unit Tests

## 📋 Overview

This directory contains unit tests for the file handling infrastructure components. The tests validate file operations, path manipulation, and file system interactions.

## 🧩 Test Files

| File                                         | Description                                                                          |
| -------------------------------------------- | ------------------------------------------------------------------------------------ |
| [fileHelpers.test.ts](./fileHelpers.test.ts) | Tests utility functions for file operations including reading, writing, and checking |
| [pathHelpers.test.ts](./pathHelpers.test.ts) | Tests path manipulation utilities like normalization, joining, and validation        |

## 🔍 Key Test Scenarios

### File Operations

- File existence checking
- Directory existence checking
- File content reading
- File writing
- File deletion
- File metadata retrieval

### Path Manipulation

- Path normalization
- Path joining
- Relative path resolution
- Absolute path detection
- Extension handling
- Path validation

### Error Handling

- Missing file handling
- Permission issues
- Invalid path detection
- Path traversal prevention
- UTF-8 and special character handling

### Platform Compatibility

- Cross-platform path separators
- Windows vs. Unix path handling
- Long path support
- Hidden file handling

## 🔧 Test Implementation Details

### Mocks and Stubs

- Mock file system
- Temporary directory creation
- Path environment stubs

### Common Patterns

```typescript
// Example pattern for testing file operations
it("should check if a file exists", async () => {
  // Arrange
  const tempDir = await createTempDirectory();
  const filePath = path.join(tempDir, "test-file.txt");
  await fs.writeFile(filePath, "test content");

  // Act
  const exists = await fileHelpers.fileExists(filePath);
  const nonExistentExists = await fileHelpers.fileExists(
    filePath + ".nonexistent",
  );

  // Assert
  expect(exists).toBe(true);
  expect(nonExistentExists).toBe(false);

  // Cleanup
  await fs.rm(tempDir, { recursive: true, force: true });
});
```

## 📚 Advanced Testing Techniques

### Stream Handling

- File streaming tests
- Chunked reading/writing
- Stream error handling

### Concurrency Testing

- Parallel file operations
- File locking mechanisms
- Race condition handling

### Edge Cases

- Empty files
- Very large files
- Unicode file names
- Special characters in paths

## 🔗 Related Components

- [Storage](../storage/README.md) - For higher-level storage abstractions
- [Logging](../logging/README.md) - For operation logging
- [Config](../config/README.md) - For file path configuration
