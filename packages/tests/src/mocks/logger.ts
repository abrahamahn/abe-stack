// packages/tests/src/mocks/logger.ts
/**
 * Mock Logger Factory
 *
 * Creates mock logger instances for testing.
 * Compatible with the Logger interface from @abe-stack/core.
 */

import { vi } from 'vitest';

/**
 * Logger interface matching @shared/types Logger
 */
export interface MockLogger {
  info: ReturnType<typeof vi.fn>;
  warn: ReturnType<typeof vi.fn>;
  error: ReturnType<typeof vi.fn>;
  debug: ReturnType<typeof vi.fn>;
  child?: ReturnType<typeof vi.fn>;
}

/**
 * Create a mock logger with vi.fn() for all methods
 */
export function createMockLogger(): MockLogger {
  const mockLogger: MockLogger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: vi.fn(),
  };

  // Make child() return a new mock logger
  mockLogger.child?.mockReturnValue(createMockLogger());

  return mockLogger;
}

/**
 * Create a mock logger that captures all log calls
 * Useful for asserting on log messages
 */
export interface CapturedLog {
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  data?: Record<string, unknown>;
}

export interface CapturingLogger extends MockLogger {
  getLogs(): CapturedLog[];
  clearLogs(): void;
}

export function createCapturingLogger(): CapturingLogger {
  const logs: CapturedLog[] = [];

  const capture =
    (level: CapturedLog['level']) =>
    (message: string, data?: Record<string, unknown>) => {
      logs.push({ level, message, data });
    };

  return {
    info: vi.fn(capture('info')),
    warn: vi.fn(capture('warn')),
    error: vi.fn(capture('error')),
    debug: vi.fn(capture('debug')),
    child: vi.fn(() => createCapturingLogger()),
    getLogs: () => [...logs],
    clearLogs: () => {
      logs.length = 0;
    },
  };
}
