import { describe, it, expect } from "vitest";

import {
  createSignature,
  verifySignature,
} from "../../../../../server/infrastructure/security/securityHelpers";

describe("securityHelpers", () => {
  const secretKey = Buffer.from("test-secret-key");

  describe("createSignature", () => {
    it("should create a valid signature for string data", () => {
      const data = "test-data";
      const signature = createSignature({ data, secretKey });

      expect(signature).toBeDefined();
      expect(typeof signature).toBe("string");
      expect(signature.length).toBeGreaterThan(0);
      expect(() => Buffer.from(signature, "base64")).not.toThrow();
    });

    it("should create a valid signature for object data", () => {
      const data = {
        key1: "value1",
        key2: "value2",
        number: 123,
      };
      const signature = createSignature({ data, secretKey });

      expect(signature).toBeDefined();
      expect(typeof signature).toBe("string");
      expect(signature.length).toBeGreaterThan(0);
      expect(() => Buffer.from(signature, "base64")).not.toThrow();
    });

    it("should create different signatures for different data", () => {
      const data1 = "test-data-1";
      const data2 = "test-data-2";

      const signature1 = createSignature({ data: data1, secretKey });
      const signature2 = createSignature({ data: data2, secretKey });

      expect(signature1).not.toBe(signature2);
    });

    it("should create different signatures for different secret keys", () => {
      const data = "test-data";
      const secretKey1 = Buffer.from("test-secret-key-1");
      const secretKey2 = Buffer.from("test-secret-key-2");

      const signature1 = createSignature({ data, secretKey: secretKey1 });
      const signature2 = createSignature({ data, secretKey: secretKey2 });

      expect(signature1).not.toBe(signature2);
    });

    it("should handle empty data", () => {
      const data = "";
      const signature = createSignature({ data, secretKey });

      expect(signature).toBeDefined();
      expect(typeof signature).toBe("string");
      expect(signature.length).toBeGreaterThan(0);
    });
  });

  describe("verifySignature", () => {
    it("should verify a valid signature for string data", () => {
      const data = "test-data";
      const signature = createSignature({ data, secretKey });

      const isValid = verifySignature({ data, signature, secretKey });
      expect(isValid).toBe(true);
    });

    it("should verify a valid signature for object data", () => {
      const data = {
        key1: "value1",
        key2: "value2",
        number: 123,
      };
      const signature = createSignature({ data, secretKey });

      const isValid = verifySignature({ data, signature, secretKey });
      expect(isValid).toBe(true);
    });

    it("should reject an invalid signature", () => {
      const data = "test-data";
      const invalidSignature = "invalid-signature";

      const isValid = verifySignature({
        data,
        signature: invalidSignature,
        secretKey,
      });
      expect(isValid).toBe(false);
    });

    it("should reject signature with different data", () => {
      const data1 = "test-data-1";
      const data2 = "test-data-2";
      const signature = createSignature({ data: data1, secretKey });

      const isValid = verifySignature({ data: data2, signature, secretKey });
      expect(isValid).toBe(false);
    });

    it("should reject signature with different secret key", () => {
      const data = "test-data";
      const signature = createSignature({ data, secretKey });
      const differentSecretKey = Buffer.from("different-secret-key");

      const isValid = verifySignature({
        data,
        signature,
        secretKey: differentSecretKey,
      });
      expect(isValid).toBe(false);
    });

    it("should handle empty data", () => {
      const data = "";
      const signature = createSignature({ data, secretKey });

      const isValid = verifySignature({ data, signature, secretKey });
      expect(isValid).toBe(true);
    });

    it("should handle different object key orders", () => {
      const data1 = {
        key1: "value1",
        key2: "value2",
      };
      const data2 = {
        key2: "value2",
        key1: "value1",
      };

      const signature = createSignature({ data: data1, secretKey });
      const isValid = verifySignature({ data: data2, signature, secretKey });

      expect(isValid).toBe(true);
    });
  });
});
