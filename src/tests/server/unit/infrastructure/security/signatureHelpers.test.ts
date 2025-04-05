import { describe, it, expect } from "vitest";

import {
  generateSignature,
  verifySignature,
  SecuritySignature,
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
      const result = generateSignature(secretKey, data);

      expect(result).toBeDefined();
      expect(typeof result).toBe("object");
      expect(result).toHaveProperty("signature");
      const sigObj = result as SecuritySignature;
      expect(sigObj.signature.length).toBeGreaterThan(0);
      expect(/^[0-9a-f]+$/.test(sigObj.signature)).toBe(true); // Check if it's a valid hex string
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

      const signature1 = generateSignature(
        secretKey,
        data1,
        undefined,
        true,
      ) as string;
      const signature2 = generateSignature(
        secretKey,
        data2,
        undefined,
        true,
      ) as string;

      expect(signature1).not.toBe(signature2);
    });

    it("should generate different signatures for different secret keys", () => {
      const data = {
        key1: "value1",
        key2: "value2",
      };
      const secretKey1 = "test-secret-key-1";
      const secretKey2 = "test-secret-key-2";

      const signature1 = generateSignature(
        secretKey1,
        data,
        undefined,
        true,
      ) as string;
      const signature2 = generateSignature(
        secretKey2,
        data,
        undefined,
        true,
      ) as string;

      expect(signature1).not.toBe(signature2);
    });

    it("should handle empty object", () => {
      const data = {};
      const result = generateSignature(secretKey, data);

      expect(result).toBeDefined();
      expect(typeof result).toBe("object");
      expect(result).toHaveProperty("signature");
      const sigObj = result as SecuritySignature;
      expect(sigObj.signature.length).toBeGreaterThan(0);
    });

    it("should handle object with nested properties", () => {
      const data = {
        key1: "value1",
        nested: {
          key2: "value2",
          key3: 123,
        },
      };
      const result = generateSignature(secretKey, data);

      expect(result).toBeDefined();
      expect(typeof result).toBe("object");
      expect(result).toHaveProperty("signature");
      const sigObj = result as SecuritySignature;
      expect(sigObj.signature.length).toBeGreaterThan(0);
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

      // Use options without nonce and timestamp to ensure consistent results
      const options = { includeTimestamp: false, includeNonce: false };

      // Use returnRaw=true to get just the signature string for comparison
      const signature1 = generateSignature(
        secretKey,
        data1,
        options,
        true,
      ) as string;
      const signature2 = generateSignature(
        secretKey,
        data2,
        options,
        true,
      ) as string;

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

      // Generate options without nonce and timestamp to ensure consistent results
      const options = { includeTimestamp: false, includeNonce: false };
      const signature = generateSignature(
        secretKey,
        data,
        options,
        true,
      ) as string;

      const isValid = verifySignature(secretKey, signature, data, options);
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

      // Use options without nonce and timestamp
      const options = { includeTimestamp: false, includeNonce: false };
      const signature = generateSignature(
        secretKey,
        data1,
        options,
        true,
      ) as string;

      const isValid = verifySignature(secretKey, signature, data2, options);
      expect(isValid).toBe(false);
    });

    it("should reject signature with different secret key", () => {
      const data = {
        key1: "value1",
        key2: "value2",
      };

      // Use options without nonce and timestamp
      const options = { includeTimestamp: false, includeNonce: false };
      const signature = generateSignature(
        secretKey,
        data,
        options,
        true,
      ) as string;
      const differentSecretKey = "different-secret-key";

      const isValid = verifySignature(
        differentSecretKey,
        signature,
        data,
        options,
      );
      expect(isValid).toBe(false);
    });

    it("should handle empty object", () => {
      const data = {};

      // Use options without nonce and timestamp
      const options = { includeTimestamp: false, includeNonce: false };
      const signature = generateSignature(
        secretKey,
        data,
        options,
        true,
      ) as string;

      const isValid = verifySignature(secretKey, signature, data, options);
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

      // Use options without nonce and timestamp
      const options = { includeTimestamp: false, includeNonce: false };
      const signature = generateSignature(
        secretKey,
        data,
        options,
        true,
      ) as string;

      const isValid = verifySignature(secretKey, signature, data, options);
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

      // Use options without nonce and timestamp
      const options = { includeTimestamp: false, includeNonce: false };
      const signature = generateSignature(
        secretKey,
        data1,
        options,
        true,
      ) as string;
      const isValid = verifySignature(secretKey, signature, data2, options);

      expect(isValid).toBe(true);
    });
  });
});
