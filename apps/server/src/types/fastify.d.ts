import 'fastify';
import type { TokenPayload } from '../lib/jwt';
import type { DbClient } from '@abe-stack/db';

declare module 'fastify' {
  interface FastifyInstance {
    db: DbClient;
  }

  interface FastifyRequest {
    user?: TokenPayload;
  }
}
