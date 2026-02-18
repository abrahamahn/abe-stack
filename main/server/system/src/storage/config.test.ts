// main/server/system/src/storage/config.test.ts
import { describe, expect, it } from 'vitest';

import { loadStorageConfig, validateStorage } from './config';

function withEnv(vars: Record<string, string | undefined>, fn: () => void): void {
  const prev = { ...process.env };
  try {
    for (const [k, v] of Object.entries(vars)) {
      if (v === undefined) {
        Reflect.deleteProperty(process.env, k);
      } else {
        process.env[k] = v;
      }
    }
    fn();
  } finally {
    process.env = prev;
  }
}

describe('storage/config', () => {
  it('defaults to local provider with defaults', () => {
    withEnv({ STORAGE_PROVIDER: undefined }, () => {
      const cfg = loadStorageConfig();
      expect(cfg.provider).toBe('local');
      expect((cfg as any).rootPath).toBeTruthy();
    });
  });

  it('loads s3 config when STORAGE_PROVIDER=s3', () => {
    withEnv(
      {
        STORAGE_PROVIDER: 's3',
        S3_BUCKET: 'b',
        S3_REGION: 'us-east-2',
        S3_ACCESS_KEY_ID: 'ak',
        S3_SECRET_ACCESS_KEY: 'sk',
        S3_ENDPOINT: 'http://localhost:9000',
        S3_FORCE_PATH_STYLE: 'true',
      },
      () => {
        const cfg = loadStorageConfig();
        expect(cfg.provider).toBe('s3');
        expect((cfg as any).bucket).toBe('b');
        expect((cfg as any).endpoint).toBe('http://localhost:9000');
        expect((cfg as any).forcePathStyle).toBe(true);
      },
    );
  });

  it('validateStorage throws on missing required fields', () => {
    expect(() => {
      validateStorage({ provider: 's3', bucket: '', accessKeyId: '', secretAccessKey: '' } as any);
    }).toThrow(/S3_BUCKET|S3_ACCESS_KEY_ID|S3_SECRET_ACCESS_KEY/);
    expect(() => {
      validateStorage({ provider: 'local', rootPath: '' } as any);
    }).toThrow(/STORAGE_ROOT_PATH/);
  });
});
