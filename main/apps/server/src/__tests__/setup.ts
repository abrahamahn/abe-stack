// apps/server/src/__tests__/setup.ts
/**
 * Vitest Test Setup
 *
 * Configures environment variables required for tests.
 *
 * @module __tests__/setup
 */

import { beforeAll } from 'vitest';

beforeAll(() => {
  // Set required environment variables for tests
  process.env['NODE_ENV'] = 'test';
  process.env['JWT_SECRET'] = 'test-jwt-secret-at-least-32-characters-long-for-security';
  process.env['PUBLIC_API_URL'] = 'http://localhost:3000';
  process.env['DATABASE_URL'] = 'postgresql://test:test@localhost:5432/test';
  process.env['CORS_ORIGIN'] = 'http://localhost:5173';
  process.env['SESSION_SECRET'] = 'test-session-secret-at-least-32-characters';
  process.env['FRONTEND_URL'] = 'http://localhost:5173';
});
