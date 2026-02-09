// src/shared/src/utils/constants/time.test.ts
import { describe, expect, test } from 'vitest';

import {
  DAYS_PER_WEEK,
  HOURS_PER_DAY,
  MINUTES_PER_HOUR,
  MS_PER_DAY,
  MS_PER_HOUR,
  MS_PER_MINUTE,
  MS_PER_SECOND,
  SECONDS_PER_DAY,
  SECONDS_PER_HOUR,
  SECONDS_PER_MINUTE,
} from './time';

describe('time constants', () => {
  describe('base units', () => {
    test('MS_PER_SECOND should be 1000', () => {
      expect(MS_PER_SECOND).toBe(1000);
    });

    test('SECONDS_PER_MINUTE should be 60', () => {
      expect(SECONDS_PER_MINUTE).toBe(60);
    });

    test('MINUTES_PER_HOUR should be 60', () => {
      expect(MINUTES_PER_HOUR).toBe(60);
    });

    test('HOURS_PER_DAY should be 24', () => {
      expect(HOURS_PER_DAY).toBe(24);
    });

    test('DAYS_PER_WEEK should be 7', () => {
      expect(DAYS_PER_WEEK).toBe(7);
    });
  });

  describe('derived millisecond values', () => {
    test('MS_PER_MINUTE should be 60000', () => {
      expect(MS_PER_MINUTE).toBe(60 * 1000);
      expect(MS_PER_MINUTE).toBe(60000);
    });

    test('MS_PER_HOUR should be 3600000', () => {
      expect(MS_PER_HOUR).toBe(60 * 60 * 1000);
      expect(MS_PER_HOUR).toBe(3600000);
    });

    test('MS_PER_DAY should be 86400000', () => {
      expect(MS_PER_DAY).toBe(24 * 60 * 60 * 1000);
      expect(MS_PER_DAY).toBe(86400000);
    });
  });

  describe('derived second values', () => {
    test('SECONDS_PER_HOUR should be 3600', () => {
      expect(SECONDS_PER_HOUR).toBe(60 * 60);
      expect(SECONDS_PER_HOUR).toBe(3600);
    });

    test('SECONDS_PER_DAY should be 86400', () => {
      expect(SECONDS_PER_DAY).toBe(24 * 60 * 60);
      expect(SECONDS_PER_DAY).toBe(86400);
    });
  });

  describe('mathematical consistency', () => {
    test('derived values should be mathematically consistent', () => {
      expect(MS_PER_MINUTE).toBe(MS_PER_SECOND * SECONDS_PER_MINUTE);
      expect(MS_PER_HOUR).toBe(MS_PER_MINUTE * MINUTES_PER_HOUR);
      expect(MS_PER_DAY).toBe(MS_PER_HOUR * HOURS_PER_DAY);
      expect(SECONDS_PER_HOUR).toBe(SECONDS_PER_MINUTE * MINUTES_PER_HOUR);
      expect(SECONDS_PER_DAY).toBe(SECONDS_PER_HOUR * HOURS_PER_DAY);
    });
  });
});
