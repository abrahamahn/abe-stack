// src/apps/server/src/http/middleware/static.ts
/**
 * Static File Serving
 *
 * Simple static file server for local storage uploads.
 * Replaces @fastify/static with minimal implementation.
 */

import { createReadStream } from 'node:fs';
import { open } from 'node:fs/promises';
import { extname, isAbsolute, join, normalize, relative, resolve } from 'node:path';

import { HTTP_STATUS } from '@abe-stack/shared';

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

/**
 * Common MIME types for uploaded files
 */
const MIME_TYPES: Record<string, string> = {
  // Images
  ['.jpg']: 'image/jpeg',
  ['.jpeg']: 'image/jpeg',
  ['.png']: 'image/png',
  ['.gif']: 'image/gif',
  ['.webp']: 'image/webp',
  ['.svg']: 'image/svg+xml',
  ['.ico']: 'image/x-icon',

  // Documents
  ['.pdf']: 'application/pdf',
  ['.doc']: 'application/msword',
  ['.docx']: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ['.xls']: 'application/vnd.ms-excel',
  ['.xlsx']: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',

  // Text
  ['.txt']: 'text/plain',
  ['.csv']: 'text/csv',
  ['.json']: 'application/json',
  ['.xml']: 'application/xml',

  // Media
  ['.mp3']: 'audio/mpeg',
  ['.mp4']: 'video/mp4',
  ['.webm']: 'video/webm',

  // Archives
  ['.zip']: 'application/zip',
  ['.gz']: 'application/gzip',
};

/**
 * Get MIME type for a file extension
 *
 * @param filePath - The file path to determine MIME type for
 * @returns The MIME type string, defaulting to 'application/octet-stream'
 */
function getMimeType(filePath: string): string {
  const ext = extname(filePath).toLowerCase();
  return MIME_TYPES[ext] ?? 'application/octet-stream';
}

/**
 * Check if a path is safe (no directory traversal)
 *
 * @param rootPath - The root directory path
 * @param requestedPath - The requested relative path
 * @returns true if the resolved path stays within the root
 */
function isSafePath(rootPath: string, requestedPath: string): boolean {
  const normalizedPath = normalize(requestedPath);
  const fullPath = resolve(rootPath, normalizedPath);
  const resolvedRoot = resolve(rootPath);
  const rel = relative(resolvedRoot, fullPath);
  return rel !== '' && !rel.startsWith('..') && !isAbsolute(rel);
}

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 240;
const staticRateLimit = new Map<string, { count: number; resetAt: number }>();

function getRequesterId(req: FastifyRequest): string {
  const headers = (req as { headers?: Record<string, unknown> }).headers;
  const forwardedFor = headers?.['x-forwarded-for'];
  if (typeof forwardedFor === 'string' && forwardedFor !== '') {
    return forwardedFor.split(',')[0]?.trim() ?? req.ip;
  }
  return typeof req.ip === 'string' && req.ip !== '' ? req.ip : 'unknown';
}

function isRateLimited(requester: string): boolean {
  const now = Date.now();
  const current = staticRateLimit.get(requester);
  if (current == null || current.resetAt <= now) {
    staticRateLimit.set(requester, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });
    return false;
  }
  current.count += 1;
  return current.count > RATE_LIMIT_MAX_REQUESTS;
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
 *
 * @param server - The Fastify instance to register on
 * @param options - Static serve configuration options
 */
export function registerStaticServe(server: FastifyInstance, options: StaticServeOptions): void {
  const { root, prefix, maxAge = 3600 } = options;

  // Ensure prefix ends with /
  const normalizedPrefix = prefix.endsWith('/') ? prefix : `${prefix}/`;

  /** Rate limiting preHandler for static file routes */
  const rateLimitHandler = async (req: FastifyRequest, reply: FastifyReply): Promise<void> => {
    if (isRateLimited(getRequesterId(req))) {
      void reply.status(HTTP_STATUS.TOO_MANY_REQUESTS).send({ error: 'Too many requests' });
    }
  };

  // Register route for static files
  server.get(
    `${normalizedPrefix}*`,
    {
      preHandler: (req, reply, done) => {
        rateLimitHandler(req, reply)
          .then(() => {
            done();
          })
          .catch(done);
      },
    },
    async (req: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const url = req.url;

      // Extract file path from URL (remove prefix)
      const relativePath = url.slice(normalizedPrefix.length);

      // Decode URI components (handle %20, etc.)
      let decodedPath: string;
      try {
        decodedPath = decodeURIComponent(relativePath);
      } catch {
        return reply.status(HTTP_STATUS.BAD_REQUEST).send({ error: 'Invalid path encoding' });
      }

      // Security: Check for path traversal
      if (!isSafePath(root, decodedPath)) {
        return reply.status(HTTP_STATUS.FORBIDDEN).send({ error: 'Forbidden' });
      }

      const fullPath = join(root, decodedPath);

      // Use a single file handle for stat + read to avoid TOCTOU race
      try {
        const fd = await open(fullPath, 'r');
        try {
          const stats = await fd.stat();

          if (!stats.isFile()) {
            await fd.close();
            return await reply.status(HTTP_STATUS.NOT_FOUND).send({ error: 'Not found' });
          }

          // Set headers
          const mimeType = getMimeType(fullPath);
          void reply.header('Content-Type', mimeType);
          void reply.header('Content-Length', stats.size);
          void reply.header('Cache-Control', `public, max-age=${String(maxAge)}`);
          void reply.header('Last-Modified', stats.mtime.toUTCString());

          // Stream the file using the fd (createReadStream takes ownership via autoClose)
          const stream = createReadStream('', { fd: fd.fd, autoClose: true });
          return await reply.send(stream);
        } catch (innerErr) {
          await fd.close();
          throw innerErr;
        }
      } catch (err) {
        const error = err as NodeJS.ErrnoException;
        if (error.code === 'ENOENT') {
          return reply.status(HTTP_STATUS.NOT_FOUND).send({ error: 'Not found' });
        }
        server.log.error({ err, path: fullPath }, 'Static file serve error');
        return reply
          .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
          .send({ error: 'Internal server error' });
      }
    },
  );

  server.log.info({ root, prefix: normalizedPrefix }, 'Static file serving registered');
}
