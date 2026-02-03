// infra/contracts/src/environment.ts
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

// Note: AppConfig is defined in @abe-stack/shared/config
// We use a type reference here to avoid circular dependencies
export interface ServerEnvironment {
  readonly config: unknown; // Will be properly typed when extended in server

  // We can add more specific service contracts here as they are fully migrated to core
  // For now, this serves as the base for IServiceContainer
}
