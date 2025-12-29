import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';

import type { LocalStorageConfig, StorageProvider, UploadParams } from './types';

export class LocalStorageProvider implements StorageProvider {
  constructor(private readonly config: LocalStorageConfig) {}

  private resolveKey(key: string): string {
    // Prevent path traversal
    const safeKey = key.replace(/^\//, '').replace(/\.\./g, '');
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
