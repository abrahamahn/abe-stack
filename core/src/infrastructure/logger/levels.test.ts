// core/src/infrastructure/logger/levels.test.ts
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
});
