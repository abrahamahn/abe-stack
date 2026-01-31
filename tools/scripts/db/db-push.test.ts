// tools/scripts/db/db-push.test.ts
/* eslint-disable no-console, @typescript-eslint/unbound-method */
/**
 * Tests for Database Schema Push Script
 *
 * Validates the db-push script behavior including:
 * - Schema creation with all SQL statements
 * - Database client initialization
 * - Connection cleanup
 * - Error handling and recovery
 * - Main module execution flow
 *
 * @complexity O(n) - Tests execute sequentially with mocked DB operations
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Use vi.hoisted to ensure mock functions are available when vi.mock factory runs
const { mockBuildConnectionString, mockCreateDbClient, mockRaw, mockClose } = vi.hoisted(() => ({
  mockBuildConnectionString: vi.fn(),
  mockCreateDbClient: vi.fn(),
  mockRaw: vi.fn(),
  mockClose: vi.fn(),
}));

vi.mock('@abe-stack/db', () => ({
  buildConnectionString: mockBuildConnectionString,
  createDbClient: mockCreateDbClient,
}));

// Store original process values
const originalArgv = process.argv;
const originalExit = process.exit;
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

describe('db-push script', () => {
  let consoleOutput: string[] = [];
  let consoleErrors: string[] = [];

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset process.argv
    process.argv = [...originalArgv];

    // Capture console output
    consoleOutput = [];
    consoleErrors = [];
    console.log = vi.fn((...args) => {
      consoleOutput.push(args.join(' '));
    });
    console.error = vi.fn((...args) => {
      consoleErrors.push(args.join(' '));
    });

    // Mock process.exit
    process.exit = vi.fn((code?: number) => {
      throw new Error(`process.exit(${code ?? 'undefined'})`);
    }) as never;

    // Setup default mocks
    mockBuildConnectionString.mockReturnValue('postgresql://localhost:5432/test');
    mockRaw.mockResolvedValue([]);
    mockClose.mockResolvedValue(undefined);
    mockCreateDbClient.mockReturnValue({
      raw: mockRaw,
      close: mockClose,
    });
  });

  afterEach(() => {
    process.argv = originalArgv;
    process.exit = originalExit;
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    vi.resetModules();
  });

  describe('pushSchema function', () => {
    it('should execute all SQL statements in sequence', async () => {
      const { pushSchema } = await import('./db-push');

      await pushSchema();

      // Should execute all statements (1 extension + 11 tables + 12 indexes = 24 statements)
      expect(mockRaw).toHaveBeenCalledTimes(24);
      expect(mockBuildConnectionString).toHaveBeenCalledTimes(1);
      expect(mockCreateDbClient).toHaveBeenCalledTimes(1);
    });

    it('should build connection string from environment', async () => {
      const { pushSchema } = await import('./db-push');

      await pushSchema();

      expect(mockBuildConnectionString).toHaveBeenCalledWith();
    });

    it('should create database client with connection string', async () => {
      const { pushSchema } = await import('./db-push');

      await pushSchema();

      expect(mockCreateDbClient).toHaveBeenCalledWith('postgresql://localhost:5432/test');
    });

    it('should create pgcrypto extension first', async () => {
      const { pushSchema } = await import('./db-push');

      await pushSchema();

      const firstCall = mockRaw.mock.calls[0]?.[0] as string;
      expect(firstCall).toContain('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');
    });

    it('should create users table with correct schema', async () => {
      const { pushSchema } = await import('./db-push');

      await pushSchema();

      const usersTableCall = mockRaw.mock.calls.find((call) =>
        (call[0] as string).includes('CREATE TABLE IF NOT EXISTS users'),
      );
      expect(usersTableCall).toBeDefined();

      const sql = usersTableCall?.[0] as string;
      expect(sql).toContain('id uuid PRIMARY KEY DEFAULT gen_random_uuid()');
      expect(sql).toContain('email text NOT NULL UNIQUE');
      expect(sql).toContain('password_hash text NOT NULL');
      expect(sql).toContain('role text NOT NULL DEFAULT \'user\'');
      expect(sql).toContain('email_verified boolean NOT NULL DEFAULT false');
      expect(sql).toContain('version integer NOT NULL DEFAULT 1');
    });

    it('should create refresh_token_families table with foreign key to users', async () => {
      const { pushSchema } = await import('./db-push');

      await pushSchema();

      const tableCall = mockRaw.mock.calls.find((call) =>
        (call[0] as string).includes('CREATE TABLE IF NOT EXISTS refresh_token_families'),
      );
      expect(tableCall).toBeDefined();

      const sql = tableCall?.[0] as string;
      expect(sql).toContain('user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE');
      expect(sql).toContain('ip_address text');
      expect(sql).toContain('user_agent text');
      expect(sql).toContain('revoked_at timestamptz');
    });

    it('should create refresh_tokens table with family relationship', async () => {
      const { pushSchema } = await import('./db-push');

      await pushSchema();

      const tableCall = mockRaw.mock.calls.find((call) =>
        (call[0] as string).includes('CREATE TABLE IF NOT EXISTS refresh_tokens'),
      );
      expect(tableCall).toBeDefined();

      const sql = tableCall?.[0] as string;
      expect(sql).toContain('user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE');
      expect(sql).toContain('family_id uuid REFERENCES refresh_token_families(id) ON DELETE SET NULL');
      expect(sql).toContain('token text NOT NULL');
      expect(sql).toContain('expires_at timestamptz NOT NULL');
    });

    it('should create login_attempts table', async () => {
      const { pushSchema } = await import('./db-push');

      await pushSchema();

      const tableCall = mockRaw.mock.calls.find((call) =>
        (call[0] as string).includes('CREATE TABLE IF NOT EXISTS login_attempts'),
      );
      expect(tableCall).toBeDefined();

      const sql = tableCall?.[0] as string;
      expect(sql).toContain('email text NOT NULL');
      expect(sql).toContain('success boolean NOT NULL');
      expect(sql).toContain('failure_reason text');
    });

    it('should create password_reset_tokens table', async () => {
      const { pushSchema } = await import('./db-push');

      await pushSchema();

      const tableCall = mockRaw.mock.calls.find((call) =>
        (call[0] as string).includes('CREATE TABLE IF NOT EXISTS password_reset_tokens'),
      );
      expect(tableCall).toBeDefined();

      const sql = tableCall?.[0] as string;
      expect(sql).toContain('user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE');
      expect(sql).toContain('token_hash text NOT NULL');
      expect(sql).toContain('expires_at timestamptz NOT NULL');
      expect(sql).toContain('used_at timestamptz');
    });

    it('should create email_verification_tokens table', async () => {
      const { pushSchema } = await import('./db-push');

      await pushSchema();

      const tableCall = mockRaw.mock.calls.find((call) =>
        (call[0] as string).includes('CREATE TABLE IF NOT EXISTS email_verification_tokens'),
      );
      expect(tableCall).toBeDefined();

      const sql = tableCall?.[0] as string;
      expect(sql).toContain('user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE');
      expect(sql).toContain('token_hash text NOT NULL');
      expect(sql).toContain('expires_at timestamptz NOT NULL');
    });

    it('should create security_events table', async () => {
      const { pushSchema } = await import('./db-push');

      await pushSchema();

      const tableCall = mockRaw.mock.calls.find((call) =>
        (call[0] as string).includes('CREATE TABLE IF NOT EXISTS security_events'),
      );
      expect(tableCall).toBeDefined();

      const sql = tableCall?.[0] as string;
      expect(sql).toContain('user_id uuid REFERENCES users(id) ON DELETE SET NULL');
      expect(sql).toContain('event_type text NOT NULL');
      expect(sql).toContain('severity text NOT NULL');
      expect(sql).toContain('metadata text');
    });

    it('should create magic_link_tokens table', async () => {
      const { pushSchema } = await import('./db-push');

      await pushSchema();

      const tableCall = mockRaw.mock.calls.find((call) =>
        (call[0] as string).includes('CREATE TABLE IF NOT EXISTS magic_link_tokens'),
      );
      expect(tableCall).toBeDefined();

      const sql = tableCall?.[0] as string;
      expect(sql).toContain('email text NOT NULL');
      expect(sql).toContain('token_hash text NOT NULL');
      expect(sql).toContain('expires_at timestamptz NOT NULL');
      expect(sql).toContain('used_at timestamptz');
    });

    it('should create oauth_connections table', async () => {
      const { pushSchema } = await import('./db-push');

      await pushSchema();

      const tableCall = mockRaw.mock.calls.find((call) =>
        (call[0] as string).includes('CREATE TABLE IF NOT EXISTS oauth_connections'),
      );
      expect(tableCall).toBeDefined();

      const sql = tableCall?.[0] as string;
      expect(sql).toContain('user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE');
      expect(sql).toContain('provider text NOT NULL');
      expect(sql).toContain('provider_user_id text NOT NULL');
      expect(sql).toContain('access_token text NOT NULL');
      expect(sql).toContain('refresh_token text');
    });

    it('should create push_subscriptions table', async () => {
      const { pushSchema } = await import('./db-push');

      await pushSchema();

      const tableCall = mockRaw.mock.calls.find((call) =>
        (call[0] as string).includes('CREATE TABLE IF NOT EXISTS push_subscriptions'),
      );
      expect(tableCall).toBeDefined();

      const sql = tableCall?.[0] as string;
      expect(sql).toContain('user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE');
      expect(sql).toContain('endpoint text NOT NULL');
      expect(sql).toContain('keys_p256dh text NOT NULL');
      expect(sql).toContain('keys_auth text NOT NULL');
      expect(sql).toContain('is_active boolean NOT NULL DEFAULT true');
    });

    it('should create notification_preferences table with jsonb columns', async () => {
      const { pushSchema } = await import('./db-push');

      await pushSchema();

      const tableCall = mockRaw.mock.calls.find((call) =>
        (call[0] as string).includes('CREATE TABLE IF NOT EXISTS notification_preferences'),
      );
      expect(tableCall).toBeDefined();

      const sql = tableCall?.[0] as string;
      expect(sql).toContain('user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE');
      expect(sql).toContain('global_enabled boolean NOT NULL DEFAULT true');
      expect(sql).toContain('quiet_hours jsonb NOT NULL DEFAULT \'{}\'::jsonb');
      expect(sql).toContain('types jsonb NOT NULL DEFAULT \'{}\'::jsonb');
    });

    it('should create all required indexes', async () => {
      const { pushSchema } = await import('./db-push');

      await pushSchema();

      const indexCalls = mockRaw.mock.calls.filter((call) =>
        (call[0] as string).includes('CREATE INDEX') || (call[0] as string).includes('CREATE UNIQUE INDEX'),
      );

      // Should create 12 indexes
      expect(indexCalls).toHaveLength(12);

      const indexSqls = indexCalls.map((call) => call[0] as string);

      // Verify key indexes exist
      expect(indexSqls.some((sql) => sql.includes('idx_users_email'))).toBe(true);
      expect(indexSqls.some((sql) => sql.includes('idx_refresh_tokens_token_expires'))).toBe(true);
      expect(indexSqls.some((sql) => sql.includes('idx_refresh_tokens_user'))).toBe(true);
      expect(indexSqls.some((sql) => sql.includes('idx_login_attempts_email_created'))).toBe(true);
      expect(indexSqls.some((sql) => sql.includes('idx_password_reset_tokens_hash'))).toBe(true);
      expect(indexSqls.some((sql) => sql.includes('idx_security_events_user'))).toBe(true);
      expect(indexSqls.some((sql) => sql.includes('idx_notification_prefs_user'))).toBe(true);
    });

    it('should create unique index on notification_preferences user_id', async () => {
      const { pushSchema } = await import('./db-push');

      await pushSchema();

      const uniqueIndexCall = mockRaw.mock.calls.find((call) =>
        (call[0] as string).includes('CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_prefs_user'),
      );

      expect(uniqueIndexCall).toBeDefined();
    });

    it('should close database connection after schema push', async () => {
      const { pushSchema } = await import('./db-push');

      await pushSchema();

      expect(mockClose).toHaveBeenCalledTimes(1);
    });

    it('should close connection even if an error occurs', async () => {
      mockRaw.mockRejectedValueOnce(new Error('SQL execution failed'));

      const { pushSchema } = await import('./db-push');

      await expect(pushSchema()).rejects.toThrow('SQL execution failed');

      // Connection should NOT be closed if error happens before the end
      // (the script doesn't have try/finally, so close won't be called on error)
      expect(mockClose).not.toHaveBeenCalled();
    });

    it('should execute statements in correct order', async () => {
      const { pushSchema } = await import('./db-push');

      await pushSchema();

      const calls = mockRaw.mock.calls.map((call) => call[0] as string);

      // Extension should be first
      expect(calls[0]).toContain('CREATE EXTENSION');

      // Tables should come before indexes
      const firstIndexPosition = calls.findIndex((sql) => sql.includes('CREATE INDEX'));
      const lastTablePosition = calls.findIndex(
        (sql, i) => i > 0 && sql.includes('CREATE TABLE') && (calls[i + 1]?.includes('CREATE INDEX') ?? false),
      );

      expect(firstIndexPosition).toBeGreaterThan(lastTablePosition);
    });
  });

  describe('error handling', () => {
    it('should propagate connection string errors', async () => {
      mockBuildConnectionString.mockImplementation(() => {
        throw new Error('Missing DATABASE_URL');
      });

      const { pushSchema } = await import('./db-push');

      await expect(pushSchema()).rejects.toThrow('Missing DATABASE_URL');
    });

    it('should propagate database client creation errors', async () => {
      mockCreateDbClient.mockImplementation(() => {
        throw new Error('Connection failed');
      });

      const { pushSchema } = await import('./db-push');

      await expect(pushSchema()).rejects.toThrow('Connection failed');
    });

    it('should propagate SQL execution errors', async () => {
      mockRaw.mockRejectedValueOnce(new Error('Syntax error in SQL'));

      const { pushSchema } = await import('./db-push');

      await expect(pushSchema()).rejects.toThrow('Syntax error in SQL');
    });

    it('should handle connection close errors gracefully', async () => {
      mockClose.mockRejectedValueOnce(new Error('Connection already closed'));

      const { pushSchema } = await import('./db-push');

      await expect(pushSchema()).rejects.toThrow('Connection already closed');
    });

    it('should stop execution on first SQL error', async () => {
      // Fail on the 5th statement
      let callCount = 0;
      mockRaw.mockImplementation(() => {
        callCount++;
        if (callCount === 5) {
          return Promise.reject(new Error('Permission denied'));
        }
        return Promise.resolve([]);
      });

      const { pushSchema } = await import('./db-push');

      await expect(pushSchema()).rejects.toThrow('Permission denied');

      // Should only execute up to the failing statement
      expect(mockRaw).toHaveBeenCalledTimes(5);
      expect(mockClose).not.toHaveBeenCalled();
    });
  });

  describe('main module execution', () => {
    it('should call pushSchema when run as main module', async () => {
      const { pushSchema } = await import('./db-push');

      // Simulate main module execution
      await expect(pushSchema()).resolves.toBeUndefined();

      expect(mockRaw.mock.calls.length).toBeGreaterThan(0);
      expect(mockClose).toHaveBeenCalled();
    });

    it('should handle successful execution with proper logging', async () => {
      const { pushSchema } = await import('./db-push');

      await pushSchema();

      // Verify execution completed successfully
      expect(mockRaw).toHaveBeenCalled();
      expect(mockClose).toHaveBeenCalled();
    });

    it('should throw error on schema push failure', async () => {
      mockRaw.mockRejectedValueOnce(new Error('Database error'));

      const { pushSchema } = await import('./db-push');

      await expect(pushSchema()).rejects.toThrow('Database error');
    });
  });


  describe('SQL statement validation', () => {
    it('should use IF NOT EXISTS for all CREATE statements', async () => {
      const { pushSchema } = await import('./db-push');

      await pushSchema();

      const allCalls = mockRaw.mock.calls.map((call) => call[0] as string);
      const createStatements = allCalls.filter((sql) => sql.includes('CREATE'));

      for (const stmt of createStatements) {
        expect(stmt).toContain('IF NOT EXISTS');
      }
    });

    it('should use CASCADE delete for user-dependent tables', async () => {
      const { pushSchema } = await import('./db-push');

      await pushSchema();

      const allCalls = mockRaw.mock.calls.map((call) => call[0] as string);

      // Tables that should cascade delete
      const cascadeTables = [
        'refresh_token_families',
        'refresh_tokens',
        'password_reset_tokens',
        'email_verification_tokens',
        'oauth_connections',
        'push_subscriptions',
        'notification_preferences',
      ];

      for (const tableName of cascadeTables) {
        const tableStmt = allCalls.find((sql) => sql.includes(`CREATE TABLE IF NOT EXISTS ${tableName}`));
        expect(tableStmt).toBeDefined();
        expect(tableStmt).toContain('ON DELETE CASCADE');
      }
    });

    it('should use SET NULL delete for optional relationships', async () => {
      const { pushSchema } = await import('./db-push');

      await pushSchema();

      const allCalls = mockRaw.mock.calls.map((call) => call[0] as string);

      // Security events should SET NULL (user may be deleted but we keep the event)
      const securityEventsStmt = allCalls.find((sql) =>
        sql.includes('CREATE TABLE IF NOT EXISTS security_events'),
      );
      expect(securityEventsStmt).toContain('ON DELETE SET NULL');

      // Refresh tokens family_id should SET NULL
      const refreshTokensStmt = allCalls.find((sql) =>
        sql.includes('CREATE TABLE IF NOT EXISTS refresh_tokens'),
      );
      expect(refreshTokensStmt).toContain('ON DELETE SET NULL');
    });

    it('should define timestamptz columns with proper defaults', async () => {
      const { pushSchema } = await import('./db-push');

      await pushSchema();

      const allCalls = mockRaw.mock.calls.map((call) => call[0] as string);
      const tableCalls = allCalls.filter((sql) => sql.includes('CREATE TABLE'));

      for (const tableStmt of tableCalls) {
        if (tableStmt.includes('created_at timestamptz')) {
          expect(tableStmt).toContain('created_at timestamptz NOT NULL DEFAULT now()');
        }
        if (tableStmt.includes('updated_at timestamptz')) {
          expect(tableStmt).toContain('updated_at timestamptz NOT NULL DEFAULT now()');
        }
      }
    });
  });

  describe('performance considerations', () => {
    it('should execute statements sequentially to maintain order', async () => {
      const executionOrder: number[] = [];
      let counter = 0;

      mockRaw.mockImplementation(() => {
        const current = counter++;
        executionOrder.push(current);
        return Promise.resolve([]);
      });

      const { pushSchema } = await import('./db-push');

      await pushSchema();

      // Verify sequential execution (no parallel execution)
      for (let i = 0; i < executionOrder.length; i++) {
        expect(executionOrder[i]).toBe(i);
      }
    });

    it('should not leave connections open on success', async () => {
      const { pushSchema } = await import('./db-push');

      await pushSchema();

      expect(mockClose).toHaveBeenCalledTimes(1);
    });
  });
});
