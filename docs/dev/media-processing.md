# Media Processing Pipeline

This document describes the comprehensive media processing system for handling images, audio, and video files in ABE Stack.

## Overview

The media processing pipeline provides automatic processing of uploaded media files with support for:

- **Images**: Resize, format conversion, thumbnail generation
- **Audio**: Format conversion, compression, waveform generation, metadata extraction
- **Video**: Format conversion, resolution scaling, thumbnail extraction, HLS streaming

## Architecture

### Core Components

```
apps/server/src/infra/media/
├── types.ts          # Shared TypeScript interfaces
├── image.ts          # Sharp-based image processing
├── audio.ts          # FFmpeg + music-metadata audio processing
├── video.ts          # FFmpeg-based video processing
└── index.ts          # Public API exports
```

### Dependencies

- **Sharp** (`^0.33.5`) - High-performance image processing
- **fluent-ffmpeg** (`^2.1.3`) - FFmpeg wrapper for audio/video
- **ffmpeg-static** (`^5.2.0`) - Static FFmpeg binary
- **music-metadata** (`^7.14.0`) - Audio metadata extraction

## API Reference

### Image Processing

#### ImageProcessor

```typescript
import { ImageProcessor } from '@infra/media';

const processor = new ImageProcessor();
```

#### Methods

##### `process(inputPath, outputPath, options)`

Process a single image with custom options.

```typescript
const result = await processor.process(
  '/uploads/input.jpg',
  '/uploads/output.webp',
  {
    resize: {
      width: 1920,
      height: 1080,
      fit: 'inside',  // 'cover' | 'contain' | 'fill' | 'inside' | 'outside'
      withoutEnlargement: true,
    },
    format: {
      format: 'webp',  // 'jpeg' | 'png' | 'webp' | 'avif'
      quality: 85,
      progressive: true,
    },
    thumbnail: {
      size: 300,
      fit: 'cover',
    },
  }
);

// Result
{
  success: true,
  outputPath: '/uploads/output.webp',
  thumbnailPath: '/uploads/output_thumb.jpg',
  metadata: {
    width: 1920,
    height: 1080,
    format: 'webp'
  }
}
```

##### `generateVariants(inputPath, baseOutputPath)`

Generate multiple optimized variants automatically.

```typescript
const variants = await processor.generateVariants('/uploads/input.jpg', '/uploads/output');

// Creates:
// - output_original.jpg (copy of original)
// - output_optimized.jpg (resized to 1920px max, JPEG 85% quality)
// - output_thumb.jpg (300x300 thumbnail)
```

##### `getMetadata(inputPath)`

Extract image metadata.

```typescript
const metadata = await processor.getMetadata('/uploads/image.jpg');
// { width: 1920, height: 1080, format: 'jpeg' }
```

### Audio Processing

#### AudioProcessor

```typescript
import { AudioProcessor } from '@infra/media';

const processor = new AudioProcessor();
```

#### Methods

##### `process(inputPath, outputPath, options)`

Process audio with custom options.

```typescript
const result = await processor.process('/uploads/input.wav', '/uploads/output.mp3', {
  format: 'mp3', // 'mp3' | 'aac' | 'wav' | 'ogg'
  bitrate: '256k', // Target bitrate
  channels: 2, // 1 = mono, 2 = stereo
  sampleRate: 44100, // Sample rate in Hz
  waveform: {
    width: 800,
    height: 200,
    color: '#007acc',
  },
});
```

##### `generateVariants(inputPath, baseOutputPath)`

Generate multiple audio variants.

```typescript
const variants = await processor.generateVariants('/uploads/input.wav', '/uploads/output');

// Creates:
// - output_original.mp3 (converted to MP3)
// - output_compressed.mp3 (128k bitrate)
// - output_optimized.mp3 (256k bitrate + waveform.png)
```

##### `extractSegment(inputPath, outputPath, startTime, duration)`

Extract audio segment for previews.

```typescript
const segment = await processor.extractSegment(
  '/uploads/audio.mp3',
  '/uploads/preview.mp3',
  30, // Start at 30 seconds
  15, // 15 second duration
);
```

##### `getMetadata(inputPath)`

Extract comprehensive audio metadata.

```typescript
const metadata = await processor.getMetadata('/uploads/audio.mp3');
/*
{
  duration: 180.5,      // seconds
  bitrate: 320000,      // bits per second
  codec: 'mp3',         // audio codec
  format: 'MPEG',       // container format
  channels: 2,          // audio channels
  sampleRate: 44100,    // sample rate in Hz
}
*/
```

### Video Processing

#### VideoProcessor

```typescript
import { VideoProcessor } from '@infra/media';

const processor = new VideoProcessor();
```

#### Methods

##### `process(inputPath, outputPath, options)`

Process video with custom options.

```typescript
const result = await processor.process('/uploads/input.avi', '/uploads/output.mp4', {
  format: 'mp4', // 'mp4' | 'webm' | 'hls'
  resolution: {
    width: 1280,
    height: 720,
  },
  bitrate: '2500k', // Video bitrate
  thumbnail: {
    time: 5, // Extract at 5 seconds
    size: 300, // Thumbnail size
  },
});
```

##### `generateVariants(inputPath, baseOutputPath)`

Generate multiple video variants.

```typescript
const variants = await processor.generateVariants('/uploads/input.avi', '/uploads/output');

// Creates:
// - output_original.mp4 (converted to MP4)
// - output_compressed.mp4 (720p, 1000k bitrate + thumbnail)
// - output_optimized.mp4 (1080p, 2500k bitrate + thumbnail)
```

##### `createHLSStream(inputPath, outputDir, baseName)`

Create HLS streaming segments for adaptive bitrate streaming.

```typescript
const hls = await processor.createHLSStream('/uploads/video.mp4', '/uploads/hls/', 'stream');

// Creates:
// - stream.m3u8 (playlist)
// - segment_000.ts, segment_001.ts, ... (10-second segments)
```

##### `extractAudio(inputPath, outputPath, format)`

Extract audio track from video.

```typescript
const audio = await processor.extractAudio('/uploads/video.mp4', '/uploads/audio.mp3', 'mp3');
```

##### `getMetadata(inputPath)`

Extract comprehensive video metadata.

```typescript
const metadata = await processor.getMetadata('/uploads/video.mp4');
/*
{
  duration: 120.5,      // seconds
  width: 1920,          // video width
  height: 1080,         // video height
  bitrate: 2500000,     // bits per second
  codec: 'h264',        // video codec
  format: 'mp4',        // container format
  channels: 2,          // audio channels
  sampleRate: 44100,    // audio sample rate
}
*/
```

## Integration

### Automatic Processing on Upload

The media processing pipeline integrates automatically with file uploads:

```typescript
// File uploaded successfully
POST / api / files / uploads / create;
// → File stored in uploads/{userId}/{fileId}/

// Background processing triggered
// → Media type detected from file extension
// → Appropriate processor called
// → Variants generated and stored
// → Database updated with processing results
```

### Supported File Types

#### Images

- **Input**: `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`, `.avif`, `.tiff`, `.bmp`
- **Output**: Optimized variants in multiple formats and sizes

#### Audio

- **Input**: `.mp3`, `.wav`, `.flac`, `.aac`, `.ogg`, `.m4a`
- **Output**: Compressed variants with optional waveforms

#### Video

- **Input**: `.mp4`, `.avi`, `.mov`, `.mkv`, `.webm`, `.flv`, `.wmv`
- **Output**: Multiple resolutions with thumbnails and optional HLS streaming

### Configuration

Add to your `.env` file:

```bash
# Media processing is automatic - no additional config required
# Files are processed based on extension detection
```

### Error Handling

All processing operations include comprehensive error handling:

```typescript
const result = await processor.process(inputPath, outputPath, options);

if (result.success) {
  // Use result.outputPath, result.thumbnailPath, etc.
  console.log('Processing completed:', result.metadata);
} else {
  // Handle error
  console.error('Processing failed:', result.error);
}
```

### Performance Considerations

- **Background Processing**: Media processing runs asynchronously after upload
- **Resource Limits**: Configurable file size limits prevent abuse
- **Streaming**: Large files are processed without loading entirely in memory
- **Optimization**: Multiple variants generated for different use cases

## Testing

Comprehensive test coverage includes:

```bash
# Run media processing tests
pnpm test -- apps/server/src/infra/media
pnpm test -- apps/server/src/modules/files

# Test coverage: 95%+ across all processors
```

### Test Categories

- **Unit Tests**: Individual processor methods
- **Integration Tests**: File upload + processing pipeline
- **Error Handling**: Invalid inputs, processing failures
- **Performance**: Large file handling, timeout scenarios

## Examples

### Complete Upload + Processing Flow

```typescript
// 1. Create upload URL
const uploadResponse = await api.createUploadUrls({
  files: [{ id: 'file1', filename: 'vacation.jpg' }],
});

// 2. Upload file
await uploadFile(file, uploadResponse.urls.file1);

// 3. Automatic processing (happens in background)
// - Original stored as vacation.jpg
// - Optimized created as vacation_optimized.jpg
// - Thumbnail created as vacation_thumb.jpg

// 4. Get signed URLs for processed variants
const signedUrls = await api.getSignedFileUrls({
  fileIds: ['file1'],
});
// Returns URLs for all processed variants
```

### Custom Processing

```typescript
import { ImageProcessor, AudioProcessor, VideoProcessor } from '@infra/media';

// Image: Create custom banner
const imageProcessor = new ImageProcessor();
await imageProcessor.process('input.jpg', 'banner.webp', {
  resize: { width: 1200, height: 400, fit: 'cover' },
  format: { format: 'webp', quality: 90 },
});

// Audio: Create podcast preview
const audioProcessor = new AudioProcessor();
await audioProcessor.extractSegment(
  'episode.mp3',
  'preview.mp3',
  0, // Start at beginning
  30, // 30-second preview
);

// Video: Create streaming variant
const videoProcessor = new VideoProcessor();
await videoProcessor.createHLSStream('movie.mp4', '/cdn/hls/', 'movie-stream');
```

## Future Enhancements

- **GPT-4V Integration**: Automatic image alt-text generation
- **Audio Transcription**: Speech-to-text processing
- **Video Analysis**: Scene detection, content moderation
- **Cloud Storage**: S3 integration for scalable storage
- **CDN Integration**: Automatic CDN invalidation
- **Batch Processing**: Queue-based processing for high-volume uploads
