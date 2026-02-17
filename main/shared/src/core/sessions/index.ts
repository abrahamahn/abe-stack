// main/shared/src/core/sessions/index.ts
/**
 * @file Sessions Barrel (backward compatibility)
 * @description Re-exports from auth/auth-sessions for backward compatibility.
 * @module Core/Sessions
 */

export { getSessionAge, isSessionActive, isSessionRevoked } from '../auth/auth-sessions.logic';

export {
  createUserSessionSchema,
  updateUserSessionSchema,
  userSessionSchema,
  type CreateUserSession,
  type UpdateUserSession,
  type UserSession,
} from '../auth/auth-sessions.schemas';
