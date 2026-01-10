// packages/ui/src/theme/__tests__/colors.test.ts
import { describe, expect, it } from 'vitest';

import { colors, darkColors, lightColors } from '../colors';

const hexColorPattern = /^#[0-9a-f]{6}$/i;
const shadowPattern = /^0\s+\d+px\s+\d+px\s+rgba\(/i;
const focusPattern = /^0\s+0\s+0\s+\d+px\s+rgba\(/i;

describe('colors', () => {
  it('exposes light and dark color themes', () => {
    expect(Object.keys(colors)).toEqual(['light', 'dark']);
    expect(colors.light).toBe(lightColors);
    expect(colors.dark).toBe(darkColors);
  });

  describe('lightColors', () => {
    it('has all core color tokens', () => {
      expect(lightColors.primary).toMatch(hexColorPattern);
      expect(lightColors.accent).toMatch(hexColorPattern);
      expect(lightColors.primaryMuted).toMatch(hexColorPattern);
      expect(lightColors.danger).toMatch(hexColorPattern);
      expect(lightColors.success).toMatch(hexColorPattern);
      expect(lightColors.warning).toMatch(hexColorPattern);
      expect(lightColors.neutral).toMatch(hexColorPattern);
      expect(lightColors.muted).toMatch(hexColorPattern);
    });

    it('has all background color tokens', () => {
      expect(lightColors.bg).toMatch(hexColorPattern);
      expect(lightColors.surface).toMatch(hexColorPattern);
      expect(lightColors.surfaceStrong).toMatch(hexColorPattern);
    });

    it('has border color token', () => {
      expect(lightColors.border).toMatch(hexColorPattern);
    });

    it('has all text color tokens', () => {
      expect(lightColors.text).toMatch(hexColorPattern);
      expect(lightColors.textMuted).toMatch(hexColorPattern);
      expect(lightColors.textInverse).toMatch(hexColorPattern);
    });

    it('has control color tokens', () => {
      expect(lightColors.controlThumb).toMatch(hexColorPattern);
    });

    it('has effect tokens', () => {
      expect(lightColors.shadow).toMatch(shadowPattern);
      expect(lightColors.focus).toMatch(focusPattern);
    });

    it('has alert semantic colors', () => {
      const alertTypes = ['info', 'success', 'danger', 'warning'] as const;
      alertTypes.forEach((type) => {
        expect(lightColors.alert[type].bg).toMatch(hexColorPattern);
        expect(lightColors.alert[type].border).toMatch(hexColorPattern);
        expect(lightColors.alert[type].text).toMatch(hexColorPattern);
      });
    });

    it('has badge semantic colors', () => {
      const badgeTypes = ['primary', 'success', 'danger', 'warning', 'neutral'] as const;
      badgeTypes.forEach((type) => {
        expect(lightColors.badge[type].bg).toMatch(hexColorPattern);
        expect(lightColors.badge[type].border).toMatch(hexColorPattern);
      });
    });
  });

  describe('darkColors', () => {
    it('has all core color tokens', () => {
      expect(darkColors.primary).toMatch(hexColorPattern);
      expect(darkColors.accent).toMatch(hexColorPattern);
      expect(darkColors.primaryMuted).toMatch(hexColorPattern);
      expect(darkColors.danger).toMatch(hexColorPattern);
      expect(darkColors.success).toMatch(hexColorPattern);
      expect(darkColors.warning).toMatch(hexColorPattern);
      expect(darkColors.neutral).toMatch(hexColorPattern);
      expect(darkColors.muted).toMatch(hexColorPattern);
    });

    it('has all background color tokens', () => {
      expect(darkColors.bg).toMatch(hexColorPattern);
      expect(darkColors.surface).toMatch(hexColorPattern);
      expect(darkColors.surfaceStrong).toMatch(hexColorPattern);
    });

    it('has border color token', () => {
      expect(darkColors.border).toMatch(hexColorPattern);
    });

    it('has all text color tokens', () => {
      expect(darkColors.text).toMatch(hexColorPattern);
      expect(darkColors.textMuted).toMatch(hexColorPattern);
      expect(darkColors.textInverse).toMatch(hexColorPattern);
    });

    it('has control color tokens', () => {
      expect(darkColors.controlThumb).toMatch(hexColorPattern);
    });

    it('has effect tokens', () => {
      expect(darkColors.shadow).toMatch(shadowPattern);
      expect(darkColors.focus).toMatch(focusPattern);
    });

    it('has alert semantic colors', () => {
      const alertTypes = ['info', 'success', 'danger', 'warning'] as const;
      alertTypes.forEach((type) => {
        expect(darkColors.alert[type].bg).toMatch(hexColorPattern);
        expect(darkColors.alert[type].border).toMatch(hexColorPattern);
        expect(darkColors.alert[type].text).toMatch(hexColorPattern);
      });
    });

    it('has badge semantic colors', () => {
      const badgeTypes = ['primary', 'success', 'danger', 'warning', 'neutral'] as const;
      badgeTypes.forEach((type) => {
        expect(darkColors.badge[type].bg).toMatch(hexColorPattern);
        expect(darkColors.badge[type].border).toMatch(hexColorPattern);
      });
    });
  });

  describe('light vs dark theme differences', () => {
    it('has different background colors', () => {
      expect(lightColors.bg).not.toBe(darkColors.bg);
      expect(lightColors.surface).not.toBe(darkColors.surface);
    });

    it('has different text colors', () => {
      expect(lightColors.text).not.toBe(darkColors.text);
      expect(lightColors.textMuted).not.toBe(darkColors.textMuted);
    });

    it('has different border colors', () => {
      expect(lightColors.border).not.toBe(darkColors.border);
    });
  });
});
