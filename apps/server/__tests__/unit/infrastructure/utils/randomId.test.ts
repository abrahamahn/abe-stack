import { describe, it, expect } from "vitest";

import { randomId } from "@infrastructure/utils/randomId";

describe("randomId", () => {
  it("should generate a valid UUID without seed", () => {
    const uuid = randomId();
    expect(uuid).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it("should generate different UUIDs without seed", () => {
    const uuid1 = randomId();
    const uuid2 = randomId();
    expect(uuid1).not.toBe(uuid2);
  });

  it("should generate deterministic UUID with seed", () => {
    const seed = "test-seed";
    const uuid1 = randomId(seed);
    const uuid2 = randomId(seed);
    expect(uuid1).toBe(uuid2);
    expect(uuid1).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it("should generate different UUIDs with different seeds", () => {
    const uuid1 = randomId("seed1");
    const uuid2 = randomId("seed2");
    expect(uuid1).not.toBe(uuid2);
  });

  it("should handle empty seed", () => {
    const uuid = randomId("");
    expect(uuid).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it("should handle long seed", () => {
    const longSeed = "a".repeat(1000);
    const uuid = randomId(longSeed);
    expect(uuid).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it("should handle special characters in seed", () => {
    const specialSeed = "!@#$%^&*()_+";
    const uuid = randomId(specialSeed);
    expect(uuid).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });
});
