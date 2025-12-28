# 🔄 Media Processing System

## 📋 Purpose

The processor module provides a robust framework for handling various media processing operations, offering:

- Image transformation and optimization
- Media file manipulation and conversion
- Stream processing for efficient data handling
- Abstracted APIs for different media types
- Pipeline patterns for complex processing chains
- Performance optimization for media operations

This module serves as the foundation for all media processing needs throughout the application, providing consistent interfaces and optimized implementations.

## 🧩 Key Components

### 1️⃣ Image Processor

- **`ImageProcessor`**: Core implementation for image manipulation
- Handles resizing, cropping, format conversion, and optimization
- Provides both synchronous and asynchronous processing APIs

### 2️⃣ Media Processor

- **`MediaProcessor`**: General-purpose media file handling
- Supports video, audio, and document processing
- Offers metadata extraction and content analysis

### 3️⃣ Stream Processor

- **`StreamProcessor`**: Efficient processing of data streams
- Provides transform streams for on-the-fly media manipulation
- Supports chunked processing for memory-efficient operations

## 🛠️ Usage Instructions

### Image Processing

```typescript
import { ImageProcessor } from "@/server/infrastructure/processor";

async function processUserAvatar(imageBuffer: Buffer): Promise<Buffer> {
  const processor = new ImageProcessor();

  // Process image with multiple operations
  const processedImage = await processor
    .load(imageBuffer)
    .resize({ width: 200, height: 200 })
    .crop({ width: 200, height: 200, gravity: "center" })
    .format("webp", { quality: 85 })
    .optimize()
    .toBuffer();

  return processedImage;
}

// Generate thumbnails at different sizes
async function generateThumbnails(
  imageBuffer: Buffer,
): Promise<Map<string, Buffer>> {
  const processor = new ImageProcessor();
  await processor.load(imageBuffer);

  const thumbnails = new Map<string, Buffer>();

  // Create multiple thumbnail sizes
  thumbnails.set(
    "sm",
    await processor.clone().resize({ width: 100 }).toBuffer(),
  );
  thumbnails.set(
    "md",
    await processor.clone().resize({ width: 300 }).toBuffer(),
  );
  thumbnails.set(
    "lg",
    await processor.clone().resize({ width: 600 }).toBuffer(),
  );

  return thumbnails;
}
```

### Media Processing

```typescript
import { MediaProcessor } from "@/server/infrastructure/processor";

async function processVideoUpload(videoPath: string): Promise<void> {
  const processor = new MediaProcessor();

  // Load the video file
  await processor.load(videoPath);

  // Extract metadata
  const metadata = await processor.getMetadata();
  console.log(`Video duration: ${metadata.duration} seconds`);

  // Generate thumbnail from video
  const thumbnail = await processor.extractFrame(5); // at 5 seconds
  await processor.saveImage(thumbnail, "./thumbnails/video-thumb.jpg");

  // Convert to web-friendly format
  await processor.convert({
    output: "./processed/video.mp4",
    format: "mp4",
    options: {
      videoCodec: "h264",
      videoBitrate: "1000k",
      audioCodec: "aac",
      audioBitrate: "128k",
    },
  });
}
```

### Stream Processing

```typescript
import { StreamProcessor } from "@/server/infrastructure/processor";
import { createReadStream, createWriteStream } from "fs";

async function processLargeImageFile(
  inputPath: string,
  outputPath: string,
): Promise<void> {
  const processor = new StreamProcessor();

  // Create transform stream for image processing
  const transform = processor.createImageTransform({
    resize: { width: 800 },
    format: "jpeg",
    quality: 80,
  });

  // Process file as a stream (memory efficient)
  return new Promise((resolve, reject) => {
    createReadStream(inputPath)
      .pipe(transform)
      .pipe(createWriteStream(outputPath))
      .on("finish", resolve)
      .on("error", reject);
  });
}

// Processing media uploads as streams
function handleFileUpload(uploadStream, metadata) {
  const processor = new StreamProcessor();

  // Choose processing pipeline based on content type
  const pipeline = metadata.contentType.startsWith("image/")
    ? processor.createImagePipeline({
        /* options */
      })
    : processor.createMediaPipeline({
        /* options */
      });

  // Process and store the upload
  return uploadStream
    .pipe(pipeline)
    .pipe(storageService.createWriteStream(`uploads/${metadata.filename}`));
}
```

## 🏗️ Architecture Decisions

### Processing Pipeline Pattern

- **Decision**: Implement chainable processing pipeline
- **Rationale**: Enables intuitive composition of processing operations
- **Benefit**: Readable code with complex multi-step transformations

### Streaming-First Approach

- **Decision**: Prioritize stream-based processing where possible
- **Rationale**: Manages memory efficiently for large media files
- **Implementation**: Transform streams with backpressure support

### Metadata Preservation

- **Decision**: Maintain and transfer metadata between processing steps
- **Rationale**: Preserves important information throughout the pipeline
- **Benefit**: Ensures proper file handling with correct context

### Performance Optimization

- **Decision**: Implement optimized processing algorithms
- **Rationale**: Media processing can be CPU and memory intensive
- **Implementation**: Worker threads, shared memory, and native bindings

## ⚙️ Setup and Configuration Notes

### Dependencies

The processor module relies on several libraries which must be installed:

```bash
# For image processing
npm install sharp

# For media processing
npm install fluent-ffmpeg ffmpeg-static
```

### Configuration Options

Global processor configuration:

```typescript
import { configureProcessors } from "@/server/infrastructure/processor";

configureProcessors({
  // Image processor configuration
  image: {
    defaultFormat: "webp",
    defaultQuality: 80,
    maxDimension: 4000,
    tempDir: "./temp/images",
  },

  // Media processor configuration
  media: {
    ffmpegPath: "/usr/local/bin/ffmpeg",
    maxConcurrentJobs: 4,
    timeoutMs: 300000, // 5 minutes
  },

  // Stream processor configuration
  stream: {
    chunkSize: 64 * 1024, // 64KB
    highWaterMark: 1024 * 1024, // 1MB
  },
});
```

### Optimization Settings

For production environments:

```typescript
// In production configuration
if (process.env.NODE_ENV === "production") {
  configureProcessors({
    image: {
      // Use higher compression in production
      defaultQuality: 75,
      // Enable caching
      enableCache: true,
      cacheDir: "./cache/images",
      // Use worker threads for parallelization
      useWorkers: true,
      workerCount: 4,
    },
    // Other optimizations...
  });
}
```

### Error Handling

Example of proper error handling:

```typescript
import {
  ImageProcessor,
  ProcessingError,
} from "@/server/infrastructure/processor";
import { logger } from "@/server/infrastructure/logging";

async function safeImageProcessing(input: Buffer): Promise<Buffer | null> {
  const processor = new ImageProcessor();

  try {
    return await processor.load(input).resize({ width: 800 }).toBuffer();
  } catch (error) {
    if (error instanceof ProcessingError) {
      logger.warn(`Image processing failed: ${error.message}`, {
        code: error.code,
        details: error.details,
      });
      return null;
    }

    logger.error("Unexpected error in image processing", error);
    throw error;
  }
}
```
