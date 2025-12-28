import { describe, it, expect } from "vitest";

import { DeferredPromise } from "../../../../../server/infrastructure/promises/DeferredPromise";

describe("DeferredPromise", () => {
  it("should create a promise that can be resolved", async () => {
    const deferred = new DeferredPromise<string>();
    const testValue = "test value";

    // Start listening to the promise
    const promiseResult = deferred.promise;

    // Resolve the promise
    deferred.resolve(testValue);

    // Wait for the promise to resolve
    const result = await promiseResult;
    expect(result).toBe(testValue);
  });

  it("should create a promise that can be rejected", async () => {
    const deferred = new DeferredPromise<string>();
    const error = new Error("test error");

    // Start listening to the promise
    const promiseResult = deferred.promise;

    // Reject the promise
    deferred.reject(error);

    // Wait for the promise to reject
    await expect(promiseResult).rejects.toThrow(error);
  });

  it("should handle primitive values", async () => {
    const deferred = new DeferredPromise<number>();
    const testValue = 42;

    const promiseResult = deferred.promise;
    deferred.resolve(testValue);

    const result = await promiseResult;
    expect(result).toBe(testValue);
  });

  it("should handle object values", async () => {
    const deferred = new DeferredPromise<{ test: string }>();
    const testValue = { test: "value" };

    const promiseResult = deferred.promise;
    deferred.resolve(testValue);

    const result = await promiseResult;
    expect(result).toEqual(testValue);
  });

  it("should handle undefined rejection reason", async () => {
    const deferred = new DeferredPromise<string>();

    const promiseResult = deferred.promise;
    deferred.reject();

    await expect(promiseResult).rejects.toBeUndefined();
  });

  it("should handle multiple resolve/reject calls", async () => {
    const deferred = new DeferredPromise<string>();
    const testValue = "first value";
    const error = new Error("second error");

    const promiseResult = deferred.promise;

    // First resolve
    deferred.resolve(testValue);
    // Second resolve (should be ignored)
    deferred.resolve("second value");
    // Reject after resolve (should be ignored)
    deferred.reject(error);

    const result = await promiseResult;
    expect(result).toBe(testValue);
  });

  it("should handle rejection with non-Error objects", async () => {
    const deferred = new DeferredPromise<string>();
    const errorObject = { message: "test error" };

    const promiseResult = deferred.promise;
    deferred.reject(errorObject);

    await expect(promiseResult).rejects.toEqual(errorObject);
  });

  it("should maintain promise state after resolution", async () => {
    const deferred = new DeferredPromise<string>();
    const testValue = "test value";

    // Resolve the promise
    deferred.resolve(testValue);

    // Try to resolve again (should be ignored)
    deferred.resolve("new value");

    const result = await deferred.promise;
    expect(result).toBe(testValue);
  });

  it("should maintain promise state after rejection", async () => {
    const deferred = new DeferredPromise<string>();
    const error = new Error("test error");

    // Reject the promise
    deferred.reject(error);

    // Try to resolve (should be ignored)
    deferred.resolve("new value");

    await expect(deferred.promise).rejects.toThrow(error);
  });
});
