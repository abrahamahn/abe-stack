// main/shared/src/config/types/infra.test.ts
import { assertType, describe, expect, it } from 'vitest';

import type {
  CacheConfig,
  DatabaseConfig,
  DatabaseProvider,
  JsonDatabaseConfig,
  LocalStorageConfig,
  LogLevel,
  MongoConfig,
  MySqlConfig,
  NpmConfig,
  PackageManagerConfig,
  PackageManagerProvider,
  PnpmConfig,
  PostgresConfig,
  QueueConfig,
  QueueProvider,
  S3StorageConfig,
  ServerConfig,
  SqliteConfig,
  StorageConfig,
  StorageConfigBase,
  StorageProviderName,
  YarnConfig,
} from './infra.js';

describe('infra.ts - Infrastructure Configuration Types', () => {
  describe('Primitive Types', () => {
    describe('DatabaseProvider', () => {
      it('should accept valid database provider values', () => {
        const providers: DatabaseProvider[] = ['postgresql', 'sqlite', 'mongodb', 'json'];
        expect(providers).toHaveLength(4);
      });

      it('should be type-safe at compile time', () => {
        const pg: DatabaseProvider = 'postgresql';
        const sqlite: DatabaseProvider = 'sqlite';
        const mongo: DatabaseProvider = 'mongodb';
        const json: DatabaseProvider = 'json';

        assertType<DatabaseProvider>(pg);
        assertType<DatabaseProvider>(sqlite);
        assertType<DatabaseProvider>(mongo);
        assertType<DatabaseProvider>(json);
      });
    });

    describe('StorageProviderName', () => {
      it('should accept valid storage provider values', () => {
        const providers: StorageProviderName[] = ['local', 's3'];
        expect(providers).toHaveLength(2);
      });

      it('should be type-safe at compile time', () => {
        const local: StorageProviderName = 'local';
        const s3: StorageProviderName = 's3';

        assertType<StorageProviderName>(local);
        assertType<StorageProviderName>(s3);
      });
    });

    describe('QueueProvider', () => {
      it('should accept valid queue provider values', () => {
        const providers: QueueProvider[] = ['local', 'redis'];
        expect(providers).toHaveLength(2);
      });

      it('should be type-safe at compile time', () => {
        const local: QueueProvider = 'local';
        const redis: QueueProvider = 'redis';

        assertType<QueueProvider>(local);
        assertType<QueueProvider>(redis);
      });
    });

    describe('PackageManagerProvider', () => {
      it('should accept valid package manager values', () => {
        const providers: PackageManagerProvider[] = ['npm', 'pnpm', 'yarn'];
        expect(providers).toHaveLength(3);
      });

      it('should be type-safe at compile time', () => {
        const npm: PackageManagerProvider = 'npm';
        const pnpm: PackageManagerProvider = 'pnpm';
        const yarn: PackageManagerProvider = 'yarn';

        assertType<PackageManagerProvider>(npm);
        assertType<PackageManagerProvider>(pnpm);
        assertType<PackageManagerProvider>(yarn);
      });
    });

    describe('LogLevel', () => {
      it('should be an alias to ConsoleLogLevel', () => {
        const debug: LogLevel = 'debug';
        const info: LogLevel = 'info';
        const warn: LogLevel = 'warn';
        const error: LogLevel = 'error';

        assertType<LogLevel>(debug);
        assertType<LogLevel>(info);
        assertType<LogLevel>(warn);
        assertType<LogLevel>(error);
      });
    });
  });

  describe('Database Configuration', () => {
    describe('PostgresConfig', () => {
      it('should accept valid PostgreSQL configuration', () => {
        const config: PostgresConfig = {
          provider: 'postgresql',
          host: 'localhost',
          port: 5432,
          database: 'myapp',
          user: 'postgres',
          password: 'secret',
          maxConnections: 20,
          portFallbacks: [5433, 5434],
          ssl: false,
        };

        expect(config.provider).toBe('postgresql');
        expect(config.host).toBe('localhost');
        expect(config.port).toBe(5432);
        expect(config.database).toBe('myapp');
        expect(config.user).toBe('postgres');
        expect(config.password).toBe('secret');
        expect(config.maxConnections).toBe(20);
        expect(config.portFallbacks).toEqual([5433, 5434]);
        expect(config.ssl).toBe(false);
      });

      it('should accept optional connectionString', () => {
        const config: PostgresConfig = {
          provider: 'postgresql',
          host: 'localhost',
          port: 5432,
          database: 'myapp',
          user: 'postgres',
          password: 'secret',
          connectionString: 'postgresql://user:pass@localhost:5432/db',
          maxConnections: 20,
          portFallbacks: [],
          ssl: true,
        };

        expect(config.connectionString).toBe('postgresql://user:pass@localhost:5432/db');
        expect(config.ssl).toBe(true);
      });

      it('should accept empty portFallbacks array', () => {
        const config: PostgresConfig = {
          provider: 'postgresql',
          host: 'db.example.com',
          port: 5432,
          database: 'prod',
          user: 'app',
          password: 'secure',
          maxConnections: 50,
          portFallbacks: [],
          ssl: true,
        };

        expect(config.portFallbacks).toEqual([]);
      });

      it('should be assignable to DatabaseConfig union', () => {
        const config: PostgresConfig = {
          provider: 'postgresql',
          host: 'localhost',
          port: 5432,
          database: 'test',
          user: 'user',
          password: 'pass',
          maxConnections: 10,
          portFallbacks: [],
          ssl: false,
        };

        const dbConfig: DatabaseConfig = config;
        assertType<DatabaseConfig>(dbConfig);
      });
    });

    describe('JsonDatabaseConfig', () => {
      it('should accept valid JSON database configuration', () => {
        const config: JsonDatabaseConfig = {
          provider: 'json',
          filePath: './data/db.json',
          persistOnWrite: true,
        };

        expect(config.provider).toBe('json');
        expect(config.filePath).toBe('./data/db.json');
        expect(config.persistOnWrite).toBe(true);
      });

      it('should handle relative and absolute paths', () => {
        const relativeConfig: JsonDatabaseConfig = {
          provider: 'json',
          filePath: './data/db.json',
          persistOnWrite: false,
        };

        const absoluteConfig: JsonDatabaseConfig = {
          provider: 'json',
          filePath: '/var/lib/app/db.json',
          persistOnWrite: true,
        };

        expect(relativeConfig.filePath).toBe('./data/db.json');
        expect(absoluteConfig.filePath).toBe('/var/lib/app/db.json');
      });

      it('should be assignable to DatabaseConfig union', () => {
        const config: JsonDatabaseConfig = {
          provider: 'json',
          filePath: './db.json',
          persistOnWrite: false,
        };

        const dbConfig: DatabaseConfig = config;
        assertType<DatabaseConfig>(dbConfig);
      });
    });

    describe('MySqlConfig', () => {
      it('should accept valid MySQL configuration', () => {
        const config: MySqlConfig = {
          provider: 'mysql',
          host: 'localhost',
          port: 3306,
          database: 'myapp',
          user: 'root',
          password: 'secret',
          maxConnections: 15,
          portFallbacks: [3307],
          ssl: false,
        };

        expect(config.provider).toBe('mysql');
        expect(config.host).toBe('localhost');
        expect(config.port).toBe(3306);
        expect(config.maxConnections).toBe(15);
      });

      it('should accept optional connectionString', () => {
        const config: MySqlConfig = {
          provider: 'mysql',
          host: 'localhost',
          port: 3306,
          database: 'test',
          user: 'root',
          password: 'pass',
          connectionString: 'mysql://root:pass@localhost:3306/test',
          maxConnections: 10,
          portFallbacks: [],
          ssl: true,
        };

        expect(config.connectionString).toBeDefined();
      });
    });

    describe('SqliteConfig', () => {
      it('should accept valid SQLite configuration', () => {
        const config: SqliteConfig = {
          provider: 'sqlite',
          filePath: './data/app.db',
          walMode: true,
          foreignKeys: true,
          timeout: 5000,
        };

        expect(config.provider).toBe('sqlite');
        expect(config.filePath).toBe('./data/app.db');
        expect(config.walMode).toBe(true);
        expect(config.foreignKeys).toBe(true);
        expect(config.timeout).toBe(5000);
      });

      it('should handle different timeout values', () => {
        const fastConfig: SqliteConfig = {
          provider: 'sqlite',
          filePath: './fast.db',
          walMode: true,
          foreignKeys: true,
          timeout: 1000,
        };

        const slowConfig: SqliteConfig = {
          provider: 'sqlite',
          filePath: './slow.db',
          walMode: false,
          foreignKeys: false,
          timeout: 30000,
        };

        expect(fastConfig.timeout).toBe(1000);
        expect(slowConfig.timeout).toBe(30000);
      });

      it('should be assignable to DatabaseConfig union', () => {
        const config: SqliteConfig = {
          provider: 'sqlite',
          filePath: './test.db',
          walMode: true,
          foreignKeys: true,
          timeout: 5000,
        };

        const dbConfig: DatabaseConfig = config;
        assertType<DatabaseConfig>(dbConfig);
      });
    });

    describe('MongoConfig', () => {
      it('should accept valid MongoDB configuration', () => {
        const config: MongoConfig = {
          provider: 'mongodb',
          connectionString: 'mongodb://localhost:27017',
          database: 'myapp',
        };

        expect(config.provider).toBe('mongodb');
        expect(config.connectionString).toBe('mongodb://localhost:27017');
        expect(config.database).toBe('myapp');
      });

      it('should accept optional connection options', () => {
        const config: MongoConfig = {
          provider: 'mongodb',
          connectionString: 'mongodb://localhost:27017',
          database: 'myapp',
          options: {
            ssl: true,
            connectTimeoutMs: 10000,
            socketTimeoutMs: 30000,
            useUnifiedTopology: true,
          },
        };

        expect(config.options?.ssl).toBe(true);
        expect(config.options?.connectTimeoutMs).toBe(10000);
        expect(config.options?.socketTimeoutMs).toBe(30000);
        expect(config.options?.useUnifiedTopology).toBe(true);
      });

      it('should accept partial options', () => {
        const config: MongoConfig = {
          provider: 'mongodb',
          connectionString: 'mongodb://localhost:27017',
          database: 'test',
          options: {
            ssl: true,
          },
        };

        expect(config.options?.ssl).toBe(true);
        expect(config.options?.connectTimeoutMs).toBeUndefined();
      });

      it('should be assignable to DatabaseConfig union', () => {
        const config: MongoConfig = {
          provider: 'mongodb',
          connectionString: 'mongodb://localhost:27017',
          database: 'test',
        };

        const dbConfig: DatabaseConfig = config;
        assertType<DatabaseConfig>(dbConfig);
      });
    });

    describe('DatabaseConfig union', () => {
      it('should be discriminable by provider field', () => {
        const configs: DatabaseConfig[] = [
          {
            provider: 'postgresql',
            host: 'localhost',
            port: 5432,
            database: 'test',
            user: 'user',
            password: 'pass',
            maxConnections: 10,
            portFallbacks: [],
            ssl: false,
          },
          {
            provider: 'json',
            filePath: './db.json',
            persistOnWrite: true,
          },
          {
            provider: 'sqlite',
            filePath: './test.db',
            walMode: true,
            foreignKeys: true,
            timeout: 5000,
          },
          {
            provider: 'mongodb',
            connectionString: 'mongodb://localhost:27017',
            database: 'test',
          },
        ];

        expect(configs).toHaveLength(4);
        expect(configs[0]?.provider).toBe('postgresql');
        expect(configs[1]?.provider).toBe('json');
        expect(configs[2]?.provider).toBe('sqlite');
        expect(configs[3]?.provider).toBe('mongodb');
      });
    });
  });

  describe('Package Manager Configuration', () => {
    describe('NpmConfig', () => {
      it('should accept valid NPM configuration', () => {
        const config: NpmConfig = {
          provider: 'npm',
          audit: true,
          legacyPeerDeps: false,
        };

        expect(config.provider).toBe('npm');
        expect(config.audit).toBe(true);
        expect(config.legacyPeerDeps).toBe(false);
      });

      it('should accept optional registry', () => {
        const config: NpmConfig = {
          provider: 'npm',
          audit: false,
          legacyPeerDeps: true,
          registry: 'https://registry.npmjs.org',
        };

        expect(config.registry).toBe('https://registry.npmjs.org');
      });

      it('should be assignable to PackageManagerConfig union', () => {
        const config: NpmConfig = {
          provider: 'npm',
          audit: true,
          legacyPeerDeps: false,
        };

        const pmConfig: PackageManagerConfig = config;
        assertType<PackageManagerConfig>(pmConfig);
      });
    });

    describe('PnpmConfig', () => {
      it('should accept valid PNPM configuration', () => {
        const config: PnpmConfig = {
          provider: 'pnpm',
          strictPeerDeps: true,
          frozenLockfile: true,
        };

        expect(config.provider).toBe('pnpm');
        expect(config.strictPeerDeps).toBe(true);
        expect(config.frozenLockfile).toBe(true);
      });

      it('should accept optional registry', () => {
        const config: PnpmConfig = {
          provider: 'pnpm',
          strictPeerDeps: false,
          frozenLockfile: false,
          registry: 'https://custom-registry.example.com',
        };

        expect(config.registry).toBe('https://custom-registry.example.com');
      });

      it('should be assignable to PackageManagerConfig union', () => {
        const config: PnpmConfig = {
          provider: 'pnpm',
          strictPeerDeps: true,
          frozenLockfile: true,
        };

        const pmConfig: PackageManagerConfig = config;
        assertType<PackageManagerConfig>(pmConfig);
      });
    });

    describe('YarnConfig', () => {
      it('should accept valid Yarn configuration', () => {
        const config: YarnConfig = {
          provider: 'yarn',
          audit: true,
          frozenLockfile: true,
        };

        expect(config.provider).toBe('yarn');
        expect(config.audit).toBe(true);
        expect(config.frozenLockfile).toBe(true);
      });

      it('should accept optional registry', () => {
        const config: YarnConfig = {
          provider: 'yarn',
          audit: false,
          frozenLockfile: false,
          registry: 'https://registry.yarnpkg.com',
        };

        expect(config.registry).toBe('https://registry.yarnpkg.com');
      });

      it('should be assignable to PackageManagerConfig union', () => {
        const config: YarnConfig = {
          provider: 'yarn',
          audit: true,
          frozenLockfile: true,
        };

        const pmConfig: PackageManagerConfig = config;
        assertType<PackageManagerConfig>(pmConfig);
      });
    });

    describe('PackageManagerConfig union', () => {
      it('should be discriminable by provider field', () => {
        const configs: PackageManagerConfig[] = [
          {
            provider: 'npm',
            audit: true,
            legacyPeerDeps: false,
          },
          {
            provider: 'pnpm',
            strictPeerDeps: true,
            frozenLockfile: true,
          },
          {
            provider: 'yarn',
            audit: true,
            frozenLockfile: true,
          },
        ];

        expect(configs).toHaveLength(3);
        expect(configs[0]?.provider).toBe('npm');
        expect(configs[1]?.provider).toBe('pnpm');
        expect(configs[2]?.provider).toBe('yarn');
      });
    });
  });

  describe('Cache Configuration', () => {
    describe('CacheConfig', () => {
      it('should accept valid cache configuration without external provider', () => {
        const config: CacheConfig = {
          ttl: 3600000,
          maxSize: 1000,
          useExternalProvider: false,
        };

        expect(config.ttl).toBe(3600000);
        expect(config.maxSize).toBe(1000);
        expect(config.useExternalProvider).toBe(false);
        expect(config.externalConfig).toBeUndefined();
      });

      it('should accept configuration with external Redis provider', () => {
        const config: CacheConfig = {
          ttl: 7200000,
          maxSize: 5000,
          useExternalProvider: true,
          externalConfig: {
            host: 'redis.example.com',
            port: 6379,
          },
        };

        expect(config.useExternalProvider).toBe(true);
        expect(config.externalConfig?.host).toBe('redis.example.com');
        expect(config.externalConfig?.port).toBe(6379);
      });

      it('should handle different TTL values', () => {
        const shortConfig: CacheConfig = {
          ttl: 60000, // 1 minute
          maxSize: 100,
          useExternalProvider: false,
        };

        const longConfig: CacheConfig = {
          ttl: 86400000, // 24 hours
          maxSize: 10000,
          useExternalProvider: false,
        };

        expect(shortConfig.ttl).toBe(60000);
        expect(longConfig.ttl).toBe(86400000);
      });

      it('should handle different cache sizes', () => {
        const smallCache: CacheConfig = {
          ttl: 3600000,
          maxSize: 50,
          useExternalProvider: false,
        };

        const largeCache: CacheConfig = {
          ttl: 3600000,
          maxSize: 100000,
          useExternalProvider: false,
        };

        expect(smallCache.maxSize).toBe(50);
        expect(largeCache.maxSize).toBe(100000);
      });
    });
  });

  describe('Queue Configuration', () => {
    describe('QueueConfig', () => {
      it('should accept valid local queue configuration', () => {
        const config: QueueConfig = {
          provider: 'local',
          pollIntervalMs: 1000,
          concurrency: 5,
          defaultMaxAttempts: 3,
          backoffBaseMs: 1000,
          maxBackoffMs: 60000,
        };

        expect(config.provider).toBe('local');
        expect(config.pollIntervalMs).toBe(1000);
        expect(config.concurrency).toBe(5);
        expect(config.defaultMaxAttempts).toBe(3);
        expect(config.backoffBaseMs).toBe(1000);
        expect(config.maxBackoffMs).toBe(60000);
      });

      it('should accept Redis queue configuration', () => {
        const config: QueueConfig = {
          provider: 'redis',
          pollIntervalMs: 500,
          concurrency: 10,
          defaultMaxAttempts: 5,
          backoffBaseMs: 2000,
          maxBackoffMs: 120000,
        };

        expect(config.provider).toBe('redis');
        expect(config.concurrency).toBe(10);
      });

      it('should handle different polling intervals', () => {
        const fastPoll: QueueConfig = {
          provider: 'local',
          pollIntervalMs: 100,
          concurrency: 1,
          defaultMaxAttempts: 3,
          backoffBaseMs: 500,
          maxBackoffMs: 30000,
        };

        const slowPoll: QueueConfig = {
          provider: 'local',
          pollIntervalMs: 5000,
          concurrency: 1,
          defaultMaxAttempts: 3,
          backoffBaseMs: 1000,
          maxBackoffMs: 60000,
        };

        expect(fastPoll.pollIntervalMs).toBe(100);
        expect(slowPoll.pollIntervalMs).toBe(5000);
      });

      it('should handle different concurrency levels', () => {
        const sequential: QueueConfig = {
          provider: 'local',
          pollIntervalMs: 1000,
          concurrency: 1,
          defaultMaxAttempts: 3,
          backoffBaseMs: 1000,
          maxBackoffMs: 60000,
        };

        const parallel: QueueConfig = {
          provider: 'redis',
          pollIntervalMs: 1000,
          concurrency: 50,
          defaultMaxAttempts: 3,
          backoffBaseMs: 1000,
          maxBackoffMs: 60000,
        };

        expect(sequential.concurrency).toBe(1);
        expect(parallel.concurrency).toBe(50);
      });

      it('should handle different retry strategies', () => {
        const aggressive: QueueConfig = {
          provider: 'local',
          pollIntervalMs: 1000,
          concurrency: 5,
          defaultMaxAttempts: 10,
          backoffBaseMs: 500,
          maxBackoffMs: 30000,
        };

        const conservative: QueueConfig = {
          provider: 'local',
          pollIntervalMs: 1000,
          concurrency: 5,
          defaultMaxAttempts: 2,
          backoffBaseMs: 5000,
          maxBackoffMs: 300000,
        };

        expect(aggressive.defaultMaxAttempts).toBe(10);
        expect(aggressive.backoffBaseMs).toBe(500);
        expect(conservative.defaultMaxAttempts).toBe(2);
        expect(conservative.backoffBaseMs).toBe(5000);
      });
    });
  });

  describe('Server Configuration', () => {
    describe('ServerConfig', () => {
      it('should accept valid server configuration', () => {
        const config: ServerConfig = {
          host: '0.0.0.0',
          port: 8080,
          portFallbacks: [8081, 8082],
          cors: {
            origin: ['http://localhost:3000'],
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE'],
          },
          trustProxy: false,
          logLevel: 'info',
          maintenanceMode: false,
          auditRetentionDays: 90,
          appBaseUrl: 'http://localhost:3000',
          apiBaseUrl: 'http://localhost:8080',
          rateLimit: {
            windowMs: 900000,
            max: 100,
          },
        };

        expect(config.host).toBe('0.0.0.0');
        expect(config.port).toBe(8080);
        expect(config.portFallbacks).toEqual([8081, 8082]);
        expect(config.cors.origin).toEqual(['http://localhost:3000']);
        expect(config.cors.credentials).toBe(true);
        expect(config.trustProxy).toBe(false);
        expect(config.logLevel).toBe('info');
        expect(config.maintenanceMode).toBe(false);
      });

      it('should accept multiple CORS origins', () => {
        const config: ServerConfig = {
          host: 'localhost',
          port: 3000,
          portFallbacks: [],
          cors: {
            origin: [
              'http://app.example.com',
              'https://app.example.com',
              'http://admin.example.com',
            ],
            credentials: true,
            methods: ['GET', 'POST'],
          },
          trustProxy: true,
          logLevel: 'debug',
          maintenanceMode: false,
          auditRetentionDays: 90,
          appBaseUrl: 'https://app.example.com',
          apiBaseUrl: 'https://api.example.com',
          rateLimit: {
            windowMs: 60000,
            max: 50,
          },
        };

        expect(config.cors.origin).toHaveLength(3);
        expect(config.cors.origin).toContain('https://app.example.com');
      });

      it('should accept different log levels', () => {
        const debugConfig: ServerConfig = {
          host: 'localhost',
          port: 8080,
          portFallbacks: [],
          cors: { origin: [], credentials: false, methods: [] },
          trustProxy: false,
          logLevel: 'debug',
          maintenanceMode: false,
          auditRetentionDays: 90,
          appBaseUrl: 'http://localhost:3000',
          apiBaseUrl: 'http://localhost:8080',
          rateLimit: { windowMs: 900000, max: 100 },
        };

        const errorConfig: ServerConfig = {
          host: 'localhost',
          port: 8080,
          portFallbacks: [],
          cors: { origin: [], credentials: false, methods: [] },
          trustProxy: false,
          logLevel: 'error',
          maintenanceMode: false,
          auditRetentionDays: 90,
          appBaseUrl: 'http://localhost:3000',
          apiBaseUrl: 'http://localhost:8080',
          rateLimit: { windowMs: 900000, max: 100 },
        };

        expect(debugConfig.logLevel).toBe('debug');
        expect(errorConfig.logLevel).toBe('error');
      });

      it('should handle maintenance mode', () => {
        const maintenanceConfig: ServerConfig = {
          host: 'localhost',
          port: 8080,
          portFallbacks: [],
          cors: { origin: [], credentials: false, methods: [] },
          trustProxy: false,
          logLevel: 'warn',
          maintenanceMode: true,
          auditRetentionDays: 90,
          appBaseUrl: 'http://localhost:3000',
          apiBaseUrl: 'http://localhost:8080',
          rateLimit: { windowMs: 900000, max: 100 },
        };

        expect(maintenanceConfig.maintenanceMode).toBe(true);
      });

      it('should handle trust proxy settings', () => {
        const proxyConfig: ServerConfig = {
          host: '0.0.0.0',
          port: 8080,
          portFallbacks: [],
          cors: { origin: [], credentials: false, methods: [] },
          trustProxy: true,
          logLevel: 'info',
          maintenanceMode: false,
          auditRetentionDays: 90,
          appBaseUrl: 'https://example.com',
          apiBaseUrl: 'https://api.example.com',
          rateLimit: { windowMs: 900000, max: 100 },
        };

        expect(proxyConfig.trustProxy).toBe(true);
      });

      it('should handle different rate limit configurations', () => {
        const strictConfig: ServerConfig = {
          host: 'localhost',
          port: 8080,
          portFallbacks: [],
          cors: { origin: [], credentials: false, methods: [] },
          trustProxy: false,
          logLevel: 'info',
          maintenanceMode: false,
          auditRetentionDays: 90,
          appBaseUrl: 'http://localhost:3000',
          apiBaseUrl: 'http://localhost:8080',
          rateLimit: {
            windowMs: 60000, // 1 minute
            max: 10,
          },
        };

        const lenientConfig: ServerConfig = {
          host: 'localhost',
          port: 8080,
          portFallbacks: [],
          cors: { origin: [], credentials: false, methods: [] },
          trustProxy: false,
          logLevel: 'info',
          maintenanceMode: false,
          auditRetentionDays: 90,
          appBaseUrl: 'http://localhost:3000',
          apiBaseUrl: 'http://localhost:8080',
          rateLimit: {
            windowMs: 3600000, // 1 hour
            max: 1000,
          },
        };

        expect(strictConfig.rateLimit.max).toBe(10);
        expect(lenientConfig.rateLimit.max).toBe(1000);
      });

      it('should accept empty portFallbacks', () => {
        const config: ServerConfig = {
          host: 'localhost',
          port: 8080,
          portFallbacks: [],
          cors: { origin: [], credentials: false, methods: [] },
          trustProxy: false,
          logLevel: 'info',
          maintenanceMode: false,
          auditRetentionDays: 90,
          appBaseUrl: 'http://localhost:3000',
          apiBaseUrl: 'http://localhost:8080',
          rateLimit: { windowMs: 900000, max: 100 },
        };

        expect(config.portFallbacks).toEqual([]);
      });
    });
  });

  describe('Storage Configuration', () => {
    describe('StorageConfigBase', () => {
      it('should define base storage interface', () => {
        const base: StorageConfigBase = {
          provider: 'local',
        };

        assertType<StorageConfigBase>(base);
        expect(base.provider).toBe('local');
      });
    });

    describe('LocalStorageConfig', () => {
      it('should accept valid local storage configuration', () => {
        const config: LocalStorageConfig = {
          provider: 'local',
          rootPath: './uploads',
        };

        expect(config.provider).toBe('local');
        expect(config.rootPath).toBe('./uploads');
        expect(config.publicBaseUrl).toBeUndefined();
      });

      it('should accept optional publicBaseUrl', () => {
        const config: LocalStorageConfig = {
          provider: 'local',
          rootPath: '/var/lib/app/uploads',
          publicBaseUrl: 'https://cdn.example.com/uploads',
        };

        expect(config.publicBaseUrl).toBe('https://cdn.example.com/uploads');
      });

      it('should handle relative and absolute paths', () => {
        const relativeConfig: LocalStorageConfig = {
          provider: 'local',
          rootPath: './data/uploads',
        };

        const absoluteConfig: LocalStorageConfig = {
          provider: 'local',
          rootPath: '/opt/app/storage',
        };

        expect(relativeConfig.rootPath).toBe('./data/uploads');
        expect(absoluteConfig.rootPath).toBe('/opt/app/storage');
      });

      it('should be assignable to StorageConfig union', () => {
        const config: LocalStorageConfig = {
          provider: 'local',
          rootPath: './uploads',
        };

        const storageConfig: StorageConfig = config;
        assertType<StorageConfig>(storageConfig);
      });
    });

    describe('S3StorageConfig', () => {
      it('should accept valid S3 storage configuration', () => {
        const config: S3StorageConfig = {
          provider: 's3',
          accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
          secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
          region: 'us-east-1',
          bucket: 'my-app-uploads',
          forcePathStyle: false,
          presignExpiresInSeconds: 3600,
        };

        expect(config.provider).toBe('s3');
        expect(config.accessKeyId).toBe('AKIAIOSFODNN7EXAMPLE');
        expect(config.secretAccessKey).toBe('wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY');
        expect(config.region).toBe('us-east-1');
        expect(config.bucket).toBe('my-app-uploads');
        expect(config.forcePathStyle).toBe(false);
        expect(config.presignExpiresInSeconds).toBe(3600);
      });

      it('should accept custom endpoint for S3-compatible services', () => {
        const minioConfig: S3StorageConfig = {
          provider: 's3',
          accessKeyId: 'minioadmin',
          secretAccessKey: 'minioadmin',
          region: 'us-east-1',
          bucket: 'uploads',
          endpoint: 'http://localhost:9000',
          forcePathStyle: true,
          presignExpiresInSeconds: 7200,
        };

        expect(minioConfig.endpoint).toBe('http://localhost:9000');
        expect(minioConfig.forcePathStyle).toBe(true);
      });

      it('should handle different regions', () => {
        const usConfig: S3StorageConfig = {
          provider: 's3',
          accessKeyId: 'key',
          secretAccessKey: 'secret',
          region: 'us-west-2',
          bucket: 'us-bucket',
          forcePathStyle: false,
          presignExpiresInSeconds: 3600,
        };

        const euConfig: S3StorageConfig = {
          provider: 's3',
          accessKeyId: 'key',
          secretAccessKey: 'secret',
          region: 'eu-central-1',
          bucket: 'eu-bucket',
          forcePathStyle: false,
          presignExpiresInSeconds: 3600,
        };

        expect(usConfig.region).toBe('us-west-2');
        expect(euConfig.region).toBe('eu-central-1');
      });

      it('should handle different presign expiration times', () => {
        const shortExpiry: S3StorageConfig = {
          provider: 's3',
          accessKeyId: 'key',
          secretAccessKey: 'secret',
          region: 'us-east-1',
          bucket: 'bucket',
          forcePathStyle: false,
          presignExpiresInSeconds: 300, // 5 minutes
        };

        const longExpiry: S3StorageConfig = {
          provider: 's3',
          accessKeyId: 'key',
          secretAccessKey: 'secret',
          region: 'us-east-1',
          bucket: 'bucket',
          forcePathStyle: false,
          presignExpiresInSeconds: 86400, // 24 hours
        };

        expect(shortExpiry.presignExpiresInSeconds).toBe(300);
        expect(longExpiry.presignExpiresInSeconds).toBe(86400);
      });

      it('should be assignable to StorageConfig union', () => {
        const config: S3StorageConfig = {
          provider: 's3',
          accessKeyId: 'key',
          secretAccessKey: 'secret',
          region: 'us-east-1',
          bucket: 'bucket',
          forcePathStyle: false,
          presignExpiresInSeconds: 3600,
        };

        const storageConfig: StorageConfig = config;
        assertType<StorageConfig>(storageConfig);
      });
    });

    describe('StorageConfig union', () => {
      it('should be discriminable by provider field', () => {
        const configs: StorageConfig[] = [
          {
            provider: 'local',
            rootPath: './uploads',
          },
          {
            provider: 's3',
            accessKeyId: 'key',
            secretAccessKey: 'secret',
            region: 'us-east-1',
            bucket: 'bucket',
            forcePathStyle: false,
            presignExpiresInSeconds: 3600,
          },
        ];

        expect(configs).toHaveLength(2);
        expect(configs[0]?.provider).toBe('local');
        expect(configs[1]?.provider).toBe('s3');
      });

      it('should enable type narrowing through discriminant', () => {
        const config: StorageConfig = {
          provider: 'local',
          rootPath: './uploads',
        };

        if (config.provider === 'local') {
          assertType<LocalStorageConfig>(config);
          expect(config.rootPath).toBe('./uploads');
        }
      });
    });
  });

  describe('Type Discrimination and Narrowing', () => {
    it('should discriminate DatabaseConfig by provider', () => {
      const testDiscrimination = (config: DatabaseConfig): string => {
        switch (config.provider) {
          case 'postgresql':
            assertType<PostgresConfig>(config);
            return `PostgreSQL on ${config.host}:${String(config.port)}`;
          case 'json':
            assertType<JsonDatabaseConfig>(config);
            return `JSON file at ${config.filePath}`;
          case 'sqlite':
            assertType<SqliteConfig>(config);
            return `SQLite at ${config.filePath}`;
          case 'mongodb':
            assertType<MongoConfig>(config);
            return `MongoDB at ${config.database}`;
          default:
            config satisfies never;
            throw new Error(`Unknown database provider: ${(config as DatabaseConfig).provider}`);
        }
      };

      const pgConfig: DatabaseConfig = {
        provider: 'postgresql',
        host: 'localhost',
        port: 5432,
        database: 'test',
        user: 'user',
        password: 'pass',
        maxConnections: 10,
        portFallbacks: [],
        ssl: false,
      };

      expect(testDiscrimination(pgConfig)).toBe('PostgreSQL on localhost:5432');
    });

    it('should discriminate PackageManagerConfig by provider', () => {
      const testDiscrimination = (config: PackageManagerConfig): string => {
        switch (config.provider) {
          case 'npm':
            assertType<NpmConfig>(config);
            return `NPM with audit=${String(config.audit)}`;
          case 'pnpm':
            assertType<PnpmConfig>(config);
            return `PNPM with strict=${String(config.strictPeerDeps)}`;
          case 'yarn':
            assertType<YarnConfig>(config);
            return `Yarn with frozen=${String(config.frozenLockfile)}`;
          default:
            config satisfies never;
            throw new Error(
              `Unknown package manager: ${(config as PackageManagerConfig).provider}`,
            );
        }
      };

      const pnpmConfig: PackageManagerConfig = {
        provider: 'pnpm',
        strictPeerDeps: true,
        frozenLockfile: true,
      };

      expect(testDiscrimination(pnpmConfig)).toBe('PNPM with strict=true');
    });

    it('should discriminate StorageConfig by provider', () => {
      const testDiscrimination = (config: StorageConfig): string => {
        switch (config.provider) {
          case 'local':
            assertType<LocalStorageConfig>(config);
            return `Local storage at ${config.rootPath}`;
          case 's3':
            assertType<S3StorageConfig>(config);
            return `S3 bucket ${config.bucket} in ${config.region}`;
          default:
            config satisfies never;
            throw new Error(`Unknown storage provider: ${(config as StorageConfig).provider}`);
        }
      };

      const s3Config: StorageConfig = {
        provider: 's3',
        accessKeyId: 'key',
        secretAccessKey: 'secret',
        region: 'us-east-1',
        bucket: 'my-bucket',
        forcePathStyle: false,
        presignExpiresInSeconds: 3600,
      };

      expect(testDiscrimination(s3Config)).toBe('S3 bucket my-bucket in us-east-1');
    });
  });

  describe('Edge Cases and Boundary Values', () => {
    it('should handle zero values for numeric fields', () => {
      const cacheConfig: CacheConfig = {
        ttl: 0,
        maxSize: 0,
        useExternalProvider: false,
      };

      expect(cacheConfig.ttl).toBe(0);
      expect(cacheConfig.maxSize).toBe(0);
    });

    it('should handle empty arrays', () => {
      const serverConfig: ServerConfig = {
        host: 'localhost',
        port: 8080,
        portFallbacks: [],
        cors: {
          origin: [],
          credentials: false,
          methods: [],
        },
        trustProxy: false,
        logLevel: 'info',
        maintenanceMode: false,
        auditRetentionDays: 90,
        appBaseUrl: 'http://localhost:3000',
        apiBaseUrl: 'http://localhost:8080',
        rateLimit: { windowMs: 900000, max: 100 },
      };

      expect(serverConfig.portFallbacks).toEqual([]);
      expect(serverConfig.cors.origin).toEqual([]);
      expect(serverConfig.cors.methods).toEqual([]);
    });

    it('should handle empty strings', () => {
      const localConfig: LocalStorageConfig = {
        provider: 'local',
        rootPath: '',
        publicBaseUrl: '',
      };

      expect(localConfig.rootPath).toBe('');
      expect(localConfig.publicBaseUrl).toBe('');
    });

    it('should handle large numeric values', () => {
      const queueConfig: QueueConfig = {
        provider: 'local',
        pollIntervalMs: Number.MAX_SAFE_INTEGER,
        concurrency: Number.MAX_SAFE_INTEGER,
        defaultMaxAttempts: Number.MAX_SAFE_INTEGER,
        backoffBaseMs: Number.MAX_SAFE_INTEGER,
        maxBackoffMs: Number.MAX_SAFE_INTEGER,
      };

      expect(queueConfig.pollIntervalMs).toBe(Number.MAX_SAFE_INTEGER);
      expect(queueConfig.concurrency).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('should handle undefined optional fields', () => {
      const mongoConfig: MongoConfig = {
        provider: 'mongodb',
        connectionString: 'mongodb://localhost:27017',
        database: 'test',
      };

      expect(mongoConfig.options).toBeUndefined();
    });
  });
});
