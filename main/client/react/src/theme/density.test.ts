// main/client/react/src/theme/density.test.ts
import { describe, expect, it } from 'vitest';

import {
  DEFAULT_DENSITY,
  densityMultipliers,
  getDensityCssVariables,
  getSpacingForDensity,
} from './density';

import type { Density } from './density';

describe('density', () => {
  describe('densityMultipliers', () => {
    it('has correct multiplier values', () => {
      expect(densityMultipliers.compact).toBe(0.75);
      expect(densityMultipliers.normal).toBe(1);
      expect(densityMultipliers.comfortable).toBe(1.25);
    });

    it('exports all density levels', () => {
      const levels: Density[] = ['compact', 'normal', 'comfortable'];
      expect(Object.keys(densityMultipliers)).toEqual(levels);
    });
  });

  describe('DEFAULT_DENSITY', () => {
    it('defaults to normal', () => {
      expect(DEFAULT_DENSITY).toBe('normal');
    });
  });

  describe('getSpacingForDensity', () => {
    it('returns normal spacing at 1x multiplier', () => {
      const spacing = getSpacingForDensity('normal');

      expect(spacing.xs).toBe('0.25rem');
      expect(spacing.sm).toBe('0.5rem');
      expect(spacing.md).toBe('0.75rem');
      expect(spacing.lg).toBe('1rem');
      expect(spacing.xl).toBe('1.5rem');
      expect(spacing['2xl']).toBe('2rem');
      expect(spacing['3xl']).toBe('3rem');
    });

    it('returns compact spacing at 0.75x multiplier', () => {
      const spacing = getSpacingForDensity('compact');

      // 0.25 * 0.75 = 0.1875
      expect(spacing.xs).toBe('0.188rem');
      // 0.5 * 0.75 = 0.375
      expect(spacing.sm).toBe('0.375rem');
      // 0.75 * 0.75 = 0.5625
      expect(spacing.md).toBe('0.563rem');
      // 1 * 0.75 = 0.75
      expect(spacing.lg).toBe('0.75rem');
      // 1.5 * 0.75 = 1.125
      expect(spacing.xl).toBe('1.125rem');
      // 2 * 0.75 = 1.5
      expect(spacing['2xl']).toBe('1.5rem');
      // 3 * 0.75 = 2.25
      expect(spacing['3xl']).toBe('2.25rem');
    });

    it('returns comfortable spacing at 1.25x multiplier', () => {
      const spacing = getSpacingForDensity('comfortable');

      // 0.25 * 1.25 = 0.3125
      expect(spacing.xs).toBe('0.313rem');
      // 0.5 * 1.25 = 0.625
      expect(spacing.sm).toBe('0.625rem');
      // 0.75 * 1.25 = 0.9375
      expect(spacing.md).toBe('0.938rem');
      // 1 * 1.25 = 1.25
      expect(spacing.lg).toBe('1.25rem');
      // 1.5 * 1.25 = 1.875
      expect(spacing.xl).toBe('1.875rem');
      // 2 * 1.25 = 2.5
      expect(spacing['2xl']).toBe('2.5rem');
      // 3 * 1.25 = 3.75
      expect(spacing['3xl']).toBe('3.75rem');
    });

    it('returns all expected spacing keys', () => {
      const spacing = getSpacingForDensity('normal');
      expect(Object.keys(spacing)).toEqual(['xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl']);
    });
  });

  describe('getDensityCssVariables', () => {
    it('returns CSS custom properties with correct names', () => {
      const vars = getDensityCssVariables('normal');

      expect(vars['--ui-gap-xs']).toBeDefined();
      expect(vars['--ui-gap-sm']).toBeDefined();
      expect(vars['--ui-gap-md']).toBeDefined();
      expect(vars['--ui-gap-lg']).toBeDefined();
      expect(vars['--ui-gap-xl']).toBeDefined();
      expect(vars['--ui-gap-2xl']).toBeDefined();
      expect(vars['--ui-gap-3xl']).toBeDefined();
    });

    it('returns scaled values for compact density', () => {
      const vars = getDensityCssVariables('compact');

      expect(vars['--ui-gap-lg']).toBe('0.75rem'); // 1 * 0.75
      expect(vars['--ui-gap-xl']).toBe('1.125rem'); // 1.5 * 0.75
    });

    it('returns scaled values for comfortable density', () => {
      const vars = getDensityCssVariables('comfortable');

      expect(vars['--ui-gap-lg']).toBe('1.25rem'); // 1 * 1.25
      expect(vars['--ui-gap-xl']).toBe('1.875rem'); // 1.5 * 1.25
    });

    it('returns normal values for normal density', () => {
      const vars = getDensityCssVariables('normal');

      expect(vars['--ui-gap-lg']).toBe('1rem');
      expect(vars['--ui-gap-xl']).toBe('1.5rem');
    });
  });
});
