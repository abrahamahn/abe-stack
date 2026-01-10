import 'fastify';
import type { TokenPayload } from '../lib/jwt';
import type { DbClient } from '@db/client';
import type { StorageProvider } from '@storage/types';

declare module 'fastify' {
  interface FastifyInstance {
    db: DbClient;
    storage: StorageProvider;
  }

  interface FastifyRequest {
    user?: TokenPayload;
  }
}
