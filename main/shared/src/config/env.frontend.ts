// main/shared/src/config/env.frontend.ts
/**
 * Frontend Environment Configuration
 *
 * Frontend env interface and validation schema.
 *
 * @module config/env.frontend
 */

import { createSchema, parseObject, parseOptional, parseString } from '../primitives/schema';

import type { Schema } from '../primitives/schema';

// ============================================================================
// Env Interface
// ============================================================================

/** Frontend environment variables */
export interface FrontendEnv {
  VITE_API_URL?: string | undefined;
  VITE_APP_NAME?: string | undefined;
}

// ============================================================================
// Env Schema
// ============================================================================

export const FrontendEnvSchema: Schema<FrontendEnv> = createSchema<FrontendEnv>((data: unknown) => {
  const obj = parseObject(data, 'FrontendEnv');
  return {
    VITE_API_URL: parseOptional(obj['VITE_API_URL'], (v: unknown) =>
      parseString(v, 'VITE_API_URL', { url: true }),
    ),
    VITE_APP_NAME: parseOptional(obj['VITE_APP_NAME'], (v: unknown) =>
      parseString(v, 'VITE_APP_NAME'),
    ),
  };
});
