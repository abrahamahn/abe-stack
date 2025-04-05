# 🧪 Media Processor Unit Tests

## 📋 Overview

This directory contains unit tests for the media processing infrastructure components. The tests validate the functionality of image, video, and stream processing capabilities, including transformations, format conversions, and metadata handling.

## 🧩 Test Files

| File                                                 | Description                                                                              |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| [ImageProcessor.test.ts](./ImageProcessor.test.ts)   | Tests image processing functionality including resizing, cropping, and format conversion |
| [MediaProcessor.test.ts](./MediaProcessor.test.ts)   | Tests general media processing capabilities including metadata extraction and validation |
| [StreamProcessor.test.ts](./StreamProcessor.test.ts) | Tests stream processing for handling large media files and real-time transformations     |

## 🔍 Key Test Scenarios

### Image Processing

- Image resizing
- Image cropping
- Format conversion (JPEG, PNG, WebP, etc.)
- Compression quality control
- Metadata preservation
- Image optimization

### Media Processing

- Media type detection
- Metadata extraction
- EXIF data handling
- Media validation
- Thumbnail generation
- Batch processing

### Stream Processing

- Chunked data handling
- Stream transformation
- Memory-efficient processing
- Progress tracking
- Cancelation support
- Error recovery

## 🔧 Test Implementation Details

### Mocks and Stubs

- Mock file streams
- Sample image fixtures
- Media metadata stubs
- Processing option configurations

### Common Patterns

```typescript
// Example pattern for testing image resizing
it("should resize images to specified dimensions", async () => {
  // Arrange
  const imageProcessor = new ImageProcessor();
  const inputBuffer = await fs.readFile("./fixtures/test-image.jpg");

  // Act
  const resizedBuffer = await imageProcessor.resize(inputBuffer, {
    width: 300,
    height: 200,
    fit: "cover",
  });

  // Assert
  // Get dimensions of the resized image
  const resizedImage = await sharp(resizedBuffer).metadata();
  expect(resizedImage.width).toBe(300);
  expect(resizedImage.height).toBe(200);
});
```

## 📚 Advanced Testing Techniques

### Performance Testing

- Processing speed measurement
- Memory usage during processing
- Optimization effectiveness

### Format Compatibility

- Testing various input formats
- Output format fidelity
- Exotic format handling

### Error Handling

- Corrupted input handling
- Resource limitation handling
- Partial processing recovery

## 🔗 Related Components

- [Storage](../storage/README.md) - For media file storage
- [Files](../files/README.md) - For file system operations
- [Queue](../queue/README.md) - For background processing
