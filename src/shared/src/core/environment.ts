// src/shared/src/core/environment.ts
/**
 * Server Environment Contract
 *
 * Defines the core services that must be present in the server environment.
 * This interface is the foundation of the "Hybrid Context" pattern, allowing
 * for type-safe dependency injection across the application.
 *
 * @remarks
 * This interface is meant to be extended by specific application contexts
 * (e.g., `AppContext` in the server) to include additional domain-specific services.
 */

/**
 * Minimal server environment contract.
 *
 * Uses `unknown` for `config` to avoid circular dependencies with
 * `@abe-stack/server-engine/config`. Extended by `AppContext` in the
 * server to provide the concrete `AppConfig` type.
 */
export interface ServerEnvironment {
  readonly config: unknown;
}
