// backend/server/src/types/fastify.d.ts
import 'fastify';
import type { TokenPayload } from '../infra/security/jwt';
import type { DbClient } from '@db';
import type { StorageProvider } from '@storage';

declare module 'fastify' {
  interface FastifyInstance {
    db: DbClient;
    storage: StorageProvider;
  }

  interface FastifyRequest {
    user?: TokenPayload;
  }
}
