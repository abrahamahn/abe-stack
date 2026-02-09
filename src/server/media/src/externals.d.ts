// server/media/src/externals.d.ts
/**
 * External Module Declarations
 *
 * Previously declared lazy-loaded modules (fluent-ffmpeg, ffmpeg-static,
 * music-metadata). All have been replaced by internal implementations:
 * - ffmpeg-wrapper.ts (replaces fluent-ffmpeg + ffmpeg-static)
 * - audio-metadata.ts (replaces music-metadata)
 *
 * Sharp is installed as a real dependency and ships its own type definitions.
 * No external declarations remain.
 */
