import { describe, it, expect } from "vitest";

import { InMemorySecretProvider } from "@/server/infrastructure/config/secrets/InMemorySecretProvider";

describe("InMemorySecretProvider", () => {
  describe("Construction and initialization", () => {
    it("should initialize with empty secrets by default", async () => {
      const provider = new InMemorySecretProvider();

      // Check no secrets exist
      expect(await provider.supportsSecret("ANY_KEY")).toBe(false);
      expect(await provider.getSecret("ANY_KEY")).toBeUndefined();

      // Verify getAllSecrets returns empty object
      expect(provider.getAllSecrets()).toEqual({});
    });

    it("should initialize with provided secrets", async () => {
      const initialSecrets = {
        API_KEY: "api-key-value",
        DB_PASSWORD: "db-password-value",
      };

      const provider = new InMemorySecretProvider(initialSecrets);

      // Check initial secrets exist
      expect(await provider.supportsSecret("API_KEY")).toBe(true);
      expect(await provider.getSecret("API_KEY")).toBe("api-key-value");

      expect(await provider.supportsSecret("DB_PASSWORD")).toBe(true);
      expect(await provider.getSecret("DB_PASSWORD")).toBe("db-password-value");

      // Verify getAllSecrets returns all secrets
      expect(provider.getAllSecrets()).toEqual(initialSecrets);
    });
  });

  describe("Secret management", () => {
    it("should add secrets with setSecret", async () => {
      const provider = new InMemorySecretProvider();

      // Add a secret
      provider.setSecret("NEW_SECRET", "new-secret-value");

      // Verify it exists
      expect(await provider.supportsSecret("NEW_SECRET")).toBe(true);
      expect(await provider.getSecret("NEW_SECRET")).toBe("new-secret-value");
    });

    it("should update existing secrets with setSecret", async () => {
      const provider = new InMemorySecretProvider({
        EXISTING_SECRET: "old-value",
      });

      // Update the secret
      provider.setSecret("EXISTING_SECRET", "new-value");

      // Verify it's updated
      expect(await provider.getSecret("EXISTING_SECRET")).toBe("new-value");
    });

    it("should clear all secrets", async () => {
      const provider = new InMemorySecretProvider({
        SECRET1: "value1",
        SECRET2: "value2",
      });

      // Verify secrets exist
      expect(await provider.supportsSecret("SECRET1")).toBe(true);
      expect(await provider.supportsSecret("SECRET2")).toBe(true);

      // Clear all secrets
      provider.clear();

      // Verify no secrets exist
      expect(await provider.supportsSecret("SECRET1")).toBe(false);
      expect(await provider.supportsSecret("SECRET2")).toBe(false);
      expect(provider.getAllSecrets()).toEqual({});
    });

    it("should retrieve all secrets with getAllSecrets", async () => {
      const secrets = {
        API_KEY: "api-key",
        JWT_SECRET: "jwt-secret",
        PASSWORD: "password",
      };

      const provider = new InMemorySecretProvider(secrets);

      // Add another secret
      provider.setSecret("ADDITIONAL_SECRET", "additional-value");

      // Get all secrets
      const allSecrets = provider.getAllSecrets();

      // Verify all secrets are returned
      expect(allSecrets).toEqual({
        ...secrets,
        ADDITIONAL_SECRET: "additional-value",
      });
    });
  });

  describe("Edge cases", () => {
    it("should handle empty string secrets", async () => {
      const provider = new InMemorySecretProvider();

      provider.setSecret("EMPTY_SECRET", "");

      expect(await provider.supportsSecret("EMPTY_SECRET")).toBe(true);
      expect(await provider.getSecret("EMPTY_SECRET")).toBe("");
    });

    it("should return undefined for non-existent secrets", async () => {
      const provider = new InMemorySecretProvider();

      expect(await provider.getSecret("NON_EXISTENT")).toBeUndefined();
    });

    it("should preserve key case sensitivity", async () => {
      const provider = new InMemorySecretProvider();

      provider.setSecret("lowercase", "lowercase-value");
      provider.setSecret("UPPERCASE", "uppercase-value");
      provider.setSecret("MixedCase", "mixed-case-value");

      expect(await provider.getSecret("lowercase")).toBe("lowercase-value");
      expect(await provider.getSecret("UPPERCASE")).toBe("uppercase-value");
      expect(await provider.getSecret("MixedCase")).toBe("mixed-case-value");

      // Check case sensitivity
      expect(await provider.getSecret("LOWERCASE")).toBeUndefined();
      expect(await provider.getSecret("uppercase")).toBeUndefined();
      expect(await provider.getSecret("mixedcase")).toBeUndefined();
    });
  });

  describe("Async interface", () => {
    it("should work with await syntax", async () => {
      const provider = new InMemorySecretProvider({
        TEST_SECRET: "test-value",
      });

      const supports = await provider.supportsSecret("TEST_SECRET");
      expect(supports).toBe(true);

      const value = await provider.getSecret("TEST_SECRET");
      expect(value).toBe("test-value");
    });

    it("should work with Promises", () => {
      const provider = new InMemorySecretProvider({
        TEST_SECRET: "test-value",
      });

      return Promise.all([
        provider.supportsSecret("TEST_SECRET").then((supports) => {
          expect(supports).toBe(true);
        }),

        provider.getSecret("TEST_SECRET").then((value) => {
          expect(value).toBe("test-value");
        }),
      ]);
    });
  });
});
