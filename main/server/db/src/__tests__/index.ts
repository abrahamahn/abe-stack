// backend/db/src/__tests__/index.ts
/**
 * Re-exports testing utilities from the testing directory.
 * This file maintains backward compatibility for tests that import from __tests__.
 */
export {
  asMockDb,
  createMockDb,
  createMockDbWithData,
  type MockDbClient,
  type MockDbClientAsDb,
  createJsonDbClient,
  JsonDatabase,
  JsonDbClient,
  type JsonDatabaseConfig,
} from '../testing';
