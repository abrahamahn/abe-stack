// apps/server/src/types/fastify.d.ts
import 'fastify';
import type { TokenPayload } from '../lib/jwt';
import type { DbClient } from '@abe-stack/db';
import type { StorageProvider } from '@abe-stack/storage';

declare module 'fastify' {
  interface FastifyInstance {
    db: DbClient;
    storage: StorageProvider;
  }

  interface FastifyRequest {
    user?: TokenPayload;
  }
}
