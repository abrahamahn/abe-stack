// apps/server/src/infrastructure/http/middleware/static.ts
/**
 * Static File Serving
 *
 * Simple static file server for local storage uploads.
 * Replaces @fastify/static with minimal implementation.
 */

import { createReadStream, statSync } from 'node:fs';
import { join, normalize, extname } from 'node:path';

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

/**
 * Common MIME types for uploaded files
 */
const MIME_TYPES: Record<string, string> = {
  // Images
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',

  // Documents
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',

  // Text
  '.txt': 'text/plain',
  '.csv': 'text/csv',
  '.json': 'application/json',
  '.xml': 'application/xml',

  // Media
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',

  // Archives
  '.zip': 'application/zip',
  '.gz': 'application/gzip',
};

/**
 * Get MIME type for a file extension
 */
function getMimeType(filePath: string): string {
  const ext = extname(filePath).toLowerCase();
  return MIME_TYPES[ext] ?? 'application/octet-stream';
}

/**
 * Check if a path is safe (no directory traversal)
 */
function isSafePath(rootPath: string, requestedPath: string): boolean {
  const normalizedPath = normalize(requestedPath);
  const fullPath = join(rootPath, normalizedPath);
  const resolvedRoot = normalize(rootPath);

  // Ensure the resolved path starts with the root path
  return fullPath.startsWith(resolvedRoot);
}

export interface StaticServeOptions {
  /** Root directory for static files */
  root: string;
  /** URL prefix (e.g., '/uploads/') */
  prefix: string;
  /** Cache max-age in seconds (default: 1 hour) */
  maxAge?: number;
}

/**
 * Register static file serving routes
 */
export function registerStaticServe(server: FastifyInstance, options: StaticServeOptions): void {
  const { root, prefix, maxAge = 3600 } = options;

  // Ensure prefix ends with /
  const normalizedPrefix = prefix.endsWith('/') ? prefix : `${prefix}/`;

  // Register route for static files
  server.get(`${normalizedPrefix}*`, async (req: FastifyRequest, reply: FastifyReply) => {
    const url = req.url;

    // Extract file path from URL (remove prefix)
    const relativePath = url.slice(normalizedPrefix.length);

    // Decode URI components (handle %20, etc.)
    let decodedPath: string;
    try {
      decodedPath = decodeURIComponent(relativePath);
    } catch {
      return reply.status(400).send({ error: 'Invalid path encoding' });
    }

    // Security: Check for path traversal
    if (!isSafePath(root, decodedPath)) {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    const fullPath = join(root, decodedPath);

    // Check if file exists and get stats
    try {
      const stats = statSync(fullPath);

      if (!stats.isFile()) {
        return await reply.status(404).send({ error: 'Not found' });
      }

      // Set headers
      const mimeType = getMimeType(fullPath);
      void reply.header('Content-Type', mimeType);
      void reply.header('Content-Length', stats.size);
      void reply.header('Cache-Control', `public, max-age=${String(maxAge)}`);
      void reply.header('Last-Modified', stats.mtime.toUTCString());

      // Stream the file
      const stream = createReadStream(fullPath);
      return await reply.send(stream);
    } catch (err) {
      const error = err as NodeJS.ErrnoException;
      if (error.code === 'ENOENT') {
        return reply.status(404).send({ error: 'Not found' });
      }
      server.log.error({ err, path: fullPath }, 'Static file serve error');
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  server.log.info({ root, prefix: normalizedPrefix }, 'Static file serving registered');
}
