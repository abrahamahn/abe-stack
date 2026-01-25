// packages/core/src/infrastructure/logger/console.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createConsoleLogger, LOG_LEVELS, type LogLevel } from './console';

describe('Console Logger', () => {

  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createConsoleLogger', () => {
    it('should create logger with specified level', () => {
      const logger = createConsoleLogger('info');

      expect(logger.level).toBe('info');
      expect(logger.stream).toBeDefined();
      expect(logger.stream.write).toBeInstanceOf(Function);
    });

    it('should accept all log levels', () => {
      const levels: LogLevel[] = ['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent'];

      for (const level of levels) {
        const logger = createConsoleLogger(level);
        expect(logger.level).toBe(level);
      }
    });
  });

  describe('Log Formatting', () => {
    it('should format basic log message', () => {
      const logger = createConsoleLogger('info');
      const logData = JSON.stringify({ level: 30, msg: 'Test message' });

      logger.stream.write(logData);

      expect(console.log).toHaveBeenCalled();
      const output = (console.log as any).mock.calls[0][0];
      expect(output).toContain('INFO');
      expect(output).toContain('Test message');
      expect(output).toContain('server:');
    });

    it('should format log with additional data', () => {
      const logger = createConsoleLogger('info');
      const logData = JSON.stringify({
        level: 30,
        msg: 'User action',
        userId: '123',
        action: 'login',
      });

      logger.stream.write(logData);

      const output = (console.log as any).mock.calls[0][0];
      expect(output).toContain('userId=123');
      expect(output).toContain('action=login');
    });

    it('should handle different log levels correctly', () => {
      const logger = createConsoleLogger('info');

      const testCases = [
        { level: 10, expected: 'TRACE' },
        { level: 20, expected: 'DEBUG' },
        { level: 30, expected: 'INFO' },
        { level: 40, expected: 'WARN' },
        { level: 50, expected: 'ERROR' },
        { level: 60, expected: 'FATAL' },
      ];

      for (const { level, expected } of testCases) {
        vi.clearAllMocks();
        logger.stream.write(JSON.stringify({ level, msg: 'test' }));
        const output = (console.log as any).mock.calls[0][0];
        expect(output).toContain(expected);
      }
    });

    it('should include timestamp in output', () => {
      const logger = createConsoleLogger('info');
      logger.stream.write(JSON.stringify({ level: 30, msg: 'test' }));

      const output = (console.log as any).mock.calls[0][0];
      // Should have timestamp format [HH:MM:SS]
      expect(output).toMatch(/\[\d{2}:\d{2}:\d{2}\]/);
    });

    it('should filter out internal pino fields', () => {
      const logger = createConsoleLogger('info');
      const logData = JSON.stringify({
        level: 30,
        msg: 'test',
        time: 1234567890,
        pid: 12345,
        hostname: 'localhost',
        v: 1,
        customField: 'value',
      });

      logger.stream.write(logData);

      const output = (console.log as any).mock.calls[0][0];
      expect(output).toContain('customField=value');
      expect(output).not.toContain('time=');
      expect(output).not.toContain('pid=');
      expect(output).not.toContain('hostname=');
      expect(output).not.toContain('v=');
    });
  });

  describe('Value Formatting', () => {
    it('should format strings with spaces as JSON', () => {
      const logger = createConsoleLogger('info');
      logger.stream.write(
        JSON.stringify({
          level: 30,
          msg: 'test',
          text: 'hello world',
        }),
      );

      const output = (console.log as any).mock.calls[0][0];
      expect(output).toContain('text="hello world"');
    });

    it('should format strings without spaces as-is', () => {
      const logger = createConsoleLogger('info');
      logger.stream.write(
        JSON.stringify({
          level: 30,
          msg: 'test',
          status: 'active',
        }),
      );

      const output = (console.log as any).mock.calls[0][0];
      expect(output).toContain('status=active');
    });

    it('should format numbers and booleans', () => {
      const logger = createConsoleLogger('info');
      logger.stream.write(
        JSON.stringify({
          level: 30,
          msg: 'test',
          count: 42,
          enabled: true,
        }),
      );

      const output = (console.log as any).mock.calls[0][0];
      expect(output).toContain('count=42');
      expect(output).toContain('enabled=true');
    });

    it('should format null and undefined', () => {
      const logger = createConsoleLogger('info');
      logger.stream.write(
        JSON.stringify({
          level: 30,
          msg: 'test',
          nullValue: null,
        }),
      );

      const output = (console.log as any).mock.calls[0][0];
      expect(output).toContain('nullValue=null');
    });

    it('should format objects as JSON', () => {
      const logger = createConsoleLogger('info');
      logger.stream.write(
        JSON.stringify({
          level: 30,
          msg: 'test',
          data: { id: 1, name: 'test' },
        }),
      );

      const output = (console.log as any).mock.calls[0][0];
      expect(output).toContain('data=');
      expect(output).toContain('"id":1');
    });

    it('should truncate long values', () => {
      const logger = createConsoleLogger('info');
      const longValue = 'a'.repeat(300);
      logger.stream.write(
        JSON.stringify({
          level: 30,
          msg: 'test',
          longField: longValue,
        }),
      );

      const output = (console.log as any).mock.calls[0][0];
      expect(output).toContain('...');
      expect(output.length).toBeLessThan(longValue.length + 100);
    });

    it('should handle Error objects', () => {
      const logger = createConsoleLogger('info');
      const error = new Error('Test error');
      logger.stream.write(
        JSON.stringify({
          level: 50,
          msg: 'error occurred',
          err: { message: error.message },
        }),
      );

      const output = (console.log as any).mock.calls[0][0];
      expect(output).toContain('Test error');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty lines', () => {
      const logger = createConsoleLogger('info');
      logger.stream.write('');
      logger.stream.write('   ');

      expect(console.log).not.toHaveBeenCalled();
    });

    it('should handle invalid JSON gracefully', () => {
      const logger = createConsoleLogger('info');
      logger.stream.write('not json');

      expect(console.log).toHaveBeenCalledWith('not json');
    });

    it('should handle log without message', () => {
      const logger = createConsoleLogger('info');
      logger.stream.write(JSON.stringify({ level: 30 }));

      expect(console.log).toHaveBeenCalled();
      const output = (console.log as any).mock.calls[0][0];
      expect(output).toContain('INFO');
    });

    it('should handle log without level', () => {
      const logger = createConsoleLogger('info');
      logger.stream.write(JSON.stringify({ msg: 'test' }));

      expect(console.log).toHaveBeenCalled();
      const output = (console.log as any).mock.calls[0][0];
      expect(output).toContain('INFO'); // Defaults to INFO (level 30)
    });

    it('should filter undefined values from data', () => {
      const logger = createConsoleLogger('info');
      logger.stream.write(
        JSON.stringify({
          level: 30,
          msg: 'test',
          defined: 'value',
          undefined: undefined,
        }),
      );

      const output = (console.log as any).mock.calls[0][0];
      expect(output).toContain('defined=value');
      expect(output).not.toContain('undefined');
    });
  });

  describe('LOG_LEVELS constant', () => {
    it('should have correct level values', () => {
      expect(LOG_LEVELS.trace).toBe(10);
      expect(LOG_LEVELS.debug).toBe(20);
      expect(LOG_LEVELS.info).toBe(30);
      expect(LOG_LEVELS.warn).toBe(40);
      expect(LOG_LEVELS.error).toBe(50);
      expect(LOG_LEVELS.fatal).toBe(60);
      expect(LOG_LEVELS.silent).toBe(100);
    });
  });
});
