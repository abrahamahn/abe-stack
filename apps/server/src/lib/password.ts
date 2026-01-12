// apps/server/src/lib/password.ts
// Re-export from modules/auth for backwards compatibility
// New code should import from '../modules/auth' directly
export {
  hashPassword,
  verifyPassword,
  verifyPasswordSafe,
  needsRehash,
} from '../modules/auth/utils/password';
