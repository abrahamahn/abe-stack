// apps/server/src/logger/logger.test.ts
/**
 * Logger Service Tests
 *
 * Tests for the Fastify-specific logger wrappers (createLogger, createRequestLogger).
 * Pure utility tests (correlation ID, log levels, shouldLog) are in core.
 */
import { describe, expect, test, vi, type Mock } from 'vitest';

import { createLogger, createRequestLogger } from './logger';

interface MockBaseLogger {
  trace: Mock;
  debug: Mock;
  info: Mock;
  warn: Mock;
  error: Mock;
  fatal: Mock;
  child: Mock;
}

describe('Logger', () => {
  const createMockBaseLogger = (): MockBaseLogger => ({
    trace: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
    child: vi.fn().mockReturnThis(),
  });

  describe('createLogger', () => {
    test('should log info messages', () => {
      const baseLogger = createMockBaseLogger();
      const logger = createLogger(baseLogger as never);

      logger.info('Test message', { userId: '123' });

      expect(baseLogger.info).toHaveBeenCalledWith({ userId: '123' }, 'Test message');
    });

    test('should log error with Error object', () => {
      const baseLogger = createMockBaseLogger();
      const logger = createLogger(baseLogger as never);
      const error = new Error('Test error');

      logger.error(error);

      expect(baseLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Test error',
          errorName: 'Error',
          stack: expect.any(String) as unknown,
        }),
        'Test error',
      );
    });

    test('should log error with string message', () => {
      const baseLogger = createMockBaseLogger();
      const logger = createLogger(baseLogger as never);

      logger.error('Something went wrong', { details: 'info' });

      expect(baseLogger.error).toHaveBeenCalledWith({ details: 'info' }, 'Something went wrong');
    });

    test('should include context in all logs', () => {
      const baseLogger = createMockBaseLogger();
      const logger = createLogger(baseLogger as never, { correlationId: 'abc-123' });

      logger.info('Test message');

      expect(baseLogger.info).toHaveBeenCalledWith({ correlationId: 'abc-123' }, 'Test message');
    });

    test('should create child logger with merged context', () => {
      const baseLogger = createMockBaseLogger();
      const childLogger = createMockBaseLogger();
      baseLogger.child.mockReturnValue(childLogger);

      const logger = createLogger(baseLogger as never, { correlationId: 'abc-123' });
      logger.child?.({ userId: 'user-1' });

      expect(baseLogger.child).toHaveBeenCalledWith({ userId: 'user-1' });
    });

    test('should log all severity levels', () => {
      const baseLogger = createMockBaseLogger();
      const logger = createLogger(baseLogger as never);

      logger.trace?.('trace message');
      logger.debug('debug message');
      logger.info('info message');
      logger.warn('warn message');
      logger.error('error message');
      logger.fatal?.('fatal message');

      expect(baseLogger.trace).toHaveBeenCalled();
      expect(baseLogger.debug).toHaveBeenCalled();
      expect(baseLogger.info).toHaveBeenCalled();
      expect(baseLogger.warn).toHaveBeenCalled();
      expect(baseLogger.error).toHaveBeenCalled();
      expect(baseLogger.fatal).toHaveBeenCalled();
    });

    test('should merge additional data with Error object', () => {
      const baseLogger = createMockBaseLogger();
      const logger = createLogger(baseLogger as never);
      const error = new Error('Failure');

      logger.error(error, { requestId: 'req-1' });

      expect(baseLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Failure',
          errorName: 'Error',
          requestId: 'req-1',
        }),
        'Failure',
      );
    });

    test('should handle fatal with Error object', () => {
      const baseLogger = createMockBaseLogger();
      const logger = createLogger(baseLogger as never);
      const error = new Error('Critical');

      logger.fatal?.(error, { component: 'db' });

      expect(baseLogger.fatal).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Critical',
          errorName: 'Error',
          component: 'db',
        }),
        'Critical',
      );
    });
  });

  describe('createRequestLogger', () => {
    test('should create logger with correlation ID context', () => {
      const baseLogger = createMockBaseLogger();

      const logger = createRequestLogger(baseLogger as never, {
        correlationId: 'corr-123',
        requestId: 'req-456',
        method: 'GET',
        path: '/test',
        ip: '127.0.0.1',
      });

      logger.info('Test message');

      expect(baseLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          correlationId: 'corr-123',
          requestId: 'req-456',
        }),
        'Test message',
      );
    });

    test('should create logger that supports child creation', () => {
      const baseLogger = createMockBaseLogger();
      const childBaseLogger = createMockBaseLogger();
      baseLogger.child.mockReturnValue(childBaseLogger);

      const logger = createRequestLogger(baseLogger as never, {
        correlationId: 'corr-123',
        requestId: 'req-456',
        method: 'GET',
        path: '/test',
        ip: '127.0.0.1',
      });

      const childLogger = logger.child?.({ module: 'auth' });
      childLogger?.info('Child message');

      expect(baseLogger.child).toHaveBeenCalledWith({ module: 'auth' });
    });
  });
});
