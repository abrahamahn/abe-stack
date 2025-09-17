import { describe, it, expect } from "vitest";

import {
  encrypt,
  decrypt,
  generateEncryptionKey,
  hashData,
  createSignature,
  verifySignature,
  serialize,
  SignatureOptions,
  EncryptionOptions,
} from "@/server/infrastructure/security/encryptionUtils";

describe("Encryption Utilities", () => {
  describe("encrypt and decrypt", () => {
    it("should encrypt and decrypt data correctly", async () => {
      const data = "Sensitive data";
      const encrypted = await encrypt(data);
      const decrypted = await decrypt(encrypted);

      expect(decrypted).toBe(data);
    });

    it("should produce different encrypted outputs for the same data", async () => {
      const data = "Sensitive data";
      const encrypted1 = await encrypt(data);
      const encrypted2 = await encrypt(data);

      expect(encrypted1).not.toBe(encrypted2);
    });

    it("should work with longer text data", async () => {
      const longData =
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit. ".repeat(50);
      const encrypted = await encrypt(longData);
      const decrypted = await decrypt(encrypted);

      expect(decrypted).toBe(longData);
    });

    it("should work with different encryption options", async () => {
      const data = "Custom options test";
      const options: EncryptionOptions = {
        algorithm: "aes-256-cbc", // Using CBC instead of GCM
        ivLength: 16,
        keyLength: 32,
        salt: "custom-salt-value",
      };

      const encrypted = await encrypt(data, undefined, options);
      const decrypted = await decrypt(encrypted, undefined, options);

      expect(decrypted).toBe(data);
    });

    it("should work with a provided key", async () => {
      const data = "Key-based encryption test";
      const key = Buffer.from(generateEncryptionKey(32), "hex");

      const encrypted = await encrypt(data, key);
      const decrypted = await decrypt(encrypted, key);

      expect(decrypted).toBe(data);
    });

    it("should throw an error when decrypting with wrong key", async () => {
      const data = "Wrong key test";
      const key1 = Buffer.from(generateEncryptionKey(32), "hex");
      const key2 = Buffer.from(generateEncryptionKey(32), "hex");

      const encrypted = await encrypt(data, key1);

      await expect(decrypt(encrypted, key2)).rejects.toThrow();
    });

    it("should throw an error when decrypting invalid data", async () => {
      const invalidData = "not-encrypted-data";
      await expect(decrypt(invalidData)).rejects.toThrow();
    });

    it("should handle special characters in data", async () => {
      const specialChars = "!@#$%^&*()_+{}[]|\\:\";'<>?,./äöüß";
      const encrypted = await encrypt(specialChars);
      const decrypted = await decrypt(encrypted);

      expect(decrypted).toBe(specialChars);
    });

    it("should handle empty string encryption", async () => {
      const emptyString = "";
      const encrypted = await encrypt(emptyString);
      const decrypted = await decrypt(encrypted);

      expect(decrypted).toBe(emptyString);
    });
  });

  describe("generateEncryptionKey", () => {
    it("should generate a key of specified length", () => {
      const length = 32;
      const key = generateEncryptionKey(length);

      expect(key).toBeDefined();
      expect(typeof key).toBe("string");
      expect(key.length).toBe(length * 2); // Hex string length is double
    });

    it("should generate different keys on each call", () => {
      const key1 = generateEncryptionKey();
      const key2 = generateEncryptionKey();

      expect(key1).not.toBe(key2);
    });

    it("should throw an error for insecure key lengths", () => {
      expect(() => generateEncryptionKey(8)).toThrow();
    });

    it("should use default length if not specified", () => {
      const key = generateEncryptionKey();
      expect(key.length).toBe(64); // 32 bytes = 64 hex chars
    });
  });

  describe("hashData", () => {
    it("should hash data consistently", () => {
      const data = "Data to hash";
      const hash1 = hashData(data);
      const hash2 = hashData(data);

      expect(hash1).toBe(hash2);
    });

    it("should produce different hashes for different data", () => {
      const hash1 = hashData("Data 1");
      const hash2 = hashData("Data 2");

      expect(hash1).not.toBe(hash2);
    });

    it("should produce different hashes with different salts", () => {
      const data = "Same data";
      const hash1 = hashData(data, "salt1");
      const hash2 = hashData(data, "salt2");

      expect(hash1).not.toBe(hash2);
    });

    it("should handle empty strings", () => {
      const hash = hashData("");
      expect(hash).toBeDefined();
      expect(typeof hash).toBe("string");
      expect(hash.length).toBeGreaterThan(0);
    });
  });

  describe("createSignature and verifySignature", () => {
    const secretKey = Buffer.from(
      "test-secret-key-for-signatures-must-be-long-enough",
      "utf8"
    );

    it("should create and verify a valid signature", () => {
      const data = "Data to sign";
      const signature = createSignature({ data, secretKey });

      const isValid = verifySignature({ data, signature, secretKey });
      expect(isValid).toBe(true);
    });

    it("should reject an invalid signature", () => {
      const data = "Data to sign";
      const invalidSignature = "invalid-signature";

      const isValid = verifySignature({
        data,
        signature: invalidSignature,
        secretKey,
      });
      expect(isValid).toBe(false);
    });

    it("should create and verify signatures with objects", () => {
      const data = { user: "test", role: "admin", id: 123 };
      const signature = createSignature({ data, secretKey });

      const isValid = verifySignature({ data, signature, secretKey });
      expect(isValid).toBe(true);
    });

    it("should reject signatures for modified objects", () => {
      const originalData = { user: "test", role: "admin", id: 123 };
      const signature = createSignature({ data: originalData, secretKey });

      const modifiedData = { ...originalData, role: "superadmin" };
      const isValid = verifySignature({
        data: modifiedData,
        signature,
        secretKey,
      });

      expect(isValid).toBe(false);
    });

    it("should support different signature algorithms", () => {
      const data = "Algorithm test";
      const options: SignatureOptions = { algorithm: "sha256" };

      const signature = createSignature({ data, secretKey, options });
      const isValid = verifySignature({
        data,
        signature,
        secretKey,
        options,
      });

      expect(isValid).toBe(true);
    });

    it("should support different output formats", () => {
      const data = "Format test";
      const options: SignatureOptions = { format: "hex" };

      const signature = createSignature({ data, secretKey, options });
      const isValid = verifySignature({
        data,
        signature,
        secretKey,
        options,
      });

      expect(isValid).toBe(true);
    });

    it("should validate timestamps for time-limited signatures", () => {
      const data = { action: "login", userId: 12345 };
      const options: SignatureOptions = {
        addTimestamp: true,
        verifyMaxAge: 5000, // 5 seconds (increased for test reliability)
      };

      // Create a signature with current timestamp
      const dataWithTimestamp = {
        ...data,
        __timestamp: Date.now(),
      };
      const signature = createSignature({
        data: dataWithTimestamp,
        secretKey,
        options,
      });

      // Signature should be valid immediately
      const isValidNow = verifySignature({
        data: dataWithTimestamp,
        signature,
        secretKey,
        options,
      });
      expect(isValidNow).toBe(true);

      // But should be invalid after the time has passed
      // Simulate by creating data with an old timestamp
      const oldData = {
        ...data,
        __timestamp: Date.now() - 10000, // 10 seconds ago (well beyond the 5-second limit)
      };

      // Create signature for the old data
      const oldSignature = createSignature({
        data: oldData,
        secretKey,
      });

      // Verify with the age limit option
      const isValidLater = verifySignature({
        data: oldData,
        signature: oldSignature,
        secretKey,
        options,
      });
      expect(isValidLater).toBe(false);
    });

    it("should throw an error for missing data or key", () => {
      expect(() =>
        createSignature({
          data: "",
          secretKey: Buffer.alloc(0),
        })
      ).toThrow();

      expect(() =>
        createSignature({
          data: "data",
          secretKey: Buffer.alloc(8),
        })
      ).toThrow();
    });

    it("should handle invalid verification parameters", () => {
      expect(
        verifySignature({
          data: undefined as any,
          signature: "sig",
          secretKey,
        })
      ).toBe(false);

      expect(
        verifySignature({
          data: "data",
          signature: undefined as any,
          secretKey,
        })
      ).toBe(false);

      expect(
        verifySignature({
          data: "data",
          signature: "sig",
          secretKey: undefined as any,
        })
      ).toBe(false);
    });
  });

  describe("serialize", () => {
    it("should serialize data consistently", () => {
      const data = { key1: "value1", key2: "value2" };
      const serialized1 = serialize(data);
      const serialized2 = serialize(data);

      expect(serialized1).toBe(serialized2);
    });

    it("should handle different object key orders", () => {
      const data1 = { key1: "value1", key2: "value2" };
      const data2 = { key2: "value2", key1: "value1" };

      const serialized1 = serialize(data1);
      const serialized2 = serialize(data2);

      expect(serialized1).toBe(serialized2);
    });

    it("should handle nested objects", () => {
      const data = {
        user: { name: "Test", id: 123 },
        settings: { theme: "dark" },
      };

      const serialized = serialize(data);
      expect(serialized).toBeDefined();
      expect(typeof serialized).toBe("string");
    });

    it("should handle arrays", () => {
      const data = { items: [1, 2, 3], names: ["a", "b", "c"] };

      const serialized = serialize(data);
      expect(serialized).toBeDefined();
      expect(typeof serialized).toBe("string");
    });

    it("should handle null values", () => {
      const data = { key1: null, key2: "value" };

      const serialized = serialize(data);
      expect(serialized).toBeDefined();
      expect(typeof serialized).toBe("string");
    });

    it("should skip undefined values", () => {
      const data = { key1: undefined, key2: "value" };
      const dataWithoutUndefined = { key2: "value" };

      const serialized1 = serialize(data);
      const serialized2 = serialize(dataWithoutUndefined);

      expect(serialized1).toBe(serialized2);
    });

    it("should throw an error for invalid data", () => {
      expect(() => serialize(null as any)).toThrow();
      expect(() => serialize(undefined as any)).toThrow();
      expect(() => serialize("string" as any)).toThrow();
      expect(() => serialize(123 as any)).toThrow();
    });
  });
});
