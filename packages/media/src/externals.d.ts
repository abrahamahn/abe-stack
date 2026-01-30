// packages/media/src/externals.d.ts
/**
 * External Module Declarations
 *
 * Declares modules that are lazy-loaded at runtime via dynamic import().
 * These native dependencies (ffmpeg-static, fluent-ffmpeg, music-metadata)
 * are optional peer dependencies -- the processors cast them to local
 * interfaces upon import, so no actual type information is needed here.
 */

declare module 'ffmpeg-static' {
  const ffmpegPath: string;
  export default ffmpegPath;
}

declare module 'fluent-ffmpeg' {
  const ffmpeg: unknown;
  export default ffmpeg;
  export function setFfmpegPath(path: string): void;
  export function ffprobe(
    input: string,
    callback: (err: Error | null, data: unknown) => void,
  ): void;
}

declare module 'music-metadata' {
  export function parseFile(path: string): Promise<unknown>;
}
