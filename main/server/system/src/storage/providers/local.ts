// main/server/system/src/storage/providers/local.ts
import { randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, open, readFile, unlink } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { StorageNotFoundError, toStorageError } from '../errors';
import { normalizeStorageKey } from '../signing';

import type { LocalStorageConfig, StorageProvider } from '../types';
import type { ReadableStreamLike } from '@bslt/shared';

export class LocalStorageProvider implements StorageProvider {
  constructor(private readonly config: LocalStorageConfig) {}

  private resolveKey(key: string): string {
    const safeKey = normalizeStorageKey(key, true);
    return join(this.config.rootPath, safeKey);
  }

  async upload(
    key: string,
    data: Buffer | Uint8Array | string,
    _contentType: string,
  ): Promise<string> {
    const finalKey = key !== '' ? key : randomUUID();
    const filePath = this.resolveKey(finalKey);
    await mkdir(dirname(filePath), { recursive: true });
    // Use open with write+create+truncate flags to set permissions atomically
    const fd = await open(filePath, 'w', 0o600);
    try {
      await fd.writeFile(data);
    } finally {
      await fd.close();
    }
    return finalKey;
  }

  async download(key: string): Promise<Buffer> {
    const filePath = this.resolveKey(key);
    try {
      return await readFile(filePath);
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        'code' in error &&
        (error as NodeJS.ErrnoException).code === 'ENOENT'
      ) {
        throw new StorageNotFoundError(key, error);
      }
      throw toStorageError(error, `Failed to read storage object: ${key}`);
    }
  }

  downloadStream(key: string): Promise<ReadableStreamLike<Uint8Array>> {
    const filePath = this.resolveKey(key);
    const nodeStream = createReadStream(filePath);

    return Promise.resolve({
      getReader: (): {
        read(): Promise<{ done: boolean; value?: Uint8Array }>;
        releaseLock(): void;
      } => {
        let streamEnded = false;
        return {
          read: async (): Promise<{ done: boolean; value?: Uint8Array }> => {
            if (streamEnded) {
              return { done: true };
            }
            return new Promise((resolve, reject) => {
              nodeStream.once('data', (chunk: Buffer) => {
                resolve({ done: false, value: new Uint8Array(chunk) });
              });
              nodeStream.once('end', () => {
                streamEnded = true;
                resolve({ done: true });
              });
              nodeStream.once('error', reject);
            });
          },
          releaseLock: (): void => {
            nodeStream.destroy();
          },
        };
      },
    });
  }

  async delete(key: string): Promise<void> {
    const filePath = this.resolveKey(key);
    try {
      await unlink(filePath);
    } catch (error: unknown) {
      if (
        error != null &&
        typeof error === 'object' &&
        'code' in error &&
        (error as NodeJS.ErrnoException).code !== 'ENOENT'
      ) {
        throw toStorageError(error, 'Failed to delete storage object');
      }
    }
  }

  getSignedUrl(key: string): Promise<string> {
    if (this.config.publicBaseUrl != null && this.config.publicBaseUrl !== '') {
      return Promise.resolve(
        `${this.config.publicBaseUrl.replace(/\/+$/, '')}/${key.replace(/^\//, '')}`,
      );
    }
    return Promise.resolve(`file://${this.resolveKey(key)}`);
  }
}
