/**
 * Environment - Single Source of Truth
 *
 * Usage:
 *   Backend:  import { loadServerEnv, ServerEnv } from '@shared/env'
 *   Frontend: import { clientEnv } from '@shared/env'
 */

// Server (backend only - includes secrets)
export { serverEnvSchema, loadServerEnv } from './server';
export type { ServerEnv } from './server';

// Client (frontend safe - no secrets)
export { clientEnv } from './client';
export type { ClientEnv } from './client';
