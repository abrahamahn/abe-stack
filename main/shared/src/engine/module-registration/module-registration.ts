// main/shared/src/engine/module-registration/module-registration.ts
/**
 * Module Registration Contract
 *
 * Standard patterns for feature module registration in the server composition root.
 * Each package that needs HTTP routes exports a plugin function following this pattern.
 *
 * @example
 * ```typescript
 * export function registerAuthModule(
 *   app: FastifyInstance,
 *   deps: AuthModuleDeps,
 * ): void { ... }
 * ```
 */

// ============================================================================
// Module Registration Options
// ============================================================================

/**
 * Standard options for module registration.
 * Packages can extend this for module-specific configuration.
 *
 * @param prefix - URL prefix for all routes in this module (e.g., '/api/auth')
 */
export interface ModuleRegistrationOptions {
  /** URL prefix for all routes in this module */
  readonly prefix?: string;
}

// ============================================================================
// Module Deps Type Helper
// ============================================================================

/**
 * Type helper for module dependency injection.
 * Wraps a dependency interface in Readonly to enforce immutability.
 * Each package defines its own `XxxModuleDeps` interface using this helper.
 *
 * @typeParam T - The dependency interface shape
 *
 * @example
 * ```typescript
 * interface AuthDeps {
 *   config: AuthConfig;
 *   db: DbClient;
 *   email: EmailService;
 * }
 * type AuthModuleDeps = ModuleDeps<AuthDeps>;
 * ```
 */
export type ModuleDeps<T> = Readonly<T>;
