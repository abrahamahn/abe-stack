// core/src/infrastructure/logger/base-logger.test.ts
/**
 * Base Logger Adapter Tests
 *
 * Tests for the framework-agnostic logger wrapper functions:
 * createLogger, createRequestLogger, createJobCorrelationId, createJobLogger.
 */
import { describe, expect, test, vi, type Mock } from 'vitest';

import {
  createJobCorrelationId,
  createJobLogger,
  createLogger,
  createRequestLogger,
  type BaseLogger,
} from './base-logger';

// ============================================================================
// Test Helpers
// ============================================================================

interface MockBaseLogger {
  trace: Mock;
  debug: Mock;
  info: Mock;
  warn: Mock;
  error: Mock;
  fatal: Mock;
  child: Mock;
}

function createMockBaseLogger(): MockBaseLogger {
  const mock: MockBaseLogger = {
    trace: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
    child: vi.fn(),
  };
  mock.child.mockReturnValue(mock);
  return mock;
}

// ============================================================================
// createLogger Tests
// ============================================================================

describe('createLogger', () => {
  test('should log info messages with data-first delegation', () => {
    const base = createMockBaseLogger();
    const logger = createLogger(base as unknown as BaseLogger);

    logger.info('Test message', { userId: '123' });

    expect(base.info).toHaveBeenCalledWith({ userId: '123' }, 'Test message');
  });

  test('should log all severity levels', () => {
    const base = createMockBaseLogger();
    const logger = createLogger(base as unknown as BaseLogger);

    logger.trace('trace message');
    logger.debug('debug message');
    logger.info('info message');
    logger.warn('warn message');
    logger.error('error message');
    logger.fatal('fatal message');

    expect(base.trace).toHaveBeenCalledWith({}, 'trace message');
    expect(base.debug).toHaveBeenCalledWith({}, 'debug message');
    expect(base.info).toHaveBeenCalledWith({}, 'info message');
    expect(base.warn).toHaveBeenCalledWith({}, 'warn message');
    expect(base.error).toHaveBeenCalledWith({}, 'error message');
    expect(base.fatal).toHaveBeenCalledWith({}, 'fatal message');
  });

  test('should include static context in all log calls', () => {
    const base = createMockBaseLogger();
    const logger = createLogger(base as unknown as BaseLogger, { correlationId: 'abc-123' });

    logger.info('Test message');

    expect(base.info).toHaveBeenCalledWith({ correlationId: 'abc-123' }, 'Test message');
  });

  test('should merge per-call data with static context', () => {
    const base = createMockBaseLogger();
    const logger = createLogger(base as unknown as BaseLogger, { service: 'auth' });

    logger.info('Login attempt', { userId: 'user-1' });

    expect(base.info).toHaveBeenCalledWith({ service: 'auth', userId: 'user-1' }, 'Login attempt');
  });

  test('should allow per-call data to override static context', () => {
    const base = createMockBaseLogger();
    const logger = createLogger(base as unknown as BaseLogger, { component: 'default' });

    logger.info('Override test', { component: 'auth' });

    expect(base.info).toHaveBeenCalledWith({ component: 'auth' }, 'Override test');
  });

  test('should handle error with Error object', () => {
    const base = createMockBaseLogger();
    const logger = createLogger(base as unknown as BaseLogger);
    const error = new Error('Test error');

    logger.error(error);

    expect(base.error).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Test error',
        errorName: 'Error',
        stack: expect.any(String) as unknown,
      }),
      'Test error',
    );
  });

  test('should handle error with string message', () => {
    const base = createMockBaseLogger();
    const logger = createLogger(base as unknown as BaseLogger);

    logger.error('Something went wrong', { details: 'info' });

    expect(base.error).toHaveBeenCalledWith({ details: 'info' }, 'Something went wrong');
  });

  test('should merge additional data with Error object', () => {
    const base = createMockBaseLogger();
    const logger = createLogger(base as unknown as BaseLogger);
    const error = new Error('Failure');

    logger.error(error, { requestId: 'req-1' });

    expect(base.error).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Failure',
        errorName: 'Error',
        requestId: 'req-1',
      }),
      'Failure',
    );
  });

  test('should handle fatal with Error object', () => {
    const base = createMockBaseLogger();
    const logger = createLogger(base as unknown as BaseLogger);
    const error = new Error('Critical');

    logger.fatal(error, { component: 'db' });

    expect(base.fatal).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Critical',
        errorName: 'Error',
        component: 'db',
      }),
      'Critical',
    );
  });

  test('should handle fatal with string message', () => {
    const base = createMockBaseLogger();
    const logger = createLogger(base as unknown as BaseLogger);

    logger.fatal('System down', { uptime: 3600 });

    expect(base.fatal).toHaveBeenCalledWith({ uptime: 3600 }, 'System down');
  });

  test('should create child logger with merged context', () => {
    const base = createMockBaseLogger();
    const childBase = createMockBaseLogger();
    base.child.mockReturnValue(childBase);

    const logger = createLogger(base as unknown as BaseLogger, { correlationId: 'abc-123' });
    const child = logger.child({ module: 'auth' });

    expect(base.child).toHaveBeenCalledWith({ module: 'auth' });

    child.info('Child message');
    expect(childBase.info).toHaveBeenCalledWith(
      { correlationId: 'abc-123', module: 'auth' },
      'Child message',
    );
  });

  test('should handle logging without any data', () => {
    const base = createMockBaseLogger();
    const logger = createLogger(base as unknown as BaseLogger);

    logger.info('No data message');

    expect(base.info).toHaveBeenCalledWith({}, 'No data message');
  });
});

// ============================================================================
// createRequestLogger Tests
// ============================================================================

describe('createRequestLogger', () => {
  test('should create logger with correlation ID context', () => {
    const base = createMockBaseLogger();

    const logger = createRequestLogger(base as unknown as BaseLogger, {
      correlationId: 'corr-123',
      requestId: 'req-456',
      method: 'GET',
      path: '/test',
      ip: '127.0.0.1',
    });

    logger.info('Test message');

    expect(base.info).toHaveBeenCalledWith(
      expect.objectContaining({
        correlationId: 'corr-123',
        requestId: 'req-456',
      }),
      'Test message',
    );
  });

  test('should merge additional data with request context', () => {
    const base = createMockBaseLogger();

    const logger = createRequestLogger(base as unknown as BaseLogger, {
      correlationId: 'corr-123',
      requestId: 'req-456',
      method: 'POST',
      path: '/api/users',
      ip: '10.0.0.1',
    });

    logger.info('Processing', { action: 'create' });

    expect(base.info).toHaveBeenCalledWith(
      expect.objectContaining({
        correlationId: 'corr-123',
        requestId: 'req-456',
        action: 'create',
      }),
      'Processing',
    );
  });

  test('should create logger that supports child creation', () => {
    const base = createMockBaseLogger();
    const childBase = createMockBaseLogger();
    base.child.mockReturnValue(childBase);

    const logger = createRequestLogger(base as unknown as BaseLogger, {
      correlationId: 'corr-123',
      requestId: 'req-456',
      method: 'GET',
      path: '/test',
      ip: '127.0.0.1',
    });

    const childLogger = logger.child({ module: 'auth' });
    childLogger.info('Child message');

    expect(base.child).toHaveBeenCalledWith({ module: 'auth' });
  });
});

// ============================================================================
// createJobCorrelationId Tests
// ============================================================================

describe('createJobCorrelationId', () => {
  test('should create correlation ID with job prefix', () => {
    const correlationId = createJobCorrelationId('email-sender');

    expect(correlationId).toMatch(/^job:email-sender:/);
  });

  test('should include unique identifier after prefix', () => {
    const id1 = createJobCorrelationId('test-job');
    const id2 = createJobCorrelationId('test-job');

    expect(id1).not.toBe(id2);
  });

  test('should handle different job names', () => {
    const emailJob = createJobCorrelationId('email-sender');
    const cleanupJob = createJobCorrelationId('cleanup-task');

    expect(emailJob).toContain('email-sender');
    expect(cleanupJob).toContain('cleanup-task');
  });

  test('should produce well-formed correlation ID', () => {
    const id = createJobCorrelationId('my-job');

    // Format: job:{name}:{uuid}
    const parts = id.split(':');
    expect(parts[0]).toBe('job');
    expect(parts[1]).toBe('my-job');
    expect(parts.length).toBeGreaterThanOrEqual(3);
  });
});

// ============================================================================
// createJobLogger Tests
// ============================================================================

describe('createJobLogger', () => {
  test('should create logger with job context', () => {
    const base = createMockBaseLogger();

    const logger = createJobLogger(base as unknown as BaseLogger, 'test-job');

    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.debug).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.trace).toBe('function');
    expect(typeof logger.fatal).toBe('function');
    expect(typeof logger.child).toBe('function');
  });

  test('should log with auto-generated job correlation ID', () => {
    const base = createMockBaseLogger();

    const logger = createJobLogger(base as unknown as BaseLogger, 'email-sender');
    logger.info('Sending email');

    expect(base.info).toHaveBeenCalledWith(
      expect.objectContaining({
        correlationId: expect.stringMatching(/^job:email-sender:/) as unknown,
        requestId: expect.stringMatching(/^job:email-sender:/) as unknown,
      }),
      'Sending email',
    );
  });

  test('should use provided jobId when given', () => {
    const base = createMockBaseLogger();

    const logger = createJobLogger(base as unknown as BaseLogger, 'test-job', 'custom-job-id-123');
    logger.info('Processing');

    expect(base.info).toHaveBeenCalledWith(
      expect.objectContaining({
        correlationId: 'custom-job-id-123',
        requestId: 'custom-job-id-123',
      }),
      'Processing',
    );
  });

  test('should generate unique correlationId when jobId not provided', () => {
    const base1 = createMockBaseLogger();
    const base2 = createMockBaseLogger();

    const logger1 = createJobLogger(base1 as unknown as BaseLogger, 'auto-id-job');
    const logger2 = createJobLogger(base2 as unknown as BaseLogger, 'auto-id-job');

    logger1.info('msg1');
    logger2.info('msg2');

    const call1Data = base1.info.mock.calls[0][0] as Record<string, unknown>;
    const call2Data = base2.info.mock.calls[0][0] as Record<string, unknown>;

    expect(call1Data['correlationId']).not.toBe(call2Data['correlationId']);
  });
});
