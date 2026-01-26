// apps/server/src/infrastructure/data/storage/providers/localStorageProvider.ts
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { normalizeStorageKey } from '@storage/utils';

import type { LocalStorageConfig, StorageProvider } from '@storage/types';

export class LocalStorageProvider implements StorageProvider {
  constructor(private readonly config: LocalStorageConfig) {}

  private resolveKey(key: string): string {
    // Prevent path traversal by stripping leading slashes and parent refs
    const safeKey = normalizeStorageKey(key, true);
    return join(this.config.rootPath, safeKey);
  }

  async upload(
    key: string,
    data: Buffer | Uint8Array | string,
    _contentType: string,
  ): Promise<string> {
    const finalKey = key || randomUUID();
    const filePath = this.resolveKey(finalKey);
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, data);
    return finalKey;
  }

  async download(key: string): Promise<Buffer> {
    const filePath = this.resolveKey(key);
    return readFile(filePath);
  }

  async delete(key: string): Promise<void> {
    const filePath = this.resolveKey(key);
    try {
      await unlink(filePath);
    } catch (error: unknown) {
      if (error != null && typeof error === 'object' && 'code' in error && error.code !== 'ENOENT') {
        throw error;
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
