// apps/server/src/infrastructure/data/database/utils/index.ts
export {
  OptimisticLockError,
  updateUserWithVersion,
  isOptimisticLockError,
} from './optimistic-lock';

// Transaction utilities
export { withTransaction, isInTransaction } from './transaction';

// Test utilities
export { createMockDb, type MockDbClient } from './test-utils';
