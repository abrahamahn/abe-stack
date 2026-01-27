// packages/contracts/src/environment.test.ts
import { describe, expect, it } from 'vitest';

import type { ServerEnvironment } from './environment';

/**
 * Tests for ServerEnvironment interface.
 *
 * @remarks
 * ServerEnvironment is a pure TypeScript interface with no runtime behavior.
 * These tests focus on:
 * 1. Type structure validation through TypeScript compilation
 * 2. Interface contract enforcement
 * 3. Documentation of expected usage patterns
 *
 * Note: Pure type definitions don't have runtime logic to test, so these tests
 * primarily serve as executable documentation and type validation.
 */

describe('ServerEnvironment', () => {
  describe('interface structure', () => {
    it('should be compatible with objects containing a config property', () => {
      const validEnvironment: ServerEnvironment = {
        config: { port: 3000, host: 'localhost' },
      };

      expect(validEnvironment).toBeDefined();
      expect(validEnvironment.config).toBeDefined();
    });

    it('should accept config as unknown type', () => {
      const environments: ServerEnvironment[] = [
        { config: null },
        { config: undefined },
        { config: 'string-config' },
        { config: 123 },
        { config: { nested: { value: true } } },
        { config: [] },
      ];

      for (const env of environments) {
        expect(env).toBeDefined();
        expect(env).toHaveProperty('config');
      }
    });

    it('should enforce readonly on config property', () => {
      const env: ServerEnvironment = {
        config: { initialValue: true },
      };

      // TypeScript will prevent this at compile time:
      // @ts-expect-error - config is readonly
      env.config = { newValue: false }; // This would fail type checking

      // The test verifies the readonly constraint exists
      expect(env.config).toBeDefined();
    });
  });

  describe('interface extensibility', () => {
    it('should allow extension with additional properties', () => {
      interface ExtendedEnvironment extends ServerEnvironment {
        readonly database: unknown;
        readonly cache: unknown;
      }

      const extendedEnv: ExtendedEnvironment = {
        config: { port: 3000 },
        database: { url: 'postgres://localhost' },
        cache: { redis: 'localhost:6379' },
      };

      expect(extendedEnv.config).toBeDefined();
      expect(extendedEnv.database).toBeDefined();
      expect(extendedEnv.cache).toBeDefined();
    });

    it('should support the Hybrid Context pattern through extension', () => {
      interface AppContext extends ServerEnvironment {
        readonly logger: {
          info: (msg: string) => void;
          error: (msg: string) => void;
        };
        readonly db: {
          query: (sql: string) => Promise<unknown>;
        };
      }

      const appContext: AppContext = {
        config: { environment: 'test' },
        logger: {
          info: (msg: string): void => {
            // Mock implementation
            expect(msg).toBeDefined();
          },
          error: (msg: string): void => {
            // Mock implementation
            expect(msg).toBeDefined();
          },
        },
        db: {
          query: (sql: string): Promise<unknown> => {
            // Mock implementation
            expect(sql).toBeDefined();
            return Promise.resolve([]);
          },
        },
      };

      expect(appContext.config).toBeDefined();
      expect(appContext.logger).toBeDefined();
      expect(appContext.db).toBeDefined();
    });
  });

  describe('type safety', () => {
    it('should require config property to be present', () => {
      // This would fail TypeScript compilation:
      // @ts-expect-error - config is required
      const invalidEnv: ServerEnvironment = {};

      // Verify the type constraint exists
      expect(invalidEnv).toBeDefined();
    });

    it('should not allow arbitrary properties without extension', () => {
      const env: ServerEnvironment = {
        config: { value: 'test' },
        // @ts-expect-error - extraProp is not defined in ServerEnvironment
        extraProp: 'not allowed',
      };

      // The type error above validates the interface constraint
      expect(env.config).toBeDefined();
    });
  });

  describe('dependency injection pattern', () => {
    it('should support type-safe service injection through extension', () => {
      interface ServiceContainer extends ServerEnvironment {
        readonly emailService: {
          send: (to: string, subject: string) => Promise<void>;
        };
        readonly storageService: {
          upload: (key: string, data: Uint8Array) => Promise<string>;
        };
      }

      const container: ServiceContainer = {
        config: { environment: 'production' },
        emailService: {
          send: (to: string, subject: string): Promise<void> => {
            expect(to).toBeDefined();
            expect(subject).toBeDefined();
            return Promise.resolve();
          },
        },
        storageService: {
          upload: (key: string, data: Uint8Array): Promise<string> => {
            expect(key).toBeDefined();
            expect(data).toBeDefined();
            return Promise.resolve('https://storage.example.com/file');
          },
        },
      };

      expect(container.config).toBeDefined();
      expect(container.emailService).toBeDefined();
      expect(container.storageService).toBeDefined();
    });

    it('should enable function signatures with typed environment parameters', () => {
      const processRequest = (env: ServerEnvironment, data: string): string => {
        expect(env.config).toBeDefined();
        return `processed: ${data}`;
      };

      const env: ServerEnvironment = { config: { mode: 'test' } };
      const result = processRequest(env, 'test-data');

      expect(result).toBe('processed: test-data');
    });
  });

  describe('integration with server architecture', () => {
    it('should support factory pattern for context creation', () => {
      const createServerEnvironment = (configData: unknown): ServerEnvironment => {
        return {
          config: configData,
        };
      };

      const env1 = createServerEnvironment({ port: 3000 });
      const env2 = createServerEnvironment({ port: 4000 });

      expect(env1.config).not.toBe(env2.config);
      expect(env1).not.toBe(env2);
    });

    it('should allow generic functions operating on ServerEnvironment', () => {
      const getConfigValue = (
        env: ServerEnvironment,
        getter: (config: unknown) => unknown,
      ): unknown => {
        return getter(env.config);
      };

      const env: ServerEnvironment = {
        config: { port: 3000, host: 'localhost' },
      };

      const port = getConfigValue(env, (cfg) => (cfg as { port: number }).port);

      expect(port).toBe(3000);
    });
  });

  describe('immutability contract', () => {
    it('should enforce readonly semantics at the interface level', () => {
      const env: ServerEnvironment = {
        config: { mutable: 'value' },
      };

      // The readonly modifier prevents reassignment of the config property
      // @ts-expect-error - cannot reassign readonly property
      env.config = { mutable: 'new-value' };

      // However, the config object itself is not frozen unless explicitly done
      // This is TypeScript's shallow readonly behavior
      expect(env.config).toBeDefined();
    });

    it('should document that deep immutability requires additional constraints', () => {
      const env: ServerEnvironment = {
        config: { nested: { value: 'original' } },
      };

      // TypeScript's readonly is shallow, so nested properties can be mutated
      // unless additional type constraints are applied
      const configAsAny = env.config as {
        nested: { value: string };
      };
      configAsAny.nested.value = 'modified';

      expect(configAsAny.nested.value).toBe('modified');

      // For deep immutability, use Readonly<T> or Object.freeze() at runtime
    });
  });

  describe('null and undefined handling', () => {
    it('should allow config to be null', () => {
      const env: ServerEnvironment = {
        config: null,
      };

      expect(env.config).toBeNull();
    });

    it('should allow config to be undefined', () => {
      const env: ServerEnvironment = {
        config: undefined,
      };

      expect(env.config).toBeUndefined();
    });

    it('should handle config as any runtime value due to unknown type', () => {
      const runtimeValues: unknown[] = [
        null,
        undefined,
        0,
        '',
        false,
        [],
        {},
        new Date(),
        Symbol('test'),
        (): void => {
          /* function */
        },
      ];

      for (const value of runtimeValues) {
        const env: ServerEnvironment = { config: value };
        expect(env.config).toBe(value);
      }
    });
  });

  describe('edge cases and boundary conditions', () => {
    it('should handle empty object config', () => {
      const env: ServerEnvironment = {
        config: {},
      };

      expect(env.config).toEqual({});
    });

    it('should handle complex nested config structures', () => {
      const env: ServerEnvironment = {
        config: {
          level1: {
            level2: {
              level3: {
                level4: {
                  deep: 'value',
                },
              },
            },
          },
          arrays: [1, 2, [3, 4, [5, 6]]],
          mixed: {
            string: 'test',
            number: 42,
            boolean: true,
            null: null,
            undefined: undefined,
          },
        },
      };

      expect(env.config).toBeDefined();
      expect(typeof env.config).toBe('object');
    });

    it('should handle circular reference structures', () => {
      const circular: { config?: unknown } = {};
      circular.config = circular;

      const env: ServerEnvironment = {
        config: circular,
      };

      expect(env.config).toBe(circular);
      expect(env.config).toHaveProperty('config');
    });
  });

  describe('documentation and usage examples', () => {
    it('should demonstrate basic server environment setup', () => {
      // Example: Basic server startup
      const startServer = (env: ServerEnvironment): void => {
        expect(env.config).toBeDefined();
        // In real usage: configure routes, middleware, etc.
      };

      const env: ServerEnvironment = {
        config: {
          port: 3000,
          environment: 'development',
        },
      };

      startServer(env);
    });

    it('should demonstrate service container pattern', () => {
      // Example: Extending for dependency injection
      interface IServiceContainer extends ServerEnvironment {
        readonly services: {
          logger: unknown;
          database: unknown;
        };
      }

      const container: IServiceContainer = {
        config: { appName: 'test-app' },
        services: {
          logger: { info: (): void => {} },
          database: { connect: (): Promise<void> => Promise.resolve() },
        },
      };

      expect(container.config).toBeDefined();
      expect(container.services).toBeDefined();
    });

    it('should demonstrate middleware pattern with environment', () => {
      type Middleware = (env: ServerEnvironment, next: () => void) => void;

      const loggingMiddleware: Middleware = (env, next) => {
        expect(env.config).toBeDefined();
        // Log request
        next();
      };

      const env: ServerEnvironment = { config: { logging: true } };
      let nextCalled = false;

      loggingMiddleware(env, () => {
        nextCalled = true;
      });

      expect(nextCalled).toBe(true);
    });
  });
});
