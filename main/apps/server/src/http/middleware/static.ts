// main/apps/server/src/http/middleware/static.ts
/**
 * Static File Serving
 *
 * Simple static file server for local storage uploads.
 * Replaces @fastify/static with minimal implementation.
 */

import { createReadStream } from 'node:fs';
import { open } from 'node:fs/promises';
import { join } from 'node:path';

import { isSafePath } from '@bslt/server-system';
import { createRateLimiter, getRequesterId, HTTP_STATUS } from '@bslt/shared';
import { getMimeType } from '@bslt/shared/systems/media';

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 240;
const staticRateLimit = createRateLimiter(RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX_REQUESTS);

function isRateLimited(requester: string): boolean {
  return !staticRateLimit(requester).allowed;
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
