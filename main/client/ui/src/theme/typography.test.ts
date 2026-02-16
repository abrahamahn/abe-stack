// main/client/ui/src/theme/typography.test.ts
import { describe, expect, it } from 'vitest';

import { typography } from './typography';

const sizePattern = /^[\d.]+rem$/;

describe('typography', () => {
  it('includes a system font fallback', () => {
    expect(typography.fontFamily).toContain('system-ui');
  });

  it('uses rem font sizes', () => {
    Object.values(typography.sizes).forEach((value) => {
      expect(value).toMatch(sizePattern);
      expect(Number.parseFloat(value.replace('rem', ''))).toBeGreaterThan(0);
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
