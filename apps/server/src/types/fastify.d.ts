// apps/server/src/types/fastify.d.ts
import 'fastify';
import type { TokenPayload } from '../lib/jwt';
import type { DbClient } from '@abe-stack/db';

declare module 'fastify' {
  interface FastifyInstance {
    db: DbClient; // Keep for health check route
  }

  interface FastifyRequest {
    user?: TokenPayload;
  }
}
