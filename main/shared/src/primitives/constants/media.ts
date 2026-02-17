// main/shared/src/primitives/constants/media.ts

// ============================================================================
// File Extension Constants
// ============================================================================

export const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'] as const;
export const AUDIO_EXTENSIONS = ['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a'] as const;
export const VIDEO_EXTENSIONS = ['mp4', 'avi', 'mov', 'mkv', 'webm', 'flv', 'wmv'] as const;

export const ALL_MEDIA_EXTENSIONS = [
  ...IMAGE_EXTENSIONS,
  ...AUDIO_EXTENSIONS,
  ...VIDEO_EXTENSIONS,
] as const;

// ============================================================================
// MIME Type Constants
// ============================================================================

export const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export const ALLOWED_MEDIA_MIME_TYPES = [
  ...ALLOWED_IMAGE_MIME_TYPES,
  'image/gif',
  'image/avif',
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'audio/flac',
  'audio/aac',
  'audio/mp4',
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-msvideo',
] as const;

// ============================================================================
// Extension ↔ MIME Mappings
// ============================================================================

export const EXTRA_EXT_TO_MIME: Record<string, string> = {
  svg: 'image/svg+xml',
  ico: 'image/x-icon',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  csv: 'text/csv',
  xml: 'application/xml',
  zip: 'application/zip',
  gz: 'application/gzip',
  json: 'application/json',
  txt: 'text/plain',
};

export const EXT_TO_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  avif: 'image/avif',
  tiff: 'image/tiff',
  bmp: 'image/bmp',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  flac: 'audio/flac',
  aac: 'audio/aac',
  ogg: 'audio/ogg',
  m4a: 'audio/mp4',
  mp4: 'video/mp4',
  avi: 'video/x-msvideo',
  mov: 'video/quicktime',
  mkv: 'video/x-matroska',
  webm: 'video/webm',
  flv: 'video/x-flv',
  wmv: 'video/x-ms-wmv',
  pdf: 'application/pdf',
  txt: 'text/plain',
  json: 'application/json',
};

export const MIME_TO_EXT: Record<string, string> = Object.fromEntries([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/gif', 'gif'],
  ['image/webp', 'webp'],
  ['image/avif', 'avif'],
  ['image/tiff', 'tiff'],
  ['image/bmp', 'bmp'],
  ['audio/mpeg', 'mp3'],
  ['audio/wav', 'wav'],
  ['audio/flac', 'flac'],
  ['audio/aac', 'aac'],
  ['audio/ogg', 'ogg'],
  ['audio/mp4', 'm4a'],
  ['video/mp4', 'mp4'],
  ['video/x-msvideo', 'avi'],
  ['video/quicktime', 'mov'],
  ['video/x-matroska', 'mkv'],
  ['video/webm', 'webm'],
  ['video/x-flv', 'flv'],
  ['video/x-ms-wmv', 'wmv'],
  ['application/pdf', 'pdf'],
  ['text/plain', 'txt'],
  ['application/json', 'json'],
]) as Record<string, string>;

// ============================================================================
// Magic Number Signatures
// ============================================================================

export const MAGIC_NUMBERS: Array<{
  offset: number;
  signature: number[];
  ext: string;
  mime: string;
}> = [
  { offset: 0, signature: [0xff, 0xd8, 0xff], ext: 'jpg', mime: 'image/jpeg' },
  {
    offset: 0,
    signature: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
    ext: 'png',
    mime: 'image/png',
  },
  { offset: 0, signature: [0x47, 0x49, 0x46, 0x38, 0x37, 0x61], ext: 'gif', mime: 'image/gif' },
  { offset: 0, signature: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61], ext: 'gif', mime: 'image/gif' },
  { offset: 0, signature: [0x42, 0x4d], ext: 'bmp', mime: 'image/bmp' },
  { offset: 0, signature: [0x52, 0x49, 0x46, 0x46], ext: 'webp', mime: 'image/webp' },
  { offset: 0, signature: [0xff, 0xfb], ext: 'mp3', mime: 'audio/mpeg' },
  { offset: 0, signature: [0xff, 0xf3], ext: 'mp3', mime: 'audio/mpeg' },
  { offset: 0, signature: [0xff, 0xf2], ext: 'mp3', mime: 'audio/mpeg' },
  { offset: 0, signature: [0x49, 0x44, 0x33], ext: 'mp3', mime: 'audio/mpeg' },
  { offset: 0, signature: [0x52, 0x49, 0x46, 0x46], ext: 'wav', mime: 'audio/wav' },
  { offset: 0, signature: [0x4f, 0x67, 0x67, 0x53], ext: 'ogg', mime: 'audio/ogg' },
  {
    offset: 0,
    signature: [0x66, 0x74, 0x79, 0x70, 0x4d, 0x34, 0x41],
    ext: 'm4a',
    mime: 'audio/m4a',
  },
  {
    offset: 0,
    signature: [0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70],
    ext: 'mp4',
    mime: 'video/mp4',
  },
  {
    offset: 0,
    signature: [0x00, 0x00, 0x00, 0x14, 0x66, 0x74, 0x79, 0x70],
    ext: 'mp4',
    mime: 'video/mp4',
  },
  { offset: 0, signature: [0x1a, 0x45, 0xdf, 0xa3], ext: 'webm', mime: 'video/webm' },
  { offset: 0, signature: [0x46, 0x4c, 0x56, 0x01], ext: 'flv', mime: 'video/x-flv' },
  { offset: 0, signature: [0x25, 0x50, 0x44, 0x46], ext: 'pdf', mime: 'application/pdf' },
];

// ============================================================================
// Storage & File Purpose
// ============================================================================

export const STORAGE_PROVIDERS = ['local', 's3', 'gcs'] as const;
export const FILE_PURPOSES = ['avatar', 'document', 'export', 'attachment', 'other'] as const;
