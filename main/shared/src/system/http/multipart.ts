// main/shared/src/system/http/multipart.ts
/**
 * Multipart parsing utilities.
 *
 * Framework-agnostic helpers that parse a multipart/form-data payload and
 * normalize the first file part into a predictable shape.
 *
 * Uses only platform-agnostic APIs (Uint8Array, TextDecoder) so it works in
 * both Node.js and browser environments.
 */

export interface ParsedMultipartFile {
  buffer: Uint8Array;
  mimetype: string;
  filename: string;
  originalName: string;
  size: number;
}

function extractBoundary(contentType: string): string | null {
  const match = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  const value = match?.[1] ?? match?.[2];
  if (value === undefined || value.trim() === '') return null;
  return value.trim();
}

function parseHeaders(headerBlock: string): Record<string, string> {
  const headers: Record<string, string> = {};
  for (const line of headerBlock.split('\r\n')) {
    const sep = line.indexOf(':');
    if (sep <= 0) continue;
    const key = line.slice(0, sep).trim().toLowerCase();
    const value = line.slice(sep + 1).trim();
    headers[key] = value;
  }
  return headers;
}

function parseContentDispositionFilename(contentDisposition: string): string | null {
  const fileNameMatch = contentDisposition.match(/filename="([^"]*)"/i);
  const fileNameStarMatch = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  const raw = fileNameMatch?.[1] ?? fileNameStarMatch?.[1];
  if (raw === undefined) return null;
  const decoded = raw.replace(/%([0-9A-Fa-f]{2})/g, (_, hex: string) =>
    String.fromCharCode(Number.parseInt(hex, 16)),
  );
  return decoded;
}

/** Encode a latin1 string back to bytes (one byte per char, low 8 bits). */
function latin1ToBytes(str: string): Uint8Array {
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    bytes[i] = str.charCodeAt(i) & 0xff;
  }
  return bytes;
}

export function parseMultipartFile(
  bodyBuffer: Uint8Array,
  contentType: string,
): ParsedMultipartFile | null {
  const boundary = extractBoundary(contentType);
  if (boundary === null) return null;

  const boundaryToken = `--${boundary}`;
  // Decode as latin1 (iso-8859-1) — preserves all byte values as code-points 0–255
  const raw = new TextDecoder('latin1').decode(bodyBuffer);
  const parts = raw.split(boundaryToken).slice(1, -1);

  for (const partRaw of parts) {
    const trimmedPart = partRaw.startsWith('\r\n') ? partRaw.slice(2) : partRaw;
    const separatorIndex = trimmedPart.indexOf('\r\n\r\n');
    if (separatorIndex < 0) continue;

    const headerBlock = trimmedPart.slice(0, separatorIndex);
    let payload = trimmedPart.slice(separatorIndex + 4);
    if (payload.endsWith('\r\n')) payload = payload.slice(0, -2);

    const headers = parseHeaders(headerBlock);
    const contentDisposition = headers['content-disposition'] ?? '';
    const filename = parseContentDispositionFilename(contentDisposition);
    if (filename === null || filename === '') continue;

    const mimetype = headers['content-type'] ?? 'application/octet-stream';
    const fileBuffer = latin1ToBytes(payload);

    return {
      buffer: fileBuffer,
      mimetype,
      filename,
      originalName: filename,
      size: fileBuffer.length,
    };
  }

  return null;
}
