import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import {
  DeferredPromise,
  PromiseState,
} from "@/server/infrastructure/promises/DeferredPromise";

describe("Promises Infrastructure Integration Tests", () => {
  describe("DeferredPromise", () => {
    // Basic functionality tests
    it("should resolve with the provided value", async () => {
      const deferred = new DeferredPromise<string>();
      const testValue = "test value";

      // Start the promise chain
      const promise = deferred.promise.then((value) => {
        expect(value).toBe(testValue);
        expect(deferred.state).toBe(PromiseState.FULFILLED);
        expect(deferred.isFulfilled).toBe(true);
        expect(deferred.isSettled).toBe(true);
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
        expect(deferred.state).toBe(PromiseState.REJECTED);
        expect(deferred.isRejected).toBe(true);
        expect(deferred.isSettled).toBe(true);
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
      expect(deferred.state).toBe(PromiseState.FULFILLED);
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
        expect(deferred.state).toBe(PromiseState.REJECTED);
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

    // New tests for added functionality
    it("should track promise state correctly", async () => {
      const deferred = new DeferredPromise<string>();

      // Initial state
      expect(deferred.state).toBe(PromiseState.PENDING);
      expect(deferred.isPending).toBe(true);
      expect(deferred.isSettled).toBe(false);
      expect(deferred.isFulfilled).toBe(false);
      expect(deferred.isRejected).toBe(false);

      // After resolution
      deferred.resolve("test");
      expect(deferred.state).toBe(PromiseState.FULFILLED);
      expect(deferred.isPending).toBe(false);
      expect(deferred.isSettled).toBe(true);
      expect(deferred.isFulfilled).toBe(true);
      expect(deferred.isRejected).toBe(false);

      await deferred.promise;
    });

    it("should track promise state correctly after rejection", async () => {
      const deferred = new DeferredPromise<string>();

      // Initial state
      expect(deferred.state).toBe(PromiseState.PENDING);

      // After rejection
      deferred.reject(new Error("test error"));
      expect(deferred.state).toBe(PromiseState.REJECTED);
      expect(deferred.isPending).toBe(false);
      expect(deferred.isSettled).toBe(true);
      expect(deferred.isFulfilled).toBe(false);
      expect(deferred.isRejected).toBe(true);

      try {
        await deferred.promise;
      } catch (_error) {
        // Expected rejection
      }
    });

    describe("Timeout functionality", () => {
      beforeEach(() => {
        vi.useFakeTimers();
      });

      afterEach(() => {
        vi.useRealTimers();
      });

      it("should reject the promise when timeout is reached", async () => {
        const deferred = new DeferredPromise<string>();
        deferred.setTimeout(1000);

        const promiseResult = deferred.promise.catch((error) => {
          expect(error).toBeInstanceOf(Error);
          expect(error.message).toBe("Promise timed out after 1000ms");
          expect(deferred.isRejected).toBe(true);
          return "caught";
        });

        // Advance time
        vi.advanceTimersByTime(1000);

        const result = await promiseResult;
        expect(result).toBe("caught");
      });

      it("should use custom timeout message if provided", async () => {
        const deferred = new DeferredPromise<string>();
        const customMessage = "Custom timeout message";
        deferred.setTimeout(500, customMessage);

        const promiseResult = deferred.promise.catch((error) => {
          expect(error).toBeInstanceOf(Error);
          expect(error.message).toBe(customMessage);
          return "caught";
        });

        // Advance time
        vi.advanceTimersByTime(500);

        const result = await promiseResult;
        expect(result).toBe("caught");
      });

      it("should not reject if promise is resolved before timeout", async () => {
        const deferred = new DeferredPromise<string>();
        const value = "success";
        deferred.setTimeout(1000);

        // Resolve before timeout
        setTimeout(() => deferred.resolve(value), 500);

        // Advance time
        vi.advanceTimersByTime(500);

        const result = await deferred.promise;
        expect(result).toBe(value);
        expect(deferred.isFulfilled).toBe(true);

        // Further timeout should not affect the resolved promise
        vi.advanceTimersByTime(1000);
        expect(deferred.isFulfilled).toBe(true);
      });

      it("should clear existing timeout when setting a new one", async () => {
        const deferred = new DeferredPromise<string>();

        // Set initial timeout
        deferred.setTimeout(1000);

        // Set a longer timeout, which should clear the first one
        deferred.setTimeout(2000);

        // After 1000ms it should still be pending
        vi.advanceTimersByTime(1000);
        expect(deferred.isPending).toBe(true);

        // After 2000ms total it should reject
        vi.advanceTimersByTime(1000);

        try {
          await deferred.promise;
          throw new Error("Promise should have rejected");
        } catch (error: unknown) {
          // Check if error is Error type
          if (error instanceof Error) {
            expect(error.message).toBe("Promise timed out after 2000ms");
          } else {
            throw new Error("Unexpected error type");
          }
          expect(deferred.isRejected).toBe(true);
        }
      });

      it("should allow resolving with a Promise", async () => {
        const deferred = new DeferredPromise<string>();
        const innerPromise = Promise.resolve("inner value");

        deferred.resolve(innerPromise);

        const result = await deferred.promise;
        expect(result).toBe("inner value");
        expect(deferred.isFulfilled).toBe(true);
      });
    });

    // Add a new describe section for the static utility methods
    describe("Static Utility Methods", () => {
      beforeEach(() => {
        vi.useFakeTimers();
      });

      afterEach(() => {
        vi.useRealTimers();
      });

      it("should create a delayed promise with delay() method", async () => {
        const deferred = DeferredPromise.delay<string>(1000, "delayed value");

        expect(deferred.isPending).toBe(true);

        vi.advanceTimersByTime(1000);

        const result = await deferred.promise;
        expect(result).toBe("delayed value");
        expect(deferred.isFulfilled).toBe(true);
      });

      it("should handle function values in delay()", async () => {
        const deferred = DeferredPromise.delay<number>(500, () => 42);

        vi.advanceTimersByTime(500);

        const result = await deferred.promise;
        expect(result).toBe(42);
      });

      it("should handle async function values in delay()", async () => {
        const deferred = DeferredPromise.delay<string>(500, async () => {
          return Promise.resolve("async result");
        });

        vi.advanceTimersByTime(500);

        const result = await deferred.promise;
        expect(result).toBe("async result");
      });

      it("should handle errors in delay() functions", async () => {
        const error = new Error("Test error");
        const deferred = DeferredPromise.delay<never>(500, () => {
          throw error;
        });

        vi.advanceTimersByTime(500);

        try {
          await deferred.promise;
          throw new Error("Promise should have been rejected");
        } catch (err) {
          expect(err).toBe(error);
          expect(deferred.isRejected).toBe(true);
        }
      });

      it("should create a timeout promise with timeout() method", async () => {
        const promise = DeferredPromise.timeout(1000);

        let caught = false;
        promise.catch(() => {
          caught = true;
        });

        vi.advanceTimersByTime(1000);

        // Let the promise handlers run
        await Promise.resolve();

        expect(caught).toBe(true);
      });

      it("should wrap an existing promise with fromPromise()", async () => {
        const original = Promise.resolve("original value");
        const deferred = DeferredPromise.fromPromise(original);

        const result = await deferred.promise;
        expect(result).toBe("original value");
        expect(deferred.isFulfilled).toBe(true);
      });

      it("should handle rejections in fromPromise()", async () => {
        const error = new Error("Original error");
        const original = Promise.reject(error);
        const deferred = DeferredPromise.fromPromise(original);

        try {
          await deferred.promise;
          throw new Error("Promise should have been rejected");
        } catch (err) {
          expect(err).toBe(error);
          expect(deferred.isRejected).toBe(true);
        }
      });

      it("should handle all settled promises with allSettled()", async () => {
        const promises = [
          Promise.resolve("success"),
          Promise.reject("failure"),
          Promise.resolve(42),
        ];

        // Use string | number as the generic type
        const results = await DeferredPromise.allSettled<string | number>(
          promises,
        );

        expect(results.length).toBe(3);
        expect(results[0].status).toBe("fulfilled");
        expect(results[0].value).toBe("success");
        expect(results[1].status).toBe("rejected");
        expect(results[1].reason).toBe("failure");
        expect(results[2].status).toBe("fulfilled");
        expect(results[2].value).toBe(42);
      });
    });
  });
});
