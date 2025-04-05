# 🧪 Storage Unit Tests

## 📋 Overview

This directory contains unit tests for the storage infrastructure components. The tests validate the storage system's ability to store, retrieve, and manage files across different storage providers, with proper metadata handling and content type validation.

## 🧩 Test Files

| File                                                           | Description                                         |
| -------------------------------------------------------------- | --------------------------------------------------- |
| [StorageService.test.ts](./StorageService.test.ts)             | Tests the main storage service implementation       |
| [LocalStorageProvider.test.ts](./LocalStorageProvider.test.ts) | Tests the local file system storage provider        |
| [IStorageProvider.test.ts](./IStorageProvider.test.ts)         | Tests the storage provider interface contract       |
| [StorageTypes.test.ts](./StorageTypes.test.ts)                 | Tests storage-related type definitions              |
| [ContentTypes.test.ts](./ContentTypes.test.ts)                 | Tests MIME type validation and handling             |
| [FileUtils.test.ts](./FileUtils.test.ts)                       | Tests file utility functions for storage operations |

## 🔍 Key Test Scenarios

### File Storage

- File upload handling
- Binary content storage
- Stream-based storage
- Content type detection
- File size validation
- Storage path management

### File Retrieval

- File download
- Streaming retrieval
- Partial content retrieval (ranges)
- File existence checking
- Error handling for missing files
- Public URL generation

### Metadata Management

- File metadata storage
- Metadata retrieval
- Custom metadata fields
- Automatic metadata extraction
- Searchable metadata
- Metadata validation

### Provider Management

- Provider registration
- Provider selection
- Multi-provider support
- Provider failover
- Provider-specific options
- Storage abstraction

## 🔧 Test Implementation Details

### Mocks and Stubs

- Mock file system
- Mock storage providers
- Sample files of various types
- Stream mocks

### Common Patterns

```typescript
// Example pattern for testing file storage and retrieval
it("should store and retrieve files correctly", async () => {
  // Arrange
  const storageService = new StorageService({
    provider: new LocalStorageProvider({
      basePath: "/tmp/test-storage",
    }),
  });

  const content = Buffer.from("Test file content");
  const options = {
    contentType: "text/plain",
    metadata: {
      fileName: "test.txt",
      owner: "test-user",
    },
  };

  // Act
  const fileId = await storageService.storeFile(content, options);
  const retrievedFile = await storageService.retrieveFile(fileId);

  // Assert
  expect(retrievedFile.content.toString()).toBe("Test file content");
  expect(retrievedFile.contentType).toBe("text/plain");
  expect(retrievedFile.metadata.fileName).toBe("test.txt");
  expect(retrievedFile.metadata.owner).toBe("test-user");
});

// Example pattern for testing content type validation
it("should validate content types", async () => {
  // Arrange
  const storageService = new StorageService({
    provider: new LocalStorageProvider({
      basePath: "/tmp/test-storage",
    }),
    allowedTypes: ["image/jpeg", "image/png"],
  });

  const jpegContent = Buffer.from("JPEG content");
  const pdfContent = Buffer.from("PDF content");

  // Act & Assert
  // Should accept valid content type
  await expect(
    storageService.storeFile(jpegContent, {
      contentType: "image/jpeg",
    }),
  ).resolves.toBeDefined();

  // Should reject invalid content type
  await expect(
    storageService.storeFile(pdfContent, {
      contentType: "application/pdf",
    }),
  ).rejects.toThrow(/invalid content type/i);
});
```

## 📚 Advanced Testing Techniques

### Performance Testing

- Large file handling
- Concurrent storage operations
- Storage throughput measurement
- Memory usage optimization

### Security Testing

- Path traversal prevention
- Storage isolation
- Access control
- Content validation

### Durability Testing

- Storage persistence
- File corruption detection
- Error recovery
- Provider unavailability handling

## 🔗 Related Components

- [Files](../files/README.md) - For file system operations
- [Processor](../processor/README.md) - For media processing integration
- [Config](../config/README.md) - For storage configuration
