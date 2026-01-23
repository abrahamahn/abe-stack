// apps/server/src//__tests__/loader.test.ts
import { describe, expect, test } from 'vitest';

import { load } from '@/loader';

describe('uration Loader', () => {
  describe('load', () => {
    const validEnv = {
      NODE_ENV: 'test',
      JWT_SECRET: 'a-very-secure-secret-key-32-chars!',
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
    };

    test('should load uration with all sections', () => {
      const  = load(validEnv);

      expect(.env).toBe('test');
      // Verify each section has expected structure
      expect(.server).toHaveProperty('host');
      expect(.server).toHaveProperty('port');
      expect(.database).toHaveProperty('provider');
      expect(.auth).toHaveProperty('jwt');
      expect(.auth).toHaveProperty('cookie');
      expect(.email).toHaveProperty('smtp');
      expect(.storage).toHaveProperty('provider');
    });

    test('should default to development environment', () => {
      const { NODE_ENV: _, ...env } = validEnv;

      const  = load(env);

      expect(.env).toBe('development');
    });

    test('should load server uration', () => {
      const env = {
        ...validEnv,
        HOST: '127.0.0.1',
        API_PORT: '3000',
        CORS_ORIGIN: 'http://localhost:5173',
      };

      const  = load(env);

      expect(.server.host).toBe('127.0.0.1');
      expect(.server.port).toBe(3000);
      expect(.server.cors.origin).toBe('http://localhost:5173');
    });

    test('should load database uration', () => {
      const env = {
        ...validEnv,
        POSTGRES_HOST: 'db.example.com',
        POSTGRES_PORT: '5433',
        POSTGRES_DB: 'mydb',
      };

      const  = load(env);
      if (.database.provider !== 'postgresql') {
        throw new Error('Expected postgresql provider');
      }

      expect(.database.host).toBe('db.example.com');
      expect(.database.port).toBe(5433);
      expect(.database.database).toBe('mydb');
    });

    test('should load auth uration', () => {
      const env = {
        ...validEnv,
        ACCESS_TOKEN_EXPIRY: '30m',
        REFRESH_TOKEN_EXPIRY_DAYS: '14',
      };

      const  = load(env);

      expect(.auth.jwt.secret).toBe('a-very-secure-secret-key-32-chars!');
      expect(.auth.jwt.accessTokenExpiry).toBe('30m');
      expect(.auth.refreshToken.expiryDays).toBe(14);
    });

    test('should load email uration', () => {
      const env = {
        ...validEnv,
        SMTP_HOST: 'smtp.example.com',
        EMAIL_FROM_NAME: 'Test App',
      };

      const  = load(env);

      expect(.email.smtp.host).toBe('smtp.example.com');
      expect(.email.from.name).toBe('Test App');
    });

    test('should load storage uration', () => {
      const env = {
        ...validEnv,
        STORAGE_PROVIDER: 'local',
        STORAGE_LOCAL_PATH: '/uploads',
      };

      const  = load(env);

      expect(.storage.provider).toBe('local');
    });
  });

  describe('validate', () => {
    test('should throw when JWT_SECRET is missing', () => {
      const env = {
        NODE_ENV: 'test',
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
      };

      expect(() => load(env)).toThrow('JWT_SECRET is required');
    });

    test('should throw when JWT_SECRET is too short', () => {
      const env = {
        NODE_ENV: 'test',
        JWT_SECRET: 'short',
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
      };

      expect(() => load(env)).toThrow('JWT_SECRET must be at least 32 characters');
    });

    test('should throw when production uses dev JWT secret', () => {
      const env = {
        NODE_ENV: 'production',
        JWT_SECRET: 'dev_secret-that-is-at-least-32-chars',
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
      };

      expect(() => load(env)).toThrow('JWT_SECRET must not use development values');
    });

    test('should set secure cookies in production', () => {
      const env = {
        NODE_ENV: 'production',
        JWT_SECRET: 'production-secret-key-at-least-32-chars!',
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
        EMAIL_PROVIDER: 'smtp', // Required for production
        SMTP_HOST: 'smtp.example.com',
        SMTP_PORT: '587',
      };

      // Verify production  loads with secure cookie setting
      const  = load(env);
      expect(.auth.cookie.secure).toBe(true);
    });

    test('should throw when database password is missing outside test', () => {
      const env = {
        NODE_ENV: 'development',
        JWT_SECRET: 'a-very-secure-secret-key-32-chars!',
        // No DATABASE_URL or POSTGRES_PASSWORD
      };

      expect(() => load(env)).toThrow('Database password or connection string is required');
    });

    test('should allow missing database password in test environment', () => {
      const env = {
        NODE_ENV: 'test',
        JWT_SECRET: 'a-very-secure-secret-key-32-chars!',
        // No DATABASE_URL or POSTGRES_PASSWORD
      };

      const  = load(env);

      expect(.env).toBe('test');
    });

    test('should accept connection string instead of password', () => {
      const env = {
        NODE_ENV: 'development',
        JWT_SECRET: 'a-very-secure-secret-key-32-chars!',
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
      };

      const  = load(env);
      if (.database.provider !== 'postgresql') {
        throw new Error('Expected postgresql provider');
      }

      expect(.database.connectionString).toBe('postgresql://user:pass@localhost:5432/db');
    });

    test('should accept database password without connection string', () => {
      const env = {
        NODE_ENV: 'development',
        JWT_SECRET: 'a-very-secure-secret-key-32-chars!',
        POSTGRES_PASSWORD: 'mypassword',
      };

      const  = load(env);
      if (.database.provider !== 'postgresql') {
        throw new Error('Expected postgresql provider');
      }

      expect(.database.password).toBe('mypassword');
    });
  });
});
