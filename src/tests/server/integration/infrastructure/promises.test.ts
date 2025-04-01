import { describe, it, expect } from "vitest";

import { DeferredPromise } from "@/server/infrastructure/promises/DeferredPromise";

describe("DeferredPromise Integration Tests", () => {
  describe("DeferredPromise", () => {
    it("should resolve with the provided value", async () => {
      const deferred = new DeferredPromise<string>();
      const testValue = "test value";

      // Start the promise chain
      const promise = deferred.promise.then((value) => {
        expect(value).toBe(testValue);
      });

      // Resolve the promise
      deferred.resolve(testValue);

      // Wait for the promise to complete
      await promise;
    });

    it("should reject with the provided error", async () => {
      const deferred = new DeferredPromise<void>();
      const testError = new Error("test error");

      // Start the promise chain
      const promise = deferred.promise.catch((error) => {
        expect(error).toBe(testError);
      });

      // Reject the promise
      deferred.reject(testError);

      // Wait for the promise to complete
      await promise;
    });

    it("should handle primitive values", async () => {
      const deferred = new DeferredPromise<number>();
      const testValue = 42;

      const promise = deferred.promise.then((value) => {
        expect(value).toBe(testValue);
      });

      deferred.resolve(testValue);
      await promise;
    });

    it("should handle object values", async () => {
      const deferred = new DeferredPromise<{ id: number; name: string }>();
      const testValue = { id: 1, name: "test" };

      const promise = deferred.promise.then((value) => {
        expect(value).toEqual(testValue);
      });

      deferred.resolve(testValue);
      await promise;
    });

    it("should handle rejection with unknown type", async () => {
      const deferred = new DeferredPromise<void>();
      const testError = "string error";

      const promise = deferred.promise.catch((error) => {
        expect(error).toBe(testError);
      });

      deferred.reject(testError);
      await promise;
    });

    it("should maintain promise state after resolution", async () => {
      const deferred = new DeferredPromise<string>();
      const testValue = "test value";

      // Resolve the promise
      deferred.resolve(testValue);

      // Try to resolve again (should not affect the promise)
      deferred.resolve("different value");

      const result = await deferred.promise;
      expect(result).toBe(testValue);
    });

    it("should maintain promise state after rejection", async () => {
      const deferred = new DeferredPromise<void>();
      const testError = new Error("test error");

      // Reject the promise
      deferred.reject(testError);

      // Try to reject again (should not affect the promise)
      deferred.reject(new Error("different error"));

      try {
        await deferred.promise;
        throw new Error("Promise should have rejected");
      } catch (error) {
        expect(error).toBe(testError);
      }
    });

    it("should handle chained promises", async () => {
      const deferred = new DeferredPromise<number>();
      const testValue = 42;

      const promise = deferred.promise
        .then((value) => value * 2)
        .then((value) => value + 1)
        .then((value) => {
          expect(value).toBe(85); // (42 * 2) + 1
        });

      deferred.resolve(testValue);
      await promise;
    });

    it("should handle multiple listeners", async () => {
      const deferred = new DeferredPromise<string>();
      const testValue = "test value";
      const results: string[] = [];

      // Set up multiple listeners
      deferred.promise.then((value) => results.push(value));
      deferred.promise.then((value) => results.push(value.toUpperCase()));

      deferred.resolve(testValue);
      await deferred.promise;

      expect(results).toEqual([testValue, testValue.toUpperCase()]);
    });

    it("should handle rejection in promise chain", async () => {
      const deferred = new DeferredPromise<number>();
      const testValue = 42;

      const promise = deferred.promise
        .then((_value) => {
          throw new Error("Chain error");
        })
        .catch((error) => {
          expect(error.message).toBe("Chain error");
        });

      deferred.resolve(testValue);
      await promise;
    });
  });
});
