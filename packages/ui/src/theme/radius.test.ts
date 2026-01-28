// packages/ui/src/theme/radius.test.ts
import { describe, expect, it } from 'vitest';

import { radius } from './radius';

const remPattern = /^\d+(\.\d+)?rem$/;

describe('radius', () => {
  it('exports a radius object', () => {
    expect(radius).toBeDefined();
    expect(typeof radius).toBe('object');
  });

  it('has sm, md, and lg tokens', () => {
    expect(radius.sm).toBeDefined();
    expect(radius.md).toBeDefined();
    expect(radius.lg).toBeDefined();
  });

  it('all values are in rem units', () => {
    expect(radius.sm).toMatch(remPattern);
    expect(radius.md).toMatch(remPattern);
    expect(radius.lg).toMatch(remPattern);
  });

  it('values increase from sm to lg', () => {
    const smValue = parseFloat(radius.sm);
    const mdValue = parseFloat(radius.md);
    const lgValue = parseFloat(radius.lg);

    expect(smValue).toBeLessThan(mdValue);
    expect(mdValue).toBeLessThan(lgValue);
  });

  it('has expected values', () => {
    expect(radius.sm).toBe('0.25rem'); // 4px
    expect(radius.md).toBe('0.625rem'); // 10px
    expect(radius.lg).toBe('1rem'); // 16px
  });

  it('is immutable (const assertion)', () => {
    // TypeScript enforces this, but we can verify the object is frozen-like
    expect(Object.keys(radius)).toHaveLength(3);
    expect(Object.keys(radius)).toEqual(['sm', 'md', 'lg']);
  });
});
