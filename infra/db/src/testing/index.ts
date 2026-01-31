// infra/db/src/testing/index.ts
export {
  asMockDb,
  createMockDb,
  createMockDbWithData,
  type MockDbClient,
  type MockDbClientAsDb,
} from './mocks';
export { createJsonDbClient, JsonDatabase, JsonDbClient, type JsonDatabaseConfig } from './json-db';
