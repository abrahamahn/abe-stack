import { describe, it, expect, vi } from "vitest";

import { sleep } from "../../../../../server/infrastructure/lifecycle/sleep";

describe("sleep", () => {
  it("should resolve after specified time", async () => {
    vi.useFakeTimers();
    const startTime = Date.now();
    const sleepPromise = sleep(1000);
    vi.advanceTimersByTime(1000);
    await sleepPromise;
    const endTime = Date.now();
    expect(endTime - startTime).toBe(1000);
    vi.useRealTimers();
  });

  it("should handle zero delay", async () => {
    vi.useFakeTimers();
    const startTime = Date.now();
    const sleepPromise = sleep(0);
    vi.advanceTimersByTime(0);
    await sleepPromise;
    const endTime = Date.now();
    expect(endTime - startTime).toBe(0);
    vi.useRealTimers();
  });

  it("should handle multiple sleep calls", async () => {
    vi.useFakeTimers();
    const startTime = Date.now();
    const sleepPromise1 = sleep(500);
    const sleepPromise2 = sleep(1000);
    vi.advanceTimersByTime(1000);
    await Promise.all([sleepPromise1, sleepPromise2]);
    const endTime = Date.now();
    expect(endTime - startTime).toBe(1000);
    vi.useRealTimers();
  });

  it("should handle negative delay", async () => {
    vi.useFakeTimers();
    const startTime = Date.now();
    const sleepPromise = sleep(-1000);
    vi.advanceTimersByTime(0);
    await sleepPromise;
    const endTime = Date.now();
    expect(endTime - startTime).toBe(0);
    vi.useRealTimers();
  });

  it("should handle large delay", async () => {
    vi.useFakeTimers();
    const startTime = Date.now();
    const sleepPromise = sleep(Number.MAX_SAFE_INTEGER);
    vi.advanceTimersByTime(Number.MAX_SAFE_INTEGER);
    await sleepPromise;
    const endTime = Date.now();
    expect(
      Math.abs(endTime - startTime - Number.MAX_SAFE_INTEGER),
    ).toBeLessThanOrEqual(2);
    vi.useRealTimers();
  });
});
