// main/shared/src/domain/theme/contrast.test.ts
import { describe, expect, it } from 'vitest';

import {
  DEFAULT_CONTRAST_MODE,
  getContrastCssVariables,
  highContrastDarkOverrides,
  highContrastLightOverrides,
} from './contrast';

import type { ContrastMode } from './contrast';

describe('contrast', () => {
  describe('DEFAULT_CONTRAST_MODE', () => {
    it('defaults to system', () => {
      expect(DEFAULT_CONTRAST_MODE).toBe('system');
    });
  });

  describe('highContrastLightOverrides', () => {
    it('has maximum contrast text colors', () => {
      expect(highContrastLightOverrides['--ui-color-text']).toBe('#000000');
      expect(highContrastLightOverrides['--ui-color-bg']).toBe('#ffffff');
    });

    it('has darker borders for visibility', () => {
      expect(highContrastLightOverrides['--ui-color-border']).toBe('#000000');
    });

    it('has stronger focus styles', () => {
      expect(highContrastLightOverrides['--ui-focus']).toContain('#000000');
      expect(highContrastLightOverrides['--ui-outline-width']).toBe('3px');
    });

    it('has more saturated semantic colors', () => {
      expect(highContrastLightOverrides['--ui-color-primary']).toBeDefined();
      expect(highContrastLightOverrides['--ui-color-danger']).toBeDefined();
      expect(highContrastLightOverrides['--ui-color-success']).toBeDefined();
    });
  });

  describe('highContrastDarkOverrides', () => {
    it('has maximum contrast text colors', () => {
      expect(highContrastDarkOverrides['--ui-color-text']).toBe('#ffffff');
      expect(highContrastDarkOverrides['--ui-color-bg']).toBe('#000000');
    });

    it('has lighter borders for visibility', () => {
      expect(highContrastDarkOverrides['--ui-color-border']).toBe('#ffffff');
    });

    it('has stronger focus styles', () => {
      expect(highContrastDarkOverrides['--ui-focus']).toContain('#ffffff');
      expect(highContrastDarkOverrides['--ui-outline-width']).toBe('3px');
    });

    it('has brighter semantic colors', () => {
      expect(highContrastDarkOverrides['--ui-color-primary']).toBeDefined();
      expect(highContrastDarkOverrides['--ui-color-danger']).toBeDefined();
      expect(highContrastDarkOverrides['--ui-color-success']).toBeDefined();
    });
  });

  describe('getContrastCssVariables', () => {
    const testCases: { mode: ContrastMode; theme: 'light' | 'dark'; prefersHC: boolean }[] = [
      { mode: 'normal', theme: 'light', prefersHC: false },
      { mode: 'normal', theme: 'light', prefersHC: true },
      { mode: 'normal', theme: 'dark', prefersHC: false },
      { mode: 'normal', theme: 'dark', prefersHC: true },
    ];

    it.each(testCases)(
      'returns null when contrast mode is "normal" (theme: $theme, prefersHC: $prefersHC)',
      ({ mode, theme, prefersHC }) => {
        const result = getContrastCssVariables(mode, theme, prefersHC);
        expect(result).toBeNull();
      },
    );

    it('returns light high-contrast overrides when mode is "high" and theme is light', () => {
      const result = getContrastCssVariables('high', 'light', false);
      expect(result).toEqual(highContrastLightOverrides);
    });

    it('returns dark high-contrast overrides when mode is "high" and theme is dark', () => {
      const result = getContrastCssVariables('high', 'dark', false);
      expect(result).toEqual(highContrastDarkOverrides);
    });

    it('returns light overrides when mode is "system" and system prefers high contrast (light theme)', () => {
      const result = getContrastCssVariables('system', 'light', true);
      expect(result).toEqual(highContrastLightOverrides);
    });

    it('returns dark overrides when mode is "system" and system prefers high contrast (dark theme)', () => {
      const result = getContrastCssVariables('system', 'dark', true);
      expect(result).toEqual(highContrastDarkOverrides);
    });

    it('returns null when mode is "system" and system does not prefer high contrast', () => {
      const result = getContrastCssVariables('system', 'light', false);
      expect(result).toBeNull();
    });
  });
});
