# Engine Verification Guide

You are asking the right question. You cannot build a skyscraper (Business Logic) if the steel beams (Engine) are not bolted together correctly.

`server-engine` is a collection of infrastructure adapters (Redis, S3, SMTP, ffmpeg, etc.). “Verifying the engine” means proving your code can **talk to the outside world** reliably before you build more business logic on top.

This guide expands the 3-level verification strategy: **unit sanity**, **runtime smoke**, and **server wiring**.

---

## Level 1: Unit Pass (Static Verification)

**Goal:** Ensure the adapter logic handles errors, edge cases, and contract behavior in isolation.

You already have strong test coverage for engine modules. Before doing anything else, make sure the engine tests pass in isolation.

**Action:**

```bash
# Run tests only for the engine package
npx vitest run src/server/engine
```

**Stop criteria:**

- If this fails, do not proceed. Fix unit failures first.

**Why this matters:**

- Unit tests are the fastest way to validate contracts and error handling.
- It catches broken interfaces before you add runtime dependencies.

---

## Level 2: Smoke Test Script (Runtime Verification)

**Goal:** Prove adapters can connect to real or mocked infrastructure in a live environment.

Unit tests often mock dependencies. A smoke test proves that config, factory wiring, and network I/O actually work.

Create this script and run it on your local environment:

**File:** `src/tools/verify-engine.ts`

```ts
/**
 * src/tools/verify-engine.ts
 * Run with: npx tsx src/tools/verify-engine.ts
 */
import { CacheFactory } from '../server/engine/src/cache/factory';
import { StorageFactory } from '../server/engine/src/storage/factory';
import { MailerFactory } from '../server/engine/src/mailer/client'; // Check export
import { QueueFactory } from '../server/engine/src/queue/client'; // Check export
import { CryptoService } from '../server/engine/src/security/crypto';
import { Logger } from '../server/engine/src/logger';

const logger = new Logger('EngineCheck');

async function main() {
  logger.info('Starting engine smoke test...');

  // 1. Crypto (self-contained)
  try {
    const token = await CryptoService.generateToken({ id: 'test' });
    const verified = await CryptoService.verifyToken(token);
    if (!verified) throw new Error('Token verification failed');
    logger.info('Security: Crypto/JWT working');
  } catch (e) {
    logger.error('Security: Failed', e);
  }

  // 2. Cache (Redis/Memory)
  try {
    const cache = CacheFactory.getInstance();
    await cache.set('smoke_test_key', 'working', 10);
    const val = await cache.get('smoke_test_key');
    if (val !== 'working') throw new Error('Cache value mismatch');
    logger.info(`Cache: ${cache.getProviderName()} read/write success`);
  } catch (e) {
    logger.error('Cache: Connection failed', e);
  }

  // 3. Storage (S3/Local)
  try {
    const storage = StorageFactory.getInstance();
    const testFile = Buffer.from('Smoke Test Content');
    await storage.upload('smoke-test.txt', testFile, 'text/plain');
    const exists = await storage.exists('smoke-test.txt');
    if (!exists) throw new Error('File not found after upload');
    await storage.delete('smoke-test.txt');
    logger.info('Storage: Upload/Delete success');
  } catch (e) {
    logger.error('Storage: Failed', e);
  }

  // 4. Mailer (Console/SMTP)
  try {
    const mailer = MailerFactory.getInstance();
    await mailer.send({
      to: 'test@example.com',
      subject: 'Engine Smoke Test',
      html: '<p>If you see this, mailer works.</p>',
    });
    logger.info('Mailer: Send attempted (check console/inbox)');
  } catch (e) {
    logger.error('Mailer: Failed', e);
  }

  // 5. Queue (Memory/Redis)
  try {
    const queue = QueueFactory.getInstance();
    await queue.enqueue('smoke-test', { ok: true });
    logger.info('Queue: Enqueue success');
  } catch (e) {
    logger.error('Queue: Failed', e);
  }

  logger.info('Engine smoke test complete.');
}

main().catch(console.error);
```

**What this proves:**

- Factories resolve correctly (`getInstance()` works).
- Env/config wiring is valid.
- Adapters can actually perform I/O.

**Stop criteria:**

- Any failure means a real dependency is misconfigured or unreachable. Fix before continuing.

---

## Level 3: Wiring Check (Server Integration)

**Goal:** Prove the server app actually registers and uses the engine.

You verified the engine works. Now ensure the server uses it. The simplest proof is a health endpoint that uses real adapters.

### Step 1: Add or confirm the health route

Example route (adapt to your actual route file):

```ts
import { HealthMonitor } from '@abe-stack/server-engine/system';

fastify.get('/health', async (request, reply) => {
  const status = await HealthMonitor.checkAll([
    () => CacheFactory.getInstance().healthCheck(),
    () => Database.healthCheck(), // if you have a DB adapter
  ]);

  return status.healthy ? reply.send(status) : reply.code(503).send(status);
});
```

### Step 2: Verify at runtime

```bash
pnpm dev
curl http://localhost:8080/health
```

**Expected outcomes:**

- JSON response: wiring is correct.
- 404: route not registered.
- Timeout or 503: dependency misconfigured or unreachable.

---

## Summary Checklist

1. [ ] Run engine unit tests: `npx vitest run src/server/engine`
2. [ ] Run smoke test: `npx tsx src/tools/verify-engine.ts`
3. [ ] Verify `/health` response via server

Once these pass, your engine is solid. Then proceed to business logic verification.
