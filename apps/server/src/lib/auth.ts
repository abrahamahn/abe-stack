// apps/server/src/lib/auth.ts
// Re-export from modules/auth for backwards compatibility
// New code should import from '../modules/auth' directly
export {
  extractTokenPayload,
  requireAuth,
  requireRole,
  isAdmin,
  authGuard,
} from '../modules/auth/middleware';
