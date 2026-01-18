// packages/tests/src/mocks/index.ts
/**
 * Mock Factories
 *
 * Re-exports all mock factories for easy importing.
 */

// Logger mocks
export {
  createCapturingLogger,
  createMockLogger,
  type CapturedLog,
  type CapturingLogger,
  type MockLogger,
} from './logger';

// User mocks
export {
  createMockAdmin,
  createMockUser,
  createMockUsers,
  createMockUserWithPassword,
  type MockUser,
  type MockUserWithPassword,
  type UserRole,
} from './user';

// HTTP mocks
export {
  createMockAuthenticatedRequest,
  createMockReply,
  createMockRequest,
  createMockRequestInfo,
  type MockReply,
  type MockRequest,
  type MockRequestInfo,
} from './http';

// Database mocks
export {
  configureMockQuery,
  createMockDb,
  type MockDbClient,
  type MockDbQuery,
  type MockTableQuery,
} from './database';

// Context mocks
export {
  createMockContext,
  createSpyContext,
  DEFAULT_TEST_CONFIG,
  type MockAppContext,
  type MockConfig,
} from './context';
