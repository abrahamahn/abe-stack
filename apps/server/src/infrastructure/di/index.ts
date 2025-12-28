import "reflect-metadata";
import { createContainer } from "./container";
export * from "./types";

// Export core DI functionality
export { createContainer };

// Create and export a singleton container instance
export const container = createContainer();

/**
 * Helper to get a service from the singleton container
 * @param serviceIdentifier The service identifier
 * @returns The requested service
 */
export function inject<T>(serviceIdentifier: symbol): T {
  return container.get<T>(serviceIdentifier);
}
