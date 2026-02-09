// src/shared/src/utils/async/delay.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { delay } from './delay';

describe('delay', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('resolves after the specified time', async () => {
    let resolved = false;

    const promise = delay(1000).then(() => {
      resolved = true;
    });

    expect(resolved).toBe(false);

    vi.advanceTimersByTime(999);
    expect(resolved).toBe(false);

    vi.advanceTimersByTime(1);
    await promise;

    expect(resolved).toBe(true);
  });

  it('resolves with undefined', async () => {
    const promise = delay(100);
    vi.advanceTimersByTime(100);
    await promise;
  });

  it('works with zero ms', async () => {
    const promise = delay(0);
    vi.advanceTimersByTime(0);
    await promise;
  });
});
