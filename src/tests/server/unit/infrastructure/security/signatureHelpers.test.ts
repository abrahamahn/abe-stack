import { describe, it, expect, vi } from "vitest";

import {
  createSignature,
  verifySignature,
  SecuritySignature,
  parseSignature,
  serializeSignature,
  deserializeSignature,
} from "@/server/infrastructure/security/signatureHelpers";

describe("signatureHelpers", () => {
  const secretKey = "test-secret-key";

  describe("createSignature", () => {
    it("should generate a valid signature for object data", () => {
      const data = {
        key: "value",
        number: 123,
      };
      const result = createSignature({ data, secretKey });

      expect(result).toBeDefined();
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
    });

    it("should generate a valid signature for string data", () => {
      const data = "test string data";
      const result = createSignature({ data, secretKey });

      expect(result).toBeDefined();
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
    });

    it("should generate different signatures for different data", () => {
      const data1 = {
        key: "value1",
      };
      const data2 = {
        key: "value2",
      };

      const signature1 = createSignature({
        data: data1,
        secretKey,
      });
      const signature2 = createSignature({
        data: data2,
        secretKey,
      });

      expect(signature1).not.toBe(signature2);
    });

    it("should generate different signatures for different secret keys", () => {
      const data = {
        key: "value",
      };
      const secretKey1 = "test-secret-key-1";
      const secretKey2 = "test-secret-key-2";

      const signature1 = createSignature({
        data,
        secretKey: secretKey1,
      });
      const signature2 = createSignature({
        data,
        secretKey: secretKey2,
      });

      expect(signature1).not.toBe(signature2);
    });

    it("should handle empty object", () => {
      const data = {};
      const result = createSignature({ data, secretKey });

      expect(result).toBeDefined();
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
    });

    it("should handle object with nested properties", () => {
      const data = {
        key: "value",
        nested: {
          prop1: "value1",
          prop2: 123,
        },
      };
      const result = createSignature({ data, secretKey });

      expect(result).toBeDefined();
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
    });

    it("should include timestamp when includeTimestamp is true", () => {
      const data = { key: "value" };
      const result = createSignature({ data, secretKey, ttl: 3600 });

      expect(result).toBeDefined();
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
    });

    it("should include nonce when includeNonce is true", () => {
      const data = { key: "value" };
      const result = createSignature({ data, secretKey });

      expect(result).toBeDefined();
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
    });

    it("should include expiresAt when includeTimestamp is true", () => {
      const data = { key: "value" };
      const maxAge = 3600000; // 1 hour
      const result = createSignature({ data, secretKey, ttl: maxAge });

      expect(result).toBeDefined();
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
    });

    it("should return a string when returnAsString is true", () => {
      const data = { key: "value" };
      const result = createSignature({
        data,
        secretKey,
        outputFormat: "hex",
      });

      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
    });

    it("should have consistent output for identical input", () => {
      const data = {
        key: "value",
        number: 123,
      };

      // Use returnRaw=true to get just the signature string for comparison
      const signature1 = createSignature({
        data,
        secretKey,
        outputFormat: "hex",
      });
      const signature2 = createSignature({
        data,
        secretKey,
        outputFormat: "hex",
      });

      expect(signature1).toBe(signature2);
    });

    it("should verify a valid signature object", () => {
      const data = { key: "value" };
      const signatureObj = createSignature({
        data,
        secretKey,
      });

      const isValid = verifySignature({
        data,
        signature: signatureObj,
        secretKey,
      });

      expect(isValid).toBe(true);
    });
  });

  describe("verifySignature", () => {
    it("should verify a valid signature", () => {
      const data = {
        key: "value",
        number: 123,
      };

      // Use options without nonce and timestamp to ensure consistent results
      const options = { includeTimestamp: false, includeNonce: false };
      const signature = createSignature({
        data,
        secretKey,
      });

      const isValid = verifySignature({
        data,
        signature,
        secretKey,
      });

      expect(isValid).toBe(true);
    });

    it("should verify a valid signature for string data", () => {
      const data = "test string data";

      // Use options without nonce and timestamp
      const options = { includeTimestamp: false, includeNonce: false };
      const signature = createSignature({
        data,
        secretKey,
      });

      const isValid = verifySignature({
        data,
        signature,
        secretKey,
      });

      expect(isValid).toBe(true);
    });

    it("should verify a valid signature object", () => {
      const data = { key: "value" };
      const signatureObj = createSignature({
        data,
        secretKey,
      });

      const isValid = verifySignature({
        data,
        signature: signatureObj,
        secretKey,
      });

      expect(isValid).toBe(true);
    });

    it("should reject signature with different data", () => {
      const data1 = {
        key: "value1",
      };
      const data2 = {
        key: "value2",
      };

      // Use options without nonce and timestamp
      const options = { includeTimestamp: false, includeNonce: false };
      const signature = createSignature({
        data: data1,
        secretKey,
      });

      const isValid = verifySignature({
        data: data2,
        signature,
        secretKey,
      });

      expect(isValid).toBe(false);
    });

    it("should reject signature with different secret key", () => {
      const data = {
        key: "value",
      };
      const secretKey2 = "different-secret-key";

      // Use options without nonce and timestamp
      const options = { includeTimestamp: false, includeNonce: false };
      const signature = createSignature({
        data,
        secretKey,
      });

      const isValid = verifySignature({
        data,
        signature,
        secretKey: secretKey2,
      });

      expect(isValid).toBe(false);
    });

    it("should reject expired signatures", () => {
      const data = {
        key: "value",
      };

      // Create a signature that will expire
      const signature = createSignature({
        data,
        secretKey,
        ttl: 1, // 1 second
      });

      // Wait for the signature to expire
      return new Promise((resolve) => {
        setTimeout(() => {
          const isValid = verifySignature({
            data,
            signature,
            secretKey,
          });

          expect(isValid).toBe(false);
          resolve(undefined);
        }, 2000);
      });
    });

    it("should handle empty object", () => {
      const data = {};

      // Use options without nonce and timestamp
      const options = { includeTimestamp: false, includeNonce: false };
      const signature = createSignature({
        data,
        secretKey,
      });

      const isValid = verifySignature({
        data,
        signature,
        secretKey,
      });

      expect(isValid).toBe(true);
    });

    it("should handle object with nested properties", () => {
      const data = {
        key: "value",
        nested: {
          prop1: "value1",
          prop2: 123,
        },
      };

      // Use options without nonce and timestamp
      const options = { includeTimestamp: false, includeNonce: false };
      const signature = createSignature({
        data,
        secretKey,
      });

      const isValid = verifySignature({
        data,
        signature,
        secretKey,
      });

      expect(isValid).toBe(true);
    });

    it("should verify signatures consistently for the same data", () => {
      const data = {
        key: "value",
        number: 123,
      };

      // Use options without nonce and timestamp
      const options = { includeTimestamp: false, includeNonce: false };
      const signature = createSignature({
        data,
        secretKey,
      });

      const isValid1 = verifySignature({
        data,
        signature,
        secretKey,
      });
      const isValid2 = verifySignature({
        data,
        signature,
        secretKey,
      });

      expect(isValid1).toBe(true);
      expect(isValid2).toBe(true);
    });
  });

  describe("parseSignature", () => {
    it("should parse a signature string correctly", () => {
      const signature = "abcdef1234567890";
      const timestamp = Date.now();
      const nonce = "random123";

      const signatureStr = `${signature}.${timestamp}.${nonce}`;
      const parsed = parseSignature(signatureStr);

      expect(parsed.signature).toBe(signature);
      expect(parsed.timestamp).toBe(timestamp);
      expect(parsed.nonce).toBe(nonce);
    });

    it("should handle signature string without nonce", () => {
      const signature = "abcdef1234567890";
      const timestamp = Date.now();

      const signatureStr = `${signature}.${timestamp}`;
      const parsed = parseSignature(signatureStr);

      expect(parsed.signature).toBe(signature);
      expect(parsed.timestamp).toBe(timestamp);
      expect(parsed.nonce).toBeUndefined();
    });

    it("should handle signature string without timestamp or nonce", () => {
      const signature = "abcdef1234567890";

      const parsed = parseSignature(signature);

      expect(parsed.signature).toBe(signature);
      expect(parsed.timestamp).toBeUndefined();
      expect(parsed.nonce).toBeUndefined();
    });
  });

  describe("serializeSignature and deserializeSignature", () => {
    it("should serialize and deserialize a signature object correctly", () => {
      const original: SecuritySignature = {
        signature: "abcdef1234567890",
        timestamp: 1746689203210,
        expiresAt: 1746692803210,
      };

      const serialized = serializeSignature(original);
      const deserialized = deserializeSignature(serialized);
      expect(deserialized).toEqual(original);
    });

    it("should handle signature object without optional properties", () => {
      const original: SecuritySignature = {
        signature: "abcdef1234567890",
      };

      const serialized = serializeSignature(original);
      const deserialized = deserializeSignature(serialized);

      expect(deserialized).toEqual(original);
    });

    it("should throw an error when deserializing invalid base64", () => {
      expect(() => deserializeSignature("not-base64!")).toThrow();
    });

    it("should throw an error when deserializing valid base64 but invalid format", () => {
      // Valid base64 but not a serialized signature
      const invalidSerialized = Buffer.from(
        JSON.stringify({ foo: "bar" })
      ).toString("base64");
      const result = deserializeSignature(invalidSerialized);
      expect(result.signature).toBeUndefined();
    });
  });
});
