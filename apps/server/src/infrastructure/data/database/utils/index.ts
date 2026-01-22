// apps/server/src/infrastructure/data/database/utils/index.ts
export {
  OptimisticLockError,
  updateUserWithVersion,
  isOptimisticLockError,
} from './optimistic-lock';

// Transaction utilities
export { withTransaction, isInTransaction } from './transaction';

// Note: test-utils.ts is NOT exported here intentionally.
// Test utilities import vitest which cannot be loaded at runtime.
// Import directly from './test-utils' in test files.
