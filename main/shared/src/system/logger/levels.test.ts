// main/shared/src/system/logger/levels.test.ts
import { describe, expect, test } from 'vitest';

import { LOG_LEVELS, shouldLog } from './levels';

describe('Log Level Utilities', () => {
  describe('LOG_LEVELS', () => {
    test('should have correct numeric values', () => {
      expect(LOG_LEVELS.trace).toBe(10);
      expect(LOG_LEVELS.debug).toBe(20);
      expect(LOG_LEVELS.info).toBe(30);
      expect(LOG_LEVELS.warn).toBe(40);
      expect(LOG_LEVELS.error).toBe(50);
      expect(LOG_LEVELS.fatal).toBe(60);
    });

    test('should have correct severity ordering', () => {
      expect(LOG_LEVELS.trace).toBeLessThan(LOG_LEVELS.debug);
      expect(LOG_LEVELS.debug).toBeLessThan(LOG_LEVELS.info);
      expect(LOG_LEVELS.info).toBeLessThan(LOG_LEVELS.warn);
      expect(LOG_LEVELS.warn).toBeLessThan(LOG_LEVELS.error);
      expect(LOG_LEVELS.error).toBeLessThan(LOG_LEVELS.fatal);
    });

    test('should have exactly 6 levels', () => {
      expect(Object.keys(LOG_LEVELS)).toHaveLength(6);
    });

    test('should contain all expected level names', () => {
      const expectedLevels = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];
      expect(Object.keys(LOG_LEVELS).sort()).toEqual(expectedLevels.sort());
    });
  });

  describe('shouldLog', () => {
    test('should return true when message level is higher than configured', () => {
      expect(shouldLog('error', 'info')).toBe(true);
      expect(shouldLog('fatal', 'trace')).toBe(true);
      expect(shouldLog('warn', 'debug')).toBe(true);
    });

    test('should return true when message level equals configured level', () => {
      expect(shouldLog('trace', 'trace')).toBe(true);
      expect(shouldLog('debug', 'debug')).toBe(true);
      expect(shouldLog('info', 'info')).toBe(true);
      expect(shouldLog('warn', 'warn')).toBe(true);
      expect(shouldLog('error', 'error')).toBe(true);
      expect(shouldLog('fatal', 'fatal')).toBe(true);
    });

    test('should return false when message level is lower than configured', () => {
      expect(shouldLog('debug', 'info')).toBe(false);
      expect(shouldLog('trace', 'warn')).toBe(false);
      expect(shouldLog('info', 'error')).toBe(false);
    });

    test('should correctly filter trace-level when configured for info', () => {
      expect(shouldLog('trace', 'info')).toBe(false);
      expect(shouldLog('debug', 'info')).toBe(false);
      expect(shouldLog('info', 'info')).toBe(true);
      expect(shouldLog('warn', 'info')).toBe(true);
      expect(shouldLog('error', 'info')).toBe(true);
      expect(shouldLog('fatal', 'info')).toBe(true);
    });

    test('should allow all levels when configured for trace', () => {
      expect(shouldLog('trace', 'trace')).toBe(true);
      expect(shouldLog('debug', 'trace')).toBe(true);
      expect(shouldLog('info', 'trace')).toBe(true);
      expect(shouldLog('warn', 'trace')).toBe(true);
      expect(shouldLog('error', 'trace')).toBe(true);
      expect(shouldLog('fatal', 'trace')).toBe(true);
    });

    test('should only allow fatal when configured for fatal', () => {
      expect(shouldLog('trace', 'fatal')).toBe(false);
      expect(shouldLog('debug', 'fatal')).toBe(false);
      expect(shouldLog('info', 'fatal')).toBe(false);
      expect(shouldLog('warn', 'fatal')).toBe(false);
      expect(shouldLog('error', 'fatal')).toBe(false);
      expect(shouldLog('fatal', 'fatal')).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Adversarial — LOG_LEVELS structural integrity
  // -------------------------------------------------------------------------
  describe('adversarial — LOG_LEVELS integrity', () => {
    test('all numeric values should be positive integers', () => {
      for (const [name, value] of Object.entries(LOG_LEVELS)) {
        expect(value, `${name} must be > 0`).toBeGreaterThan(0);
        expect(Number.isInteger(value), `${name} must be an integer`).toBe(true);
      }
    });

    test('no two levels should share the same numeric value', () => {
      const values = Object.values(LOG_LEVELS);
      const unique = new Set(values);
      expect(unique.size).toBe(values.length);
    });

    test('values should be multiples of 10 (pino compatibility)', () => {
      for (const [name, value] of Object.entries(LOG_LEVELS)) {
        expect(value % 10, `${name} (${String(value)}) should be divisible by 10`).toBe(0);
      }
    });

    test('fatal should be the highest value', () => {
      const max = Math.max(...Object.values(LOG_LEVELS));
      expect(LOG_LEVELS.fatal).toBe(max);
    });

    test('trace should be the lowest value', () => {
      const min = Math.min(...Object.values(LOG_LEVELS));
      expect(LOG_LEVELS.trace).toBe(min);
    });

    test('should not contain a "silent" level (that lives in CONSOLE_LOG_LEVELS only)', () => {
      expect(Object.keys(LOG_LEVELS)).not.toContain('silent');
    });
  });

  // -------------------------------------------------------------------------
  // Adversarial — shouldLog comparison edge cases
  // -------------------------------------------------------------------------
  describe('adversarial — shouldLog comparison exhaustion', () => {
    const allLevels = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'] as const;

    test('every level should pass when message >= configured (full matrix)', () => {
      for (let i = 0; i < allLevels.length; i++) {
        for (let j = 0; j <= i; j++) {
          // allLevels[i] is the message level (higher index = higher severity)
          // allLevels[j] is the configured level (lower index = lower severity)
          // message level index >= configured level index → should log
          const msgLevel = allLevels[i];
          const cfgLevel = allLevels[j];
          if (msgLevel !== undefined && cfgLevel !== undefined) {
            expect(
              shouldLog(msgLevel, cfgLevel),
              `shouldLog('${msgLevel}', '${cfgLevel}') expected true`,
            ).toBe(true);
          }
        }
      }
    });

    test('every level should be suppressed when message < configured (full matrix)', () => {
      for (let i = 0; i < allLevels.length; i++) {
        for (let j = i + 1; j < allLevels.length; j++) {
          // allLevels[i] is the message level (lower severity)
          // allLevels[j] is the configured level (higher severity)
          const msgLevel = allLevels[i];
          const cfgLevel = allLevels[j];
          if (msgLevel !== undefined && cfgLevel !== undefined) {
            expect(
              shouldLog(msgLevel, cfgLevel),
              `shouldLog('${msgLevel}', '${cfgLevel}') expected false`,
            ).toBe(false);
          }
        }
      }
    });

    test('adjacent-level boundaries are exact (no off-by-one)', () => {
      // error (50) vs warn (40): error passes, warn-to-error boundary
      expect(shouldLog('error', 'error')).toBe(true);
      expect(shouldLog('warn', 'error')).toBe(false);

      // debug (20) vs info (30): debug suppressed at info
      expect(shouldLog('debug', 'info')).toBe(false);
      expect(shouldLog('info', 'info')).toBe(true);
    });

    test('same-level comparison is always true for all levels', () => {
      for (const level of allLevels) {
        expect(shouldLog(level, level), `shouldLog('${level}', '${level}')`).toBe(true);
      }
    });

    test('fatal-to-everything: fatal message always logs regardless of config', () => {
      for (const cfg of allLevels) {
        expect(shouldLog('fatal', cfg), `fatal should log at config '${cfg}'`).toBe(true);
      }
    });

    test('trace-to-everything: trace message only logs when config is trace', () => {
      for (const cfg of allLevels) {
        const expected = cfg === 'trace';
        expect(shouldLog('trace', cfg), `trace vs '${cfg}' expected ${String(expected)}`).toBe(
          expected,
        );
      }
    });
  });

  // -------------------------------------------------------------------------
  // Adversarial — numeric level value semantics
  // -------------------------------------------------------------------------
  describe('adversarial — numeric value semantics', () => {
    test('error numeric value is exactly 10 more than warn', () => {
      expect(LOG_LEVELS.error - LOG_LEVELS.warn).toBe(10);
    });

    test('adjacent levels differ by exactly 10', () => {
      expect(LOG_LEVELS.debug - LOG_LEVELS.trace).toBe(10);
      expect(LOG_LEVELS.info - LOG_LEVELS.debug).toBe(10);
      expect(LOG_LEVELS.warn - LOG_LEVELS.info).toBe(10);
      expect(LOG_LEVELS.error - LOG_LEVELS.warn).toBe(10);
      expect(LOG_LEVELS.fatal - LOG_LEVELS.error).toBe(10);
    });

    test('info numeric value is 30 (pino default)', () => {
      // Pino uses 30 for info — any deviation would break pino integration
      expect(LOG_LEVELS.info).toBe(30);
    });

    test('LOG_LEVELS values used in shouldLog are compared with >=', () => {
      // Verify that shouldLog(x, x) is always true (edge of >=, not >)
      expect(LOG_LEVELS.warn >= LOG_LEVELS.warn).toBe(true);
      expect(LOG_LEVELS.warn > LOG_LEVELS.warn).toBe(false);
    });
  });
});
