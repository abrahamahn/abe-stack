// src/server/db/src/testing/index.ts
/**
 * Testing utilities for @abe-stack/db
 *
 * Exports mock database clients and test helpers for use in test files.
 */

export {
  asMockDb,
  createMockDb,
  createMockDbWithData,
  type MockDbClient,
  type MockDbClientAsDb,
} from './mocks';

export { createJsonDbClient, JsonDatabase, JsonDbClient, type JsonDatabaseConfig } from './json-db';
