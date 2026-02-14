// main/client/ui/src/theme/motion.test.ts
import { describe, expect, it, beforeEach, afterEach } from 'vitest';

import { motion } from './motion';

const durationPattern = /^\d+ms$/;
const cubicBezierPattern =
  /^cubic-bezier\(\s*-?\d*\.?\d+\s*,\s*-?\d*\.?\d+\s*,\s*-?\d*\.?\d+\s*,\s*-?\d*\.?\d+\s*\)$/;

describe('motion', () => {
  it('exposes the expected duration keys', () => {
    expect(Object.keys(motion.durations)).toEqual(['fast', 'base', 'slow', 'slower', 'shimmer']);
  });

  it('uses ms durations with positive values', () => {
    Object.values(motion.durations).forEach((value) => {
      expect(value).toMatch(durationPattern);
      expect(Number.parseInt(value.replace('ms', ''), 10)).toBeGreaterThan(0);
    });
  });

  it('uses valid cubic-bezier easing values', () => {
    Object.values(motion.easing).forEach((value) => {
      expect(value).toMatch(cubicBezierPattern);
    });
  });
});
