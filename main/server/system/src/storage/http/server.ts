// main/server/system/src/storage/http/server.ts
/**
 * File Server for Fastify
 *
 * Handles secure file uploads and downloads with signature verification.
 */

import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, open } from 'node:fs/promises';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';

import { HTTP_STATUS, MS_PER_MINUTE, SECONDS_PER_DAY } from '@bslt/shared';

// ============================================================================
// Path Traversal Protection
// ============================================================================

function isValidId(id: string): boolean {
  return /^[a-zA-Z0-9-]+$/.test(id);
}

function isValidFilename(filename: string): boolean {
  if (filename.startsWith('.') || filename.includes('/') || filename.includes('\\')) {
    return false;
  }
  return /^[a-zA-Z0-9_-]+(\.[a-zA-Z0-9]+)?$/.test(filename);
}

/**
 * Resolve and validate a file path is safely contained within the upload directory.
 * Returns the resolved absolute path, or null if the path escapes the root.
 */
function resolveContainedPath(uploadDir: string, ...segments: string[]): string | null {
  const resolvedRoot = path.resolve(uploadDir) + path.sep;
  const resolvedPath = path.resolve(uploadDir, ...segments);
  if (!resolvedPath.startsWith(resolvedRoot)) return null;
  return resolvedPath;
}

const RATE_LIMIT_WINDOW_MS = MS_PER_MINUTE;
const RATE_LIMIT_MAX_REQUESTS = 180;
const uploadRateLimit = new Map<string, { count: number; resetAt: number }>();

function getRequesterId(request: FastifyRequest): string {
  const forwardedFor = request.headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string' && forwardedFor !== '') {
    return forwardedFor.split(',')[0]?.trim() ?? request.ip;
  }
  return request.ip;
}

function isRateLimited(request: FastifyRequest): boolean {
  const requester = getRequesterId(request);
  const now = Date.now();
  const current = uploadRateLimit.get(requester);
  if (current == null || current.resetAt <= now) {
    uploadRateLimit.set(requester, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });
    return false;
  }
  current.count += 1;
  return current.count > RATE_LIMIT_MAX_REQUESTS;
}

import { verifySignature } from './signatures';

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { FileSignatureData } from './helpers';

export interface FilesConfig {
  uploadDir: string;
  maxFileSize: number;
  signatureSecret: Buffer;
}

interface FileRouteParams {
  id: string;
  filename: string;
}

interface FileRouteQuery {
  expiration: string;
  signature: string;
}

type FileRequest = FastifyRequest<{
  Params: FileRouteParams;
  Querystring: FileRouteQuery;
}>;

function verifyFileRequest(
  config: FilesConfig,
  request: FileRequest,
  reply: FastifyReply,
): boolean {
  const { id, filename } = request.params;

  if (typeof request.query.expiration !== 'string') {
    void reply.status(HTTP_STATUS.BAD_REQUEST).send('Missing expiration param.');
    return false;
  }

  const expirationMs = parseInt(request.query.expiration, 10);
  const now = Date.now();
  if (expirationMs < now) {
    void reply.status(HTTP_STATUS.BAD_REQUEST).send('Expired.');
    return false;
  }

  const signature = request.query.signature;
  if (typeof signature !== 'string') {
    void reply.status(HTTP_STATUS.BAD_REQUEST).send('Missing signature param.');
    return false;
  }

  const method = request.method.toLowerCase().trim() as 'get' | 'put';
  const data: FileSignatureData = { method, id, filename, expirationMs };

  const validSignature = verifySignature({
    data,
    signature,
    secretKey: config.signatureSecret,
  });

  if (!validSignature) {
    void reply.status(HTTP_STATUS.BAD_REQUEST).send('Invalid signature.');
    return false;
  }

  return true;
}

function getMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  const mimeTypes: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    mp4: 'video/mp4',
    webm: 'video/webm',
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    ogg: 'audio/ogg',
    pdf: 'application/pdf',
    json: 'application/json',
    txt: 'text/plain',
  };
  return mimeTypes[ext ?? ''] ?? 'application/octet-stream';
}

/** Rate limiting preHandler for file server routes */
function rateLimitHandler(request: FastifyRequest, reply: FastifyReply): void {
  if (isRateLimited(request)) {
    void reply.status(HTTP_STATUS.TOO_MANY_REQUESTS).send('Too many requests.');
  }
}

export function registerFileServer(config: FilesConfig, app: FastifyInstance): void {
  const uploadDir = config.uploadDir;

  // Handle file uploads
  app.put<{ Params: FileRouteParams; Querystring: FileRouteQuery }>(
    '/uploads/:id/:filename',
    {
      bodyLimit: config.maxFileSize,
      preHandler: rateLimitHandler,
    },
    async (request, reply) => {
      if (!verifyFileRequest(config, request, reply)) return;

      const { id, filename } = request.params;

      if (!isValidId(id)) {
        void reply.status(HTTP_STATUS.BAD_REQUEST).send('Invalid file ID.');
        return;
      }
      if (!isValidFilename(filename)) {
        void reply.status(HTTP_STATUS.BAD_REQUEST).send('Invalid filename.');
        return;
      }

      const resolvedDir = resolveContainedPath(uploadDir, id);
      const resolvedFile = resolveContainedPath(uploadDir, id, filename);

      if (resolvedDir === null || resolvedFile === null) {
        void reply.status(HTTP_STATUS.BAD_REQUEST).send('Invalid file path.');
        return;
      }

      try {
        await mkdir(resolvedDir, { recursive: true });

        if (Buffer.isBuffer(request.body)) {
          if (request.body.length > config.maxFileSize) {
            void reply.status(HTTP_STATUS.PAYLOAD_TOO_LARGE).send('File too large.');
            return;
          }
          const { writeFile } = await import('node:fs/promises');
          await writeFile(resolvedFile, request.body, { mode: 0o600 });
        } else if (typeof request.body === 'string') {
          if (Buffer.byteLength(request.body) > config.maxFileSize) {
            void reply.status(HTTP_STATUS.PAYLOAD_TOO_LARGE).send('File too large.');
            return;
          }
          const { writeFile } = await import('node:fs/promises');
          await writeFile(resolvedFile, request.body, { mode: 0o600 });
        } else {
          const writeStream = createWriteStream(resolvedFile, { mode: 0o600 });
          await pipeline(request.raw, writeStream);
        }

        void reply.status(HTTP_STATUS.OK).send('File uploaded.');
      } catch {
        void reply.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send('File upload failed.');
      }
    },
  );

  // Handle file downloads
  app.get<{ Params: FileRouteParams; Querystring: FileRouteQuery }>(
    '/uploads/:id/:filename',
    { preHandler: rateLimitHandler },
    async (request, reply) => {
      if (!verifyFileRequest(config, request, reply)) return;

      const { id, filename } = request.params;

      if (!isValidId(id)) {
        void reply.status(HTTP_STATUS.BAD_REQUEST).send('Invalid file ID.');
        return;
      }
      if (!isValidFilename(filename)) {
        void reply.status(HTTP_STATUS.BAD_REQUEST).send('Invalid filename.');
        return;
      }

      const resolvedFile = resolveContainedPath(uploadDir, id, filename);

      if (resolvedFile === null) {
        void reply.status(HTTP_STATUS.BAD_REQUEST).send('Invalid file path.');
        return;
      }

      const expiration = 60 * SECONDS_PER_DAY;

      try {
        // Use a single file handle for stat and read to avoid TOCTOU race
        const fd = await open(resolvedFile, 'r');
        const fileStat = await fd.stat();

        const SIZE_THRESHOLD = 10 * 1024 * 1024; // 10MB
        if (fileStat.size <= SIZE_THRESHOLD) {
          const fileBuffer = await fd.readFile();
          await fd.close();
          void reply
            .header('Cache-Control', `private, max-age=${String(expiration)}`)
            .header('Content-Type', getMimeType(filename))
            .header('Content-Length', String(fileBuffer.length))
            .send(fileBuffer);
        } else {
          // createReadStream takes ownership of the fd and closes it via autoClose
          const fileStream = createReadStream('', {
            fd: fd.fd,
            autoClose: true,
          });
          void reply
            .header('Cache-Control', `private, max-age=${String(expiration)}`)
            .header('Content-Type', getMimeType(filename))
            .header('Content-Length', String(fileStat.size))
            .send(fileStream);
        }
      } catch {
        void reply.status(HTTP_STATUS.NOT_FOUND).send('File not found.');
      }
    },
  );
}
