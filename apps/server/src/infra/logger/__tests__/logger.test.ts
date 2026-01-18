// apps/server/src/infra/logger/__tests__/logger.test.ts
import {
  createLogger,
  createRequestContext,
  createRequestLogger,
  generateCorrelationId,
  getOrCreateCorrelationId,
  LOG_LEVELS,
  shouldLog,
} from '@infra/logger/logger';
import { describe, expect, test, vi, type Mock } from 'vitest';


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
      logger.child({ userId: 'user-1' });

      expect(baseLogger.child).toHaveBeenCalledWith({ userId: 'user-1' });
    });

    test('should log all severity levels', () => {
      const baseLogger = createMockBaseLogger();
      const logger = createLogger(baseLogger as never);

      logger.trace('trace message');
      logger.debug('debug message');
      logger.info('info message');
      logger.warn('warn message');
      logger.error('error message');
      logger.fatal('fatal message');

      expect(baseLogger.trace).toHaveBeenCalled();
      expect(baseLogger.debug).toHaveBeenCalled();
      expect(baseLogger.info).toHaveBeenCalled();
      expect(baseLogger.warn).toHaveBeenCalled();
      expect(baseLogger.error).toHaveBeenCalled();
      expect(baseLogger.fatal).toHaveBeenCalled();
    });
  });

  describe('generateCorrelationId', () => {
    test('should generate unique UUID', () => {
      const id1 = generateCorrelationId();
      const id2 = generateCorrelationId();

      expect(id1).toMatch(/^[0-9a-f-]{36}$/);
      expect(id2).toMatch(/^[0-9a-f-]{36}$/);
      expect(id1).not.toBe(id2);
    });
  });

  describe('getOrCreateCorrelationId', () => {
    test('should use x-correlation-id header if present', () => {
      const headers = { 'x-correlation-id': 'existing-id' };
      const result = getOrCreateCorrelationId(headers);

      expect(result).toBe('existing-id');
    });

    test('should use x-request-id header if present', () => {
      const headers = { 'x-request-id': 'request-id' };
      const result = getOrCreateCorrelationId(headers);

      expect(result).toBe('request-id');
    });

    test('should extract trace-id from traceparent header', () => {
      const headers = { traceparent: '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01' };
      const result = getOrCreateCorrelationId(headers);

      expect(result).toBe('0af7651916cd43dd8448eb211c80319c');
    });

    test('should generate new ID if no header present', () => {
      const headers = {};
      const result = getOrCreateCorrelationId(headers);

      expect(result).toMatch(/^[0-9a-f-]{36}$/);
    });

    test('should prioritize x-correlation-id over x-request-id', () => {
      const headers = {
        'x-correlation-id': 'correlation-id',
        'x-request-id': 'request-id',
      };
      const result = getOrCreateCorrelationId(headers);

      expect(result).toBe('correlation-id');
    });
  });

  describe('createRequestContext', () => {
    test('should create context with all fields', () => {
      const context = createRequestContext(
        'correlation-123',
        {
          id: 'req-456',
          method: 'POST',
          url: '/api/users',
          ip: '192.168.1.1',
          headers: { 'user-agent': 'TestAgent/1.0' },
        },
        'user-789',
      );

      expect(context).toEqual({
        correlationId: 'correlation-123',
        requestId: 'req-456',
        method: 'POST',
        path: '/api/users',
        ip: '192.168.1.1',
        userAgent: 'TestAgent/1.0',
        userId: 'user-789',
      });
    });

    test('should handle missing user agent', () => {
      const context = createRequestContext('correlation-123', {
        id: 'req-456',
        method: 'GET',
        url: '/health',
        ip: '127.0.0.1',
        headers: {},
      });

      expect(context.userAgent).toBeUndefined();
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
  });

  describe('shouldLog', () => {
    test('should return true when message level is higher or equal', () => {
      expect(shouldLog('error', 'info')).toBe(true);
      expect(shouldLog('warn', 'warn')).toBe(true);
      expect(shouldLog('fatal', 'trace')).toBe(true);
    });

    test('should return false when message level is lower', () => {
      expect(shouldLog('debug', 'info')).toBe(false);
      expect(shouldLog('trace', 'warn')).toBe(false);
      expect(shouldLog('info', 'error')).toBe(false);
    });
  });

  describe('LOG_LEVELS', () => {
    test('should have correct ordering', () => {
      expect(LOG_LEVELS.trace).toBeLessThan(LOG_LEVELS.debug);
      expect(LOG_LEVELS.debug).toBeLessThan(LOG_LEVELS.info);
      expect(LOG_LEVELS.info).toBeLessThan(LOG_LEVELS.warn);
      expect(LOG_LEVELS.warn).toBeLessThan(LOG_LEVELS.error);
      expect(LOG_LEVELS.error).toBeLessThan(LOG_LEVELS.fatal);
    });
  });
});
