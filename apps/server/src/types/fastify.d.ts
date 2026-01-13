// apps/server/src/types/fastify.d.ts
import 'fastify';

import type { DbClient } from '../infra/database';
import type { TokenPayload } from '../modules/auth/utils/jwt';

declare module 'fastify' {
  interface FastifyInstance {
    db: DbClient; // Keep for health check route
  }

  interface FastifyRequest {
    user?: TokenPayload;
  }
}
