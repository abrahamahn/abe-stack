/* eslint-disable @typescript-eslint/unbound-method */
// apps/server/src/infrastructure/data/files/__tests__/fastify-server.test.ts
import { mkdtemp, rm, mkdir, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import Fastify from 'fastify';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { createSignature } from '../signatures';

import type { FilesConfig } from '../fastify-server';
import type { FileSignatureData } from '../helpers';
import type { FastifyInstance } from 'fastify';

// ============================================================================
// Test Setup
// ============================================================================

describe('File Server', () => {
  let server: FastifyInstance;
  let uploadDir: string;
  let config: FilesConfig;
  const secretKey = Buffer.from('test-secret-key-for-file-signatures');

  beforeEach(async () => {
    // Create a temporary directory for test uploads
    uploadDir = await mkdtemp(path.join(tmpdir(), 'file-server-test-'));

    config = {
      uploadDir,
      maxFileSize: 10 * 1024 * 1024, // 10MB
      signatureSecret: secretKey,
    };

    server = Fastify();

    // Register a pass-through content type parser for file uploads
    // This allows the route handler to stream request.raw directly without consuming it
    server.addContentTypeParser('application/octet-stream', (_req, _payload, done) => {
      // Don't consume the body - let the route handler stream it directly
      done(null);
    });

    // Dynamically import to avoid hoisting issues with mocks
    const { registerFileServer } = await import('../fastify-server.js');
    registerFileServer(config, server);

    await server.ready();
  });

  afterEach(async () => {
    await server.close();
    // Clean up temp directory
    await rm(uploadDir, { recursive: true, force: true });
  });

  // ============================================================================
  // Helper Functions
  // ============================================================================

  function createValidSignature(
    method: 'get' | 'put',
    id: string,
    filename: string,
    expirationMs?: number,
  ): { signature: string; expiration: string } {
    const exp = expirationMs ?? Date.now() + 3600000; // 1 hour from now
    const data: FileSignatureData = {
      method,
      id,
      filename,
      expirationMs: exp,
    };
    const signature = createSignature({ data, secretKey });
    return { signature, expiration: String(exp) };
  }

  // ============================================================================
  // Upload Tests (PUT)
  // ============================================================================

  describe('PUT /uploads/:id/:filename', () => {
    test('should upload file with valid signature', async () => {
      const id = 'test-id-123';
      const filename = 'test.txt';
      const { signature, expiration } = createValidSignature('put', id, filename);

      const response = await server.inject({
        method: 'PUT',
        url: `/uploads/${id}/${filename}`,
        query: { signature, expiration },
        payload: 'Hello, World!',
        headers: {
          'content-type': 'application/octet-stream',
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.body).toBe('File uploaded.');

      // Verify file was written
      const filePath = path.join(uploadDir, id, filename);
      const content = await readFile(filePath, 'utf-8');
      expect(content).toBe('Hello, World!');
    });

    test('should reject upload with missing expiration', async () => {
      const id = 'test-id';
      const filename = 'test.txt';

      const response = await server.inject({
        method: 'PUT',
        url: `/uploads/${id}/${filename}`,
        query: { signature: 'some-signature' },
        payload: 'Hello',
        headers: {
          'content-type': 'application/octet-stream',
        },
      });

      expect(response.statusCode).toBe(400);
      expect(response.body).toContain('Missing expiration');
    });

    test('should reject upload with expired signature', async () => {
      const id = 'test-id';
      const filename = 'test.txt';
      const expiredTime = Date.now() - 1000; // 1 second ago
      const { signature } = createValidSignature('put', id, filename, expiredTime);

      const response = await server.inject({
        method: 'PUT',
        url: `/uploads/${id}/${filename}`,
        query: { signature, expiration: String(expiredTime) },
        payload: 'Hello',
        headers: {
          'content-type': 'application/octet-stream',
        },
      });

      expect(response.statusCode).toBe(400);
      expect(response.body).toContain('Expired');
    });

    test('should reject upload with missing signature', async () => {
      const id = 'test-id';
      const filename = 'test.txt';
      const expiration = String(Date.now() + 3600000);

      const response = await server.inject({
        method: 'PUT',
        url: `/uploads/${id}/${filename}`,
        query: { expiration },
        payload: 'Hello',
        headers: {
          'content-type': 'application/octet-stream',
        },
      });

      expect(response.statusCode).toBe(400);
      expect(response.body).toContain('Missing signature');
    });

    test('should reject upload with invalid signature', async () => {
      const id = 'test-id';
      const filename = 'test.txt';
      const expiration = String(Date.now() + 3600000);

      const response = await server.inject({
        method: 'PUT',
        url: `/uploads/${id}/${filename}`,
        query: { signature: 'invalid-signature', expiration },
        payload: 'Hello',
        headers: {
          'content-type': 'application/octet-stream',
        },
      });

      expect(response.statusCode).toBe(400);
      expect(response.body).toContain('Invalid signature');
    });

    test('should reject upload with invalid ID (path traversal attempt)', async () => {
      const id = '../../../etc';
      const filename = 'passwd';
      const { signature, expiration } = createValidSignature('put', id, filename);

      const response = await server.inject({
        method: 'PUT',
        url: `/uploads/${encodeURIComponent(id)}/${filename}`,
        query: { signature, expiration },
        payload: 'malicious content',
        headers: {
          'content-type': 'application/octet-stream',
        },
      });

      expect(response.statusCode).toBe(400);
      expect(response.body).toContain('Invalid file ID');
    });

    test('should reject upload with invalid filename (hidden file)', async () => {
      const id = 'test-id';
      const filename = '.htaccess';
      const { signature, expiration } = createValidSignature('put', id, filename);

      const response = await server.inject({
        method: 'PUT',
        url: `/uploads/${id}/${filename}`,
        query: { signature, expiration },
        payload: 'malicious content',
        headers: {
          'content-type': 'application/octet-stream',
        },
      });

      expect(response.statusCode).toBe(400);
      expect(response.body).toContain('Invalid filename');
    });

    test('should reject upload with filename containing path separator', async () => {
      const id = 'test-id';
      const filename = 'subdir/file.txt';
      const { signature, expiration } = createValidSignature('put', id, filename);

      const response = await server.inject({
        method: 'PUT',
        url: `/uploads/${id}/${encodeURIComponent(filename)}`,
        query: { signature, expiration },
        payload: 'content',
        headers: {
          'content-type': 'application/octet-stream',
        },
      });

      expect(response.statusCode).toBe(400);
      expect(response.body).toContain('Invalid filename');
    });

    test('should create directory if it does not exist', async () => {
      const id = 'new-directory-id';
      const filename = 'newfile.txt';
      const { signature, expiration } = createValidSignature('put', id, filename);

      const response = await server.inject({
        method: 'PUT',
        url: `/uploads/${id}/${filename}`,
        query: { signature, expiration },
        payload: 'New file content',
        headers: {
          'content-type': 'application/octet-stream',
        },
      });

      expect(response.statusCode).toBe(200);

      // Verify directory and file were created
      const filePath = path.join(uploadDir, id, filename);
      const content = await readFile(filePath, 'utf-8');
      expect(content).toBe('New file content');
    });
  });

  // ============================================================================
  // Download Tests (GET)
  // ============================================================================

  describe('GET /uploads/:id/:filename', () => {
    test('should download file with valid signature', async () => {
      const id = 'download-test-id';
      const filename = 'download.txt';
      const fileContent = 'File content for download test';

      // Create the file first
      const fileDir = path.join(uploadDir, id);
      await mkdir(fileDir, { recursive: true });
      await writeFile(path.join(fileDir, filename), fileContent);

      const { signature, expiration } = createValidSignature('get', id, filename);

      const response = await server.inject({
        method: 'GET',
        url: `/uploads/${id}/${filename}`,
        query: { signature, expiration },
      });

      expect(response.statusCode).toBe(200);
      expect(response.body).toBe(fileContent);
      expect(response.headers['content-type']).toBe('text/plain');
    });

    test('should return 404 for non-existent file', async () => {
      const id = 'nonexistent-id';
      const filename = 'nonexistent.txt';
      const { signature, expiration } = createValidSignature('get', id, filename);

      const response = await server.inject({
        method: 'GET',
        url: `/uploads/${id}/${filename}`,
        query: { signature, expiration },
      });

      expect(response.statusCode).toBe(404);
      expect(response.body).toContain('File not found');
    });

    test('should reject download with missing expiration', async () => {
      const id = 'test-id';
      const filename = 'test.txt';

      const response = await server.inject({
        method: 'GET',
        url: `/uploads/${id}/${filename}`,
        query: { signature: 'some-signature' },
      });

      expect(response.statusCode).toBe(400);
      expect(response.body).toContain('Missing expiration');
    });

    test('should reject download with expired signature', async () => {
      const id = 'test-id';
      const filename = 'test.txt';
      const expiredTime = Date.now() - 1000;
      const { signature } = createValidSignature('get', id, filename, expiredTime);

      const response = await server.inject({
        method: 'GET',
        url: `/uploads/${id}/${filename}`,
        query: { signature, expiration: String(expiredTime) },
      });

      expect(response.statusCode).toBe(400);
      expect(response.body).toContain('Expired');
    });

    test('should reject download with invalid signature', async () => {
      const id = 'test-id';
      const filename = 'test.txt';
      const expiration = String(Date.now() + 3600000);

      const response = await server.inject({
        method: 'GET',
        url: `/uploads/${id}/${filename}`,
        query: { signature: 'invalid-signature', expiration },
      });

      expect(response.statusCode).toBe(400);
      expect(response.body).toContain('Invalid signature');
    });

    test('should reject download with invalid ID', async () => {
      const id = '../../../etc';
      const filename = 'passwd';
      const { signature, expiration } = createValidSignature('get', id, filename);

      const response = await server.inject({
        method: 'GET',
        url: `/uploads/${encodeURIComponent(id)}/${filename}`,
        query: { signature, expiration },
      });

      expect(response.statusCode).toBe(400);
      expect(response.body).toContain('Invalid file ID');
    });

    test('should reject download with invalid filename', async () => {
      const id = 'test-id';
      const filename = '.env';
      const { signature, expiration } = createValidSignature('get', id, filename);

      const response = await server.inject({
        method: 'GET',
        url: `/uploads/${id}/${filename}`,
        query: { signature, expiration },
      });

      expect(response.statusCode).toBe(400);
      expect(response.body).toContain('Invalid filename');
    });

    test('should set correct Content-Type header for different file types', async () => {
      const id = 'mime-test-id';

      const testCases = [
        { filename: 'image.jpg', expectedType: 'image/jpeg' },
        { filename: 'image.png', expectedType: 'image/png' },
        { filename: 'document.pdf', expectedType: 'application/pdf' },
        { filename: 'data.json', expectedType: 'application/json' },
        { filename: 'unknown.xyz', expectedType: 'application/octet-stream' },
      ];

      for (const { filename, expectedType } of testCases) {
        const fileDir = path.join(uploadDir, id);
        await mkdir(fileDir, { recursive: true });
        await writeFile(path.join(fileDir, filename), 'test content');

        const { signature, expiration } = createValidSignature('get', id, filename);

        const response = await server.inject({
          method: 'GET',
          url: `/uploads/${id}/${filename}`,
          query: { signature, expiration },
        });

        expect(response.statusCode).toBe(200);
        expect(response.headers['content-type']).toBe(expectedType);
      }
    });

    test('should set Cache-Control header', async () => {
      const id = 'cache-test-id';
      const filename = 'cached.txt';

      const fileDir = path.join(uploadDir, id);
      await mkdir(fileDir, { recursive: true });
      await writeFile(path.join(fileDir, filename), 'cached content');

      const { signature, expiration } = createValidSignature('get', id, filename);

      const response = await server.inject({
        method: 'GET',
        url: `/uploads/${id}/${filename}`,
        query: { signature, expiration },
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['cache-control']).toContain('private');
      expect(response.headers['cache-control']).toContain('max-age=');
    });

    test('should set Content-Length header', async () => {
      const id = 'length-test-id';
      const filename = 'measured.txt';
      const content = 'Measured content here';

      const fileDir = path.join(uploadDir, id);
      await mkdir(fileDir, { recursive: true });
      await writeFile(path.join(fileDir, filename), content);

      const { signature, expiration } = createValidSignature('get', id, filename);

      const response = await server.inject({
        method: 'GET',
        url: `/uploads/${id}/${filename}`,
        query: { signature, expiration },
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-length']).toBe(String(content.length));
    });
  });

  // ============================================================================
  // Signature Mismatch Tests
  // ============================================================================

  describe('signature validation', () => {
    test('should reject GET signature for PUT request', async () => {
      const id = 'test-id';
      const filename = 'test.txt';
      // Create a GET signature but use it for PUT
      const { signature, expiration } = createValidSignature('get', id, filename);

      const response = await server.inject({
        method: 'PUT',
        url: `/uploads/${id}/${filename}`,
        query: { signature, expiration },
        payload: 'content',
        headers: {
          'content-type': 'application/octet-stream',
        },
      });

      expect(response.statusCode).toBe(400);
      expect(response.body).toContain('Invalid signature');
    });

    test('should reject PUT signature for GET request', async () => {
      const id = 'test-id';
      const filename = 'test.txt';

      // Create the file first
      const fileDir = path.join(uploadDir, id);
      await mkdir(fileDir, { recursive: true });
      await writeFile(path.join(fileDir, filename), 'content');

      // Create a PUT signature but use it for GET
      const { signature, expiration } = createValidSignature('put', id, filename);

      const response = await server.inject({
        method: 'GET',
        url: `/uploads/${id}/${filename}`,
        query: { signature, expiration },
      });

      expect(response.statusCode).toBe(400);
      expect(response.body).toContain('Invalid signature');
    });

    test('should reject signature for different file ID', async () => {
      const id1 = 'original-id';
      const id2 = 'different-id';
      const filename = 'test.txt';
      const { signature, expiration } = createValidSignature('put', id1, filename);

      const response = await server.inject({
        method: 'PUT',
        url: `/uploads/${id2}/${filename}`,
        query: { signature, expiration },
        payload: 'content',
        headers: {
          'content-type': 'application/octet-stream',
        },
      });

      expect(response.statusCode).toBe(400);
      expect(response.body).toContain('Invalid signature');
    });

    test('should reject signature for different filename', async () => {
      const id = 'test-id';
      const filename1 = 'original.txt';
      const filename2 = 'different.txt';
      const { signature, expiration } = createValidSignature('put', id, filename1);

      const response = await server.inject({
        method: 'PUT',
        url: `/uploads/${id}/${filename2}`,
        query: { signature, expiration },
        payload: 'content',
        headers: {
          'content-type': 'application/octet-stream',
        },
      });

      expect(response.statusCode).toBe(400);
      expect(response.body).toContain('Invalid signature');
    });
  });

  // ============================================================================
  // Path Validation Tests
  // ============================================================================

  describe('path traversal protection', () => {
    test('should reject ID with dots', async () => {
      const id = 'test..id';
      const filename = 'file.txt';
      const { signature, expiration } = createValidSignature('put', id, filename);

      const response = await server.inject({
        method: 'PUT',
        url: `/uploads/${id}/${filename}`,
        query: { signature, expiration },
        payload: 'content',
        headers: {
          'content-type': 'application/octet-stream',
        },
      });

      expect(response.statusCode).toBe(400);
      expect(response.body).toContain('Invalid file ID');
    });

    test('should allow valid alphanumeric IDs with hyphens', async () => {
      const id = 'valid-id-123-abc';
      const filename = 'file.txt';
      const { signature, expiration } = createValidSignature('put', id, filename);

      const response = await server.inject({
        method: 'PUT',
        url: `/uploads/${id}/${filename}`,
        query: { signature, expiration },
        payload: 'content',
        headers: {
          'content-type': 'application/octet-stream',
        },
      });

      expect(response.statusCode).toBe(200);
    });

    test('should allow valid filenames with extensions', async () => {
      const id = 'test-id';
      const filename = 'my_file-123.pdf';
      const { signature, expiration } = createValidSignature('put', id, filename);

      const response = await server.inject({
        method: 'PUT',
        url: `/uploads/${id}/${filename}`,
        query: { signature, expiration },
        payload: 'content',
        headers: {
          'content-type': 'application/octet-stream',
        },
      });

      expect(response.statusCode).toBe(200);
    });

    test('should reject filename with multiple extensions (potential bypass)', async () => {
      const id = 'test-id';
      const filename = 'file.txt.exe';
      const { signature, expiration } = createValidSignature('put', id, filename);

      const response = await server.inject({
        method: 'PUT',
        url: `/uploads/${id}/${filename}`,
        query: { signature, expiration },
        payload: 'content',
        headers: {
          'content-type': 'application/octet-stream',
        },
      });

      // The regex only allows one extension
      expect(response.statusCode).toBe(400);
      expect(response.body).toContain('Invalid filename');
    });
  });
});
