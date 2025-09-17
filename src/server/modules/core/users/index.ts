/**
 * User module exports
 */

// Re-export models with namespaces to avoid conflicts

// Re-export controllers and DTOs with namespaces
import * as UserControllers from "./controllers";
import * as UserDTOs from "./dtos";
import * as UserModelClasses from "./models";

// Export the namespaces
export { UserModelClasses, UserControllers, UserDTOs };

// Export repositories
export * from "./repositories";

// Export services
export * from "./services";

// Export processors
export * from "./processors";

/**
 * User Management
 *
 * This module provides user account management, profiles,
 * preferences, and connections between users.
 */
