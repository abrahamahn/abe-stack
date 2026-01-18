// packages/tests/src/mocks/context.ts
/**
 * Mock Application Context Factory
 *
 * Creates mock AppContext objects for testing handlers and services.
 */

import { createMockDb, type MockDbClient } from './database';
import { createMockLogger, type MockLogger } from './logger';

/**
 * Mock application configuration
 */
export interface MockConfig {
  env: 'test' | 'development' | 'production';
  auth: {
    jwt: {
      secret: string;
      expiresIn: string;
    };
    argon2: {
      memoryCost?: number;
      timeCost?: number;
      parallelism?: number;
    };
    refreshToken: {
      expiryDays: number;
    };
    lockout?: {
      maxAttempts: number;
      windowMinutes: number;
    };
  };
  server?: {
    port: number;
    host: string;
  };
}

/**
 * Mock application context
 */
export interface MockAppContext {
  db: MockDbClient;
  config: MockConfig;
  log: MockLogger;
}

/**
 * Default test configuration
 */
export const DEFAULT_TEST_CONFIG: MockConfig = {
  env: 'test',
  auth: {
    jwt: {
      secret: 'test-secret-32-characters-long!!',
      expiresIn: '15m',
    },
    argon2: {
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    },
    refreshToken: {
      expiryDays: 7,
    },
    lockout: {
      maxAttempts: 5,
      windowMinutes: 15,
    },
  },
  server: {
    port: 3000,
    host: 'localhost',
  },
};

/**
 * Create a mock application context
 */
export function createMockContext(overrides?: {
  db?: Partial<MockDbClient>;
  config?: Partial<MockConfig>;
  log?: Partial<MockLogger>;
}): MockAppContext {
  const db = createMockDb();
  const log = createMockLogger();

  // Apply db overrides
  if (overrides?.db) {
    Object.assign(db, overrides.db);
  }

  // Deep merge config
  const config: MockConfig = {
    ...DEFAULT_TEST_CONFIG,
    ...overrides?.config,
    auth: {
      ...DEFAULT_TEST_CONFIG.auth,
      ...overrides?.config?.auth,
      jwt: {
        ...DEFAULT_TEST_CONFIG.auth.jwt,
        ...overrides?.config?.auth?.jwt,
      },
      argon2: {
        ...DEFAULT_TEST_CONFIG.auth.argon2,
        ...overrides?.config?.auth?.argon2,
      },
      refreshToken: {
        ...DEFAULT_TEST_CONFIG.auth.refreshToken,
        ...overrides?.config?.auth?.refreshToken,
      },
    },
  };

  // Apply log overrides
  if (overrides?.log) {
    Object.assign(log, overrides.log);
  }

  return { db, config, log };
}

/**
 * Create a mock context with a spy on specific methods
 * Useful for verifying interactions
 */
export function createSpyContext(): MockAppContext & {
  spies: {
    dbInsert: MockDbClient['insert'];
    dbSelect: MockDbClient['select'];
    logInfo: MockLogger['info'];
    logError: MockLogger['error'];
  };
} {
  const ctx = createMockContext();

  return {
    ...ctx,
    spies: {
      dbInsert: ctx.db.insert,
      dbSelect: ctx.db.select,
      logInfo: ctx.log.info,
      logError: ctx.log.error,
    },
  };
}
