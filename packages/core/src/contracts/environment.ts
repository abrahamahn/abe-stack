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

import type { AppConfig } from '../config';
// Note: We use generic types for DB/Repo interfaces to avoid
// hard coupling to specific implementations in the core contract if possible,
// but for practical purposes, we might need to import from a shared location
// or define base interfaces here.
// For now, we will define the shape of the environment.

export interface ServerEnvironment {
  readonly config: AppConfig;

  // We can add more specific service contracts here as they are fully migrated to core
  // For now, this serves as the base for IServiceContainer
}
