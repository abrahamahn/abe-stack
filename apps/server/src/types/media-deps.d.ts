declare module 'ffmpeg-static' {
  const ffmpegPath: string | undefined;
  export default ffmpegPath;
}

declare module 'fluent-ffmpeg' {
  type FfmpegCommand = Record<string, unknown>;
  type FfmpegCallback = (err: Error | null, data: unknown) => void;

  interface FfmpegNamespace {
    ffprobe: (input: string, callback: FfmpegCallback) => void;
  }

  const ffmpeg: ((...args: unknown[]) => FfmpegCommand) & FfmpegNamespace;
  export function setFfmpegPath(path: string): void;
  export default ffmpeg;
}

declare module 'music-metadata' {
  export function parseFile(...args: unknown[]): Promise<unknown>;
}

declare module 'sharp' {
  const sharp: (...args: unknown[]) => unknown;
  export default sharp;
}
