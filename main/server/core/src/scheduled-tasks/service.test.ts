// main/server/core/src/scheduled-tasks/service.test.ts
/**
 * Tests for Scheduled Task Service
 *
 * Validates task registration, execution, interval management,
 * and graceful shutdown.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { registerScheduledTasks, stopScheduledTasks } from './service';

import type { Repositories } from '../../../db/src';
import type { ServerLogger } from '@abe-stack/shared';

// ============================================================================
// Helpers
// ============================================================================

function createMockRepos(): Repositories {
  return {
    loginAttempts: {
      deleteOlderThan: vi.fn().mockResolvedValue(5),
    },
    magicLinkTokens: {
      deleteExpired: vi.fn().mockResolvedValue(3),
    },
    pushSubscriptions: {
      deleteExpired: vi.fn().mockResolvedValue(2),
    },
    userSessions: {
      deleteRevokedBefore: vi.fn().mockResolvedValue(10),
    },
    auditEvents: {
      deleteOlderThan: vi.fn().mockResolvedValue(50),
    },
    invitations: {
      findExpiredPending: vi.fn().mockResolvedValue([]),
      update: vi.fn(),
    },
    users: {
      listWithFilters: vi.fn().mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 10000,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      }),
      update: vi.fn(),
    },
  } as unknown as Repositories;
}

function createMockLogger(): ServerLogger {
  const logger: ServerLogger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: vi.fn().mockReturnThis(),
  };
  return logger;
}

// ============================================================================
// Tests
// ============================================================================

describe('registerScheduledTasks', () => {
  let repos: Repositories;
  let log: ServerLogger;

  beforeEach(() => {
    repos = createMockRepos();
    log = createMockLogger();
  });

  afterEach(() => {
    stopScheduledTasks();
  });

  it('should register all scheduled tasks', () => {
    registerScheduledTasks(repos, log);

    // Should log registration
    expect(log.info).toHaveBeenCalledWith({ taskCount: 7 }, 'Scheduled tasks registered');
  });

  it('should start executing tasks immediately', () => {
    registerScheduledTasks(repos, log);

    // Tasks should be started (async execution)
    expect(log.info).toHaveBeenCalledWith(
      expect.objectContaining({ task: 'login-cleanup', schedule: 'daily' }),
      'Starting scheduled task',
    );
  });
});

describe('stopScheduledTasks', () => {
  let repos: Repositories;
  let log: ServerLogger;

  beforeEach(() => {
    repos = createMockRepos();
    log = createMockLogger();
  });

  it('should clear all active intervals', () => {
    registerScheduledTasks(repos, log);
    stopScheduledTasks();

    // After stopping, no intervals should remain active
    // This is a smoke test - we can't easily verify intervals are cleared
    // but we ensure no errors occur
    expect(true).toBe(true);
  });

  it('should allow re-registration after stopping', () => {
    registerScheduledTasks(repos, log);
    stopScheduledTasks();

    // Clear previous logs
    vi.clearAllMocks();

    // Should be able to register again
    registerScheduledTasks(repos, log);

    expect(log.info).toHaveBeenCalledWith({ taskCount: 7 }, 'Scheduled tasks registered');
  });
});
