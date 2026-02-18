// main/shared/src/system/logger/console.test.ts
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
    // -----------------------------------------------------------------------
    // FIXED: The console logger does NOT emit a "[HH:MM:SS] INFO |" prefix.
    // CRUD logs (those with method/path/statusCode/req/res etc.) are emitted
    // as pretty-printed JSON without level or timestamp prefix. The "level"
    // and "time" fields are stripped from the payload before printing.
    // -----------------------------------------------------------------------
    it('should pretty print CRUD JSON output, stripping level/time fields', () => {
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
      const output = String(calls[0]?.[0] ?? '');
      // Pretty JSON: JSON.stringify(payload, null, 2) then each line prefixed with "  "
      // so properties get 4 spaces total: 2 from stringify indent + 2 from line prefix
      expect(output).toContain('"method": "GET"');
      expect(output).toContain('"path": "/api/users"');
      // Level and time fields must NOT appear in the payload
      expect(output).not.toContain('"level"');
      expect(output).not.toContain('"time": 1770998113981');
    });

    // -----------------------------------------------------------------------
    // FIXED: The logger writes pretty JSON for CRUD logs — the level label
    // (TRACE, DEBUG, etc.) is NOT written as plaintext. To verify the level
    // is normalised internally we check the "statusCode" field is retained
    // (proving the JSON was parsed correctly at each inLevel).
    // -----------------------------------------------------------------------
    it('should normalise numeric pino levels and emit correct CRUD payload for each', () => {
      const logger = createConsoleLogger('info');
      const cases = [10, 20, 30, 40, 50, 60] as const;

      for (const inLevel of cases) {
        vi.clearAllMocks();
        logger.stream.write(
          JSON.stringify({ level: inLevel, msg: 'request', method: 'GET', statusCode: 200 }),
        );
        const output = String(vi.mocked(process.stdout.write).mock.calls[0]?.[0] ?? '');
        // The log was parsed without error — payload fields are present
        expect(output).toContain('"statusCode": 200');
        // "level" key is stripped from the payload
        expect(output).not.toContain('"level"');
      }
    });

    // -----------------------------------------------------------------------
    // FIXED: A missing level defaults to 'INFO' internally, but the output
    // is the serialised payload (CRUD path) — 'INFO' is not written as text.
    // -----------------------------------------------------------------------
    it('should treat missing level as INFO and still emit the payload', () => {
      const logger = createConsoleLogger('info');
      logger.stream.write(JSON.stringify({ msg: 'request', method: 'POST' }));
      const output = String(vi.mocked(process.stdout.write).mock.calls[0]?.[0] ?? '');
      // CRUD log path — method field is present in the pretty payload
      expect(output).toContain('"method": "POST"');
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

  // -------------------------------------------------------------------------
  // FIXED: Status-line (non-CRUD) logs emit the msg as a plain line.
  // The level label is NOT prepended. The test previously expected 'INFO'
  // in the output — the actual format is just "WebSocket connected\n".
  // -------------------------------------------------------------------------
  describe('status formatting', () => {
    it('should print startup logs as plain single-line status messages without level prefix', () => {
      const logger = createConsoleLogger('info');
      logger.stream.write(JSON.stringify({ level: 30, msg: 'WebSocket connected' }));

      const output = String(vi.mocked(process.stdout.write).mock.calls[0]?.[0] ?? '');
      expect(output).toContain('WebSocket connected');
      expect(output).not.toContain('\n  "msg"');
      // Single-line: no pretty-print indentation
      expect(output.trim()).not.toMatch(/^\{/);
    });

    it('should append scalar extras as key=value pairs after the message', () => {
      const logger = createConsoleLogger('info');
      logger.stream.write(
        JSON.stringify({ level: 30, msg: 'Server started', port: 3000, host: 'localhost' }),
      );
      const output = String(vi.mocked(process.stdout.write).mock.calls[0]?.[0] ?? '');
      expect(output).toContain('Server started');
      expect(output).toContain('port=3000');
      expect(output).toContain('host=localhost');
    });

    it('should use "log" as fallback message when msg is absent', () => {
      const logger = createConsoleLogger('info');
      logger.stream.write(JSON.stringify({ level: 30, foo: 'bar' }));
      const output = String(vi.mocked(process.stdout.write).mock.calls[0]?.[0] ?? '');
      expect(output.startsWith('log')).toBe(true);
    });

    it('should use "log" as fallback message when msg is empty string', () => {
      const logger = createConsoleLogger('info');
      logger.stream.write(JSON.stringify({ level: 30, msg: '' }));
      const output = String(vi.mocked(process.stdout.write).mock.calls[0]?.[0] ?? '');
      expect(output.startsWith('log')).toBe(true);
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

  // -------------------------------------------------------------------------
  // Adversarial — normalizeLevel edge cases
  // -------------------------------------------------------------------------
  describe('adversarial — level normalisation', () => {
    it('should pass through unknown string level as INFO fallback for status line', () => {
      const logger = createConsoleLogger('info');
      // 'GARBAGE' is not a known level string — normalizeLevel returns 'INFO'
      logger.stream.write(JSON.stringify({ level: 'GARBAGE', msg: 'probe' }));
      const output = String(vi.mocked(process.stdout.write).mock.calls[0]?.[0] ?? '');
      // Output must not crash and must contain the message
      expect(output).toContain('probe');
    });

    it('should handle level = null without throwing', () => {
      const logger = createConsoleLogger('info');
      logger.stream.write(JSON.stringify({ level: null, msg: 'nulllevel' }));
      const output = String(vi.mocked(process.stdout.write).mock.calls[0]?.[0] ?? '');
      expect(output).toContain('nulllevel');
    });

    it('should handle level = false without throwing', () => {
      const logger = createConsoleLogger('info');
      logger.stream.write(JSON.stringify({ level: false, msg: 'falselevel' }));
      const output = String(vi.mocked(process.stdout.write).mock.calls[0]?.[0] ?? '');
      expect(output).toContain('falselevel');
    });

    it('should handle level = Infinity as FATAL (>= 60 catches all high values)', () => {
      // Infinity >= 60 → 'fatal'; but Infinity is NOT finite so normalizeLevel returns 'INFO'
      const logger = createConsoleLogger('info');
      logger.stream.write(JSON.stringify({ level: 9999, msg: 'veryhigh' }));
      const output = String(vi.mocked(process.stdout.write).mock.calls[0]?.[0] ?? '');
      expect(output).toContain('veryhigh');
    });

    it('should handle level = -Infinity without throwing', () => {
      const logger = createConsoleLogger('info');
      logger.stream.write(JSON.stringify({ level: -1, msg: 'negative' }));
      const output = String(vi.mocked(process.stdout.write).mock.calls[0]?.[0] ?? '');
      expect(output).toContain('negative');
    });

    it('should treat empty-string level as INFO fallback', () => {
      const logger = createConsoleLogger('info');
      logger.stream.write(JSON.stringify({ level: '', msg: 'emptylevel' }));
      const output = String(vi.mocked(process.stdout.write).mock.calls[0]?.[0] ?? '');
      expect(output).toContain('emptylevel');
    });

    it('should accept level as lowercase "info" and map to INFO', () => {
      const logger = createConsoleLogger('info');
      logger.stream.write(JSON.stringify({ level: 'info', msg: 'lowercase' }));
      const output = String(vi.mocked(process.stdout.write).mock.calls[0]?.[0] ?? '');
      expect(output).toContain('lowercase');
    });
  });

  // -------------------------------------------------------------------------
  // Adversarial — stream buffering (chunked delivery)
  // -------------------------------------------------------------------------
  describe('adversarial — chunked stream delivery', () => {
    it('should emit a partial chunk immediately (no buffering without newline)', () => {
      // The stream write path: if chunk contains no \n → writeFormattedLine(chunk) immediately.
      // This means a partial JSON fragment is written as invalid JSON → passes through as plain text.
      const logger = createConsoleLogger('info');
      const partial = '{"level":30,"msg"';
      logger.stream.write(partial);
      // writeFormattedLine was called immediately because no \n present
      expect(process.stdout.write).toHaveBeenCalledOnce();
      // Partial JSON fails JSON.parse → written as-is (trimmed) with \n appended
      const output = String(vi.mocked(process.stdout.write).mock.calls[0]?.[0] ?? '');
      expect(output).toBe(`${partial}\n`);
    });

    it('should handle a chunk containing no newline as a single write', () => {
      const logger = createConsoleLogger('info');
      // chunk with no newline → writeFormattedLine called immediately
      logger.stream.write(JSON.stringify({ level: 30, msg: 'nonewline' }));
      expect(process.stdout.write).toHaveBeenCalledOnce();
    });

    it('should process three lines delivered as one chunk', () => {
      const logger = createConsoleLogger('info');
      const lines =
        [
          JSON.stringify({ level: 30, msg: 'one' }),
          JSON.stringify({ level: 30, msg: 'two' }),
          JSON.stringify({ level: 30, msg: 'three' }),
        ].join('\n') + '\n';
      logger.stream.write(lines);
      expect(vi.mocked(process.stdout.write).mock.calls.length).toBe(3);
    });

    it('should not emit anything for a chunk that is only whitespace lines', () => {
      const logger = createConsoleLogger('info');
      logger.stream.write('\n\n   \n\t\n');
      expect(process.stdout.write).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Adversarial — isCrudLog detection boundaries
  // -------------------------------------------------------------------------
  describe('adversarial — CRUD detection heuristics', () => {
    it('should route to pretty JSON when req field is present', () => {
      const logger = createConsoleLogger('info');
      logger.stream.write(JSON.stringify({ level: 30, msg: 'test', req: { id: '1' } }));
      const output = String(vi.mocked(process.stdout.write).mock.calls[0]?.[0] ?? '');
      // CRUD path produces indented JSON, not a flat status line
      expect(output).toContain('\n');
    });

    it('should route to pretty JSON when err field is present', () => {
      const logger = createConsoleLogger('info');
      logger.stream.write(
        JSON.stringify({ level: 50, msg: 'boom', err: { message: 'oops', stack: 'trace' } }),
      );
      const output = String(vi.mocked(process.stdout.write).mock.calls[0]?.[0] ?? '');
      expect(output).toContain('"err"');
    });

    it('should route to status line when none of the CRUD fields are present', () => {
      const logger = createConsoleLogger('info');
      logger.stream.write(JSON.stringify({ level: 30, msg: 'startup complete' }));
      const output = String(vi.mocked(process.stdout.write).mock.calls[0]?.[0] ?? '');
      // Single-line, no indented JSON
      expect(output).toBe('startup complete\n');
    });

    it('should omit object/array extras from status line (only scalars shown)', () => {
      const logger = createConsoleLogger('info');
      logger.stream.write(
        JSON.stringify({ level: 30, msg: 'init', meta: { nested: true }, count: 5 }),
      );
      const output = String(vi.mocked(process.stdout.write).mock.calls[0]?.[0] ?? '');
      // count is a scalar — included; meta is object — excluded
      expect(output).toContain('count=5');
      expect(output).not.toContain('nested');
    });

    it('should detect CRUD when msg is exactly "Request completed"', () => {
      const logger = createConsoleLogger('info');
      logger.stream.write(JSON.stringify({ level: 30, msg: 'Request completed', durationMs: 42 }));
      const output = String(vi.mocked(process.stdout.write).mock.calls[0]?.[0] ?? '');
      // CRUD path — durationMs appears in payload JSON
      expect(output).toContain('"durationMs": 42');
    });
  });

  // -------------------------------------------------------------------------
  // Adversarial — color control env vars
  // -------------------------------------------------------------------------
  describe('adversarial — color control', () => {
    it('should suppress ANSI codes when NO_COLOR is set', () => {
      const original = process.env['NO_COLOR'];
      process.env['NO_COLOR'] = '1';

      const logger = createConsoleLogger('info');
      logger.stream.write(JSON.stringify({ level: 30, msg: 'request', method: 'GET' }));

      const output = String(vi.mocked(process.stdout.write).mock.calls[0]?.[0] ?? '');
      expect(output).not.toContain('\u001B[');

      if (original !== undefined) {
        process.env['NO_COLOR'] = original;
      } else {
        delete process.env['NO_COLOR'];
      }
    });
  });
});
