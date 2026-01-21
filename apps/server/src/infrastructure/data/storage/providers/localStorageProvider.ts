// apps/server/src/infrastructure/data/storage/providers/localStorageProvider.ts
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { normalizeStorageKey } from '@storage/utils';

import type { LocalStorageConfig, StorageProvider, UploadParams } from '@storage/types';

export class LocalStorageProvider implements StorageProvider {
  constructor(private readonly config: LocalStorageConfig) {}

  private resolveKey(key: string): string {
    // Prevent path traversal by stripping leading slashes and parent refs
    const safeKey = normalizeStorageKey(key, true);
    return join(this.config.rootPath, safeKey);
  }

  async upload(params: UploadParams): Promise<{ key: string }> {
    const key = params.key || randomUUID();
    const filePath = this.resolveKey(key);
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, params.body);
    return { key };
  }

  getSignedUrl(key: string): Promise<string> {
    if (this.config.publicBaseUrl) {
      return Promise.resolve(
        `${this.config.publicBaseUrl.replace(/\/+$/, '')}/${key.replace(/^\//, '')}`,
      );
    }
    return Promise.resolve(`file://${this.resolveKey(key)}`);
  }
}
