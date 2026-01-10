// packages/ui/src/theme/__tests__/typography.test.ts
import { describe, expect, it } from 'vitest';

import { typography } from '../typography';

const sizePattern = /^\d+px$/;

describe('typography', () => {
  it('includes a system font fallback', () => {
    expect(typography.fontFamily).toContain('system-ui');
  });

  it('uses px font sizes', () => {
    Object.values(typography.sizes).forEach((value) => {
      expect(value).toMatch(sizePattern);
      expect(Number.parseInt(value.replace('px', ''), 10)).toBeGreaterThan(0);
    });
  });

  it('exposes numeric font weights', () => {
    Object.values(typography.weights).forEach((value) => {
      expect(typeof value).toBe('number');
      expect(value).toBeGreaterThan(0);
    });
  });

  it('exposes numeric line heights', () => {
    Object.values(typography.lineHeights).forEach((value) => {
      expect(typeof value).toBe('number');
      expect(value).toBeGreaterThan(0);
    });
  });
});
