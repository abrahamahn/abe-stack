// main/server/system/src/routing/api.versioning.types.ts
/**
 * API Versioning Types
 *
 * Type definitions and constants for the API versioning middleware.
 * Kept in a dedicated file so versioning logic and consumers can both
 * import from here without circular dependencies.
 *
 * @module routing/api-versioning-types
 */

/**
 * Supported API version numbers.
 * Extend this union as new versions are introduced.
 */
export type ApiVersion = 1;

/**
 * The current (default) API version served when no version is specified.
 */
export const CURRENT_API_VERSION: ApiVersion = 1;

/**
 * All API versions the server currently supports.
 * Ordered ascending — the last element is always the latest.
 */
export const SUPPORTED_API_VERSIONS: readonly ApiVersion[] = [1] as const;

/**
 * Source from which the API version was resolved.
 * Useful for logging and debugging version negotiation.
 */
export type ApiVersionSource = 'url' | 'accept-header' | 'custom-header' | 'default';

/**
 * Result of extracting / negotiating the API version from a request.
 */
export interface ApiVersionInfo {
  /** The resolved API version number */
  version: ApiVersion;
  /** How the version was determined */
  source: ApiVersionSource;
}
