// packages/media/src/ffmpeg-wrapper.ts
/**
 * Custom FFmpeg Wrapper - Lightweight replacement for fluent-ffmpeg
 *
 * Provides basic FFmpeg functionality for media processing without external dependencies.
 */

import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';

export interface FFmpegOptions {
  input?: string;
  output?: string;
  videoCodec?: string;
  audioCodec?: string;
  videoBitrate?: string;
  audioBitrate?: string;
  resolution?: { width: number; height: number };
  format?: string;
  startTime?: number;
  duration?: number;
  thumbnail?: {
    time: number;
    size: number;
    output: string;
  };
  waveform?: {
    output: string;
    width: number;
    height: number;
  };
}

export interface FFmpegResult {
  success: boolean;
  output?: string;
  error?: string;
  duration?: number;
}

/**
 * Execute FFmpeg command with given options
 */
export async function runFFmpeg(options: FFmpegOptions): Promise<FFmpegResult> {
  return new Promise((resolve) => {
    const args: string[] = [];

    // Input file
    if (options.input) {
      args.push('-i', options.input);
    }

    // Start time
    if (options.startTime !== undefined) {
      args.push('-ss', options.startTime.toString());
    }

    // Duration
    if (options.duration !== undefined) {
      args.push('-t', options.duration.toString());
    }

    // Video codec
    if (options.videoCodec) {
      args.push('-c:v', options.videoCodec);
    }

    // Audio codec
    if (options.audioCodec) {
      args.push('-c:a', options.audioCodec);
    }

    // Video bitrate
    if (options.videoBitrate) {
      args.push('-b:v', options.videoBitrate);
    }

    // Audio bitrate
    if (options.audioBitrate) {
      args.push('-b:a', options.audioBitrate);
    }

    // Resolution
    if (options.resolution) {
      args.push('-s', `${String(options.resolution.width)}x${String(options.resolution.height)}`);
    }

    // Format
    if (options.format) {
      args.push('-f', options.format);
    }

    // Special handling for thumbnails
    if (options.thumbnail) {
      const thumbSize = String(options.thumbnail.size);
      // Generate single frame at specific time
      args.push('-frames:v', '1');
      args.push(
        '-vf',
        `scale=${thumbSize}:${thumbSize}:force_original_aspect_ratio=decrease,pad=${thumbSize}:${thumbSize}:(ow-iw)/2:(oh-ih)/2`,
      );
      args.push('-q:v', '2'); // High quality
      args.push(options.thumbnail.output);
    }

    // Special handling for waveforms
    else if (options.waveform) {
      // Generate waveform visualization
      args.push(
        '-filter_complex',
        `showwavespic=s=${String(options.waveform.width)}x${String(options.waveform.height)}:colors=white`,
      );
      args.push('-frames:v', '1');
      args.push(options.waveform.output);
    }

    // Output file (if not thumbnail/waveform)
    else if (options.output) {
      args.push(options.output);
    }

    // Spawn FFmpeg process
    const ffmpeg = spawn('ffmpeg', args, {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    ffmpeg.stdout.on('data', (data: Buffer) => {
      stdout += data.toString();
    });

    ffmpeg.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    ffmpeg.on('close', (code) => {
      const success = code === 0;

      resolve({
        success,
        output: stdout,
        error: success ? undefined : stderr || 'FFmpeg process failed',
      });
    });

    ffmpeg.on('error', (error) => {
      resolve({
        success: false,
        error: `Failed to start FFmpeg: ${error.message}`,
      });
    });
  });
}

export interface MediaMetadataResult {
  duration?: number;
  hasVideo?: boolean;
  hasAudio?: boolean;
  width?: number;
  height?: number;
}

/**
 * Get media file metadata using FFmpeg
 */
export async function getMediaMetadata(inputPath: string): Promise<MediaMetadataResult> {
  const result = await runFFmpeg({
    input: inputPath,
    // No output specified - just probe for metadata
  });

  if (!result.success) {
    throw new Error(result.error ?? 'Failed to get metadata');
  }

  // Parse FFmpeg output for metadata
  // This is a simplified parser - in production you'd want more robust parsing
  const metadata: MediaMetadataResult = {};

  try {
    // Run ffprobe for detailed metadata
    const probeResult = await runFFprobe(inputPath);
    return probeResult;
  } catch {
    // Fallback to basic parsing from stderr
    const lines = (result.error || '').split('\n');

    for (const line of lines) {
      if (line.includes('Duration:')) {
        const durationMatch = line.match(/Duration: (\d+):(\d+):(\d+\.\d+)/);
        if (durationMatch) {
          const [, hours, minutes, seconds] = durationMatch;
          if (hours && minutes && seconds) {
            metadata.duration =
              parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseFloat(seconds);
          }
        }
      }

      if (line.includes('Stream #0:0')) {
        if (line.includes('Video:')) {
          metadata.hasVideo = true;
          const resolutionMatch = line.match(/(\d+)x(\d+)/);
          if (resolutionMatch && resolutionMatch[1] && resolutionMatch[2]) {
            metadata.width = parseInt(resolutionMatch[1]);
            metadata.height = parseInt(resolutionMatch[2]);
          }
        } else if (line.includes('Audio:')) {
          metadata.hasAudio = true;
        }
      }
    }
  }

  return metadata;
}

/**
 * Run ffprobe for detailed metadata
 */
async function runFFprobe(inputPath: string): Promise<MediaMetadataResult> {
  return new Promise((resolve, reject) => {
    const ffprobe = spawn('ffprobe', [
      '-v',
      'quiet',
      '-print_format',
      'json',
      '-show_format',
      '-show_streams',
      inputPath,
    ]);

    let output = '';

    ffprobe.stdout.on('data', (data: Buffer) => {
      output += data.toString();
    });

    ffprobe.on('close', (code) => {
      if (code === 0) {
        try {
          const parsed = JSON.parse(output) as {
            format?: { duration?: string };
            streams?: Array<{ codec_type?: string; width?: number; height?: number }>;
          };
          const result: MediaMetadataResult = {};

          if (parsed.format?.duration) {
            result.duration = parseFloat(parsed.format.duration);
          }

          if (parsed.streams) {
            for (const stream of parsed.streams) {
              if (stream.codec_type === 'video') {
                result.hasVideo = true;
                if (stream.width) result.width = stream.width;
                if (stream.height) result.height = stream.height;
              } else if (stream.codec_type === 'audio') {
                result.hasAudio = true;
              }
            }
          }

          resolve(result);
        } catch {
          reject(new Error('Failed to parse ffprobe output'));
        }
      } else {
        reject(new Error('ffprobe failed'));
      }
    });

    ffprobe.on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * Convert video to different format
 */
export async function convertVideo(
  inputPath: string,
  outputPath: string,
  options: {
    format?: 'mp4' | 'webm' | 'avi';
    videoCodec?: string;
    audioCodec?: string;
    videoBitrate?: string;
    audioBitrate?: string;
    resolution?: { width: number; height: number };
  } = {},
): Promise<FFmpegResult> {
  const ffmpegOptions: FFmpegOptions = {
    input: inputPath,
    output: outputPath,
  };

  // Set codecs based on format
  switch (options.format) {
    case 'mp4':
      ffmpegOptions.videoCodec = options.videoCodec || 'libx264';
      ffmpegOptions.audioCodec = options.audioCodec || 'aac';
      break;
    case 'webm':
      ffmpegOptions.videoCodec = options.videoCodec || 'libvpx-vp9';
      ffmpegOptions.audioCodec = options.audioCodec || 'libopus';
      break;
    case 'avi':
      ffmpegOptions.videoCodec = options.videoCodec || 'libx264';
      ffmpegOptions.audioCodec = options.audioCodec || 'mp3';
      break;
  }

  if (options.videoBitrate) {
    ffmpegOptions.videoBitrate = options.videoBitrate;
  }

  if (options.audioBitrate) {
    ffmpegOptions.audioBitrate = options.audioBitrate;
  }

  if (options.resolution) {
    ffmpegOptions.resolution = options.resolution;
  }

  return runFFmpeg(ffmpegOptions);
}

/**
 * Extract audio from video
 */
export async function extractAudio(
  inputPath: string,
  outputPath: string,
  format: 'mp3' | 'aac' | 'wav' = 'mp3',
): Promise<FFmpegResult> {
  const audioCodec = format === 'mp3' ? 'libmp3lame' : format === 'aac' ? 'aac' : 'pcm_s16le';

  return runFFmpeg({
    input: inputPath,
    output: outputPath,
    videoCodec: 'none', // No video
    audioCodec,
    format,
  });
}

/**
 * Generate video thumbnail
 */
export async function generateThumbnail(
  inputPath: string,
  outputPath: string,
  time: number = 1,
  size: number = 300,
): Promise<FFmpegResult> {
  return runFFmpeg({
    input: inputPath,
    thumbnail: {
      time,
      size,
      output: outputPath,
    },
  });
}

/**
 * Generate audio waveform
 */
export async function generateWaveform(
  inputPath: string,
  outputPath: string,
  width: number = 800,
  height: number = 200,
): Promise<FFmpegResult> {
  return runFFmpeg({
    input: inputPath,
    waveform: {
      output: outputPath,
      width,
      height,
    },
  });
}

/**
 * Extract audio segment
 */
export async function extractAudioSegment(
  inputPath: string,
  outputPath: string,
  startTime: number,
  duration: number,
): Promise<FFmpegResult> {
  return runFFmpeg({
    input: inputPath,
    output: outputPath,
    startTime,
    duration,
  });
}

/**
 * Create HLS streaming segments
 */
export async function createHLSStream(
  inputPath: string,
  outputDir: string,
  baseName: string = 'stream',
): Promise<FFmpegResult> {
  await fs.mkdir(outputDir, { recursive: true });

  const playlistPath = path.join(outputDir, `${baseName}.m3u8`);
  const segmentsDir = path.join(outputDir, 'segments');

  await fs.mkdir(segmentsDir, { recursive: true });

  return runFFmpeg({
    input: inputPath,
    output: playlistPath,
    // HLS specific options would be added here
    // This is a simplified version
  });
}

/**
 * Check if FFmpeg is available
 */
export async function checkFFmpeg(): Promise<boolean> {
  try {
    await runFFmpeg({});
    return true; // If we can spawn ffmpeg, it's available
  } catch {
    return false;
  }
}
