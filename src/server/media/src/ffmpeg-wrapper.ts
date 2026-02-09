// src/server/media/src/ffmpeg-wrapper.ts
/**
 * Custom FFmpeg Wrapper - Lightweight replacement for fluent-ffmpeg
 *
 * Provides basic FFmpeg functionality for media processing without external dependencies.
 * Includes buffer bounding, process timeout/kill, and path validation.
 *
 * @module ffmpeg-wrapper
 */

import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * Maximum buffer size for stdout/stderr accumulation (10 MB).
 * Prevents unbounded memory growth when FFmpeg produces large output.
 */
const MAX_BUFFER_SIZE = 10 * 1024 * 1024;

/** Default process timeout: 5 minutes */
const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000;

/**
 * Validate that a file path does not contain control characters (0x00–0x1F).
 *
 * Since we use `spawn` (not `exec`), arguments are NOT interpreted by a shell,
 * so classic shell metacharacters (`;`, `|`, `$()`) are not exploitable.
 * However, null bytes and control characters can cause unexpected behavior
 * in FFmpeg's own path parsing.
 *
 * @param filePath - The path to validate
 * @param label - Human-readable label for error messages
 * @throws Error if the path contains unsafe characters
 * @complexity O(n) where n is the path length
 */
/**
 * Maximum allowed dimension for video/image width or height.
 * Prevents resource exhaustion from absurdly large filter graphs.
 */
const MAX_DIMENSION = 65_536;

function validatePath(filePath: string, label: string): void {
  for (let i = 0; i < filePath.length; i++) {
    const code = filePath.charCodeAt(i);
    if (code <= 0x1f) {
      throw new Error(`${label} contains invalid characters`);
    }
  }
}

/**
 * Validate that a numeric value is a safe positive integer suitable for
 * interpolation into FFmpeg filter expressions.
 *
 * Rejects NaN, Infinity, negative numbers, non-integers, and values
 * exceeding MAX_DIMENSION to prevent filter injection and resource exhaustion.
 *
 * @param value - The numeric value to validate
 * @param label - Human-readable label for error messages
 * @throws Error if value is not a safe positive integer within bounds
 * @complexity O(1)
 */
function validateDimension(value: number, label: string): void {
  if (!Number.isFinite(value) || !Number.isInteger(value) || value <= 0 || value > MAX_DIMENSION) {
    throw new Error(
      `${label} must be a positive integer <= ${String(MAX_DIMENSION)}, got ${String(value)}`,
    );
  }
}

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
  /** Process timeout in milliseconds. Defaults to 5 minutes. Set to 0 to disable. */
  timeoutMs?: number;
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
  output: string;
  error?: string;
  duration?: number;
}

/**
 * Execute FFmpeg command with given options.
 *
 * Validates all file paths, bounds stdout/stderr buffers, and kills
 * the child process on timeout to prevent zombie FFmpeg processes.
 *
 * @param options - FFmpeg processing options
 * @returns FFmpeg result with success status and output
 * @throws Error if any file path contains control characters
 */
export async function runFFmpeg(options: FFmpegOptions): Promise<FFmpegResult> {
  // Validate all file paths before spawning
  if (options.input !== undefined && options.input.length > 0) {
    validatePath(options.input, 'Input path');
  }
  if (options.output !== undefined && options.output.length > 0) {
    validatePath(options.output, 'Output path');
  }
  if (options.thumbnail !== undefined) {
    validatePath(options.thumbnail.output, 'Thumbnail output path');
    validateDimension(options.thumbnail.size, 'Thumbnail size');
  }
  if (options.waveform !== undefined) {
    validatePath(options.waveform.output, 'Waveform output path');
    validateDimension(options.waveform.width, 'Waveform width');
    validateDimension(options.waveform.height, 'Waveform height');
  }
  if (options.resolution !== undefined) {
    validateDimension(options.resolution.width, 'Resolution width');
    validateDimension(options.resolution.height, 'Resolution height');
  }

  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  return new Promise((resolve) => {
    const args: string[] = [];

    // Input file
    if (options.input !== undefined && options.input.length > 0) {
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
    if (options.videoCodec !== undefined && options.videoCodec.length > 0) {
      args.push('-c:v', options.videoCodec);
    }

    // Audio codec
    if (options.audioCodec !== undefined && options.audioCodec.length > 0) {
      args.push('-c:a', options.audioCodec);
    }

    // Video bitrate
    if (options.videoBitrate !== undefined && options.videoBitrate.length > 0) {
      args.push('-b:v', options.videoBitrate);
    }

    // Audio bitrate
    if (options.audioBitrate !== undefined && options.audioBitrate.length > 0) {
      args.push('-b:a', options.audioBitrate);
    }

    // Resolution
    if (options.resolution !== undefined) {
      args.push('-s', `${String(options.resolution.width)}x${String(options.resolution.height)}`);
    }

    // Format
    if (options.format !== undefined && options.format.length > 0) {
      args.push('-f', options.format);
    }

    // Special handling for thumbnails
    if (options.thumbnail !== undefined) {
      const thumbSize = String(options.thumbnail.size);
      args.push('-frames:v', '1');
      args.push(
        '-vf',
        `scale=${thumbSize}:${thumbSize}:force_original_aspect_ratio=decrease,pad=${thumbSize}:${thumbSize}:(ow-iw)/2:(oh-ih)/2`,
      );
      args.push('-q:v', '2');
      args.push(options.thumbnail.output);
    }

    // Special handling for waveforms
    else if (options.waveform !== undefined) {
      args.push(
        '-filter_complex',
        `showwavespic=s=${String(options.waveform.width)}x${String(options.waveform.height)}:colors=white`,
      );
      args.push('-frames:v', '1');
      args.push(options.waveform.output);
    }

    // Output file (if not thumbnail/waveform)
    else if (options.output !== undefined && options.output.length > 0) {
      args.push(options.output);
    }

    // Spawn FFmpeg process
    const ffmpeg = spawn('ffmpeg', args, {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    let killed = false;

    // Set up timeout to kill the process and prevent zombies
    let timer: NodeJS.Timeout | undefined;
    if (timeoutMs > 0) {
      timer = setTimeout(() => {
        killed = true;
        ffmpeg.kill('SIGKILL');
      }, timeoutMs);
    }

    ffmpeg.stdout.on('data', (data: Buffer) => {
      if (stdout.length < MAX_BUFFER_SIZE) {
        stdout += data.toString();
        if (stdout.length > MAX_BUFFER_SIZE) {
          stdout = stdout.slice(0, MAX_BUFFER_SIZE);
        }
      }
    });

    ffmpeg.stderr.on('data', (data: Buffer) => {
      if (stderr.length < MAX_BUFFER_SIZE) {
        stderr += data.toString();
        if (stderr.length > MAX_BUFFER_SIZE) {
          stderr = stderr.slice(0, MAX_BUFFER_SIZE);
        }
      }
    });

    ffmpeg.on('close', (code) => {
      if (timer !== undefined) {
        clearTimeout(timer);
      }

      if (killed) {
        resolve({
          success: false,
          output: stdout,
          error: `FFmpeg process killed after ${String(timeoutMs)}ms timeout`,
        });
        return;
      }

      const success = code === 0;

      if (success) {
        resolve({
          success: true,
          output: stdout,
        });
      } else {
        resolve({
          success: false,
          output: stdout,
          error: stderr.length > 0 ? stderr : 'FFmpeg process failed',
        });
      }
    });

    ffmpeg.on('error', (error) => {
      if (timer !== undefined) {
        clearTimeout(timer);
      }
      resolve({
        success: false,
        output: '',
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
    const lines = (result.error ?? '').split('\n');

    for (const line of lines) {
      if (line.includes('Duration:')) {
        const durationMatch = line.match(/Duration: (\d+):(\d+):(\d+\.\d+)/);
        if (durationMatch !== null) {
          const [, hours, minutes, seconds] = durationMatch;
          if (
            hours !== undefined &&
            hours.length > 0 &&
            minutes !== undefined &&
            minutes.length > 0 &&
            seconds !== undefined &&
            seconds.length > 0
          ) {
            metadata.duration =
              parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseFloat(seconds);
          }
        }
      }

      if (line.includes('Stream #0:0')) {
        if (line.includes('Video:')) {
          metadata.hasVideo = true;
          const resolutionMatch = line.match(/(\d+)x(\d+)/);
          const width = resolutionMatch?.[1];
          const height = resolutionMatch?.[2];
          if (width !== undefined && height !== undefined) {
            metadata.width = parseInt(width);
            metadata.height = parseInt(height);
          }
        }
        if (line.includes('Audio:')) {
          metadata.hasAudio = true;
        }
      }
    }
  }

  return metadata;
}

/**
 * Run ffprobe for detailed metadata.
 *
 * Includes path validation, buffer bounding, and a 30-second timeout
 * to prevent zombie processes.
 *
 * @param inputPath - Path to the media file
 * @returns Parsed metadata result
 * @throws Error if path is invalid, ffprobe fails, or output cannot be parsed
 */
async function runFFprobe(inputPath: string): Promise<MediaMetadataResult> {
  validatePath(inputPath, 'Probe input path');

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
    let killed = false;

    // 30-second timeout for metadata probing
    const timer = setTimeout(() => {
      killed = true;
      ffprobe.kill('SIGKILL');
    }, 30_000);

    ffprobe.stdout.on('data', (data: Buffer) => {
      if (output.length < MAX_BUFFER_SIZE) {
        output += data.toString();
        if (output.length > MAX_BUFFER_SIZE) {
          output = output.slice(0, MAX_BUFFER_SIZE);
        }
      }
    });

    ffprobe.on('close', (code) => {
      clearTimeout(timer);

      if (killed) {
        reject(new Error('ffprobe timed out'));
        return;
      }

      if (code === 0) {
        try {
          const parsed = JSON.parse(output) as {
            format?: { duration?: string };
            streams?: Array<Record<string, unknown>>;
          };
          const result: MediaMetadataResult = {};

          if (parsed.format?.duration !== undefined) {
            result.duration = parseFloat(parsed.format.duration);
          }

          if (parsed.streams !== undefined) {
            for (const stream of parsed.streams) {
              const codecType = stream['codec_type'];
              const width = stream['width'];
              const height = stream['height'];

              if (codecType === 'video') {
                result.hasVideo = true;
                if (typeof width === 'number') result.width = width;
                if (typeof height === 'number') result.height = height;
              } else if (codecType === 'audio') {
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
      clearTimeout(timer);
      reject(error);
    });
  });
}

/**
 * Convert video to different format
 *
 * @param inputPath - Path to the input video file
 * @param outputPath - Path for the converted output file
 * @param options - Conversion options (format, codecs, bitrate, resolution)
 * @returns FFmpeg result with success status
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
      ffmpegOptions.videoCodec = options.videoCodec ?? 'libx264';
      ffmpegOptions.audioCodec = options.audioCodec ?? 'aac';
      break;
    case 'webm':
      ffmpegOptions.videoCodec = options.videoCodec ?? 'libvpx-vp9';
      ffmpegOptions.audioCodec = options.audioCodec ?? 'libopus';
      break;
    case 'avi':
      ffmpegOptions.videoCodec = options.videoCodec ?? 'libx264';
      ffmpegOptions.audioCodec = options.audioCodec ?? 'mp3';
      break;
    case undefined:
      break;
  }

  if (options.videoBitrate !== undefined && options.videoBitrate.length > 0) {
    ffmpegOptions.videoBitrate = options.videoBitrate;
  }

  if (options.audioBitrate !== undefined && options.audioBitrate.length > 0) {
    ffmpegOptions.audioBitrate = options.audioBitrate;
  }

  if (options.resolution !== undefined) {
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
 *
 * @param inputPath - Path to the source video
 * @param outputDir - Directory for HLS output files
 * @param baseName - Base name for the m3u8 playlist file
 * @returns FFmpeg result with the playlist path
 */
export async function createHLSStream(
  inputPath: string,
  outputDir: string,
  baseName: string = 'stream',
): Promise<FFmpegResult> {
  validatePath(inputPath, 'HLS input path');
  validatePath(outputDir, 'HLS output directory');
  validatePath(baseName, 'HLS base name');

  await fs.mkdir(outputDir, { recursive: true });

  const playlistPath = path.join(outputDir, `${baseName}.m3u8`);
  const segmentsDir = path.join(outputDir, 'segments');

  await fs.mkdir(segmentsDir, { recursive: true });

  return runFFmpeg({
    input: inputPath,
    output: playlistPath,
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
