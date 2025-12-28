import { authRoutes } from './auth';
import { userRoutes } from './users';

import type { FastifyInstance } from 'fastify';

export function registerRoutes(app: FastifyInstance): void {
  authRoutes(app);
  userRoutes(app);
}
