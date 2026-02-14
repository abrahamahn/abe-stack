// main/shared/src/logger/console.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CONSOLE_LOG_LEVELS, createConsoleLogger, type ConsoleLogLevel } from './console';

describe('Console Logger', () => {
  beforeEach(() => {
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createConsoleLogger', () => {
    it('should create logger with specified level', () => {
      const logger = createConsoleLogger('info');
      expect(logger.level).toBe('info');
      expect(logger.stream.write).toBeInstanceOf(Function);
    });

    it('should accept all log levels', () => {
      const levels: ConsoleLogLevel[] = [
        'trace',
        'debug',
        'info',
        'warn',
        'error',
        'fatal',
        'silent',
      ];
      for (const level of levels) {
        expect(createConsoleLogger(level).level).toBe(level);
      }
    });
  });

  describe('JSON formatting', () => {
    it('should pretty print CRUD JSON output with indentation', () => {
      const logger = createConsoleLogger('info');
      logger.stream.write(
        JSON.stringify({
          level: 30,
          time: 1770998113981,
          msg: 'request',
          method: 'GET',
          path: '/api/users',
          statusCode: 200,
        }),
      );

      const calls = vi.mocked(process.stdout.write).mock.calls;
      const prefix = String(calls[0]?.[0] ?? '');
      expect(prefix).toMatch(/^\[\d{2}:\d{2}:\d{2}\]\s+INFO\s+\|/);
      expect(prefix).toContain('INFO');
      expect(prefix).toContain('|');
      expect(prefix).toContain('\n  "method": "GET"');
      expect(prefix).toContain('\n  "path": "/api/users"');
      expect(prefix).not.toContain('"level"');
      expect(prefix).not.toContain('"time": 1770998113981');
    });

    it('should normalize numeric pino levels to labels', () => {
      const logger = createConsoleLogger('info');
      const cases: Array<{ inLevel: number; outLevel: string }> = [
        { inLevel: 10, outLevel: 'TRACE' },
        { inLevel: 20, outLevel: 'DEBUG' },
        { inLevel: 30, outLevel: 'INFO' },
        { inLevel: 40, outLevel: 'WARN' },
        { inLevel: 50, outLevel: 'ERROR' },
        { inLevel: 60, outLevel: 'FATAL' },
      ];

      for (const { inLevel, outLevel } of cases) {
        vi.clearAllMocks();
        logger.stream.write(JSON.stringify({ level: inLevel, msg: 'request', method: 'GET' }));
        const prefix = String(vi.mocked(process.stdout.write).mock.calls[0]?.[0] ?? '');
        expect(prefix).toContain(outLevel);
      }
    });

    it('should default missing level to INFO', () => {
      const logger = createConsoleLogger('info');
      logger.stream.write(JSON.stringify({ msg: 'request', method: 'POST' }));
      const prefix = String(vi.mocked(process.stdout.write).mock.calls[0]?.[0] ?? '');
      expect(prefix).toContain('INFO');
    });

    it('should colorize output in TTY terminals', () => {
      const originalNoColor = process.env['NO_COLOR'];
      const originalForceColor = process.env['FORCE_COLOR'];
      delete process.env['NO_COLOR'];
      process.env['FORCE_COLOR'] = 'true';
      const logger = createConsoleLogger('info');
      logger.stream.write(JSON.stringify({ level: 30, msg: 'request', method: 'GET', ok: true }));

      const output = String(vi.mocked(process.stdout.write).mock.calls[0]?.[0] ?? '');
      expect(output).toContain('\u001B[');
      if (originalNoColor !== undefined) {
        process.env['NO_COLOR'] = originalNoColor;
      }
      if (originalForceColor !== undefined) {
        process.env['FORCE_COLOR'] = originalForceColor;
      } else {
        delete process.env['FORCE_COLOR'];
      }
    });

    it('should format each JSON line when multiple logs arrive in one chunk', () => {
      const logger = createConsoleLogger('info');
      const chunk =
        `${JSON.stringify({ level: 30, msg: 'request', path: '/first' })}\n` +
        `${JSON.stringify({ level: 40, msg: 'request', path: '/second' })}\n`;

      logger.stream.write(chunk);

      const calls = vi.mocked(process.stdout.write).mock.calls;
      expect(calls.length).toBe(2);
      expect(String(calls[0]?.[0] ?? '')).toContain('"path": "/first"');
      expect(String(calls[1]?.[0] ?? '')).toContain('"path": "/second"');
    });
  });

  describe('status formatting', () => {
    it('should print startup logs as single-line status messages', () => {
      const logger = createConsoleLogger('info');
      logger.stream.write(JSON.stringify({ level: 30, msg: 'WebSocket connected' }));

      const output = String(vi.mocked(process.stdout.write).mock.calls[0]?.[0] ?? '');
      expect(output).toContain('INFO');
      expect(output).toContain('WebSocket connected');
      expect(output).not.toContain('\n  "msg"');
    });
  });

  describe('edge cases', () => {
    it('should skip empty lines', () => {
      const logger = createConsoleLogger('info');
      logger.stream.write('');
      logger.stream.write('   ');
      expect(process.stdout.write).not.toHaveBeenCalled();
    });

    it('should pass through invalid JSON unchanged', () => {
      const logger = createConsoleLogger('info');
      logger.stream.write('not json');
      expect(process.stdout.write).toHaveBeenCalledWith('not json\n');
    });
  });

  describe('CONSOLE_LOG_LEVELS', () => {
    it('should have expected values', () => {
      expect(CONSOLE_LOG_LEVELS.trace).toBe(10);
      expect(CONSOLE_LOG_LEVELS.debug).toBe(20);
      expect(CONSOLE_LOG_LEVELS.info).toBe(30);
      expect(CONSOLE_LOG_LEVELS.warn).toBe(40);
      expect(CONSOLE_LOG_LEVELS.error).toBe(50);
      expect(CONSOLE_LOG_LEVELS.fatal).toBe(60);
      expect(CONSOLE_LOG_LEVELS.silent).toBe(100);
    });
  });
});
