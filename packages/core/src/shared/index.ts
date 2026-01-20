// packages/core/src/shared/index.ts
/**
 * Shared Utilities
 *
 * Token storage and general utilities used across the application.
 */

// Token storage
export { addAuthHeader, createTokenStore, tokenStore } from './token';
export type { TokenStore } from './token';

// General utilities
export { randomId } from './utils';
