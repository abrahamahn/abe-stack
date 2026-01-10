/**
 * API Router - Auto-discovery entry point
 *
 * This file:
 * 1. Merges all route contracts into one
 * 2. Creates handlers for each route
 * 3. Registers with Fastify
 * 4. Exports contract type for frontend type safety
 */
import { initContract } from '@ts-rest/core';
import { initServer } from '@ts-rest/fastify';

import { authContract, createAuthRouter } from './auth/route';
import { usersContract, createUsersRouter } from './users/route';

import type { FastifyInstance } from 'fastify';

// ============================================
// Combined Contract (auto-merged from routes)
// ============================================

const c = initContract();

export const apiContract = c.router({
  auth: authContract,
  users: usersContract,
});

// Export contract type for frontend consumption
export type ApiContract = typeof apiContract;

// ============================================
// Re-export all schemas and types
// ============================================

export * from './_lib/schemas';
export * from './_lib/env';

// ============================================
// Route Registration
// ============================================

export function registerRoutes(app: FastifyInstance): void {
  const s = initServer();

  const router = s.router(apiContract, {
    auth: createAuthRouter(app),
    users: createUsersRouter(app),
  });

  s.registerRouter(apiContract, router, app);
}
