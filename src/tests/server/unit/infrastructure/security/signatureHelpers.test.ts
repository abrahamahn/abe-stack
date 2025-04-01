import { describe, it, expect } from "vitest";

import {
  generateSignature,
  verifySignature,
} from "../../../../../server/infrastructure/security/signatureHelpers";

describe("signatureHelpers", () => {
  const secretKey = "test-secret-key";

  describe("generateSignature", () => {
    it("should generate a valid signature for object data", () => {
      const data = {
        key1: "value1",
        key2: "value2",
        number: 123,
      };
      const signature = generateSignature(secretKey, data);

      expect(signature).toBeDefined();
      expect(typeof signature).toBe("string");
      expect(signature.length).toBeGreaterThan(0);
      expect(/^[0-9a-f]+$/.test(signature)).toBe(true); // Check if it's a valid hex string
    });

    it("should generate different signatures for different data", () => {
      const data1 = {
        key1: "value1",
        key2: "value2",
      };
      const data2 = {
        key1: "value1",
        key2: "value3",
      };

      const signature1 = generateSignature(secretKey, data1);
      const signature2 = generateSignature(secretKey, data2);

      expect(signature1).not.toBe(signature2);
    });

    it("should generate different signatures for different secret keys", () => {
      const data = {
        key1: "value1",
        key2: "value2",
      };
      const secretKey1 = "test-secret-key-1";
      const secretKey2 = "test-secret-key-2";

      const signature1 = generateSignature(secretKey1, data);
      const signature2 = generateSignature(secretKey2, data);

      expect(signature1).not.toBe(signature2);
    });

    it("should handle empty object", () => {
      const data = {};
      const signature = generateSignature(secretKey, data);

      expect(signature).toBeDefined();
      expect(typeof signature).toBe("string");
      expect(signature.length).toBeGreaterThan(0);
    });

    it("should handle object with nested properties", () => {
      const data = {
        key1: "value1",
        nested: {
          key2: "value2",
          key3: 123,
        },
      };
      const signature = generateSignature(secretKey, data);

      expect(signature).toBeDefined();
      expect(typeof signature).toBe("string");
      expect(signature.length).toBeGreaterThan(0);
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

      const signature1 = generateSignature(secretKey, data1);
      const signature2 = generateSignature(secretKey, data2);

      expect(signature1).toBe(signature2);
    });
  });

  describe("verifySignature", () => {
    it("should verify a valid signature", () => {
      const data = {
        key1: "value1",
        key2: "value2",
        number: 123,
      };
      const signature = generateSignature(secretKey, data);

      const isValid = verifySignature(secretKey, signature, data);
      expect(isValid).toBe(true);
    });

    it("should reject an invalid signature", () => {
      const data = {
        key1: "value1",
        key2: "value2",
      };
      const invalidSignature = "invalid-signature";

      const isValid = verifySignature(secretKey, invalidSignature, data);
      expect(isValid).toBe(false);
    });

    it("should reject signature with different data", () => {
      const data1 = {
        key1: "value1",
        key2: "value2",
      };
      const data2 = {
        key1: "value1",
        key2: "value3",
      };
      const signature = generateSignature(secretKey, data1);

      const isValid = verifySignature(secretKey, signature, data2);
      expect(isValid).toBe(false);
    });

    it("should reject signature with different secret key", () => {
      const data = {
        key1: "value1",
        key2: "value2",
      };
      const signature = generateSignature(secretKey, data);
      const differentSecretKey = "different-secret-key";

      const isValid = verifySignature(differentSecretKey, signature, data);
      expect(isValid).toBe(false);
    });

    it("should handle empty object", () => {
      const data = {};
      const signature = generateSignature(secretKey, data);

      const isValid = verifySignature(secretKey, signature, data);
      expect(isValid).toBe(true);
    });

    it("should handle object with nested properties", () => {
      const data = {
        key1: "value1",
        nested: {
          key2: "value2",
          key3: 123,
        },
      };
      const signature = generateSignature(secretKey, data);

      const isValid = verifySignature(secretKey, signature, data);
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

      const signature = generateSignature(secretKey, data1);
      const isValid = verifySignature(secretKey, signature, data2);

      expect(isValid).toBe(true);
    });
  });
});
