// apps/server/src/modules/users/index.ts
/**
 * Users Module
 *
 * User profile and account management functionality.
 */

// Routes (for auto-registration)
export { userRoutes } from './routes';

// Handlers
export { handleMe } from './handlers';

// Service (business logic)
export { getUserById, type User } from './service';
