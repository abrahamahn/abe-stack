// main/apps/server/src/http/middleware/multipart.ts
/**
 * Multipart Form Parser
 *
 * Registers a lightweight multipart/form-data parser that extracts the first
 * uploaded file into a normalized body shape expected by core handlers:
 * { buffer, mimetype, filename, originalName, size }.
 */

import { parseMultipartFile, type ParsedMultipartFile } from '@abe-stack/shared';

import type { FastifyInstance, FastifyRequest } from 'fastify';

export { parseMultipartFile, type ParsedMultipartFile };

export function registerMultipartFormParser(server: FastifyInstance): void {
  server.addContentTypeParser(
    /^multipart\/form-data/i,
    { parseAs: 'buffer' },
    (
      request: FastifyRequest,
      body: Buffer,
      done: (error: Error | null, body?: ParsedMultipartFile | Record<string, never>) => void,
    ) => {
      try {
        const contentType = request.headers['content-type'];
        const value =
          typeof contentType === 'string'
            ? contentType
            : Array.isArray(contentType) && typeof contentType[0] === 'string'
              ? contentType[0]
              : undefined;
        if (value === undefined || value === '') {
          const err = new Error('Missing Content-Type header');
          (err as Error & { statusCode: number }).statusCode = 400;
          done(err);
          return;
        }

        const file = parseMultipartFile(body, value);
        if (file === null) {
          done(null, {});
          return;
        }

        done(null, file);
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Invalid multipart payload');
        (err as Error & { statusCode: number }).statusCode = 400;
        done(err);
      }
    },
  );
}
