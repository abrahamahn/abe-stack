// src/tools/verify-engine.ts
/**
 * Engine Smoke Test
 *
 * Run with:
 *   npx tsx src/tools/verify-engine.ts
 *
 * This script validates that engine adapters can initialize and
 * perform basic I/O in a real runtime environment.
 */

import {
  MailerClient,
  createCacheFromEnv,
  createMemoryQueueStore,
  createQueueServer,
  createStorage,
  initEnv,
  loadServerEnv,
  loadStorageConfig,
  sign,
  validateStorage,
  verify,
} from '@abe-stack/server-engine';

function logInfo(message: string): void {
  process.stdout.write(`${message}\n`);
}

function logError(message: string, error: unknown): void {
  const details = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}: ${details}\n`);
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function main(): Promise<void> {
  logInfo('Starting engine smoke test...');

  // Load env and validate
  initEnv();
  const env = loadServerEnv();

  // 1. Crypto (self-contained JWT)
  try {
    const token = sign({ id: 'smoke-test' }, env.JWT_SECRET, { expiresIn: '5m' });
    const payload = verify(token, env.JWT_SECRET);
    if (payload['id'] !== 'smoke-test') {
      throw new Error('JWT payload mismatch');
    }
    logInfo('Security: JWT sign/verify OK');
  } catch (error) {
    logError('Security: JWT failed', error);
  }

  // 2. Cache (memory)
  try {
    const cache = createCacheFromEnv();
    await cache.set('smoke_test_key', 'working', { ttl: 10_000 });
    const value = await cache.get<string>('smoke_test_key');
    if (value !== 'working') {
      throw new Error('Cache value mismatch');
    }
    logInfo(`Cache: ${cache.name} read/write OK`);
  } catch (error) {
    logError('Cache: failed', error);
  }

  // 3. Storage (local or S3)
  try {
    const storageConfig = loadStorageConfig();
    validateStorage(storageConfig);
    const storage = createStorage(storageConfig);
    const content = Buffer.from('Smoke Test Content');
    const key = await storage.upload('smoke-test.txt', content, 'text/plain');
    const downloaded = await storage.download(key);
    if (!downloaded.equals(content)) {
      throw new Error('Storage download mismatch');
    }
    await storage.delete(key);
    logInfo(`Storage: ${storageConfig.provider} upload/download/delete OK`);
  } catch (error) {
    logError('Storage: failed', error);
  }

  // 4. Mailer (console or SMTP)
  try {
    const mailer = new MailerClient(env);
    await mailer.send({
      to: 'test@example.com',
      subject: 'Engine Smoke Test',
      html: '<p>If you see this, mailer works.</p>',
    });
    logInfo('Mailer: send attempted (check console/inbox)');
  } catch (error) {
    logError('Mailer: failed', error);
  }

  // 5. Queue (in-memory)
  try {
    const store = createMemoryQueueStore();
    const queue = createQueueServer({
      store,
      handlers: {
        'smoke-test': async (): Promise<void> => undefined,
      },
      config: { pollIntervalMs: 50 },
    });

    queue.start();
    await queue.enqueue('smoke-test', { ok: true });

    let attempts = 0;
    while (attempts < 40) {
      const stats = await queue.getStats();
      if (stats.pending === 0 && stats.failed === 0) break;
      await sleep(50);
      attempts += 1;
    }

    const stats = await queue.getStats();
    if (stats.pending !== 0 || stats.failed !== 0) {
      throw new Error(`Queue did not drain (pending=${stats.pending}, failed=${stats.failed})`);
    }

    await queue.stop();
    logInfo('Queue: enqueue/process OK');
  } catch (error) {
    logError('Queue: failed', error);
  }

  logInfo('Engine smoke test complete.');
}

main().catch((error) => {
  logError('Smoke test crashed', error);
  process.exit(1);
});
