// main/client/api/src/api/types.ts
/**
 * API Client Types
 *
 * Local types for the API client module.
 * Shared types (AuthResponse, User, etc.) should be imported
 * from `@bslt/shared` directly by consumers.
 *
 * @module types
 */

/**
 * Configuration options for the API client.
 *
 * @param baseUrl - Host origin without /api suffix
 * @param fetchImpl - Custom fetch implementation for SSR or testing
 */
export interface ApiClientOptions {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}
