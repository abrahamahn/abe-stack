// apps/server/src/lib/security.ts
// Re-export from infra/security for backwards compatibility
// New code should import from '../infra/security' directly
export {
  logLoginAttempt,
  isAccountLocked,
  getProgressiveDelay,
  applyProgressiveDelay,
  clearLoginAttempts,
  getAccountLockoutStatus,
  unlockAccount,
  type LockoutStatus,
} from '../infra/security';
