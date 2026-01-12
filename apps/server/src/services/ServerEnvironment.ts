// apps/server/src/services/ServerEnvironment.ts
/**
 * ServerEnvironment - Context Object Pattern
 *
 * Single object containing all server dependencies, passed explicitly
 * through the request chain. This pattern is standard in GraphQL (Apollo)
 * and Go backend services.
 *
 * Benefits:
 * - Explicit dependencies (handler signature shows what it needs)
 * - Easy to test (just pass a mock env object)
 * - Framework agnostic (handlers don't depend on Fastify)
 * - Single source of truth for all services
 */

import type { EmailService } from './email';
import type { DbClient } from '@abe-stack/db';
import type { ServerEnv } from '@abe-stack/shared';
import type { StorageProvider } from '@abe-stack/storage';
import type { FastifyBaseLogger } from 'fastify';

export type ServerEnvironment = {
  config: ServerEnv;
  db: DbClient;
  storage: StorageProvider;
  email: EmailService;
  log: FastifyBaseLogger;
};
